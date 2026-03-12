/**
 * 后端入口：占卜接口 + 调用 OpenAI API
 */
import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import cors from 'cors'
import OpenAI from 'openai'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import { buildSystemPrompt, buildChatSystemPrompt, buildCardMeaningsContext } from './prompts/index.js'
import { drawCards } from './utils/drawCards.js'
import { listConversations, getConversation, createConversation, updateConversation, deleteConversation, getUserByUsername, getUserById, createUser, listUsers, updateUser, countUsers, getCharacterPrompt, upsertCharacterPrompt, getKnowledgeBase, upsertKnowledgeBase } from './db.js'
import * as liliana from './prompts/characters/liliana.js'
import * as yiqing from './prompts/characters/yiqing.js'
import { TAROT_MEANINGS } from './prompts/knowledge/tarot.js'
import { LENORMAND_MEANINGS } from './prompts/knowledge/lenormand.js'
import { signToken, requireAuth, requireRole } from './auth.js'

const CHARACTER_MODULES = { liliana, yiqing }
function getCharacterDefaults(characterKey) {
  const mod = CHARACTER_MODULES[characterKey]
  return mod ? { persona: mod.persona, chatFlow: mod.chatFlow, fortuneInstructions: mod.fortuneInstructions } : null
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

const app = express()
const PORT = process.env.PORT || 3000

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
})
const openaiOfficial = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
})

const useDeepSeek = process.env.USE_DEEPSEEK !== 'false' && process.env.DEEPSEEK_API_KEY
const useOpenAI = process.env.OPENAI_API_KEY
const clients = [
  useDeepSeek && { client: deepseek, model: 'deepseek-chat', name: 'DeepSeek' },
  useOpenAI && { client: openaiOfficial, model: 'gpt-4o', name: 'OpenAI' },
].filter(Boolean)

let callIndex = 0
function getNextClient() {
  if (clients.length === 0) return null
  const idx = callIndex++ % clients.length
  return clients[idx]
}

async function createChatCompletion(options) {
  const { messages, max_tokens, temperature } = options
  const provider = getNextClient()
  if (!provider) throw new Error('未配置任何 API Key')
  const { client, model } = provider
  return client.chat.completions.create({
    model,
    messages,
    max_tokens,
    temperature,
  })
}

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ ok: true, hasKey: clients.length > 0, providers: clients.map(c => c.name) })
})

// 塔罗/雷诺曼位置名
const T_POSITIONS = [
  'T1（现在的情绪底色）',
  'T2（压力/不适的来源）',
  'T3（它想对你传达的需求）',
  'T4（你们关系的互动模式）',
  'T5（未来 7-14 天的情绪走向）',
]
const L_POSITIONS = [
  'L1（日常安全感来源）',
  'L2（触发点/敏感点）',
  'L3（最有效的安抚/沟通方式）',
]

function formatCardsForAI(tarot, lenormand) {
  const tarotLines = tarot
    .map((c, i) => `  ${T_POSITIONS[i]}：${c.name} ${c.reversed ? '逆位' : '正位'} — 关键词：${c.keywords}`)
    .join('\n')
  const lenormandLines = lenormand
    .map((c, i) => `  ${L_POSITIONS[i]}：${c.name} — 关键词：${c.keywords}`)
    .join('\n')
  return `[已抽牌]\n塔罗 T1-T5：\n${tarotLines}\n\n雷诺曼 L1-L3：\n${lenormandLines}`
}

function normalizeSignals(text) {
  return text.replace(/[【\[［]DRAW_CARDS[】\]］]/g, '[DRAW_CARDS]')
}

// ── 认证接口 ───────────────────────────────────────────────

app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body || {}
  if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' })
  if (getUserByUsername(username)) return res.status(409).json({ error: '用户名已存在' })
  const hash = await bcrypt.hash(password, 10)
  const user = createUser(username, email, hash, 'user')
  const token = signToken({ id: user.id, username: user.username, role: user.role })
  res.json({ token, user: { id: user.id, username: user.username, role: user.role, display_name: user.display_name } })
})

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' })
  const user = getUserByUsername(username)
  if (!user) return res.status(401).json({ error: '用户名或密码错误' })
  if (user.disabled) return res.status(403).json({ error: '账号已被禁用' })
  const ok = await bcrypt.compare(password, user.password)
  if (!ok) return res.status(401).json({ error: '用户名或密码错误' })
  const token = signToken({ id: user.id, username: user.username, role: user.role })
  res.json({ token, user: { id: user.id, username: user.username, role: user.role, display_name: user.display_name } })
})

