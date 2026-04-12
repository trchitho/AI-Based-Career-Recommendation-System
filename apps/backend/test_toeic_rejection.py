"""
Test TOEIC Answer Key Rejection - TC-TOEIC-01

This test verifies that TOEIC test answer keys are correctly rejected
by the Gemini AI validation step, preventing false positives.

User's requirement: "sau khi đưa text vào API gemini thì phải hỏi đây có phải là CV không rồi mới phân tích"
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.modules.skill_gap.cv_parser_v2 import CVParserV2


def test_toeic_answer_key_rejection():
    """
    TC-TOEIC-01: TOEIC Answer Key Rejection
    
    Test case:
    - Input: Text extracted from TOEIC answer key PDF
    - Expected: System rejects with error message indicating it's not a CV
    - Reason: Gemini AI should identify this as a test answer key, not a CV
    """
    print("\n" + "="*80)
    print("TEST: TC-TOEIC-01 - TOEIC Answer Key Rejection")
    print("="*80)
    
    # Sample text from TOEIC answer key (from user's log)
    toeic_text = """
CHỮA CHI TIẾT ETS 2023 | 235 PART 5 
Câu hỏi Đáp án Giải thích Tạm dịch Mở rộng 
101 C Cần điền một danh từ đứng trước cụm "of art supplies" để tạo thành cụm danh từ làm tân ngữ trong câu 
Trung tâm Cộng đồng Sandville đã nhận quyên góp vật tư nghệ thuật. 
Supply (v) cung cấp Supply (n) nguồn cung cấp 
102 B Câu còn thiếu động từ --> loại đáp án C. discussion (n) và D. discussing (V-ing) 
Chủ ngữ số nhiều "The sales associates" → chọn B - động từ nguyên thể 
Các cộng tác viên bán hàng thường thảo luận về các chiến lược bán hàng mới trong các cuộc họp hàng tuần.
103 A Cần điền một tính từ bổ nghĩa cho danh từ "design" phía sau
The company's new product has a modern design that appeals to younger consumers.
Sản phẩm mới của công ty có thiết kế hiện đại thu hút người tiêu dùng trẻ tuổi.
104 D Cần điền một danh từ làm tân ngữ cho động từ "provide"
The hotel provides complimentary breakfast for all guests staying more than one night.
Khách sạn cung cấp bữa sáng miễn phí cho tất cả khách lưu trú hơn một đêm.
105 B Cần điền một động từ chia ở thì quá khứ đơn
The manager reviewed the sales report before the meeting yesterday.
Người quản lý đã xem xét báo cáo bán hàng trước cuộc họp hôm qua.
"""
    
    parser = CVParserV2()
    
    print("\n📝 Testing with TOEIC answer key text...")
    print(f"Text length: {len(toeic_text)} chars")
    print(f"Text preview: {toeic_text[:200]}...")
    
    try:
        # This should call _ask_gemini_is_cv() and reject
        result = parser._ask_gemini_is_cv(toeic_text)
        
        print(f"\n📊 Result: {result}")
        
        if result:
            print("\n❌ TEST FAILED: System accepted TOEIC answer key as CV")
            print("   Expected: False (reject)")
            print("   Actual: True (accept)")
            return False
        else:
            print("\n✅ TEST PASSED: System correctly rejected TOEIC answer key")
            print("   Expected: False (reject)")
            print("   Actual: False (reject)")
            return True
            
    except Exception as e:
        print(f"\n❌ TEST ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_valid_cv_acceptance():
    """
    TC-CV-VALID-01: Valid CV Acceptance
    
    Test case:
    - Input: Text from a valid CV
    - Expected: System accepts it as a CV
    - Reason: Gemini AI should identify this as a legitimate CV
    """
    print("\n" + "="*80)
    print("TEST: TC-CV-VALID-01 - Valid CV Acceptance")
    print("="*80)
    
    # Sample text from a valid CV
    valid_cv_text = """
JOHN DOE
Software Engineer

Contact Information:
Email: john.doe@email.com
Phone: +84 123 456 789
Location: Ho Chi Minh City, Vietnam

PROFESSIONAL SUMMARY
Experienced Software Engineer with 5+ years of expertise in full-stack development.
Proficient in Python, JavaScript, React, and Node.js. Strong problem-solving skills
and proven track record of delivering high-quality software solutions.

WORK EXPERIENCE

Senior Software Engineer | Tech Company Inc. | 2020 - Present
- Led development of microservices architecture using Python and Docker
- Implemented CI/CD pipelines reducing deployment time by 50%
- Mentored junior developers and conducted code reviews
- Technologies: Python, Django, React, PostgreSQL, AWS

