import { useState, useCallback } from 'react'
import { useApp } from './store/AppContext'
import { buildAdminWorkers, simulateLive } from './utils/simulation'
import { Topbar, NavItem, Icons } from './components/UI'
import AuthPage from './pages/AuthPage'
import WorkerMonitor from './pages/worker/WorkerMonitor'
import { WorkerCheckin, WorkerHistory } from './pages/worker/WorkerCheckin'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminWorkers from './pages/admin/AdminWorkers'
import { AdminAlerts, AdminTrends } from './pages/admin/AdminAlertsTrends'

const WORKER_NAV = [
  { id: 'w-monitor', label: 'Monitor en vivo',  icon: Icons.monitor  },
  { id: 'w-checkin', label: 'Check-in diario',  icon: Icons.checkin  },
  { id: 'w-history', label: 'Historial',         icon: Icons.history  },
]
const ADMIN_NAV = [
  { id: 'a-dashboard', label: 'Dashboard',     icon: Icons.dashboard },
  { id: 'a-workers',   label: 'Trabajadores',  icon: Icons.workers   },
  { id: 'a-alerts',    label: 'Alertas',        icon: Icons.alerts    },
  { id: 'a-trends',    label: 'Tendencias',     icon: Icons.trends    },
]

export default function App() {
  const { auth, logout } = useApp()
  const [section, setSection]       = useState(null)
  const [sidebarOpen, setSidebar]   = useState(false)
  const [adminWorkers, setWorkers]  = useState(() => buildAdminWorkers())

  // Set default section on login
  const activeSection = section ?? (auth.role === 'admin' ? 'a-dashboard' : 'w-monitor')

  function navigate(sec) {
    setSection(sec)
    setSidebar(false)
  }

  const refreshWorkers = useCallback(() => {
    setWorkers(prev => prev.map(w => ({ ...w, ...simulateLive(w) })))
  }, [])

  function classifyWorker(id, clasif, motivo, updatedBy) {
    setWorkers(prev => prev.map(w => w.id === id ? { ...w, manualClass: clasif, manualMotivo: motivo, updatedBy } : w))
  }

  if (!auth.token) return <AuthPage />

  const nav = auth.role === 'admin' ? ADMIN_NAV : WORKER_NAV

  return (
    <div className="app-page">
      <Topbar username={auth.username} role={auth.role} onLogout={logout} onHamburger={() => setSidebar(o => !o)} />

      <div className="app-body">
        {/* Overlay for mobile sidebar */}
        {sidebarOpen && <div className="sidebar-overlay open" onClick={() => setSidebar(false)} />}

        <nav className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-label">{auth.role === 'admin' ? 'Panel administrador' : 'Panel trabajador'}</div>
          {nav.map(item => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeSection === item.id}
              onClick={() => navigate(item.id)}
            />
          ))}
        </nav>

        <main className="main-content">
          {/* ── Worker pages ── */}
          {activeSection === 'w-monitor' && <WorkerMonitor username={auth.username} />}
          {activeSection === 'w-checkin' && <WorkerCheckin username={auth.username} />}
          {activeSection === 'w-history' && <WorkerHistory username={auth.username} />}

          {/* ── Admin pages ── */}
          {activeSection === 'a-dashboard' && <AdminDashboard workers={adminWorkers} onRefresh={refreshWorkers} />}
          {activeSection === 'a-workers'   && <AdminWorkers   workers={adminWorkers} onRefresh={refreshWorkers} onClassify={classifyWorker} adminUsername={auth.username} />}
          {activeSection === 'a-alerts'    && <AdminAlerts    workers={adminWorkers} onRefresh={refreshWorkers} onClassify={classifyWorker} adminUsername={auth.username} />}
          {activeSection === 'a-trends'    && <AdminTrends    workers={adminWorkers} />}
        </main>
      </div>
    </div>
  )
}
