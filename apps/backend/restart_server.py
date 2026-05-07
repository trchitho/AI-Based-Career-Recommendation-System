#!/usr/bin/env python3
"""
Script to restart the backend server
"""
import subprocess
import sys
import os

def restart_server():
    """Restart the uvicorn server"""
    try:
        print("🔄 Restarting backend server...")
        
        # Change to backend directory
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        os.chdir(backend_dir)
        
        # Kill existing process (if any)
        try:
            subprocess.run(["pkill", "-f", "uvicorn"], check=False)
        except:
            pass
        
        # Start server
        cmd = [
            sys.executable, "-m", "uvicorn", 
            "app.main:app", 
            "--reload", 
            "--port", "8000",
            "--host", "127.0.0.1"
        ]
        
        print(f"🚀 Starting server: {' '.join(cmd)}")
        subprocess.run(cmd)
        
    except KeyboardInterrupt:
        print("\n⏹️  Server stopped by user")
    except Exception as e:
        print(f"❌ Error starting server: {e}")

if __name__ == "__main__":
    restart_server()