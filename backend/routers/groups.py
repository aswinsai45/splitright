from fastapi import APIRouter, Depends, HTTPException
from dependencies import get_current_user
from database import supabase
from models import GroupCreate
import uuid

router=APIRouter()

@router.post("/")
def create_group(body: GroupCreate, current_user: dict = Depends(get_current_user)):
    user_id=current_user["user_id"]
    invite_token=str(uuid.uuid4())

    result=supabase.table("groups").insert({
        "name": body.name,
        "description": body.description,
        "created_by": user_id,
        "invite_token": invite_token
    }).execute()

    return result.data[0]

@router.get("/")
def get_my_groups(current_user: dict = Depends(get_current_user)):
    user_id=current_user["user_id"]

    result=supabase.table("group_members")\
        .select("group_id")\
            .eq("user_id", user_id)\
                .execute()
    
    return result.data

@router.get("/{group_id}")
def get_group(group_id: str, current_user: dict = Depends(get_current_user)):
    result = supabase.table("groups")\
        .select("*, group_members(*, profiles(*))")\
        .eq("id", group_id)\
        .single()\
        .execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Group not found")

    return result.data


@router.post("/{group_id}/join")
def join_group(group_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]

    # check if already a member
    existing = supabase.table("group_members")\
        .select("*")\
        .eq("group_id", group_id)\
        .eq("user_id", user_id)\
        .execute()

    if existing.data:
        raise HTTPException(status_code=400, detail="Already a member")

    result = supabase.table("group_members").insert({
        "group_id": group_id,
        "user_id": user_id,
        "role": "member",
    }).execute()

    return result.data[0]