import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { drawCards, finalizeSelectedCards, getDeck } from '../data/cards'
import { getCharacter } from '../data/characters'

const PET_TYPES = [
  { id: 'dog', label: '狗狗', emoji: '🐶' },
  { id: 'cat', label: '猫咪', emoji: '🐱' },
  { id: 'rabbit', label: '兔子', emoji: '🐰' },
  { id: 'bird', label: '鸟类', emoji: '🐦' },
  { id: 'other', label: '其他', emoji: '🐾' },
]

const EMOTIONS = ['平静', '开心', '敏感', '想念', '委屈', '黏人', '烦躁', '不安', '疲惫', '未知']

const LILIANA_METHODS = [
  { id: 'direct', label: '直接感应', emoji: '💬', desc: '不抽牌，直接回应它当下最强的情绪讯号。' },
  { id: 'tarot1', label: '塔罗 1 张', emoji: '🃏', desc: '一张核心牌，适合快速确认重点。' },
  { id: 'tarot3', label: '塔罗 3 张', emoji: '✨', desc: '过去、现在、未来三张牌阵。' },
  { id: 'lenormand', label: '雷诺曼 2 张', emoji: '🌙', desc: '适合看关系氛围与细微信号。' },
]

const YIQING_METHODS = [
  { id: 'direct', label: '气场直感', emoji: '🌫️', desc: '先从整体气场进入，不立即起卦。' },
  { id: 'tarot3', label: '塔罗 3 张', emoji: '🍃', desc: '作为过渡法，读取关系走势。' },
  { id: 'liuyao', label: '东玄六爻', emoji: '☯️', desc: '六次起爻，读取主卦、变卦与当前动因。' },
]

const QUICK_QUESTIONS = {
  liliana: [
    '你最近是不是有点委屈？',
    '我怎样做会让你更安心？',
    '你最想告诉我的是什么？',
  ],
  yiqing: [
    '最近这段关系的气场哪里变了？',
    '我现在最该顺着什么做调整？',
    '这件事背后的因果线索是什么？',
  ],
}

const MEDITATION_STEPS = [
  '闭上眼睛，慢慢呼吸。',
  '在心里默念你此刻真正想问的事。',
  '把注意力放在你和它之间的连接上。',
  '讯号正在靠近，请再停留一会儿。',
]

const TAROT_POSITIONS = ['过去', '现在', '未来']
const LIUYAO_LABELS = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻']

const TRIGRAM_NAMES = {
  '111': '乾',
  '110': '兑',
  '101': '离',
  '100': '震',
  '011': '巽',
  '010': '坎',
  '001': '艮',
  '000': '坤',
}

function getThemeClasses(characterId) {
  const isYiqing = characterId === 'yiqing'
  return {
    isYiqing,
    accentText: isYiqing ? 'text-verdant-900' : 'text-mystic-800',
    accentSoftText: isYiqing ? 'text-verdant-600' : 'text-mystic-600',
    accentTag: isYiqing ? 'text-verdant-500' : 'text-mystic-400',
    accentBg: isYiqing ? 'bg-verdant-600 hover:bg-verdant-700' : 'bg-mystic-600 hover:bg-mystic-700',
    accentSoftBg: isYiqing ? 'bg-verdant-50' : 'bg-mystic-50',
    accentBorder: isYiqing ? 'border-verdant-300' : 'border-mystic-300',
    accentRing: isYiqing ? 'focus:border-verdant-500 focus:ring-verdant-200' : 'focus:border-mystic-500 focus:ring-mystic-200',
    accentPanel: isYiqing ? 'border-verdant-200 bg-verdant-50/70' : 'border-mystic-200 bg-mystic-50/70',
    accentChip: isYiqing ? 'bg-verdant-500 text-white' : 'bg-mystic-500 text-white',
  }
}

