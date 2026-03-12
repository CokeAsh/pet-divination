import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getCharacter } from '../data/characters'

const PLACEHOLDER_MESSAGES = {
  dog: '它想靠近你，也想确认自己有没有被稳定地爱着。',
  cat: '它其实一直看见你的情绪，只是不喜欢用太直接的方式回应。',
  rabbit: '它更需要安静、安全和可预期的陪伴。',
  bird: '它会从细小的互动和节奏里判断你是否真的在场。',
  other: '它未必会说话，但它一直在回应你给出的能量。',
}

const METHOD_LABEL = {
  direct: '直接感应',
  tarot1: '塔罗 1 张',
  tarot3: '塔罗 3 张',
  lenormand: '雷诺曼 2 张',
  liuyao: '东玄六爻',
}

const TAROT_POSITIONS = ['过去', '现在', '未来']

export default function Result() {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    petType = 'other',
    petName = '毛孩子',
    question,
    emotion,
    message,
    method = 'direct',
    cards = [],
    characterId = 'liliana',
    divination = null,
  } = location.state || {}

  const character = getCharacter(characterId)
  const isYiqing = characterId === 'yiqing'
  const [copied, setCopied] = useState(false)
  const displayMessage = message || PLACEHOLDER_MESSAGES[petType] || PLACEHOLDER_MESSAGES.other

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayMessage)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const handleAskAgain = () => {
    navigate('/fortune', { state: { petType, petName, characterId } })
  }

  return (
    <div className="mx-auto max-w-lg">
      <div
        className={`animate-glow rounded-2xl border bg-white p-6 shadow-lg ${
          isYiqing ? 'border-verdant-200 shadow-verdant-200/50' : 'border-mystic-200 shadow-mystic-200/50'
        }`}
      >
        <div className="text-center">
          <p className={`text-xs font-semibold uppercase tracking-widest ${isYiqing ? 'text-verdant-500' : 'text-mystic-400'}`}>
            {character.name} 的感应
          </p>
          <p className={`mt-0.5 text-sm font-medium ${isYiqing ? 'text-verdant-700' : 'text-mystic-700'}`}>
            {petName} 的心灵讯息
            {method !== 'direct' && (
              <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${isYiqing ? 'bg-verdant-100 text-verdant-600' : 'bg-mystic-100 text-mystic-500'}`}>
                {METHOD_LABEL[method]}
              </span>
            )}
          </p>
        </div>

        <div className="mt-4 whitespace-pre-line font-serif text-base leading-relaxed text-stone-700">
          {displayMessage}
        </div>

        {cards.length > 0 && (
          <div className={`mt-5 border-t pt-4 ${isYiqing ? 'border-verdant-100' : 'border-mystic-100'}`}>
            <p className={`mb-3 text-xs font-medium ${isYiqing ? 'text-verdant-500' : 'text-mystic-500'}`}>本次牌面</p>
            <div className={`flex gap-2 ${method === 'tarot3' ? 'justify-between' : 'justify-center'}`}>
              {cards.map((card, index) => (
                <div
                  key={`${card.id}-${index}`}
                  className={`flex flex-1 flex-col items-center rounded-xl border px-2 py-3 text-center ${
                    isYiqing ? 'border-verdant-100 bg-verdant-50/60' : 'border-mystic-100 bg-mystic-50/60'
                  }`}
                >
                  {method === 'tarot3' && (
                    <span className={`mb-1 text-xs font-medium ${isYiqing ? 'text-verdant-400' : 'text-mystic-400'}`}>
                      {TAROT_POSITIONS[index]}
                    </span>
                  )}
                  <span className={`text-xl ${card.reversed ? 'inline-block rotate-180' : ''}`}>{card.emoji}</span>
                  <p className={`mt-1 text-xs font-semibold ${isYiqing ? 'text-verdant-700' : 'text-mystic-700'}`}>{card.name}</p>
                  {card.reversed !== undefined && (
                    <span
                      className={`mt-0.5 rounded-full px-1.5 py-0.5 text-xs ${
                        card.reversed
                          ? 'bg-amber-50 text-amber-600'
                          : isYiqing
                            ? 'bg-verdant-100 text-verdant-600'
                            : 'bg-mystic-50 text-mystic-500'
                      }`}
                    >
                      {card.reversed ? '逆位' : '正位'}
                    </span>
                  )}
                  <p className="mt-0.5 text-xs leading-tight text-stone-400">{card.keywords}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {method === 'liuyao' && divination && (
          <div className={`mt-5 border-t pt-4 ${isYiqing ? 'border-verdant-100' : 'border-mystic-100'}`}>
            <p className={`mb-3 text-xs font-medium ${isYiqing ? 'text-verdant-500' : 'text-mystic-500'}`}>本次卦象</p>
            <div className={`rounded-2xl border px-4 py-4 ${isYiqing ? 'border-verdant-100 bg-verdant-50/60' : 'border-mystic-100 bg-mystic-50/60'}`}>
              <p className={`text-sm font-semibold ${isYiqing ? 'text-verdant-700' : 'text-mystic-700'}`}>主卦：{divination.primary}</p>
              <p className="mt-1 text-xs text-stone-500">变卦：{divination.relating} · 动爻 {divination.movingCount} 条</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {(divination.lines || []).map((line, index) => (
                  <div key={`${line.label}-${index}`} className="rounded-xl bg-white/80 px-3 py-2 text-sm text-stone-700">
                    {line.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {(emotion || question) && (
          <p className="mt-4 text-xs text-stone-400">
            {emotion && <span>情绪：{emotion}</span>}
            {emotion && question && ' · '}
            {question && <span>问题：{question}</span>}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className={`rounded-lg border px-3 py-2 text-sm transition ${
              isYiqing ? 'border-verdant-200 bg-verdant-50 text-verdant-700 hover:bg-verdant-100' : 'border-mystic-200 bg-mystic-50 text-mystic-700 hover:bg-mystic-100'
            }`}
          >
            {copied ? '已复制' : '复制心灵讯息'}
          </button>
          <button
            type="button"
            onClick={handleAskAgain}
            className={`rounded-lg border px-3 py-2 text-sm transition ${
              isYiqing ? 'border-verdant-200 bg-verdant-50 text-verdant-700 hover:bg-verdant-100' : 'border-mystic-200 bg-mystic-50 text-mystic-700 hover:bg-mystic-100'
            }`}
          >
            再问一句
          </button>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-stone-400">
        以上内容为趣味解读，仅供娱乐。真实沟通仍应结合宠物的行为、状态与健康观察。
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Link to="/pet" className={`rounded-xl px-6 py-3 font-medium text-white ${isYiqing ? 'bg-verdant-600 hover:bg-verdant-700' : 'bg-mystic-600 hover:bg-mystic-700'}`}>
          换一位占卜师
        </Link>
        <Link
          to="/fortune"
          state={{ petType, petName, characterId }}
          className={`rounded-xl border px-6 py-3 ${
            isYiqing ? 'border-verdant-300 text-verdant-700 hover:bg-verdant-50' : 'border-mystic-300 text-mystic-700 hover:bg-mystic-50'
          }`}
        >
          继续问 {petName}
        </Link>
        <Link to="/" className="rounded-xl border border-stone-300 px-6 py-3 text-stone-600 hover:bg-stone-50">
          返回首页
        </Link>
      </div>
    </div>
  )
}