Software Developer | StartUp Co. | 2018 - 2020
- Developed RESTful APIs for mobile applications
- Built responsive web applications using React and TypeScript
- Collaborated with cross-functional teams in Agile environment
- Technologies: JavaScript, Node.js, MongoDB, React

EDUCATION

Bachelor of Computer Science | University of Technology | 2014 - 2018
- GPA: 3.8/4.0
- Relevant coursework: Data Structures, Algorithms, Database Systems

SKILLS

Technical Skills:
- Programming: Python, JavaScript, TypeScript, Java
- Web Development: React, Node.js, Django, Express.js
- Database: PostgreSQL, MongoDB, MySQL
- Cloud: AWS, Docker, Kubernetes
- Tools: Git, Jenkins, JIRA

Soft Skills:
- Team Leadership
- Problem Solving
- Communication
- Agile/Scrum
"""
    
    parser = CVParserV2()
    
    print("\n📝 Testing with valid CV text...")
    print(f"Text length: {len(valid_cv_text)} chars")
    print(f"Text preview: {valid_cv_text[:200]}...")
    
    try:
        result = parser._ask_gemini_is_cv(valid_cv_text)
        
        print(f"\n📊 Result: {result}")
        
        if result:
            print("\n✅ TEST PASSED: System correctly accepted valid CV")
            print("   Expected: True (accept)")
            print("   Actual: True (accept)")
            return True
        else:
            print("\n❌ TEST FAILED: System rejected valid CV")
            print("   Expected: True (accept)")
            print("   Actual: False (reject)")
            return False
            
    except Exception as e:
        print(f"\n❌ TEST ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_textbook_rejection():
    """
    TC-TEXTBOOK-01: Textbook/Study Material Rejection
    
    Test case:
    - Input: Text from a textbook or study material
    - Expected: System rejects it as not a CV
    """
    print("\n" + "="*80)
    print("TEST: TC-TEXTBOOK-01 - Textbook Rejection")
    print("="*80)
    
    textbook_text = """
CHAPTER 5: OBJECT-ORIENTED PROGRAMMING

5.1 Introduction to Classes and Objects

Object-oriented programming (OOP) is a programming paradigm based on the concept
of "objects", which can contain data and code. The data is in the form of fields
(often known as attributes or properties), and the code is in the form of procedures
(often known as methods).

5.1.1 Defining a Class

A class is a blueprint for creating objects. In Python, you define a class using
the 'class' keyword:

class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age
    
    def greet(self):
        return f"Hello, my name is {self.name}"

5.1.2 Creating Objects

Once you have defined a class, you can create instances (objects) of that class:

person1 = Person("Alice", 30)
person2 = Person("Bob", 25)

5.2 Inheritance

Inheritance is a mechanism that allows you to create a new class based on an
existing class. The new class inherits attributes and methods from the existing class.

Example:
class Student(Person):
    def __init__(self, name, age, student_id):
        super().__init__(name, age)
        self.student_id = student_id

EXERCISES:
1. Create a class called 'Car' with attributes for make, model, and year.
2. Add a method to the Car class that returns a description of the car.
3. Create a subclass called 'ElectricCar' that inherits from Car.
"""
    
    parser = CVParserV2()
    
    print("\n📝 Testing with textbook text...")
    print(f"Text length: {len(textbook_text)} chars")
    
    try:
        result = parser._ask_gemini_is_cv(textbook_text)
        
        print(f"\n📊 Result: {result}")
        
        if result:
            print("\n❌ TEST FAILED: System accepted textbook as CV")
            return False
        else:
            print("\n✅ TEST PASSED: System correctly rejected textbook")
            return True
            
    except Exception as e:
        print(f"\n❌ TEST ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    print("\n" + "="*80)
    print("TOEIC ANSWER KEY REJECTION TEST SUITE")
    print("Testing Gemini AI validation to prevent false positives")
    print("="*80)
    
    results = []
    
    # Test 1: TOEIC answer key should be rejected
    results.append(("TC-TOEIC-01: TOEIC Rejection", test_toeic_answer_key_rejection()))
    
    # Test 2: Valid CV should be accepted
    results.append(("TC-CV-VALID-01: Valid CV Acceptance", test_valid_cv_acceptance()))
    
    # Test 3: Textbook should be rejected
    results.append(("TC-TEXTBOOK-01: Textbook Rejection", test_textbook_rejection()))
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        sys.exit(0)
    else:
        print(f"\n⚠️ {total - passed} test(s) failed")
        sys.exit(1)
