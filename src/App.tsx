import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from '@/pages/Login'
import Booking from '@/pages/Booking'
import AutoGrab from '@/pages/AutoGrab'
import { useStore } from '@/store/useStore'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/booking"
          element={
            <ProtectedRoute>
              <Booking />
            </ProtectedRoute>
          }
        />
        <Route
          path="/auto-grab"
          element={
            <ProtectedRoute>
              <AutoGrab />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/booking" replace />} />
      </Routes>
    </Router>
  )
}
