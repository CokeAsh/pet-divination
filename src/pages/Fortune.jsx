import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import DrawCardOverlay from '../components/draw/DrawCardOverlay'
import LiuyaoCastingOverlay from '../components/liuyao/LiuyaoCastingOverlay'
import LiuyaoPreviewCard from '../components/liuyao/LiuyaoPreviewCard'
import { getCharacter } from '../data/characters'
import { getDrawMode } from '../data/drawModes'

const PET_TYPES = [
  { id: 'dog', label: '狗狗', emoji: '🐕' },
  { id: 'cat', label: '猫咪', emoji: '🐈' },
  { id: 'rabbit', label: '兔子', emoji: '🐇' },
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
  { id: 'direct', label: '时空直感', emoji: '🌫️', desc: '以此刻时机入卦，不必起摇。' },
  { id: 'liuyao', label: '摇卦占卜', emoji: '☯️', desc: '六次起爻，逐步显出主卦与变意。' },
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
    accentRing: isYiqing
      ? 'focus:border-verdant-500 focus:ring-verdant-200'
      : 'focus:border-mystic-500 focus:ring-mystic-200',
    accentPanel: isYiqing ? 'border-verdant-200 bg-verdant-50/70' : 'border-mystic-200 bg-mystic-50/70',
    accentChip: isYiqing ? 'bg-verdant-500 text-white' : 'bg-mystic-500 text-white',
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
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-sm ${
        isYiqing ? 'bg-verdant-900/88' : 'bg-mystic-900/88'
      }`}
    >
      <div className="relative flex items-center justify-center">
        <div
          className={`absolute h-32 w-32 animate-ping rounded-full ${
            isYiqing ? 'bg-verdant-300/18' : 'bg-mystic-300/18'
          }`}
        />
        <div
          className={`absolute h-24 w-24 animate-pulse rounded-full ${
            isYiqing ? 'bg-mystic-300/18' : 'bg-verdant-300/18'
          }`}
        />
        <div
          className={`relative h-16 w-16 rounded-full bg-gradient-to-br ${
            isYiqing
              ? 'from-verdant-300 to-mystic-400 shadow-verdant-500/40'
              : 'from-mystic-300 to-verdant-400 shadow-mystic-500/40'
          } shadow-lg`}
        />
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
          <p className={`text-sm font-semibold leading-snug ${selected ? classes.accentText : 'text-stone-700'}`}>
            {method.label}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-stone-400">{method.desc}</p>
        </div>
      </div>
    </button>
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
                petType === pet.id
                  ? `${classes.accentBorder} ${classes.accentSoftBg} ${classes.accentText}`
                  : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
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

  const currentMode = getDrawMode(method)
  const needsCards = currentMode.needsDraw

  const handleMethodChange = (id) => {
    setMethod(id)
    setDrawnCards([])
    setPickerOpen(false)
  }

  const submit = (event) => {
    event.preventDefault()
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
        <h2 className={`mt-2 font-serif text-2xl ${classes.accentText}`}>莉莉安娜快速占卜</h2>
        <p className="mt-2 text-sm leading-7 text-stone-600">
          莉莉安娜继续承接塔罗、雷诺曼与直接感应的轻量流程，适合快速确认宠物情绪与关系讯号。
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
            <MethodCard
              key={item.id}
              method={item}
              selected={method === item.id}
              onClick={handleMethodChange}
              classes={classes}
            />
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="liliana-question" className="block text-sm font-medium text-stone-700">
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
          id="liliana-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="例如：你最近到底在委屈什么？"
          rows={3}
          className={`mt-2 w-full resize-none rounded-xl border border-stone-200 px-4 py-3 focus:outline-none focus:ring-2 ${classes.accentRing}`}
        />
      </div>

      {needsCards && (
        <div className={`rounded-2xl border px-4 py-4 ${classes.accentPanel}`}>
          {drawnCards.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className={`text-sm font-semibold ${classes.accentText}`}>已抽取 {drawnCards.length} 张牌</p>
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="text-xs text-stone-400 hover:text-stone-600"
                >
                  重新抽牌
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {drawnCards.map((card, index) => (
                  <div key={`${card.id}-${index}`} className="rounded-xl bg-white/70 px-3 py-3 text-sm text-stone-700">
                    {card.name}
                    {card.reversed ? ' · 逆位' : ''}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className={`w-full rounded-xl border-2 border-dashed py-5 text-sm font-medium transition ${classes.accentBorder} ${classes.accentSoftBg} ${classes.accentSoftText}`}
            >
              {currentMode.drawCount === 1 ? '抽一张牌' : `抽 ${currentMode.drawCount} 张牌`}
            </button>
          )}
        </div>
      )}

      {pickerOpen && (
        <DrawCardOverlay
          mode={method}
          isYiqing={false}
          onConfirm={(cards) => {
            setDrawnCards(cards)
            setPickerOpen(false)
          }}
          onClose={() => setPickerOpen(false)}
        />
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
  const [method, setMethod] = useState('direct')
  const [question, setQuestion] = useState('')
  const [liuyaoCast, setLiuyaoCast] = useState(null)
  const [overlayOpen, setOverlayOpen] = useState(false)

  const needsLiuyao = method === 'liuyao'

  const handleMethodChange = (id) => {
    setMethod(id)
    setLiuyaoCast(null)
    setOverlayOpen(false)
  }

  const submit = (event) => {
    event.preventDefault()
    onSubmit({
      characterId: 'yiqing',
      petType,
      petName: petName || '毛孩子',
      emotion: selectedEmotion,
      question: question.trim(),
      method,
      cards: [],
      liuyao: liuyaoCast,
    })
  }

  return (
    <>
      <form onSubmit={submit} className="mt-8 space-y-8">
        <div className={`rounded-3xl border px-5 py-5 ${classes.accentPanel}`}>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-verdant-500">Yiqing Eastern Flow</p>
          <h2 className={`mt-2 font-serif text-2xl ${classes.accentText}`}>易清东方卜感</h2>
          <p className="mt-2 text-sm leading-7 text-stone-600">
            当前先收束为两种卜感入口：时空直感与摇卦占卜。前者以此刻时机入卦，后者通过六次起爻逐步显出主卦与变意。
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
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {YIQING_METHODS.map((item) => (
              <MethodCard
                key={item.id}
                method={item}
                selected={method === item.id}
                onClick={handleMethodChange}
                classes={classes}
              />
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

        {needsLiuyao && (
          <div>
            <label className="block text-sm font-medium text-stone-700">摇卦占卜</label>
            {!liuyaoCast ? (
              <button
                type="button"
                onClick={() => setOverlayOpen(true)}
                className={`mt-3 w-full rounded-xl border-2 border-dashed py-5 text-sm font-medium transition ${classes.accentBorder} ${classes.accentSoftBg} ${classes.accentSoftText}`}
              >
                起一卦
              </button>
            ) : (
              <div className="mt-3 space-y-3">
                <LiuyaoPreviewCard
                  cast={liuyaoCast}
                  classes={classes}
                  compact
                  onReset={() => setOverlayOpen(true)}
                />
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
            disabled={submitting || !question.trim() || (needsLiuyao && !liuyaoCast)}
            className={`flex-1 rounded-xl px-6 py-3 font-medium text-white disabled:opacity-50 ${classes.accentBg}`}
          >
            开始易占
          </button>
        </div>
      </form>

      {overlayOpen && (
        <LiuyaoCastingOverlay
          onClose={() => setOverlayOpen(false)}
          onConfirm={(cast) => {
            setLiuyaoCast(cast)
            setOverlayOpen(false)
          }}
        />
      )}
    </>
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
      const response = await fetch('/api/fortune', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()

      if (!response.ok) {
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
    } catch (caughtError) {
      setMeditating(false)
      setError(caughtError.message || '网络错误，请确认后端是否已启动')
    }
  }

  return (
    <>
      {meditating && <MeditationOverlay petName={state.petName || '毛孩子'} isYiqing={classes.isYiqing} />}

      <div className="mx-auto max-w-3xl">
        <p className={`text-xs font-semibold uppercase tracking-widest ${classes.accentTag}`}>
          {character.name} Quick Divination
        </p>
        <h1 className={`mt-1 font-serif text-3xl font-semibold ${classes.accentText}`}>
          {character.name} 的专属快占页
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-500">
          当前页面按角色拆分流程。莉莉安娜承接塔罗与情绪感应，易清承接气场直感与摇卦入口。
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
