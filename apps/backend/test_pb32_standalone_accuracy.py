#!/usr/bin/env python3
"""
PB32 - Standalone Accuracy Test
Kiểm tra độ chính xác của API NLP mà không phụ thuộc vào database
Chỉ test trực tiếp với service_nlp module

Test Coverage:
1. Vietnamese Text Analysis Accuracy
2. RIASEC Vector Generation (6 dimensions)
3. Big Five Vector Generation (5 dimensions)
4. PhoBERT vs Gemini Comparison
5. Response Time Performance
"""

import json
import time
import statistics
import requests
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import sys
import os

# Add the app directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

try:
    from app.modules.nlp.service_nlp import (
        analyze_essay,
        get_embedding,
        _analyze_via_aicore,
        _analyze_via_gemini,
        AI_CORE_URL,
        ESSAY_ANALYSIS_SLA_MS
    )
    
    RIASEC_KEYS = ["realistic", "investigative", "artistic", "social", "enterprising", "conventional"]
    BIG5_KEYS = ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"]
    
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure you're running from the backend directory with proper app structure")
    sys.exit(1)

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

class StandaloneAccuracyTester:
    """Standalone accuracy tester for PhoBERT NLP API"""
    
    def __init__(self):
        self.test_cases = self._create_test_cases()
        self.results: List[AccuracyResult] = []
        
    def _create_test_cases(self) -> List[TestCase]:
        """Create test cases with known personality profiles"""
        return [
            # REALISTIC (R) - Thực tế, kỹ thuật
            TestCase(
                name="Realistic_Engineer",
                text="""Tôi là một kỹ sư cơ khí với 5 năm kinh nghiệm. Tôi thích làm việc với máy móc, 
                thiết bị công nghiệp và giải quyết các vấn đề kỹ thuật thực tế. Tôi cảm thấy hứng thú 
                khi được sửa chữa, lắp ráp các thiết bị phức tạp. Tôi thường làm việc độc lập, 
                tập trung vào kết quả cụ thể và ít khi tham gia các hoạt động xã hội trong công ty.""",
                expected_riasec={
                    "realistic": 0.8, "investigative": 0.6, "artistic": 0.2,
                    "social": 0.3, "enterprising": 0.4, "conventional": 0.7
                },
                expected_big5={
                    "openness": 0.6, "conscientiousness": 0.8, "extraversion": 0.3,
                    "agreeableness": 0.6, "neuroticism": 0.4
                },
                dominant_trait="realistic",
                description="Kỹ sư cơ khí với tính cách thực tế"
            ),
            
            # INVESTIGATIVE (I) - Nghiên cứu, khoa học
            TestCase(
                name="Investigative_Researcher",
                text="""Tôi là nghiên cứu sinh tiến sĩ ngành sinh học phân tử. Tôi dành phần lớn thời gian 
                để đọc tài liệu khoa học, thiết kế thí nghiệm và phân tích dữ liệu. Tôi thích khám phá 
                những điều chưa biết, đặt câu hỏi và tìm kiếm câu trả lời thông qua phương pháp khoa học. 
                Tôi thường làm việc một mình trong phòng thí nghiệm.""",
                expected_riasec={
                    "realistic": 0.4, "investigative": 0.9, "artistic": 0.3,
                    "social": 0.2, "enterprising": 0.2, "conventional": 0.5
                },
                expected_big5={
                    "openness": 0.9, "conscientiousness": 0.8, "extraversion": 0.2,
                    "agreeableness": 0.5, "neuroticism": 0.3
                },
                dominant_trait="investigative",
                description="Nghiên cứu sinh với tính cách khoa học"
            ),
            
            # SOCIAL (S) - Giao tiếp, giúp đỡ
            TestCase(
                name="Social_Teacher",
                text="""Tôi là giáo viên tiểu học với 8 năm kinh nghiệm. Tôi yêu thích việc dạy học, 
                giúp đỡ học sinh phát triển. Tôi thích giao tiếp với trẻ em, phụ huynh và đồng nghiệp. 
                Tôi cảm thấy hạnh phúc khi thấy học sinh tiến bộ và thành công. Tôi thường tham gia 
                các hoạt động cộng đồng, tình nguyện và luôn sẵn sàng giúp đỡ người khác.""",
                expected_riasec={
                    "realistic": 0.3, "investigative": 0.5, "artistic": 0.6,
                    "social": 0.9, "enterprising": 0.5, "conventional": 0.6
                },
                expected_big5={
                    "openness": 0.7, "conscientiousness": 0.8, "extraversion": 0.8,
                    "agreeableness": 0.9, "neuroticism": 0.3
                },
                dominant_trait="social",
                description="Giáo viên với tính cách xã hội"
            )
        ]
    
    def calculate_vector_accuracy(self, predicted: List[float], expected: List[float], 
                                tolerance: float = 0.25) -> float:
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
    
    def test_service_availability(self) -> Tuple[bool, bool]:
        """Test if AI-core and Gemini services are available"""
        try:
            result = _analyze_via_aicore("Test text", "vi")
            ai_core_available = result is not None
        except:
            ai_core_available = False
        
        try:
            result = _analyze_via_gemini("Test text")
            gemini_available = result.get('source') == 'gemini'
        except:
            gemini_available = False
        
        return ai_core_available, gemini_available
    
    def run_all_tests(self) -> Dict:
        """Run all test cases and return comprehensive results"""
        print("🚀 Starting PhoBERT NLP Standalone Accuracy Test")
        print("=" * 60)
        
        # Check service availability
        ai_core_available, gemini_available = self.test_service_availability()
        
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
    
    def save_report(self, filename: str = "standalone_accuracy_report.json"):
        """Save test report to JSON file"""
        report = self._generate_report()
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"📄 Report saved to: {filename}")
        return filename

def main():
    """Main function to run the standalone accuracy test"""
    tester = StandaloneAccuracyTester()
    
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