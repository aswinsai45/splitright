from fastapi import APIRouter, Depends, HTTPException
from dependencies import get_current_user
from database import supabase
from services.debt_engine import compute_net_balances, simplify_debts

router = APIRouter()

@router.get("/")
def get_user_balance_summary(current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]

    # get all groups user belongs to
    memberships = supabase.table("group_members")\
        .select("group_id")\
        .eq("user_id", user_id)\
        .execute()

    if not memberships.data:
        return {"total_owed": 0, "total_owing": 0, "net": 0, "groups": []}

    group_ids = [m["group_id"] for m in memberships.data]

    total_owed = 0    # others owe you
    total_owing = 0   # you owe others
    group_summaries = []

    for group_id in group_ids:
        # fetch expenses with splits for this group
        expenses = supabase.table("expenses")\
            .select("*, expense_splits(*)")\
            .eq("group_id", group_id)\
            .execute()

        if not expenses.data:
            continue

        # fetch group name
        group = supabase.table("groups")\
            .select("id, name")\
            .eq("id", group_id)\
            .single()\
            .execute()

        # fetch members for name resolution
        members = supabase.table("group_members")\
            .select("user_id, profiles(display_name)")\
            .eq("group_id", group_id)\
            .execute()

        name_map = {}
        for m in members.data:
            profile = m.get("profiles")
            name_map[m["user_id"]] = profile["display_name"] if profile and profile.get("display_name") else "Unknown"

        # guests: assigned guests are mapped to their real user; unassigned show as "guest:<uuid>"
        guests = supabase.table("group_guests")\
            .select("id, display_name, assigned_to")\
            .eq("group_id", group_id)\
            .execute()

        guest_assignments = {
            g["id"]: g["assigned_to"]
            for g in (guests.data or [])
            if g.get("assigned_to")
        }
        for g in (guests.data or []):
            if not g.get("assigned_to"):
                name_map[f"guest:{g['id']}"] = g.get("display_name") or "Guest"

        balances = compute_net_balances(expenses.data, guest_assignments=guest_assignments)
        transactions = simplify_debts(balances)

        # find transactions involving current user
        group_owed = 0
        group_owing = 0
        relevant_txns = []

        for txn in transactions:
            if txn["to"] == user_id:
                group_owed += txn["amount"]
                relevant_txns.append({
                    "from": name_map.get(txn["from"], txn["from"]),
                    "to": name_map.get(txn["to"], txn["to"]),
                    "from_id": txn["from"],
                    "to_id": txn["to"],
                    "amount": txn["amount"],
                    "type": "owed"
                })
            elif txn["from"] == user_id:
                group_owing += txn["amount"]
                relevant_txns.append({
                    "from": name_map.get(txn["from"], txn["from"]),
                    "to": name_map.get(txn["to"], txn["to"]),
                    "from_id": txn["from"],
                    "to_id": txn["to"],
                    "amount": txn["amount"],
                    "type": "owing"
                })

        if relevant_txns:
            group_summaries.append({
                "group_id": group_id,
                "group_name": group.data["name"] if group.data else "Unknown",
                "owed": group_owed,
                "owing": group_owing,
                "transactions": relevant_txns
            })

        total_owed += group_owed
        total_owing += group_owing

    return {
        "total_owed": round(total_owed, 2),
        "total_owing": round(total_owing, 2),
        "net": round(total_owed - total_owing, 2),
        "groups": group_summaries
    }

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

    # compute raw net balances from expenses — pass guest assignments so assigned
    # guest splits/payers count toward the real user's balance; otherwise they show as "guest:<uuid>"
    guests = supabase.table("group_guests")\
        .select("id, assigned_to")\
        .eq("group_id", group_id)\
        .execute()

    guest_assignments = {
        g["id"]: g["assigned_to"]
        for g in (guests.data or [])
        if g.get("assigned_to")
    }

    # add names for unassigned guests
    guests_for_names = supabase.table("group_guests")\
        .select("id, display_name, assigned_to")\
        .eq("group_id", group_id)\
        .execute()
    for g in (guests_for_names.data or []):
        if not g.get("assigned_to"):
            name_map[f"guest:{g['id']}"] = g.get("display_name") or "Guest"

    balances = compute_net_balances(expenses.data, guest_assignments=guest_assignments)

    # fetch all settlements for this group and apply them to the net balances
    # A settlement of ₹X from paid_by → paid_to means:
    #   paid_by's net goes up by X (they paid, reducing their debt)
    #   paid_to's net goes down by X (they received, reducing what they're owed)
    settlements = supabase.table("settlements")\
        .select("paid_by, paid_to, amount")\
        .eq("group_id", group_id)\
        .execute()

    for s in (settlements.data or []):
        debtor = s["paid_by"]
        creditor = s["paid_to"]
        amount = float(s["amount"])
        if debtor not in balances:
            balances[debtor] = 0.0
        if creditor not in balances:
            balances[creditor] = 0.0
        balances[debtor] += amount
        balances[creditor] -= amount

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
