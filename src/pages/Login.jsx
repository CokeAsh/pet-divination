import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [tab, setTab] = useState('login')
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/'

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      let user
      if (tab === 'login') {
        user = await login(form.username, form.password)
      } else {
        if (!form.username || !form.password) { setError('用户名和密码不能为空'); setLoading(false); return }
        user = await register(form.username, form.email, form.password)
      }
      if (user.role === 'admin') navigate('/admin')
      else if (user.role === 'fortune_teller') navigate('/dashboard')
      else navigate(from)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-mystic-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link to="/" className="font-serif text-2xl font-semibold text-mystic-700">🐾 宠物灵语</Link>
          <p className="mt-1 text-sm text-stone-400">与毛孩子的心灵对话</p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex rounded-xl bg-stone-100 p-1">
            {['login', 'register'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${tab === t ? 'bg-white text-mystic-700 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
                {t === 'login' ? '登录' : '注册'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">用户名</label>
              <input value={form.username} onChange={set('username')} placeholder="请输入用户名"
                className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-mystic-400 focus:ring-2 focus:ring-mystic-100" />
            </div>

            {tab === 'register' && (
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600">邮箱（选填）</label>
                <input value={form.email} onChange={set('email')} type="email" placeholder="your@email.com"
                  className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-mystic-400 focus:ring-2 focus:ring-mystic-100" />
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">密码</label>
              <input value={form.password} onChange={set('password')} type="password" placeholder="请输入密码"
                className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-mystic-400 focus:ring-2 focus:ring-mystic-100" />
            </div>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full rounded-xl bg-mystic-600 py-2.5 text-sm font-semibold text-white transition hover:bg-mystic-700 disabled:opacity-60">
              {loading ? '请稍候…' : tab === 'login' ? '登录' : '注册'}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-stone-400">
          <Link to="/" className="hover:text-mystic-600">← 返回首页</Link>
        </p>
      </div>
    </div>
  )
}