app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = getUserById(req.user.id)
  if (!user) return res.status(404).json({ error: '用户不存在' })
  const { password, ...safe } = user
  res.json(safe)
})

// ── 管理员接口 ─────────────────────────────────────────────

app.get('/api/admin/users', requireRole('admin'), (req, res) => {
  const { role } = req.query
  res.json(listUsers(role || undefined))
})

app.post('/api/admin/users', requireRole('admin'), async (req, res) => {
  const { username, email, password, role, display_name } = req.body || {}
  if (!username || !password || !role) return res.status(400).json({ error: '缺少必填字段' })
  if (!['admin', 'fortune_teller', 'user'].includes(role)) return res.status(400).json({ error: '无效的角色' })
  if (getUserByUsername(username)) return res.status(409).json({ error: '用户名已存在' })
  const hash = await bcrypt.hash(password, 10)
  const user = createUser(username, email, hash, role, display_name)
  const { password: _, ...safe } = user
  res.json(safe)
})

app.put('/api/admin/users/:id', requireRole('admin'), async (req, res) => {
  const { display_name, bio, disabled, password, role } = req.body || {}
  const fields = {}
  if (display_name !== undefined) fields.display_name = display_name
  if (bio !== undefined) fields.bio = bio
  if (disabled !== undefined) fields.disabled = disabled ? 1 : 0
  if (role !== undefined) fields.role = role
  if (password) fields.password = await bcrypt.hash(password, 10)
  const user = updateUser(req.params.id, fields)
  const { password: _, ...safe } = user
  res.json(safe)
})

app.get('/api/admin/stats', requireRole('admin'), (req, res) => {
  const counts = countUsers()
  const conversations = listConversations
  res.json({ userCounts: counts })
})

// ── 人设 & 知识库接口（管理员 + 有权限的占卜师）────────────

function canEditKnowledge(user) {
  return user.role === 'admin' || (user.role === 'fortune_teller' && user.can_edit_knowledge)
}

// 获取人设（含默认值）
app.get('/api/prompts/:characterKey', requireAuth, (req, res) => {
  const { characterKey } = req.params
  const db = getCharacterPrompt(characterKey)
  const defaults = getCharacterDefaults(characterKey) || getCharacterDefaults('liliana')
  res.json({
    character_key: characterKey,
    persona: db?.persona ?? defaults.persona,
    chat_flow: db?.chat_flow ?? defaults.chatFlow,
    fortune_instructions: db?.fortune_instructions
      ? JSON.parse(db.fortune_instructions)
      : defaults.fortuneInstructions,
    is_default: !db,
  })
})

// 更新人设
app.put('/api/prompts/:characterKey', requireAuth, (req, res) => {
  const reqUser = getUserById(req.user.id)
  if (!canEditKnowledge(reqUser)) return res.status(403).json({ error: '权限不足' })
  const { characterKey } = req.params
  const { persona, chat_flow, fortune_instructions } = req.body || {}
  const fields = {}
  if (persona !== undefined) fields.persona = persona
  if (chat_flow !== undefined) fields.chat_flow = chat_flow
  if (fortune_instructions !== undefined) fields.fortune_instructions = JSON.stringify(fortune_instructions)
  const result = upsertCharacterPrompt(characterKey, fields)
  res.json(result)
})

// 获取知识库（含默认值）
app.get('/api/knowledge/:characterKey/:type', requireAuth, (req, res) => {
  const { characterKey, type } = req.params
  const kb = getKnowledgeBase(characterKey, type)
  const defaultData = type === 'tarot' ? TAROT_MEANINGS : type === 'lenormand' ? LENORMAND_MEANINGS : {}
  res.json({
    character_key: characterKey,
    type,
    data: kb ? JSON.parse(kb.data) : defaultData,
    is_default: !kb,
  })
})

// 更新知识库
app.put('/api/knowledge/:characterKey/:type', requireAuth, (req, res) => {
  const reqUser = getUserById(req.user.id)
  if (!canEditKnowledge(reqUser)) return res.status(403).json({ error: '权限不足' })
  const { characterKey, type } = req.params
  const { data } = req.body || {}
  if (!data || typeof data !== 'object') return res.status(400).json({ error: 'data 格式错误' })
  const result = upsertKnowledgeBase(characterKey, type, data)
  res.json({ ...result, data: JSON.parse(result.data) })
})

// 管理员给占卜师分配知识库编辑权限
app.put('/api/admin/users/:id/permissions', requireRole('admin'), async (req, res) => {
  const { can_edit_knowledge, character_key } = req.body || {}
  const fields = {}
  if (can_edit_knowledge !== undefined) fields.can_edit_knowledge = can_edit_knowledge ? 1 : 0
  if (character_key !== undefined) fields.character_key = character_key
  const user = updateUser(req.params.id, fields)
  const { password, ...safe } = user
  res.json(safe)
})

