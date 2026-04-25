from fastapi import APIRouter, Depends, HTTPException
from dependencies import get_current_user
from database import supabase
from models import ExpenseCreate

router=APIRouter()

@router.post("/{group_id}")

def create_expense(
    group_id: str,
    body: ExpenseCreate,
    current_user: dict = Depends(get_current_user)
):
    user_id=current_user["user_id"]

    member_check=supabase.table("group_members")\
        .select("*")\
        .eq("group_id", group_id)\
        .eq("user_id", user_id)\
        .execute()
    if not member_check.data:
        raise HTTPException(status_code=403, detail="Not a member of the group")
    
    expense=supabase.table("expenses").insert({
        "group_id": group_id,
        "paid_by": body.paid_by,
        "amount": body.amount,
        "description": body.description,
        "category": body.category,
        "split_type": body.split_type.value,
        "created_by": user_id,
    }).execute()

    expense_id=expense.data[0]["id"]

    # calculate splits
    if body.split_type == "equal":
        split_amount = round(body.amount / len(body.participants), 2)
        splits = [
            {"expense_id": expense_id, "user_id": uid, "amount": split_amount}
            for uid in body.participants
        ]
    else:
        # exact or percentage — use provided splits
        if not body.splits:
            raise HTTPException(status_code=400, detail="Splits required for non-equal split type")
        splits = [
            {"expense_id": expense_id, "user_id": s.user_id, "amount": s.amount}
            for s in body.splits
        ]

    supabase.table("expense_splits").insert(splits).execute()

    return expense.data[0]


@router.get("/{group_id}")
def get_expenses(group_id: str, current_user: dict = Depends(get_current_user)):
    result = supabase.table("expenses")\
        .select("*, expense_splits(*), profiles!expenses_paid_by_fkey(*)")\
        .eq("group_id", group_id)\
        .order("created_at", desc=True)\
        .execute()

    return result.data


@router.get("/{group_id}/{expense_id}")
def get_expense(
    group_id: str,
    expense_id: str,
    current_user: dict = Depends(get_current_user)
):
    result = supabase.table("expenses")\
        .select("*, expense_splits(*, profiles(display_name, avatar_url)), profiles!expenses_paid_by_fkey(display_name, avatar_url)")\
        .eq("group_id", group_id)\
        .eq("id", expense_id)\
        .single()\
        .execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Expense not found")

    return result.data


def delete_expense(expense_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]

    # only creator can delete
    expense = supabase.table("expenses")\
        .select("*")\
        .eq("id", expense_id)\
        .eq("created_by", user_id)\
        .single()\
        .execute()

    if not expense.data:
        raise HTTPException(status_code=404, detail="Expense not found or not yours")

    supabase.table("expenses").delete().eq("id", expense_id).execute()

    return {"message": "Expense deleted"}

@router.put("/{group_id}/{expense_id}")
async def update_expense(
    group_id: str,
    expense_id: str,
    expense: ExpenseCreate,
    current_user: dict = Depends(get_current_user)
):
    # Verify user is in group
    member_check = supabase.table("group_members")\
        .select("*")\
        .eq("group_id", group_id)\
        .eq("user_id", current_user["user_id"])\
        .execute()
    
    if not member_check.data:
        raise HTTPException(403, "Not a member")
    
    # Update expense
    supabase.table("expenses").update({
        "paid_by": expense.paid_by,
        "amount": expense.amount,
        "description": expense.description,
        "category": expense.category,
        "split_type": expense.split_type
    }).eq("id", expense_id).execute()
    
    # Delete old splits
    supabase.table("expense_splits").delete().eq("expense_id", expense_id).execute()
    
    # Insert new splits
    if expense.split_type == "equal":
        share = expense.amount / len(expense.participants)
        splits = [{"expense_id": expense_id, "user_id": uid, "amount": share} 
                  for uid in expense.participants]
    else:
        splits = [{"expense_id": expense_id, "user_id": s.user_id, "amount": s.amount} 
                  for s in expense.splits]
    
    supabase.table("expense_splits").insert(splits).execute()
    
    return {"message": "Expense updated"}