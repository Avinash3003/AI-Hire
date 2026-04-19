from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from core.config import settings
from core.security import decode_access_token
from db.supabase import get_supabase
from models.schemas import UserResponse
from supabase import Client

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), supabase: Client = Depends(get_supabase)) -> UserResponse:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    
    email: str = payload.get("sub")
    if email is None:
        raise credentials_exception
    
    # Normally we'd fetch the user from Supabase using user ID, but we set 'sub' to email
    response = supabase.table("users").select("*").eq("email", email).execute()
    
    if not response.data or len(response.data) == 0:
        raise credentials_exception
        
    user_data = response.data[0]
    return UserResponse(**user_data)
