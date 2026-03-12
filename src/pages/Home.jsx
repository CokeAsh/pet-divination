import { Link } from 'react-router-dom'
import { CHARACTERS } from '../data/characters'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center md:py-20">
      <div className="mb-6 animate-float text-6xl md:text-7xl">🐾</div>
      <h1 className="font-serif text-3xl font-semibold text-mystic-800 md:text-4xl">
        宠物灵语
      </h1>
      <p className="mt-3 max-w-md text-sm leading-7 text-stone-500">
        绿与紫交织成新的占卜入口。
        <br />
        莉莉安娜负责情绪与塔罗，易清负责气场与东方卜感。
        <br />
        现在可以先进入深度咨询，也可以从快速占卜开始。
      </p>

      <div className="mt-10 w-full max-w-sm space-y-4">
        <p className="mb-3 text-left text-xs font-semibold uppercase tracking-widest text-mystic-500">
          已开放角色
        </p>
        {CHARACTERS.map((char) => (
          <div
            key={char.id}
            className="rounded-2xl border border-white/70 bg-white/85 px-6 py-5 text-left shadow-sm shadow-verdant-900/5 backdrop-blur-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-base font-semibold text-mystic-800">
                  {char.name} {char.nameEn}
                </p>
                <p className="mt-0.5 text-xs text-stone-400">{char.tagline}</p>
              </div>
              <span className="text-2xl">{char.emoji}</span>
            </div>
            <p className="mt-3 text-sm leading-7 text-stone-600">{char.shortDesc}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {char.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-gradient-to-r from-mystic-50 to-verdant-50 px-2.5 py-1 text-xs text-mystic-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 grid w-full max-w-sm gap-3">
        {CHARACTERS.map((char) => (
          <Link
            key={char.id}
            to={`/consult?character=${char.id}`}
            className={`group relative overflow-hidden rounded-2xl px-6 py-5 text-left transition ${char.theme?.cardClass ?? 'bg-mystic-600 text-white'}`}
          >
            {char.theme?.ringClass && (
              <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${char.theme.ringClass} opacity-80`}
              />
            )}
            <div className="relative z-10 flex items-start gap-3">
              <span className="mt-0.5 shrink-0 text-2xl opacity-80">{char.emoji}</span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-white/70">深度咨询</p>
                <p className="mt-1 text-base font-semibold text-white">与{char.name}对话</p>
                <p className="mt-1 text-xs leading-6 text-white/80">
                  通过各自的感应方式展开更完整的占卜结构与关系追问。
                </p>
              </div>
            </div>
          </Link>
        ))}

        <Link
          to="/pet"
          className="rounded-2xl border border-verdant-200 bg-white/80 px-6 py-4 text-left shadow-sm shadow-verdant-900/5 transition hover:border-mystic-400 hover:bg-white"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 text-xl">✦</span>
            <div>
              <p className="text-sm font-semibold text-verdant-700">快速占卜</p>
              <p className="mt-0.5 text-xs leading-6 text-stone-500">
                先选莉莉安娜或易清，再分别进入各自的快速占卜流。
              </p>
            </div>
          </div>
        </Link>
      </div>

      <p className="mt-8 text-xs text-stone-400">东玄六爻入口已预留，下一步接入易清分支</p>
    </div>
  )
}
