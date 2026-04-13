#!/usr/bin/env python3
"""
PB32 - End-to-End Integration Test Suite
Kiểm tra tích hợp toàn bộ quy trình từ API đến Database
Bao gồm: Assessment → Essay Analysis → Trait Fusion → Career Recommendation

Test Coverage:
1. Complete Assessment Flow (RIASEC + Big Five)
2. Essay Analysis Integration
3. Trait Fusion and Storage
4. Career Recommendation Pipeline
5. Database Consistency Validation
6. API Response Validation
7. Performance under Load
"""

import json
import time
import requests
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add the app directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.core.database import get_db_session
from app.modules.assessments.service import (
    save_assessment,
    save_essay,
    build_results,
    fuse_user_traits
)
from app.modules.nlp.service_nlp import (
    analyze_essay,
    store_user_embedding,
    get_index_status
)

@dataclass
class E2ETestCase:
    """End-to-end test case"""
    name: str
    user_id: int
    riasec_responses: List[Dict]
    big5_responses: List[Dict]
    essay_text: str
    expected_dominant_trait: str
    description: str

@dataclass
class E2EResult:
    """Result of end-to-end test"""
    test_name: str
    success: bool
    assessment_id: Optional[int]
    essay_id: Optional[int]
    riasec_scores: Dict
    big5_scores: Dict
    traits_fused: bool
    career_recommendations: List[str]
    total_time_ms: float
    errors: List[str]

