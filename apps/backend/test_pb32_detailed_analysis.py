#!/usr/bin/env python3
"""
PB32 - Detailed Analysis Test
Phân tích chi tiết hiệu suất và độ chính xác của PhoBERT NLP
Với tolerance cao hơn và metrics chi tiết

Analysis Coverage:
1. Vector Distribution Analysis
2. Correlation Analysis
3. Performance Metrics
4. Model Behavior Analysis
5. Recommendations for Improvement
"""

import json
import os
import statistics
import sys
import time
from typing import Dict, List

import numpy as np

# Add the app directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

try:
    from app.modules.nlp.service_nlp import AI_CORE_URL, _analyze_via_aicore, _analyze_via_gemini, analyze_essay
    
    RIASEC_KEYS = ["realistic", "investigative", "artistic", "social", "enterprising", "conventional"]
    BIG5_KEYS = ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"]
    
except ImportError as e:
    print(f"❌ Import error: {e}")
    sys.exit(1)

class DetailedAnalyzer:
    """Detailed analyzer for PhoBERT NLP performance"""
    
    def __init__(self):
        self.test_texts = self._create_analysis_texts()
        
    def _create_analysis_texts(self) -> List[Dict]:
        """Create texts for detailed analysis"""
        return [
            {
                "name": "Realistic_Strong",
                "text": """Tôi là thợ cơ khí chuyên nghiệp. Tôi thích làm việc với tay, sửa chữa máy móc, 
                lắp ráp thiết bị. Tôi cảm thấy hài lòng khi tạo ra sản phẩm cụ thể, hữu ích. 
                Tôi không thích ngồi văn phòng hay làm việc với giấy tờ.""",
                "expected_dominant": "realistic",
                "expected_traits": ["practical", "hands-on", "technical"]
            },
            {
                "name": "Investigative_Strong", 
                "text": """Tôi là nhà khoa học nghiên cứu. Tôi thích đọc sách, phân tích dữ liệu, 
                làm thí nghiệm. Tôi luôn tò mò về cách thức hoạt động của mọi thứ. 
                Tôi thích giải quyết vấn đề phức tạp bằng logic và phương pháp khoa học.""",
                "expected_dominant": "investigative",
                "expected_traits": ["analytical", "curious", "logical"]
            },
            {
                "name": "Artistic_Strong",
                "text": """Tôi là họa sĩ và nhà thiết kế. Tôi yêu thích sáng tạo, vẽ tranh, thiết kế. 
                Tôi thích làm việc tự do, không bị ràng buộc. Tôi cảm thấy hạnh phúc khi 
                thể hiện cảm xúc qua nghệ thuật.""",
                "expected_dominant": "artistic", 
                "expected_traits": ["creative", "expressive", "imaginative"]
            },
            {
                "name": "Social_Strong",
                "text": """Tôi là giáo viên và tình nguyện viên. Tôi thích giúp đỡ mọi người, 
                dạy học, chăm sóc trẻ em. Tôi cảm thấy ý nghĩa khi làm việc vì cộng đồng. 
                Tôi thích giao tiếp và kết nối với người khác.""",
                "expected_dominant": "social",
                "expected_traits": ["helpful", "caring", "communicative"]
            },
            {
                "name": "Enterprising_Strong",
                "text": """Tôi là doanh nhân và quản lý. Tôi thích lãnh đạo, thuyết phục, bán hàng. 
                Tôi có tham vọng thành công và kiếm nhiều tiền. Tôi thích cạnh tranh 
                và đưa ra quyết định quan trọng.""",
                "expected_dominant": "enterprising",
                "expected_traits": ["ambitious", "persuasive", "competitive"]
            },
            {
                "name": "Conventional_Strong",
                "text": """Tôi là kế toán và thư ký. Tôi thích làm việc với số liệu, báo cáo, 
                hồ sơ. Tôi cẩn thận, tỉ mỉ và tuân thủ quy định. Tôi thích môi trường 
                có tổ chức và ổn định.""",
                "expected_dominant": "conventional",
                "expected_traits": ["organized", "detail-oriented", "systematic"]
            }
        ]
    
    def analyze_vector_distribution(self, vectors: List[List[float]], vector_type: str) -> Dict:
        """Analyze the distribution of predicted vectors"""
        if not vectors:
            return {}
        
        # Convert to numpy array for easier analysis
        arr = np.array(vectors)
        
        analysis = {
            "vector_type": vector_type,
            "sample_count": len(vectors),
            "dimension_count": len(vectors[0]) if vectors else 0,
            "statistics": {}
        }
        
        # Per-dimension statistics
        for i in range(arr.shape[1]):
            dim_name = RIASEC_KEYS[i] if vector_type == "RIASEC" else BIG5_KEYS[i]
            dim_values = arr[:, i]
            
            analysis["statistics"][dim_name] = {
                "mean": float(np.mean(dim_values)),
                "std": float(np.std(dim_values)),
                "min": float(np.min(dim_values)),
                "max": float(np.max(dim_values)),
                "range": float(np.max(dim_values) - np.min(dim_values))
            }
        
        # Overall statistics
        analysis["overall"] = {
            "mean_across_all": float(np.mean(arr)),
            "std_across_all": float(np.std(arr)),
            "variance_between_dimensions": float(np.var([np.mean(arr[:, i]) for i in range(arr.shape[1])]))
        }
        
        return analysis
    
    def calculate_correlation_with_expected(self, predicted: List[float], expected_dominant: str, vector_type: str) -> Dict:
        """Calculate correlation between predicted and expected patterns"""
        keys = RIASEC_KEYS if vector_type == "RIASEC" else BIG5_KEYS
        
        if expected_dominant not in keys:
            return {"error": f"Unknown dominant trait: {expected_dominant}"}
        
        expected_idx = keys.index(expected_dominant)
        predicted_max_idx = predicted.index(max(predicted))
        
        # Create idealized expected vector (high for dominant, medium for others)
        expected_vector = [0.3] * len(keys)  # baseline
        expected_vector[expected_idx] = 0.8  # high for dominant trait
        
        # Calculate correlation
        try:
            correlation = np.corrcoef(predicted, expected_vector)[0, 1]
        except Exception:
            correlation = 0.0
        
        return {
            "expected_dominant": expected_dominant,
            "expected_dominant_idx": expected_idx,
            "predicted_dominant": keys[predicted_max_idx],
            "predicted_dominant_idx": predicted_max_idx,
            "dominant_match": expected_dominant == keys[predicted_max_idx],
            "correlation": float(correlation) if not np.isnan(correlation) else 0.0,
            "predicted_vector": predicted,
            "expected_vector": expected_vector,
            "dominant_score_diff": predicted[expected_idx] - max([predicted[i] for i in range(len(predicted)) if i != expected_idx])
        }
    
    def run_detailed_analysis(self) -> Dict:
        """Run detailed analysis on all test cases"""
        print("🔍 Starting Detailed PhoBERT Analysis")
        print("=" * 50)
        
        results = []
        riasec_vectors = []
        big5_vectors = []
        response_times = []
        
        for i, test_case in enumerate(self.test_texts):
            print(f"\n📝 Analyzing {i+1}/{len(self.test_texts)}: {test_case['name']}")
            
            try:
                start_time = time.perf_counter()
                result = analyze_essay(test_case['text'], "vi")
                end_time = time.perf_counter()
                
                response_time = (end_time - start_time) * 1000
                response_times.append(response_time)
                
                riasec_pred = result.get('riasec', [])
                big5_pred = result.get('big5', [])
                
                if riasec_pred and len(riasec_pred) == 6:
                    riasec_vectors.append(riasec_pred)
                if big5_pred and len(big5_pred) == 5:
                    big5_vectors.append(big5_pred)
                
                # Analyze correlation with expected
                riasec_corr = self.calculate_correlation_with_expected(
                    riasec_pred, test_case['expected_dominant'], "RIASEC"
                )
                
                case_result = {
                    "name": test_case['name'],
                    "response_time_ms": response_time,
                    "source": result.get('source', 'unknown'),
                    "riasec_analysis": riasec_corr,
                    "riasec_vector": riasec_pred,
                    "big5_vector": big5_pred,
                    "embedding_size": len(result.get('embedding', []))
                }
                
                results.append(case_result)
                
                # Print immediate results
                print(f"  ⏱️  Response: {response_time:.1f}ms")
                print(f"  🎯 Dominant: {riasec_corr.get('predicted_dominant', 'unknown')} (expected: {test_case['expected_dominant']})")
                print(f"  📊 Correlation: {riasec_corr.get('correlation', 0):.3f}")
                print(f"  ✅ Match: {'Yes' if riasec_corr.get('dominant_match', False) else 'No'}")
                
            except Exception as e:
                print(f"  ❌ Error: {str(e)}")
                results.append({
                    "name": test_case['name'],
                    "error": str(e)
                })
        
        # Generate comprehensive analysis
        analysis = {
            "test_info": {
                "total_tests": len(self.test_texts),
                "successful_tests": len([r for r in results if 'error' not in r]),
                "failed_tests": len([r for r in results if 'error' in r])
            },
            "performance_metrics": {
                "avg_response_time_ms": statistics.mean(response_times) if response_times else 0,
                "min_response_time_ms": min(response_times) if response_times else 0,
                "max_response_time_ms": max(response_times) if response_times else 0,
                "std_response_time_ms": statistics.stdev(response_times) if len(response_times) > 1 else 0
            },
            "accuracy_metrics": {
                "dominant_trait_accuracy": sum(1 for r in results if r.get('riasec_analysis', {}).get('dominant_match', False)) / len(results),
                "avg_correlation": statistics.mean([r.get('riasec_analysis', {}).get('correlation', 0) for r in results if 'error' not in r]),
                "correlations_by_trait": {}
            },
            "vector_analysis": {
                "riasec": self.analyze_vector_distribution(riasec_vectors, "RIASEC"),
                "big5": self.analyze_vector_distribution(big5_vectors, "Big5")
            },
            "detailed_results": results
        }
        
        # Calculate correlations by expected trait
        trait_correlations = {}
        for result in results:
            if 'error' not in result:
                expected = result.get('riasec_analysis', {}).get('expected_dominant')
                correlation = result.get('riasec_analysis', {}).get('correlation', 0)
                if expected:
                    if expected not in trait_correlations:
                        trait_correlations[expected] = []
                    trait_correlations[expected].append(correlation)
        
        for trait, correlations in trait_correlations.items():
            analysis["accuracy_metrics"]["correlations_by_trait"][trait] = {
                "avg_correlation": statistics.mean(correlations),
                "sample_count": len(correlations)
            }
        
        return analysis
    
    def print_analysis_summary(self, analysis: Dict):
        """Print formatted analysis summary"""
        print("\n" + "=" * 60)
        print("📊 DETAILED ANALYSIS SUMMARY")
        print("=" * 60)
        
        # Test info
        test_info = analysis["test_info"]
        print(f"📈 Test Results: {test_info['successful_tests']}/{test_info['total_tests']} successful")
        
        # Performance metrics
        perf = analysis["performance_metrics"]
        print("⏱️  Performance:")
        print(f"   Average response time: {perf['avg_response_time_ms']:.1f}ms")
        print(f"   Response time range: {perf['min_response_time_ms']:.1f}ms - {perf['max_response_time_ms']:.1f}ms")
        
        # Accuracy metrics
        acc = analysis["accuracy_metrics"]
        print("🎯 Accuracy:")
        print(f"   Dominant trait accuracy: {acc['dominant_trait_accuracy']:.2%}")
        print(f"   Average correlation: {acc['avg_correlation']:.3f}")
        
        # Per-trait correlations
        if acc["correlations_by_trait"]:
            print("📊 Correlations by trait:")
            for trait, data in acc["correlations_by_trait"].items():
                print(f"   {trait}: {data['avg_correlation']:.3f} (n={data['sample_count']})")
        
        # Vector analysis
        riasec_analysis = analysis["vector_analysis"]["riasec"]
        if riasec_analysis:
            print("🔢 RIASEC Vector Analysis:")
            overall = riasec_analysis.get("overall", {})
            print(f"   Mean across all dimensions: {overall.get('mean_across_all', 0):.3f}")
            print(f"   Std across all dimensions: {overall.get('std_across_all', 0):.3f}")
            print(f"   Variance between dimensions: {overall.get('variance_between_dimensions', 0):.3f}")
        
        # Recommendations
        print("\n💡 RECOMMENDATIONS:")
        
        if acc['dominant_trait_accuracy'] < 0.5:
            print("   🔴 CRITICAL: Dominant trait accuracy < 50%. Model needs retraining or fine-tuning.")
        elif acc['dominant_trait_accuracy'] < 0.7:
            print("   🟡 WARNING: Dominant trait accuracy < 70%. Consider model improvements.")
        else:
            print("   🟢 GOOD: Dominant trait accuracy is acceptable.")
        
        if perf['avg_response_time_ms'] > 2000:
            print("   🔴 PERFORMANCE: Average response time > 2s. Optimize model inference.")
        elif perf['avg_response_time_ms'] > 1000:
            print("   🟡 PERFORMANCE: Average response time > 1s. Consider optimization.")
        else:
            print("   🟢 PERFORMANCE: Response time is acceptable.")
        
        if overall.get('variance_between_dimensions', 0) < 0.01:
            print("   🟡 MODEL: Low variance between dimensions. Model may need more diverse training data.")
        
        if acc['avg_correlation'] < 0.3:
            print("   🔴 CORRELATION: Low correlation with expected patterns. Review training methodology.")
    
    def save_analysis_report(self, analysis: Dict, filename: str = "detailed_analysis_report.json"):
        """Save detailed analysis report"""
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(analysis, f, indent=2, ensure_ascii=False)
        
        print(f"\n📄 Detailed analysis saved to: {filename}")
        return filename

def main():
    """Main function to run detailed analysis"""
    analyzer = DetailedAnalyzer()
    
    # Run analysis
    analysis = analyzer.run_detailed_analysis()
    
    # Print summary
    analyzer.print_analysis_summary(analysis)
    
    # Save report
    report_file = analyzer.save_analysis_report(analysis)
    
    print("\n🎯 DETAILED ANALYSIS COMPLETED")
    print(f"   Report: {report_file}")
    
    return analysis

if __name__ == "__main__":
    main()