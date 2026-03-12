import { Link, useNavigate } from 'react-router-dom'
import { CHARACTERS } from '../data/characters'

const QUICK_METHODS = [
  { id: 'tarot', label: '塔罗占卜', desc: '先接入莉莉安娜与易清的角色化快速占卜。' },
  { id: 'liuyao', label: '东玄六爻', desc: '已并入易清分支，可从她的入口继续起卦。' },
]

export default function PetSelect() {
  const navigate = useNavigate()

  const handleChooseCharacter = (characterId) => {
    navigate('/fortune', {
      state: {
        characterId,
        petType: 'other',
        petName: '毛孩子',
      },
    })
  }

  return (
    <div className="mx-auto max-w-5xl">
      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/75 px-6 py-8 shadow-xl shadow-verdant-900/5 backdrop-blur-md md:px-10 md:py-12">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-verdant-600">
          Quick Divination
        </p>
        <h1 className="mt-3 font-serif text-3xl font-semibold text-mystic-900 md:text-4xl">
          快速占卜先选择一位占卜师
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600 md:text-base">
          点击“快速占卜”后，先在这里选择由谁来带你进入具体占卜。
          莉莉安娜走塔罗与情绪感应，易清走气场与东玄六爻。
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          {QUICK_METHODS.map((method) => (
            <div
              key={method.id}
              className={`rounded-2xl border px-4 py-3 ${
                method.id === 'tarot'
                  ? 'border-mystic-200 bg-mystic-50/80'
                  : 'border-verdant-200 bg-verdant-50/80'
              }`}
            >
              <p className="text-sm font-semibold text-stone-800">{method.label}</p>
              <p className="mt-1 text-xs leading-6 text-stone-500">{method.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          {CHARACTERS.map((character) => (
            <article
              key={character.id}
              className={`relative overflow-hidden rounded-[1.75rem] border border-white/10 p-7 ${character.theme?.cardClass ?? ''}`}
            >
              {character.theme?.ringClass && (
                <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${character.theme.ringClass} opacity-80`} />
              )}
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">
                      快速占卜入口
                    </p>
                    <h2 className="mt-3 font-serif text-3xl font-semibold text-white">
                      {character.name}
                    </h2>
                    <p className="mt-2 text-sm text-white/80">{character.tagline}</p>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/12 text-3xl shadow-inner shadow-white/10">
                    {character.emoji}
                  </div>
                </div>

                <p className="mt-6 text-sm leading-7 text-white/85">
                  {character.id === 'liliana'
                    ? '莉莉安娜分支以纯紫色为主，负责塔罗、雷诺曼和情绪感应。'
                    : '易清分支以纯绿色为主，负责气场感应，并承接东玄六爻。'}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {character.tags.slice(0, 4).map((tag) => (
                    <span key={tag} className={`rounded-full px-3 py-1 text-xs ${character.theme?.chipClass ?? ''}`}>
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handleChooseCharacter(character.id)}
                    className={`rounded-2xl px-5 py-3 text-sm font-semibold transition ${character.theme?.buttonClass ?? ''}`}
                  >
                    选择 {character.name}
                  </button>
                  <Link
                    to={`/consult?character=${character.id}`}
                    className="rounded-2xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/15"
                  >
                    查看深度咨询
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-verdant-100 bg-gradient-to-r from-white/90 to-verdant-50/70 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-stone-700">当前入口逻辑</p>
            <p className="mt-1 text-xs text-stone-500">
              先选占卜师，再进入对应的快速占卜页面，不再直接跳动物信息页。
            </p>
          </div>
          <Link
            to="/"
            className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm text-stone-600 hover:bg-white"
          >
            返回首页
          </Link>
        </div>
      </section>
    </div>
  )
}
