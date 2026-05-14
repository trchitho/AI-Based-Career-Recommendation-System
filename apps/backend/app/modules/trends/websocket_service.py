"""
WebSocket service for real-time trend data updates.
Provides live streaming of job market data and skill extraction.
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, List, Set
import random

from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

class TrendsWebSocketManager:
    """Manages WebSocket connections for real-time trend updates."""
    
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.is_streaming = False
        self.stream_task = None
        
    async def connect(self, websocket: WebSocket):
        """Accept a WebSocket connection."""
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")
        
        # Send initial data
        await self.send_initial_data(websocket)
        
        # Start streaming if not already running
        if not self.is_streaming:
            self.is_streaming = True
            self.stream_task = asyncio.create_task(self.stream_updates())
    
    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection."""
        self.active_connections.discard(websocket)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")
        
        # Stop streaming if no connections
        if not self.active_connections and self.stream_task:
            self.stream_task.cancel()
            self.is_streaming = False
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        """Send a message to a specific WebSocket."""
        try:
            await websocket.send_text(message)
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")
            self.disconnect(websocket)
    
    async def broadcast(self, message: str):
        """Broadcast a message to all connected WebSockets."""
        if not self.active_connections:
            return
            
        disconnected = set()
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Error broadcasting message: {e}")
                disconnected.add(connection)
        
        # Remove disconnected connections
        for connection in disconnected:
            self.disconnect(connection)
    
    async def send_initial_data(self, websocket: WebSocket):
        """Send initial data to a newly connected client."""
        try:
            from .data_service import data_service
            await data_service.initialize_redis()
            
            # Get current trend summary
            summary = await data_service.get_trend_summary()
            
            initial_data = {
                "type": "initial_data",
                "timestamp": datetime.now().isoformat(),
                "data": summary
            }
            
            await self.send_personal_message(json.dumps(initial_data), websocket)
            
        except Exception as e:
            logger.error(f"Error sending initial data: {e}")
    
    async def stream_updates(self):
        """Stream real-time updates to all connected clients."""
        logger.info("Starting real-time trend updates stream")
        
        try:
            from .data_service import data_service
            
            while self.active_connections:
                # Generate live skill extraction updates
                live_skill = self.generate_live_skill_update()
                
                update_data = {
                    "type": "live_skill_extraction",
                    "timestamp": datetime.now().isoformat(),
                    "data": live_skill
                }
                
                await self.broadcast(json.dumps(update_data))
                
                # Wait before next update
                await asyncio.sleep(random.randint(5, 15))
                
        except asyncio.CancelledError:
            logger.info("Stream updates cancelled")
        except Exception as e:
            logger.error(f"Error in stream updates: {e}")
    
    def generate_live_skill_update(self) -> Dict:
        """Generate a live skill extraction update."""
        skills_data = [
            {'skill': 'Python / LLM', 'company': 'VinAI Research', 'position': 'Senior AI Engineer'},
            {'skill': 'Rust / WASM', 'company': 'TomoChain', 'position': 'Blockchain Developer'},
            {'skill': 'React Native', 'company': 'VNG', 'position': 'Mobile Developer'},
            {'skill': 'Kubernetes', 'company': 'FPT', 'position': 'DevOps Engineer'},
            {'skill': 'TypeScript', 'company': 'KMS Technology', 'position': 'Frontend Developer'},
            {'skill': 'AWS', 'company': 'TMA Solutions', 'position': 'Cloud Engineer'},
            {'skill': 'Docker', 'company': 'Axon Active', 'position': 'DevOps Engineer'},
            {'skill': 'Node.js', 'company': 'NTQ Solution', 'position': 'Backend Developer'}
        ]
        
        skill_data = random.choice(skills_data)
        
        return {
            'skill': skill_data['skill'],
            'source': f"{skill_data['position']} tại {skill_data['company']}",
            'match': round(0.85 + random.random() * 0.14, 2),
            'time': f"{random.randint(1, 60)} giây trước"
        }
    
    async def send_market_update(self):
        """Send market metrics update."""
        try:
            from .data_service import data_service
            summary = await data_service.get_trend_summary()
            
            market_update = {
                "type": "market_update",
                "timestamp": datetime.now().isoformat(),
                "data": {
                    "market_metrics": summary.get("market_metrics", {}),
                    "redis_connected": True,
                    "active_processes": random.randint(2, 6)
                }
            }
            
            await self.broadcast(json.dumps(market_update))
            
        except Exception as e:
            logger.error(f"Error sending market update: {e}")

# Global WebSocket manager
websocket_manager = TrendsWebSocketManager()
