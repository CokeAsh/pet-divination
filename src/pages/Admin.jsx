import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { CHARACTERS } from '../data/characters'

const ROLE_LABEL = { admin: '管理员', fortune_teller: '占卜师', user: '用户' }
const ROLE_COLOR = { admin: 'bg-purple-100 text-purple-700', fortune_teller: 'bg-mystic-100 text-mystic-700', user: 'bg-stone-100 text-stone-600' }
const KB_TYPES = ['tarot', 'lenormand']
const KB_LABEL = { tarot: '塔罗牌义', lenormand: '雷诺曼牌义' }

export default function Admin() {
  const { user, logout, authFetch } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('accounts')

  useEffect(() => {
    if (!user || user.role !== 'admin') navigate('/login')
  }, [user])

  if (!user) return null

  return (
    <div className="min-h-screen bg-mystic-50">
      <header className="border-b border-stone-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <p className="text-xs text-stone-400">管理后台</p>
            <h1 className="font-serif text-lg font-semibold text-mystic-800">宠物灵语</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-stone-500">{user.username}</span>
            <button onClick={() => { logout(); navigate('/') }} className="text-xs text-stone-400 hover:text-stone-600">退出</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-6">
        <div className="mb-6 flex gap-1 rounded-xl bg-stone-100 p-1 w-fit">
          {[['accounts', '账号管理'], ['persona', '人设编辑'], ['knowledge', '知识库']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${tab === key ? 'bg-white text-mystic-700 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'accounts' && <AccountsTab authFetch={authFetch} currentUserId={user.id} />}
        {tab === 'persona' && <PersonaTab authFetch={authFetch} characters={CHARACTERS} />}
        {tab === 'knowledge' && <KnowledgeTab authFetch={authFetch} characters={CHARACTERS} />}
      </div>
    </div>
  )
}

// ── 账号管理 Tab ───────────────────────────────────────────

function AccountsTab({ authFetch, currentUserId }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'fortune_teller', display_name: '' })
  const [error, setError] = useState('')

  useEffect(() => { fetchUsers() }, [])

  const fetchUsers = async () => {
    setLoading(true)
    const res = await authFetch('/api/admin/users')
    if (res.ok) setUsers(await res.json())
    setLoading(false)
  }

  const handleCreate = async (e) => {
    e.preventDefault(); setError('')
    const res = await authFetch('/api/admin/users', { method: 'POST', body: JSON.stringify(form) })
    const data = await res.json()
    if (!res.ok) { setError(data.error); return }
    setUsers(u => [data, ...u])
    setShowCreate(false)
    setForm({ username: '', email: '', password: '', role: 'fortune_teller', display_name: '' })
  }

  const toggleDisable = async (u) => {
    const res = await authFetch(`/api/admin/users/${u.id}`, { method: 'PUT', body: JSON.stringify({ disabled: !u.disabled }) })
    if (res.ok) setUsers(list => list.map(x => x.id === u.id ? { ...x, disabled: !u.disabled } : x))
  }

  const toggleKnowledge = async (u) => {
    const res = await authFetch(`/api/admin/users/${u.id}/permissions`, {
      method: 'PUT', body: JSON.stringify({ can_edit_knowledge: !u.can_edit_knowledge })
    })
    if (res.ok) setUsers(list => list.map(x => x.id === u.id ? { ...x, can_edit_knowledge: !u.can_edit_knowledge } : x))
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-stone-700">账号列表</h2>
        <button onClick={() => setShowCreate(true)} className="rounded-xl bg-mystic-600 px-4 py-2 text-sm font-medium text-white hover:bg-mystic-700">+ 新建账号</button>
      </div>

      {showCreate && (
        <div className="mb-6 rounded-2xl border border-mystic-200 bg-white p-6">
          <h3 className="mb-4 text-sm font-semibold text-stone-700">新建账号</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            {[['username', '用户名 *', 'text', 'username', true], ['display_name', '显示名称', 'text', '显示给用户看的名字', false],
              ['email', '邮箱', 'email', '选填', false], ['password', '密码 *', 'password', '至少6位', true]].map(([k, label, type, ph, req]) => (
              <div key={k}>
                <label className="mb-1 block text-xs text-stone-500">{label}</label>
                <input value={form[k]} onChange={set(k)} type={type} placeholder={ph} required={req}
                  className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-mystic-400" />
              </div>
            ))}
            <div>
              <label className="mb-1 block text-xs text-stone-500">角色 *</label>
              <select value={form.role} onChange={set('role')} className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-mystic-400">
                <option value="fortune_teller">占卜师</option>
                <option value="admin">管理员</option>
                <option value="user">普通用户</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" className="rounded-xl bg-mystic-600 px-4 py-2 text-sm font-medium text-white hover:bg-mystic-700">创建</button>
              <button type="button" onClick={() => setShowCreate(false)} className="rounded-xl border border-stone-200 px-4 py-2 text-sm text-stone-500 hover:bg-stone-50">取消</button>
            </div>
            {error && <p className="col-span-2 text-xs text-red-500">{error}</p>}
          </form>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
        {loading ? <div className="py-12 text-center text-sm text-stone-400">加载中…</div> : (
          <table className="w-full text-sm">
            <thead className="border-b border-stone-100 bg-stone-50">
              <tr>{['用户名', '角色', '知识库权限', '状态', '操作'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-stone-500">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {users.map(u => (
                <tr key={u.id} className={u.disabled ? 'opacity-50' : ''}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-stone-700">{u.username}</p>
                    {u.display_name && u.display_name !== u.username && <p className="text-xs text-stone-400">{u.display_name}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLOR[u.role]}`}>{ROLE_LABEL[u.role]}</span>
                  </td>
                  <td className="px-4 py-3">
                    {u.role === 'fortune_teller' ? (
                      <button onClick={() => toggleKnowledge(u)}
                        className={`rounded-full px-2 py-0.5 text-xs font-medium transition ${u.can_edit_knowledge ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-400'}`}>
                        {u.can_edit_knowledge ? '已授权' : '未授权'}
                      </button>
                    ) : <span className="text-xs text-stone-300">-</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs ${u.disabled ? 'text-red-500' : 'text-green-600'}`}>{u.disabled ? '已禁用' : '正常'}</span>
                  </td>
                  <td className="px-4 py-3">
                    {u.id !== currentUserId && (
                      <button onClick={() => toggleDisable(u)} className={`text-xs hover:underline ${u.disabled ? 'text-mystic-600' : 'text-red-500'}`}>
                        {u.disabled ? '启用' : '禁用'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── 人设编辑 Tab ───────────────────────────────────────────

function PersonaTab({ authFetch, characters }) {
  const [characterKey, setCharacterKey] = useState(characters?.[0]?.id ?? 'liliana')
  const [data, setData] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setData(null)
    authFetch(`/api/prompts/${characterKey}`).then(r => r.json()).then(setData)
  }, [characterKey])

  const save = async (field, value) => {
    setSaving(true); setSaved(false)
    const body = { [field]: value }
    if (field === 'fortune_instructions') body[field] = data.fortune_instructions
    await authFetch(`/api/prompts/${characterKey}`, { method: 'PUT', body: JSON.stringify(body) })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!data) return <div className="py-12 text-center text-sm text-stone-400">加载中…</div>

  const currentChar = characters?.find(c => c.id === characterKey)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-stone-500">编辑角色：</span>
        {(characters || []).map(c => (
          <button
            key={c.id}
            onClick={() => setCharacterKey(c.id)}
            className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${characterKey === c.id ? 'bg-mystic-600 text-white' : 'border border-stone-200 bg-white text-stone-600 hover:border-mystic-300'}`}
          >
            {c.emoji} {c.name}
          </button>
        ))}
      </div>
      {data.is_default && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-700">
          当前使用默认配置，编辑后将覆盖默认值
        </div>
      )}

      <PromptBlock label="人设 (Persona)" value={data.persona} rows={14}
        onSave={v => { setData(d => ({ ...d, persona: v })); save('persona', v) }} saving={saving} saved={saved} />

      <PromptBlock label="对话流程 (Chat Flow)" value={data.chat_flow} rows={20}
        onSave={v => { setData(d => ({ ...d, chat_flow: v })); save('chat_flow', v) }} saving={saving} saved={saved} />

      <div className="rounded-2xl border border-stone-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold text-stone-700">快速感应指令 (Fortune Instructions)</h3>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(data.fortune_instructions || {}).map(([key, val]) => (
            <div key={key}>
              <label className="mb-1 block text-xs font-medium text-stone-500">{key}</label>
              <textarea rows={4} defaultValue={val}
                onBlur={e => {
                  const updated = { ...data.fortune_instructions, [key]: e.target.value }
                  setData(d => ({ ...d, fortune_instructions: updated }))
                  save('fortune_instructions', updated)
                }}
                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs leading-relaxed outline-none focus:border-mystic-400 resize-none" />
            </div>
          ))}
        </div>
        {saving && <p className="mt-2 text-xs text-stone-400">保存中…</p>}
        {saved && <p className="mt-2 text-xs text-green-600">已保存</p>}
      </div>
    </div>
  )
}

function PromptBlock({ label, value, rows, onSave, saving, saved }) {
  const [val, setVal] = useState(value || '')
  useEffect(() => setVal(value || ''), [value])
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-700">{label}</h3>
        <button onClick={() => onSave(val)}
          className="rounded-xl bg-mystic-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-mystic-700 disabled:opacity-60">
          {saving ? '保存中…' : saved ? '✓ 已保存' : '保存'}
        </button>
      </div>
      <textarea value={val} onChange={e => setVal(e.target.value)} rows={rows}
        className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs leading-relaxed font-mono outline-none focus:border-mystic-400 resize-y" />
    </div>
  )
}

