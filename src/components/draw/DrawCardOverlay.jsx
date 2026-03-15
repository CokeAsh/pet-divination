import { forwardRef, memo, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { finalizeSelectedCards, getDeck } from '../../data/cards'
import { getDrawMode } from '../../data/drawModes'

function getTheme(isYiqing) {
  if (isYiqing) {
    return {
      backdrop:
        'radial-gradient(circle at 50% 0%, rgba(245,255,250,0.42), transparent 24%), radial-gradient(circle at 20% 16%, rgba(120,230,180,0.18), transparent 24%), radial-gradient(circle at 82% 20%, rgba(208,255,234,0.14), transparent 22%), linear-gradient(180deg, rgba(44,95,72,0.96) 0%, rgba(78,130,104,0.95) 48%, rgba(112,154,132,0.96) 100%)',
      glow: 'rgba(134, 235, 189, 0.18)',
      border: 'rgba(255,255,255,0.4)',
      text: 'text-white',
      subtext: 'text-white/74',
      button: 'bg-white/18 hover:bg-white/24 text-white',
      buttonDisabled: 'bg-white/10 text-white/48',
      badge: 'bg-white/88 text-verdant-900',
      cardOuter: 'rgba(255,255,255,0.58)',
      cardInner: 'linear-gradient(180deg, rgba(224,255,243,0.66) 0%, rgba(190,244,220,0.58) 100%)',
      cardCore: 'linear-gradient(180deg, rgba(129,222,177,0.5) 0%, rgba(86,188,138,0.6) 100%)',
      star: 'rgba(243,255,249,0.94)',
    }
  }

  return {
    backdrop:
      'radial-gradient(circle at 50% 0%, rgba(255,248,255,0.6), transparent 24%), radial-gradient(circle at 20% 16%, rgba(226,199,255,0.18), transparent 24%), radial-gradient(circle at 82% 20%, rgba(245,226,255,0.16), transparent 22%), radial-gradient(circle at 50% 58%, rgba(255,235,255,0.1), transparent 34%), linear-gradient(180deg, rgba(154,130,208,0.98) 0%, rgba(188,166,225,0.96) 48%, rgba(214,198,239,0.97) 100%)',
    glow: 'rgba(227, 201, 255, 0.2)',
    border: 'rgba(255,255,255,0.42)',
    text: 'text-white',
    subtext: 'text-white/78',
    button: 'bg-white/18 hover:bg-white/24 text-white',
    buttonDisabled: 'bg-white/10 text-white/48',
    badge: 'bg-white/88 text-mystic-700',
    cardOuter: 'rgba(255,255,255,0.6)',
    cardInner: 'linear-gradient(180deg, rgba(248,242,255,0.7) 0%, rgba(234,223,255,0.62) 100%)',
    cardCore: 'linear-gradient(180deg, rgba(204,168,255,0.54) 0%, rgba(165,128,239,0.66) 100%)',
    star: 'rgba(255,248,255,0.96)',
  }
}

function getCopy(modeConfig) {
  if (modeConfig.deckType === 'lenormand') {
    return {
      title: `请集中精神，凭直觉抽取 ${modeConfig.drawCount} 张雷诺曼牌…`,
      subtitle: '整副牌已经铺开。轻轻拨动牌阵，让最有感应的牌停在你面前。',
      confirm: `确认抽取这 ${modeConfig.drawCount} 张…`,
    }
  }

  return {
    title: `请集中精神，点击任意卡牌抽取 ${modeConfig.drawCount} 张…`,
    subtitle: '整副牌已经铺开。轻轻拨动牌阵，跟随第一直觉做选择。',
    confirm: `确认抽取这 ${modeConfig.drawCount} 张…`,
  }
}

const StarField = memo(function StarField({ color, reducedEffects }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 28 }, (_, index) => {
        const size = index % 5 === 0 ? 7 : index % 3 === 0 ? 4 : 3
        return (
          <span
            key={`star-${index}`}
            className="absolute rounded-full animate-float"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              left: `${5 + ((index * 13) % 90)}%`,
              top: `${6 + ((index * 19) % 74)}%`,
              background: color,
              boxShadow: reducedEffects ? 'none' : `0 0 ${size * 3}px ${color}`,
              opacity: (0.1 + (index % 4) * 0.1) * (reducedEffects ? 0.45 : 1),
              animationDuration: reducedEffects ? '0s' : `${4.2 + (index % 5) * 0.7}s`,
              animationDelay: `${index * 0.12}s`,
            }}
          />
        )
      })}
    </div>
  )
})

function PawIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" aria-hidden="true">
      <ellipse cx="60" cy="74" rx="22" ry="18" fill="currentColor" />
      <ellipse cx="34" cy="44" rx="9" ry="13" transform="rotate(-18 34 44)" fill="currentColor" />
      <ellipse cx="52" cy="30" rx="9" ry="13" transform="rotate(-6 52 30)" fill="currentColor" />
      <ellipse cx="68" cy="30" rx="9" ry="13" transform="rotate(6 68 30)" fill="currentColor" />
      <ellipse cx="86" cy="44" rx="9" ry="13" transform="rotate(18 86 44)" fill="currentColor" />
      <path d="M45 74c4 8 26 8 30 0" stroke="rgba(255,255,255,0.32)" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}

function buildSpacingPositions(cardCount) {
  if (cardCount <= 1) return [0]

  const gapCount = cardCount - 1
  const center = gapCount / 2
  const minWeight = 0.58
  const maxWeight = 1.12
  const power = 1.35
  const gaps = []

  for (let index = 0; index < gapCount; index += 1) {
    const normalizedDistance = Math.abs(index + 0.5 - center) / Math.max(center, 0.5)
    const easedDistance = Math.min(1, normalizedDistance) ** power
    const weight = minWeight + (maxWeight - minWeight) * (1 - easedDistance)
    gaps.push(weight)
  }

  const positions = [0]
  for (let index = 0; index < gaps.length; index += 1) {
    positions.push(positions[index] + gaps[index])
  }

  const minPosition = positions[0]
  const maxPosition = positions[positions.length - 1]
  const span = Math.max(maxPosition - minPosition, 1)

  return positions.map((value) => ((value - minPosition) / span) * 2 - 1)
}

function getCardMetrics(cardCount) {
  const denseDeck = cardCount > 30
  return {
    cardWidth: denseDeck ? 'clamp(50px, 6.2vw, 80px)' : 'clamp(58px, 7.1vw, 98px)',
    cardHeight: denseDeck ? 'clamp(82px, 9.5vw, 126px)' : 'clamp(96px, 11.5vw, 152px)',
    horizontalSpan: denseDeck ? 0.43 : 0.41,
    verticalArc: denseDeck ? 0.19 : 0.21,
    rotationSpan: denseDeck ? 44 : 40,
    focusWidth: denseDeck ? 0.36 : 0.42,
  }
}

function wrapIndex(value, cardCount) {
  if (cardCount <= 0) return 0
  return ((value % cardCount) + cardCount) % cardCount
}

function getWrappedDistance(from, to, cardCount) {
  if (cardCount <= 0) return 0
  let delta = to - from
  const half = cardCount / 2
  if (delta > half) delta -= cardCount
  if (delta < -half) delta += cardCount
  return delta
}

function getSpacingPositionForDelta(deltaIndex, spacingPositions) {
  const centerSlot = (spacingPositions.length - 1) / 2
  const slotFloat = deltaIndex + centerSlot
  const minSlot = 0
  const maxSlot = spacingPositions.length - 1
  const clampedSlot = Math.max(minSlot, Math.min(maxSlot, slotFloat))
  const lower = Math.floor(clampedSlot)
  const upper = Math.min(maxSlot, Math.ceil(clampedSlot))
  const mix = clampedSlot - lower

  if (lower === upper) return spacingPositions[lower]
  return spacingPositions[lower] + (spacingPositions[upper] - spacingPositions[lower]) * mix
}

