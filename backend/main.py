from fastapi import Depends, FastAPI
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from dependencies import get_current_user
from database import supabase

load_dotenv()

app=FastAPI(title="SplitRight API", description="API for SplitRight application")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/me")
def me(current_user: dict = Depends(get_current_user)):
    return current_user

@app.get("/test-db")
def test_db():
    result=supabase.table("profiles").select("*").execute()
    return result.data