import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Layout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const isHome = location.pathname === '/'
  const isConsult = location.pathname === '/consult'
  const isQuickFlow = location.pathname === '/pet' || location.pathname === '/fortune' || location.pathname === '/result'

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gradient-soft text-stone-800">
      <header className="sticky top-0 z-50 border-b border-mystic-200/40 bg-white/75 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link
            to="/"
            className="flex items-center gap-2 font-serif text-lg font-semibold text-mystic-800 transition hover:text-verdant-700"
          >
            <span className="text-xl">🐾</span>
            宠物灵语
          </Link>
          <nav className="flex items-center gap-3 text-sm text-stone-600 sm:gap-4">
            {!isHome && (
              <>
                <Link to="/consult" className="whitespace-nowrap hover:text-mystic-700">
                  <span className="hidden sm:inline">深度咨询</span>
                  <span className="sm:hidden">咨询</span>
                </Link>
                <Link
                  to="/pet"
                  className={`whitespace-nowrap hover:text-verdant-700 ${isQuickFlow ? 'text-verdant-700' : ''}`}
                >
                  <span className="hidden sm:inline">快速占卜</span>
                  <span className="sm:hidden">快占</span>
                </Link>
              </>
            )}
            {user ? (
              <div className="flex items-center gap-2">
                {user.role === 'admin' && (
                  <Link to="/admin" className="text-xs text-mystic-700 hover:underline">
                    后台
                  </Link>
                )}
                {user.role === 'fortune_teller' && (
                  <Link to="/dashboard" className="text-xs text-mystic-700 hover:underline">
                    后台
                  </Link>
                )}
                <button onClick={handleLogout} className="text-xs text-stone-400 hover:text-stone-600">
                  退出
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="rounded-full border border-verdant-200 bg-white/70 px-3 py-1 text-xs text-mystic-700 hover:bg-verdant-50"
              >
                登录
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className={`mx-auto max-w-4xl ${isConsult ? 'px-0 py-0' : 'px-4 py-8'}`}>{children}</main>
      <footer className={`${isConsult ? 'hidden' : ''} mt-auto border-t border-mystic-200/40 py-6 text-center text-sm text-stone-500`}>
        宠物灵语 · 占卜解读仅供参考，不替代医疗诊断与专业训练建议
      </footer>
    </div>
  )
}
