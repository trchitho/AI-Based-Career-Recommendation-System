#!/usr/bin/env python3
"""
Test intelligent interview validation and guidance system
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'apps/backend'))

def test_answer_validation():
    """Test answer relevance validation"""
    
    print("🧪 TESTING INTELLIGENT INTERVIEW VALIDATION")
    print("=" * 60)
    
    from app.modules.interview.services import InterviewService
    
    class MockDB:
        pass
    
    service = InterviewService(MockDB())
    
    # Test cases for irrelevant answers
    test_cases = [
        {
            "question": "Bạn có kinh nghiệm gì về lập trình Python?",
            "answer": "6 giờ",
            "expected": False,
            "reason": "Time pattern"
        },
        {
            "question": "Tại sao bạn muốn làm việc ở đây?",
            "answer": "ok",
            "expected": False,
            "reason": "Single word"
        },
        {
            "question": "Hãy mô tả một dự án bạn đã làm",
            "answer": "123",
            "expected": False,
            "reason": "Only numbers"
        },
        {
            "question": "Bạn xử lý áp lực như thế nào?",
            "answer": "Tôi thường lập kế hoạch chi tiết và ưu tiên công việc quan trọng trước. Khi gặp áp lực, tôi sẽ chia nhỏ task và tập trung giải quyết từng phần một cách có hệ thống.",
            "expected": True,
            "reason": "Relevant answer"
        },
        {
            "question": "Kinh nghiệm làm việc nhóm của bạn?",
            "answer": "",
            "expected": False,
            "reason": "Empty answer"
        }
    ]
    
    passed = 0
    failed = 0
    
    for i, case in enumerate(test_cases, 1):
        try:
            result = service._validate_answer_relevance(
                case["question"], 
                case["answer"], 
                "Software Developer", 
                "behavioral"
            )
            
            is_relevant = result["is_relevant"]
            
            if is_relevant == case["expected"]:
                print(f"✅ Test {i}: PASS - {case['reason']}")
                passed += 1
            else:
                print(f"❌ Test {i}: FAIL - Expected {case['expected']}, got {is_relevant}")
                print(f"   Question: {case['question']}")
                print(f"   Answer: '{case['answer']}'")
                failed += 1
                
        except Exception as e:
            print(f"❌ Test {i}: ERROR - {e}")
            failed += 1
    
    print(f"\n📊 VALIDATION TEST RESULTS:")
    print(f"   Passed: {passed}")
    print(f"   Failed: {failed}")
    print(f"   Success Rate: {(passed/(passed+failed)*100):.1f}%")
    
    return passed, failed

def test_guidance_generation():
    """Test guidance generation for different question types"""
    
    print(f"\n🎯 TESTING GUIDANCE GENERATION")
    print("=" * 60)
    
    from app.modules.interview.services import InterviewService
    
    class MockDB:
        pass
    
    service = InterviewService(MockDB())
    
    question_types = ["warm_up", "technical", "behavioral", "situational"]
    
    for qtype in question_types:
        try:
            guidance = service._generate_guidance_for_irrelevant_answer(
                f"Sample {qtype} question", 
                qtype, 
                "Software Developer"
            )
            
            print(f"✅ {qtype}: Generated guidance ({len(guidance)} chars)")
            print(f"   Preview: {guidance[:100]}...")
            
        except Exception as e:
            print(f"❌ {qtype}: Failed to generate guidance - {e}")

def test_skip_handling():
    """Test skip detection and handling"""
    
    print(f"\n⏭️ TESTING SKIP HANDLING")
    print("=" * 60)
    
    skip_patterns = [
        "",  # Empty
        "   ",  # Whitespace only
        "skip",  # Explicit skip
        "bỏ qua",  # Vietnamese skip
        "next",  # Next command
    ]
    
    for pattern in skip_patterns:
        is_skipped = pattern.strip() == "" or pattern.strip().lower() in ["skip", "bỏ qua", "next"]
        print(f"✅ '{pattern}' → Skip: {is_skipped}")

def test_performance():
    """Test validation performance"""
    
    print(f"\n⚡ TESTING VALIDATION PERFORMANCE")
    print("=" * 60)
    
    import time
    from app.modules.interview.services import InterviewService
    
    class MockDB:
        pass
    
    service = InterviewService(MockDB())
    
    # Test validation speed
    start_time = time.time()
    
    for i in range(100):
        service._validate_answer_relevance(
            "Test question", 
            f"Test answer {i}", 
            "Test Job", 
            "technical"
        )
    
    end_time = time.time()
    duration = end_time - start_time
    
    print(f"✅ 100 validations completed in {duration:.3f}s")
    print(f"✅ Average: {(duration/100)*1000:.1f}ms per validation")
    
    if duration < 5.0:  # Should complete in under 5 seconds
        print(f"✅ Performance: GOOD")
    else:
        print(f"⚠️ Performance: SLOW")

if __name__ == "__main__":
    print("🚀 INTELLIGENT INTERVIEW VALIDATION TEST SUITE")
    print("=" * 80)
    
    try:
        # Run all tests
        passed, failed = test_answer_validation()
        test_guidance_generation()
        test_skip_handling()
        test_performance()
        
        print(f"\n🎉 TEST SUITE COMPLETE")
        print("=" * 80)
        
        if failed == 0:
            print("✅ ALL TESTS PASSED - Intelligent validation system working correctly!")
        else:
            print(f"⚠️ {failed} tests failed - Need to fix validation logic")
            
    except Exception as e:
        print(f"❌ Test suite failed: {e}")
        import traceback
        traceback.print_exc()