function buildHexagramName(lines) {
  const binary = lines.map((line) => (line.kind === 'yang' ? '1' : '0'))
  const lower = binary.slice(0, 3).join('')
  const upper = binary.slice(3, 6).join('')
  return `${TRIGRAM_NAMES[upper] || '未知'}上${TRIGRAM_NAMES[lower] || '未知'}下`
}

function generateLiuyaoCast() {
  const values = [6, 7, 8, 9]
  const lines = Array.from({ length: 6 }, (_, index) => {
    const value = values[Math.floor(Math.random() * values.length)]
    const isYang = value === 7 || value === 9
    const moving = value === 6 || value === 9
    return {
      index,
      label: LIUYAO_LABELS[index],
      value,
      kind: isYang ? 'yang' : 'yin',
      moving,
      text: `${LIUYAO_LABELS[index]}：${isYang ? '阳' : '阴'}${moving ? ' 动' : ' 静'}`,
    }
  })

  const changedLines = lines.map((line) =>
    line.moving
      ? { ...line, kind: line.kind === 'yang' ? 'yin' : 'yang', moving: false }
      : line
  )

  return {
    lines,
    primary: buildHexagramName(lines),
    relating: buildHexagramName(changedLines),
    movingCount: lines.filter((line) => line.moving).length,
  }
}

