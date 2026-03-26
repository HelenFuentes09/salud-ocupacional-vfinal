import os, random, json
from datetime import datetime, date
from typing import List, Optional

import joblib
import pandas as pd
from fastapi import FastAPI, Depends, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text

from .deps import require_role
from .core.security import get_password_hash, verify_password, create_access_token
from .database import get_db

app = FastAPI(title="API Salud Ocupacional")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Usuarios ──────────────────────────────────────────────────────────────────
USERS = {
    "admin":   {"username": "admin",   "password_hash": get_password_hash("admin123"),  "role": "admin"},
    "worker1": {"username": "worker1", "password_hash": get_password_hash("worker123"), "role": "worker"},
    "worker2": {"username": "worker2", "password_hash": get_password_hash("worker123"), "role": "worker"},
    "worker3": {"username": "worker3", "password_hash": get_password_hash("worker123"), "role": "worker"},
    "worker4": {"username": "worker4", "password_hash": get_password_hash("worker123"), "role": "worker"},
    "worker5": {"username": "worker5", "password_hash": get_password_hash("worker123"), "role": "worker"},
}
CHECKINS = {}

# Mapeo login → worker_id real en lecturas_wearable
USER_TO_WORKER_ID = {
    "worker1": "trabajador-001",
    "worker2": "trabajador-002",
    "worker3": "trabajador-003",
    "worker4": "trabajador-004",
    "worker5": "trabajador-005",
}

# ── Modelo ML ─────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(__file__)
MODEL_CANDIDATES = [
    os.path.join(BASE_DIR, "..", "ml", "models", "modelo_riesgos_rf_multi.joblib"),
    os.path.join(BASE_DIR, "..", "..", "ml", "models", "modelo_riesgos_rf_multi.joblib"),
]
MODEL_PATH     = next((p for p in MODEL_CANDIDATES if os.path.exists(p)), None)
modelo_riesgos = None
if MODEL_PATH:
    try:
        modelo_riesgos = joblib.load(MODEL_PATH)
        print(f"✅ Modelo cargado: {MODEL_PATH}")
    except Exception as e:
        print(f"⚠️ No se pudo cargar el modelo: {e}")
else:
    print("⚠️ Modelo no encontrado — usando fallback.")

TARGETS = ["riesgo_calor","riesgo_estres_ansiedad","riesgo_taquicardia","riesgo_sobrecarga_cardiovascular","riesgo_global"]
LEVEL   = {0: "BAJO", 1: "MEDIO", 2: "ALTO"}
MANUAL_TO_MODEL = {"NORMAL": 0, "OBSERVACION": 1, "MAYOR_RIESGO": 2}
MODEL_TO_MANUAL = {0: "NORMAL", 1: "OBSERVACION", 2: "MAYOR_RIESGO"}

# ── Helpers ───────────────────────────────────────────────────────────────────
def heat_index_c(temp_c: float, rh: float) -> float:
    t_f  = temp_c * 9 / 5 + 32
    r    = rh
    hi_f = (-42.379 + 2.04901523*t_f + 10.14333127*r
            - 0.22475541*t_f*r - 6.83783e-3*t_f**2
            - 5.481717e-2*r**2 + 1.22874e-3*t_f**2*r
            + 8.5282e-4*t_f*r*r - 1.99e-6*t_f**2*r**2)
    if t_f < 80 or r < 40:
        hi_f = t_f
    return round((hi_f - 32) * 5 / 9, 2)

def predecir_riesgos(features: dict) -> dict:
    fallback = {k: 0 for k in ["riesgo_calor","riesgo_estres_ansiedad","riesgo_taquicardia","riesgo_sobrecarga_cardiovascular","riesgo_global"]}
    for k in list(fallback): fallback[k + "_nivel"] = "BAJO"
    if modelo_riesgos is None:
        fallback["note"] = "Modelo no cargado"
        return fallback
    try:
        X    = pd.DataFrame([features])
        pred = modelo_riesgos.predict(X)[0]
        out  = {}
        for i, name in enumerate(TARGETS):
            out[name]            = int(pred[i])
            out[name + "_nivel"] = LEVEL[int(pred[i])]
        return out
    except Exception as e:
        fallback["note"] = f"Error modelo: {e}"
        return fallback

