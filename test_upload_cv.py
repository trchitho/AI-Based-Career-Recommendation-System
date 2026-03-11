"""
Test script to verify CV upload and analysis
"""
import requests
import json

# Configuration
API_URL = "http://localhost:8000/api/skill-gap/analyze"
TOKEN = "YOUR_TOKEN_HERE"  # Replace with actual token from localStorage

def test_upload():
    """Test CV upload endpoint"""
    
    # Create a simple test PDF content
    test_content = b"%PDF-1.4\nTest CV content with skills: Python, JavaScript, React, Node.js"
    
    # Prepare form data
    files = {
        'cv_file': ('test_cv.pdf', test_content, 'application/pdf')
    }
    data = {
        'career_id': 'software-engineer'
    }
    headers = {
        'Authorization': f'Bearer {TOKEN}'
    }
    
    print("Testing CV upload...")
    print(f"URL: {API_URL}")
    print(f"Career ID: {data['career_id']}")
    
    try:
        response = requests.post(API_URL, files=files, data=data, headers=headers)
        
        print(f"\nStatus Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            print("\n✅ SUCCESS! CV analysis completed")
        else:
            print(f"\n❌ FAILED with status {response.status_code}")
            
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")

if __name__ == "__main__":
    print("=" * 60)
    print("CV Upload Test")
    print("=" * 60)
    print("\nIMPORTANT: Update TOKEN variable with your actual token")
    print("You can get it from browser localStorage.getItem('accessToken')")
    print("\n" + "=" * 60 + "\n")
    
    # Uncomment to run test
    # test_upload()
    print("Please update TOKEN and uncomment test_upload() to run")
