import { createContext, useContext, useState } from 'react'
import { apiLogin, apiRegister } from '../utils/api'

const AppCtx = createContext(null)

export function AppProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    try {
      const saved = sessionStorage.getItem('auth')
      return saved ? JSON.parse(saved) : { token: null, role: null, username: null }
    } catch {
      return { token: null, role: null, username: null }
    }
  })

  async function login(username, password) {
    const data = await apiLogin(username, password)
    if (!data.ok) throw new Error(data.message || 'Credenciales inválidas.')
    const session = { token: data.token, role: data.role, username }
    setAuth(session)
    sessionStorage.setItem('auth', JSON.stringify(session))
  }

  async function register(username, password) {
    const data = await apiRegister(username, password)
    if (!data.ok) throw new Error(data.message || 'Error al registrar.')
  }

  function logout() {
    setAuth({ token: null, role: null, username: null })
    sessionStorage.removeItem('auth')
  }

  return (
    <AppCtx.Provider value={{ auth, login, register, logout }}>
      {children}
    </AppCtx.Provider>
  )
}

export const useApp = () => useContext(AppCtx)
