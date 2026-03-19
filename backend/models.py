from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum

class SplitType(str, Enum):
    equal = "equal"
    exact = "exact"
    percentage = "percentage"

# --Models for groups--

class GroupCreate(BaseModel):
    name:str
    description: Optional[str] = None

class GroupResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    created_at: str
    created_by: str

# --models for expenses--
class SplitInput(BaseModel):
    user_id: str
    amount: float

class ExpenseCreate(BaseModel):
    paid_by: str
    amount: float = Field(gt=0)
    description: str
    category: str="other"
    split_type: SplitType = SplitType.equal
    splits: Optional[List[SplitInput]] = None
    participants: List[str]

# --models for settlements--
class SettlementCreate(BaseModel):
    paid_to: str
    amount: float = Field(gt=0)

# --model for NLP--
class NLPRequest(BaseModel):
    text: str
    