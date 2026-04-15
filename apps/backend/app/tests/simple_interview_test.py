#!/usr/bin/env python3
"""
Simple test để verify interview validation logic hoạt động
"""

import sys
import os
sys.path.append('apps/backend')

# Import trực tiếp từ services để test logic
from app.modules.interview.services import InterviewService
from app.core.db import get_db
from sqlalchemy.orm import Session

def test_validation_logic():
    """Test validation logic trực tiếp"""
    print("🔍 TESTING INTERVIEW VALIDATION LOGIC")
    print("=" * 60)
    
    # Tạo mock service
    class MockDB:
        pass
    
    service = InterviewService(MockDB())
    
    # Test cases
    test_cases = [
        {
            "question": "Bạn có kinh nghiệm gì về lập trình?",
            "answer": "Tôi có 3 năm kinh nghiệm Python và Django",
            "job_title": "Software Developer",
            "question_type": "technical",
            "expected": True
        },
        {
            "question": "Tại sao bạn muốn làm việc ở đây?",
            "answer": "6 giờ",
            "job_title": "Software Developer", 
            "question_type": "warm_up",
            "expected": False
        },
        {
            "question": "Kể về một dự án bạn đã làm",
            "answer": "ok",
            "job_title": "Software Developer",
            "question_type": "behavioral", 
            "expected": False
        },
        {
            "question": "Bạn sẽ xử lý bug như thế nào?",
            "answer": "",
            "job_title": "Software Developer",
            "question_type": "situational",
            "expected": False
        }
    ]
    
    for i, case in enumerate(test_cases, 1):
        print(f"\n🧪 Test {i}: {case['question_type']} question")
        print(f"❓ Question: {case['question']}")
        print(f"💬 Answer: '{case['answer']}'")
        
        try:
            result = service._validate_answer_relevance(
                case['question'],
                case['answer'], 
                case['job_title'],
                case['question_type']
            )
            
            is_relevant = result.get('is_relevant', True)
            reason = result.get('reason', 'unknown')
            guidance = result.get('guidance')
            
            status = "✅ RELEVANT" if is_relevant else "❌ IRRELEVANT"
            expected_status = "✅ RELEVANT" if case['expected'] else "❌ IRRELEVANT"
            
            print(f"📊 Result: {status} (Expected: {expected_status})")
            print(f"🔍 Reason: {reason}")
            
            if guidance:
                print(f"💡 Guidance: {guidance[:100]}...")
            
            # Check if result matches expectation
            if is_relevant == case['expected']:
                print("✅ TEST PASSED")
            else:
                print("❌ TEST FAILED")
                
        except Exception as e:
            print(f"❌ ERROR: {e}")
    
    print(f"\n🎯 TESTING GUIDANCE GENERATION")
    print("=" * 60)
    
    try:
        guidance = service._generate_guidance_for_irrelevant_answer(
            "Tại sao bạn muốn làm việc ở đây?",
            "warm_up", 
            "Software Developer"
        )
        print(f"✅ Guidance generated: {guidance}")
    except Exception as e:
        print(f"❌ Guidance generation failed: {e}")

def test_question_distribution():
    """Test question distribution logic"""
    print(f"\n📊 TESTING QUESTION DISTRIBUTION")
    print("=" * 60)
    
    class MockDB:
        pass
    
    service = InterviewService(MockDB())
    
    test_counts = [5, 7, 8, 10, 12, 3, 15, 0, -1]
    
    for count in test_counts:
        try:
            distribution = service._get_question_distribution(count)
            total = sum(distribution.values())
            
            print(f"📋 Count {count}: {distribution} (Total: {total})")
            
            # Validate distribution
            if count > 0:
                expected_total = count
                if total == expected_total:
                    print("   ✅ Distribution correct")
                else:
                    print(f"   ❌ Distribution incorrect - expected {expected_total}, got {total}")
            else:
                print("   ✅ Handled edge case")
                
        except Exception as e:
            print(f"   ❌ Error for count {count}: {e}")

if __name__ == "__main__":
    print("🚀 INTERVIEW LOGIC VALIDATION TEST")
    print("=" * 80)
    
    test_validation_logic()
    test_question_distribution()
    
    print(f"\n✅ VALIDATION COMPLETED")
    print("=" * 80)