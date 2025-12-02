# src/api/routes_traits.py

from fastapi import APIRouter, HTTPException, Response
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
import json

from ai_core.nlp.essay_infer import infer_user_traits

router = APIRouter(prefix="/ai", tags=["traits"])


class InferReq(BaseModel):
    essay_text: str
    lang: str = "auto"


class InferRes(BaseModel):
    detected_lang: str
    used_lang: str
    essay_original: str
    essay_used: str
    riasec: list[float]
    big5: list[float]
    embedding_dim: int
    embedding: list[float]


@router.post("/infer_user_traits")
def infer_user_traits_api(req: InferReq):
    text = (req.essay_text or "").strip()
    if len(text) < 5:
        raise HTTPException(status_code=422, detail="essay_text quá ngắn")

    result = infer_user_traits(text, language=req.lang)
    emb = result.embedding

    payload = {
        "detected_lang": result.language_detected,
        "used_lang": result.language_used,
        "essay_original": result.essay_original,
        "essay_used": result.essay_used,
        "riasec": result.riasec.tolist(),
        "big5": result.big5.tolist(),
        "embedding_dim": int(emb.shape[0]),
        "embedding": emb.tolist(),  # mảng số, ngăn bởi dấu phẩy trong JSON
    }

    # Pretty JSON, giữ Unicode (tiếng Việt) nguyên bản
    pretty_json = json.dumps(
        jsonable_encoder(payload),
        indent=2,
        ensure_ascii=False,
    )

    return Response(
        content=pretty_json,
        media_type="application/json; charset=utf-8",
    )
