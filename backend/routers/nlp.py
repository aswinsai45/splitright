from fastapi import APIRouter, Depends, HTTPException
from dependencies import get_current_user
from models import NLPRequest
from services.llm_parser import parse_expense_text, ParseError

router = APIRouter()


@router.post("/parse-expense")
def parse_expense(body: NLPRequest, current_user: dict = Depends(get_current_user)):
    if len(body.text.strip()) < 5:
        raise HTTPException(status_code=400, detail="Input too short to parse")

    result = parse_expense_text(body.text.strip())

    if isinstance(result, ParseError):
        raise HTTPException(status_code=422, detail=result.error)

    return result