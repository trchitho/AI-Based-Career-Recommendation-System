"""
Restart server and test Gemini functionality
"""
import os
import sys
import time
import requests
import subprocess
from dotenv import load_dotenv

# Load environment variables
load_dotenv('apps/backend/.env')

def test_assessment_endpoint():
    """Test assessment endpoint to see if Gemini is working"""
    try:
        print("🔧 Testing assessment endpoint...")
        
        # First test simple questions endpoint
        response = requests.get(
            'http://localhost:8000/api/assessments/questions/BIGFIVE?shuffle=true&per_dim=2',
            timeout=10
        )
        
        if response.status_code == 200:
            print("✅ Questions endpoint working")
        else:
            print(f"⚠️ Questions endpoint: {response.status_code}")
        
        # Test story generation with proper format
        response = requests.post(
            'http://localhost:8000/api/assessments/generate-stories-batch',
            json={
                "questions": [
                    {
                        "id": 1,
                        "dimension": "openness",
                        "text": "I enjoy trying new things",
                        "reverse": False
                    }
                ],
                "lang": "vi"
            },
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('stories') and len(data['stories']) > 0:
                story = data['stories'][0]
                print(f"✅ Story generation working - Generated: '{story.get('story', '')[:50]}...'")
                return True
            else:
                print("⚠️ Story generation returned empty results")
                print(f"Response: {data}")
                return False
        else:
            print(f"❌ Story generation failed: {response.status_code}")
            try:
                error_detail = response.json()
                print(f"Error details: {error_detail}")
            except:
                print(f"Response text: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend server - is it running?")
        return False
    except Exception as e:
        print(f"❌ Assessment test failed: {e}")
        return False

def check_server_status():
    """Check if backend server is running"""
    try:
        response = requests.get('http://localhost:8000/health', timeout=5)
        return response.status_code == 200
    except:
        return False

def main():
    """Main function to restart and test"""
    print("🚀 RESTARTING SERVER AND TESTING GEMINI")
    print("="*50)
    
    # Check if server is running
    if check_server_status():
        print("✅ Backend server is running")
    else:
        print("❌ Backend server is not running")
        print("🔧 Please start the server manually:")
        print("   cd apps/backend")
        print("   python -m uvicorn app.main:app --reload")
        return False
    
    # Wait a moment for server to be ready
    print("⏳ Waiting for server to be ready...")
    time.sleep(3)
    
    # Test Gemini functionality
    print("\n🧪 Testing Gemini functionality...")
    
    if test_assessment_endpoint():
        print("\n🎉 SUCCESS!")
        print("✅ Gemini API keys are working")
        print("✅ Assessment functionality is operational")
        print("✅ Server is ready for use")
        
        print("\n📋 System Status:")
        print("   - Backend: ✅ Running on http://localhost:8000")
        print("   - Gemini AI: ✅ Working")
        print("   - Assessment: ✅ Functional")
        print("   - Story Generation: ✅ Working")
        
        return True
    else:
        print("\n⚠️ PARTIAL SUCCESS")
        print("✅ Server is running")
        print("❌ Gemini functionality may have issues")
        print("\n🔧 Troubleshooting:")
        print("   1. Check server logs for Gemini errors")
        print("   2. Verify API keys are not rate limited")
        print("   3. Try restarting the server")
        
        return False

if __name__ == '__main__':
    success = main()
    
    if success:
        print("\n🎯 Ready to use!")
        print("   Frontend: http://localhost:3000")
        print("   Backend API: http://localhost:8000")
        print("   Assessment: Working with new API keys")
    else:
        print("\n❌ Some issues detected. Check the logs above.")
    
    sys.exit(0 if success else 1)