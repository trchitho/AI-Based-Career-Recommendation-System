#!/usr/bin/env python3
"""
Validate interview logic patterns
"""

import re

def test_irrelevant_patterns():
    """Test irrelevant answer patterns"""
    print("🔍 TESTING IRRELEVANT ANSWER PATTERNS")
    print("=" * 60)
    
    # Patterns from services.py
    irrelevant_patterns = [
        r'^\d+\s*(giờ|h|pm|am|:\d+)',  # Time patterns
        r'^(ok|okay|yes|no|không|có|được)$',  # Single word responses
        r'^[^\w\s]*$',  # Only punctuation/symbols
        r'^\d+$',  # Only numbers
        r'^(haha|hehe|lol|:D|:P|\.\.\.)$',  # Casual expressions
    ]
    
    test_cases = [
        # Good answers
        ("Tôi có 3 năm kinh nghiệm lập trình Python", False, "Good technical answer"),
        ("Tôi muốn làm việc ở đây vì công ty có môi trường tốt", False, "Good motivation answer"),
        ("Trong dự án trước, tôi đã sử dụng Django để xây dựng API", False, "Good project description"),
        
        # Time patterns - should be irrelevant
        ("6 giờ", True, "Time pattern"),
        ("6h", True, "Time pattern short"),
        ("6:30", True, "Time with colon"),
        ("6 pm", True, "Time with pm"),
        ("10am", True, "Time with am"),
        
        # Single words - should be irrelevant  
        ("ok", True, "Single word ok"),
        ("okay", True, "Single word okay"),
        ("yes", True, "Single word yes"),
        ("no", True, "Single word no"),
        ("không", True, "Single word Vietnamese"),
        ("có", True, "Single word Vietnamese"),
        ("được", True, "Single word Vietnamese"),
        
        # Only numbers - should be irrelevant
        ("123", True, "Only numbers"),
        ("0", True, "Single digit"),
        ("999", True, "Multiple digits"),
        
        # Casual expressions - should be irrelevant
        ("haha", True, "Casual laugh"),
        ("hehe", True, "Casual laugh 2"),
        ("lol", True, "Internet slang"),
        (":D", True, "Emoticon"),
        (":P", True, "Emoticon 2"),
        ("...", True, "Dots only"),
        
        # Only punctuation - should be irrelevant
        ("!!!", True, "Only exclamation"),
        ("???", True, "Only question marks"),
        ("...", True, "Only dots"),
        ("---", True, "Only dashes"),
        
        # Empty/short - should be irrelevant
        ("", True, "Empty string"),
        ("   ", True, "Only spaces"),
        ("a", True, "Single character"),
        ("ab", True, "Two characters"),
        
        # Edge cases that should be relevant
        ("Tôi ok với việc này", False, "Contains ok but longer"),
        ("Số 123 trong dự án", False, "Contains numbers but longer"),
        ("Haha, đó là một câu chuyện thú vị", False, "Contains haha but longer"),
    ]
    
    passed = 0
    total = len(test_cases)
    
    for answer, expected_irrelevant, description in test_cases:
        answer_clean = answer.strip().lower()
        is_irrelevant = False
        matched_pattern = None
        
        # Check length first
        if not answer_clean or len(answer_clean) < 3:
            is_irrelevant = True
            matched_pattern = "empty_or_short"
        else:
            # Check patterns
            for i, pattern in enumerate(irrelevant_patterns):
                if re.match(pattern, answer_clean):
                    is_irrelevant = True
                    matched_pattern = f"pattern_{i+1}"
                    break
        
        # Check result
        status = "❌ IRRELEVANT" if is_irrelevant else "✅ RELEVANT"
        expected_status = "❌ IRRELEVANT" if expected_irrelevant else "✅ RELEVANT"
        
        if is_irrelevant == expected_irrelevant:
            result = "✅ PASS"
            passed += 1
        else:
            result = "❌ FAIL"
        
        print(f"'{answer}' → {status} (Expected: {expected_status}) {result}")
        print(f"   Description: {description}")
        if matched_pattern:
            print(f"   Matched: {matched_pattern}")
        print()
    
    print(f"📊 RESULTS: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    
    if passed == total:
        print("🎉 ALL TESTS PASSED!")
    else:
        print(f"⚠️ {total-passed} tests failed")

def test_question_distribution():
    """Test question distribution logic"""
    print(f"\n📊 TESTING QUESTION DISTRIBUTION LOGIC")
    print("=" * 60)
    
    def get_question_distribution(question_count: int) -> dict:
        """Copy of distribution logic from services.py"""
        distributions = {
            5: {"warm_up": 1, "technical": 2, "behavioral": 1, "situational": 1},
            7: {"warm_up": 1, "technical": 3, "behavioral": 2, "situational": 1},
            8: {"warm_up": 1, "technical": 3, "behavioral": 2, "situational": 2},
            10: {"warm_up": 1, "technical": 4, "behavioral": 3, "situational": 2},
            12: {"warm_up": 1, "technical": 5, "behavioral": 3, "situational": 3},
        }

        # Fallback for other counts - proportional distribution
        if question_count not in distributions:
            # Handle edge cases: negative or zero counts
            if question_count <= 0:
                return {"warm_up": 0, "technical": 0, "behavioral": 0, "situational": 0}
            
            warm_up = 1
            remaining = question_count - 1
            
            # Ensure non-negative values
            if remaining <= 0:
                return {"warm_up": 1, "technical": 0, "behavioral": 0, "situational": 0}
            
            technical = max(2, remaining // 2)  # At least 2 technical
            behavioral = max(1, remaining // 3)  # At least 1 behavioral
            situational = max(0, remaining - technical - behavioral)  # Ensure non-negative
            return {"warm_up": warm_up, "technical": technical, "behavioral": behavioral, "situational": situational}

        return distributions[question_count]
    
    test_counts = [5, 7, 8, 10, 12, 3, 6, 9, 11, 15, 1, 0, -1]
    
    for count in test_counts:
        distribution = get_question_distribution(count)
        total = sum(distribution.values())
        
        print(f"Count {count:2d}: {distribution}")
        print(f"         Total: {total} (Expected: {max(0, count)})")
        
        # Validate
        if count <= 0:
            if total == 0:
                print("         ✅ Correctly handled edge case")
            else:
                print("         ❌ Should return 0 total for non-positive counts")
        elif count == 1:
            if distribution["warm_up"] == 1 and total == 1:
                print("         ✅ Correctly handled single question")
            else:
                print("         ❌ Single question should be warm_up only")
        else:
            if total == count:
                print("         ✅ Total matches expected")
            else:
                print(f"         ❌ Total mismatch - expected {count}, got {total}")
        print()

def test_guidance_templates():
    """Test guidance template generation"""
    print(f"\n💡 TESTING GUIDANCE TEMPLATES")
    print("=" * 60)
    
    def generate_guidance_for_irrelevant_answer(question: str, question_type: str, job_title: str) -> str:
        """Copy of guidance logic from services.py"""
        guidance_templates = {
            "warm_up": f"Hãy chia sẻ về động lực và mục tiêu của bạn khi ứng tuyển vị trí {job_title}. Câu trả lời nên thể hiện sự hiểu biết về công việc và lý do bạn phù hợp.",
            "technical": f"Đây là câu hỏi kỹ thuật về {job_title}. Hãy chia sẻ kinh nghiệm, kỹ năng hoặc công cụ cụ thể mà bạn đã sử dụng. Nếu chưa có kinh nghiệm, hãy nói về cách bạn sẽ học hỏi.",
            "behavioral": f"Câu hỏi này yêu cầu bạn chia sẻ kinh nghiệm thực tế từ quá khứ. Hãy sử dụng phương pháp STAR: Tình huống (S) → Nhiệm vụ (T) → Hành động (A) → Kết quả (R).",
            "situational": f"Đây là câu hỏi tình huống giả định. Hãy mô tả cách bạn sẽ xử lý tình huống này, bao gồm các bước cụ thể và lý do đằng sau quyết định của bạn."
        }
        
        return guidance_templates.get(question_type, f"Hãy trả lời câu hỏi một cách cụ thể và liên quan đến vị trí {job_title}. Câu trả lời nên thể hiện kỹ năng và kinh nghiệm của bạn.")
    
    test_cases = [
        ("Tại sao bạn muốn làm việc ở đây?", "warm_up", "Software Developer"),
        ("Bạn có kinh nghiệm gì về Python?", "technical", "Backend Developer"),
        ("Kể về lần bạn giải quyết xung đột trong team", "behavioral", "Team Lead"),
        ("Nếu server bị down, bạn sẽ làm gì?", "situational", "DevOps Engineer"),
        ("Câu hỏi không xác định", "unknown", "Generic Job"),
    ]
    
    for question, qtype, job_title in test_cases:
        guidance = generate_guidance_for_irrelevant_answer(question, qtype, job_title)
        print(f"Type: {qtype}")
        print(f"Job: {job_title}")
        print(f"Guidance: {guidance}")
        print(f"Length: {len(guidance)} characters")
        print()

if __name__ == "__main__":
    print("🚀 INTERVIEW VALIDATION LOGIC TEST")
    print("=" * 80)
    
    test_irrelevant_patterns()
    test_question_distribution()
    test_guidance_templates()
    
    print(f"\n✅ ALL VALIDATION TESTS COMPLETED")
    print("=" * 80)