function getCardGeometry(index, cardCount, focusIndex, stageWidth, stageHeight, metrics, spacingPositions) {
  const deltaIndex = getWrappedDistance(focusIndex, index, cardCount)
  const baseT = getSpacingPositionForDelta(deltaIndex, spacingPositions)
  const visualT = Math.max(-1.04, Math.min(1.04, baseT))
  const distance = Math.abs(visualT)
  const focusWidth = metrics.focusWidth

  const xPx = visualT * metrics.horizontalSpan * stageWidth
  const yUnits =
    distance < focusWidth
      ? distance ** 1.85 * metrics.verticalArc * 0.58
      : focusWidth ** 1.85 * metrics.verticalArc * 0.58 +
        (distance - focusWidth) ** 1.22 * metrics.verticalArc * 1.55
  const yPx = yUnits * stageHeight
  const rotate = visualT * metrics.rotationSpan * (0.86 + distance * 0.22)
  const scale = 1 - distance * 0.032
  const focusBoost = Math.max(0, 1 - distance / 0.42)
  const emphasis = Math.max(0, 1 - distance / (cardCount > 30 ? 0.62 : 0.56))

  return {
    transform: `translate3d(calc(-50% + ${xPx.toFixed(2)}px), ${(-yPx).toFixed(2)}px, 0) rotate(${rotate.toFixed(3)}deg) scale(${scale.toFixed(4)})`,
    opacity: `${(0.94 + (1 - distance) * 0.06).toFixed(4)}`,
    zIndex: `${300 - Math.round(distance * 110) + Math.round(focusBoost * 18) + Math.round(emphasis * 8)}`,
  }
}

const FortuneCard = memo(
  forwardRef(function FortuneCard(
    { card, selectedOrder, onSelect, metrics, theme, wheelActive, initialGeometry },
    ref
  ) {
    return (
      <button
        ref={ref}
        type="button"
        onClick={() => onSelect(card.id)}
        style={{
          left: '50%',
          bottom: '20%',
          width: metrics.cardWidth,
          height: metrics.cardHeight,
          transform: initialGeometry.transform,
          opacity: initialGeometry.opacity,
          zIndex: initialGeometry.zIndex,
          willChange: 'transform, opacity',
        }}
        className={`group absolute rounded-[1.45rem] p-[3px] transition-[box-shadow,opacity] duration-300 ease-out ${
          selectedOrder ? '-translate-y-2.5 scale-[1.01]' : 'hover:-translate-y-1.5'
        }`}
      >
        <div
          className="absolute inset-0 rounded-[1.45rem] border backdrop-blur-[1px]"
          style={{
            borderColor: theme.cardOuter,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.04))',
            boxShadow: selectedOrder
              ? `0 0 0 1px rgba(255,255,255,0.16), 0 0 ${wheelActive ? 8 : 14}px ${theme.glow}, 0 4px ${wheelActive ? 7 : 12}px rgba(92,70,128,0.05)`
              : wheelActive
                ? '0 2px 4px rgba(92,70,128,0.02)'
                : '0 4px 10px rgba(92,70,128,0.04)',
          }}
        />
        <div
          className="absolute inset-[3px] rounded-[1.12rem] border"
          style={{
            borderColor: 'rgba(255,255,255,0.62)',
            background: theme.cardInner,
          }}
        />
        <div
          className="absolute inset-[8px] rounded-[0.96rem] border"
          style={{
            borderColor: 'rgba(255,255,255,0.22)',
            background: theme.cardCore,
          }}
        />
        <div
          className="absolute inset-[12px] rounded-[0.82rem]"
          style={{
            border: '1px solid rgba(255,255,255,0.15)',
            background:
              'radial-gradient(circle at 50% 24%, rgba(255,255,255,0.18), transparent 16%), radial-gradient(circle at 24% 18%, rgba(255,255,255,0.08), transparent 5%), radial-gradient(circle at 74% 70%, rgba(255,255,255,0.06), transparent 6%), radial-gradient(circle at 50% 55%, rgba(255,255,255,0.05), transparent 44%)',
          }}
        />
        <div className="absolute left-[15px] top-[15px] text-[10px] text-white/34">✦</div>
        <div className="absolute right-[15px] top-[15px] text-[9px] text-white/24">✧</div>
        <div className="absolute bottom-[15px] left-[15px] text-[9px] text-white/24">✧</div>
        <div className="absolute bottom-[15px] right-[15px] text-[10px] text-white/34">✦</div>
        <div className="relative z-10 flex h-full items-center justify-center">
          <PawIcon className={`h-11 w-11 text-white/84 sm:h-13 sm:w-13 ${wheelActive ? '' : 'drop-shadow-[0_0_7px_rgba(255,255,255,0.14)]'}`} />
        </div>
        {selectedOrder ? (
          <span className={`absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold ${theme.badge}`}>
            {selectedOrder}
          </span>
        ) : null}
      </button>
    )
  }),
  (prevProps, nextProps) => {
    return (
      prevProps.selectedOrder === nextProps.selectedOrder &&
      prevProps.wheelActive === nextProps.wheelActive &&
      prevProps.metrics === nextProps.metrics &&
      prevProps.theme === nextProps.theme &&
      prevProps.initialGeometry.transform === nextProps.initialGeometry.transform &&
      prevProps.initialGeometry.opacity === nextProps.initialGeometry.opacity &&
      prevProps.initialGeometry.zIndex === nextProps.initialGeometry.zIndex
    )
  }
)