// ── 知识库 Tab ─────────────────────────────────────────────

function KnowledgeTab({ authFetch, characters }) {
  const [characterKey, setCharacterKey] = useState(characters?.[0]?.id ?? 'liliana')
  const [kbType, setKbType] = useState('tarot')
  const [data, setData] = useState(null)
  const [editCard, setEditCard] = useState(null)
  const [editVal, setEditVal] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setData(null); setEditCard(null)
    authFetch(`/api/knowledge/${characterKey}/${kbType}`).then(r => r.json()).then(d => setData(d.data))
  }, [characterKey, kbType])

  const saveCard = async (cardName) => {
    const updated = { ...data, [cardName]: editVal }
    setSaving(true)
    await authFetch(`/api/knowledge/${characterKey}/${kbType}`, { method: 'PUT', body: JSON.stringify({ data: updated }) })
    setData(updated); setEditCard(null); setSaving(false)
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="text-xs text-stone-500">角色：</span>
        {(characters || []).map(c => (
          <button
            key={c.id}
            onClick={() => setCharacterKey(c.id)}
            className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${characterKey === c.id ? 'bg-mystic-600 text-white' : 'border border-stone-200 bg-white text-stone-600 hover:border-mystic-300'}`}
          >
            {c.emoji} {c.name}
          </button>
        ))}
        <span className="text-stone-300">|</span>
        {KB_TYPES.map(t => (
          <button key={t} onClick={() => setKbType(t)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${kbType === t ? 'bg-mystic-600 text-white' : 'border border-stone-200 bg-white text-stone-600 hover:border-mystic-300'}`}>
            {KB_LABEL[t]}
          </button>
        ))}
      </div>

      {!data ? <div className="py-12 text-center text-sm text-stone-400">加载中…</div> : (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-100 bg-stone-50">
              <tr>
                <th className="w-28 px-4 py-3 text-left text-xs font-medium text-stone-500">牌名</th>
                {kbType === 'tarot' ? (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-medium text-stone-500">正位含义</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-stone-500">逆位含义</th>
                  </>
                ) : (
                  <th className="px-4 py-3 text-left text-xs font-medium text-stone-500">含义</th>
                )}
                <th className="w-16 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {Object.entries(data).map(([cardName, val]) => (
                <tr key={cardName}>
                  <td className="px-4 py-3 font-medium text-stone-700 align-top">{cardName}</td>
                  {editCard === cardName ? (
                    kbType === 'tarot' ? (
                      <>
                        <td className="px-4 py-2">
                          <textarea value={editVal.upright || ''} onChange={e => setEditVal(v => ({ ...v, upright: e.target.value }))}
                            rows={3} className="w-full rounded-lg border border-mystic-300 px-2 py-1.5 text-xs leading-relaxed outline-none resize-none" />
                        </td>
                        <td className="px-4 py-2">
                          <textarea value={editVal.reversed || ''} onChange={e => setEditVal(v => ({ ...v, reversed: e.target.value }))}
                            rows={3} className="w-full rounded-lg border border-mystic-300 px-2 py-1.5 text-xs leading-relaxed outline-none resize-none" />
                        </td>
                      </>
                    ) : (
                      <td className="px-4 py-2">
                        <textarea value={typeof editVal === 'string' ? editVal : ''} onChange={e => setEditVal(e.target.value)}
                          rows={3} className="w-full rounded-lg border border-mystic-300 px-2 py-1.5 text-xs leading-relaxed outline-none resize-none" />
                      </td>
                    )
                  ) : (
                    kbType === 'tarot' ? (
                      <>
                        <td className="px-4 py-3 text-xs leading-relaxed text-stone-500 align-top max-w-xs">{val?.upright}</td>
                        <td className="px-4 py-3 text-xs leading-relaxed text-stone-500 align-top max-w-xs">{val?.reversed}</td>
                      </>
                    ) : (
                      <td className="px-4 py-3 text-xs leading-relaxed text-stone-500 align-top">{val}</td>
                    )
                  )}
                  <td className="px-4 py-3 align-top">
                    {editCard === cardName ? (
                      <div className="flex gap-1">
                        <button onClick={() => saveCard(cardName)} disabled={saving}
                          className="rounded-lg bg-mystic-600 px-2 py-1 text-xs text-white hover:bg-mystic-700">保存</button>
                        <button onClick={() => setEditCard(null)} className="rounded-lg border border-stone-200 px-2 py-1 text-xs text-stone-500">取消</button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditCard(cardName); setEditVal(val) }}
                        className="text-xs text-mystic-600 hover:underline">编辑</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
