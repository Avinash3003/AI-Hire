from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from db.supabase import get_supabase
from models.schemas import UserCreate, UserLogin, UserResponse, Token
from core.security import get_password_hash, verify_password, create_access_token
from api.dependencies import get_current_user

router = APIRouter()

@router.post("/signup", response_model=UserResponse)
def signup(user: UserCreate, supabase: Client = Depends(get_supabase)):
    # Check if user exists
    response = supabase.table("users").select("*").eq("email", user.email).execute()
    if response.data:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    
    new_user = {
        "name": user.name,
        "email": user.email,
        "password_hash": hashed_password,
        "role": user.role
    }
    
    # Insert new user
    insert_response = supabase.table("users").insert(new_user).execute()
    if not insert_response.data:
        raise HTTPException(status_code=500, detail="Error creating user")
        
    return insert_response.data[0]

@router.post("/login", response_model=Token)
def login(user_credentials: UserLogin, supabase: Client = Depends(get_supabase)):
    response = supabase.table("users").select("*").eq("email", user_credentials.email).execute()
    
    if not response.data:
        raise HTTPException(status_code=401, detail="Invalid credentials")
        
    user_data = response.data[0]
    
    if not verify_password(user_credentials.password, user_data["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
        
    # Create token
    access_token = create_access_token(subject=user_data["email"])
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: UserResponse = Depends(get_current_user)):
    return current_user