def simular_lectura(high_risk: bool = False) -> dict:
    if high_risk:
        temp, hum  = round(random.uniform(33,37.5),2), round(random.uniform(70,92),1)
        estres     = round(random.uniform(78,98),1)
        hr         = random.randint(100,130)
    else:
        temp, hum  = round(random.uniform(26,32),2), round(random.uniform(45,80),1)
        estres     = round(random.uniform(15,60),1)
        hr         = random.randint(60,90)
    hi  = heat_index_c(temp, hum)
    fat = round(min(100, estres * 0.8 + random.uniform(-10,10)), 1)
    now = datetime.now()
    return {
        "es_fin_de_semana":        1 if now.weekday() >= 5 else 0,
        "hora_decimal":            now.hour + now.minute / 60.0,
        "factor_carga_trabajo":    round(random.uniform(0.25,0.9),3),
        "temperatura_ambiental_c": temp,
        "humedad_relativa_pct":    hum,
        "indice_calor_c":          hi,
        "ritmo_cardiaco_lpm":      hr,
        "nivel_estres_0_100":      estres,
        "nivel_fatiga_0_100":      fat,
        "departamento":            "Administrativo",
    }

# ── Leer sensor ambiental IoT ─────────────────────────────────────────────────
def get_sensor_ambiental(db: Session):
    """
    Lee lector_sensor. El campo 'valor' es JSON:
    {"temperatura":32.5,"humedad":70}
    """
    try:
        row = db.execute(text(
            "SELECT TOP 1 valor, tiempo FROM [dbo].[lector_sensor] ORDER BY tiempo DESC"
        )).fetchone()
        if not row:
            return None
        data = json.loads(row.valor)
        return {
            "temperatura_ambiental_c": float(data.get("temperatura", 25.0)),
            "humedad_relativa_pct":    float(data.get("humedad", 60.0)),
            "timestamp":               row.tiempo.isoformat() if row.tiempo else None,
        }
    except Exception as e:
        print(f"⚠️ lector_sensor error: {e}")
        return None

# ── Leer wearable ─────────────────────────────────────────────────────────────
def get_wearable_lectura(db: Session, worker_id: str):
    """
    Lee lecturas_wearable: heart_rate, body_temperature, stress_level
    """
    try:
        row = db.execute(text("""
            SELECT TOP 1 heart_rate, body_temperature, stress_level, fecha_registro
            FROM [dbo].[lecturas_wearable]
            WHERE worker_id = :wid
            ORDER BY fecha_registro DESC
        """), {"wid": worker_id}).fetchone()
        if not row:
            return None
        return {
            "ritmo_cardiaco_lpm":   int(row.heart_rate),
            "temperatura_corporal": float(row.body_temperature),
            "nivel_estres_0_100":   float(row.stress_level),
            "timestamp":            row.fecha_registro.isoformat() if row.fecha_registro else None,
        }
    except Exception as e:
        print(f"⚠️ lecturas_wearable error: {e}")
        return None

def get_wearable_history(db: Session, worker_id: str, limit: int = 20):
    try:
        rows = db.execute(text("""
            SELECT TOP :lim heart_rate, body_temperature, stress_level, fecha_registro
            FROM [dbo].[lecturas_wearable]
            WHERE worker_id = :wid
            ORDER BY fecha_registro DESC
        """), {"wid": worker_id, "lim": limit}).fetchall()
        return [
            {"hr": int(r.heart_rate), "temp_corporal": float(r.body_temperature),
             "stress": float(r.stress_level), "ts": r.fecha_registro.isoformat()}
            for r in reversed(rows)
        ]
    except Exception as e:
        print(f"⚠️ historial wearable error: {e}")
        return []

# ── Trabajadores admin ────────────────────────────────────────────────────────
DEPT_LIST  = ["Administrativo","Coordinadores","Docentes","Coordinadores Empresariales","Otros"]
NAMES_LIST = [
    "Luis García","Pedro Martínez","Sofía Hernández","Diego Torres","Elena Castillo",
    "Marcos Romero","Isabela Vargas","Andrés Moreno","Valentina Cruz","Felipe Reyes",
    "Camila Flores","Nicolás Jiménez","Laura Ruiz","Sebastián Navarro","Paula Ortiz",
]
ADMIN_WORKERS = [
    {
        "id_trabajador": f"TRB-{str(i+1).zfill(2)}",
        "worker_id_db":  f"trabajador-{str(i+1).zfill(3)}",
        "nombre":        NAMES_LIST[i],
        "departamento":  DEPT_LIST[i % len(DEPT_LIST)],
        "prioridad_base": i >= 13,
    }
    for i in range(15)
]
ADMIN_MANUAL_STATE = {
    w["id_trabajador"]: {"manual_override": False, "clasificacion_manual": None,
                         "motivo": "", "updated_by": None, "updated_at": None}
    for w in ADMIN_WORKERS
}

