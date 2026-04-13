#!/usr/bin/env python3
"""
PB32 - Complete Test Suite Runner
Chạy toàn bộ bộ test kiểm tra độ chính xác của API NLP PhoBERT
Tạo báo cáo tổng hợp về hiệu suất và độ chính xác

Test Suite Components:
1. Accuracy Test - Kiểm tra độ chính xác phân tích tính cách
2. Performance Benchmark - So sánh hiệu suất PhoBERT vs Gemini  
3. E2E Integration Test - Kiểm tra tích hợp end-to-end
4. Comprehensive Report Generation

Usage:
    python run_pb32_complete_test_suite.py [--quick] [--accuracy-only] [--performance-only] [--e2e-only]
"""

import argparse
import json
import time
import os
import sys
from datetime import datetime
from typing import Dict, List, Optional
from pathlib import Path

# Import test modules
try:
    from test_pb32_phobert_nlp_accuracy import PhoBERTAccuracyTester
    from test_pb32_performance_benchmark import PerformanceBenchmark
    from test_pb32_integration_e2e import E2EIntegrationTester
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure all test files are in the same directory")
    sys.exit(1)

class ComprehensiveTestSuite:
    """Master test suite runner for PB32 PhoBERT NLP validation"""
    
    def __init__(self, quick_mode: bool = False):
        self.quick_mode = quick_mode
        self.start_time = datetime.now()
        self.results = {}
        
    def run_accuracy_tests(self) -> Dict:
        """Run accuracy validation tests"""
        print("🎯 RUNNING ACCURACY TESTS")
        print("=" * 50)
        
        try:
            tester = PhoBERTAccuracyTester()
            
            if self.quick_mode:
                # Run only a subset of tests in quick mode
                original_cases = tester.test_cases
                tester.test_cases = original_cases[:3]  # First 3 test cases only
                print("⚡ Quick mode: Running limited test cases")
            
            results = tester.run_all_tests()
            
            # Save individual report
            accuracy_report = tester.save_report("accuracy_test_report.json")
            
            return {
                "success": True,
                "results": results,
                "report_file": accuracy_report
            }
            
        except Exception as e:
            print(f"❌ Accuracy tests failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "report_file": None
            }
    
    def run_performance_tests(self) -> Dict:
        """Run performance benchmark tests"""
        print("\n⚡ RUNNING PERFORMANCE TESTS")
        print("=" * 50)
        
        try:
            benchmark = PerformanceBenchmark()
            
            if self.quick_mode:
                # Run only sequential benchmark in quick mode
                print("⚡ Quick mode: Running sequential benchmark only")
                results = {
                    "sequential": benchmark.run_sequential_benchmark()
                }
            else:
                # Run full benchmark suite
                results = benchmark.run_full_benchmark_suite()
            
            # Save individual report
            performance_report = benchmark.save_benchmark_report(results, "performance_benchmark_report.json")
            
            return {
                "success": True,
                "results": results,
                "report_file": performance_report
            }
            
        except Exception as e:
            print(f"❌ Performance tests failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "report_file": None
            }
    
    def run_e2e_tests(self) -> Dict:
        """Run end-to-end integration tests"""
        print("\n🔄 RUNNING E2E INTEGRATION TESTS")
        print("=" * 50)
        
        try:
            tester = E2EIntegrationTester()
            
            if self.quick_mode:
                # Run only first test case in quick mode
                original_cases = tester.test_cases
                tester.test_cases = original_cases[:1]  # First test case only
                print("⚡ Quick mode: Running single E2E test case")
            
            results = tester.run_all_e2e_tests()
            
            # Save individual report
            e2e_report = tester.save_e2e_report(results, "e2e_integration_report.json")
            
            return {
                "success": True,
                "results": results,
                "report_file": e2e_report
            }
            
        except Exception as e:
            print(f"❌ E2E tests failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "report_file": None
            }
    
    def generate_comprehensive_report(self) -> str:
        """Generate comprehensive test report"""
        print("\n📊 GENERATING COMPREHENSIVE REPORT")
        print("=" * 50)
        
        end_time = datetime.now()
        total_duration = (end_time - self.start_time).total_seconds()
        
        # Compile comprehensive report
        comprehensive_report = {
            "test_suite_info": {
                "name": "PB32 - PhoBERT NLP Accuracy Test Suite",
                "version": "1.0.0",
                "start_time": self.start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "total_duration_seconds": total_duration,
                "quick_mode": self.quick_mode
            },
            "summary": self._generate_summary(),
            "detailed_results": self.results,
            "recommendations": self._generate_recommendations(),
            "system_info": self._get_system_info()
        }
        
        # Save comprehensive report
        report_filename = f"pb32_comprehensive_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        with open(report_filename, 'w', encoding='utf-8') as f:
            json.dump(comprehensive_report, f, indent=2, ensure_ascii=False)
        
        print(f"📄 Comprehensive report saved: {report_filename}")
        
        # Generate summary text report
        self._generate_text_summary(comprehensive_report, report_filename.replace('.json', '_summary.txt'))
        
        return report_filename
    
    def _generate_summary(self) -> Dict:
        """Generate test suite summary"""
        summary = {
            "tests_run": [],
            "overall_success": True,
            "total_test_count": 0,
            "successful_test_count": 0,
            "failed_test_count": 0,
            "key_metrics": {}
        }
        
        # Accuracy test summary
        if "accuracy" in self.results and self.results["accuracy"]["success"]:
            acc_results = self.results["accuracy"]["results"]
            if "summary" in acc_results:
                acc_summary = acc_results["summary"]
                summary["tests_run"].append("accuracy")
                summary["total_test_count"] += acc_summary.get("total_tests", 0)
                summary["successful_test_count"] += acc_summary.get("successful_tests", 0)
                summary["key_metrics"]["accuracy"] = {
                    "overall_accuracy": acc_summary.get("overall_accuracy", 0),
                    "riasec_accuracy": acc_summary.get("avg_riasec_accuracy", 0),
                    "big5_accuracy": acc_summary.get("avg_big5_accuracy", 0),
                    "performance_grade": acc_summary.get("performance_grade", "Unknown")
                }
        
        # Performance test summary
        if "performance" in self.results and self.results["performance"]["success"]:
            perf_results = self.results["performance"]["results"]
            summary["tests_run"].append("performance")
            
            # Extract key performance metrics
            if "sequential" in perf_results:
                seq_results = perf_results["sequential"]
                summary["key_metrics"]["performance"] = {
                    "phobert_avg_time": seq_results.get("phobert", {}).get("avg_response_time_ms", 0),
                    "gemini_avg_time": seq_results.get("gemini", {}).get("avg_response_time_ms", 0),
                    "phobert_success_rate": seq_results.get("phobert", {}).get("success_rate", 0),
                    "gemini_success_rate": seq_results.get("gemini", {}).get("success_rate", 0)
                }
        
        # E2E test summary
        if "e2e" in self.results and self.results["e2e"]["success"]:
            e2e_results = self.results["e2e"]["results"]
            if "summary" in e2e_results:
                e2e_summary = e2e_results["summary"]
                summary["tests_run"].append("e2e")
                summary["total_test_count"] += e2e_summary.get("total_tests", 0)
                summary["successful_test_count"] += e2e_summary.get("successful_tests", 0)
                summary["key_metrics"]["e2e"] = {
                    "success_rate": e2e_summary.get("success_rate", 0),
                    "avg_completion_time": e2e_summary.get("avg_completion_time_ms", 0)
                }
        
        # Calculate overall metrics
        summary["failed_test_count"] = summary["total_test_count"] - summary["successful_test_count"]
        summary["overall_success"] = all(
            self.results.get(test, {}).get("success", False) 
            for test in ["accuracy", "performance", "e2e"] 
            if test in self.results
        )
        
        return summary
    
    def _generate_recommendations(self) -> List[str]:
        """Generate recommendations based on test results"""
        recommendations = []
        
        # Accuracy recommendations
        if "accuracy" in self.results and self.results["accuracy"]["success"]:
            acc_results = self.results["accuracy"]["results"]
            if "summary" in acc_results:
                overall_acc = acc_results["summary"].get("overall_accuracy", 0)
                
                if overall_acc < 0.6:
                    recommendations.append("🔴 CRITICAL: Overall accuracy below 60%. Consider retraining PhoBERT model or improving prompt engineering.")
                elif overall_acc < 0.7:
                    recommendations.append("🟡 WARNING: Overall accuracy below 70%. Review test cases and model parameters.")
                elif overall_acc >= 0.8:
                    recommendations.append("🟢 EXCELLENT: High accuracy achieved. Model is performing well.")
        
        # Performance recommendations
        if "performance" in self.results and self.results["performance"]["success"]:
            perf_results = self.results["performance"]["results"]
            if "sequential" in perf_results:
                phobert_time = perf_results["sequential"].get("phobert", {}).get("avg_response_time_ms", 0)
                gemini_time = perf_results["sequential"].get("gemini", {}).get("avg_response_time_ms", 0)
                
                if phobert_time > 5000:
                    recommendations.append("🔴 PERFORMANCE: PhoBERT response time > 5s. Check AI-core service performance.")
                elif phobert_time > 2000:
                    recommendations.append("🟡 PERFORMANCE: PhoBERT response time > 2s. Consider optimization.")
                
                if phobert_time > 0 and gemini_time > 0:
                    if phobert_time < gemini_time:
                        recommendations.append("🟢 PERFORMANCE: PhoBERT is faster than Gemini fallback.")
                    else:
                        recommendations.append("🟡 PERFORMANCE: Gemini fallback is faster than PhoBERT.")
        
        # E2E recommendations
        if "e2e" in self.results and self.results["e2e"]["success"]:
            e2e_results = self.results["e2e"]["results"]
            if "summary" in e2e_results:
                success_rate = e2e_results["summary"].get("success_rate", 0)
                
                if success_rate < 0.8:
                    recommendations.append("🔴 INTEGRATION: E2E success rate < 80%. Check database connections and API integrations.")
                elif success_rate >= 0.95:
                    recommendations.append("🟢 INTEGRATION: Excellent E2E success rate. System integration is solid.")
        
        # General recommendations
        if not recommendations:
            recommendations.append("🟢 OVERALL: All tests passed successfully. System is ready for production.")
        
        return recommendations
    
    def _get_system_info(self) -> Dict:
        """Get system information"""
        import platform
        import psutil
        
        return {
            "platform": platform.platform(),
            "python_version": platform.python_version(),
            "cpu_count": psutil.cpu_count(),
            "memory_total_gb": round(psutil.virtual_memory().total / (1024**3), 2),
            "disk_free_gb": round(psutil.disk_usage('.').free / (1024**3), 2)
        }
    
    def _generate_text_summary(self, report: Dict, filename: str):
        """Generate human-readable text summary"""
        summary = report["summary"]
        
        with open(filename, 'w', encoding='utf-8') as f:
            f.write("PB32 - PhoBERT NLP Accuracy Test Suite - Summary Report\n")
            f.write("=" * 60 + "\n\n")
            
            # Test suite info
            f.write(f"Test Suite: {report['test_suite_info']['name']}\n")
            f.write(f"Start Time: {report['test_suite_info']['start_time']}\n")
            f.write(f"Duration: {report['test_suite_info']['total_duration_seconds']:.1f} seconds\n")
            f.write(f"Quick Mode: {report['test_suite_info']['quick_mode']}\n\n")
            
            # Overall results
            f.write("OVERALL RESULTS\n")
            f.write("-" * 20 + "\n")
            f.write(f"Tests Run: {', '.join(summary['tests_run'])}\n")
            f.write(f"Overall Success: {'✅ YES' if summary['overall_success'] else '❌ NO'}\n")
            f.write(f"Total Tests: {summary['total_test_count']}\n")
            f.write(f"Successful: {summary['successful_test_count']}\n")
            f.write(f"Failed: {summary['failed_test_count']}\n\n")
            
            # Key metrics
            if "accuracy" in summary["key_metrics"]:
                acc = summary["key_metrics"]["accuracy"]
                f.write("ACCURACY METRICS\n")
                f.write("-" * 20 + "\n")
                f.write(f"Overall Accuracy: {acc['overall_accuracy']:.2%}\n")
                f.write(f"RIASEC Accuracy: {acc['riasec_accuracy']:.2%}\n")
                f.write(f"Big5 Accuracy: {acc['big5_accuracy']:.2%}\n")
                f.write(f"Performance Grade: {acc['performance_grade']}\n\n")
            
            if "performance" in summary["key_metrics"]:
                perf = summary["key_metrics"]["performance"]
                f.write("PERFORMANCE METRICS\n")
                f.write("-" * 20 + "\n")
                f.write(f"PhoBERT Avg Time: {perf['phobert_avg_time']:.1f}ms\n")
                f.write(f"Gemini Avg Time: {perf['gemini_avg_time']:.1f}ms\n")
                f.write(f"PhoBERT Success Rate: {perf['phobert_success_rate']:.2%}\n")
                f.write(f"Gemini Success Rate: {perf['gemini_success_rate']:.2%}\n\n")
            
            if "e2e" in summary["key_metrics"]:
                e2e = summary["key_metrics"]["e2e"]
                f.write("E2E INTEGRATION METRICS\n")
                f.write("-" * 20 + "\n")
                f.write(f"Success Rate: {e2e['success_rate']:.2%}\n")
                f.write(f"Avg Completion Time: {e2e['avg_completion_time']:.1f}ms\n\n")
            
            # Recommendations
            f.write("RECOMMENDATIONS\n")
            f.write("-" * 20 + "\n")
            for rec in report["recommendations"]:
                f.write(f"{rec}\n")
        
        print(f"📄 Text summary saved: {filename}")
    
    def run_complete_suite(self, test_types: List[str] = None) -> str:
        """Run complete test suite"""
        if test_types is None:
            test_types = ["accuracy", "performance", "e2e"]
        
        print("🚀 STARTING PB32 COMPLETE TEST SUITE")
        print("=" * 60)
        print(f"Mode: {'Quick' if self.quick_mode else 'Full'}")
        print(f"Tests: {', '.join(test_types)}")
        print(f"Start Time: {self.start_time}")
        print("=" * 60)
        
        # Run selected tests
        if "accuracy" in test_types:
            self.results["accuracy"] = self.run_accuracy_tests()
        
        if "performance" in test_types:
            self.results["performance"] = self.run_performance_tests()
        
        if "e2e" in test_types:
            self.results["e2e"] = self.run_e2e_tests()
        
        # Generate comprehensive report
        report_file = self.generate_comprehensive_report()
        
        # Print final summary
        self._print_final_summary()
        
        return report_file
    
    def _print_final_summary(self):
        """Print final test suite summary"""
        summary = self._generate_summary()
        
        print("\n" + "🎯 FINAL TEST SUITE SUMMARY")
        print("=" * 60)
        print(f"Overall Success: {'✅ YES' if summary['overall_success'] else '❌ NO'}")
        print(f"Tests Run: {', '.join(summary['tests_run'])}")
        print(f"Total Duration: {(datetime.now() - self.start_time).total_seconds():.1f}s")
        
        if "accuracy" in summary["key_metrics"]:
            acc = summary["key_metrics"]["accuracy"]
            print(f"Overall Accuracy: {acc['overall_accuracy']:.2%} ({acc['performance_grade']})")
        
        if "performance" in summary["key_metrics"]:
            perf = summary["key_metrics"]["performance"]
            print(f"PhoBERT Performance: {perf['phobert_avg_time']:.1f}ms avg")
        
        if "e2e" in summary["key_metrics"]:
            e2e = summary["key_metrics"]["e2e"]
            print(f"E2E Success Rate: {e2e['success_rate']:.2%}")
        
        print("\n🎉 Test suite completed successfully!")