// ── 占卜师接口 ─────────────────────────────────────────────

app.get('/api/fortune-teller/profile', requireRole('admin', 'fortune_teller'), (req, res) => {
  const user = getUserById(req.user.id)
  if (!user) return res.status(404).json({ error: '用户不存在' })
  const { password, ...safe } = user
  res.json(safe)
})

app.put('/api/fortune-teller/profile', requireRole('admin', 'fortune_teller'), async (req, res) => {
  const { display_name, bio } = req.body || {}
  const fields = {}
  if (display_name !== undefined) fields.display_name = display_name
  if (bio !== undefined) fields.bio = bio
  const user = updateUser(req.user.id, fields)
  const { password, ...safe } = user
  res.json(safe)
})

// ── 对话记录 CRUD ──────────────────────────────────────────

app.get('/api/conversations', (req, res) => {
  const { deviceId } = req.query
  if (!deviceId) return res.status(400).json({ error: 'deviceId required' })
  res.json(listConversations(deviceId))
})

app.get('/api/conversations/:id', (req, res) => {
  const conv = getConversation(req.params.id)
  if (!conv) return res.status(404).json({ error: 'Not found' })
  res.json(conv)
})

app.post('/api/conversations', (req, res) => {
  const { deviceId, title, messages } = req.body || {}
  if (!deviceId) return res.status(400).json({ error: 'deviceId required' })
  res.json(createConversation(deviceId, title, messages))
})

app.put('/api/conversations/:id', (req, res) => {
  const { messages, title } = req.body || {}
  updateConversation(req.params.id, messages ?? [], title)
  res.json({ ok: true })
})

app.delete('/api/conversations/:id', (req, res) => {
  deleteConversation(req.params.id)
  res.json({ ok: true })
})

/**
 * POST /api/fortune  —  快速感应模式
 */
app.post('/api/fortune', async (req, res) => {
  const { petType = 'other', petName = '毛孩子', emotion = '', question = '', method = 'direct', cards = [], characterId = 'liliana' } = req.body || {}

  if (clients.length === 0) {
    return res.status(500).json({
      error: '未配置 API Key',
      message: '请在 .env 中配置 DEEPSEEK_API_KEY 或 OPENAI_API_KEY',
    })
  }

  const petLabel = { dog: '狗狗', cat: '猫咪', rabbit: '兔子', bird: '鸟' }[petType] || '宠物'
  const systemPrompt = buildSystemPrompt(method, characterId)

  const posLabel = (card) => (card.reversed ? '逆位' : '正位')
  const reversedNote = cards.some(c => c.reversed)
    ? '\n注意：逆位牌代表该牌的能量受到阻碍、内化或尚未释放，请在解读中体现出这种张力与转化的可能。'
    : ''

  let cardList = ''
  if (cards.length > 0 && method === 'tarot3') {
    const positions = ['过去', '现在', '未来']
    cardList = `\n本次三张牌阵：\n${cards.map((c, i) => `  ${positions[i]}：${c.name} ${posLabel(c)}`).join('\n')}${reversedNote}`
  } else if (cards.length > 0) {
    cardList = `\n本次抽到的牌：\n${cards.map(c => `  ${c.name} ${posLabel(c)}`).join('\n')}${reversedNote}`
  }

  const isTarotMethod = method === 'tarot1' || method === 'tarot3'
  const cardMeanings = buildCardMeaningsContext(
    isTarotMethod ? cards : [],
    method === 'lenormand' ? cards : [],
    characterId,
  )

  const userPrompt = `宠物类型：${petLabel}，名字：${petName}。${emotion ? `\n主人感应到 TA 现在的状态：${emotion}。` : ''}${cardList}${cardMeanings}\n${question ? `\n主人的问题：${question}` : '\n主人想感应 TA 此刻最想说的话。'}`

  try {
    const completion = await createChatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 800,
      temperature: 0.85,
    })

    const content = completion.choices?.[0]?.message?.content?.trim() || '（暂时没有收到回复，请稍后再试。）'
    res.json({ message: content })
  } catch (err) {
    console.error('API 调用错误:', err.message)
    res.status(500).json({
      error: '占卜服务暂时不可用',
      message: err.message || '请检查 DEEPSEEK_API_KEY / OPENAI_API_KEY 是否有效',
    })
  }
})

/**
 * POST /api/chat  —  对话占卜师模式（后端自动抽牌）
 * characterId: 'liliana' | 'yiqing'，默认 liliana
 * confirm=true 时跳过第一次调用，直接用传入的 intro 和 messages 抽牌解读
 */
