from fastapi import APIRouter, Depends, HTTPException
from dependencies import get_current_user
from database import supabase
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


class GuestCreate(BaseModel):
    display_name: str


class GuestAssign(BaseModel):
    user_id: str  # the real profile UUID to assign this guest to


@router.post("/{group_id}/guests")
def create_guest(
    group_id: str,
    body: GuestCreate,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["user_id"]

    # verify requester is a group member
    member_check = (
        supabase.table("group_members")
        .select("*")
        .eq("group_id", group_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not member_check.data:
        raise HTTPException(status_code=403, detail="Not a member of this group")

    result = (
        supabase.table("group_guests")
        .insert(
            {
                "group_id": group_id,
                "display_name": body.display_name,
                "created_by": user_id,
            }
        )
        .execute()
    )
    return result.data[0]


@router.get("/{group_id}/guests")
def list_guests(
    group_id: str,
    current_user: dict = Depends(get_current_user),
):
    result = (
        supabase.table("group_guests")
        .select("*, profiles!group_guests_assigned_to_fkey(display_name, avatar_url)")
        .eq("group_id", group_id)
        .order("created_at")
        .execute()
    )
    return result.data


@router.put("/{group_id}/guests/{guest_id}/assign")
def assign_guest(
    group_id: str,
    guest_id: str,
    body: GuestAssign,
    current_user: dict = Depends(get_current_user),
):
    # Update guest record
    supabase.table("group_guests").update({"assigned_to": body.user_id}).eq(
        "id", guest_id
    ).eq("group_id", group_id).execute()

    # Re-map all expense_splits that belong to this guest → now owned by the real user
    # This makes balances update immediately
    supabase.table("expense_splits").update({"user_id": body.user_id}).eq(
        "guest_id", guest_id
    ).execute()

    # Re-map expenses where this guest was the payer → now paid by the assigned user
    supabase.table("expenses").update(
        {"paid_by": body.user_id, "paid_by_guest_id": None}
    ).eq("paid_by_guest_id", guest_id).eq("group_id", group_id).execute()

    return {"message": "Guest assigned"}


@router.delete("/{group_id}/guests/{guest_id}")
def delete_guest(
    group_id: str,
    guest_id: str,
    current_user: dict = Depends(get_current_user),
):
    supabase.table("group_guests").delete().eq("id", guest_id).eq(
        "group_id", group_id
    ).execute()
    return {"message": "Guest deleted"}