function SelectedCardSummary({ selectedCards, count, onRemove }) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
      {Array.from({ length: count }, (_, index) => {
        const card = selectedCards[index]
        return (
          <button
            key={`selected-${index}`}
            type="button"
            onClick={() => card && onRemove(card.id)}
            className={`rounded-full border px-4 py-2 text-sm backdrop-blur-sm transition ${
              card ? 'border-white/30 bg-white/12 text-white' : 'cursor-default border-white/16 bg-white/6 text-white/42'
            }`}
          >
            {card ? `第 ${index + 1} 张 · ${card.name}` : `第 ${index + 1} 张待选`}
          </button>
        )
      })}
    </div>
  )
}

function CardFan({ cards, selectedIds, onSelect, theme, wheelActive, cardRefs, initialGeometries, metrics, stageRef }) {
  return (
    <div ref={stageRef} className="relative mt-2 h-[300px] select-none overflow-visible sm:h-[360px]">
      <div className="pointer-events-none absolute inset-x-8 bottom-4 h-20 rounded-[999px] bg-white/14 blur-3xl" />
      {cards.map((card, index) => (
        <FortuneCard
          key={card.id}
          ref={(node) => {
            cardRefs.current[index] = node
          }}
          card={card}
          selectedOrder={selectedIds.indexOf(card.id) + 1 || 0}
          onSelect={onSelect}
          metrics={metrics}
          theme={theme}
          wheelActive={wheelActive}
          initialGeometry={initialGeometries[index]}
        />
      ))}
    </div>
  )
}

