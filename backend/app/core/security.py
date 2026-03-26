import os
from datetime import datetime, timedelta
from typing import Any, Dict, Optional
import base64, hashlib, hmac, secrets
from jose import jwt

SECRET_KEY = os.environ.get("SECRET_KEY", "CAMBIA_ESTA_CLAVE_SUPER_SECRETA")
ALGORITHM  = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8

PBKDF2_ITERATIONS = 200_000
SALT_BYTES = 16
DKLEN = 32

def _b64e(b): return base64.urlsafe_b64encode(b).decode("utf-8").rstrip("=")
def _b64d(s):
    padding = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + padding)

def get_password_hash(password: str) -> str:
    salt = secrets.token_bytes(SALT_BYTES)
    dk   = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, PBKDF2_ITERATIONS, dklen=DKLEN)
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${_b64e(salt)}${_b64e(dk)}"

def verify_password(plain: str, hashed: str) -> bool:
    try:
        scheme, iters, salt_b64, hash_b64 = hashed.split("$")
        if scheme != "pbkdf2_sha256": return False
        salt     = _b64d(salt_b64)
        expected = _b64d(hash_b64)
        dk = hashlib.pbkdf2_hmac("sha256", plain.encode(), salt, int(iters), dklen=len(expected))
        return hmac.compare_digest(dk, expected)
    except Exception:
        return False

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire    = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
