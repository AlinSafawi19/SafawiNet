import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { Layout } from './components/layout'
import HomePage from './pages/HomePage'
import MyAccountPage from './pages/MyAccountPage'
import VerifyEmailPage from './pages/VerifyEmailPage'

function App() {
  return (
    <AuthProvider>
      <Layout>
        <Routes>
          {/* Public routes */}
          <Route index element={<HomePage />} />
          <Route path="/my-account" element={<MyAccountPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
        </Routes>
      </Layout>
    </AuthProvider>
  )
}

export default App
