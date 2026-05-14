"""
Test script to check if /api/admin/careers endpoint returns Vietnamese titles
"""
import requests
import json

# Test endpoint
url = "http://localhost:8000/api/admin/careers?limit=5&offset=0"

# You need to add admin token here
headers = {
    "X-Admin-Token": "your-admin-token-here"  # Replace with actual token from .env
}

try:
    response = requests.get(url, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"\nResponse:")
    
    if response.status_code == 200:
        data = response.json()
        print(json.dumps(data, indent=2, ensure_ascii=False))
        
        # Check if title_vi is present
        if data.get('items'):
            first_item = data['items'][0]
            print(f"\n=== First Career ===")
            print(f"Title: {first_item.get('title')}")
            print(f"Title VI: {first_item.get('title_vi')}")
            print(f"Title EN: {first_item.get('title_en')}")
    else:
        print(response.text)
        
except Exception as e:
    print(f"Error: {e}")
