from fastapi import APIRouter, Depends, HTTPException
from dependencies import get_current_user
from database import supabase
from models import ExpenseCreate

router=APIRouter()

def _parse_paid_by(paid_by: str):
    """
    paid_by can be:
      - real user UUID
      - guest marker: "guest_uuid:<uuid>"
    Returns: (paid_by_user_id, paid_by_guest_id)
    """
    if isinstance(paid_by, str) and paid_by.startswith("guest_uuid:"):
        return (None, paid_by[len("guest_uuid:"):])
    return (paid_by, None)

def _enrich_guest(guest_id: str):
    guest = supabase.table("group_guests")\
        .select("id, group_id, display_name, assigned_to")\
        .eq("id", guest_id)\
        .single()\
        .execute()
    if not guest.data:
        return None

    assigned_profile = None
    assigned_to = guest.data.get("assigned_to")
    if assigned_to:
        prof = supabase.table("profiles")\
            .select("id, display_name, avatar_url")\
            .eq("id", assigned_to)\
            .single()\
            .execute()
        assigned_profile = prof.data if prof.data else None

    return {
        "id": guest.data["id"],
        "group_id": guest.data.get("group_id"),
        "display_name": guest.data.get("display_name"),
        "assigned_to": assigned_to,
        "assigned_profile": assigned_profile,
    }

def _enrich_guests_bulk(guest_ids):
    ids = [gid for gid in (guest_ids or []) if gid]
    if not ids:
        return {}

    guests = supabase.table("group_guests")\
        .select("id, group_id, display_name, assigned_to")\
        .in_("id", ids)\
        .execute()
    guest_rows = guests.data or []

    assigned_ids = [g["assigned_to"] for g in guest_rows if g.get("assigned_to")]
    profiles_map = {}
    if assigned_ids:
        profs = supabase.table("profiles")\
            .select("id, display_name, avatar_url")\
            .in_("id", list(set(assigned_ids)))\
            .execute()
        for p in (profs.data or []):
            profiles_map[p["id"]] = p

    out = {}
    for g in guest_rows:
        assigned_to = g.get("assigned_to")
        out[g["id"]] = {
            "id": g["id"],
            "group_id": g.get("group_id"),
            "display_name": g.get("display_name"),
            "assigned_to": assigned_to,
            "assigned_profile": profiles_map.get(assigned_to),
        }
    return out

