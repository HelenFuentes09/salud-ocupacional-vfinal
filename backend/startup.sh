#!/bin/bash
pip install --upgrade pip
pip install uvicorn[standard] fastapi python-jose[cryptography] joblib pandas scikit-learn python-multipart python-dotenv passlib sqlalchemy pyodbc
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Haz **Commit changes** directo a `main`.

---

Luego en Azure → **Configuración de la pila** cambia el comando de inicio a:
```
bash /home/site/wwwroot/backend/startup.sh
