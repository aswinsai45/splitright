from fastapi import APIRouter, Depends, HTTPException
from dependencies import get_current_user
from database import supabase
from services.debt_engine import compute_net_balances, simplify_debts

router = APIRouter()


@router.get("/{group_id}")
def get_balances(group_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]

    # verify user is a member
    member_check = supabase.table("group_members")\
        .select("*")\
        .eq("group_id", group_id)\
        .eq("user_id", user_id)\
        .execute()

    if not member_check.data:
        raise HTTPException(status_code=403, detail="You are not a member of this group")

    # fetch all expenses with their splits
    expenses = supabase.table("expenses")\
        .select("*, expense_splits(*)")\
        .eq("group_id", group_id)\
        .execute()

    if not expenses.data:
        return {"balances": {}, "transactions": []}

    # run the algorithm
    balances = compute_net_balances(expenses.data)
    transactions = simplify_debts(balances)

    return {
        "balances": balances,
        "transactions": transactions
    }