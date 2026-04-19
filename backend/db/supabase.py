from supabase import create_client, Client
from core.config import settings

def get_supabase() -> Client:
    # If variables are empty, create a dummy client or raise error
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        raise ValueError("Supabase URL and Key must be defined in environment. Check .env file.")
    supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    return supabase
