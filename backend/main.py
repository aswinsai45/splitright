from fastapi import Depends, FastAPI
from routers import groups, expenses, balances, nlp, guests
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
app.include_router(groups.router, prefix="/groups", tags=["groups"])
app.include_router(expenses.router, prefix="/expenses", tags=["expenses"])
app.include_router(balances.router, prefix="/balances", tags=["balances"])
app.include_router(nlp.router, prefix="/nlp", tags=["nlp"])
app.include_router(guests.router, prefix="/groups", tags=["guests"])
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