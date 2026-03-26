import { useEffect, useState } from 'react'
import { Line, Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend } from 'chart.js'
import { getWorkerClass, DEPT_LIST, CHART_DEFAULTS, rint, rnd } from '../../utils/simulation'
import { PageHeader, SectionTitle, Alert, RiskBadge } from '../../components/UI'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend)

// ── Admin Alerts ──
export function AdminAlerts({ workers, onRefresh, onClassify, adminUsername }) {
  const [modal, setModal] = useState(null)

  useEffect(() => {
    const id = setInterval(onRefresh, 7000)
    return () => clearInterval(id)
  }, [])

  const high = workers.filter(w => getWorkerClass(w) === 'MAYOR_RIESGO')
  const med  = workers.filter(w => getWorkerClass(w) === 'OBSERVACION')

  return (
    <div>
      <PageHeader title="Centro de alertas" subtitle="Trabajadores que requieren atención inmediata o seguimiento" />

      {!high.length && !med.length && <Alert type="ok">Sin alertas activas en este momento.</Alert>}

      {high.length > 0 && (
        <>
          <div className="section-title" style={{ color: 'var(--danger)' }}>Alto riesgo — Acción inmediata ({high.length})</div>
          {high.map(w => (
            <div key={w.id} className="card" style={{ borderLeft: '3px solid var(--danger)', marginBottom: '.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '.5rem' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{w.name}</div>
                  <div style={{ fontSize: '.78rem', color: 'var(--text2)' }}>{w.id} · {w.dept}</div>
                </div>
                <RiskBadge level="ALTO" />
              </div>
              <div className="grid-4" style={{ marginTop: '.75rem' }}>
                {[['Ritmo cardíaco', w.hr, 'lpm', 'var(--danger)'],['Estrés', w.stress.toFixed(0), '/100', 'var(--danger)'],['Temperatura', `${w.temp}°C`, '', 'var(--warn)'],['Fatiga', w.fatigue.toFixed(0), '/100', 'var(--danger)']].map(([lbl, val, unit, col]) => (
                  <div key={lbl} className="card-sm">
                    <div style={{ fontSize: '.7rem', color: 'var(--text2)' }}>{lbl}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', color: col }}>{val}<span style={{ fontSize: '.7rem' }}>{unit}</span></div>
                  </div>
                ))}
              </div>
              <button className="btn-danger" style={{ marginTop: '.75rem' }} onClick={() => setModal(w)}>Clasificar manualmente</button>
            </div>
          ))}
        </>
      )}

      {med.length > 0 && (
        <>
          <div className="section-title" style={{ color: 'var(--warn)', marginTop: '1rem' }}>En observación ({med.length})</div>
          {med.map(w => (
            <div key={w.id} className="card" style={{ borderLeft: '3px solid var(--warn)', marginBottom: '.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.5rem' }}>
                <div><span style={{ fontWeight: 500 }}>{w.name}</span> <span style={{ fontSize: '.78rem', color: 'var(--text2)' }}>· {w.dept}</span></div>
                <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '.78rem', color: 'var(--text2)' }}>HR {w.hr} · Estrés {w.stress.toFixed(0)}</span>
                  <button className="btn-sm" onClick={() => setModal(w)}>Clasificar</button>
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {modal && <QuickModal worker={modal} adminUsername={adminUsername} onSave={onClassify} onClose={() => setModal(null)} />}
    </div>
  )
}

function QuickModal({ worker, adminUsername, onSave, onClose }) {
  const [clasif, setClasif] = useState(worker.manualClass || getWorkerClass(worker))
  const [motivo, setMotivo] = useState(worker.manualMotivo || '')
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h3>Clasificar: {worker.name}</h3>
        <div className="field">
          <label>Clasificación</label>
          <select className="select-field" value={clasif} onChange={e => setClasif(e.target.value)}>
            <option value="NORMAL">Normal</option>
            <option value="OBSERVACION">Observación</option>
            <option value="MAYOR_RIESGO">Mayor riesgo</option>
          </select>
        </div>
        <div className="field">
          <label>Motivo</label>
          <textarea className="textarea-field" value={motivo} onChange={e => setMotivo(e.target.value)} />
        </div>
        <div className="modal-actions">
          <button onClick={onClose}>Cancelar</button>
          <button className="primary" onClick={() => { onSave(worker.id, clasif, motivo, adminUsername); onClose() }}>Guardar</button>
        </div>
      </div>
    </div>
  )
}

// ── Admin Trends ──
export function AdminTrends({ workers }) {
  const depts = {}
  workers.forEach(w => {
    if (!depts[w.dept]) depts[w.dept] = { sum: 0, n: 0 }
    depts[w.dept].sum += w.stress; depts[w.dept].n++
  })
  const deptLabels = Object.keys(depts)
  const deptVals   = deptLabels.map(d => parseFloat((depts[d].sum / depts[d].n).toFixed(1)))
  const deptColors = deptVals.map(v => v > 70 ? 'rgba(248,81,73,.7)' : v > 50 ? 'rgba(210,153,34,.7)' : 'rgba(63,185,80,.7)')

  const hrBuckets  = [0,0,0,0,0,0]
  const hrRanges   = ['<60','60-70','71-80','81-90','91-100','>100']
  workers.forEach(w => {
    if (w.hr < 60) hrBuckets[0]++
    else if (w.hr <= 70) hrBuckets[1]++
    else if (w.hr <= 80) hrBuckets[2]++
    else if (w.hr <= 90) hrBuckets[3]++
    else if (w.hr <= 100) hrBuckets[4]++
    else hrBuckets[5]++
  })

  const hours   = Array.from({ length: 12 }, (_, i) => { const h = new Date(); h.setHours(h.getHours() - 11 + i); return h.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) })
  const highTL  = hours.map(() => rint(2, 7))
  const medTL   = hours.map(() => rint(4, 9))
  const lowTL   = hours.map((_, i) => 20 - highTL[i] - medTL[i])

  const barOpts = { ...CHART_DEFAULTS, plugins: { legend: { display: false } } }

  return (
    <div>
      <PageHeader title="Tendencias y análisis" subtitle="Evolución de indicadores de salud en el tiempo" />

      <div className="grid-2" style={{ marginBottom: '1rem' }}>
        <div className="card">
          <SectionTitle>Estrés promedio por departamento</SectionTitle>
          <div className="chart-wrap tall">
            <Bar data={{ labels: deptLabels, datasets: [{ data: deptVals, backgroundColor: deptColors, borderWidth: 1 }] }} options={barOpts} />
          </div>
        </div>
        <div className="card">
          <SectionTitle>Distribución de ritmo cardíaco (lpm)</SectionTitle>
          <div className="chart-wrap tall">
            <Bar data={{ labels: hrRanges, datasets: [{ data: hrBuckets, backgroundColor: 'rgba(0,150,255,.65)', borderWidth: 1 }] }} options={barOpts} />
          </div>
        </div>
      </div>

      <div className="card">
        <SectionTitle>Evolución de riesgos (últimas 12h)</SectionTitle>
        <div className="chart-wrap tall">
          <Line data={{
            labels: hours,
            datasets: [
              { label: 'Estables',    data: lowTL,  borderColor: '#3fb950', backgroundColor: 'rgba(63,185,80,.15)',  fill: true, tension: .4, pointRadius: 3 },
              { label: 'Observación', data: medTL,  borderColor: '#d29922', backgroundColor: 'rgba(210,153,34,.1)',  fill: true, tension: .4, pointRadius: 3 },
              { label: 'Alto riesgo', data: highTL, borderColor: '#f85149', backgroundColor: 'rgba(248,81,73,.1)',   fill: true, tension: .4, pointRadius: 3 },
            ]
          }} options={{ ...CHART_DEFAULTS, scales: { ...CHART_DEFAULTS.scales, y: { ...CHART_DEFAULTS.scales.y, min: 0, max: 20 } } }} />
        </div>
      </div>
    </div>
  )
}
