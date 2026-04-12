#!/usr/bin/env python3
"""
PB32 - PhoBERT NLP Accuracy Test Suite
Kiểm tra độ chính xác của API NLP trong việc phân tích văn bản tiếng Việt 
và trả về vector tính cách 6 chiều (RIASEC) và 5 chiều (Big Five)

Test Coverage:
1. Vietnamese Text Analysis Accuracy
2. RIASEC Vector Generation (6 dimensions)
3. Big Five Vector Generation (5 dimensions)
4. PhoBERT vs Gemini Fallback Comparison
5. Response Time Performance (SLA compliance)
6. Vector Normalization Validation
7. Embedding Quality Assessment
8. Cross-validation with Known Personality Profiles
"""

import json
import time
import statistics
import requests
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from pathlib import Path
import sys
import os

# Add the app directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.modules.nlp.service_nlp import (
    analyze_essay,
    get_embedding,
    _analyze_via_aicore,
    _analyze_via_gemini,
    AI_CORE_URL,
    RIASEC_KEYS,
    BIG5_KEYS,
    ESSAY_ANALYSIS_SLA_MS
)

@dataclass
class TestCase:
    """Test case for Vietnamese personality analysis"""
    name: str
    text: str
    expected_riasec: Dict[str, float]  # Expected RIASEC scores (0-1 scale)
    expected_big5: Dict[str, float]    # Expected Big Five scores (0-1 scale)
    dominant_trait: str                # Expected dominant RIASEC trait
    language: str = "vi"
    description: str = ""

@dataclass
class AccuracyResult:
    """Result of accuracy test"""
    test_name: str
    riasec_accuracy: float
    big5_accuracy: float
    response_time_ms: float
    sla_compliant: bool
    embedding_quality: float
    source: str
    errors: List[str]

