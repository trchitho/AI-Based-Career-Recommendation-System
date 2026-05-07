"""
Voice Performance Service - Theo dõi và phân tích hiệu suất voice processing
"""
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from datetime import datetime, timedelta

from app.models.voice_performance_metrics import VoicePerformanceMetrics
from app.core.db import get_db


class VoicePerformanceService:
    """Service để quản lý voice performance metrics"""

    def __init__(self, db: Session):
        self.db = db

    def record_performance(
        self,
        session_id: int,
        stage: str,
        processing_time: float,
        input_size: Optional[int] = None,
        output_size: Optional[int] = None,
        success: bool = True,
        error_message: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> VoicePerformanceMetrics:
        """
        Ghi lại performance metric
        
        Args:
            session_id: Interview session ID
            stage: Processing stage (stt, ai, tts, total)
            processing_time: Time taken in seconds
            input_size: Input size in bytes/characters
            output_size: Output size in bytes/characters
            success: Whether processing succeeded
            error_message: Error message if failed
            metadata: Additional metadata
            
        Returns:
            VoicePerformanceMetrics object
        """
        if not VoicePerformanceMetrics.is_valid_stage(stage):
            raise ValueError(f"Invalid stage: {stage}")
            
        metric = VoicePerformanceMetrics.create_metric(
            session_id=session_id,
            stage=stage,
            processing_time=processing_time,
            input_size=input_size,
            output_size=output_size,
            success=success,
            error_message=error_message,
            metadata=metadata
        )
        
        self.db.add(metric)
        self.db.commit()
        self.db.refresh(metric)
        return metric

    def get_session_metrics(self, session_id: int) -> List[VoicePerformanceMetrics]:
        """
        Lấy tất cả metrics của một session
        
        Args:
            session_id: Interview session ID
            
        Returns:
            List of VoicePerformanceMetrics objects
        """
        return self.db.query(VoicePerformanceMetrics).filter(
            VoicePerformanceMetrics.session_id == session_id
        ).order_by(VoicePerformanceMetrics.created_at).all()

    def get_session_performance_summary(self, session_id: int) -> Dict[str, Any]:
        """
        Lấy tóm tắt performance của một session
        
        Args:
            session_id: Interview session ID
            
        Returns:
            Dictionary chứa performance summary
        """
        metrics = self.get_session_metrics(session_id)
        
        if not metrics:
            return {"session_id": session_id, "metrics": [], "summary": {}}
        
        # Group metrics by stage
        stage_metrics = {}
        for metric in metrics:
            stage = metric.stage
            if stage not in stage_metrics:
                stage_metrics[stage] = []
            stage_metrics[stage].append(metric)
        
        # Calculate summary for each stage
        stage_summaries = {}
        total_time = 0
        total_success = 0
        total_count = len(metrics)
        
        for stage, stage_metrics_list in stage_metrics.items():
            avg_time = sum(m.processing_time for m in stage_metrics_list) / len(stage_metrics_list)
            success_rate = sum(1 for m in stage_metrics_list if m.success) / len(stage_metrics_list)
            
            stage_summaries[stage] = {
                "count": len(stage_metrics_list),
                "avg_processing_time": round(avg_time, 3),
                "success_rate": round(success_rate, 3),
                "total_time": sum(m.processing_time for m in stage_metrics_list)
            }
            
            if stage != "total":  # Don't double count total stage
                total_time += stage_summaries[stage]["total_time"]
            
            total_success += sum(1 for m in stage_metrics_list if m.success)
        
        return {
            "session_id": session_id,
            "metrics": [m.to_dict() for m in metrics],
            "summary": {
                "total_metrics": total_count,
                "total_processing_time": round(total_time, 3),
                "overall_success_rate": round(total_success / total_count, 3) if total_count > 0 else 0,
                "stage_breakdown": stage_summaries
            }
        }

    def get_system_performance_stats(
        self,
        hours_back: int = 24,
        stage: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Lấy thống kê performance của toàn hệ thống
        
        Args:
            hours_back: Số giờ muốn lấy thống kê (default: 24h)
            stage: Lọc theo stage cụ thể (optional)
            
        Returns:
            Dictionary chứa system performance stats
        """
        since_time = datetime.utcnow() - timedelta(hours=hours_back)
        
        query = self.db.query(VoicePerformanceMetrics).filter(
            VoicePerformanceMetrics.created_at >= since_time
        )
        
        if stage:
            query = query.filter(VoicePerformanceMetrics.stage == stage)
        
        metrics = query.all()
        
        if not metrics:
            return {
                "period_hours": hours_back,
                "stage_filter": stage,
                "total_requests": 0,
                "stats": {}
            }
        
        # Calculate overall stats
        total_requests = len(metrics)
        successful_requests = sum(1 for m in metrics if m.success)
        total_processing_time = sum(m.processing_time for m in metrics)
        avg_processing_time = total_processing_time / total_requests
        
        # Group by stage
        stage_stats = {}
        for metric in metrics:
            stage_name = metric.stage
            if stage_name not in stage_stats:
                stage_stats[stage_name] = {
                    "count": 0,
                    "success_count": 0,
                    "total_time": 0,
                    "min_time": float('inf'),
                    "max_time": 0,
                    "errors": []
                }
            
            stats = stage_stats[stage_name]
            stats["count"] += 1
            if metric.success:
                stats["success_count"] += 1
            else:
                stats["errors"].append(metric.error_message)
            
            stats["total_time"] += metric.processing_time
            stats["min_time"] = min(stats["min_time"], metric.processing_time)
            stats["max_time"] = max(stats["max_time"], metric.processing_time)
        
        # Calculate averages and rates
        for stage_name, stats in stage_stats.items():
            stats["avg_time"] = round(stats["total_time"] / stats["count"], 3)
            stats["success_rate"] = round(stats["success_count"] / stats["count"], 3)
            stats["min_time"] = round(stats["min_time"], 3)
            stats["max_time"] = round(stats["max_time"], 3)
            # Keep only unique errors
            stats["unique_errors"] = list(set(filter(None, stats["errors"])))
            del stats["errors"]  # Remove raw errors list
        
        return {
            "period_hours": hours_back,
            "stage_filter": stage,
            "total_requests": total_requests,
            "successful_requests": successful_requests,
            "overall_success_rate": round(successful_requests / total_requests, 3),
            "avg_processing_time": round(avg_processing_time, 3),
            "total_processing_time": round(total_processing_time, 3),
            "stage_breakdown": stage_stats
        }

    def get_slow_requests(
        self,
        threshold_seconds: float = 10.0,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Lấy các requests chậm nhất
        
        Args:
            threshold_seconds: Ngưỡng thời gian (giây)
            limit: Số lượng kết quả tối đa
            
        Returns:
            List of slow request dictionaries
        """
        slow_metrics = self.db.query(VoicePerformanceMetrics).filter(
            VoicePerformanceMetrics.processing_time >= threshold_seconds
        ).order_by(desc(VoicePerformanceMetrics.processing_time)).limit(limit).all()
        
        return [
            {
                "session_id": metric.session_id,
                "stage": metric.stage,
                "processing_time": metric.processing_time,
                "success": metric.success,
                "error_message": metric.error_message,
                "created_at": metric.created_at.isoformat() if metric.created_at else None,
                "metadata": metric.metadata_json
            }
            for metric in slow_metrics
        ]

    def get_error_analysis(self, hours_back: int = 24) -> Dict[str, Any]:
        """
        Phân tích lỗi trong khoảng thời gian
        
        Args:
            hours_back: Số giờ muốn phân tích
            
        Returns:
            Dictionary chứa error analysis
        """
        since_time = datetime.utcnow() - timedelta(hours=hours_back)
        
        failed_metrics = self.db.query(VoicePerformanceMetrics).filter(
            VoicePerformanceMetrics.created_at >= since_time,
            VoicePerformanceMetrics.success == False
        ).all()
        
        if not failed_metrics:
            return {
                "period_hours": hours_back,
                "total_errors": 0,
                "error_breakdown": {}
            }
        
        # Group errors by stage and message
        error_breakdown = {}
        for metric in failed_metrics:
            stage = metric.stage
            error_msg = metric.error_message or "Unknown error"
            
            if stage not in error_breakdown:
                error_breakdown[stage] = {}
            
            if error_msg not in error_breakdown[stage]:
                error_breakdown[stage][error_msg] = {
                    "count": 0,
                    "sessions": set(),
                    "avg_processing_time": 0,
                    "total_processing_time": 0
                }
            
            error_info = error_breakdown[stage][error_msg]
            error_info["count"] += 1
            error_info["sessions"].add(metric.session_id)
            error_info["total_processing_time"] += metric.processing_time
            error_info["avg_processing_time"] = error_info["total_processing_time"] / error_info["count"]
        
        # Convert sets to counts for JSON serialization
        for stage in error_breakdown:
            for error_msg in error_breakdown[stage]:
                error_info = error_breakdown[stage][error_msg]
                error_info["unique_sessions"] = len(error_info["sessions"])
                del error_info["sessions"]  # Remove set object
                error_info["avg_processing_time"] = round(error_info["avg_processing_time"], 3)
        
        return {
            "period_hours": hours_back,
            "total_errors": len(failed_metrics),
            "error_breakdown": error_breakdown
        }


# Dependency injection helper
def get_voice_performance_service(db: Session = None) -> VoicePerformanceService:
    """Get VoicePerformanceService instance with database session"""
    if db is None:
        db = next(get_db())
    return VoicePerformanceService(db)