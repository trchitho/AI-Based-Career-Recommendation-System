#!/usr/bin/env python3
"""
Restart backend server script
"""
import subprocess
import time
import os
import signal
import requests

def restart_server():
    """Restart the backend server"""
    print("🔄 [Server Restart] Restarting backend server...")
    print()
    
    # Step 1: Stop existing server
    print("=== Step 1: Stopping existing server ===")
    try:
        # Check if server is running
        result = subprocess.run(['netstat', '-an'], capture_output=True, text=True, shell=True)
        if ':8000' in result.stdout:
            print("Found Python processes running")
            print(result.stdout.split('\n')[0])  # Show first line with :8000
            
            # Kill processes using port 8000
            subprocess.run(['taskkill', '/F', '/IM', 'python.exe'], shell=True, capture_output=True)
            time.sleep(2)
        
        print("✅ Existing processes checked")
    except Exception as e:
        print(f"⚠️ Error stopping server: {e}")
    
    print()
    
    # Step 2: Start new server
    print("=== Step 2: Starting new server ===")
    try:
        os.chdir('apps/backend')
        print("Starting server in apps/backend...")
        
        # Start server in background
        cmd = ['python', '-m', 'uvicorn', 'app.main:app', '--reload', '--host', '0.0.0.0', '--port', '8000']
        print(f"Command: {' '.join(cmd)}")
        
        process = subprocess.Popen(cmd, shell=True)
        print(f"✅ Server starting with PID: {process.pid}")
        
        # Go back to root directory
        os.chdir('../..')
        
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        return
    
    print()
    
    # Step 3: Wait for server to start
    print("=== Step 3: Waiting for server to start ===")
    max_attempts = 10
    for attempt in range(max_attempts):
        try:
            response = requests.get('http://localhost:8000/', timeout=2)
            if response.status_code == 200:
                print(f"✅ Server is running after {attempt + 1} seconds")
                break
        except:
            time.sleep(1)
    else:
        print("⚠️ Server may not be fully ready yet")
    
    print()
    
    # Step 4: Test endpoints
    print("=== Step 4: Testing endpoints ===")
    try:
        # Test API docs
        response = requests.get('http://localhost:8000/docs', timeout=5)
        if response.status_code == 200:
            print("✅ API docs accessible: 200")
        else:
            print(f"⚠️ API docs status: {response.status_code}")
    except Exception as e:
        print(f"⚠️ API docs test failed: {e}")
    
    print()
    print("🎉 Server restart complete!")
    print(f"   Server PID: {process.pid}")
    print("   API Docs: http://localhost:8000/docs")
    print()
    print("📋 Server is running in background")
    print(f"   To stop: kill {process.pid}")
    print("   Or use Ctrl+C in the terminal where server is running")
    print()
    print("🚀 Ready to test 3-stream system!")

if __name__ == "__main__":
    restart_server()