import { useState, useEffect } from 'react'
import { getWorkerClass } from '../../utils/simulation'
import { PageHeader, RiskBadge } from '../../components/UI'

const FILTER_TABS = [
  { key: 'all',  label: 'Todos' },
  { key: 'low',  label: 'Estables' },
  { key: 'med',  label: 'Observación' },
  { key: 'high', label: 'Alto riesgo' },
]

function ClassifyModal({ worker, onSave, onClose, adminUsername }) {
  const [clasif, setClasif] = useState(worker.manualClass || getWorkerClass(worker))
  const [motivo, setMotivo] = useState(worker.manualMotivo || '')
  function save() { onSave(worker.id, clasif, motivo, adminUsername); onClose() }
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h3>Clasificar: {worker.name}</h3>
        <div className="field">
          <label>Clasificación</label>
          <select className="select-field" value={clasif} onChange={e => setClasif(e.target.value)}>
            <option value="NORMAL">Normal — Sin riesgo significativo</option>
            <option value="OBSERVACION">Observación — Seguimiento recomendado</option>
            <option value="MAYOR_RIESGO">Mayor riesgo — Acción inmediata</option>
          </select>
        </div>
        <div className="field">
          <label>Motivo / Nota clínica</label>
          <textarea className="textarea-field" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Describe el motivo de la clasificación…" />
        </div>
        <div className="modal-actions">
          <button onClick={onClose}>Cancelar</button>
          <button className="primary" onClick={save}>Guardar</button>
        </div>
      </div>
    </div>
  )
}

