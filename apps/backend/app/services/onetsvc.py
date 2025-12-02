# apps/backend/app/services/onetsvc.py
from __future__ import annotations

import os
import socket
from typing import Any, Dict, Optional

import httpx
from httpx import (
    ConnectError,
    HTTPStatusError,
    NetworkError,
    ReadTimeout,
)
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)


class OnetError(Exception):
    """Generic O*NET service error."""


class OnetService:
    """
    Thin client for O*NET Web Services (MNM flavor).
    - Base URL lấy từ ONET_WS_BASE (vd: https://services.onetcenter.org) — KHÔNG cần /ws ở cuối.
    - Basic Auth: ONET_WS_USER / ONET_WS_PASS
    - Tất cả route MNM trả về dạng JSON; với 400/401/403/404/422 => coi như không có dữ liệu -> {}.
    - Có 2 chế độ fetch:
      * _fetch_json: có retry/backoff cho lỗi mạng/HTTP (dùng khi dữ liệu “bắt buộc”).
      * _fetch_json_once + _fetch_json_optional: 1 phát, optional cho section hay vắng dữ liệu.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        user: Optional[str] = None,
        password: Optional[str] = None,
        timeout_sec: Optional[int] = None,
    ):
        raw_base = (base_url or os.getenv("ONET_WS_BASE") or "").rstrip("/")
        # Chuẩn hoá: luôn dùng base_root KHÔNG có '/ws' ở cuối
        if raw_base.endswith("/ws"):
            raw_base = raw_base[:-3]
        self.base_root = raw_base or ""
        self.ws_prefix = "/ws"  # sẽ gắn vào trước mọi route

        self.user = user or os.getenv("ONET_WS_USER") or ""
        self.password = password or os.getenv("ONET_WS_PASS") or ""
        # timeout tổng (mặc định) nếu cần dùng dạng rút gọn
        self.timeout = int(timeout_sec or int(os.getenv("ONET_TIMEOUT") or "15"))

        if not (self.base_root and self.user and self.password):
            raise RuntimeError("Missing ONET_WS_BASE/ONET_WS_USER/ONET_WS_PASS envs")

        # FIX Timeout: set đủ 4 tham số để tránh ValueError
        self.client = httpx.Client(
            base_url=self.base_root,
            auth=(self.user, self.password),
            headers={"Accept": "application/json"},
            timeout=httpx.Timeout(connect=10.0, read=25.0, write=25.0, pool=25.0),
        )

        # MNM routes
        self.ROUTES = {
            "overview": lambda code: f"{self.ws_prefix}/mnm/careers/{code}",
            "knowledge": lambda code: f"{self.ws_prefix}/mnm/careers/{code}/knowledge",
            "skills": lambda code: f"{self.ws_prefix}/mnm/careers/{code}/skills",
            "abilities": lambda code: f"{self.ws_prefix}/mnm/careers/{code}/abilities",
            "personality": lambda code: f"{self.ws_prefix}/mnm/careers/{code}/personality",
            "technology": lambda code: f"{self.ws_prefix}/mnm/careers/{code}/technology",
            "education": lambda code: f"{self.ws_prefix}/mnm/careers/{code}/education",
            "outlook": lambda code: f"{self.ws_prefix}/mnm/careers/{code}/outlook",
            "state_map": lambda code: f"{self.ws_prefix}/mnm/careers/{code}/check_out_my_state",
            "where": lambda code: f"{self.ws_prefix}/mnm/careers/{code}/where",
        }

    # ------------------------- Core fetchers -------------------------

    @retry(
        reraise=True,
        stop=stop_after_attempt(4),
        wait=wait_exponential(multiplier=0.6, min=0.6, max=8),
        retry=retry_if_exception_type(
            (
                httpx.TransportError,
                HTTPStatusError,
                ReadTimeout,
                ConnectError,
                NetworkError,
                socket.gaierror,
            )
        ),
    )
    def _fetch_json(self, path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Fetch with retry/backoff — dùng cho trường hợp 'bắt buộc'."""
        r = self.client.get(path, params=params or {})
        r.raise_for_status()
        ctype = (r.headers.get("Content-Type") or "").lower()
        if ("json" not in ctype) and (not ctype.endswith("+json")):
            try:
                return r.json()
            except Exception:
                raise OnetError(f"Unexpected content type for {path}: {r.headers.get('Content-Type')}")
        return r.json()

    def _fetch_json_once(self, path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """1 phát, không retry — dùng cho optional sections để phản hồi nhanh."""
        r = self.client.get(path, params=params or {})
        if 200 <= r.status_code < 300:
            ctype = (r.headers.get("Content-Type") or "").lower()
            if ("json" not in ctype) and (not ctype.endswith("+json")):
                try:
                    return r.json()
                except Exception:
                    raise OnetError(f"Unexpected content type for {path}: {r.headers.get('Content-Type')}")
            return r.json()
        raise httpx.HTTPStatusError(f"{r.status_code} for {r.url}", request=r.request, response=r)

    def _fetch_json_optional(self, path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Optional fetch:
        - 400/401/403/404/422 -> coi như không có dữ liệu (return {})
        - lỗi khác -> ném tiếp để vòng ngoài xử lý/log
        """
        try:
            return self._fetch_json_once(path, params)
        except httpx.HTTPStatusError as e:
            sc = e.response.status_code if e.response is not None else None
            if sc in (400, 401, 403, 404, 422):
                return {}
            raise

    # ------------------------- Convenience wrappers (MNM) -------------------------

    # Dùng optional cho MNM vì rất nhiều mã không có đủ section
    def get_overview(self, code: str) -> Dict[str, Any]:
        return self._fetch_json_optional(self.ROUTES["overview"](code))

    def get_knowledge(self, code: str) -> Dict[str, Any]:
        return self._fetch_json_optional(self.ROUTES["knowledge"](code))

    def get_skills(self, code: str) -> Dict[str, Any]:
        return self._fetch_json_optional(self.ROUTES["skills"](code))

    def get_abilities(self, code: str) -> Dict[str, Any]:
        return self._fetch_json_optional(self.ROUTES["abilities"](code))

    def get_personality(self, code: str) -> Dict[str, Any]:
        return self._fetch_json_optional(self.ROUTES["personality"](code))

    def get_technology(self, code: str) -> Dict[str, Any]:
        return self._fetch_json_optional(self.ROUTES["technology"](code))

    def get_education(self, code: str) -> Dict[str, Any]:
        return self._fetch_json_optional(self.ROUTES["education"](code))

    def get_outlook(self, code: str) -> Dict[str, Any]:
        return self._fetch_json_optional(self.ROUTES["outlook"](code))

    def get_state_map(self, code: str) -> Dict[str, Any]:
        return self._fetch_json_optional(self.ROUTES["state_map"](code))

    def get_where(self, code: str) -> Dict[str, Any]:
        return self._fetch_json_optional(self.ROUTES["where"](code))

    # ------------------------- Cleanup -------------------------

    def close(self) -> None:
        try:
            self.client.close()
        except Exception:
            pass
