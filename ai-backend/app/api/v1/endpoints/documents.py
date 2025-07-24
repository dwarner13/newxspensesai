"""
Document processing endpoints
"""

import os
import uuid
from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from loguru import logger
from datetime import datetime

from ....database import get_db
from ....ai.document_processor import DocumentProcessor
from ....models.document import Document
from ....models.transaction import Transaction
from ....schemas.document import DocumentResponse, DocumentList
from ....schemas.transaction import TransactionResponse
from ....config import settings

router = APIRouter()
document_processor = DocumentProcessor()


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload and process a document"""
    try:
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Check file size
        if file.size and file.size > settings.MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File too large")
        
        # Check file extension
        file_extension = os.path.splitext(file.filename)[1].lower().lstrip('.')
        if file_extension not in settings.ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail="Unsupported file type")
        
        # Generate unique filename
        unique_filename = f"{uuid.uuid4()}_{file.filename}"
        file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
        
        # Save file
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Create document record
        document = Document(
            user_id=1,  # TODO: Get from authentication
            filename=unique_filename,
            original_filename=file.filename,
            file_path=file_path,
            file_size=len(content),
            file_type=file_extension,
            mime_type=file.content_type,
            status="uploaded"
        )
        
        db.add(document)
        db.commit()
        db.refresh(document)
        
        # Process document in background
        background_tasks.add_task(process_document_background, document.id, file_path, file_extension)
        
        return DocumentResponse(
            id=document.id,
            filename=document.original_filename,
            status=document.status,
            file_size=document.file_size,
            file_type=document.file_type,
            created_at=document.created_at
        )
        
    except Exception as e:
        logger.error(f"Error uploading document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(document_id: int, db: Session = Depends(get_db)):
    """Get document details"""
    try:
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return DocumentResponse(
            id=document.id,
            filename=document.original_filename,
            status=document.status,
            file_size=document.file_size,
            file_type=document.file_type,
            total_transactions=document.total_transactions,
            extraction_confidence=document.extraction_confidence,
            processing_started_at=document.processing_started_at,
            processing_completed_at=document.processing_completed_at,
            created_at=document.created_at
        )
        
    except Exception as e:
        logger.error(f"Error getting document {document_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{document_id}/transactions", response_model=List[TransactionResponse])
async def get_document_transactions(document_id: int, db: Session = Depends(get_db)):
    """Get transactions extracted from a document"""
    try:
        # Check if document exists
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Get transactions
        transactions = db.query(Transaction).filter(Transaction.document_id == document_id).all()
        
        return [
            TransactionResponse(
                id=transaction.id,
                description=transaction.description,
                amount=float(transaction.amount),
                transaction_date=transaction.transaction_date,
                category=transaction.ai_category or transaction.user_category,
                confidence=transaction.ai_confidence,
                merchant_name=transaction.merchant_name,
                created_at=transaction.created_at
            )
            for transaction in transactions
        ]
        
    except Exception as e:
        logger.error(f"Error getting transactions for document {document_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=DocumentList)
async def list_documents(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """List all documents"""
    try:
        documents = db.query(Document).offset(skip).limit(limit).all()
        total = db.query(Document).count()
        
        return DocumentList(
            documents=[
                DocumentResponse(
                    id=doc.id,
                    filename=doc.original_filename,
                    status=doc.status,
                    file_size=doc.file_size,
                    file_type=doc.file_type,
                    total_transactions=doc.total_transactions,
                    extraction_confidence=doc.extraction_confidence,
                    created_at=doc.created_at
                )
                for doc in documents
            ],
            total=total,
            skip=skip,
            limit=limit
        )
        
    except Exception as e:
        logger.error(f"Error listing documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def process_document_background(document_id: int, file_path: str, file_type: str):
    """Background task to process document"""
    try:
        from ....database import SessionLocal
        
        db = SessionLocal()
        
        # Update document status
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            logger.error(f"Document {document_id} not found for processing")
            return
        
        document.status = "processing"
        document.processing_started_at = datetime.utcnow()
        db.commit()
        
        # Process document
        result = await document_processor.process_document(file_path, file_type)
        
        # Save transactions
        for transaction_data in result["transactions"]:
            transaction = Transaction(
                user_id=document.user_id,
                document_id=document.id,
                transaction_date=transaction_data.get("transaction_date"),
                description=transaction_data.get("description", ""),
                amount=transaction_data.get("amount", 0),
                extraction_confidence=result["extraction_confidence"],
                extraction_method=result["processing_method"]
            )
            db.add(transaction)
        
        # Update document status
        document.status = "completed"
        document.processing_completed_at = datetime.utcnow()
        document.total_transactions = result["total_transactions"]
        document.extraction_confidence = result["extraction_confidence"]
        
        db.commit()
        logger.info(f"Document {document_id} processed successfully: {result['total_transactions']} transactions extracted")
        
    except Exception as e:
        logger.error(f"Error processing document {document_id}: {e}")
        
        # Update document status to failed
        try:
            document.status = "failed"
            document.extraction_errors = str(e)
            db.commit()
        except:
            pass
        
    finally:
        db.close() 