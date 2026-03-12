/**
 * 提示词统一出口（注册表架构）
 *
 * ── 如何新增占卜师 ────────────────────────────────────────
 * 1. 在 characters/ 目录新建一个文件（参考 liliana.js 的结构）
 * 2. 在下方 CHARACTER_REGISTRY 里注册
 * 3. 不需要修改任何其他文件
 *
 * ── 如何新增知识体系 ─────────────────────────────────────
 * 1. 在 knowledge/ 目录新建一个文件，导出 getMeaning(cardName, ...) 函数
 * 2. 在下方 KNOWLEDGE_REGISTRY 里注册（key 对应角色文件里 knowledgeBases 的值）
 * 3. 不需要修改任何其他文件
 *
 * ── 架构说明 ─────────────────────────────────────────────
 * - 系统 prompt 只包含「角色人设 + 流程指令」，保持简短
 * - 牌义通过 buildCardMeaningsContext() 在抽牌时动态注入用户消息
 * - 只有角色声明了 knowledgeBases 里的知识体系，对应牌义才会被注入
 */

import * as liliana from './characters/liliana.js'
import * as yiqing from './characters/yiqing.js'
import { getTarotMeaning } from './knowledge/tarot.js'
import { getLenormandMeaning } from './knowledge/lenormand.js'
import { TAROT_MEANINGS } from './knowledge/tarot.js'
import { LENORMAND_MEANINGS } from './knowledge/lenormand.js'
import { getCharacterPrompt, getKnowledgeBase } from '../db.js'

// ── 角色注册表 ────────────────────────────────────────────
// key: 角色 id，value: 角色模块
const CHARACTER_REGISTRY = {
  liliana,
  yiqing,
  // 示例：未来新增占卜师时取消注释
  // astral: (await import('./characters/astral.js')),
}

// ── 知识体系注册表 ─────────────────────────────────────────
const KNOWLEDGE_REGISTRY = {
  tarot: {
    getMeaning: getTarotMeaning,   // getMeaning(cardName, reversed) → string
    label: '塔罗牌',
  },
  lenormand: {
    getMeaning: (cardName) => getLenormandMeaning(cardName),
    label: '雷诺曼牌',
  },
}

// ── 内部辅助 ──────────────────────────────────────────────

function getCharacter(characterId = 'liliana') {
  const char = CHARACTER_REGISTRY[characterId]
  if (!char) throw new Error(`未找到角色：${characterId}`)
  // 从 DB 读取覆盖值，fallback 到 JS 默认值
  const dbPrompt = getCharacterPrompt(characterId)
  return {
    ...char,
    persona: dbPrompt?.persona || char.persona,
    chatFlow: dbPrompt?.chat_flow || char.chatFlow,
    fortuneInstructions: dbPrompt?.fortune_instructions
      ? JSON.parse(dbPrompt.fortune_instructions)
      : char.fortuneInstructions,
  }
}

function getKnowledgeMeaning(characterId, type, cardName, reversed) {
  const kb = getKnowledgeBase(characterId, type)
  if (kb) {
    const data = JSON.parse(kb.data)
    const entry = data[cardName]
    if (entry) {
      if (type === 'tarot' && typeof entry === 'object') {
        return `${cardName}（${reversed ? '逆位' : '正位'}）：${reversed ? entry.reversed : entry.upright}`
      }
      return `${cardName}：${typeof entry === 'string' ? entry : (entry.upright || entry)}`
    }
  }
  // fallback 到默认 JS
  if (type === 'tarot') return getTarotMeaning(cardName, reversed)
  return getLenormandMeaning(cardName)
}

// ── 对外导出 ──────────────────────────────────────────────

/**
 * 对话咨询模式的系统 prompt
 * @param {string} characterId  角色 id，默认 'liliana'
 */
export function buildChatSystemPrompt(characterId = 'liliana') {
  const char = getCharacter(characterId)
  return `${char.persona}\n\n${char.chatFlow}`
}

/**
 * 快速感应模式的系统 prompt
 * @param {'direct'|'tarot1'|'tarot3'|'lenormand'} method
 * @param {string} characterId  角色 id，默认 'liliana'
 */
export function buildSystemPrompt(method, characterId = 'liliana') {
  const char = getCharacter(characterId)
  const instruction = char.fortuneInstructions?.[method] || char.fortuneInstructions?.direct || ''
  return `${char.persona}\n\n${instruction}`
}

/**
 * 动态生成被抽到的牌的含义说明，用于注入到用户消息里
 * 只注入该角色「声明掌握的知识体系」对应的牌义
 *
 * @param {Array}  tarotCards     塔罗牌数组（含 name, reversed 字段）
 * @param {Array}  lenormandCards 雷诺曼牌数组（含 name 字段）
 * @param {string} characterId   角色 id，默认 'liliana'
 * @returns {string}
 */
export function buildCardMeaningsContext(tarotCards = [], lenormandCards = [], characterId = 'liliana') {
  const char = getCharacter(characterId)
  const lines = []

  if (char.knowledgeBases.includes('tarot') && tarotCards.length > 0) {
    lines.push(`本次抽到的塔罗牌含义参考：`)
    tarotCards.forEach(card => {
      const meaning = getKnowledgeMeaning(characterId, 'tarot', card.name, card.reversed)
      if (meaning) lines.push(`  ${meaning}`)
    })
  }

  if (char.knowledgeBases.includes('lenormand') && lenormandCards.length > 0) {
    lines.push(`本次抽到的雷诺曼牌含义参考：`)
    lenormandCards.forEach(card => {
      const meaning = getKnowledgeMeaning(characterId, 'lenormand', card.name, false)
      if (meaning) lines.push(`  ${meaning}`)
    })
  }

  return lines.length > 0 ? '\n\n' + lines.join('\n') : ''
}

