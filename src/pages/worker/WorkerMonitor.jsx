import { useState, useEffect, useRef } from 'react'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Legend, Tooltip } from 'chart.js'
import { simulateLive, WORKER_PROFILES, RISK_LABEL, RISK_NAMES, CHART_DEFAULTS } from '../../utils/simulation'
import { apiWorkerLive } from '../../utils/api'
import { useApp } from '../../store/AppContext'
import { MetricCard, StatusBar, SectionTitle, PageHeader } from '../../components/UI'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Legend, Tooltip)

const MAX_PTS = 20

export default function WorkerMonitor({ username }) {
  const { auth } = useApp()
  const [reading, setReading]       = useState(null)
  const [timestamp, setTimestamp]   = useState('—')
  const [sensorSource, setSrc]      = useState('—')
  const hrH = useRef([]), stH = useRef([]), fatH = useRef([])
  const tempH = useRef([]), hiH = useRef([]), lblH = useRef([])
  const [tick, setTick] = useState(0)

  function push(arr, val) {
    if (arr.current.length >= MAX_PTS) arr.current.shift()
    arr.current.push(val)
  }

  async function fetchLive() {
    let d = null

    // Intenta obtener datos reales del backend (que ya integra el sensor IoT)
    try {
      const res = await apiWorkerLive(auth.token)
      if (res.ok && res.lectura) {
        const l = res.lectura
        const r = res.riesgos
        d = {
          temp:    l.temperatura_ambiental_c,
          hum:     l.humedad_relativa_pct,
          hi:      l.indice_calor_c,
          hr:      l.ritmo_cardiaco_lpm,
          stress:  l.nivel_estres_0_100,
          fatigue: l.nivel_fatiga_0_100,
          rCalor:  r.riesgo_calor,
          rEstres: r.riesgo_estres_ansiedad,
          rHR:     r.riesgo_taquicardia,
          rCV:     r.riesgo_sobrecarga_cardiovascular,
          rGlobal: r.riesgo_global,
        }
        setSrc(l.fuente_sensor === 'SENSOR_REAL' ? 'Sensor IoT' : 'Simulación')
      }
    } catch (e) {
      console.warn('API no disponible, usando simulación local:', e)
    }

    // Fallback a simulación local si el backend no responde
    if (!d) {
      const profile = WORKER_PROFILES[username] || { baseHR: 75, baseStress: 40, baseTemp: 29 }
      d = simulateLive(profile)
      setSrc('Simulación local')
    }

    const ts = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setTimestamp(ts)
    setReading(d)
    push(lblH, ts)
    push(hrH,  d.hr)
    push(stH,  Math.round(d.stress))
    push(fatH, Math.round(d.fatigue))
    push(tempH, d.temp)
    push(hiH,  d.hi)
    setTick(t => t + 1)
  }

  useEffect(() => {
    fetchLive()
    const id = setInterval(fetchLive, 5000)
    return () => clearInterval(id)
  }, [username])

  const labels = [...lblH.current]
  const stressColor = !reading ? '' : reading.stress > 70 ? 'danger' : reading.stress > 50 ? 'warn' : 'ok'
  const lineOpts = (yMin, yMax) => ({
    ...CHART_DEFAULTS,
    scales: { ...CHART_DEFAULTS.scales, y: { ...CHART_DEFAULTS.scales.y, min: yMin, max: yMax } },
  })

  return (
    <div>
      <PageHeader title={`Hola, ${username} — Monitor en tiempo real`} subtitle="Lecturas biométricas y ambientales actualizadas cada 5 segundos" />

      <div className="status-bar">
        <div className="status-live"/>
        <span>EN VIVO · cada 5s</span>
        <span style={{ marginLeft: '.75rem', fontSize: '.72rem', padding: '.1rem .5rem', borderRadius: 20,
          background: sensorSource === 'Sensor IoT' ? 'rgba(63,185,80,.15)' : 'rgba(210,153,34,.12)',
          color: sensorSource === 'Sensor IoT' ? 'var(--ok)' : 'var(--warn)',
          border: sensorSource === 'Sensor IoT' ? '1px solid rgba(63,185,80,.3)' : '1px solid rgba(210,153,34,.3)' }}>
          {sensorSource}
        </span>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '.78rem' }}>{timestamp}</span>
      </div>

      <div className="grid-4" style={{ marginBottom: '1rem' }}>
        <MetricCard label="Ritmo cardíaco" value={reading?.hr ?? '—'}              sub="lpm"  color="accent" />
        <MetricCard label="Temperatura"    value={reading?.temp ?? '—'}            sub="°C"   color="blue" />
        <MetricCard label="Humedad"        value={reading?.hum ?? '—'}             sub="%"    color="warn" />
        <MetricCard label="Estrés"         value={reading ? reading.stress.toFixed(0) : '—'} sub="/ 100" color={stressColor} />
      </div>

      <div className="worker-chart-grid">
        <div className="card">
          <SectionTitle>Ritmo cardíaco (lpm)</SectionTitle>
          <div className="chart-wrap">
            <Line key={`hr-${tick}`} data={{ labels, datasets: [{ label: 'HR lpm', data: [...hrH.current], borderColor: '#00d4aa', backgroundColor: 'rgba(0,212,170,.08)', tension: .4, pointRadius: 2, fill: false }] }}
              options={{ ...lineOpts(40, 160), plugins: { legend: { display: false } } }} />
          </div>
        </div>
        <div className="card">
          <SectionTitle>Estrés &amp; Fatiga</SectionTitle>
          <div className="chart-wrap">
            <Line key={`sf-${tick}`} data={{ labels, datasets: [
              { label: 'Estrés', data: [...stH.current],  borderColor: '#f85149', tension: .4, pointRadius: 2, fill: false },
              { label: 'Fatiga', data: [...fatH.current], borderColor: '#d29922', tension: .4, pointRadius: 2, fill: false },
            ]}} options={lineOpts(0, 100)} />
          </div>
        </div>
      </div>

      <div className="worker-chart-grid">
        <div className="card">
          <SectionTitle>Temperatura &amp; Índice de calor (°C)</SectionTitle>
          <div className="chart-wrap">
            <Line key={`tmp-${tick}`} data={{ labels, datasets: [
              { label: 'Temperatura', data: [...tempH.current], borderColor: '#0096ff', tension: .4, pointRadius: 2, fill: false },
              { label: 'Índ. calor',  data: [...hiH.current],   borderColor: '#ff6b35', tension: .4, pointRadius: 2, fill: false },
            ]}} options={lineOpts(20, 45)} />
          </div>
        </div>
        <div className="card">
          <SectionTitle>Evaluación de riesgos</SectionTitle>
          {reading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem', marginTop: '.25rem' }}>
              {Object.entries(RISK_NAMES).map(([k, name]) => {
                const v   = reading[k]
                const lv  = RISK_LABEL[v] || 'BAJO'
                const pct = v === 0 ? 25 : v === 1 ? 60 : 95
                const col = v === 0 ? 'var(--ok)' : v === 1 ? 'var(--warn)' : 'var(--danger)'
                return (
                  <div key={k}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: '.82rem', color: 'var(--text2)' }}>{name}</span>
                      <span className={`risk-badge ${lv}`}>{lv}</span>
                    </div>
                    <div style={{ background: 'var(--bg3)', borderRadius: 4, height: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: col, borderRadius: 4, transition: 'width .5s' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
