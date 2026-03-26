// ── Helpers ──
export const rnd  = (a, b) => Math.random() * (b - a) + a
export const rint = (a, b) => Math.round(rnd(a, b))

export const RISK_LABEL = { 0: 'BAJO', 1: 'MEDIO', 2: 'ALTO' }
export const RISK_NAMES = {
  rCalor:  'Riesgo por calor',
  rEstres: 'Estrés / ansiedad',
  rHR:     'Taquicardia',
  rCV:     'Sobrecarga cardiovascular',
  rGlobal: 'Riesgo global',
}

export const DEPT_LIST = ['Administrativo', 'Coordinadores', 'Docentes', 'Coordinadores Empresariales', 'Otros']
export const NAMES = [
  'Luis García','Pedro Martínez','Sofía Hernández','Diego Torres','Elena Castillo',
  'Marcos Romero','Isabela Vargas','Andrés Moreno','Valentina Cruz','Felipe Reyes',
  'Camila Flores','Nicolás Jiménez','Laura Ruiz','Sebastián Navarro','Paula Ortiz',
]

export const LOCAL_USERS = {
  admin:   { password: 'admin123',  role: 'admin'  },
  worker1: { password: 'worker123', role: 'worker' },
  worker2: { password: 'worker123', role: 'worker' },
  worker3: { password: 'worker123', role: 'worker' },
  worker4: { password: 'worker123', role: 'worker' },
  worker5: { password: 'worker123', role: 'worker' },
}

export const WORKER_PROFILES = {
  worker1: { baseHR: 72, baseStress: 30, baseTemp: 28 },
  worker2: { baseHR: 80, baseStress: 55, baseTemp: 31 },
  worker3: { baseHR: 88, baseStress: 70, baseTemp: 33 },
  worker4: { baseHR: 65, baseStress: 25, baseTemp: 26 },
  worker5: { baseHR: 75, baseStress: 40, baseTemp: 29 },
}

export function simulateLive(profile) {
  const t       = parseFloat((profile.baseTemp + rnd(-1, 1.5)).toFixed(1))
  const hum     = rint(50, 85)
  const stress  = Math.min(100, Math.max(0, profile.baseStress + rnd(-8, 8)))
  const fat     = Math.min(100, Math.max(0, stress * 0.8 + rnd(-10, 10)))
  const hr      = Math.round(profile.baseHR + stress * 0.2 + Math.max(0, t - 30) * 0.5 + rnd(-5, 5))
  const hi      = parseFloat((t + 0.33 * (hum / 100 * 6.105 * Math.exp(17.27 * t / (t + 237.3)) - 1.0)).toFixed(1))
  const rCalor  = t > 32 ? 2 : t > 29 ? 1 : 0
  const rEstres = stress > 70 ? 2 : stress > 50 ? 1 : 0
  const rHR     = hr > 110 ? 2 : hr > 95 ? 1 : 0
  const rCV     = (hr > 100 && stress > 60) ? 2 : hr > 90 ? 1 : 0
  const rGlobal = Math.max(rCalor, rEstres, rHR, rCV)
  return { temp: t, hum, stress: parseFloat(stress.toFixed(1)), fatigue: parseFloat(fat.toFixed(1)), hr, hi, rCalor, rEstres, rHR, rCV, rGlobal }
}

export function buildAdminWorkers() {
  const profiles = [
    // Estables (10)
    { baseHR: rint(60,72), baseStress: rint(10,30), baseTemp: rnd(24,28) },
    { baseHR: rint(62,74), baseStress: rint(12,28), baseTemp: rnd(24,27) },
    { baseHR: rint(63,73), baseStress: rint(8,25),  baseTemp: rnd(25,28) },
    { baseHR: rint(60,70), baseStress: rint(10,30), baseTemp: rnd(24,27) },
    { baseHR: rint(65,75), baseStress: rint(15,32), baseTemp: rnd(25,28) },
    { baseHR: rint(62,72), baseStress: rint(10,28), baseTemp: rnd(24,27) },
    { baseHR: rint(64,74), baseStress: rint(12,30), baseTemp: rnd(24,28) },
    { baseHR: rint(60,70), baseStress: rint(8,26),  baseTemp: rnd(23,27) },
    { baseHR: rint(63,73), baseStress: rint(10,30), baseTemp: rnd(24,27) },
    { baseHR: rint(61,71), baseStress: rint(12,28), baseTemp: rnd(24,27) },
    // Observación (3)
    { baseHR: rint(80,92), baseStress: rint(48,62), baseTemp: rnd(29,31) },
    { baseHR: rint(82,94), baseStress: rint(50,65), baseTemp: rnd(29,32) },
    { baseHR: rint(78,90), baseStress: rint(46,60), baseTemp: rnd(28,31) },
    // Alto riesgo (2)
    { baseHR: rint(100,118), baseStress: rint(74,90), baseTemp: rnd(33,36) },
    { baseHR: rint(102,120), baseStress: rint(76,92), baseTemp: rnd(33,37) },
  ]
  return NAMES.map((name, i) => {
    const p    = profiles[i]
    const dept = DEPT_LIST[i % DEPT_LIST.length]
    const data = simulateLive(p)
    return { id: `TRB-${String(i+1).padStart(2,'0')}`, name, dept, ...p, manualClass: null, manualMotivo: '', updatedBy: null, ...data }
  })
}

export function getWorkerClass(w) {
  if (w.manualClass) return w.manualClass
  return w.rGlobal === 2 ? 'MAYOR_RIESGO' : w.rGlobal === 1 ? 'OBSERVACION' : 'NORMAL'
}

export const CHART_DEFAULTS = {
  scales: {
    x: { ticks: { color: '#6e7681', font: { size: 10 }, maxTicksLimit: 8 }, grid: { color: 'rgba(255,255,255,.04)' }, border: { color: '#30363d' } },
    y: { ticks: { color: '#6e7681', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,.06)' }, border: { color: '#30363d' } },
  },
  plugins: { legend: { labels: { color: '#8b949e', font: { size: 11 }, boxWidth: 10, boxHeight: 10, padding: 12 } } },
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 300 },
}