function MeditationOverlay({ petName, isYiqing }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((value) => (value + 1) % MEDITATION_STEPS.length)
    }, 2000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-sm ${isYiqing ? 'bg-verdant-900/88' : 'bg-mystic-900/88'}`}>
      <div className="relative flex items-center justify-center">
        <div className={`absolute h-32 w-32 animate-ping rounded-full ${isYiqing ? 'bg-verdant-300/18' : 'bg-mystic-300/18'}`} />
        <div className={`absolute h-24 w-24 animate-pulse rounded-full ${isYiqing ? 'bg-mystic-300/18' : 'bg-verdant-300/18'}`} />
        <div className={`relative h-16 w-16 rounded-full bg-gradient-to-br ${isYiqing ? 'from-verdant-300 to-mystic-400 shadow-verdant-500/40' : 'from-mystic-300 to-verdant-400 shadow-mystic-500/40'} shadow-lg`} />
      </div>
      <p className="mt-10 font-serif text-lg text-white">{petName}</p>
      <p key={step} className="mt-3 animate-pulse text-sm text-white/75">
        {MEDITATION_STEPS[step]}
      </p>
    </div>
  )
}

function MethodCard({ method, selected, onClick, classes }) {
  return (
    <button
      type="button"
      onClick={() => onClick(method.id)}
      className={`rounded-xl border-2 p-3 text-left transition ${
        selected ? `${classes.accentBorder} ${classes.accentSoftBg}` : 'border-stone-200 bg-white hover:border-stone-300'
      }`}
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0 text-base leading-none">{method.emoji}</span>
        <div className="min-w-0">
          <p className={`text-sm font-semibold leading-snug ${selected ? classes.accentText : 'text-stone-700'}`}>{method.label}</p>
          <p className="mt-1 text-xs leading-relaxed text-stone-400">{method.desc}</p>
        </div>
      </div>
    </button>
  )
}

function CardSpreadPicker({ type, count, classes, title, description, onConfirm, onCancel }) {
  const [selectedIds, setSelectedIds] = useState([])
  const sourceDeck = getDeck(type)
  const deck = type === 'lenormand' ? sourceDeck.slice(0, 35) : sourceDeck
  const selectedCards = selectedIds
    .map((cardId) => deck.find((card) => card.id === cardId))
    .filter(Boolean)
  const remainingCards = deck.filter((card) => !selectedIds.includes(card.id))
  const arcDepth = type === 'lenormand' ? 108 : 92
  const spreadWidth = type === 'lenormand' ? 760 : 620

  const toggleCard = (cardId) => {
    setSelectedIds((prev) => {
      if (prev.includes(cardId)) return prev.filter((id) => id !== cardId)
      if (prev.length >= count) return prev
      return [...prev, cardId]
    })
  }

  const handleConfirm = () => {
    onConfirm(finalizeSelectedCards(type, selectedCards))
  }

  const getFanStyle = (index, total) => {
    if (total <= 0) return {}
    const center = (total - 1) / 2
    const offset = index - center
    const angleStep = total > 26 ? 2.6 : 4.2
    const angle = offset * angleStep
    const horizontal = total === 1 ? 0 : (offset / Math.max(center, 1)) * (spreadWidth / 2)
    const vertical = Math.abs(offset) * (arcDepth / Math.max(center + 1, 2))
    return {
      left: '50%',
      bottom: `${12 + Math.min(vertical, arcDepth)}px`,
      transform: `translateX(calc(-50% + ${horizontal}px)) rotate(${angle}deg)`,
      transformOrigin: 'center 140%',
      zIndex: 20 + index,
    }
  }

  return (
    <div className={`mt-4 rounded-[1.5rem] border px-4 py-5 ${classes.accentPanel}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={`text-sm font-semibold ${classes.accentText}`}>{title}</p>
          <p className="mt-1 text-xs leading-6 text-stone-500">{description}</p>
          <p className={`mt-2 text-xs ${classes.accentSoftText}`}>已选 {selectedIds.length} / {count}</p>
        </div>
        <button type="button" onClick={onCancel} className="text-xs text-stone-400 hover:text-stone-600">
          收起牌阵
        </button>
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-white/60 bg-white/55 p-4 shadow-[0_20px_60px_rgba(120,120,120,0.08)] backdrop-blur-sm">
        <div className="rounded-[1.25rem] border border-dashed border-stone-200/90 bg-white/70 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <p className={`text-sm font-semibold ${classes.accentText}`}>已抽出的牌位</p>
            <p className="text-xs text-stone-400">
              {selectedIds.length === count ? '可以确认本次抽牌了' : '从下方牌阵里把牌抽到上方'}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: count }, (_, index) => {
              const card = selectedCards[index]
              return (
                <div
                  key={`selected-slot-${index}`}
                  className={`relative min-h-[132px] rounded-[1.25rem] border border-dashed px-3 py-4 transition ${
                    card ? 'border-stone-200 bg-white shadow-md shadow-stone-200/60' : 'border-stone-200/80 bg-stone-50/70'
                  }`}
                >
                  <span className={`absolute left-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold text-white ${classes.accentBg.split(' ')[0]}`}>
                    {index + 1}
                  </span>
                  {card ? (
                    <div className="flex h-full flex-col justify-end">
                      <div
                        className={`mb-3 h-16 rounded-2xl bg-gradient-to-br ${
                          classes.isYiqing
                            ? 'from-verdant-400 via-verdant-500 to-mystic-400'
                            : 'from-mystic-400 via-mystic-500 to-verdant-400'
                        } shadow-lg`}
                      />
                      <p className="text-sm font-semibold text-stone-700">{card.name}</p>
                      <p className="mt-1 text-xs text-stone-400">已从牌阵中抽出</p>
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center text-center text-xs leading-6 text-stone-400">
                      等待第 {index + 1} 张牌
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-[1.25rem] border border-stone-200/80 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_rgba(236,233,245,0.88)_52%,_rgba(224,237,232,0.9)_100%)] px-3 pb-5 pt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-stone-600">牌背已铺开，点击你要抽取的那一张。</p>
            <p className="text-xs text-stone-400">
              剩余 {remainingCards.length} 张 / 共 {deck.length} 张
            </p>
          </div>

          <div className="relative mt-6 h-[300px] sm:h-[340px]">
            <div className="pointer-events-none absolute inset-x-8 bottom-0 h-24 rounded-[999px] bg-stone-900/8 blur-3xl" />
            {remainingCards.map((card, index) => (
              <button
                key={`${card.id}-${index}`}
                type="button"
                onClick={() => toggleCard(card.id)}
                style={getFanStyle(index, remainingCards.length)}
                className="group absolute h-[120px] w-[76px] rounded-[1.15rem] border border-white/80 bg-white/80 p-1.5 shadow-[0_12px_28px_rgba(80,80,80,0.16)] transition duration-200 hover:-translate-y-5 hover:scale-[1.04] hover:shadow-[0_22px_40px_rgba(80,80,80,0.22)] sm:h-[132px] sm:w-[84px]"
              >
                <div
                  className={`absolute inset-1.5 rounded-[0.95rem] bg-gradient-to-br ${
                    classes.isYiqing
                      ? 'from-verdant-400 via-verdant-500 to-mystic-400'
                      : 'from-mystic-400 via-mystic-500 to-verdant-400'
                  } opacity-95`}
                />
                <div className="absolute inset-[9px] rounded-[0.8rem] border border-white/45" />
                <div className="relative z-10 flex h-full flex-col items-center justify-center text-white">
                  <span className="text-lg">✦</span>
                  <span className="mt-1 text-[10px] font-semibold tracking-[0.22em] uppercase">Draw</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={selectedIds.length !== count}
          className={`rounded-2xl px-5 py-3 text-sm font-semibold text-white disabled:opacity-50 ${classes.accentBg}`}
        >
          确认抽取这 {count} 张
        </button>
        <button type="button" onClick={() => setSelectedIds([])} className="rounded-2xl border border-stone-300 px-5 py-3 text-sm text-stone-600 hover:bg-white">
          清空选择
        </button>
      </div>
    </div>
  )
}

function PetMetaSection({ petType, setPetType, petName, setPetName, classes }) {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-stone-700">宠物类型</label>
        <div className="mt-3 flex flex-wrap gap-2">
          {PET_TYPES.map((pet) => (
            <button
              key={pet.id}
              type="button"
              onClick={() => setPetType(pet.id)}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                petType === pet.id ? `${classes.accentBorder} ${classes.accentSoftBg} ${classes.accentText}` : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
              }`}
            >
              <span className="mr-2">{pet.emoji}</span>
              {pet.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="petName" className="block text-sm font-medium text-stone-700">
          宠物名字
        </label>
        <input
          id="petName"
          type="text"
          value={petName}
          onChange={(e) => setPetName(e.target.value)}
          placeholder="例如：奶酪、元宝、七七"
          className={`mt-2 w-full rounded-xl border border-stone-200 px-4 py-3 focus:outline-none focus:ring-2 ${classes.accentRing}`}
        />
      </div>
    </div>
  )
}

function LilianaFortune({ state, onSubmit, submitting }) {
  const classes = getThemeClasses('liliana')
  const [petType, setPetType] = useState(state.petType || 'other')
  const [petName, setPetName] = useState(state.petName || '毛孩子')
  const [selectedEmotion, setSelectedEmotion] = useState('')
  const [method, setMethod] = useState('direct')
  const [question, setQuestion] = useState('')
  const [drawnCards, setDrawnCards] = useState([])
  const [pickerOpen, setPickerOpen] = useState(false)

  const needsCards = method !== 'direct'

  const handleMethodChange = (id) => {
    setMethod(id)
    setDrawnCards([])
    setPickerOpen(false)
  }

  const handleDraw = () => {
    if (method === 'tarot1' || method === 'tarot3' || method === 'lenormand') {
      setPickerOpen(true)
    }
  }

  const handleConfirmPickedCards = (cards) => {
    setDrawnCards(cards)
    setPickerOpen(false)
  }

  const submit = (e) => {
    e.preventDefault()
    onSubmit({
      characterId: 'liliana',
      petType,
      petName: petName || '毛孩子',
      emotion: selectedEmotion,
      question: question.trim(),
      method,
      cards: drawnCards,
    })
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-8">
      <div className={`rounded-3xl border px-5 py-5 ${classes.accentPanel}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-mystic-500">Liliana Tarot Flow</p>
        <h2 className={`mt-2 font-serif text-2xl ${classes.accentText}`}>莉莉安娜快速塔罗</h2>
        <p className="mt-2 text-sm leading-7 text-stone-600">
          这里不再是混合占位页，而是莉莉安娜专属的快速感应路径。适合塔罗、情绪确认与关系回应。
        </p>
      </div>

      <PetMetaSection
        petType={petType}
        setPetType={setPetType}
        petName={petName}
        setPetName={setPetName}
        classes={classes}
      />

      <div>
        <label className="block text-sm font-medium text-stone-700">它今天像什么情绪？</label>
        <div className="mt-3 flex flex-wrap gap-2">
          {EMOTIONS.map((emotion) => (
            <button
              key={emotion}
              type="button"
              onClick={() => setSelectedEmotion((prev) => (prev === emotion ? '' : emotion))}
              className={`rounded-full px-4 py-2 text-sm transition ${
                selectedEmotion === emotion ? classes.accentChip : 'bg-stone-100 text-stone-600 hover:bg-white hover:text-stone-800'
              }`}
            >
              {emotion}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700">选择占卜方式</label>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {LILIANA_METHODS.map((item) => (
            <MethodCard key={item.id} method={item} selected={method === item.id} onClick={handleMethodChange} classes={classes} />
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="question" className="block text-sm font-medium text-stone-700">
          你想问它什么？
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK_QUESTIONS.liliana.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setQuestion((prev) => (prev ? `${prev}\n${q}` : q))}
              className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-600 transition hover:border-stone-300 hover:bg-stone-50"
            >
              {q}
            </button>
          ))}
        </div>
        <textarea
          id="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="例如：你最近到底在委屈什么？"
          rows={3}
          className={`mt-2 w-full resize-none rounded-xl border border-stone-200 px-4 py-3 focus:outline-none focus:ring-2 ${classes.accentRing}`}
        />
      </div>

      {needsCards && (
        <div>
          <label className="block text-sm font-medium text-stone-700">带着问题抽牌</label>
          {drawnCards.length === 0 ? (
            <button
              type="button"
              onClick={handleDraw}
              className={`mt-3 w-full rounded-xl border-2 border-dashed py-5 text-sm font-medium transition ${classes.accentBorder} ${classes.accentSoftBg} ${classes.accentSoftText}`}
            >
              点击抽牌
            </button>
          ) : (
            <div className={`mt-3 rounded-xl border px-4 py-4 ${classes.accentPanel}`}>
              <div className="flex items-center justify-between">
                <p className={`text-sm font-medium ${classes.accentSoftText}`}>已抽 {drawnCards.length} 张牌，结果页揭晓牌面</p>
                <button type="button" onClick={handleDraw} className="text-xs text-stone-400 hover:text-stone-600">
                  重新抽
                </button>
              </div>
              {method === 'tarot3' && (
                <div className="mt-3 flex gap-2 text-xs text-stone-400">
                  {TAROT_POSITIONS.map((position) => (
                    <span key={position} className="rounded-full bg-white/70 px-2 py-1">
                      {position}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {pickerOpen && (
            <CardSpreadPicker
              type={method === 'lenormand' ? 'lenormand' : 'tarot'}
              count={method === 'tarot1' ? 1 : method === 'tarot3' ? 3 : 2}
              classes={classes}
              title={method === 'lenormand' ? '雷诺曼牌组' : '塔罗牌组'}
              description={
                method === 'lenormand'
                  ? '请从铺开的雷诺曼牌组中亲手选出 2 张。当前按你的要求展示 35 张牌。'
                  : method === 'tarot1'
                    ? '请从 22 张大阿尔卡纳中选出 1 张核心牌。'
                    : '请从 22 张大阿尔卡纳中选出 3 张，形成过去、现在、未来的牌阵。'
              }
              onConfirm={handleConfirmPickedCards}
              onCancel={() => setPickerOpen(false)}
            />
          )}
        </div>
      )}

      <div className="flex gap-3">
        <Link to="/pet" className="rounded-xl border border-stone-300 px-5 py-3 text-stone-600 hover:bg-stone-50">
          返回角色选择
        </Link>
        <button
          type="submit"
          disabled={submitting || !question.trim() || (needsCards && drawnCards.length === 0)}
          className={`flex-1 rounded-xl px-6 py-3 font-medium text-white disabled:opacity-50 ${classes.accentBg}`}
        >
          开始莉莉安娜占卜
        </button>
      </div>
    </form>
  )
}

function YiqingFortune({ state, onSubmit, submitting }) {
  const classes = getThemeClasses('yiqing')
  const [petType, setPetType] = useState(state.petType || 'other')
  const [petName, setPetName] = useState(state.petName || '毛孩子')
  const [selectedEmotion, setSelectedEmotion] = useState('')
  const [method, setMethod] = useState('liuyao')
  const [question, setQuestion] = useState('')
  const [drawnCards, setDrawnCards] = useState([])
  const [liuyaoCast, setLiuyaoCast] = useState(null)

  const needsCards = method === 'tarot3'
  const needsLiuyao = method === 'liuyao'

  const handleMethodChange = (id) => {
    setMethod(id)
    setDrawnCards([])
    setLiuyaoCast(null)
  }

  const handleDrawTarot = () => setDrawnCards(drawCards('tarot', 3))
  const handleCast = () => setLiuyaoCast(generateLiuyaoCast())

  const submit = (e) => {
    e.preventDefault()
    onSubmit({
      characterId: 'yiqing',
      petType,
      petName: petName || '毛孩子',
      emotion: selectedEmotion,
      question: question.trim(),
      method,
      cards: drawnCards,
      liuyao: liuyaoCast,
    })
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-8">
      <div className={`rounded-3xl border px-5 py-5 ${classes.accentPanel}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-verdant-500">Yiqing Eastern Flow</p>
        <h2 className={`mt-2 font-serif text-2xl ${classes.accentText}`}>易清东方卜感</h2>
        <p className="mt-2 text-sm leading-7 text-stone-600">
          易清分支现在拥有独立的快速页。你可以继续使用三张塔罗，也可以直接进入东玄六爻起卦。
        </p>
      </div>

      <PetMetaSection
        petType={petType}
        setPetType={setPetType}
        petName={petName}
        setPetName={setPetName}
        classes={classes}
      />

      <div>
        <label className="block text-sm font-medium text-stone-700">先感受一下当前气场</label>
        <div className="mt-3 flex flex-wrap gap-2">
          {EMOTIONS.map((emotion) => (
            <button
              key={emotion}
              type="button"
              onClick={() => setSelectedEmotion((prev) => (prev === emotion ? '' : emotion))}
              className={`rounded-full px-4 py-2 text-sm transition ${
                selectedEmotion === emotion ? classes.accentChip : 'bg-stone-100 text-stone-600 hover:bg-white hover:text-stone-800'
              }`}
            >
              {emotion}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700">选择卜感方式</label>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {YIQING_METHODS.map((item) => (
            <MethodCard key={item.id} method={item} selected={method === item.id} onClick={handleMethodChange} classes={classes} />
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="yiqing-question" className="block text-sm font-medium text-stone-700">
          你想确认什么？
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK_QUESTIONS.yiqing.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setQuestion((prev) => (prev ? `${prev}\n${q}` : q))}
              className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-600 transition hover:border-stone-300 hover:bg-stone-50"
            >
              {q}
            </button>
          ))}
        </div>
        <textarea
          id="yiqing-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="例如：最近它和我之间的气场为什么变得更疏离了？"
          rows={3}
          className={`mt-2 w-full resize-none rounded-xl border border-stone-200 px-4 py-3 focus:outline-none focus:ring-2 ${classes.accentRing}`}
        />
      </div>

      {needsCards && (
        <div>
          <label className="block text-sm font-medium text-stone-700">易清三张牌阵</label>
          {drawnCards.length === 0 ? (
            <button
              type="button"
              onClick={handleDrawTarot}
              className={`mt-3 w-full rounded-xl border-2 border-dashed py-5 text-sm font-medium transition ${classes.accentBorder} ${classes.accentSoftBg} ${classes.accentSoftText}`}
            >
              抽三张牌
            </button>
          ) : (
            <div className={`mt-3 rounded-xl border px-4 py-4 ${classes.accentPanel}`}>
              <div className="flex items-center justify-between">
                <p className={`text-sm font-medium ${classes.accentSoftText}`}>已抽三张牌，结果页会显示牌义与位置</p>
                <button type="button" onClick={handleDrawTarot} className="text-xs text-stone-400 hover:text-stone-600">
                  重新抽
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {needsLiuyao && (
        <div>
          <label className="block text-sm font-medium text-stone-700">东玄六爻起卦</label>
          {!liuyaoCast ? (
            <button
              type="button"
              onClick={handleCast}
              className={`mt-3 w-full rounded-xl border-2 border-dashed py-5 text-sm font-medium transition ${classes.accentBorder} ${classes.accentSoftBg} ${classes.accentSoftText}`}
            >
              起一卦
            </button>
          ) : (
            <div className={`mt-3 rounded-2xl border px-4 py-4 ${classes.accentPanel}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className={`text-sm font-semibold ${classes.accentText}`}>主卦：{liuyaoCast.primary}</p>
                  <p className="mt-1 text-xs text-stone-500">变卦：{liuyaoCast.relating} · 动爻 {liuyaoCast.movingCount} 条</p>
                </div>
                <button type="button" onClick={handleCast} className="text-xs text-stone-400 hover:text-stone-600">
                  重新起卦
                </button>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {liuyaoCast.lines.map((line) => (
                  <div key={line.label} className="rounded-xl bg-white/70 px-3 py-2 text-sm text-stone-700">
                    {line.text}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <Link to="/pet" className="rounded-xl border border-stone-300 px-5 py-3 text-stone-600 hover:bg-stone-50">
          返回角色选择
        </Link>
        <button
          type="submit"
          disabled={submitting || !question.trim() || (needsCards && drawnCards.length === 0) || (needsLiuyao && !liuyaoCast)}
          className={`flex-1 rounded-xl px-6 py-3 font-medium text-white disabled:opacity-50 ${classes.accentBg}`}
        >
          开始易清占卜
        </button>
      </div>
    </form>
  )
}

export default function Fortune() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state || {}
  const characterId = state.characterId || 'liliana'
  const character = getCharacter(characterId)
  const classes = getThemeClasses(characterId)
  const [meditating, setMeditating] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (payload) => {
    setError('')
    setMeditating(true)

    try {
      const res = await fetch('/api/fortune', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok) {
        setMeditating(false)
        setError(data.message || data.error || '占卜失败，请稍后重试')
        return
      }

      navigate('/result', {
        state: {
          ...payload,
          message: data.message,
          divination: data.divination || null,
        },
      })
    } catch (err) {
      setMeditating(false)
      setError(err.message || '网络错误，请确认后端是否已启动')
    }
  }

  return (
    <>
      {meditating && <MeditationOverlay petName={state.petName || '毛孩子'} isYiqing={classes.isYiqing} />}

      <div className="mx-auto max-w-3xl">
        <p className={`text-xs font-semibold uppercase tracking-widest ${classes.accentTag}`}>{character.name} Quick Divination</p>
        <h1 className={`mt-1 font-serif text-3xl font-semibold ${classes.accentText}`}>{character.name} 的专属快占页</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-500">
          这一步已经从“一个共用页面”拆成了“按角色进入不同流程”的结构。
          莉莉安娜承接塔罗与情绪感应，易清承接气场与东玄六爻。
        </p>

        {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        {characterId === 'yiqing' ? (
          <YiqingFortune state={state} onSubmit={handleSubmit} submitting={meditating} />
        ) : (
          <LilianaFortune state={state} onSubmit={handleSubmit} submitting={meditating} />
        )}
      </div>
    </>
  )
}
