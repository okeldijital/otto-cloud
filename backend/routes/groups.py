from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

router = APIRouter()

@router.get("/catalog/groups")
def list_groups():
    return []

@router.get("/catalog/groups/{group_id}")
def get_group(group_id: int):
    return {}
