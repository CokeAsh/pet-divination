import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { CHARACTERS } from '../data/characters'

const KB_LABEL = { tarot: '塔罗牌义', lenormand: '雷诺曼牌义' }

function getCharacterTheme(characterKey) {
  const isYiqing = characterKey === 'yiqing'
  return {
    isYiqing,
    bg: isYiqing ? 'bg-verdant-50' : 'bg-gradient-soft',
    accentText: isYiqing ? 'text-verdant-800' : 'text-mystic-800',
    accentSoftText: isYiqing ? 'text-verdant-600' : 'text-mystic-600',
    accentButton: isYiqing ? 'bg-verdant-600 hover:bg-verdant-700' : 'bg-mystic-600 hover:bg-mystic-700',
    accentBorder: isYiqing ? 'border-verdant-300' : 'border-mystic-300',
    accentChip: isYiqing ? 'bg-verdant-100 text-verdant-700' : 'bg-mystic-100 text-mystic-700',
    accentFocus: isYiqing ? 'focus:border-verdant-400' : 'focus:border-mystic-400',
  }
}

function useCharacterTheme(profile, user) {
  const key = profile?.character_key || user?.character_key || 'liliana'
  return getCharacterTheme(key)
}

function TextEditor({ label, rows, value, onChange, onSave, saving, saved, theme }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-700">{label}</h3>
        <button onClick={onSave} className={`rounded-xl px-3 py-1.5 text-xs font-medium text-white ${theme.accentButton}`}>
          {saving ? '保存中…' : saved ? '已保存' : '保存'}
        </button>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className={`w-full resize-y rounded-xl border border-stone-200 px-3 py-2 text-xs leading-relaxed font-mono outline-none ${theme.accentFocus}`}
      />
    </div>
  )
}

export default function Dashboard() {
  const { user, logout, authFetch } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('profile')
  const [profile, setProfile] = useState(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ display_name: '', bio: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user || (user.role !== 'fortune_teller' && user.role !== 'admin')) {
      navigate('/login')
      return
    }
    authFetch('/api/fortune-teller/profile')
      .then((res) => res.json())
      .then((data) => {
        setProfile(data)
        setForm({ display_name: data.display_name || '', bio: data.bio || '' })
      })
  }, [user, navigate, authFetch])

  const theme = useCharacterTheme(profile, user)

  const handleSaveProfile = async () => {
    setSaving(true)
    const res = await authFetch('/api/fortune-teller/profile', {
      method: 'PUT',
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const data = await res.json()
      setProfile(data)
      setEditing(false)
    }
    setSaving(false)
  }

  if (!profile) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-stone-400">加载中…</div>
  }

  const canEditKnowledge = profile.can_edit_knowledge || user?.role === 'admin'
  const tabs = [['profile', '主页信息'], ...(canEditKnowledge ? [['persona', '人设'], ['knowledge', '知识库']] : [])]

  return (
    <div className={`min-h-screen ${theme.bg}`}>
      <header className="border-b border-stone-200 bg-white/90 px-6 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div>
            <p className="text-xs text-stone-400">占卜师后台</p>
            <h1 className={`font-serif text-lg font-semibold ${theme.accentText}`}>宠物灵语</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-stone-500">{user?.username}</span>
            <button onClick={() => { logout(); navigate('/') }} className="text-xs text-stone-400 hover:text-stone-600">
              退出
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6 flex flex-wrap gap-1 rounded-xl bg-white/70 p-1 shadow-sm w-fit">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                tab === key ? `${theme.accentChip} shadow-sm` : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'profile' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-stone-200 bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-stone-700">主页信息</h2>
                {!editing && (
                  <button onClick={() => setEditing(true)} className={`text-xs hover:underline ${theme.accentSoftText}`}>
                    编辑
                  </button>
                )}
              </div>
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs text-stone-500">显示名称</label>
                    <input
                      value={form.display_name}
                      onChange={(e) => setForm((prev) => ({ ...prev, display_name: e.target.value }))}
                      className={`w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none ${theme.accentFocus}`}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-stone-500">个人简介</label>
                    <textarea
                      value={form.bio}
                      onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
                      rows={4}
                      className={`w-full resize-none rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none ${theme.accentFocus}`}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSaveProfile} disabled={saving} className={`rounded-xl px-4 py-2 text-sm font-medium text-white ${theme.accentButton}`}>
                      {saving ? '保存中…' : '保存'}
                    </button>
                    <button onClick={() => setEditing(false)} className="rounded-xl border border-stone-200 px-4 py-2 text-sm text-stone-500">
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs text-stone-400">显示名称</p>
                    <p className="mt-0.5 font-medium text-stone-700">{profile.display_name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-400">个人简介</p>
                    <p className="mt-0.5 leading-relaxed text-stone-600">{profile.bio || '暂无简介'}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-6">
              <h2 className="mb-3 text-sm font-semibold text-stone-700">账号信息</h2>
              <div className="space-y-2 text-sm text-stone-500">
                <p>用户名：<span className="text-stone-700">{profile.username}</span></p>
                <p>邮箱：<span className="text-stone-700">{profile.email || '未设置'}</span></p>
                <p>角色归属：<span className={`rounded-full px-2 py-0.5 text-xs font-medium ${theme.accentChip}`}>{profile.character_key || 'liliana'}</span></p>
                <p>知识库权限：<span className={`rounded-full px-2 py-0.5 text-xs font-medium ${canEditKnowledge ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'}`}>{canEditKnowledge ? '已授权' : '未授权'}</span></p>
              </div>
            </div>
          </div>
        )}

        {tab === 'persona' && canEditKnowledge && <DashboardPersonaTab authFetch={authFetch} theme={theme} />}
        {tab === 'knowledge' && canEditKnowledge && <DashboardKnowledgeTab authFetch={authFetch} theme={theme} />}
      </main>
    </div>
  )
}

