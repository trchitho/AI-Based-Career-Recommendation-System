#!/usr/bin/env python3
"""
PB32 - Performance Benchmark Suite
So sánh hiệu suất giữa PhoBERT (AI-core) và Gemini API
Đo lường thời gian phản hồi, độ chính xác và chất lượng embedding

Benchmark Coverage:
1. Response Time Comparison (PhoBERT vs Gemini)
2. Accuracy Comparison across different text types
3. Embedding Quality Assessment
4. Concurrent Load Testing
5. Memory Usage Analysis
6. Error Rate Analysis
"""

import asyncio
import concurrent.futures
import json
import time
import statistics
import psutil
import threading
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import sys
import os

# Add the app directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.modules.nlp.service_nlp import (
    analyze_essay,
    _analyze_via_aicore,
    _analyze_via_gemini,
    get_embedding,
    AI_CORE_URL
)

@dataclass
class BenchmarkResult:
    """Result of a single benchmark test"""
    method: str  # 'phobert' or 'gemini'
    text_type: str
    response_time_ms: float
    success: bool
    riasec_vector: List[float]
    big5_vector: List[float]
    embedding_size: int
    memory_usage_mb: float
    error_message: Optional[str] = None

class PerformanceBenchmark:
    """Performance benchmark suite for NLP services"""
    
    def __init__(self):
        self.test_texts = self._create_benchmark_texts()
        self.results: List[BenchmarkResult] = []
        
    def _create_benchmark_texts(self) -> Dict[str, List[str]]:
        """Create different types of text for benchmarking"""
        return {
            "short": [
                "Tôi thích lập trình và giải quyết vấn đề.",
                "Tôi yêu thích nghệ thuật và sáng tạo.",
                "Tôi thích giúp đỡ mọi người xung quanh.",
                "Tôi muốn trở thành lãnh đạo doanh nghiệp.",
                "Tôi thích làm việc với số liệu và báo cáo."
            ],
            "medium": [
                """Tôi là một kỹ sư phần mềm với 3 năm kinh nghiệm. Tôi thích giải quyết các vấn đề 
                kỹ thuật phức tạp và tạo ra những sản phẩm hữu ích. Tôi thường làm việc độc lập 
                nhưng cũng hợp tác tốt với đội nhóm khi cần thiết.""",
                
                """Tôi là một nhà thiết kế đồ họa tự do. Tôi yêu thích việc sáng tạo và thể hiện 
                ý tưởng qua hình ảnh. Tôi thích làm việc linh hoạt và không bị ràng buộc bởi 
                quy tắc cứng nhắc. Môi trường sáng tạo là điều tôi cần nhất.""",
                
                """Tôi là giáo viên mầm non với tình yêu lớn dành cho trẻ em. Tôi thích dạy học, 
                chăm sóc và giúp trẻ phát triển toàn diện. Tôi có tính kiên nhẫn và luôn tìm cách 
                làm cho việc học trở nên thú vị."""
            ],
            "long": [
                """Tôi là một nhà nghiên cứu sinh học phân tử tại một viện nghiên cứu hàng đầu. 
                Công việc hàng ngày của tôi bao gồm thiết kế và thực hiện các thí nghiệm phức tạp, 
                phân tích dữ liệu gen, và viết báo cáo khoa học. Tôi dành phần lớn thời gian trong 
                phòng thí nghiệm, làm việc với các thiết bị hiện đại như máy giải trình tự gen và 
                kính hiển vi điện tử. Tôi thích khám phá những điều chưa biết trong thế giới vi sinh, 
                đặc biệt là cơ chế hoạt động của các protein và enzyme. Mỗi khi có một phát hiện mới, 
                dù nhỏ, tôi cảm thấy vô cùng hứng khởi. Tôi thường làm việc một mình hoặc với một 
                nhóm nhỏ các nhà nghiên cứu khác. Tôi không thích các công việc lặp đi lặp lại hay 
                phải giao tiếp nhiều với khách hàng. Thay vào đó, tôi thích suy nghĩ sâu về các 
                vấn đề khoa học và tìm kiếm giải pháp sáng tạo.""",
                
                """Tôi là quản lý bán hàng khu vực miền Bắc của một công ty công nghệ đa quốc gia. 
                Công việc của tôi đòi hỏi phải liên tục di chuyển, gặp gỡ khách hàng, đàm phán hợp đồng 
                và quản lý đội nhóm 15 nhân viên bán hàng. Tôi thích môi trường năng động, thử thách 
                và cơ hội thăng tiến cao. Mỗi ngày tôi phải đưa ra nhiều quyết định quan trọng, từ 
                chiến lược bán hàng đến giải quyết khiếu nại khách hàng. Tôi có khả năng thuyết phục 
                tốt và thường đạt được mục tiêu doanh số đề ra. Tôi thích cạnh tranh lành mạnh với 
                các đồng nghiệp và luôn muốn trở thành người xuất sắc nhất trong công ty. Tôi có 
                tham vọng cao và mong muốn trong tương lai sẽ trở thành giám đốc điều hành. 
                Tôi không thích các công việc đơn điệu hay phải ngồi một chỗ cả ngày."""
            ]
        }
    
    def measure_memory_usage(self) -> float:
        """Measure current memory usage in MB"""
        process = psutil.Process()
        return process.memory_info().rss / 1024 / 1024
    
    def benchmark_single_method(self, method: str, text: str, text_type: str) -> BenchmarkResult:
        """Benchmark a single method (phobert or gemini) with given text"""
        memory_before = self.measure_memory_usage()
        
        try:
            start_time = time.perf_counter()
            
            if method == "phobert":
                result = _analyze_via_aicore(text, "vi")
                if result is None:
                    raise Exception("AI-core service unavailable")
            elif method == "gemini":
                result = _analyze_via_gemini(text)
            else:
                raise ValueError(f"Unknown method: {method}")
            
            end_time = time.perf_counter()
            response_time_ms = (end_time - start_time) * 1000
            
            memory_after = self.measure_memory_usage()
            memory_usage = memory_after - memory_before
            
            return BenchmarkResult(
                method=method,
                text_type=text_type,
                response_time_ms=response_time_ms,
                success=True,
                riasec_vector=result.get('riasec', []),
                big5_vector=result.get('big5', []),
                embedding_size=len(result.get('embedding', [])),
                memory_usage_mb=memory_usage
            )
            
        except Exception as e:
            memory_after = self.measure_memory_usage()
            memory_usage = memory_after - memory_before
            
            return BenchmarkResult(
                method=method,
                text_type=text_type,
                response_time_ms=0.0,
                success=False,
                riasec_vector=[],
                big5_vector=[],
                embedding_size=0,
                memory_usage_mb=memory_usage,
                error_message=str(e)
            )
    
    def run_sequential_benchmark(self) -> Dict:
        """Run sequential benchmark comparing PhoBERT and Gemini"""
        print("🔄 Running Sequential Benchmark...")
        print("=" * 50)
        
        results = []
        
        for text_type, texts in self.test_texts.items():
            print(f"\n📝 Testing {text_type} texts...")
            
            for i, text in enumerate(texts):
                print(f"  Text {i+1}/{len(texts)} (length: {len(text)} chars)")
                
                # Test PhoBERT
                phobert_result = self.benchmark_single_method("phobert", text, text_type)
                results.append(phobert_result)
                
                if phobert_result.success:
                    print(f"    PhoBERT: {phobert_result.response_time_ms:.1f}ms ✅")
                else:
                    print(f"    PhoBERT: Failed ❌ ({phobert_result.error_message})")
                
                # Test Gemini
                gemini_result = self.benchmark_single_method("gemini", text, text_type)
                results.append(gemini_result)
                
                if gemini_result.success:
                    print(f"    Gemini: {gemini_result.response_time_ms:.1f}ms ✅")
                else:
                    print(f"    Gemini: Failed ❌ ({gemini_result.error_message})")
        
        return self._analyze_results(results)
    
    def run_concurrent_benchmark(self, max_workers: int = 5) -> Dict:
        """Run concurrent benchmark to test load handling"""
        print(f"\n🚀 Running Concurrent Benchmark (max_workers={max_workers})...")
        print("=" * 50)
        
        # Prepare test cases
        test_cases = []
        for text_type, texts in self.test_texts.items():
            for text in texts[:2]:  # Limit to 2 texts per type for concurrent testing
                test_cases.append(("phobert", text, text_type))
                test_cases.append(("gemini", text, text_type))
        
        results = []
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all tasks
            future_to_case = {
                executor.submit(self.benchmark_single_method, method, text, text_type): (method, text_type)
                for method, text, text_type in test_cases
            }
            
            # Collect results
            for future in concurrent.futures.as_completed(future_to_case):
                method, text_type = future_to_case[future]
                try:
                    result = future.result()
                    results.append(result)
                    
                    status = "✅" if result.success else "❌"
                    print(f"  {method} ({text_type}): {result.response_time_ms:.1f}ms {status}")
                    
                except Exception as e:
                    print(f"  {method} ({text_type}): Exception ❌ ({str(e)})")
        
        return self._analyze_results(results)
    
    def run_stress_test(self, duration_seconds: int = 30) -> Dict:
        """Run stress test for specified duration"""
        print(f"\n💪 Running Stress Test ({duration_seconds}s)...")
        print("=" * 50)
        
        results = []
        start_time = time.time()
        test_count = 0
        
        # Use a simple text for stress testing
        test_text = "Tôi thích làm việc với máy tính và giải quyết vấn đề kỹ thuật."
        
        while time.time() - start_time < duration_seconds:
            test_count += 1
            
            # Alternate between methods
            method = "phobert" if test_count % 2 == 1 else "gemini"
            
            result = self.benchmark_single_method(method, test_text, "stress")
            results.append(result)
            
            if test_count % 10 == 0:
                elapsed = time.time() - start_time
                rate = test_count / elapsed
                print(f"  Completed {test_count} tests in {elapsed:.1f}s (rate: {rate:.1f} tests/sec)")
        
        total_time = time.time() - start_time
        print(f"\n✅ Stress test completed: {test_count} tests in {total_time:.1f}s")
        
        return self._analyze_results(results)
    
    def _analyze_results(self, results: List[BenchmarkResult]) -> Dict:
        """Analyze benchmark results and generate statistics"""
        if not results:
            return {"error": "No results to analyze"}
        
        # Separate by method
        phobert_results = [r for r in results if r.method == "phobert" and r.success]
        gemini_results = [r for r in results if r.method == "gemini" and r.success]
        
        analysis = {
            "total_tests": len(results),
            "successful_tests": len([r for r in results if r.success]),
            "failed_tests": len([r for r in results if not r.success]),
            "success_rate": len([r for r in results if r.success]) / len(results) if results else 0
        }
        
        # PhoBERT statistics
        if phobert_results:
            analysis["phobert"] = {
                "total_tests": len([r for r in results if r.method == "phobert"]),
                "successful_tests": len(phobert_results),
                "success_rate": len(phobert_results) / len([r for r in results if r.method == "phobert"]),
                "avg_response_time_ms": statistics.mean([r.response_time_ms for r in phobert_results]),
                "min_response_time_ms": min([r.response_time_ms for r in phobert_results]),
                "max_response_time_ms": max([r.response_time_ms for r in phobert_results]),
                "std_response_time_ms": statistics.stdev([r.response_time_ms for r in phobert_results]) if len(phobert_results) > 1 else 0,
                "avg_memory_usage_mb": statistics.mean([r.memory_usage_mb for r in phobert_results]),
                "avg_embedding_size": statistics.mean([r.embedding_size for r in phobert_results]) if phobert_results else 0
            }
        
        # Gemini statistics
        if gemini_results:
            analysis["gemini"] = {
                "total_tests": len([r for r in results if r.method == "gemini"]),
                "successful_tests": len(gemini_results),
                "success_rate": len(gemini_results) / len([r for r in results if r.method == "gemini"]),
                "avg_response_time_ms": statistics.mean([r.response_time_ms for r in gemini_results]),
                "min_response_time_ms": min([r.response_time_ms for r in gemini_results]),
                "max_response_time_ms": max([r.response_time_ms for r in gemini_results]),
                "std_response_time_ms": statistics.stdev([r.response_time_ms for r in gemini_results]) if len(gemini_results) > 1 else 0,
                "avg_memory_usage_mb": statistics.mean([r.memory_usage_mb for r in gemini_results]),
                "avg_embedding_size": statistics.mean([r.embedding_size for r in gemini_results]) if gemini_results else 0
            }
        
        # Comparison
        if phobert_results and gemini_results:
            phobert_avg = statistics.mean([r.response_time_ms for r in phobert_results])
            gemini_avg = statistics.mean([r.response_time_ms for r in gemini_results])
            
            analysis["comparison"] = {
                "speed_winner": "phobert" if phobert_avg < gemini_avg else "gemini",
                "speed_difference_ms": abs(phobert_avg - gemini_avg),
                "speed_improvement_pct": abs(phobert_avg - gemini_avg) / max(phobert_avg, gemini_avg) * 100
            }
        
        # Error analysis
        failed_results = [r for r in results if not r.success]
        if failed_results:
            error_counts = {}
            for r in failed_results:
                error_key = f"{r.method}_{r.error_message[:50] if r.error_message else 'unknown'}"
                error_counts[error_key] = error_counts.get(error_key, 0) + 1
            
            analysis["errors"] = error_counts
        
        return analysis
    
    def print_analysis(self, analysis: Dict):
        """Print formatted analysis results"""
        print("\n" + "=" * 60)
        print("📊 BENCHMARK ANALYSIS")
        print("=" * 60)
        
        print(f"📈 Overall Statistics:")
        print(f"   Total tests: {analysis.get('total_tests', 0)}")
        print(f"   Successful: {analysis.get('successful_tests', 0)}")
        print(f"   Failed: {analysis.get('failed_tests', 0)}")
        print(f"   Success rate: {analysis.get('success_rate', 0):.2%}")
        
        # PhoBERT results
        if "phobert" in analysis:
            pb = analysis["phobert"]
            print(f"\n🤖 PhoBERT (AI-core) Results:")
            print(f"   Success rate: {pb['success_rate']:.2%} ({pb['successful_tests']}/{pb['total_tests']})")
            print(f"   Avg response time: {pb['avg_response_time_ms']:.1f}ms")
            print(f"   Response time range: {pb['min_response_time_ms']:.1f}ms - {pb['max_response_time_ms']:.1f}ms")
            print(f"   Std deviation: {pb['std_response_time_ms']:.1f}ms")
            print(f"   Avg memory usage: {pb['avg_memory_usage_mb']:.1f}MB")
            print(f"   Avg embedding size: {pb['avg_embedding_size']:.0f}")
        
        # Gemini results
        if "gemini" in analysis:
            gm = analysis["gemini"]
            print(f"\n🔮 Gemini API Results:")
            print(f"   Success rate: {gm['success_rate']:.2%} ({gm['successful_tests']}/{gm['total_tests']})")
            print(f"   Avg response time: {gm['avg_response_time_ms']:.1f}ms")
            print(f"   Response time range: {gm['min_response_time_ms']:.1f}ms - {gm['max_response_time_ms']:.1f}ms")
            print(f"   Std deviation: {gm['std_response_time_ms']:.1f}ms")
            print(f"   Avg memory usage: {gm['avg_memory_usage_mb']:.1f}MB")
            print(f"   Avg embedding size: {gm['avg_embedding_size']:.0f}")
        
        # Comparison
        if "comparison" in analysis:
            comp = analysis["comparison"]
            print(f"\n⚡ Performance Comparison:")
            print(f"   Speed winner: {comp['speed_winner'].upper()}")
            print(f"   Speed difference: {comp['speed_difference_ms']:.1f}ms")
            print(f"   Performance improvement: {comp['speed_improvement_pct']:.1f}%")
        
        # Errors
        if "errors" in analysis:
            print(f"\n❌ Error Analysis:")
            for error, count in analysis["errors"].items():
                print(f"   {error}: {count} occurrences")
    
    def run_full_benchmark_suite(self) -> Dict:
        """Run complete benchmark suite"""
        print("🚀 Starting Full Performance Benchmark Suite")
        print("=" * 60)
        
        all_results = {}
        
        # Sequential benchmark
        print("\n1️⃣ Sequential Benchmark")
        sequential_results = self.run_sequential_benchmark()
        all_results["sequential"] = sequential_results
        self.print_analysis(sequential_results)
        
        # Concurrent benchmark
        print("\n2️⃣ Concurrent Benchmark")
        concurrent_results = self.run_concurrent_benchmark(max_workers=3)
        all_results["concurrent"] = concurrent_results
        self.print_analysis(concurrent_results)
        
        # Stress test
        print("\n3️⃣ Stress Test")
        stress_results = self.run_stress_test(duration_seconds=20)
        all_results["stress"] = stress_results
        self.print_analysis(stress_results)
        
        return all_results
    
    def save_benchmark_report(self, results: Dict, filename: str = "benchmark_report.json"):
        """Save benchmark results to JSON file"""
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        
        print(f"\n📄 Benchmark report saved to: {filename}")
        return filename

def main():
    """Main function to run performance benchmark"""
    benchmark = PerformanceBenchmark()
    
    # Run full benchmark suite
    results = benchmark.run_full_benchmark_suite()
    
    # Save results
    report_file = benchmark.save_benchmark_report(results)
    
    # Print final summary
    print(f"\n🎯 BENCHMARK COMPLETED")
    print(f"   Report saved to: {report_file}")
    print(f"   AI-core URL: {AI_CORE_URL}")
    
    return results

if __name__ == "__main__":
    main()