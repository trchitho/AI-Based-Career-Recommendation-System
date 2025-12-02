# apps/backend/app/services/onet_client_v2.py
from __future__ import annotations

from typing import Any, Dict, Iterable, List, Optional
import httpx
import importlib
import importlib.util
import time

# Prefer loguru if installed; otherwise fallback to stdlib logging
if importlib.util.find_spec("loguru") is not None:
    logger = importlib.import_module("loguru").logger  # type: ignore[attr-defined]
else:
    import logging
    logger = logging.getLogger(__name__)
    if not logger.handlers:
        logging.basicConfig(level=logging.INFO)

from app.core.config import settings


class OnetV2Error(RuntimeError):
    pass


class OnetV2Client:
    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout: int | None = None,
    ) -> None:
        self.base_url = base_url or settings.onet_v2_base_url.rstrip("/")
        self.api_key = api_key or settings.onet_v2_api_key
        self.timeout = timeout or settings.onet_v2_timeout

        self._client = httpx.Client(
            base_url=self.base_url,
            timeout=self.timeout,
            headers={
                "X-API-Key": self.api_key,  # v2 auth
            },
        )

    # ---- Generic helpers -------------------------------------------------

    def _get(self, path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Wrapper GET với retry để tránh crash vì ReadTimeout / lỗi mạng tạm thời.
        """
        url = path if path.startswith("http") else f"{self.base_url}/{path.lstrip('/')}"
        max_attempts = 3
        backoff_base = 2  # giây

        for attempt in range(1, max_attempts + 1):
            try:
                resp = self._client.get(url, params=params or {})
                resp.raise_for_status()
                return resp.json()
            except httpx.ReadTimeout as e:
                logger.warning(
                    f"O*NET v2 ReadTimeout (attempt {attempt}/{max_attempts}) for {url}"
                )
                if attempt == max_attempts:
                    raise OnetV2Error(f"ReadTimeout when calling {url}") from e
                time.sleep(backoff_base * attempt)
            except httpx.HTTPStatusError as e:
                # Không retry cho HTTP lỗi “logic” (401/403/404/422…)
                logger.error(f"O*NET v2 error {e.response.status_code}: {e.response.text}")
                raise OnetV2Error(f"Request failed: {e}") from e
            except httpx.RequestError as e:
                # Lỗi mạng khác (ConnectionError, etc.) → cho retry
                logger.warning(
                    f"O*NET v2 RequestError (attempt {attempt}/{max_attempts}) for {url}: {e}"
                )
                if attempt == max_attempts:
                    raise OnetV2Error(f"Request error when calling {url}") from e
                time.sleep(backoff_base * attempt)


    # ---- Database Services -----------------------------------------------

    def iter_database_rows(
        self,
        table_id: str,
        filters: Optional[List[str]] = None,
        start: int = 1,
        end: int = 200,
    ) -> Iterable[Dict[str, Any]]:
        """
        Stream all rows from /database/rows/{table_id} with given filters.
        filters: list các chuỗi 'column.operator.value', ví dụ:
                 ['onetsoc_code.eq.15-1243.00']
        """
        params: Dict[str, Any] = {
            "start": start,
            "end": end,
        }
        for i, f in enumerate(filters or []):
            params[f"filter{i+1}"] = f

        # v2 host, path giữ pattern /database/rows/... như docs
        data = self._get(f"database/rows/{table_id}", params=params)
        while True:
            for row in data.get("row", []):
                yield row
            # v2 đơn giản hóa pagination: prev/next top-level; pattern cũ là link[].:contentReference[oaicite:10]{index=10}
            next_url = data.get("next")
            if not next_url:
                break
            data = self._get(next_url)

    # ---- OnLine Occupation report (runtime explain, không dùng cho ETL core) ----

    def get_occupation_section(self, onet_code: str, section: str) -> Dict[str, Any]:
        """
        section: 'summary', 'technology', 'work_activities', 'work_context', 'education', ...
        Pattern URL cụ thể bạn tra trong Reference Manual → O*NET OnLine Services.
        Ở đây giả định dạng: /online/occupation/{onet_code}/{section}
        """
        path = f"online/occupation/{onet_code}/{section}"
        return self._get(path)