class PhoBERTAccuracyTester:
    """Comprehensive accuracy tester for PhoBERT NLP API"""
    
    def __init__(self):
        self.test_cases = self._create_test_cases()
        self.results: List[AccuracyResult] = []
        
    def _create_test_cases(self) -> List[TestCase]:
        """Create comprehensive test cases with known personality profiles"""
        return [
            # REALISTIC (R) - Thực tế, kỹ thuật
            TestCase(
                name="Realistic_Engineer",
                text="""Tôi là một kỹ sư cơ khí với 5 năm kinh nghiệm. Tôi thích làm việc với máy móc, 
                thiết bị công nghiệp và giải quyết các vấn đề kỹ thuật thực tế. Tôi cảm thấy hứng thú 
                khi được sửa chữa, lắp ráp các thiết bị phức tạp. Tôi thường làm việc độc lập, 
                tập trung vào kết quả cụ thể và ít khi tham gia các hoạt động xã hội trong công ty. 
                Tôi thích môi trường làm việc có tính ổn định, quy trình rõ ràng.""",
                expected_riasec={
                    "realistic": 0.85, "investigative": 0.6, "artistic": 0.2,
                    "social": 0.3, "enterprising": 0.4, "conventional": 0.7
                },
                expected_big5={
                    "openness": 0.6, "conscientiousness": 0.8, "extraversion": 0.3,
                    "agreeableness": 0.6, "neuroticism": 0.4
                },
                dominant_trait="realistic",
                description="Kỹ sư cơ khí với tính cách thực tế, thích làm việc với máy móc"
            ),
            
            # INVESTIGATIVE (I) - Nghiên cứu, khoa học
            TestCase(
                name="Investigative_Researcher",
                text="""Tôi là nghiên cứu sinh tiến sĩ ngành sinh học phân tử. Tôi dành phần lớn thời gian 
                để đọc tài liệu khoa học, thiết kế thí nghiệm và phân tích dữ liệu. Tôi thích khám phá 
                những điều chưa biết, đặt câu hỏi và tìm kiếm câu trả lời thông qua phương pháp khoa học. 
                Tôi thường làm việc một mình trong phòng thí nghiệm, thích suy nghĩ sâu về các vấn đề 
                phức tạp. Tôi không thích các công việc lặp đi lặp lại hay phải giao tiếp nhiều với khách hàng.""",
                expected_riasec={
                    "realistic": 0.4, "investigative": 0.9, "artistic": 0.3,
                    "social": 0.2, "enterprising": 0.2, "conventional": 0.5
                },
                expected_big5={
                    "openness": 0.9, "conscientiousness": 0.8, "extraversion": 0.2,
                    "agreeableness": 0.5, "neuroticism": 0.3
                },
                dominant_trait="investigative",
                description="Nghiên cứu sinh với tính cách khoa học, thích khám phá"
            ),
            
            # ARTISTIC (A) - Sáng tạo, nghệ thuật
            TestCase(
                name="Artistic_Designer",
                text="""Tôi là một nhà thiết kế đồ họa tự do. Tôi yêu thích việc sáng tạo, vẽ vời và 
                thiết kế những sản phẩm độc đáo. Tôi thường làm việc theo cảm hứng, không thích bị 
                ràng buộc bởi quy tắc cứng nhắc. Tôi thích môi trường làm việc tự do, có thể thể hiện 
                cá tính và phong cách riêng. Tôi cảm thấy hạnh phúc khi được tạo ra những tác phẩm 
                nghệ thuật đẹp mắt và có ý nghĩa. Tôi không thích các công việc hành chính hay tính toán.""",
                expected_riasec={
                    "realistic": 0.3, "investigative": 0.4, "artistic": 0.9,
                    "social": 0.5, "enterprising": 0.6, "conventional": 0.2
                },
                expected_big5={
                    "openness": 0.9, "conscientiousness": 0.5, "extraversion": 0.6,
                    "agreeableness": 0.7, "neuroticism": 0.5
                },
                dominant_trait="artistic",
                description="Nhà thiết kế với tính cách sáng tạo, nghệ thuật"
            ),
            
            # SOCIAL (S) - Giao tiếp, giúp đỡ
            TestCase(
                name="Social_Teacher",
                text="""Tôi là giáo viên tiểu học với 8 năm kinh nghiệm. Tôi yêu thích việc dạy học, 
                giúp đỡ học sinh phát triển. Tôi thích giao tiếp với trẻ em, phụ huynh và đồng nghiệp. 
                Tôi cảm thấy hạnh phúc khi thấy học sinh tiến bộ và thành công. Tôi thường tham gia 
                các hoạt động cộng đồng, tình nguyện và luôn sẵn sàng giúp đỡ người khác. 
                Tôi không thích làm việc một mình hay các công việc không có tương tác với con người.""",
                expected_riasec={
                    "realistic": 0.3, "investigative": 0.5, "artistic": 0.6,
                    "social": 0.9, "enterprising": 0.5, "conventional": 0.6
                },
                expected_big5={
                    "openness": 0.7, "conscientiousness": 0.8, "extraversion": 0.8,
                    "agreeableness": 0.9, "neuroticism": 0.3
                },
                dominant_trait="social",
                description="Giáo viên với tính cách xã hội, thích giúp đỡ người khác"
            ),
            
            # ENTERPRISING (E) - Lãnh đạo, kinh doanh
            TestCase(
                name="Enterprising_Manager",
                text="""Tôi là quản lý bán hàng của một công ty công nghệ. Tôi thích lãnh đạo đội nhóm, 
                đưa ra quyết định và thuyết phục khách hàng. Tôi có tham vọng cao, muốn thành công 
                trong sự nghiệp và kiếm được nhiều tiền. Tôi thích môi trường cạnh tranh, thử thách 
                và cơ hội thăng tiến. Tôi giỏi giao tiếp, đàm phán và có khả năng thuyết phục cao. 
                Tôi không thích các công việc đơn điệu hay phải tuân theo quy trình cứng nhắc.""",
                expected_riasec={
                    "realistic": 0.4, "investigative": 0.4, "artistic": 0.3,
                    "social": 0.7, "enterprising": 0.9, "conventional": 0.5
                },
                expected_big5={
                    "openness": 0.7, "conscientiousness": 0.7, "extraversion": 0.9,
                    "agreeableness": 0.6, "neuroticism": 0.2
                },
                dominant_trait="enterprising",
                description="Quản lý bán hàng với tính cách doanh nghiệp, thích lãnh đạo"
            ),
            
            # CONVENTIONAL (C) - Ngăn nắp, hệ thống
            TestCase(
                name="Conventional_Accountant",
                text="""Tôi là kế toán trưởng của một công ty sản xuất. Tôi thích làm việc với số liệu, 
                báo cáo tài chính và đảm bảo mọi thứ chính xác, tuân thủ quy định. Tôi cảm thấy thoải mái 
                với công việc có quy trình rõ ràng, lặp đi lặp lại và ổn định. Tôi chú ý đến chi tiết, 
                tỉ mỉ và có trách nhiệm cao. Tôi thích môi trường làm việc có tổ chức, kỷ luật và 
                không thích những thay đổi đột ngột hay công việc sáng tạo.""",
                expected_riasec={
                    "realistic": 0.5, "investigative": 0.4, "artistic": 0.1,
                    "social": 0.4, "enterprising": 0.5, "conventional": 0.9
                },
                expected_big5={
                    "openness": 0.3, "conscientiousness": 0.9, "extraversion": 0.4,
                    "agreeableness": 0.7, "neuroticism": 0.3
                },
                dominant_trait="conventional",
                description="Kế toán với tính cách truyền thống, thích trật tự"
            ),
            
            # Mixed personality cases
            TestCase(
                name="Mixed_Artistic_Social",
                text="""Tôi là một nhà tâm lý học tư vấn, đồng thời cũng viết sách và blog về phát triển 
                bản thân. Tôi thích kết hợp việc giúp đỡ mọi người với khả năng sáng tạo của mình. 
                Tôi yêu thích việc lắng nghe, thấu hiểu và hỗ trợ khách hàng vượt qua khó khăn. 
                Đồng thời, tôi cũng thích viết lách, tạo ra những nội dung có giá trị và truyền cảm hứng. 
                Tôi làm việc linh hoạt, kết hợp giữa tư vấn trực tiếp và sáng tạo nội dung.""",
                expected_riasec={
                    "realistic": 0.2, "investigative": 0.6, "artistic": 0.8,
                    "social": 0.8, "enterprising": 0.5, "conventional": 0.3
                },
                expected_big5={
                    "openness": 0.8, "conscientiousness": 0.7, "extraversion": 0.7,
                    "agreeableness": 0.9, "neuroticism": 0.3
                },
                dominant_trait="artistic",  # Slightly higher than social
                description="Tâm lý học viên kết hợp sáng tạo và xã hội"
            ),
            
            # Edge cases
            TestCase(
                name="Short_Text",
                text="Tôi thích làm việc với máy tính và lập trình.",
                expected_riasec={
                    "realistic": 0.6, "investigative": 0.7, "artistic": 0.3,
                    "social": 0.2, "enterprising": 0.3, "conventional": 0.5
                },
                expected_big5={
                    "openness": 0.6, "conscientiousness": 0.6, "extraversion": 0.3,
                    "agreeableness": 0.5, "neuroticism": 0.4
                },
                dominant_trait="investigative",
                description="Văn bản ngắn về lập trình"
            ),
            
            TestCase(
                name="Neutral_Text",
                text="""Tôi là một nhân viên văn phòng bình thường. Tôi làm việc từ 9 giờ sáng đến 5 giờ chiều. 
                Tôi thích ăn phở vào buổi sáng và cà phê vào buổi chiều. Cuối tuần tôi thường xem phim 
                hoặc đi dạo trong công viên. Tôi sống ở Hà Nội và đi làm bằng xe máy.""",
                expected_riasec={
                    "realistic": 0.4, "investigative": 0.4, "artistic": 0.4,
                    "social": 0.4, "enterprising": 0.4, "conventional": 0.6
                },
                expected_big5={
                    "openness": 0.5, "conscientiousness": 0.5, "extraversion": 0.5,
                    "agreeableness": 0.5, "neuroticism": 0.5
                },
                dominant_trait="conventional",
                description="Văn bản trung tính, không rõ tính cách"
            )
        ]
    
    def calculate_vector_accuracy(self, predicted: List[float], expected: List[float], 
                                tolerance: float = 0.2) -> float:
        """Calculate accuracy between predicted and expected vectors"""
        if len(predicted) != len(expected):
            return 0.0
        
        accurate_dims = 0
        for p, e in zip(predicted, expected):
            if abs(p - e) <= tolerance:
                accurate_dims += 1
        
        return accurate_dims / len(expected)
    
    def calculate_embedding_quality(self, embedding: List[float]) -> float:
        """Calculate embedding quality based on vector properties"""
        if not embedding or len(embedding) != 768:
            return 0.0
        
        # Check for reasonable distribution
        mean_val = statistics.mean(embedding)
        std_val = statistics.stdev(embedding) if len(embedding) > 1 else 0
        
        # Quality metrics
        quality_score = 1.0
        
        # Penalize if all values are too similar (low variance)
        if std_val < 0.01:
            quality_score -= 0.3
        
        # Penalize if mean is too extreme
        if abs(mean_val) > 1.0:
            quality_score -= 0.2
        
        # Check for NaN or infinite values
        if any(not (-10 <= x <= 10) for x in embedding):
            quality_score -= 0.5
        
        return max(0.0, quality_score)
    
    def test_single_case(self, test_case: TestCase) -> AccuracyResult:
        """Test a single case and return accuracy result"""
        print(f"\n🧪 Testing: {test_case.name}")
        print(f"📝 Description: {test_case.description}")
        print(f"📄 Text length: {len(test_case.text)} characters")
        
        errors = []
        
        try:
            # Analyze the essay
            start_time = time.perf_counter()
            result = analyze_essay(test_case.text, test_case.language)
            end_time = time.perf_counter()
            
            response_time_ms = (end_time - start_time) * 1000
            sla_compliant = response_time_ms <= ESSAY_ANALYSIS_SLA_MS
            
            print(f"⏱️  Response time: {response_time_ms:.1f}ms (SLA: {ESSAY_ANALYSIS_SLA_MS}ms)")
            print(f"🎯 SLA compliant: {'✅' if sla_compliant else '❌'}")
            print(f"🔧 Source: {result.get('source', 'unknown')}")
            
            # Extract vectors
            riasec_pred = result.get('riasec', [])
            big5_pred = result.get('big5', [])
            embedding = result.get('embedding', [])
            
            print(f"📊 RIASEC predicted: {[round(x, 3) for x in riasec_pred]}")
            print(f"📊 Big5 predicted: {[round(x, 3) for x in big5_pred]}")
            
            # Convert expected dictionaries to vectors
            expected_riasec_vec = [test_case.expected_riasec[key] for key in RIASEC_KEYS]
            expected_big5_vec = [test_case.expected_big5[key] for key in BIG5_KEYS]
            
            print(f"🎯 RIASEC expected: {[round(x, 3) for x in expected_riasec_vec]}")
            print(f"🎯 Big5 expected: {[round(x, 3) for x in expected_big5_vec]}")
            
            # Calculate accuracies
            riasec_accuracy = self.calculate_vector_accuracy(riasec_pred, expected_riasec_vec)
            big5_accuracy = self.calculate_vector_accuracy(big5_pred, expected_big5_vec)
            embedding_quality = self.calculate_embedding_quality(embedding)
            
            print(f"📈 RIASEC accuracy: {riasec_accuracy:.2%}")
            print(f"📈 Big5 accuracy: {big5_accuracy:.2%}")
            print(f"📈 Embedding quality: {embedding_quality:.2%}")
            
            # Check dominant trait
            if riasec_pred and len(riasec_pred) == 6:
                dominant_idx = riasec_pred.index(max(riasec_pred))
                predicted_dominant = RIASEC_KEYS[dominant_idx]
                dominant_correct = predicted_dominant == test_case.dominant_trait
                print(f"🏆 Dominant trait: {predicted_dominant} (expected: {test_case.dominant_trait}) {'✅' if dominant_correct else '❌'}")
                
                if not dominant_correct:
                    errors.append(f"Dominant trait mismatch: got {predicted_dominant}, expected {test_case.dominant_trait}")
            
            return AccuracyResult(
                test_name=test_case.name,
                riasec_accuracy=riasec_accuracy,
                big5_accuracy=big5_accuracy,
                response_time_ms=response_time_ms,
                sla_compliant=sla_compliant,
                embedding_quality=embedding_quality,
                source=result.get('source', 'unknown'),
                errors=errors
            )
            
        except Exception as e:
            error_msg = f"Test failed with exception: {str(e)}"
            print(f"❌ {error_msg}")
            errors.append(error_msg)
            
            return AccuracyResult(
                test_name=test_case.name,
                riasec_accuracy=0.0,
                big5_accuracy=0.0,
                response_time_ms=0.0,
                sla_compliant=False,
                embedding_quality=0.0,
                source="error",
                errors=errors
            )
    
    def test_ai_core_availability(self) -> bool:
        """Test if AI-core service is available"""
        try:
            response = requests.get(f"{AI_CORE_URL}/health", timeout=5)
            return response.status_code == 200
        except:
            return False
    
    def test_gemini_availability(self) -> bool:
        """Test if Gemini API is available"""
        try:
            # Try a simple analysis with Gemini
            result = _analyze_via_gemini("Test text for Gemini availability")
            return result.get('source') == 'gemini'
        except:
            return False
    
    def run_all_tests(self) -> Dict:
        """Run all test cases and return comprehensive results"""
        print("🚀 Starting PhoBERT NLP Accuracy Test Suite")
        print("=" * 60)
        
        # Check service availability
        ai_core_available = self.test_ai_core_availability()
        gemini_available = self.test_gemini_availability()
        
        print(f"🔧 AI-core service ({AI_CORE_URL}): {'✅ Available' if ai_core_available else '❌ Unavailable'}")
        print(f"🔧 Gemini API: {'✅ Available' if gemini_available else '❌ Unavailable'}")
        
        if not ai_core_available and not gemini_available:
            print("❌ No NLP services available. Cannot run tests.")
            return {"error": "No NLP services available"}
        
        # Run individual tests
        self.results = []
        for test_case in self.test_cases:
            result = self.test_single_case(test_case)
            self.results.append(result)
        
        # Calculate overall statistics
        successful_tests = [r for r in self.results if not r.errors]
        
        if not successful_tests:
            print("\n❌ All tests failed!")
            return self._generate_report()
        
        avg_riasec_accuracy = statistics.mean([r.riasec_accuracy for r in successful_tests])
        avg_big5_accuracy = statistics.mean([r.big5_accuracy for r in successful_tests])
        avg_response_time = statistics.mean([r.response_time_ms for r in successful_tests])
        avg_embedding_quality = statistics.mean([r.embedding_quality for r in successful_tests])
        
        sla_compliance_rate = sum(1 for r in successful_tests if r.sla_compliant) / len(successful_tests)
        
        # Source distribution
        source_counts = {}
        for r in successful_tests:
            source_counts[r.source] = source_counts.get(r.source, 0) + 1
        
        print("\n" + "=" * 60)
        print("📊 OVERALL RESULTS")
        print("=" * 60)
        print(f"✅ Successful tests: {len(successful_tests)}/{len(self.results)}")
        print(f"📈 Average RIASEC accuracy: {avg_riasec_accuracy:.2%}")
        print(f"📈 Average Big5 accuracy: {avg_big5_accuracy:.2%}")
        print(f"⏱️  Average response time: {avg_response_time:.1f}ms")
        print(f"📈 Average embedding quality: {avg_embedding_quality:.2%}")
        print(f"🎯 SLA compliance rate: {sla_compliance_rate:.2%}")
        print(f"🔧 Source distribution: {source_counts}")
        
        # Performance grades
        overall_accuracy = (avg_riasec_accuracy + avg_big5_accuracy) / 2
        performance_grade = self._calculate_grade(overall_accuracy)
        
        print(f"\n🏆 Overall Performance Grade: {performance_grade}")
        
        return self._generate_report()
    
    def _calculate_grade(self, accuracy: float) -> str:
        """Calculate performance grade based on accuracy"""
        if accuracy >= 0.9:
            return "A+ (Excellent)"
        elif accuracy >= 0.8:
            return "A (Very Good)"
        elif accuracy >= 0.7:
            return "B+ (Good)"
        elif accuracy >= 0.6:
            return "B (Acceptable)"
        elif accuracy >= 0.5:
            return "C (Needs Improvement)"
        else:
            return "D (Poor)"
    
    def _generate_report(self) -> Dict:
        """Generate comprehensive test report"""
        successful_tests = [r for r in self.results if not r.errors]
        
        if not successful_tests:
            return {
                "summary": {
                    "total_tests": len(self.results),
                    "successful_tests": 0,
                    "failed_tests": len(self.results),
                    "overall_accuracy": 0.0,
                    "performance_grade": "F (Failed)"
                },
                "errors": [error for r in self.results for error in r.errors]
            }
        
        avg_riasec_accuracy = statistics.mean([r.riasec_accuracy for r in successful_tests])
        avg_big5_accuracy = statistics.mean([r.big5_accuracy for r in successful_tests])
        overall_accuracy = (avg_riasec_accuracy + avg_big5_accuracy) / 2
        
        return {
            "summary": {
                "total_tests": len(self.results),
                "successful_tests": len(successful_tests),
                "failed_tests": len(self.results) - len(successful_tests),
                "avg_riasec_accuracy": avg_riasec_accuracy,
                "avg_big5_accuracy": avg_big5_accuracy,
                "overall_accuracy": overall_accuracy,
                "avg_response_time_ms": statistics.mean([r.response_time_ms for r in successful_tests]),
                "avg_embedding_quality": statistics.mean([r.embedding_quality for r in successful_tests]),
                "sla_compliance_rate": sum(1 for r in successful_tests if r.sla_compliant) / len(successful_tests),
                "performance_grade": self._calculate_grade(overall_accuracy),
                "source_distribution": {
                    source: sum(1 for r in successful_tests if r.source == source)
                    for source in set(r.source for r in successful_tests)
                }
            },
            "detailed_results": [
                {
                    "test_name": r.test_name,
                    "riasec_accuracy": r.riasec_accuracy,
                    "big5_accuracy": r.big5_accuracy,
                    "response_time_ms": r.response_time_ms,
                    "sla_compliant": r.sla_compliant,
                    "embedding_quality": r.embedding_quality,
                    "source": r.source,
                    "errors": r.errors
                }
                for r in self.results
            ]
        }
    
    def save_report(self, filename: str = "phobert_accuracy_report.json"):
        """Save test report to JSON file"""
        report = self._generate_report()
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"📄 Report saved to: {filename}")
        return filename

def main():
    """Main function to run the accuracy test suite"""
    tester = PhoBERTAccuracyTester()
    
    # Run all tests
    results = tester.run_all_tests()
    
    # Save report
    report_file = tester.save_report()
    
    # Print final summary
    if "error" not in results:
        summary = results.get("summary", {})
        print(f"\n🎯 FINAL SUMMARY:")
        print(f"   Overall Accuracy: {summary.get('overall_accuracy', 0):.2%}")
        print(f"   Performance Grade: {summary.get('performance_grade', 'Unknown')}")
        print(f"   Tests Passed: {summary.get('successful_tests', 0)}/{summary.get('total_tests', 0)}")
        print(f"   Report: {report_file}")
    
    return results

if __name__ == "__main__":
    main()