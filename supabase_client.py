# supabase_client.py

import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

SUPABASE_KEY = SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError(
        "Supabase credentials are missing. "
        "Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY in your .env"
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

print("SMS SUPABASE CONNECTED:", bool(supabase))
print("SMS SUPABASE URL:", SUPABASE_URL)
print("SMS SUPABASE KEY TYPE:", "SERVICE_ROLE" if SUPABASE_SERVICE_ROLE_KEY else "ANON")