import { useState } from 'react'
import { useApp } from '../store/AppContext'

export default function AuthPage() {
  const { login, register } = useApp()
  const [tab, setTab]       = useState('login')
  const [loginUser, setLU]  = useState('')
  const [loginPass, setLP]  = useState('')
  const [regUser, setRU]    = useState('')
  const [regPass, setRP]    = useState('')
  const [loginErr, setLE]   = useState('')
  const [regMsg, setRM]     = useState({ text: '', ok: false })
  const [loading, setLoading] = useState(false)

  async function doLogin() {
    setLE(''); setLoading(true)
    try { await login(loginUser.trim(), loginPass) }
    catch (e) { setLE(e.message) }
    finally { setLoading(false) }
  }

  async function doRegister() {
    setRM({ text: '', ok: false }); setLoading(true)
    try {
      await register(regUser.trim(), regPass)
      setRM({ text: 'Cuenta creada. Inicia sesión.', ok: true })
      setTimeout(() => setTab('login'), 1200)
    } catch (e) { setRM({ text: e.message, ok: false }) }
    finally { setLoading(false) }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="pulse">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/>
            </svg>
          </div>
          <div>
            <h1>SaludOcupacional</h1>
            <span>Sistema de Monitoreo</span>
          </div>
        </div>

        <div className="auth-tabs">
          <div className={`auth-tab ${tab==='login'?'active':''}`} onClick={() => setTab('login')}>Iniciar sesión</div>
          <div className={`auth-tab ${tab==='register'?'active':''}`} onClick={() => setTab('register')}>Registrarse</div>
        </div>

        {tab === 'login' ? (
          <div>
            <div className="field">
              <label>Usuario</label>
              <input value={loginUser} onChange={e => setLU(e.target.value)} placeholder="admin o worker1"
                onKeyDown={e => e.key==='Enter' && doLogin()} autoFocus disabled={loading}/>
            </div>
            <div className="field">
              <label>Contraseña</label>
              <input type="password" value={loginPass} onChange={e => setLP(e.target.value)} placeholder="••••••••"
                onKeyDown={e => e.key==='Enter' && doLogin()} disabled={loading}/>
            </div>
            <button className="btn" onClick={doLogin} disabled={loading}>
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
            <div className="err-msg">{loginErr}</div>
            <p className="info-msg">Demo: <strong>admin</strong>/admin123 · <strong>worker1–4</strong>/worker123</p>
          </div>
        ) : (
          <div>
            <div className="field">
              <label>Usuario</label>
              <input value={regUser} onChange={e => setRU(e.target.value)} placeholder="mínimo 3 caracteres" autoFocus disabled={loading}/>
            </div>
            <div className="field">
              <label>Contraseña</label>
              <input type="password" value={regPass} onChange={e => setRP(e.target.value)} placeholder="mínimo 6 caracteres"
                onKeyDown={e => e.key==='Enter' && doRegister()} disabled={loading}/>
            </div>
            <button className="btn" onClick={doRegister} disabled={loading}>
              {loading ? 'Creando…' : 'Crear cuenta'}
            </button>
            <div className="err-msg" style={regMsg.ok?{color:'var(--ok)'}:{}}>{regMsg.text}</div>
          </div>
        )}
      </div>
    </div>
  )
}
