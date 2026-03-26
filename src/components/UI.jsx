// ── Topbar ──
export function Topbar({ username, role, onLogout, onHamburger }) {
  return (
    <div className="topbar">
      <div className="topbar-left">
        <button className="hamburger" onClick={onHamburger} aria-label="Menú">
          <span/><span/><span/>
        </button>
        <div className="topbar-logo">
          <div className="dot"/>
          <span>SaludOcupacional</span>
        </div>
      </div>
      <div className="topbar-right">
        <span className={`badge-role ${role}`}>{role?.toUpperCase()}</span>
        <span className="topbar-user">{username}</span>
        <button className="logout-btn" onClick={onLogout}>Salir</button>
      </div>
    </div>
  )
}

// ── Nav Item ──
export function NavItem({ icon, label, active, onClick }) {
  return (
    <div className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      {icon}
      {label}
    </div>
  )
}

// ── Section title ──
export function SectionTitle({ children }) {
  return <div className="section-title">{children}</div>
}

// ── Page header ──
export function PageHeader({ title, subtitle }) {
  return (
    <div className="page-header">
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </div>
  )
}

// ── Metric card ──
export function MetricCard({ label, value, sub, color = '' }) {
  return (
    <div className={`metric-card ${color}`}>
      <div className="metric-label">{label}</div>
      <div className={`metric-val ${color}`}>{value}</div>
      <div className="metric-sub">{sub}</div>
    </div>
  )
}

// ── Status bar ──
export function StatusBar({ label, timestamp }) {
  return (
    <div className="status-bar">
      <div className="status-live"/>
      <span>{label}</span>
      <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '.78rem' }}>{timestamp}</span>
    </div>
  )
}

// ── Risk badge ──
export function RiskBadge({ level }) {
  return <span className={`risk-badge ${level}`}>{level?.replace('_', ' ')}</span>
}

// ── Alert ──
export function Alert({ type = 'ok', children }) {
  return <div className={`alert ${type}`}>{children}</div>
}

// ── Icons ──
export const Icons = {
  monitor: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  checkin: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
  history: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  dashboard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  workers: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
  alerts: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>,
  trends: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
}
