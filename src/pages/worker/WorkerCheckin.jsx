import { useState, useEffect } from 'react'
import { useApp } from '../../store/AppContext'
import { apiCheckinStatus, apiSubmitCheckin, apiCheckinHistory } from '../../utils/api'
import { PageHeader, SectionTitle } from '../../components/UI'

const MOODS    = ['Excelente', 'Bien', 'Regular', 'Mal', 'Muy mal']
const SYMPTOMS = ['Fatiga','Dolor de cabeza','Náuseas','Mareos','Dolor muscular','Taquicardia','Dificultad respiratoria','Estrés']

export function WorkerCheckin({ username }) {
  const { auth } = useApp()
  const [done, setDone]     = useState(null)
  const [mood, setMood]     = useState(null)
  const [symps, setSymps]   = useState(new Set())
  const [notes, setNotes]   = useState('')
  const [err, setErr]       = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    apiCheckinStatus(auth.token).then(d => setDone(d.submitted))
  }, [])

  function toggleSymp(s) {
    setSymps(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n })
  }

  async function submit() {
    if (!mood) { setErr('Selecciona cómo te sientes hoy.'); return }
    setLoading(true)
    try {
      const res = await apiSubmitCheckin(auth.token, mood, [...symps], notes)
      if (res.ok) setDone(true)
      else setErr(res.message)
    } catch { setErr('Error al enviar, intenta de nuevo.') }
    finally { setLoading(false) }
  }

  if (done === null) return <div style={{ padding: '2rem', color: 'var(--text2)' }}>Cargando…</div>

  if (done) return (
    <div>
      <PageHeader title="Check-in diario" />
      <div className="card" style={{ maxWidth: 560 }}>
        <div className="checkin-submitted">
          <div className="big">✓</div>
          <h3 style={{ color: 'var(--ok)', marginTop: '.5rem' }}>Check-in enviado</h3>
          <p>Ya registraste tu estado de salud hoy.<br/>Vuelve mañana.</p>
        </div>
      </div>
    </div>
  )

  return (
    <div>
      <PageHeader title="Check-in diario" subtitle="Reporta cómo te sientes hoy antes de comenzar tu jornada" />
      <div className="card" style={{ maxWidth: 560, width: '100%' }}>
        <SectionTitle>¿Cómo te sientes hoy?</SectionTitle>
        <div className="mood-grid">
          {MOODS.map(m => (
            <button key={m} className={`mood-btn ${mood===m?'selected':''}`} onClick={() => setMood(m)}>{m}</button>
          ))}
        </div>
        <div style={{ marginTop: '1.25rem' }}>
          <SectionTitle>Síntomas presentes (opcional)</SectionTitle>
          <div className="symptom-grid">
            {SYMPTOMS.map(s => (
              <button key={s} className={`symp-btn ${symps.has(s)?'selected':''}`} onClick={() => toggleSymp(s)}>{s}</button>
            ))}
          </div>
        </div>
        <div style={{ marginTop: '1.25rem' }}>
          <SectionTitle>Notas adicionales</SectionTitle>
          <textarea className="textarea-field" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Escribe cualquier observación..." />
        </div>
        <button className="btn" style={{ marginTop: '1.25rem', width: 'auto', padding: '.65rem 2rem' }} onClick={submit} disabled={loading}>
          {loading ? 'Enviando…' : 'Enviar check-in'}
        </button>
        <div className="err-msg">{err}</div>
      </div>
    </div>
  )
}

export function WorkerHistory({ username }) {
  const { auth } = useApp()
  const [items, setItems]   = useState(null)

  useEffect(() => {
    apiCheckinHistory(auth.token).then(d => setItems(d.ok ? d.items : []))
  }, [])

  return (
    <div>
      <PageHeader title="Historial de check-ins" subtitle="Registro de tus reportes diarios" />
      <div className="card">
        {items === null && <div style={{ color: 'var(--text2)', textAlign: 'center', padding: '2rem' }}>Cargando…</div>}
        {items !== null && items.length === 0 && <div style={{ color: 'var(--text2)', textAlign: 'center', padding: '2rem' }}>No hay registros todavía.</div>}
        {items?.map((it, i) => (
          <div key={i} style={{ borderBottom: i < items.length-1 ? '1px solid var(--border)' : 'none', padding: '.85rem 0', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{ minWidth: 90 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '.78rem', color: 'var(--text2)' }}>{it.date}</div>
              <div style={{ fontSize: '.78rem', color: 'var(--text3)' }}>{it.created_at}</div>
            </div>
            <div>
              <div style={{ fontWeight: 500, color: 'var(--text)' }}>{it.mood}</div>
              {it.symptoms?.length > 0 && <div style={{ fontSize: '.78rem', color: 'var(--text2)', marginTop: 2 }}>{it.symptoms.join(' · ')}</div>}
              {it.notes && <div style={{ fontSize: '.8rem', color: 'var(--text3)', marginTop: 4, fontStyle: 'italic' }}>"{it.notes}"</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