def compose_admin_worker(worker: dict, db: Session = None) -> dict:
    lectura       = simular_lectura(high_risk=worker["prioridad_base"])
    lectura["id_trabajador"] = worker["id_trabajador"]
    lectura["nombre"]        = worker["nombre"]
    fuente = "SIMULACION"

    if db:
        wearable = get_wearable_lectura(db, worker["worker_id_db"])
        if wearable:
            lectura["ritmo_cardiaco_lpm"] = wearable["ritmo_cardiaco_lpm"]
            lectura["nivel_estres_0_100"] = wearable["nivel_estres_0_100"]
            fuente = "SENSOR_REAL"

        ambiental = get_sensor_ambiental(db)
        if ambiental:
            lectura["temperatura_ambiental_c"] = ambiental["temperatura_ambiental_c"]
            lectura["humedad_relativa_pct"]    = ambiental["humedad_relativa_pct"]
            lectura["indice_calor_c"]          = heat_index_c(
                ambiental["temperatura_ambiental_c"],
                ambiental["humedad_relativa_pct"]
            )

    riesgos  = predecir_riesgos(lectura)
    manual   = ADMIN_MANUAL_STATE[worker["id_trabajador"]]
    model_cl = MODEL_TO_MANUAL.get(int(riesgos["riesgo_global"]), "NORMAL")
    final_cl = manual["clasificacion_manual"] if manual["manual_override"] else model_cl
    return {
        "worker": worker, "lectura": lectura, "riesgos": riesgos,
        "clasificacion_modelo": model_cl, "clasificacion_final": final_cl,
        "fuente_clasificacion": "MANUAL" if manual["manual_override"] else "MODELO",
        "fuente_sensor": fuente, "manual": manual,
    }

# ── Schemas ───────────────────────────────────────────────────────────────────
class AuthBody(BaseModel):
    username: str
    password: str

class CheckInBody(BaseModel):
    mood: str
    symptoms: List[str] = []
    notes: Optional[str] = ""

class AdminClassificationBody(BaseModel):
    clasificacion_manual: str
    motivo: Optional[str] = ""

# ══════════════════════════════════════════════════════════════════════════════
#  RUTAS
# ══════════════════════════════════════════════════════════════════════════════
@app.get("/api/v1/health")
def health():
    return {"ok": True, "status": "running"}

@app.post("/api/v1/auth/register")
def register(body: AuthBody):
    u = body.username.strip()
    if len(u) < 3:             return JSONResponse({"ok":False,"message":"Usuario mínimo 3 caracteres."}, status_code=400)
    if len(body.password) < 6: return JSONResponse({"ok":False,"message":"Contraseña mínima 6 caracteres."}, status_code=400)
    if u in USERS:             return JSONResponse({"ok":False,"message":"Ese usuario ya existe."}, status_code=400)
    USERS[u] = {"username":u,"password_hash":get_password_hash(body.password),"role":"worker"}
    return {"ok":True,"message":"Usuario registrado."}

@app.post("/api/v1/auth/login")
def login(body: AuthBody):
    user = USERS.get(body.username.strip())
    if not user or not verify_password(body.password, user["password_hash"]):
        return JSONResponse({"ok":False,"message":"Credenciales inválidas."}, status_code=401)
    token = create_access_token({"sub": user["username"], "role": user["role"]})
    return {"ok":True,"token":token,"role":user["role"]}

@app.get("/api/v1/symptoms/today/status")
def checkin_status(user=Depends(require_role("worker"))):
    today = date.today().isoformat()
    return {"ok":True,"date":today,"submitted":(user["username"],today) in CHECKINS}

@app.post("/api/v1/symptoms/today")
def submit_checkin(body: CheckInBody, user=Depends(require_role("worker"))):
    today = date.today().isoformat()
    key   = (user["username"], today)
    if key in CHECKINS:
        return JSONResponse({"ok":False,"message":"Ya enviaste el check-in hoy."}, status_code=400)
    CHECKINS[key] = {"date":today,"username":user["username"],"mood":body.mood,
                     "symptoms":body.symptoms,"notes":body.notes or "","created_at":datetime.now().isoformat(sep=" ")}
    return {"ok":True,"message":"Check-in guardado."}

@app.get("/api/v1/symptoms/history")
def checkin_history(user=Depends(require_role("worker"))):
    out = [v for (u,d),v in CHECKINS.items() if u == user["username"]]
    out.sort(key=lambda x: x["date"], reverse=True)
    return {"ok":True,"items":out}

