import { LIUYAO_LABELS } from '../../utils/liuyao'

function getLineText(line) {
  return `${LIUYAO_LABELS[line.lineIndex]}：${line.lineType === 'yang' ? '阳' : '阴'}${line.isMoving ? ' · 动爻' : ''}`
}

export default function LiuyaoPreviewCard({ cast, classes, onReset, onConfirm, compact = false }) {
  if (!cast) return null

  return (
    <div className={`rounded-2xl border px-4 py-4 ${classes.accentPanel}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={`text-sm font-semibold ${classes.accentText}`}>主卦：{cast.primary}</p>
          <p className="mt-1 text-xs text-stone-500">
            变卦：{cast.relating} · 动爻 {cast.movingCount} 条
          </p>
        </div>
        {(onReset || onConfirm) && (
          <div className="flex items-center gap-3">
            {onReset ? (
              <button type="button" onClick={onReset} className="text-xs text-stone-400 hover:text-stone-600">
                重新起卦
              </button>
            ) : null}
            {onConfirm ? (
              <button
                type="button"
                onClick={onConfirm}
                className={`rounded-full px-4 py-2 text-sm font-medium text-white ${classes.accentBg}`}
              >
                使用此卦
              </button>
            ) : null}
          </div>
        )}
      </div>

      <div className={`mt-4 grid gap-2 ${compact ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
        {cast.lines.map((line) => (
          <div key={line.lineIndex} className="rounded-xl bg-white/70 px-3 py-2 text-sm text-stone-700">
            {getLineText(line)}
          </div>
        ))}
      </div>
    </div>
  )
}