def main():
    """Main function with command line argument parsing"""
    parser = argparse.ArgumentParser(description="PB32 PhoBERT NLP Complete Test Suite")
    parser.add_argument("--quick", action="store_true", help="Run in quick mode (subset of tests)")
    parser.add_argument("--accuracy-only", action="store_true", help="Run only accuracy tests")
    parser.add_argument("--performance-only", action="store_true", help="Run only performance tests")
    parser.add_argument("--e2e-only", action="store_true", help="Run only E2E integration tests")
    
    args = parser.parse_args()
    
    # Determine which tests to run
    test_types = []
    if args.accuracy_only:
        test_types = ["accuracy"]
    elif args.performance_only:
        test_types = ["performance"]
    elif args.e2e_only:
        test_types = ["e2e"]
    else:
        test_types = ["accuracy", "performance", "e2e"]
    
    # Create and run test suite
    suite = ComprehensiveTestSuite(quick_mode=args.quick)
    
    try:
        report_file = suite.run_complete_suite(test_types)
        print(f"\n📊 Complete report available at: {report_file}")
        return 0
    except KeyboardInterrupt:
        print("\n⚠️  Test suite interrupted by user")
        return 1
    except Exception as e:
        print(f"\n❌ Test suite failed with error: {str(e)}")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)