@app.get("/api/v1/worker/live/me")
def worker_live_me(user=Depends(require_role("worker")), db: Session = Depends(get_db)):
    worker_id_db = USER_TO_WORKER_ID.get(user["username"])
    lectura      = simular_lectura(high_risk=False)
    lectura["id_trabajador"] = user["username"]
    fuente = "SIMULACION"

    if worker_id_db:
        wearable = get_wearable_lectura(db, worker_id_db)
        if wearable:
            lectura["ritmo_cardiaco_lpm"] = wearable["ritmo_cardiaco_lpm"]
            lectura["nivel_estres_0_100"] = wearable["nivel_estres_0_100"]
            fuente = "SENSOR_REAL"

    ambiental = get_sensor_ambiental(db)
    if ambiental:
        lectura["temperatura_ambiental_c"] = ambiental["temperatura_ambiental_c"]
        lectura["humedad_relativa_pct"]    = ambiental["humedad_relativa_pct"]
        lectura["indice_calor_c"]          = heat_index_c(
            ambiental["temperatura_ambiental_c"], ambiental["humedad_relativa_pct"]
        )
        fuente = "SENSOR_REAL"

    lectura["fuente_sensor"] = fuente
    riesgos = predecir_riesgos(lectura)
    return {"ok":True,"lectura":lectura,"riesgos":riesgos}

@app.get("/api/v1/sensor/latest")
def sensor_latest(user=Depends(require_role("worker")), db: Session = Depends(get_db)):
    data = get_sensor_ambiental(db)
    if not data: return {"ok":False,"message":"Sin datos del sensor"}
    return {"ok":True,**data}

@app.get("/api/v1/sensor/history")
def sensor_history(limit: int = 20, user=Depends(require_role("worker")), db: Session = Depends(get_db)):
    worker_id_db = USER_TO_WORKER_ID.get(user["username"])
    if not worker_id_db: return {"ok":False,"items":[],"message":"Trabajador no mapeado"}
    return {"ok":True,"items":get_wearable_history(db, worker_id_db, limit)}

@app.get("/api/v1/admin/live/workers")
def admin_live_workers(admin=Depends(require_role("admin")), db: Session = Depends(get_db)):
    return {"ok":True,"items":[compose_admin_worker(w, db) for w in ADMIN_WORKERS]}

@app.get("/api/v1/admin/sensores/latest")
def admin_sensores_latest(admin=Depends(require_role("admin")), db: Session = Depends(get_db)):
    data = get_sensor_ambiental(db)
    if not data: return {"ok":False,"message":"Sin datos del sensor"}
    return {"ok":True,**data}

@app.get("/api/v1/admin/wearables/latest")
def admin_wearables_latest(admin=Depends(require_role("admin")), db: Session = Depends(get_db)):
    try:
        rows = db.execute(text("""
            SELECT w.worker_id, w.heart_rate, w.body_temperature, w.stress_level, w.fecha_registro
            FROM [dbo].[lecturas_wearable] w
            INNER JOIN (
                SELECT worker_id, MAX(fecha_registro) AS max_ts
                FROM [dbo].[lecturas_wearable]
                GROUP BY worker_id
            ) latest ON w.worker_id = latest.worker_id AND w.fecha_registro = latest.max_ts
        """)).fetchall()
        return {"ok":True,"items":[
            {"worker_id":r.worker_id,"heart_rate":int(r.heart_rate),
             "body_temperature":float(r.body_temperature),"stress_level":float(r.stress_level),
             "timestamp":r.fecha_registro.isoformat()}
            for r in rows
        ]}
    except Exception as e:
        return {"ok":False,"message":str(e),"items":[]}

@app.put("/api/v1/admin/workers/{worker_id}/classification")
def admin_update_classification(worker_id: str, body: AdminClassificationBody, admin=Depends(require_role("admin"))):
    worker = next((w for w in ADMIN_WORKERS if w["id_trabajador"] == worker_id), None)
    if not worker: raise HTTPException(status_code=404, detail="Trabajador no encontrado")
    clasificacion = (body.clasificacion_manual or "").strip().upper()
    if clasificacion not in MANUAL_TO_MODEL:
        return JSONResponse({"ok":False,"message":"Clasificación inválida."}, status_code=400)
    ADMIN_MANUAL_STATE[worker_id] = {
        "manual_override":True,"clasificacion_manual":clasificacion,
        "motivo":(body.motivo or "").strip(),"updated_by":admin["username"],
        "updated_at":datetime.now().isoformat(sep=" ",timespec="seconds"),
    }
    return {"ok":True,"message":"Clasificación actualizada."}

@app.delete("/api/v1/admin/workers/{worker_id}/classification")
def admin_clear_classification(worker_id: str, admin=Depends(require_role("admin"))):
    worker = next((w for w in ADMIN_WORKERS if w["id_trabajador"] == worker_id), None)
    if not worker: raise HTTPException(status_code=404, detail="Trabajador no encontrado")
    ADMIN_MANUAL_STATE[worker_id] = {
        "manual_override":False,"clasificacion_manual":None,
        "motivo":"","updated_by":admin["username"],
        "updated_at":datetime.now().isoformat(sep=" ",timespec="seconds"),
    }
    return {"ok":True,"message":"Clasificación eliminada."}