@router.post("/{group_id}")
def create_expense(
    group_id: str,
    body: ExpenseCreate,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["user_id"]

    member_check = supabase.table("group_members")\
        .select("*")\
        .eq("group_id", group_id)\
        .eq("user_id", user_id)\
        .execute()
    if not member_check.data:
        raise HTTPException(status_code=403, detail="Not a member of the group")

    paid_by_user_id, paid_by_guest_id = _parse_paid_by(body.paid_by)
    if paid_by_guest_id:
        guest = _enrich_guest(paid_by_guest_id)
        if guest is None or guest.get("group_id") != group_id:
            raise HTTPException(status_code=400, detail="Invalid guest payer for this group")

    expense = supabase.table("expenses").insert({
        "group_id": group_id,
        "paid_by": paid_by_user_id,
        "paid_by_guest_id": paid_by_guest_id,
        "amount": body.amount,
        "description": body.description,
        "category": body.category,
        "split_type": body.split_type.value,
        "created_by": user_id,
    }).execute()

    expense_id = expense.data[0]["id"]

    # Separate real members from guests
    real_participants = [p for p in body.participants if not p.startswith("guest_")]
    guest_participants = body.guest_participants or []
    all_count = len(real_participants) + len(guest_participants)

    splits = []
    if body.split_type == "equal":
        split_amount = round(body.amount / max(all_count, 1), 2)
        for uid in real_participants:
            splits.append({"expense_id": expense_id, "user_id": uid, "amount": split_amount})
        for gid in guest_participants:
            splits.append({"expense_id": expense_id, "user_id": None, "guest_id": gid, "amount": split_amount})
    else:
        if not body.splits:
            raise HTTPException(status_code=400, detail="Splits required for non-equal split type")
        for s in body.splits:
            if s.user_id.startswith("guest_uuid:"):
                # guest UUID encoded as "guest_uuid:<uuid>"
                gid = s.user_id[len("guest_uuid:"):]
                splits.append({"expense_id": expense_id, "user_id": None, "guest_id": gid, "amount": s.amount})
            else:
                splits.append({"expense_id": expense_id, "user_id": s.user_id, "amount": s.amount})

    if splits:
        supabase.table("expense_splits").insert(splits).execute()

    return expense.data[0]


@router.get("/{group_id}")
def get_expenses(group_id: str, current_user: dict = Depends(get_current_user)):
    result = supabase.table("expenses")\
        .select("*, expense_splits(*, profiles(display_name, avatar_url)), profiles!expenses_paid_by_fkey(*)")\
        .eq("group_id", group_id)\
        .order("created_at", desc=True)\
        .execute()

    expenses = result.data or []
    # Attach guest info on payer + guest splits for rendering
    all_guest_ids = []
    for e in expenses:
        if e.get("paid_by_guest_id"):
            all_guest_ids.append(e.get("paid_by_guest_id"))
        for s in (e.get("expense_splits") or []):
            if s.get("guest_id"):
                all_guest_ids.append(s.get("guest_id"))

    guest_map = _enrich_guests_bulk(list(set(all_guest_ids)))

    for e in expenses:
        payer_guest_id = e.get("paid_by_guest_id")
        if payer_guest_id:
            e["paid_by_guest"] = guest_map.get(payer_guest_id)

        for s in (e.get("expense_splits") or []):
            if s.get("guest_id"):
                s["group_guest"] = guest_map.get(s.get("guest_id"))
    return expenses


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

    expense = result.data
    guest_id = expense.get("paid_by_guest_id")
    guest_ids = []
    if guest_id:
        guest_ids.append(guest_id)
    for s in (expense.get("expense_splits") or []):
        if s.get("guest_id"):
            guest_ids.append(s.get("guest_id"))
    guest_ids = list(set(guest_ids))

    guest_map = _enrich_guests_bulk(guest_ids)
    if guest_id:
        expense["paid_by_guest"] = guest_map.get(guest_id)

    for s in (expense.get("expense_splits") or []):
        if s.get("guest_id"):
            s["group_guest"] = guest_map.get(s["guest_id"])

    return expense


@router.delete("/{expense_id}")
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
    member_check = supabase.table("group_members")\
        .select("*")\
        .eq("group_id", group_id)\
        .eq("user_id", current_user["user_id"])\
        .execute()
    if not member_check.data:
        raise HTTPException(403, "Not a member")

    paid_by_user_id, paid_by_guest_id = _parse_paid_by(expense.paid_by)
    if paid_by_guest_id:
        guest = _enrich_guest(paid_by_guest_id)
        if guest is None or guest.get("group_id") != group_id:
            raise HTTPException(status_code=400, detail="Invalid guest payer for this group")

    supabase.table("expenses").update({
        "paid_by": paid_by_user_id,
        "paid_by_guest_id": paid_by_guest_id,
        "amount": expense.amount,
        "description": expense.description,
        "category": expense.category,
        "split_type": expense.split_type.value if hasattr(expense.split_type, "value") else expense.split_type
    }).eq("id", expense_id).execute()

    supabase.table("expense_splits").delete().eq("expense_id", expense_id).execute()

    real_participants = [p for p in expense.participants if not p.startswith("guest_")]
    guest_participants = expense.guest_participants or []
    all_count = len(real_participants) + len(guest_participants)

    splits = []
    if expense.split_type == "equal":
        share = round(expense.amount / max(all_count, 1), 2)
        for uid in real_participants:
            splits.append({"expense_id": expense_id, "user_id": uid, "amount": share})
        for gid in guest_participants:
            splits.append({"expense_id": expense_id, "user_id": None, "guest_id": gid, "amount": share})
    else:
        for s in expense.splits:
            if s.user_id.startswith("guest_uuid:"):
                gid = s.user_id[len("guest_uuid:"):]
                splits.append({"expense_id": expense_id, "user_id": None, "guest_id": gid, "amount": s.amount})
            else:
                splits.append({"expense_id": expense_id, "user_id": s.user_id, "amount": s.amount})

    if splits:
        supabase.table("expense_splits").insert(splits).execute()

    return {"message": "Expense updated"}
