import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { DEFAULT_CHARACTER_ID, getCharacter } from '../data/characters'

const TAROT_POSITIONS = ['T1', 'T2', 'T3', 'T4', 'T5']
const LENORMAND_POSITIONS = ['L1', 'L2', 'L3']

function getDeviceId() {
  try {
    let id = localStorage.getItem('pet_device_id')
    if (!id) {
      const canUseCrypto = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      id = canUseCrypto ? crypto.randomUUID() : `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
      localStorage.setItem('pet_device_id', id)
    }
    return id
  } catch {
    return `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
  }
}

function getOpeningMessage(characterId) {
  const character = getCharacter(characterId)
  return { role: 'assistant', content: character.opening }
}

function generateTitle(messages) {
  const first = messages.find((message) => message.role === 'user' && !message.isCardDraw)
  if (!first) return '新对话'
  return first.content.slice(0, 18) + (first.content.length > 18 ? '…' : '')
}

function filterForSave(messages) {
  return messages.filter((message) => !message.isDrawPrompt)
}

function normalizeMessage(message) {
  if (!message || typeof message !== 'object') {
    return { role: 'assistant', content: String(message ?? '') }
  }
  return {
    ...message,
    role: message.role || 'assistant',
    content: typeof message.content === 'string' ? message.content : String(message.content ?? ''),
    tarot: Array.isArray(message.tarot) ? message.tarot : [],
    lenormand: Array.isArray(message.lenormand) ? message.lenormand : [],
  }
}

function formatCardsContent(tarot, lenormand) {
  const tarotLines = tarot
    .map((card, index) => `  ${TAROT_POSITIONS[index]}：${card.name} ${card.reversed ? '逆位' : '正位'} · ${card.keywords}`)
    .join('\n')
  const lenormandLines = lenormand
    .map((card, index) => `  ${LENORMAND_POSITIONS[index]}：${card.name} · ${card.keywords}`)
    .join('\n')
  return `[已抽牌]\n塔罗：\n${tarotLines}\n\n雷诺曼：\n${lenormandLines}`
}

function getTheme(characterId) {
  const isYiqing = characterId === 'yiqing'
  return {
    isYiqing,
    sidebar: isYiqing ? 'border-verdant-100 bg-verdant-50/95' : 'border-mystic-100 bg-mystic-50/95',
    accentText: isYiqing ? 'text-verdant-800' : 'text-mystic-800',
    accentSoftText: isYiqing ? 'text-verdant-600' : 'text-mystic-600',
    accentHover: isYiqing ? 'hover:text-verdant-700 hover:bg-verdant-100' : 'hover:text-mystic-700 hover:bg-mystic-100',
    accentChip: isYiqing ? 'bg-verdant-100 text-verdant-700' : 'bg-mystic-100 text-mystic-700',
    accentButton: isYiqing ? 'bg-verdant-600 hover:bg-verdant-700 shadow-verdant-400/30' : 'bg-mystic-600 hover:bg-mystic-700 shadow-mystic-400/30',
    assistantAvatar: isYiqing ? 'bg-verdant-100' : 'bg-mystic-100',
    activeConversation: isYiqing ? 'bg-verdant-100 text-verdant-800' : 'bg-mystic-100 text-mystic-800',
    drawPrompt: isYiqing ? 'text-verdant-500' : 'text-mystic-400',
    panelBorder: isYiqing ? 'border-verdant-100' : 'border-mystic-100',
  }
}

function MessageBubble({ message, character, theme }) {
  const safeMessage = normalizeMessage(message)
  const isAssistant = safeMessage.role === 'assistant'

  if (safeMessage.isCardDraw) {
    return (
      <div className="my-4 flex justify-center">
        <div className={`w-full max-w-sm rounded-2xl border px-4 py-4 ${theme.panelBorder} ${theme.isYiqing ? 'bg-verdant-50' : 'bg-mystic-50'}`}>
          <p className={`mb-3 text-center text-xs font-semibold uppercase tracking-wider ${theme.accentSoftText}`}>
            {character.name} 为你抽取的牌面
          </p>
          <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
            {safeMessage.tarot.map((card, index) => (
              <div key={`${card.id}-${index}`} className="flex w-14 flex-shrink-0 flex-col items-center rounded-xl border border-white/70 bg-white px-1 py-2 text-center">
                <span className="mb-1 text-[10px] leading-tight text-stone-400">{TAROT_POSITIONS[index]}</span>
                <span className={`text-lg ${card.reversed ? 'inline-block rotate-180' : ''}`}>{card.emoji}</span>
                <p className={`mt-1 text-[10px] font-semibold leading-tight ${theme.accentText}`}>{card.name}</p>
                <span className={`mt-0.5 text-[9px] ${card.reversed ? 'text-amber-500' : theme.accentSoftText}`}>
                  {card.reversed ? '逆位' : '正位'}
                </span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {safeMessage.lenormand.map((card, index) => (
              <div key={`${card.id}-${index}`} className="flex flex-col items-center rounded-xl border border-white/70 bg-white/80 px-1 py-2 text-center">
                <span className="mb-1 text-[10px] leading-tight text-stone-400">{LENORMAND_POSITIONS[index]}</span>
                <span className="text-lg">{card.emoji}</span>
                <p className="mt-1 text-[10px] font-semibold leading-tight text-stone-700">{card.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (safeMessage.isDrawPrompt) {
    return (
      <div className="my-4 flex justify-center">
        <p className={`animate-pulse text-sm italic ${theme.drawPrompt}`}>{safeMessage.content}</p>
      </div>
    )
  }

  return (
    <div className={`my-2.5 flex gap-2 sm:my-3 ${isAssistant ? 'justify-start' : 'justify-end'}`}>
      {isAssistant && (
        <div className={`mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs sm:h-8 sm:w-8 sm:text-sm ${theme.assistantAvatar}`}>
          {character.emoji}
        </div>
      )}
      <div
        className={`max-w-[88%] whitespace-pre-line rounded-2xl px-3 py-2.5 text-sm leading-relaxed sm:max-w-[80%] sm:px-4 sm:py-3 ${
          isAssistant
            ? `rounded-tl-sm border bg-white text-stone-700 shadow-sm ${theme.panelBorder}`
            : `rounded-tr-sm text-white ${theme.accentButton}`
        }`}
      >
        {safeMessage.content}
      </div>
    </div>
  )
}

function TypingIndicator({ characterEmoji, theme }) {
  return (
    <div className="my-3 flex items-center gap-2">
      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${theme.assistantAvatar}`}>{characterEmoji}</div>
      <div className={`flex gap-1 rounded-2xl rounded-tl-sm border bg-white px-4 py-3 shadow-sm ${theme.panelBorder}`}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`block h-1.5 w-1.5 animate-bounce rounded-full ${theme.isYiqing ? 'bg-verdant-400' : 'bg-mystic-400'}`}
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  )
}

function formatDate(ts) {
  const date = new Date(ts)
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}

export default function ConsultChat() {
  const [searchParams] = useSearchParams()
  const characterId = searchParams.get('character') || DEFAULT_CHARACTER_ID
  const character = getCharacter(characterId)
  const theme = getTheme(characterId)

  const deviceId = useRef(getDeviceId())
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  const [conversations, setConversations] = useState([])
  const [currentConvId, setCurrentConvId] = useState(null)
  const [messages, setMessages] = useState(() => [getOpeningMessage(characterId)])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [drawPrompt, setDrawPrompt] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    setMessages([getOpeningMessage(characterId)])
    setCurrentConvId(null)
    setDrawPrompt(null)
  }, [characterId])

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch(`/api/conversations?deviceId=${deviceId.current}`)
      if (res.ok) {
        const list = await res.json()
        setConversations(Array.isArray(list) ? list : [])
      }
    } catch {}
  }, [])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, loading, drawPrompt])

  const saveConversation = useCallback(async (nextMessages, convId) => {
    const toSave = filterForSave(nextMessages)
    const title = generateTitle(toSave)
    if (convId) {
      await fetch(`/api/conversations/${convId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: toSave, title }),
      })
      setConversations((prev) => prev.map((item) => (item.id === convId ? { ...item, title, updated_at: Date.now() } : item)))
      return convId
    }

    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: deviceId.current, title, messages: toSave }),
    })
    if (res.ok) {
      const created = await res.json()
      setCurrentConvId(created.id)
      setConversations((prev) => [created, ...prev])
      return created.id
    }
    return convId
  }, [])

  const startNewConversation = () => {
    setMessages([getOpeningMessage(characterId)])
    setCurrentConvId(null)
    setDrawPrompt(null)
    setInput('')
    setSidebarOpen(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const loadConversation = async (conversation) => {
    try {
      const res = await fetch(`/api/conversations/${conversation.id}`)
      if (!res.ok) return
      const data = await res.json()
      const loadedMessages = Array.isArray(data?.messages) ? data.messages.map(normalizeMessage).filter(Boolean) : []
      setMessages(loadedMessages.length > 0 ? loadedMessages : [getOpeningMessage(characterId)])
      setCurrentConvId(conversation.id)
      setDrawPrompt(null)
      setInput('')
      setSidebarOpen(false)
    } catch {}
  }

  const handleDelete = async (e, conversationId) => {
    e.stopPropagation()
    await fetch(`/api/conversations/${conversationId}`, { method: 'DELETE' })
    setConversations((prev) => prev.filter((item) => item.id !== conversationId))
    if (currentConvId === conversationId) startNewConversation()
  }

  const buildPayload = (nextMessages, extra = {}) => ({
    messages: nextMessages
      .filter((message) => (message.role === 'user' || message.role === 'assistant') && !message.isDrawPrompt)
      .map((message) =>
        message.isCardDraw
          ? { role: 'user', content: message.content, tarot: message.tarot, lenormand: message.lenormand }
          : { role: message.role, content: message.content }
      ),
    characterId,
    ...extra,
  })

  const callChat = async (nextMessages, extra = {}) => {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload(nextMessages, extra)),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || '请求失败')
    return data
  }

  const processDrawAndReading = async (data, currentMessages, convId) => {
    let nextMessages = [...currentMessages]

    if (data.cards) {
      if (data.intro) {
        nextMessages = [...nextMessages, { role: 'assistant', content: data.intro }]
        setMessages(nextMessages)
      }

      const promptMessage = {
        role: 'assistant',
        content: '牌阵正在落下，请把注意力放在你最想确认的那件事上。',
        isDrawPrompt: true,
      }
      setMessages([...nextMessages, promptMessage])
      await new Promise((resolve) => setTimeout(resolve, 1800))

      const cardMessage = {
        role: 'user',
        content: formatCardsContent(data.cards.tarot, data.cards.lenormand),
        isCardDraw: true,
        tarot: data.cards.tarot,
        lenormand: data.cards.lenormand,
      }
      nextMessages = [...nextMessages, cardMessage]
      setMessages(nextMessages)
    }

    nextMessages = [...nextMessages, { role: 'assistant', content: data.message || '' }]
    setMessages(nextMessages)
    const savedId = await saveConversation(nextMessages, convId)
    return { messages: nextMessages, convId: savedId }
  }

  const processResponse = async (data, currentMessages, convId) => {
    if (data.drawReady) {
      let nextMessages = [...currentMessages]
      if (data.intro) {
        nextMessages = [...nextMessages, { role: 'assistant', content: data.intro }]
        setMessages(nextMessages)
      }
      setDrawPrompt({ messages: nextMessages, intro: data.intro || null, convId })
      return { messages: nextMessages, convId }
    }

    const nextMessages = [...currentMessages, { role: 'assistant', content: data.message || '' }]
    setMessages(nextMessages)
    const savedId = await saveConversation(nextMessages, convId)
    return { messages: nextMessages, convId: savedId }
  }

  const handleDrawConfirmed = async () => {
    const { messages: pendingMessages, intro, convId } = drawPrompt
    setDrawPrompt(null)
    setLoading(true)
    try {
      const data = await callChat(pendingMessages, { confirm: true, intro })
      await processDrawAndReading(data, pendingMessages, convId)
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: '抽牌过程中出了点问题，请稍后再试。' }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')

    const nextMessages = [...messages, { role: 'user', content: text }]
    setMessages(nextMessages)
    setLoading(true)

    try {
      const data = await callChat(nextMessages)
      await processResponse(data, nextMessages, currentConvId)
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: '网络出了点问题，请稍后再试。' }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl" style={{ height: 'calc(100dvh - 56px)' }}>
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/30 sm:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside
        className={`fixed left-0 top-14 z-40 h-[calc(100dvh-56px)] flex-col backdrop-blur-sm transition-all duration-200 ${theme.sidebar}
        ${sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'}
        sm:relative sm:top-0 sm:z-auto sm:flex sm:translate-x-0 ${sidebarCollapsed ? 'sm:w-12' : 'sm:w-64'}`}
      >
        {sidebarCollapsed ? (
          <div className="hidden flex-col items-center gap-1 py-2 sm:flex">
            <button onClick={startNewConversation} title="新对话" className={`flex h-9 w-9 items-center justify-center rounded-xl border bg-white transition ${theme.panelBorder} ${theme.accentSoftText}`}>
              <span className="text-sm">✦</span>
            </button>
            <button onClick={() => setSidebarCollapsed(false)} title="展开侧栏" className={`flex h-9 w-9 items-center justify-center rounded-xl text-stone-400 transition ${theme.accentHover}`}>
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex flex-shrink-0 items-center gap-1 p-2">
            <button onClick={startNewConversation} className={`flex flex-1 items-center gap-2 rounded-xl border bg-white px-3 py-2.5 text-sm font-medium transition ${theme.panelBorder} ${theme.accentSoftText} ${theme.accentHover}`}>
              <span className="text-base">✦</span>
              <span>新对话</span>
            </button>
            <button onClick={() => setSidebarCollapsed(true)} title="收起侧栏" className={`hidden h-9 w-9 items-center justify-center rounded-xl text-stone-400 transition sm:flex ${theme.accentHover}`}>
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}

        <div className={`flex-1 overflow-y-auto px-2 pb-4 ${sidebarCollapsed ? 'sm:hidden' : ''}`}>
          {conversations.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-stone-400">还没有对话记录</p>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => loadConversation(conversation)}
                className={`group relative mb-1 cursor-pointer rounded-xl px-3 py-2.5 transition ${
                  currentConvId === conversation.id ? theme.activeConversation : 'text-stone-600 hover:bg-white'
                }`}
              >
                <p className="truncate pr-6 text-sm font-medium">{conversation.title}</p>
                <p className="mt-0.5 text-xs text-stone-400">{formatDate(conversation.updated_at)}</p>
                <button
                  onClick={(e) => handleDelete(e, conversation.id)}
                  className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-lg p-1 text-stone-400 hover:text-red-500 group-hover:flex"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className={`flex flex-shrink-0 items-center gap-2 border-b bg-white/80 px-3 py-2.5 backdrop-blur-sm sm:px-4 sm:py-3 ${theme.panelBorder}`}>
          <button onClick={() => setSidebarOpen((value) => !value)} className={`flex-shrink-0 rounded-lg p-1.5 text-stone-400 transition sm:hidden ${theme.accentHover}`}>
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
          <Link to="/" className={`hidden flex-shrink-0 rounded-lg p-1 text-sm text-stone-400 transition sm:block ${theme.accentHover}`}>
            ←
          </Link>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="text-base sm:text-lg">{character.emoji}</span>
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${theme.accentText}`}>{character.name}</p>
              <p className="hidden text-xs text-stone-400 sm:block">{character.tagline}</p>
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${loading ? 'animate-pulse bg-amber-400' : 'bg-green-400'}`} />
            <span className="text-xs text-stone-400">{loading ? '感应中' : '在线'}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4">
          {(Array.isArray(messages) ? messages : []).map((message, index) => (
            <MessageBubble key={index} message={message} character={character} theme={theme} />
          ))}
          {loading && <TypingIndicator characterEmoji={character.emoji} theme={theme} />}

          {drawPrompt && !loading && (
            <div className="my-3 flex justify-start gap-2 pl-9">
              <button onClick={handleDrawConfirmed} className={`rounded-2xl px-4 py-2 text-sm font-medium text-white shadow transition active:scale-95 ${theme.accentButton}`}>
                开始抽牌
              </button>
              <button
                onClick={() => setDrawPrompt(null)}
                className={`rounded-2xl border bg-white px-4 py-2 text-sm transition active:scale-95 ${theme.panelBorder} ${theme.accentSoftText}`}
              >
                我还想补充一点信息
              </button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div className={`flex-shrink-0 border-t bg-white/90 px-3 py-2.5 backdrop-blur-sm sm:px-4 sm:py-3 ${theme.panelBorder}`} style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`对${character.name}说点什么…`}
              rows={1}
              className={`flex-1 resize-none rounded-xl border bg-white px-3 py-2.5 text-base text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-2 sm:px-4 sm:text-sm ${theme.panelBorder} ${theme.isYiqing ? 'focus:border-verdant-400 focus:ring-verdant-200' : 'focus:border-mystic-400 focus:ring-mystic-200'}`}
              style={{ minHeight: '44px', maxHeight: '120px' }}
              disabled={loading || !!drawPrompt}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading || !!drawPrompt}
              className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-white shadow transition active:scale-95 disabled:opacity-40 ${theme.accentButton}`}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 rotate-90">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </div>
          <p className="mt-1 text-center text-xs text-stone-400">占卜解读仅供参考，不替代诊疗与专业训练建议</p>
        </div>
      </div>
    </div>
  )
}