function DashboardPersonaTab({ authFetch, theme }) {
  const [characterKey, setCharacterKey] = useState('liliana')
  const [data, setData] = useState(null)
  const [personaValue, setPersonaValue] = useState('')
  const [chatFlowValue, setChatFlowValue] = useState('')
  const [savingField, setSavingField] = useState('')
  const [savedField, setSavedField] = useState('')

  useEffect(() => {
    setData(null)
    authFetch(`/api/prompts/${characterKey}`)
      .then((res) => res.json())
      .then((result) => {
        setData(result)
        setPersonaValue(result.persona || '')
        setChatFlowValue(result.chat_flow || '')
      })
  }, [characterKey, authFetch])

  const saveField = async (field, value) => {
    setSavingField(field)
    setSavedField('')
    await authFetch(`/api/prompts/${characterKey}`, {
      method: 'PUT',
      body: JSON.stringify({ [field]: value }),
    })
    setSavingField('')
    setSavedField(field)
    setTimeout(() => setSavedField(''), 2000)
  }

  if (!data) return <div className="py-12 text-center text-sm text-stone-400">加载中…</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-stone-500">编辑角色：</span>
        {CHARACTERS.map((character) => (
          <button
            key={character.id}
            onClick={() => setCharacterKey(character.id)}
            className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
              characterKey === character.id ? `${getCharacterTheme(character.id).accentChip}` : 'border border-stone-200 bg-white text-stone-600 hover:border-stone-300'
            }`}
          >
            {character.emoji} {character.name}
          </button>
        ))}
      </div>

      <TextEditor
        label="人设 Persona"
        rows={14}
        value={personaValue}
        onChange={setPersonaValue}
        onSave={() => saveField('persona', personaValue)}
        saving={savingField === 'persona'}
        saved={savedField === 'persona'}
        theme={theme}
      />

      <TextEditor
        label="对话流程 Chat Flow"
        rows={18}
        value={chatFlowValue}
        onChange={setChatFlowValue}
        onSave={() => saveField('chat_flow', chatFlowValue)}
        saving={savingField === 'chat_flow'}
        saved={savedField === 'chat_flow'}
        theme={theme}
      />
    </div>
  )
}

function DashboardKnowledgeTab({ authFetch, theme }) {
  const [characterKey, setCharacterKey] = useState('liliana')
  const [kbType, setKbType] = useState('tarot')
  const [data, setData] = useState(null)
  const [editCard, setEditCard] = useState(null)
  const [editVal, setEditVal] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setData(null)
    setEditCard(null)
    authFetch(`/api/knowledge/${characterKey}/${kbType}`)
      .then((res) => res.json())
      .then((result) => setData(result.data))
  }, [characterKey, kbType, authFetch])

  const saveCard = async (cardName) => {
    const updated = { ...data, [cardName]: editVal }
    setSaving(true)
    await authFetch(`/api/knowledge/${characterKey}/${kbType}`, {
      method: 'PUT',
      body: JSON.stringify({ data: updated }),
    })
    setData(updated)
    setEditCard(null)
    setSaving(false)
  }

  if (!data) return <div className="py-12 text-center text-sm text-stone-400">加载中…</div>

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-stone-500">角色：</span>
        {CHARACTERS.map((character) => (
          <button
            key={character.id}
            onClick={() => setCharacterKey(character.id)}
            className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
              characterKey === character.id ? `${getCharacterTheme(character.id).accentChip}` : 'border border-stone-200 bg-white text-stone-600 hover:border-stone-300'
            }`}
          >
            {character.emoji} {character.name}
          </button>
        ))}
        <span className="text-stone-300">|</span>
        {Object.entries(KB_LABEL).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setKbType(key)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              kbType === key ? theme.accentChip : 'border border-stone-200 bg-white text-stone-600 hover:border-stone-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-stone-100 bg-stone-50">
            <tr>
              <th className="w-24 px-4 py-3 text-left text-xs font-medium text-stone-500">牌名</th>
              {kbType === 'tarot' ? (
                <>
                  <th className="px-4 py-3 text-left text-xs font-medium text-stone-500">正位</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-stone-500">逆位</th>
                </>
              ) : (
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500">含义</th>
              )}
              <th className="w-16 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {Object.entries(data).map(([cardName, value]) => (
              <tr key={cardName}>
                <td className="px-4 py-3 align-top font-medium text-stone-700">{cardName}</td>
                {editCard === cardName ? (
                  kbType === 'tarot' ? (
                    <>
                      <td className="px-4 py-2">
                        <textarea
                          value={editVal.upright || ''}
                          onChange={(e) => setEditVal((prev) => ({ ...prev, upright: e.target.value }))}
                          rows={3}
                          className={`w-full resize-none rounded-lg border border-stone-200 px-2 py-1.5 text-xs outline-none ${theme.accentFocus}`}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <textarea
                          value={editVal.reversed || ''}
                          onChange={(e) => setEditVal((prev) => ({ ...prev, reversed: e.target.value }))}
                          rows={3}
                          className={`w-full resize-none rounded-lg border border-stone-200 px-2 py-1.5 text-xs outline-none ${theme.accentFocus}`}
                        />
                      </td>
                    </>
                  ) : (
                    <td className="px-4 py-2">
                      <textarea
                        value={typeof editVal === 'string' ? editVal : ''}
                        onChange={(e) => setEditVal(e.target.value)}
                        rows={3}
                        className={`w-full resize-none rounded-lg border border-stone-200 px-2 py-1.5 text-xs outline-none ${theme.accentFocus}`}
                      />
                    </td>
                  )
                ) : kbType === 'tarot' ? (
                  <>
                    <td className="px-4 py-3 align-top text-xs leading-relaxed text-stone-500">{value?.upright}</td>
                    <td className="px-4 py-3 align-top text-xs leading-relaxed text-stone-500">{value?.reversed}</td>
                  </>
                ) : (
                  <td className="px-4 py-3 align-top text-xs leading-relaxed text-stone-500">{value}</td>
                )}
                <td className="px-4 py-3 align-top">
                  {editCard === cardName ? (
                    <div className="flex gap-1">
                      <button onClick={() => saveCard(cardName)} disabled={saving} className={`rounded-lg px-2 py-1 text-xs text-white ${theme.accentButton}`}>
                        保存
                      </button>
                      <button onClick={() => setEditCard(null)} className="rounded-lg border border-stone-200 px-2 py-1 text-xs text-stone-500">
                        取消
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditCard(cardName); setEditVal(value) }} className={`text-xs hover:underline ${theme.accentSoftText}`}>
                      编辑
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
