"""
Analytics endpoints
"""

from fastapi import APIRouter, HTTPException
from loguru import logger

router = APIRouter()


@router.get("/categories")
async def get_category_analytics():
    """Get category analytics"""
    return {"message": "Category analytics endpoint - coming soon"}


@router.get("/spending")
async def get_spending_analytics():
    """Get spending patterns"""
    return {"message": "Spending analytics endpoint - coming soon"}


@router.get("/accuracy")
async def get_accuracy_metrics():
    """Get AI accuracy metrics"""
    return {"message": "Accuracy metrics endpoint - coming soon"} 