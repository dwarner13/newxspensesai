"""
Categorization endpoints
"""

from fastapi import APIRouter, HTTPException
from loguru import logger

router = APIRouter()


@router.post("/")
async def categorize_transaction():
    """Categorize a single transaction"""
    return {"message": "Categorization endpoint - coming soon"}


@router.post("/batch")
async def categorize_batch():
    """Categorize multiple transactions"""
    return {"message": "Batch categorization endpoint - coming soon"}


@router.put("/correct")
async def correct_categorization():
    """Correct categorization for learning"""
    return {"message": "Correction endpoint - coming soon"} 