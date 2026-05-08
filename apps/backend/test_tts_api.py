#!/usr/bin/env python3
"""
Test TTS API endpoints to verify the complete fix
"""
import asyncio
import json
import sys
from pathlib import Path

# Add the app directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

import httpx


async def test_tts_api():
    """Test the TTS API endpoints"""
    
    base_url = "http://localhost:8000"
    
    print("🚀 Testing TTS API Endpoints")
    print("="*60)
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        
        # Test 1: TTS Health Check
        print("\n🔧 Test 1: TTS Health Check")
        print("-" * 40)
        
        try:
            response = await client.get(f"{base_url}/api/interview/voice/tts-health")
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                health_data = response.json()
                print(f"Overall Status: {health_data.get('overall_status', 'unknown')}")
                print(f"Edge TTS: {health_data.get('edge_tts', {}).get('status', 'unknown')}")
                print(f"Fallback gTTS: {health_data.get('fallback_gtts', {}).get('status', 'unknown')}")
                print(f"Fallback pyttsx3: {health_data.get('fallback_pyttsx3', {}).get('status', 'unknown')}")
                print("✅ Health check successful")
            else:
                print(f"❌ Health check failed: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Health check error: {e}")
        
        # Test 2: Direct TTS Endpoint
        print("\n🔧 Test 2: Direct TTS Endpoint")
        print("-" * 40)
        
        try:
            tts_payload = {
                "text": "Chào bạn, đây là test TTS system.",
                "voice_preference": "female"
            }
            
            response = await client.post(
                f"{base_url}/api/interview/voice/tts",
                json=tts_payload
            )
            
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                tts_data = response.json()
                print(f"Success: {tts_data.get('success', False)}")
                print(f"Voice Used: {tts_data.get('voice_used', 'unknown')}")
                print(f"Duration: {tts_data.get('duration_seconds', 0):.1f}s")
                print(f"Audio URL: {tts_data.get('audio_url', 'None')}")
                print(f"Fallback Reason: {tts_data.get('fallback_reason', 'None')}")
                print(f"Method Used: {tts_data.get('method_used', 'unknown')}")
                
                if tts_data.get('success'):
                    print("✅ TTS endpoint successful")
                else:
                    print("⚠️  TTS endpoint returned graceful fallback")
            else:
                print(f"❌ TTS endpoint failed: {response.status_code}")
                print(f"Response: {response.text}")
                
        except Exception as e:
            print(f"❌ TTS endpoint error: {e}")
    
    print("\n" + "="*60)
    print("🎉 API Test Complete!")


if __name__ == "__main__":
    print("⚠️  Make sure the FastAPI server is running on localhost:8000")
    print("   Run: uvicorn app.main:app --reload --port 8000")
    print()
    
    try:
        asyncio.run(test_tts_api())
    except KeyboardInterrupt:
        print("\n❌ Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        sys.exit(1)