export default function DrawCardOverlay({ mode, isYiqing, onConfirm, onClose }) {
  const modeConfig = getDrawMode(mode)
  const theme = getTheme(isYiqing)
  const copy = getCopy(modeConfig)
  const deck = useMemo(() => getDeck(modeConfig.deckType), [modeConfig.deckType])
  const metrics = useMemo(() => getCardMetrics(deck.length), [deck.length])

  const [selectedIds, setSelectedIds] = useState([])
  const [dragging, setDragging] = useState(false)
  const [wheelActive, setWheelActive] = useState(false)

  const stageRef = useRef(null)
  const cardRefs = useRef([])
  const biasTargetRef = useRef(0)
  const biasCurrentRef = useRef(0)
  const draggingRef = useRef(false)
  const rafRef = useRef(null)
  const dragStateRef = useRef({ startX: 0, startBias: 0, moved: false, pointerId: null })
  const wheelDeltaRef = useRef(0)
  const wheelAnimationRef = useRef(null)
  const wheelIdleTimerRef = useRef(null)

  const selectedCards = useMemo(
    () => selectedIds.map((id) => deck.find((card) => card.id === id)).filter(Boolean),
    [deck, selectedIds]
  )
  const spacingPositions = useMemo(() => buildSpacingPositions(deck.length), [deck.length])
  const initialFocusIndex = useMemo(() => (deck.length - 1) / 2, [deck.length])

  const initialGeometries = useMemo(() => {
    return deck.map((_, index) =>
      getCardGeometry(index, deck.length, initialFocusIndex, 1200, 360, metrics, spacingPositions)
    )
  }, [deck, metrics, initialFocusIndex, spacingPositions])

  const stopMainRaf = () => {
    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  const cleanupWheelScheduling = () => {
    if (wheelAnimationRef.current) {
      window.cancelAnimationFrame(wheelAnimationRef.current)
      wheelAnimationRef.current = null
    }
    if (wheelIdleTimerRef.current) {
      window.clearTimeout(wheelIdleTimerRef.current)
      wheelIdleTimerRef.current = null
    }
    wheelDeltaRef.current = 0
  }

  const applyDeckGeometry = (focusIndex) => {
    const stage = stageRef.current
    if (!stage || cardRefs.current.length === 0) return

    const stageWidth = stage.clientWidth || 1200
    const stageHeight = stage.clientHeight || 360

    for (let index = 0; index < deck.length; index += 1) {
      const node = cardRefs.current[index]
      if (!node) continue

      const geometry = getCardGeometry(index, deck.length, focusIndex, stageWidth, stageHeight, metrics, spacingPositions)
      node.style.transform = geometry.transform
      node.style.opacity = geometry.opacity
      node.style.zIndex = geometry.zIndex
    }
  }

  const ensureRafLoop = () => {
    if (rafRef.current) return

    const tick = () => {
      const target = biasTargetRef.current
      const current = biasCurrentRef.current
      const delta = getWrappedDistance(current, target, deck.length)
      const next = draggingRef.current ? target : wrapIndex(current + delta * 0.18, deck.length)

      biasCurrentRef.current = Math.abs(delta) < 0.0015 ? target : next
      applyDeckGeometry(biasCurrentRef.current)

      if (draggingRef.current || Math.abs(getWrappedDistance(biasCurrentRef.current, biasTargetRef.current, deck.length)) > 0.0015) {
        rafRef.current = window.requestAnimationFrame(tick)
      } else {
        rafRef.current = null
      }
    }

    rafRef.current = window.requestAnimationFrame(tick)
  }

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  useEffect(() => {
    draggingRef.current = dragging
  }, [dragging])

  useEffect(() => {
    stopMainRaf()
    cleanupWheelScheduling()
    biasTargetRef.current = initialFocusIndex
    biasCurrentRef.current = initialFocusIndex
    draggingRef.current = false
    dragStateRef.current = { startX: 0, startBias: 0, moved: false, pointerId: null }
    cardRefs.current = []
    setDragging(false)
    setWheelActive(false)
    setSelectedIds([])
  }, [deck.length, modeConfig.id, initialFocusIndex])

  useEffect(() => {
    applyDeckGeometry(initialFocusIndex)
  }, [deck.length, initialFocusIndex, metrics, spacingPositions, wheelActive])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage || typeof ResizeObserver === 'undefined') return undefined

    const observer = new ResizeObserver(() => {
      applyDeckGeometry(biasCurrentRef.current)
    })
    observer.observe(stage)

    return () => observer.disconnect()
  }, [deck.length, metrics, spacingPositions])

  useEffect(() => {
    return () => {
      stopMainRaf()
      cleanupWheelScheduling()
    }
  }, [])

  const toggleCard = (cardId) => {
    if (dragStateRef.current.moved) return
    setSelectedIds((prev) => {
      if (prev.includes(cardId)) return prev.filter((id) => id !== cardId)
      if (prev.length >= modeConfig.drawCount) return prev
      return [...prev, cardId]
    })
  }

  const handleConfirm = () => {
    onConfirm(finalizeSelectedCards(modeConfig.deckType, selectedCards))
  }

  const handlePointerDown = (event) => {
    dragStateRef.current = {
      startX: event.clientX,
      startBias: biasTargetRef.current,
      moved: false,
      pointerId: event.pointerId,
    }
    draggingRef.current = false
    setDragging(false)
  }

  const handlePointerMove = (event) => {
    if (dragStateRef.current.pointerId !== event.pointerId) return
    const deltaX = event.clientX - dragStateRef.current.startX
    let isDragging = draggingRef.current

    if (!isDragging && Math.abs(deltaX) > 6) {
      dragStateRef.current.moved = true
      event.currentTarget.setPointerCapture(event.pointerId)
      draggingRef.current = true
      setDragging(true)
      isDragging = true
    }

    if (!isDragging) return

    biasTargetRef.current = wrapIndex(dragStateRef.current.startBias - deltaX / 140, deck.length)
    ensureRafLoop()
  }

  const handlePointerUp = (event) => {
    if (dragStateRef.current.pointerId !== event.pointerId) return

    if (draggingRef.current && event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    draggingRef.current = false
    setDragging(false)
    dragStateRef.current.pointerId = null
    ensureRafLoop()

    window.setTimeout(() => {
      dragStateRef.current.moved = false
    }, 0)
  }

  const handleWheel = (event) => {
    if (Math.abs(event.deltaX) < 1 && Math.abs(event.deltaY) < 1) return
    event.preventDefault()

    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
    wheelDeltaRef.current += delta

    if (!wheelActive) {
      setWheelActive(true)
    }

    if (wheelIdleTimerRef.current) {
      window.clearTimeout(wheelIdleTimerRef.current)
    }
    wheelIdleTimerRef.current = window.setTimeout(() => {
      wheelIdleTimerRef.current = null
      setWheelActive(false)
    }, 120)

    if (wheelAnimationRef.current) return

    wheelAnimationRef.current = window.requestAnimationFrame(() => {
      const accumulatedDelta = wheelDeltaRef.current
      wheelDeltaRef.current = 0
      wheelAnimationRef.current = null

      biasTargetRef.current = wrapIndex(biasTargetRef.current + accumulatedDelta / 220, deck.length)
      ensureRafLoop()
    })
  }

  const overlay = (
    <div className="fixed inset-0 z-[90] overflow-hidden">
      <div className="absolute inset-0" style={{ background: theme.backdrop }} />
      <div className={`absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.14),_transparent_62%)] ${wheelActive ? 'backdrop-blur-[3px]' : 'backdrop-blur-[8px]'}`} />
      <StarField color={theme.star} reducedEffects={wheelActive} />

      <button
        type="button"
        onClick={onClose}
        className="absolute right-5 top-5 z-20 rounded-full border border-white/22 bg-white/10 px-4 py-2 text-sm text-white/72 backdrop-blur-sm transition hover:bg-white/16 hover:text-white"
      >
        关闭
      </button>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-8">
        <div
          className="w-full max-w-[960px] rounded-full border px-8 py-4 text-center backdrop-blur-md sm:px-12 sm:py-5"
          style={{
            borderColor: theme.border,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
            boxShadow: `0 0 20px ${theme.glow}, inset 0 1px 0 rgba(255,255,255,0.14)`,
          }}
        >
          <p className={`font-serif text-2xl leading-relaxed sm:text-4xl ${theme.text}`}>{copy.title}</p>
          <p className={`mt-2 text-sm ${theme.subtext}`}>{copy.subtitle}</p>
        </div>

        <SelectedCardSummary
          selectedCards={selectedCards}
          count={modeConfig.drawCount}
          onRemove={(cardId) => setSelectedIds((prev) => prev.filter((id) => id !== cardId))}
        />

        <div
          className={`w-full max-w-[1200px] ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={{ touchAction: 'none' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
        >
          <CardFan
            cards={deck}
            selectedIds={selectedIds}
            onSelect={toggleCard}
            theme={theme}
            wheelActive={wheelActive}
            cardRefs={cardRefs}
            initialGeometries={initialGeometries}
            metrics={metrics}
            stageRef={stageRef}
          />
        </div>

        <p className={`mt-2 text-sm ${theme.subtext}`}>拖拽会轻微拨动整副牌阵，完整牌组始终保持可见。</p>

        <div className="mt-5 flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={selectedIds.length !== modeConfig.drawCount}
            className={`min-w-[300px] rounded-full border border-white/18 px-10 py-4 text-2xl font-medium backdrop-blur-md transition sm:min-w-[420px] ${
              selectedIds.length === modeConfig.drawCount ? theme.button : theme.buttonDisabled
            }`}
            style={{
              boxShadow: selectedIds.length === modeConfig.drawCount ? `0 0 14px ${theme.glow}` : 'none',
            }}
          >
            {copy.confirm}
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="rounded-full border border-white/14 bg-white/8 px-8 py-3 text-lg text-white/60 backdrop-blur-sm transition hover:bg-white/12 hover:text-white/84"
          >
            清空选择
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(overlay, document.body)
}
