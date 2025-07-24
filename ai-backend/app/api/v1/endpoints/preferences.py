"""
User preferences endpoints
"""

from fastapi import APIRouter, HTTPException
from loguru import logger

router = APIRouter()


@router.get("/")
async def get_preferences():
    """Get user categorization preferences"""
    return {"message": "Preferences endpoint - coming soon"}


@router.post("/")
async def update_preferences():
    """Update user preferences"""
    return {"message": "Update preferences endpoint - coming soon"}


@router.get("/learning")
async def get_learning_progress():
    """Get learning progress"""
    return {"message": "Learning progress endpoint - coming soon"} 