"""
Simple VietnamWorks API Routes for testing
"""

from fastapi import APIRouter

router = APIRouter()

@router.get("/test")
async def test_endpoint():
    """Simple test endpoint"""
    return {"message": "VietnamWorks API is working!", "status": "ok"}

@router.get("/stats")
async def get_stats():
    """Get VietnamWorks statistics - Mock data for testing"""
    return {
        "categories": {
            "total": 153,
            "active": 153,
            "groups": 22
        },
        "mappings": {
            "total": 0,
            "avg_confidence": 0.0,
            "high_confidence": 0
        }
    }

@router.get("/categories")
async def get_categories(skip: int = 0, limit: int = 100):
    """Get all categories - Mock data for testing"""
    # Return mock data for now
    mock_categories = [
        {
            "id": 1,
            "name": "Sales Business Development",
            "slug": "ban-hang-phat-trien-kinh-doanh",
            "vietnamese_name": "Bán Hàng/Phát Triển Kinh Doanh",
            "category_group": "Bán Hàng & Kinh Doanh",
            "description": "Các vị trí bán hàng và phát triển kinh doanh",
            "vietnamworks_url": None,
            "is_active": True,
            "sort_order": 1
        },
        {
            "id": 2,
            "name": "General Accounting",
            "slug": "ke-toan-tong-hop",
            "vietnamese_name": "Kế Toán Tổng Hợp",
            "category_group": "Kế Toán & Tài Chính",
            "description": "Kế toán tổng hợp và báo cáo tài chính",
            "vietnamworks_url": None,
            "is_active": True,
            "sort_order": 10
        }
    ]
    
    return mock_categories[skip:skip+limit]
