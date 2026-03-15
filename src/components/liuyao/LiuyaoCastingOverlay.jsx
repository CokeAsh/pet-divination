import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import ShellLineItem from './ShellLineItem'
import LiuyaoPreviewCard from './LiuyaoPreviewCard'
import { LIUYAO_LABELS, buildLiuyaoCast, generateLineResult } from '../../utils/liuyao'

function getThemeClasses() {
  return {
    accentText: 'text-emerald-50',
    accentBg: 'bg-emerald-500 hover:bg-emerald-400',
    accentPanel: 'border-white/16 bg-white/10',
  }
}

export default function LiuyaoCastingOverlay({ onClose, onConfirm }) {
  const classes = getThemeClasses()
  const [phase, setPhase] = useState('ready')
  const [lineResults, setLineResults] = useState([])
  const [animatingLineIndex, setAnimatingLineIndex] = useState(null)
  const [previewCast, setPreviewCast] = useState(null)

  const activeLineIndex = lineResults.length
  const renderedLines = useMemo(
    () => [...LIUYAO_LABELS].map((label, index) => ({ label, lineIndex: index })).reverse(),
    []
  )

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  const resetOverlay = () => {
    setPhase('ready')
    setLineResults([])
    setAnimatingLineIndex(null)
    setPreviewCast(null)
  }

  const handleShellClick = (lineIndex) => {
    if (phase === 'preview' || animatingLineIndex !== null || lineIndex !== activeLineIndex) return

    const nextLine = generateLineResult(lineIndex)
    const nextResults = [...lineResults, nextLine]

    setPhase('casting')
    setAnimatingLineIndex(lineIndex)
    setLineResults(nextResults)

    window.setTimeout(() => {
      setAnimatingLineIndex(null)
      if (nextResults.length === 6) {
        setPreviewCast(buildLiuyaoCast(nextResults))
        setPhase('preview')
      }
    }, 420)
  }

  const overlay = (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(208,255,232,0.18),transparent_24%),radial-gradient(circle_at_80%_18%,rgba(235,255,246,0.16),transparent_20%),linear-gradient(180deg,rgba(24,67,50,0.96),rgba(42,102,74,0.94),rgba(65,124,96,0.92))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_58%)] backdrop-blur-[10px]" />

      <button
        type="button"
        onClick={onClose}
        className="absolute right-5 top-5 z-20 rounded-full border border-white/18 bg-white/10 px-4 py-2 text-sm text-white/72 backdrop-blur-sm transition hover:bg-white/16 hover:text-white"
      >
        关闭
      </button>

      <div className="relative z-10 flex h-screen items-center px-4 py-8">
        <div className="mx-auto grid h-full w-full max-w-[1180px] grid-cols-[minmax(0,1fr)_400px] items-center gap-8">
          <div className="flex h-full min-h-0 flex-col justify-center self-center text-white">
            <div className="max-w-[400px]">
              <p className="text-sm tracking-[0.28em] text-emerald-100/70">LIUYAO CASTING</p>
              <h2 className="mt-2 font-serif text-[2rem] leading-tight text-white sm:text-[2.4rem]">六爻摇卦</h2>
              <p className="mt-4 text-base leading-7 text-white/78">静心凝神，想着问题，由下到上摇动龟壳</p>
            </div>

            {phase === 'preview' && previewCast ? (
              <div className="mt-6 max-w-[420px]">
                <LiuyaoPreviewCard
                  cast={previewCast}
                  classes={classes}
                  onReset={resetOverlay}
                  onConfirm={() => onConfirm(previewCast)}
                />
              </div>
            ) : (
              <div className="mt-6 max-w-[360px] rounded-2xl border border-white/14 bg-white/8 px-5 py-4 text-sm text-white/72">
                {phase === 'ready'
                  ? '从最下方的初爻开始，逐个点击右侧龟壳。'
                  : `正在起第 ${activeLineIndex + 1} 爻，共 6 爻。`}
              </div>
            )}
          </div>

          <div className="flex h-full min-h-0 items-center justify-end self-center">
            <div className="flex max-h-[calc(100vh-96px)] w-full flex-col items-end justify-center gap-2.5 py-1">
              {renderedLines.map(({ label, lineIndex }) => {
                const lineResult = lineResults.find((line) => line.lineIndex === lineIndex)
                return (
                  <ShellLineItem
                    key={label}
                    label={label}
                    coins={lineResult?.coins || []}
                    isActive={lineIndex === activeLineIndex && phase !== 'preview' && animatingLineIndex === null}
                    isLocked={Boolean(lineResult)}
                    isAnimating={animatingLineIndex === lineIndex}
                    onClick={() => handleShellClick(lineIndex)}
                  />
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(overlay, document.body)
}
