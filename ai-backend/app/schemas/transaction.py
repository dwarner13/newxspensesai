"""
Transaction schemas
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class TransactionResponse(BaseModel):
    id: int
    description: str
    amount: float
    transaction_date: datetime
    category: Optional[str] = None
    confidence: Optional[float] = None
    merchant_name: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True 