function WorkerRow({ w, onClassify, adminUsername }) {
  const [expanded, setExpanded] = useState(false)
  const [modal, setModal] = useState(false)
  const cls = getWorkerClass(w)
  const src = w.manualClass ? 'MANUAL' : 'MODELO'
  const borderColor = cls === 'MAYOR_RIESGO' ? 'var(--danger)' : cls === 'OBSERVACION' ? 'var(--warn)' : 'var(--ok)'

  return (
    <>
      <div
        style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'.7rem 1rem', borderBottom:'1px solid var(--border)', borderLeft:`3px solid ${borderColor}`, cursor:'pointer', transition:'background .15s' }}
        onClick={() => setExpanded(e => !e)}
        onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,.03)'}
        onMouseLeave={e => e.currentTarget.style.background='transparent'}
      >
        <div style={{ display:'flex', alignItems:'center', gap:'1rem', flex:1, minWidth:0 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ width:14, height:14, color:'var(--text3)', flexShrink:0, transition:'transform .2s', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          <div style={{ minWidth:0 }}>
            <div style={{ fontWeight:500, fontSize:'.9rem', color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{w.name}</div>
            <div style={{ fontSize:'.73rem', color:'var(--text2)', marginTop:1 }}>{w.id} · {w.dept}</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'.75rem', flexShrink:0 }}>
          <RiskBadge level={cls} />
        </div>
      </div>

      {expanded && (
        <div style={{ background:'var(--bg3)', borderBottom:'1px solid var(--border)', borderLeft:`3px solid ${borderColor}`, padding:'1rem 1.25rem' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(120px, 1fr))', gap:'.6rem', marginBottom:'1rem' }}>
            {[
              { lbl:'Ritmo cardíaco', val:`${w.hr} lpm`,               col:'var(--accent)' },
              { lbl:'Estrés',         val:`${w.stress.toFixed(0)}/100`, col: w.stress>70?'var(--danger)':w.stress>50?'var(--warn)':'var(--ok)' },
              { lbl:'Fatiga',         val:`${w.fatigue.toFixed(0)}/100`,col:'var(--text)' },
              { lbl:'Temperatura',    val:`${w.temp} °C`,               col:'var(--accent2)' },
              { lbl:'Humedad',        val:`${w.hum} %`,                 col:'var(--text)' },
              { lbl:'Índ. calor',     val:`${w.hi} °C`,                 col:'var(--accent3)' },
            ].map(item => (
              <div key={item.lbl} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'.6rem .75rem' }}>
                <div style={{ fontSize:'.68rem', color:'var(--text2)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:3 }}>{item.lbl}</div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:'1rem', fontWeight:700, color:item.col }}>{item.val}</div>
              </div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:'.4rem', marginBottom:'1rem' }}>
            {[
              { lbl:'Riesgo calor',    v:w.rCalor  },
              { lbl:'Estrés/ansiedad', v:w.rEstres },
              { lbl:'Taquicardia',     v:w.rHR     },
              { lbl:'Sobrecarga CV',   v:w.rCV     },
              { lbl:'Riesgo global',   v:w.rGlobal },
            ].map(r => {
              const lv  = r.v===0?'BAJO':r.v===1?'MEDIO':'ALTO'
              const col = r.v===0?'var(--ok)':r.v===1?'var(--warn)':'var(--danger)'
              const pct = r.v===0?25:r.v===1?60:95
              return (
                <div key={r.lbl}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
                    <span style={{ fontSize:'.75rem', color:'var(--text2)' }}>{r.lbl}</span>
                    <span className={`risk-badge ${lv}`} style={{ fontSize:'.68rem' }}>{lv}</span>
                  </div>
                  <div style={{ background:'var(--bg)', borderRadius:4, height:3, overflow:'hidden' }}>
                    <div style={{ width:`${pct}%`, height:'100%', background:col, transition:'width .5s' }}/>
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'.5rem' }}>
            <span style={{ fontSize:'.72rem', color:'var(--text3)' }}>
              Fuente: {src}{w.manualClass?` · por ${w.updatedBy}`:''}
              {w.manualMotivo?` — "${w.manualMotivo}"`:''}
            </span>
            <div style={{ display:'flex', gap:'.5rem' }}>
              {w.manualClass && (
                <button className="btn-sm" onClick={e => { e.stopPropagation(); onClassify(w.id, null, '', null) }}>
                  Quitar manual
                </button>
              )}
              <button className="btn-sm" style={{ borderColor:'var(--accent)', color:'var(--accent)' }}
                onClick={e => { e.stopPropagation(); setModal(true) }}>
                Clasificar
              </button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <ClassifyModal worker={w} adminUsername={adminUsername} onSave={onClassify} onClose={() => setModal(false)} />
      )}
    </>
  )
}

export default function AdminWorkers({ workers, onClassify, onRefresh, adminUsername }) {
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const id = setInterval(onRefresh, 7000)
    return () => clearInterval(id)
  }, [])

  const counts = { low:0, med:0, high:0 }
  workers.forEach(w => {
    const c = getWorkerClass(w)
    if (c==='MAYOR_RIESGO') counts.high++
    else if (c==='OBSERVACION') counts.med++
    else counts.low++
  })

  const filtered = workers.filter(w => {
    const c = getWorkerClass(w)
    if (filter==='low')  return c==='NORMAL'
    if (filter==='med')  return c==='OBSERVACION'
    if (filter==='high') return c==='MAYOR_RIESGO'
    return true
  })

  return (
    <div>
      <PageHeader title="Gestión de trabajadores" subtitle="Haz clic en un trabajador para ver sus datos completos" />

      <div className="tabs">
        {FILTER_TABS.map(t => {
          const label = t.key==='all'?`Todos (${workers.length})`:t.key==='low'?`Estables (${counts.low})`:t.key==='med'?`Observación (${counts.med})`:`Alto riesgo (${counts.high})`
          return <button key={t.key} className={`tab-btn ${filter===t.key?'active':''}`} onClick={() => setFilter(t.key)}>{label}</button>
        })}
      </div>

      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <div style={{ display:'flex', justifyContent:'space-between', padding:'.5rem 1rem .5rem 2.5rem', background:'var(--bg3)', borderBottom:'1px solid var(--border)' }}>
          <span style={{ fontSize:'.7rem', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.06em' }}>Trabajador</span>
          <span style={{ fontSize:'.7rem', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.06em' }}>Estado</span>
        </div>
        {filtered.length===0 && (
          <div style={{ padding:'2rem', textAlign:'center', color:'var(--text2)' }}>Sin trabajadores en esta categoría.</div>
        )}
        {filtered.map(w => (
          <WorkerRow key={w.id} w={w} onClassify={onClassify} adminUsername={adminUsername} />
        ))}
      </div>
    </div>
  )
}
