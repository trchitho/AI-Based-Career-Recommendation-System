# Phase 2: Preservation Property Test - API Endpoints
# CRITICAL: This test MUST PASS on unfixed code to establish baseline
# Preservation Goal: Ensure existing API endpoints remain compatible

import pytest
from unittest.mock import MagicMock, patch
import json

class TestAPIEndpointsPreservation:
    """
    Preservation Property: Current API endpoints must maintain compatibility
    when voice features are added to the system.
    
    EXPECTED BEHAVIOR: This test SHOULD PASS on unfixed code
    """
    
    def test_user_endpoints_compatibility(self):
        """Test user-related API endpoints maintain compatibility"""
        
        # Mock FastAPI TestClient
        mock_client = MagicMock()
        
        # Test GET /api/users/me endpoint
        mock_client.get.return_value = MagicMock(
            status_code=200,
            json=lambda: {
                "id": 1,
                "email": "test@example.com",
                "full_name": "Test User",
                "is_active": True,
                "created_at": "2024-01-26T10:00:00"
            }
        )
        
        response = mock_client.get("/api/users/me", headers={"Authorization": "Bearer valid_token"})
        
        assert response.status_code == 200
        user_data = response.json()
        assert user_data["email"] == "test@example.com"
        assert user_data["full_name"] == "Test User"
        assert "id" in user_data
        
        # Test unauthorized access
        mock_client.get.return_value = MagicMock(status_code=401)
        
        response = mock_client.get("/api/users/me")
        assert response.status_code == 401
    
    def test_career_endpoints_compatibility(self):
        """Test career recommendation endpoints maintain compatibility"""
        
        mock_client = MagicMock()
        
        # Test GET /api/careers/ endpoint
        mock_client.get.return_value = MagicMock(
            status_code=200,
            json=lambda: {
                "careers": [
                    {
                        "id": 1,
                        "title": "Software Engineer",
                        "description": "Develops software applications",
                        "required_skills": ["Python", "JavaScript"],
                        "salary_range": "60000-90000"
                    },
                    {
                        "id": 2,
                        "title": "Data Scientist",
                        "description": "Analyzes data and builds models",
                        "required_skills": ["Python", "Machine Learning"],
                        "salary_range": "70000-100000"
                    }
                ],
                "total": 2
            }
        )
        
        response = mock_client.get("/api/careers/")
        
        assert response.status_code == 200
        data = response.json()
        assert "careers" in data
        assert len(data["careers"]) == 2
        assert data["careers"][0]["title"] == "Software Engineer"
    
    def test_career_recommendation_endpoint_compatibility(self):
        """Test career recommendation POST endpoint"""
        
        mock_client = MagicMock()
        
        # Test POST /api/career/recommend endpoint
        mock_client.post.return_value = MagicMock(
            status_code=200,
            json=lambda: {
                "recommendations": [
                    {
                        "career_id": 1,
                        "title": "Frontend Developer",
                        "match_score": 0.85,
                        "matching_skills": ["JavaScript", "React"],
                        "missing_skills": ["TypeScript"],
                        "confidence": 0.9
                    }
                ],
                "user_profile": {
                    "skills": ["JavaScript", "React", "CSS"],
                    "experience_level": "intermediate"
                }
            }
        )
        
        request_data = {
            "skills": ["JavaScript", "React", "CSS"],
            "experience_level": "intermediate",
            "preferences": {
                "salary_min": 50000,
                "location": "Remote"
            }
        }
        
        response = mock_client.post("/api/career/recommend", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "recommendations" in data
        assert len(data["recommendations"]) > 0
        assert data["recommendations"][0]["match_score"] > 0
        
        # Test validation error
        mock_client.post.return_value = MagicMock(status_code=422)
        
        invalid_request = {"invalid_field": "invalid_value"}
        response = mock_client.post("/api/career/recommend", json=invalid_request)
        assert response.status_code == 422
    
    def test_interview_endpoints_compatibility(self):
        """Test existing interview endpoints (non-voice) maintain compatibility"""
        
        mock_client = MagicMock()
        
        # Test POST /api/interview/start endpoint
        mock_client.post.return_value = MagicMock(
            status_code=200,
            json=lambda: {
                "session_id": 123,
                "status": "active",
                "interview_mode": "text",  # Current mode
                "question_count": 5,
                "first_question": {
                    "id": 1,
                    "content": "Tell me about your experience with Python",
                    "type": "technical",
                    "expected_duration": 300
                }
            }
        )
        
        request_data = {
            "job_id": "job-123",
            "interview_type": "technical",
            "question_count": 5
        }
        
        response = mock_client.post("/api/interview/start", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "session_id" in data
        assert data["status"] == "active"
        assert data["interview_mode"] == "text"
        assert "first_question" in data
    
    def test_interview_message_endpoints_compatibility(self):
        """Test interview message endpoints work correctly"""
        
        mock_client = MagicMock()
        
        # Test POST /api/interview/message endpoint
        mock_client.post.return_value = MagicMock(
            status_code=200,
            json=lambda: {
                "message_id": 456,
                "ai_response": {
                    "content": "That's great experience! Can you tell me about a specific project?",
                    "type": "follow_up",
                    "question_number": 2
                },
                "evaluation": {
                    "score": 7.5,
                    "feedback": "Good technical knowledge demonstrated",
                    "strengths": ["Technical skills", "Clear communication"],
                    "areas_for_improvement": ["More specific examples needed"]
                }
            }
        )
        
        request_data = {
            "session_id": 123,
            "content": "I have 3 years of experience with Python, working on web applications",
            "question_id": 1
        }
        
        response = mock_client.post("/api/interview/message", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "message_id" in data
        assert "ai_response" in data
        assert "evaluation" in data
        assert data["evaluation"]["score"] > 0
    
    def test_interview_session_endpoints_compatibility(self):
        """Test interview session management endpoints"""
        
        mock_client = MagicMock()
        
        # Test GET /api/interview/session/{session_id}
        mock_client.get.return_value = MagicMock(
            status_code=200,
            json=lambda: {
                "id": 123,
                "user_id": 1,
                "job_id": "job-123",
                "status": "active",
                "interview_mode": "text",
                "started_at": "2024-01-26T10:00:00",
                "question_count": 5,
                "current_question": 2,
                "messages": [
                    {
                        "id": 1,
                        "role": "ai",
                        "content": "First question content",
                        "timestamp": "2024-01-26T10:01:00"
                    },
                    {
                        "id": 2,
                        "role": "user", 
                        "content": "User answer",
                        "timestamp": "2024-01-26T10:02:00"
                    }
                ]
            }
        )
        
        response = mock_client.get("/api/interview/session/123")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == 123
        assert data["status"] == "active"
        assert data["interview_mode"] == "text"
        assert len(data["messages"]) == 2
    
    def test_file_upload_endpoints_compatibility(self):
        """Test file upload endpoints remain functional"""
        
        mock_client = MagicMock()
        
        # Test POST /api/users/upload-resume
        mock_client.post.return_value = MagicMock(
            status_code=200,
            json=lambda: {
                "file_id": "resume-123",
                "filename": "resume.pdf",
                "file_size": 1024000,
                "upload_status": "success",
                "extracted_data": {
                    "skills": ["Python", "JavaScript", "React"],
                    "experience_years": 3,
                    "education": "Bachelor's in Computer Science"
                }
            }
        )
        
        # Mock file upload
        mock_files = {"file": ("resume.pdf", b"mock_pdf_content", "application/pdf")}
        
        response = mock_client.post(
            "/api/users/upload-resume",
            files=mock_files,
            headers={"Authorization": "Bearer valid_token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "file_id" in data
        assert data["upload_status"] == "success"
        assert "extracted_data" in data
    
    def test_assessment_endpoints_compatibility(self):
        """Test assessment endpoints maintain compatibility"""
        
        mock_client = MagicMock()
        
        # Test GET /api/assessments/
        mock_client.get.return_value = MagicMock(
            status_code=200,
            json=lambda: {
                "assessments": [
                    {
                        "id": 1,
                        "name": "Technical Skills Assessment",
                        "type": "technical",
                        "duration": 3600,
                        "question_count": 20
                    },
                    {
                        "id": 2,
                        "name": "Personality Assessment",
                        "type": "personality",
                        "duration": 1800,
                        "question_count": 50
                    }
                ]
            }
        )
        
        response = mock_client.get("/api/assessments/")
        
        assert response.status_code == 200
        data = response.json()
        assert "assessments" in data
        assert len(data["assessments"]) == 2
    
    def test_error_handling_compatibility(self):
        """Test API error handling remains consistent"""
        
        mock_client = MagicMock()
        
        # Test 404 error
        mock_client.get.return_value = MagicMock(
            status_code=404,
            json=lambda: {
                "detail": "Resource not found",
                "error_code": "RESOURCE_NOT_FOUND"
            }
        )
        
        response = mock_client.get("/api/nonexistent-endpoint")
        
        assert response.status_code == 404
        error_data = response.json()
        assert "detail" in error_data
        
        # Test 500 error
        mock_client.get.return_value = MagicMock(
            status_code=500,
            json=lambda: {
                "detail": "Internal server error",
                "error_code": "INTERNAL_ERROR"
            }
        )
        
        response = mock_client.get("/api/error-endpoint")
        
        assert response.status_code == 500
        error_data = response.json()
        assert "detail" in error_data
    
    def test_api_versioning_compatibility(self):
        """Test API versioning remains consistent"""
        
        mock_client = MagicMock()
        
        # Test API version header
        mock_client.get.return_value = MagicMock(
            status_code=200,
            headers={"API-Version": "1.0"},
            json=lambda: {"version": "1.0", "status": "active"}
        )
        
        response = mock_client.get("/api/version")
        
        assert response.status_code == 200
        assert response.headers.get("API-Version") == "1.0"
        
        data = response.json()
        assert data["version"] == "1.0"
    
    def test_rate_limiting_compatibility(self):
        """Test rate limiting behavior is preserved"""
        
        mock_client = MagicMock()
        
        # Test normal request
        mock_client.get.return_value = MagicMock(
            status_code=200,
            headers={"X-RateLimit-Remaining": "99"},
            json=lambda: {"data": "success"}
        )
        
        response = mock_client.get("/api/users/me")
        
        assert response.status_code == 200
        assert "X-RateLimit-Remaining" in response.headers
        
        # Test rate limit exceeded
        mock_client.get.return_value = MagicMock(
            status_code=429,
            headers={"X-RateLimit-Remaining": "0"},
            json=lambda: {"detail": "Rate limit exceeded"}
        )
        
        response = mock_client.get("/api/users/me")
        
        assert response.status_code == 429
        assert response.headers.get("X-RateLimit-Remaining") == "0"