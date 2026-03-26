// URL del backend — cambia esto por tu URL de Render o Azure
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function apiLogin(username, password) {
  const res  = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  return res.json()
}

export async function apiRegister(username, password) {
  const res = await fetch(`${API_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  return res.json()
}

// ── Sensor IoT ────────────────────────────────────────────────────────────────
export async function apiSensorLatest(token) {
  try {
    const res = await fetch(`${API_URL}/api/v1/sensor/latest`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return res.json()
  } catch {
    return { ok: false }
  }
}

export async function apiSensorHistory(token, limit = 20) {
  try {
    const res = await fetch(`${API_URL}/api/v1/sensor/history?limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return res.json()
  } catch {
    return { ok: false, items: [] }
  }
}

// ── Worker ────────────────────────────────────────────────────────────────────
export async function apiWorkerLive(token) {
  try {
    const res = await fetch(`${API_URL}/api/v1/worker/live/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return res.json()
  } catch {
    return { ok: false }
  }
}

export async function apiCheckinStatus(token) {
  const res = await fetch(`${API_URL}/api/v1/symptoms/today/status`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

export async function apiSubmitCheckin(token, mood, symptoms, notes) {
  const res = await fetch(`${API_URL}/api/v1/symptoms/today`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ mood, symptoms, notes }),
  })
  return res.json()
}

export async function apiCheckinHistory(token) {
  const res = await fetch(`${API_URL}/api/v1/symptoms/history`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

// ── Admin ─────────────────────────────────────────────────────────────────────
export async function apiAdminWorkers(token) {
  try {
    const res = await fetch(`${API_URL}/api/v1/admin/live/workers`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return res.json()
  } catch {
    return { ok: false, items: [] }
  }
}

export async function apiAdminSensorLatest(token) {
  try {
    const res = await fetch(`${API_URL}/api/v1/admin/sensores/latest`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return res.json()
  } catch {
    return { ok: false }
  }
}

export async function apiClassifyWorker(token, workerId, clasificacion, motivo) {
  const res = await fetch(`${API_URL}/api/v1/admin/workers/${workerId}/classification`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ clasificacion_manual: clasificacion, motivo }),
  })
  return res.json()
}

export async function apiClearWorkerClassification(token, workerId) {
  const res = await fetch(`${API_URL}/api/v1/admin/workers/${workerId}/classification`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}
