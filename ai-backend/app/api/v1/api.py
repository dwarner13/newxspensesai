"""
Main API router for v1 endpoints
"""

from fastapi import APIRouter

from .endpoints import documents, categorize, preferences, analytics

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(categorize.router, prefix="/categorize", tags=["categorize"])
api_router.include_router(preferences.router, prefix="/preferences", tags=["preferences"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"]) 