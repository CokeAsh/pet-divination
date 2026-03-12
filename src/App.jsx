import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import PetSelect from './pages/PetSelect'
import Fortune from './pages/Fortune'
import Result from './pages/Result'
import ConsultChat from './pages/ConsultChat'
import Login from './pages/Login'
import Admin from './pages/Admin'
import Dashboard from './pages/Dashboard'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/*" element={
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/pet" element={<PetSelect />} />
              <Route path="/fortune" element={<Fortune />} />
              <Route path="/result" element={<Result />} />
              <Route path="/consult" element={<ConsultChat />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </AuthProvider>
  )
}

export default App