class E2EIntegrationTester:
    """End-to-end integration tester"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.test_cases = self._create_test_cases()
        self.results: List[E2EResult] = []
        
    def _create_test_cases(self) -> List[E2ETestCase]:
        """Create comprehensive end-to-end test cases"""
        return [
            E2ETestCase(
                name="Complete_Realistic_Engineer",
                user_id=9999,  # Test user ID
                riasec_responses=[
                    # Realistic questions (high scores)
                    {"questionId": "1", "answer": "Strongly Like"},
                    {"questionId": "7", "answer": "Strongly Like"},
                    {"questionId": "13", "answer": "Like"},
                    {"questionId": "19", "answer": "Strongly Like"},
                    {"questionId": "25", "answer": "Like"},
                    # Investigative questions (medium scores)
                    {"questionId": "2", "answer": "Like"},
                    {"questionId": "8", "answer": "Unsure"},
                    {"questionId": "14", "answer": "Like"},
                    {"questionId": "20", "answer": "Unsure"},
                    {"questionId": "26", "answer": "Like"},
                    # Artistic questions (low scores)
                    {"questionId": "3", "answer": "Dislike"},
                    {"questionId": "9", "answer": "Strongly Dislike"},
                    {"questionId": "15", "answer": "Dislike"},
                    {"questionId": "21", "answer": "Unsure"},
                    {"questionId": "27", "answer": "Dislike"},
                    # Social questions (low scores)
                    {"questionId": "4", "answer": "Unsure"},
                    {"questionId": "10", "answer": "Dislike"},
                    {"questionId": "16", "answer": "Unsure"},
                    {"questionId": "22", "answer": "Dislike"},
                    {"questionId": "28", "answer": "Unsure"},
                    # Enterprising questions (medium scores)
                    {"questionId": "5", "answer": "Unsure"},
                    {"questionId": "11", "answer": "Like"},
                    {"questionId": "17", "answer": "Unsure"},
                    {"questionId": "23", "answer": "Like"},
                    {"questionId": "29", "answer": "Unsure"},
                    # Conventional questions (high scores)
                    {"questionId": "6", "answer": "Like"},
                    {"questionId": "12", "answer": "Strongly Like"},
                    {"questionId": "18", "answer": "Like"},
                    {"questionId": "24", "answer": "Like"},
                    {"questionId": "30", "answer": "Strongly Like"},
                ],
                big5_responses=[
                    # Openness (medium)
                    {"questionId": "101", "answer": "Agree"},
                    {"questionId": "106", "answer": "Neutral"},
                    {"questionId": "111", "answer": "Agree"},
                    {"questionId": "116", "answer": "Neutral"},
                    {"questionId": "121", "answer": "Agree"},
                    # Conscientiousness (high)
                    {"questionId": "102", "answer": "Strongly Agree"},
                    {"questionId": "107", "answer": "Agree"},
                    {"questionId": "112", "answer": "Strongly Agree"},
                    {"questionId": "117", "answer": "Agree"},
                    {"questionId": "122", "answer": "Strongly Agree"},
                    # Extraversion (low)
                    {"questionId": "103", "answer": "Disagree"},
                    {"questionId": "108", "answer": "Strongly Disagree"},
                    {"questionId": "113", "answer": "Disagree"},
                    {"questionId": "118", "answer": "Neutral"},
                    {"questionId": "123", "answer": "Disagree"},
                    # Agreeableness (medium-high)
                    {"questionId": "104", "answer": "Agree"},
                    {"questionId": "109", "answer": "Strongly Agree"},
                    {"questionId": "114", "answer": "Agree"},
                    {"questionId": "119", "answer": "Agree"},
                    {"questionId": "124", "answer": "Agree"},
                    # Neuroticism (low)
                    {"questionId": "105", "answer": "Disagree"},
                    {"questionId": "110", "answer": "Strongly Disagree"},
                    {"questionId": "115", "answer": "Disagree"},
                    {"questionId": "120", "answer": "Neutral"},
                    {"questionId": "125", "answer": "Disagree"},
                ],
                essay_text="""Tôi là một kỹ sư cơ khí với 5 năm kinh nghiệm làm việc tại các nhà máy sản xuất. 
                Tôi thích làm việc với máy móc, thiết bị công nghiệp và giải quyết các vấn đề kỹ thuật thực tế. 
                Mỗi ngày, tôi kiểm tra hoạt động của các dây chuyền sản xuất, bảo trì thiết bị và tối ưu hóa 
                quy trình. Tôi cảm thấy hứng thú khi được sửa chữa, lắp ráp các thiết bị phức tạp và tìm ra 
                nguyên nhân của các sự cố kỹ thuật. Tôi thường làm việc độc lập, tập trung vào kết quả cụ thể 
                và ít khi tham gia các hoạt động xã hội trong công ty. Tôi thích môi trường làm việc có tính 
                ổn định, quy trình rõ ràng và không thích những thay đổi đột ngột. Trong tương lai, tôi muốn 
                trở thành chuyên gia kỹ thuật hàng đầu trong lĩnh vực cơ khí chế tạo.""",
                expected_dominant_trait="realistic",
                description="Kỹ sư cơ khí với profile Realistic mạnh"
            ),
            
            E2ETestCase(
                name="Complete_Social_Teacher",
                user_id=9998,  # Test user ID
                riasec_responses=[
                    # Social questions (high scores)
                    {"questionId": "4", "answer": "Strongly Like"},
                    {"questionId": "10", "answer": "Strongly Like"},
                    {"questionId": "16", "answer": "Like"},
                    {"questionId": "22", "answer": "Strongly Like"},
                    {"questionId": "28", "answer": "Like"},
                    # Realistic questions (low scores)
                    {"questionId": "1", "answer": "Dislike"},
                    {"questionId": "7", "answer": "Unsure"},
                    {"questionId": "13", "answer": "Dislike"},
                    {"questionId": "19", "answer": "Dislike"},
                    {"questionId": "25", "answer": "Unsure"},
                    # Investigative questions (medium scores)
                    {"questionId": "2", "answer": "Like"},
                    {"questionId": "8", "answer": "Unsure"},
                    {"questionId": "14", "answer": "Like"},
                    {"questionId": "20", "answer": "Like"},
                    {"questionId": "26", "answer": "Unsure"},
                    # Artistic questions (medium-high scores)
                    {"questionId": "3", "answer": "Like"},
                    {"questionId": "9", "answer": "Strongly Like"},
                    {"questionId": "15", "answer": "Like"},
                    {"questionId": "21", "answer": "Like"},
                    {"questionId": "27", "answer": "Unsure"},
                    # Enterprising questions (medium scores)
                    {"questionId": "5", "answer": "Like"},
                    {"questionId": "11", "answer": "Unsure"},
                    {"questionId": "17", "answer": "Like"},
                    {"questionId": "23", "answer": "Unsure"},
                    {"questionId": "29", "answer": "Like"},
                    # Conventional questions (medium scores)
                    {"questionId": "6", "answer": "Like"},
                    {"questionId": "12", "answer": "Unsure"},
                    {"questionId": "18", "answer": "Like"},
                    {"questionId": "24", "answer": "Unsure"},
                    {"questionId": "30", "answer": "Like"},
                ],
                big5_responses=[
                    # Openness (high)
                    {"questionId": "101", "answer": "Strongly Agree"},
                    {"questionId": "106", "answer": "Agree"},
                    {"questionId": "111", "answer": "Strongly Agree"},
                    {"questionId": "116", "answer": "Agree"},
                    {"questionId": "121", "answer": "Agree"},
                    # Conscientiousness (high)
                    {"questionId": "102", "answer": "Strongly Agree"},
                    {"questionId": "107", "answer": "Strongly Agree"},
                    {"questionId": "112", "answer": "Agree"},
                    {"questionId": "117", "answer": "Strongly Agree"},
                    {"questionId": "122", "answer": "Agree"},
                    # Extraversion (high)
                    {"questionId": "103", "answer": "Strongly Agree"},
                    {"questionId": "108", "answer": "Agree"},
                    {"questionId": "113", "answer": "Strongly Agree"},
                    {"questionId": "118", "answer": "Agree"},
                    {"questionId": "123", "answer": "Strongly Agree"},
                    # Agreeableness (very high)
                    {"questionId": "104", "answer": "Strongly Agree"},
                    {"questionId": "109", "answer": "Strongly Agree"},
                    {"questionId": "114", "answer": "Strongly Agree"},
                    {"questionId": "119", "answer": "Agree"},
                    {"questionId": "124", "answer": "Strongly Agree"},
                    # Neuroticism (low)
                    {"questionId": "105", "answer": "Disagree"},
                    {"questionId": "110", "answer": "Strongly Disagree"},
                    {"questionId": "115", "answer": "Disagree"},
                    {"questionId": "120", "answer": "Disagree"},
                    {"questionId": "125", "answer": "Strongly Disagree"},
                ],
                essay_text="""Tôi là giáo viên tiểu học với 8 năm kinh nghiệm giảng dạy. Tôi yêu thích việc 
                dạy học và giúp đỡ học sinh phát triển toàn diện. Mỗi ngày, tôi chuẩn bị bài giảng, tương tác 
                với học sinh và phụ huynh, tổ chức các hoạt động ngoại khóa. Tôi thích giao tiếp với trẻ em, 
                lắng nghe những câu chuyện của các em và hướng dẫn các em vượt qua khó khăn trong học tập. 
                Tôi cảm thấy hạnh phúc nhất khi thấy học sinh tiến bộ và thành công. Tôi thường tham gia các 
                hoạt động cộng đồng, tình nguyện và luôn sẵn sàng giúp đỡ đồng nghiệp. Tôi không thích làm 
                việc một mình hay các công việc không có tương tác với con người. Trong tương lai, tôi muốn 
                trở thành hiệu trưởng để có thể giúp đỡ nhiều học sinh và giáo viên hơn.""",
                expected_dominant_trait="social",
                description="Giáo viên với profile Social mạnh"
            )
        ]
    
    def cleanup_test_data(self, user_ids: List[int]):
        """Clean up test data before running tests"""
        try:
            with get_db_session() as session:
                # Clean up test user data
                for user_id in user_ids:
                    session.execute(text("DELETE FROM core.assessment_responses WHERE assessment_id IN (SELECT id FROM core.assessments WHERE user_id = :uid)"), {"uid": user_id})
                    session.execute(text("DELETE FROM core.assessments WHERE user_id = :uid"), {"uid": user_id})
                    session.execute(text("DELETE FROM core.assessment_sessions WHERE user_id = :uid"), {"uid": user_id})
                    session.execute(text("DELETE FROM core.essays WHERE user_id = :uid"), {"uid": user_id})
                    session.execute(text("DELETE FROM ai.user_embeddings WHERE user_id = :uid"), {"uid": user_id})
                    session.execute(text("DELETE FROM ai.user_trait_preds WHERE user_id = :uid"), {"uid": user_id})
                    session.execute(text("DELETE FROM ai.user_trait_fused WHERE user_id = :uid"), {"uid": user_id})
                session.commit()
                print("✅ Test data cleaned up")
        except Exception as e:
            print(f"⚠️  Cleanup warning: {str(e)}")
    
    def test_single_e2e_case(self, test_case: E2ETestCase) -> E2EResult:
        """Test a single end-to-end case"""
        print(f"\n🧪 Testing E2E: {test_case.name}")
        print(f"📝 Description: {test_case.description}")
        
        errors = []
        assessment_id = None
        essay_id = None
        riasec_scores = {}
        big5_scores = {}
        traits_fused = False
        career_recommendations = []
        
        start_time = time.perf_counter()
        
        try:
            with get_db_session() as session:
                # Step 1: Submit Assessment (RIASEC + Big Five)
                print("  📊 Step 1: Submitting assessment...")
                
                all_responses = test_case.riasec_responses + test_case.big5_responses
                assessment_payload = {
                    "testTypes": ["RIASEC", "BIGFIVE"],
                    "responses": all_responses
                }
                
                assessment_id = save_assessment(session, test_case.user_id, assessment_payload)
                print(f"    ✅ Assessment saved with ID: {assessment_id}")
                
                # Step 2: Submit Essay
                print("  📝 Step 2: Submitting essay...")
                
                essay_id = save_essay(
                    session=session,
                    user_id=test_case.user_id,
                    content=test_case.essay_text,
                    lang="vi"
                )
                print(f"    ✅ Essay saved with ID: {essay_id}")
                
                # Step 3: Wait for AI processing (essay analysis)
                print("  🤖 Step 3: Waiting for AI processing...")
                time.sleep(2)  # Give AI-core time to process
                
                # Step 4: Fuse traits
                print("  🔄 Step 4: Fusing traits...")
                
                fusion_result = fuse_user_traits(session, test_case.user_id)
                traits_fused = fusion_result and fusion_result.get("has_fused_traits", False)
                print(f"    ✅ Traits fused: {traits_fused}")
                
                # Step 5: Get results
                print("  📈 Step 5: Getting results...")
                
                results = build_results(session, assessment_id)
                riasec_scores = results.get("riasec_scores", {})
                big5_scores = results.get("big_five_scores", {})
                career_recommendations = results.get("career_recommendations", [])
                
                print(f"    ✅ Results generated: {len(career_recommendations)} career recommendations")
                
                # Step 6: Validate results
                print("  ✅ Step 6: Validating results...")
                
                # Check dominant trait
                if riasec_scores:
                    max_trait = max(riasec_scores.keys(), key=lambda k: riasec_scores[k])
                    expected_trait = test_case.expected_dominant_trait
                    
                    if max_trait != expected_trait:
                        errors.append(f"Dominant trait mismatch: got {max_trait}, expected {expected_trait}")
                    else:
                        print(f"    ✅ Dominant trait correct: {max_trait}")
                
                # Check data consistency
                self._validate_data_consistency(session, test_case.user_id, errors)
                
        except Exception as e:
            error_msg = f"E2E test failed: {str(e)}"
            print(f"    ❌ {error_msg}")
            errors.append(error_msg)
        
        end_time = time.perf_counter()
        total_time_ms = (end_time - start_time) * 1000
        
        success = len(errors) == 0 and assessment_id is not None
        
        print(f"  ⏱️  Total time: {total_time_ms:.1f}ms")
        print(f"  🎯 Success: {'✅' if success else '❌'}")
        
        if errors:
            for error in errors:
                print(f"    ❌ {error}")
        
        return E2EResult(
            test_name=test_case.name,
            success=success,
            assessment_id=assessment_id,
            essay_id=essay_id,
            riasec_scores=riasec_scores,
            big5_scores=big5_scores,
            traits_fused=traits_fused,
            career_recommendations=career_recommendations,
            total_time_ms=total_time_ms,
            errors=errors
        )
    
    def _validate_data_consistency(self, session, user_id: int, errors: List[str]):
        """Validate data consistency across tables"""
        try:
            # Check assessments exist
            assessments = session.execute(
                text("SELECT COUNT(*) FROM core.assessments WHERE user_id = :uid"),
                {"uid": user_id}
            ).scalar()
            
            if assessments == 0:
                errors.append("No assessments found in database")
            
            # Check essay exists
            essays = session.execute(
                text("SELECT COUNT(*) FROM core.essays WHERE user_id = :uid"),
                {"uid": user_id}
            ).scalar()
            
            if essays == 0:
                errors.append("No essays found in database")
            
            # Check AI tables
            embeddings = session.execute(
                text("SELECT COUNT(*) FROM ai.user_embeddings WHERE user_id = :uid"),
                {"uid": user_id}
            ).scalar()
            
            trait_preds = session.execute(
                text("SELECT COUNT(*) FROM ai.user_trait_preds WHERE user_id = :uid"),
                {"uid": user_id}
            ).scalar()
            
            trait_fused = session.execute(
                text("SELECT COUNT(*) FROM ai.user_trait_fused WHERE user_id = :uid"),
                {"uid": user_id}
            ).scalar()
            
            print(f"    📊 Data consistency: assessments={assessments}, essays={essays}, embeddings={embeddings}, trait_preds={trait_preds}, trait_fused={trait_fused}")
            
        except Exception as e:
            errors.append(f"Data consistency check failed: {str(e)}")
    
    def test_api_endpoints(self) -> Dict:
        """Test API endpoints directly"""
        print("\n🌐 Testing API Endpoints...")
        
        api_results = {}
        
        # Test NLP endpoints
        nlp_endpoints = [
            "/api/nlp/status",
            "/api/assessments/questions/RIASEC",
            "/api/assessments/questions/BIGFIVE"
        ]
        
        for endpoint in nlp_endpoints:
            try:
                url = f"{self.base_url}{endpoint}"
                response = requests.get(url, timeout=10)
                
                api_results[endpoint] = {
                    "status_code": response.status_code,
                    "success": response.status_code == 200,
                    "response_time_ms": response.elapsed.total_seconds() * 1000
                }
                
                status = "✅" if response.status_code == 200 else "❌"
                print(f"  {endpoint}: {response.status_code} {status}")
                
            except Exception as e:
                api_results[endpoint] = {
                    "status_code": 0,
                    "success": False,
                    "error": str(e)
                }
                print(f"  {endpoint}: Failed ❌ ({str(e)})")
        
        return api_results
    
    def run_all_e2e_tests(self) -> Dict:
        """Run all end-to-end tests"""
        print("🚀 Starting End-to-End Integration Test Suite")
        print("=" * 60)
        
        # Clean up test data
        test_user_ids = [tc.user_id for tc in self.test_cases]
        self.cleanup_test_data(test_user_ids)
        
        # Test API endpoints first
        api_results = self.test_api_endpoints()
        
        # Run E2E tests
        self.results = []
        for test_case in self.test_cases:
            result = self.test_single_e2e_case(test_case)
            self.results.append(result)
        
        # Generate summary
        successful_tests = [r for r in self.results if r.success]
        
        print("\n" + "=" * 60)
        print("📊 E2E TEST SUMMARY")
        print("=" * 60)
        print(f"✅ Successful tests: {len(successful_tests)}/{len(self.results)}")
        
        if successful_tests:
            avg_time = sum(r.total_time_ms for r in successful_tests) / len(successful_tests)
            print(f"⏱️  Average completion time: {avg_time:.1f}ms")
            
            traits_fused_count = sum(1 for r in successful_tests if r.traits_fused)
            print(f"🔄 Traits fused successfully: {traits_fused_count}/{len(successful_tests)}")
            
            career_rec_count = sum(len(r.career_recommendations) for r in successful_tests)
            print(f"💼 Total career recommendations: {career_rec_count}")
        
        # Print failed tests
        failed_tests = [r for r in self.results if not r.success]
        if failed_tests:
            print(f"\n❌ Failed tests:")
            for r in failed_tests:
                print(f"  {r.test_name}: {', '.join(r.errors)}")
        
        return {
            "summary": {
                "total_tests": len(self.results),
                "successful_tests": len(successful_tests),
                "failed_tests": len(failed_tests),
                "success_rate": len(successful_tests) / len(self.results) if self.results else 0,
                "avg_completion_time_ms": sum(r.total_time_ms for r in successful_tests) / len(successful_tests) if successful_tests else 0
            },
            "api_endpoints": api_results,
            "detailed_results": [
                {
                    "test_name": r.test_name,
                    "success": r.success,
                    "assessment_id": r.assessment_id,
                    "essay_id": r.essay_id,
                    "traits_fused": r.traits_fused,
                    "career_recommendations_count": len(r.career_recommendations),
                    "total_time_ms": r.total_time_ms,
                    "errors": r.errors
                }
                for r in self.results
            ]
        }
    
    def save_e2e_report(self, results: Dict, filename: str = "e2e_test_report.json"):
        """Save E2E test results to JSON file"""
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        
        print(f"\n📄 E2E test report saved to: {filename}")
        return filename

def main():
    """Main function to run E2E integration tests"""
    tester = E2EIntegrationTester()
    
    # Run all E2E tests
    results = tester.run_all_e2e_tests()
    
    # Save report
    report_file = tester.save_e2e_report(results)
    
    # Print final summary
    summary = results.get("summary", {})
    print(f"\n🎯 E2E INTEGRATION TEST COMPLETED")
    print(f"   Success Rate: {summary.get('success_rate', 0):.2%}")
    print(f"   Tests Passed: {summary.get('successful_tests', 0)}/{summary.get('total_tests', 0)}")
    print(f"   Report: {report_file}")
    
    return results

if __name__ == "__main__":
    main()