app.post('/api/chat', async (req, res) => {
  const { messages = [], confirm = false, intro: confirmedIntro = null, characterId = 'liliana' } = req.body || {}

  if (clients.length === 0) {
    return res.status(500).json({ error: '未配置 API Key，请在 .env 中配置 DEEPSEEK_API_KEY 或 OPENAI_API_KEY' })
  }

  const buildCleanMessages = (msgs) =>
    msgs
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => {
        const content = String(m.content || '')
        if (m.role === 'user' && content.startsWith('[已抽牌]')) {
          const meanings = buildCardMeaningsContext(m.tarot || [], m.lenormand || [], characterId)
          return { role: 'user', content: content + meanings }
        }
        return { role: m.role, content }
      })

  try {
    let intro

    if (confirm && confirmedIntro !== undefined) {
      // 用户已在弹窗确认，直接进入抽牌流程
      intro = confirmedIntro
    } else {
    // 第一次调用：信息收集阶段
    const firstCompletion = await createChatCompletion({
      messages: [
        { role: 'system', content: buildChatSystemPrompt(characterId) },
        ...buildCleanMessages(messages),
      ],
      max_tokens: 900,
      temperature: 0.8,
    })

    const firstChoice = firstCompletion.choices?.[0]
    let rawContent = normalizeSignals(firstChoice?.message?.content?.trim() || '')

    // 被截断时补收束语，防止对话在中途戛然而止
    if (firstChoice?.finish_reason === 'length' && !rawContent.includes('[DRAW_CARDS]')) {
      rawContent += '\n\n今天先到这里。有什么还想问的，随时来找我。'
    }

    // 如果 AI 还在聊天（未准备抽牌），直接返回
    if (!rawContent.includes('[DRAW_CARDS]')) {
      // 兜底：如果 AI 说了"来抽牌/帮你抽/开始抽"之类但忘了输出信号，强制触发
      const drawHint = /我来抽牌|帮你抽|帮您抽|开始抽牌|为你抽|为您抽|抽取牌面|牌面落下/.test(rawContent)
      if (drawHint) {
        const intro = rawContent.trim()
        return res.json({ drawReady: true, intro: intro || null })
      }
      return res.json({ message: rawContent })
    }

      // 检测到 [DRAW_CARDS]，先返回 drawReady，等前端用户确认
      const signalIdx = rawContent.indexOf('[DRAW_CARDS]')
      intro = rawContent.slice(0, signalIdx).trim()
      return res.json({ drawReady: true, intro: intro || null })
    }

    // 服务端抽牌：塔罗 5 张 + 雷诺曼 3 张
    const tarotCards = drawCards('tarot', 5)
    const lenormandCards = drawCards('lenormand', 3)
    const cardText = formatCardsForAI(tarotCards, lenormandCards)
    const cardMeanings = buildCardMeaningsContext(tarotCards, lenormandCards, characterId)

    const readingMessages = [
      ...buildCleanMessages(messages),
      ...(intro ? [{ role: 'assistant', content: intro }] : []),
      { role: 'user', content: cardText + cardMeanings },
    ]

    // 第二次调用：牌面解读（一次性输出）
    const readingCompletion = await createChatCompletion({
      messages: [
        { role: 'system', content: buildChatSystemPrompt(characterId) },
        ...readingMessages,
      ],
      max_tokens: 2400,
      temperature: 0.85,
    })

    const choice = readingCompletion.choices?.[0]
    let reading = normalizeSignals(
      choice?.message?.content?.trim() || '（暂时没有收到解读，请稍后重试。）'
    ).replace(/\[DRAW_CARDS\]/g, '').trim()

    // 如果被 token 限制截断，补一句符合莉莉安娜风格的收束
    if (choice?.finish_reason === 'length') {
      reading += '\n\n今天先到这里。有什么还想问的，随时来找我。'
    }

    return res.json({
      message: reading,
      // confirm=true 时 intro 已在前端展示过，不再重复返回
      intro: confirm ? null : (intro || null),
      cards: { tarot: tarotCards, lenormand: lenormandCards },
    })
  } catch (err) {
    console.error('API 调用错误（chat）:', err.message)
    res.status(500).json({ error: '占卜服务暂时不可用', message: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`后端已启动: http://localhost:${PORT}`)
  if (clients.length === 0) {
    console.warn('未检测到 DEEPSEEK_API_KEY 或 OPENAI_API_KEY，请在 .env 中配置后再使用占卜功能')
  } else {
    console.log('已启用 API 提供商:', clients.map(c => c.name).join(', '))
  }
})
