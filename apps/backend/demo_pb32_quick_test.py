#!/usr/bin/env python3
"""
PB32 - Quick Demo Test
Chạy thử nghiệm nhanh để kiểm tra API NLP hoạt động

Demo này sẽ:
1. Test kết nối AI-core và Gemini
2. Chạy 1 test case đơn giản
3. Hiển thị kết quả phân tích
4. Đo thời gian phản hồi
"""

import json
import os
import sys
import time

# Add the app directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

try:
    from app.modules.nlp.service_nlp import (
        AI_CORE_URL,
        BIG5_KEYS,
        RIASEC_KEYS,
        _analyze_via_aicore,
        _analyze_via_gemini,
        analyze_essay,
        get_embedding,
    )
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure you're running from the backend directory")
    sys.exit(1)

def test_service_availability():
    """Test if services are available"""
    print("🔧 Checking service availability...")
    
    # Test AI-core
    try:
        result = _analyze_via_aicore("Test text", "vi")
        ai_core_available = result is not None
    except Exception:
        ai_core_available = False
    
    # Test Gemini
    try:
        result = _analyze_via_gemini("Test text")
        gemini_available = result.get('source') == 'gemini'
    except Exception:
        gemini_available = False
    
    print(f"  AI-core ({AI_CORE_URL}): {'✅ Available' if ai_core_available else '❌ Unavailable'}")
    print(f"  Gemini API: {'✅ Available' if gemini_available else '❌ Unavailable'}")
    
    return ai_core_available, gemini_available

def run_quick_demo():
    """Run quick demo test"""
    print("🚀 PB32 - PhoBERT NLP Quick Demo")
    print("=" * 50)
    
    # Check services
    ai_core_available, gemini_available = test_service_availability()
    
    if not ai_core_available and not gemini_available:
        print("❌ No NLP services available. Please check your configuration.")
        return False
    
    # Demo text (Vietnamese)
    demo_text = """Tôi là một kỹ sư phần mềm với 3 năm kinh nghiệm. Tôi thích giải quyết các vấn đề 
    kỹ thuật phức tạp và tạo ra những sản phẩm hữu ích. Tôi thường làm việc độc lập nhưng cũng hợp tác 
    tốt với đội nhóm khi cần thiết. Tôi có tính cách thực tế, thích những công việc có kết quả cụ thể 
    và không thích những hoạt động quá xã hội hay sáng tạo nghệ thuật."""
    
    print(f"\n📝 Demo text ({len(demo_text)} characters):")
    print(f"'{demo_text[:100]}...'")
    
    # Analyze the text
    print("\n🤖 Analyzing with PhoBERT NLP...")
    
    start_time = time.perf_counter()
    result = analyze_essay(demo_text, "vi")
    end_time = time.perf_counter()
    
    response_time = (end_time - start_time) * 1000
    
    print(f"⏱️  Response time: {response_time:.1f}ms")
    print(f"🔧 Source: {result.get('source', 'unknown')}")
    print(f"🌐 Detected language: {result.get('detected_lang', 'unknown')}")
    print(f"📊 From cache: {result.get('from_cache', False)}")
    
    # Display RIASEC results
    riasec_scores = result.get('riasec', [])
    if riasec_scores and len(riasec_scores) == 6:
        print("\n📊 RIASEC Scores (0-1 scale):")
        for i, (key, score) in enumerate(zip(RIASEC_KEYS, riasec_scores)):
            percentage = score * 100
            bar = "█" * int(percentage / 5) + "░" * (20 - int(percentage / 5))
            print(f"  {key.capitalize():<13}: {score:.3f} |{bar}| {percentage:.1f}%")
        
        # Find dominant trait
        max_idx = riasec_scores.index(max(riasec_scores))
        dominant_trait = RIASEC_KEYS[max_idx]
        print(f"\n🏆 Dominant RIASEC trait: {dominant_trait.upper()} ({riasec_scores[max_idx]:.3f})")
    
    # Display Big Five results
    big5_scores = result.get('big5', [])
    if big5_scores and len(big5_scores) == 5:
        print("\n📊 Big Five Scores (0-1 scale):")
        for i, (key, score) in enumerate(zip(BIG5_KEYS, big5_scores)):
            percentage = score * 100
            bar = "█" * int(percentage / 5) + "░" * (20 - int(percentage / 5))
            print(f"  {key.capitalize():<15}: {score:.3f} |{bar}| {percentage:.1f}%")
    
    # Display embedding info
    embedding = result.get('embedding', [])
    if embedding:
        print(f"\n🔢 Embedding: {len(embedding)}D vector")
        print(f"   Sample values: [{embedding[0]:.4f}, {embedding[1]:.4f}, {embedding[2]:.4f}, ...]")
        
        # Calculate embedding statistics
        import statistics
        mean_val = statistics.mean(embedding)
        std_val = statistics.stdev(embedding) if len(embedding) > 1 else 0
        print(f"   Statistics: mean={mean_val:.4f}, std={std_val:.4f}")
    
    # Display traits (if available)
    traits_vi = result.get('traits_vi', [])
    if traits_vi:
        print("\n🎯 Personality traits (Vietnamese):")
        for trait in traits_vi[:3]:  # Show first 3 traits
            print(f"   • {trait}")
    
    # Performance assessment
    print("\n📈 Performance Assessment:")
    
    if response_time < 1000:
        print(f"   ✅ Excellent response time ({response_time:.1f}ms < 1000ms)")
    elif response_time < 2000:
        print(f"   🟡 Good response time ({response_time:.1f}ms < 2000ms)")
    else:
        print(f"   🔴 Slow response time ({response_time:.1f}ms > 2000ms)")
    
    if riasec_scores and all(0 <= score <= 1 for score in riasec_scores):
        print("   ✅ RIASEC scores properly normalized (0-1 range)")
    else:
        print("   ❌ RIASEC scores not properly normalized")
    
    if big5_scores and all(0 <= score <= 1 for score in big5_scores):
        print("   ✅ Big Five scores properly normalized (0-1 range)")
    else:
        print("   ❌ Big Five scores not properly normalized")
    
    if embedding and len(embedding) == 768:
        print("   ✅ Embedding has correct dimension (768D)")
    else:
        print(f"   ❌ Embedding dimension incorrect ({len(embedding)}D, expected 768D)")
    
    # Save demo result
    demo_result = {
        "demo_info": {
            "timestamp": time.time(),
            "text_length": len(demo_text),
            "response_time_ms": response_time
        },
        "analysis_result": result,
        "services": {
            "ai_core_available": ai_core_available,
            "gemini_available": gemini_available
        }
    }
    
    with open("pb32_demo_result.json", "w", encoding="utf-8") as f:
        json.dump(demo_result, f, indent=2, ensure_ascii=False)
    
    print("\n📄 Demo result saved to: pb32_demo_result.json")
    print("\n🎉 Demo completed successfully!")
    
    return True

def main():
    """Main function"""
    try:
        success = run_quick_demo()
        return 0 if success else 1
    except KeyboardInterrupt:
        print("\n⚠️  Demo interrupted by user")
        return 1
    except Exception as e:
        print(f"\n❌ Demo failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)