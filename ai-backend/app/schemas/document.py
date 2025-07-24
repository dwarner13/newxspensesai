"""
Document schemas
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel


class DocumentResponse(BaseModel):
    id: int
    filename: str
    status: str
    file_size: int
    file_type: str
    total_transactions: Optional[int] = None
    extraction_confidence: Optional[float] = None
    processing_started_at: Optional[datetime] = None
    processing_completed_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class DocumentList(BaseModel):
    documents: List[DocumentResponse]
    total: int
    skip: int
    limit: int 