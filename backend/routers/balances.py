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

    # fetch all members with profiles for name resolution
    members = supabase.table("group_members")\
        .select("user_id, profiles(display_name, avatar_url)")\
        .eq("group_id", group_id)\
        .execute()

    # build a lookup dict: user_id → display_name
    name_map = {}
    for m in members.data:
        profile = m.get("profiles")
        name_map[m["user_id"]] = profile["display_name"] if profile and profile.get("display_name") else "Unknown"

    # run the algorithm
    balances = compute_net_balances(expenses.data)
    transactions = simplify_debts(balances)

    # resolve user IDs to names in transactions
    named_transactions = []
    for txn in transactions:
        named_transactions.append({
            "from_id": txn["from"],
            "to_id": txn["to"],
            "from": name_map.get(txn["from"], txn["from"]),
            "to": name_map.get(txn["to"], txn["to"]),
            "amount": txn["amount"],
        })

    # resolve user IDs to names in balances
    named_balances = {
        name_map.get(uid, uid): amount
        for uid, amount in balances.items()
    }

    return {
        "balances": named_balances,
        "transactions": named_transactions,
    }