import { useEffect, useState } from 'react'
import { Doughnut, Bar } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'
import { simulateLive, getWorkerClass, CHART_DEFAULTS } from '../../utils/simulation'
import { MetricCard, StatusBar, SectionTitle, PageHeader, Alert } from '../../components/UI'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

export default function AdminDashboard({ workers, onRefresh }) {
  const [timestamp, setTimestamp] = useState('—')

  useEffect(() => {
    const tick = () => {
      onRefresh()
      setTimestamp(new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    tick()
    const id = setInterval(tick, 6000)
    return () => clearInterval(id)
  }, [])

  const counts = { low: 0, med: 0, high: 0 }
  workers.forEach(w => {
    const c = getWorkerClass(w)
    if (c === 'MAYOR_RIESGO') counts.high++
    else if (c === 'OBSERVACION') counts.med++
    else counts.low++
  })

  const avgHR   = workers.length ? Math.round(workers.reduce((s, w) => s + w.hr, 0) / workers.length) : 0
  const avgSt   = workers.length ? Math.round(workers.reduce((s, w) => s + w.stress, 0) / workers.length) : 0
  const avgTmp  = workers.length ? parseFloat((workers.reduce((s, w) => s + w.temp, 0) / workers.length).toFixed(1)) : 0
  const avgFat  = workers.length ? Math.round(workers.reduce((s, w) => s + w.fatigue, 0) / workers.length) : 0

  const high = workers.filter(w => getWorkerClass(w) === 'MAYOR_RIESGO')
  const med  = workers.filter(w => getWorkerClass(w) === 'OBSERVACION')

  const doughnutOpts = { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'right', labels: { color: '#8b949e', font: { size: 11 }, boxWidth: 10, boxHeight: 10, padding: 12 } } } }
  const barOpts = { ...CHART_DEFAULTS, plugins: { legend: { display: false } } }

  return (
    <div>
      <PageHeader title="Dashboard general" subtitle="Vista ejecutiva del estado de salud ocupacional" />
      <StatusBar label="DATOS EN VIVO · 15 trabajadores monitoreados" timestamp={timestamp} />

      <div className="grid-4" style={{ marginBottom: '1.25rem' }}>
        <MetricCard label="Estables"      value={counts.low}  sub="trabajadores normales"    color="ok" />
        <MetricCard label="En observación" value={counts.med}  sub="requieren seguimiento"   color="warn" />
        <MetricCard label="Alto riesgo"   value={counts.high} sub="acción inmediata"          color="danger" />
        <MetricCard label="Total activos" value={15}          sub="en planta hoy"             color="accent" />
      </div>

      <div className="grid-2" style={{ marginBottom: '1.25rem' }}>
        <div className="card">
          <SectionTitle>Distribución de riesgo global</SectionTitle>
          <div className="chart-wrap">
            <Doughnut data={{
              labels: ['Estables', 'Observación', 'Alto riesgo'],
              datasets: [{ data: [counts.low, counts.med, counts.high], backgroundColor: ['#3fb950','#d29922','#f85149'], borderColor: ['#161b22','#161b22','#161b22'], borderWidth: 2 }]
            }} options={doughnutOpts} />
          </div>
        </div>
        <div className="card">
          <SectionTitle>Promedio de métricas vitales</SectionTitle>
          <div className="chart-wrap">
            <Bar data={{
              labels: ['Ritmo cardíaco', 'Estrés', 'Temperatura×3', 'Fatiga'],
              datasets: [{ data: [avgHR, avgSt, parseFloat((avgTmp*3).toFixed(1)), avgFat], backgroundColor: ['rgba(0,212,170,.7)','rgba(248,81,73,.7)','rgba(0,150,255,.7)','rgba(210,153,34,.7)'], borderWidth: 1 }]
            }} options={barOpts} />
          </div>
        </div>
      </div>

      <div className="card">
        <SectionTitle>Alertas activas</SectionTitle>
        {!high.length && !med.length && <Alert type="ok">Sin alertas activas.</Alert>}
        {high.map(w => (
          <Alert key={w.id} type="danger">
            <div>
              <strong>{w.name}</strong> — {w.dept}<br/>
              <span style={{ fontSize: '.78rem' }}>HR {w.hr} lpm · Estrés {w.stress.toFixed(0)} · Temp {w.temp}°C</span>
            </div>
          </Alert>
        ))}
        {med.slice(0, 3).map(w => (
          <Alert key={w.id} type="warn">
            <div>
              <strong>{w.name}</strong> — {w.dept}<br/>
              <span style={{ fontSize: '.78rem' }}>HR {w.hr} lpm · Estrés {w.stress.toFixed(0)} · Temp {w.temp}°C</span>
            </div>
          </Alert>
        ))}
      </div>
    </div>
  )
}
