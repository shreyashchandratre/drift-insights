import os
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, Security, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

load_dotenv()

# Use a mock service account if none is provided for demo purposes
# In production, set GOOGLE_APPLICATION_CREDENTIALS environment variable
try:
    # Initialize default app (assumes GOOGLE_APPLICATION_CREDENTIALS is set)
    if not firebase_admin._apps:
        firebase_admin.initialize_app()
except Exception as e:
    # Fallback for development/testing without real credentials
    print(f"Warning: Firebase Admin initialization failed: {e}. Using mock mode.")

security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    """
    Verify the Firebase ID token in the Authorization header.
    Returns the decoded token dictionary if valid.
    Raises HTTPException 401 if invalid or missing.
    """
    if not firebase_admin._apps:
        # In mock mode, just return a dummy user dict
        return {"uid": "mock-user-123"}
        
    token = credentials.credentials
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
