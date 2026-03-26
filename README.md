# SaludOcupacional — Frontend React + Vite

## Estructura del proyecto

```
src/
├── main.jsx                        # Entry point
├── App.jsx                         # Layout principal + routing
├── index.css                       # Estilos globales
├── store/
│   └── AppContext.jsx              # Estado global (auth, checkins)
├── utils/
│   └── simulation.js              # Motor de simulación + constantes
├── components/
│   └── UI.jsx                     # Componentes reutilizables
└── pages/
    ├── AuthPage.jsx               # Login y registro
    ├── worker/
    │   ├── WorkerMonitor.jsx      # Monitor en vivo con gráficas
    │   └── WorkerCheckin.jsx      # Check-in y historial
    └── admin/
        ├── AdminDashboard.jsx     # Dashboard ejecutivo
        ├── AdminWorkers.jsx       # Gestión de trabajadores
        └── AdminAlertsTrends.jsx  # Alertas y tendencias
```

## Instalación y uso

```bash
npm install
npm run dev
```

El proyecto corre en http://localhost:5173

## Credenciales demo

| Usuario  | Contraseña | Rol    |
|----------|------------|--------|
| admin    | admin123   | admin  |
| worker1  | worker123  | worker |
| worker2  | worker123  | worker |
| worker3  | worker123  | worker |
| worker4  | worker123  | worker |

## Conectar al backend real (FastAPI)

1. En `src/utils/simulation.js` y los archivos de páginas, reemplaza
   las funciones de simulación por llamadas a la API:

```js
const API = 'https://tu-backend.azurewebsites.net'

// Ejemplo de login real
const res = await fetch(`${API}/api/v1/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password })
})
const data = await res.json()
```

2. Guarda el token JWT en el contexto (`AppContext.jsx`) y
   úsalo en el header `Authorization: Bearer <token>` de cada petición.

## Build para Azure Static Web Apps

```bash
npm run build
# La carpeta /dist es lo que subes a Azure
```
