#!/usr/bin/env python3
import requests
import json

def test_login():
    """Test login endpoint"""
    login_url = "http://localhost:8000/api/auth/login"
    
    payload = {
        "email": "admin@test.com",
        "password": "admin123"
    }
    
    try:
        response = requests.post(login_url, json=payload)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token")
            print(f"Token: {token[:50]}..." if token else "No token")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_login()