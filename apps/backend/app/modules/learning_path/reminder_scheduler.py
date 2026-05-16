"""
Email reminder scheduler cho personalized roadmaps.

Logic:
- Mỗi phút, scheduler check tất cả roadmaps có email_reminder_enabled=True
- Với mỗi roadmap, dựa vào weekly_pattern + email_reminder_time + timezone (Asia/Ho_Chi_Minh):
  + daily: gửi mỗi ngày tại study_time
  + weekdays: gửi T2-T6 tại study_time
  + weekends: gửi T7-CN tại study_time
  + flexible (linh hoạt): AI tự quyết - nếu user 2 ngày liên tiếp không vào học thì nhắc
- Chỉ nhắc nếu user CHƯA vào học hôm nay (so với updated_at)
- Tránh spam: 1 ngày chỉ nhắc tối đa 1 lần (track bằng last_reminder_sent_at trong DB hoặc in-memory cache)
- Khi user đạt 100%: ngừng nhắc

Tích hợp vào FastAPI startup event.
"""
from __future__ import annotations

import html
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Set
from zoneinfo import ZoneInfo

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import text

logger = logging.getLogger(__name__)

VN_TZ = ZoneInfo("Asia/Ho_Chi_Minh")

# Tránh gửi mail trùng trong 1 ngày: { roadmap_id: yyyy-mm-dd }
_last_sent_log: dict[int, str] = {}

# Frequency check mỗi 5 phút (đủ tinh để bắt giờ HH:MM)
_CHECK_INTERVAL_MINUTES = 5

_scheduler: Optional[AsyncIOScheduler] = None


def _now_vn() -> datetime:
    return datetime.now(VN_TZ)


def _is_pattern_match_today(weekly_pattern: str, today_weekday: int) -> bool:
    """Check pattern có khớp ngày trong tuần hiện tại không.
    weekday: Mon=0, Tue=1, ..., Sun=6
    """
    p = (weekly_pattern or "flexible").lower()
    if p == "daily":
        return True
    if p == "weekdays":
        return today_weekday < 5  # Mon-Fri
    if p == "weekends":
        return today_weekday >= 5  # Sat-Sun
    if p == "flexible":
        # AI quyết: gửi nếu user 2 ngày liên tiếp chưa vào học (xử lý riêng dưới)
        return True
    return False


def _build_reminder_email(
    user_email: str,
    user_name: str,
    career_title: str,
    progress: float,
    completed_courses: int,
    total_courses: int,
    roadmap_id: int,
    frontend_url: str,
) -> tuple[str, str]:
    """Build subject + HTML body for reminder email."""
    # Escape user-supplied data để tránh HTML injection / render lỗi
    safe_user_name = html.escape(user_name or "bạn")
    safe_career_title = html.escape(career_title or "Lộ trình của bạn")
    subject = f"Đến giờ học rồi! - Lộ trình {career_title}"
    view_url = f"{frontend_url}/learning-path/view/{roadmap_id}"

    html_body = f"""
    <!DOCTYPE html>
    <html lang="vi">
    <head><meta charset="UTF-8"></head>
    <body style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
      <div style="background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px 24px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 24px;">Đến giờ học rồi!</h1>
          <p style="margin: 8px 0 0; font-size: 14px; opacity: 0.95;">Cùng tiến gần hơn đến mục tiêu nghề nghiệp của bạn</p>
        </div>
        <div style="padding: 28px 24px;">
          <p style="font-size: 16px; color: #1f2937;">Chào <strong>{safe_user_name}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.6; color: #4b5563;">
            Đây là lời nhắc từ CareerVerse - đã đến khung giờ bạn đã đặt cho lộ trình
            <strong style="color: #6366f1;">{safe_career_title}</strong>.
          </p>

          <div style="background: #eef2ff; border-radius: 12px; padding: 16px 18px; margin: 20px 0;">
            <p style="margin: 0 0 8px; font-size: 12px; color: #4338ca; font-weight: 700; text-transform: uppercase;">Tiến độ hiện tại</p>
            <div style="background: #e0e7ff; height: 10px; border-radius: 999px; overflow: hidden; margin-bottom: 8px;">
              <div style="width: {progress:.0f}%; height: 100%; background: linear-gradient(90deg, #6366f1, #8b5cf6); border-radius: 999px;"></div>
            </div>
            <p style="margin: 0; font-size: 14px; color: #1e293b;">
              <strong>{completed_courses}/{total_courses}</strong> khóa học · <strong>{progress:.1f}%</strong>
            </p>
          </div>

          <p style="font-size: 14px; line-height: 1.6; color: #4b5563;">
            Hôm nay chỉ cần dành ra một chút thời gian, kiến thức sẽ được tích lũy mỗi ngày.
            Đừng để gián đoạn nhé!
          </p>

          <div style="text-align: center; margin: 28px 0 8px;">
            <a href="{view_url}" style="display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 14px;">Vào học ngay</a>
          </div>
        </div>

        <div style="background: #f8fafc; padding: 16px 24px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0;">CareerVerse · Hệ thống tư vấn nghề nghiệp AI</p>
          <p style="margin: 4px 0 0;">Email này được gửi vì bạn đã bật nhắc nhở qua email cho lộ trình. Bạn có thể tắt trong cài đặt lộ trình.</p>
        </div>
      </div>
    </body>
    </html>
    """
    return subject, html_body


