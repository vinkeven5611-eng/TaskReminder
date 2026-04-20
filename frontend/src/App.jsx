import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import { useState, useEffect } from 'react'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('taskflow_token')
    if (token) {
      setIsAuthenticated(true)
    }
    setLoading(false)
  }, [])

  if (loading) return <div>Loading...</div>

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          isAuthenticated ? <Navigate to="/dashboard" /> : <Auth setAuth={setIsAuthenticated} />
        } />
        <Route path="/dashboard" element={
          isAuthenticated ? <Dashboard setAuth={setIsAuthenticated} /> : <Navigate to="/" />
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
