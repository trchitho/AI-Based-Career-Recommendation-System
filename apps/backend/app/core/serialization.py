"""
Binary Serialization Layer
==========================
Centralized serialization using:
  - orjson  : drop-in json replacement, 10x faster, handles datetime/UUID natively
  - msgpack : compact binary format for cache storage (~30% smaller than JSON)

Usage:
  from app.core.serialization import dumps, loads, pack, unpack, ORJSONResponse

API mirrors standard json:
  dumps(obj)         -> bytes  (orjson)
  dumps_str(obj)     -> str    (orjson → decoded)
  loads(b)           -> Any    (orjson)
  pack(obj)          -> bytes  (msgpack binary)
  unpack(b)          -> Any    (msgpack binary)
"""

from __future__ import annotations

import datetime
import decimal
from typing import Any, Callable, Optional, Union
from uuid import UUID

import msgpack
import orjson
from fastapi import Response
from fastapi.responses import JSONResponse
from starlette.background import BackgroundTask

# ── orjson options ─────────────────────────────────────────────────
_ORJSON_OPTS = (
    orjson.OPT_NON_STR_KEYS          # allow int/UUID dict keys
    | orjson.OPT_SERIALIZE_NUMPY      # handle numpy arrays if present
    | orjson.OPT_PASSTHROUGH_DATETIME # keep datetime as-is (no UTC coercion)
    | orjson.OPT_OMIT_MICROSECONDS   # cleaner datetime strings
)


def _default_handler(obj: Any) -> Any:
    """Fallback for types orjson can't serialize natively."""
    if isinstance(obj, decimal.Decimal):
        return float(obj)
    if isinstance(obj, UUID):
        return str(obj)
    if isinstance(obj, (set, frozenset)):
        return list(obj)
    if hasattr(obj, "__dict__"):
        return obj.__dict__
    if hasattr(obj, "isoformat"):          # date, time
        return obj.isoformat()
    raise TypeError(f"Not serializable: {type(obj)}")


# ── Public JSON API (bytes) ────────────────────────────────────────
def dumps(obj: Any) -> bytes:
    """Serialize to JSON bytes using orjson (fastest)."""
    return orjson.dumps(obj, default=_default_handler, option=_ORJSON_OPTS)


def dumps_str(obj: Any) -> str:
    """Serialize to JSON string using orjson."""
    return dumps(obj).decode("utf-8")


def loads(data: Union[bytes, str]) -> Any:
    """Deserialize JSON bytes or str using orjson."""
    if isinstance(data, str):
        data = data.encode("utf-8")
    return orjson.loads(data)


# ── MessagePack (binary, smaller + faster than JSON) ──────────────
def _msgpack_default(obj: Any) -> Any:
    """Encode special types for msgpack."""
    if isinstance(obj, (datetime.datetime, datetime.date, datetime.time)):
        return {"__type__": "datetime", "v": obj.isoformat()}
    if isinstance(obj, UUID):
        return {"__type__": "uuid", "v": str(obj)}
    if isinstance(obj, decimal.Decimal):
        return {"__type__": "decimal", "v": str(obj)}
    if isinstance(obj, (set, frozenset)):
        return list(obj)
    raise TypeError(f"Not msgpack-serializable: {type(obj)}")


def _msgpack_object_hook(obj: dict) -> Any:
    """Decode special types from msgpack."""
    t = obj.get("__type__")
    if t == "datetime":
        try:
            return datetime.datetime.fromisoformat(obj["v"])
        except Exception:
            return obj["v"]
    if t == "uuid":
        return UUID(obj["v"])
    if t == "decimal":
        return decimal.Decimal(obj["v"])
    return obj


def pack(obj: Any) -> bytes:
    """Serialize to MessagePack binary (compact, fast)."""
    return msgpack.packb(obj, default=_msgpack_default, use_bin_type=True)


def unpack(data: bytes) -> Any:
    """Deserialize from MessagePack binary."""
    return msgpack.unpackb(data, object_hook=_msgpack_object_hook, raw=False)


# ── FastAPI Response Classes ───────────────────────────────────────
class ORJSONResponse(Response):
    """
    FastAPI response using orjson — replaces JSONResponse.
    10x faster serialization, handles datetime/UUID natively.
    """
    media_type = "application/json"

    def render(self, content: Any) -> bytes:
        return dumps(content)


class MsgPackResponse(Response):
    """
    Binary MessagePack response.
    Use when client explicitly accepts application/msgpack.
    ~30% smaller payload than JSON, faster parse on client.
    """
    media_type = "application/msgpack"

    def render(self, content: Any) -> bytes:
        return pack(content)


class NegotiatedResponse(Response):
    """
    Content-negotiated response: returns msgpack or JSON based on Accept header.
    Client sends 'Accept: application/msgpack' to receive binary.
    """
    def __init__(
        self,
        content: Any,
        accept: str = "application/json",
        status_code: int = 200,
        headers: Optional[dict] = None,
        background: Optional[BackgroundTask] = None,
    ):
        if "application/msgpack" in accept:
            media_type = "application/msgpack"
            body = pack(content)
        else:
            media_type = "application/json"
            body = dumps(content)
        super().__init__(
            content=body,
            status_code=status_code,
            headers=headers,
            media_type=media_type,
            background=background,
        )


# ── Cache helpers ──────────────────────────────────────────────────
def cache_serialize(obj: Any) -> bytes:
    """Serialize for cache storage using msgpack (binary, compact)."""
    return pack(obj)


def cache_deserialize(data: bytes) -> Any:
    """Deserialize from cache binary data."""
    return unpack(data)


def cache_serialize_json(obj: Any) -> bytes:
    """Serialize for cache using orjson bytes (when msgpack not supported)."""
    return dumps(obj)


def cache_deserialize_json(data: Union[bytes, str]) -> Any:
    """Deserialize from cache JSON bytes."""
    return loads(data)


# ── Benchmark helper (dev only) ────────────────────────────────────
def benchmark_serialization(obj: Any) -> dict:
    """Compare json vs orjson vs msgpack for a given object."""
    import json
    import timeit

    n = 1000
    std_json_time  = timeit.timeit(lambda: json.dumps(obj, default=str), number=n)
    orjson_time    = timeit.timeit(lambda: dumps(obj), number=n)
    msgpack_time   = timeit.timeit(lambda: pack(obj), number=n)

    std_size   = len(json.dumps(obj, default=str).encode())
    orjson_size = len(dumps(obj))
    msgpack_size = len(pack(obj))

    return {
        "iterations": n,
        "timing_ms": {
            "json":    round(std_json_time * 1000, 2),
            "orjson":  round(orjson_time * 1000, 2),
            "msgpack": round(msgpack_time * 1000, 2),
        },
        "size_bytes": {
            "json":    std_size,
            "orjson":  orjson_size,
            "msgpack": msgpack_size,
        },
        "speedup_vs_json": {
            "orjson":  round(std_json_time / orjson_time, 1),
            "msgpack": round(std_json_time / msgpack_time, 1),
        },
        "size_reduction_vs_json": {
            "orjson":  f"{round((1 - orjson_size/std_size)*100, 1)}%",
            "msgpack": f"{round((1 - msgpack_size/std_size)*100, 1)}%",
        },
    }
