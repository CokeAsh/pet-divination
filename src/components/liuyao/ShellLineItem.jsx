export default function ShellLineItem({
  label,
  coins,
  isActive,
  isLocked,
  isAnimating,
  onClick,
}) {
  const shellTone = isLocked
    ? 'border-emerald-200/80 bg-[linear-gradient(180deg,rgba(226,255,240,0.94),rgba(182,232,202,0.82))] text-emerald-950'
    : isActive
      ? 'border-emerald-200/70 bg-[linear-gradient(180deg,rgba(248,255,251,0.88),rgba(205,238,219,0.72))] text-emerald-950 hover:border-emerald-100 hover:bg-[linear-gradient(180deg,rgba(252,255,253,0.94),rgba(214,244,227,0.82))]'
      : 'cursor-default border-white/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(190,222,205,0.12))] text-white/55'

  return (
    <div className="flex items-center justify-end gap-4">
      <style>{`
        @keyframes shell-sway {
          0% { transform: rotate(0deg) translateY(0); }
          18% { transform: rotate(-4.2deg) translateY(-1px); }
          38% { transform: rotate(3.6deg) translateY(0); }
          58% { transform: rotate(-2.4deg) translateY(-1px); }
          78% { transform: rotate(1.2deg) translateY(0); }
          100% { transform: rotate(0deg) translateY(0); }
        }
      `}</style>

      <div className="flex min-h-[40px] items-center gap-2">
        {coins?.map((coin) => (
          <div
            key={coin.id}
            className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs font-medium ${
              coin.side === 'yang'
                ? 'border-amber-200 bg-amber-100/90 text-amber-700'
                : 'border-emerald-100 bg-emerald-50/90 text-emerald-700'
            }`}
          >
            {coin.side === 'yang' ? '阳' : '阴'}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onClick}
        disabled={!isActive}
        style={{
          animation: isAnimating ? 'shell-sway 420ms cubic-bezier(0.22, 0.8, 0.24, 1)' : 'none',
          transformOrigin: '50% 62%',
        }}
        className={`relative flex h-[104px] w-[84px] items-center justify-center rounded-[42px_42px_34px_34px] border text-sm transition ${shellTone} ${
          isAnimating ? 'shadow-[0_10px_22px_rgba(12,54,38,0.18)]' : ''
        }`}
      >
        <span className="absolute inset-[5px] rounded-[38px_38px_30px_30px] border border-white/24 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.36),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.02))]" />
        <span className="absolute left-1/2 top-[12px] h-[76px] w-[1px] -translate-x-1/2 bg-white/22" />
        <span className="absolute top-[26px] h-[1px] w-[52px] bg-white/14" />
        <span className="absolute top-[44px] h-[1px] w-[58px] bg-white/14" />
        <span className="absolute top-[62px] h-[1px] w-[52px] bg-white/14" />
        <span className="absolute inset-x-[16px] top-[18px] h-[64px] rounded-[28px] border border-white/12" />
        <span className="absolute inset-x-[22px] top-[8px] h-[14px] rounded-full bg-white/18 blur-[4px]" />
        <span className="absolute bottom-[10px] h-[10px] w-[22px] rounded-full bg-emerald-950/8 blur-[2px]" />
        <span className="relative z-10 mt-[2px] rounded-full bg-white/16 px-3 py-1 text-[11px] font-medium tracking-[0.12em] text-current">
          {label}
        </span>
      </button>
    </div>
  )
}
