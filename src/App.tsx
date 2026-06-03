import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import Login from '@/pages/Login'
import Booking from '@/pages/Booking'
import { useStore } from '@/store/useStore'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useStore((s) => s.token)
  const openid = useStore((s) => s.openid)
  if (!token && !openid) return <Navigate to="/login" replace />
  return <>{children}</>
}

function LoginRoute() {
  const navigate = useNavigate()
  return <Login onLoginSuccess={() => navigate('/booking', { replace: true })} />
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route
          path="/booking"
          element={
            <ProtectedRoute>
              <Booking />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/booking" replace />} />
      </Routes>
    </Router>
  )
}