def _check_and_send_reminders() -> None:
    """Job chính: kiểm tra và gửi email nhắc nhở."""
    try:
        from app.core.db import SessionLocal
        from app.core.email_utils import send_email_with_attachment
        import os

        now = _now_vn()
        today_str = now.strftime("%Y-%m-%d")
        today_weekday = now.weekday()
        current_hh = now.hour
        current_mm = now.minute

        # Cho phép sai số ±5 phút quanh giờ đặt (vì check mỗi 5 phút)
        # Nếu study_time = "20:30" và bây giờ là 20:31 thì match
        # Fallback chain: FRONTEND_BASE_URL > FRONTEND_URL > derive từ FRONTEND_VERIFY_URL > localhost
        frontend_url = (
            os.getenv("FRONTEND_BASE_URL")
            or os.getenv("FRONTEND_URL")
            or ""
        )
        if not frontend_url:
            verify_url = os.getenv("FRONTEND_VERIFY_URL", "")
            if verify_url:
                # Cắt path trở về origin: http://localhost:3000/verify?token={token} -> http://localhost:3000
                from urllib.parse import urlparse
                p = urlparse(verify_url)
                if p.scheme and p.netloc:
                    frontend_url = f"{p.scheme}://{p.netloc}"
        if not frontend_url:
            frontend_url = "http://localhost:3000"
        frontend_url = frontend_url.rstrip("/")

        db = SessionLocal()
        try:
            # Query roadmaps cần nhắc
            query = text("""
                SELECT 
                    pr.id AS roadmap_id,
                    pr.user_id,
                    pr.career_title,
                    pr.weekly_pattern,
                    pr.email_reminder_time,
                    pr.progress_percentage,
                    pr.updated_at,
                    pr.completed_at,
                    pr.roadmap_data,
                    pr.completed_course_ids,
                    u.email,
                    u.full_name
                FROM core.personalized_roadmaps pr
                JOIN core.users u ON u.id = pr.user_id
                WHERE pr.email_reminder_enabled = TRUE
                  AND pr.email_reminder_time IS NOT NULL
                  AND pr.status = 'ready'
                  AND pr.completed_at IS NULL  -- chưa hoàn thành
            """)
            rows = db.execute(query).mappings().all()

            for row in rows:
                roadmap_id = row["roadmap_id"]

                # Đã gửi hôm nay → skip
                if _last_sent_log.get(roadmap_id) == today_str:
                    continue

                # Parse study_time HH:MM
                study_time = (row["email_reminder_time"] or "").strip()
                if not study_time or ":" not in study_time:
                    continue

                try:
                    target_hh_str, target_mm_str = study_time.split(":")
                    target_hh = int(target_hh_str)
                    target_mm = int(target_mm_str)
                except (ValueError, IndexError):
                    continue

                # Tính khoảng thời gian giữa now và target
                # Match nếu target trong [now - INTERVAL, now] (tức là 5 phút vừa qua)
                # Xử lý wrap-around qua nửa đêm bằng cách so sánh modulo 24h
                now_minutes = current_hh * 60 + current_mm
                target_minutes = target_hh * 60 + target_mm
                MINUTES_PER_DAY = 24 * 60
                diff = (now_minutes - target_minutes) % MINUTES_PER_DAY
                if diff >= _CHECK_INTERVAL_MINUTES:
                    continue

                weekly_pattern = (row["weekly_pattern"] or "flexible").lower()

                # Pattern check
                if not _is_pattern_match_today(weekly_pattern, today_weekday):
                    continue

                # Pattern flexible: AI tự quyết - chỉ nhắc nếu 2 ngày qua user chưa vào học
                if weekly_pattern == "flexible":
                    last_active = row["updated_at"]
                    if last_active:
                        # Convert to VN tz
                        if last_active.tzinfo is None:
                            last_active = last_active.replace(tzinfo=timezone.utc)
                        last_active_vn = last_active.astimezone(VN_TZ)
                        days_inactive = (now - last_active_vn).total_seconds() / 86400
                        # Flexible: chỉ nhắc nếu inactive >= 2 ngày
                        if days_inactive < 2:
                            continue
                    # Nếu chưa có last_active, nhắc luôn

                # Tính total courses và completed
                roadmap_data = row["roadmap_data"] or {}
                phases = roadmap_data.get("phases") or []
                total_courses = sum(
                    len(p.get("courses") or []) if isinstance(p, dict) else 0
                    for p in phases
                )
                completed_count = len(row["completed_course_ids"] or [])
                progress = float(row["progress_percentage"] or 0)

                user_email = row["email"]
                user_name = row["full_name"] or "bạn"
                career_title = row["career_title"] or "Lộ trình của bạn"

                if not user_email:
                    continue

                subject, html_body = _build_reminder_email(
                    user_email=user_email,
                    user_name=user_name,
                    career_title=career_title,
                    progress=progress,
                    completed_courses=completed_count,
                    total_courses=total_courses,
                    roadmap_id=roadmap_id,
                    frontend_url=frontend_url,
                )

                ok, err, _ = send_email_with_attachment(
                    to_email=user_email,
                    subject=subject,
                    body_html=html_body,
                    body_text=(
                        f"Chào {user_name},\n\n"
                        f"Đến giờ học rồi! Lộ trình {career_title} của bạn đang ở {progress:.1f}% "
                        f"({completed_count}/{total_courses} khóa học).\n\n"
                        f"Vào học ngay tại: {frontend_url}/learning-path/view/{roadmap_id}\n\n"
                        f"CareerVerse"
                    ),
                )
                if ok:
                    _last_sent_log[roadmap_id] = today_str
                    logger.info(
                        f"[reminder] Sent to user_id={row['user_id']} "
                        f"roadmap_id={roadmap_id} pattern={weekly_pattern} "
                        f"time={study_time}"
                    )
                else:
                    logger.error(f"[reminder] Send failed for roadmap_id={roadmap_id}: {err}")

        finally:
            db.close()

    except Exception as e:
        logger.error(f"[reminder] Job error: {repr(e)}")


def start_reminder_scheduler() -> AsyncIOScheduler:
    """Khởi tạo scheduler. Gọi từ FastAPI startup event."""
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        return _scheduler

    _scheduler = AsyncIOScheduler(timezone=VN_TZ)
    # Chạy mỗi N phút (default 5)
    _scheduler.add_job(
        _check_and_send_reminders,
        trigger=CronTrigger(minute=f"*/{_CHECK_INTERVAL_MINUTES}", timezone=VN_TZ),
        id="learning_path_reminders",
        replace_existing=True,
        misfire_grace_time=120,
    )
    _scheduler.start()
    logger.info(f"[reminder] Scheduler started (check every {_CHECK_INTERVAL_MINUTES} minutes, TZ=Asia/Ho_Chi_Minh)")
    return _scheduler


def stop_reminder_scheduler() -> None:
    """Dừng scheduler. Gọi từ FastAPI shutdown event."""
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        logger.info("[reminder] Scheduler stopped")
