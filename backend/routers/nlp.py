from fastapi import APIRouter, Depends, HTTPException
from dependencies import get_current_user
from models import NLPRequest, BillParseRequest
from services.llm_parser import parse_expense_text, parse_bill_image, ParseError

router = APIRouter()


@router.post("/parse-expense")
def parse_expense(body: NLPRequest, current_user: dict = Depends(get_current_user)):
    if len(body.text.strip()) < 5:
        raise HTTPException(status_code=400, detail="Input too short to parse")

    result = parse_expense_text(body.text.strip())

    if isinstance(result, ParseError):
        raise HTTPException(status_code=422, detail=result.error)

    return result


@router.post("/parse-bill")
def parse_bill(body: BillParseRequest, current_user: dict = Depends(get_current_user)):
    if not body.image_base64:
        raise HTTPException(status_code=400, detail="No image provided")

    result = parse_bill_image(body.image_base64, body.mime_type)

    if isinstance(result, ParseError):
        raise HTTPException(status_code=422, detail=result.error)

    return result