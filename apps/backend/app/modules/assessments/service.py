from __future__ import annotations

import json
import os
import random
from typing import Any, Literal, Optional

import requests
from sqlalchemy import select, text, func
from sqlalchemy.orm import Session

# Essay, EssayPrompt thực chất nằm ở module content
from ..content.models import Essay, Career, EssayPrompt

# Các model riêng của module assessments
from .models import (
    Assessment,
    AssessmentForm,
    AssessmentQuestion,
    AssessmentResponse,
    AssessmentSession,
    UserFeedback,
)

# URL AI-core (có thể override qua env)
AI_CORE_URL = os.getenv("AI_CORE_URL", "http://localhost:9000")



from app.core.security import hash_password  # nếu cần; bỏ nếu không dùng
from app.core.exceptions import NotFoundError
from .schemas import TraitSnapshot

# ĐÃ CÓ: fuse_user_traits(session, user_id, test_riasec=None, test_big5=None)
# Mình chỉ wrap lại cho gọn.


def get_user_from_assessment(session: Session, assessment_id: int) -> Optional[int]:
    row = session.execute(
        text("SELECT user_id FROM core.assessments WHERE id = :aid"),
        {"aid": assessment_id},
    ).mappings().first()
    return int(row["user_id"]) if row else None




# -------------------------------------------------
# 1) Lưu embedding + traits từ AI-core vào schema ai.*
# -------------------------------------------------

def _to_pg_real_array(values: Optional[list[float]]) -> Optional[str]:
    """
    Chuyển list[float] -> literal Postgres real[] dạng {0.12,0.34,...}
    """
    if not values:
        return None
    return "{" + ",".join(f"{float(x):.6f}" for x in values) + "}"


def save_essay_traits(
    session: Session,
    user_id: int,
    essay_id: int,
    embedding: list[float] | None,
    riasec: list[float] | None,
    big5: list[float] | None,
    model: str = "phobert+vi-sbert",
) -> None:
    """
    Upsert:
      - ai.user_embeddings        (1 user -> 1 vector, source='essay')
      - ai.user_trait_preds       (1 dòng / essay / model)
    """
    # 1) upsert ai.user_embeddings (giữ nguyên logic cũ)
    if embedding:
        emb_lit = "[" + ",".join(f"{float(x):.8f}" for x in embedding) + "]"
        sql_emb = f"""
            INSERT INTO ai.user_embeddings (user_id, emb, source, model_name, built_at)
            VALUES ({int(user_id)}, '{emb_lit}'::vector, 'essay', :model, now())
            ON CONFLICT (user_id) DO UPDATE
              SET emb        = EXCLUDED.emb,
                  source     = EXCLUDED.source,
                  model_name = EXCLUDED.model_name,
                  built_at   = now();
        """
        session.execute(text(sql_emb), {"model": model})

    # 2) upsert ai.user_trait_preds nếu có trait đầy đủ
    r_arr = _to_pg_real_array(riasec)
    b_arr = _to_pg_real_array(big5)
    if r_arr is None or b_arr is None:
        return

    sql_traits = f"""
        INSERT INTO ai.user_trait_preds
            (user_id, essay_id, riasec_pred, big5_pred, source, model_name, built_at)
        VALUES (
            {int(user_id)},
            {int(essay_id)},
            '{r_arr}'::real[],
            '{b_arr}'::real[],
            :source,
            :model,
            now()
        )
        ON CONFLICT (user_id, essay_id) DO UPDATE
          SET riasec_pred = EXCLUDED.riasec_pred,
              big5_pred   = EXCLUDED.big5_pred,
              source      = EXCLUDED.source,
              model_name  = EXCLUDED.model_name,
              built_at    = now();
    """
    session.execute(text(sql_traits), {"model": model, "source": "essay"})


def infer_user_traits_for_essay(
    session: Session,
    user_id: int,
    essay_id: int,
    essay_text: str,
) -> None:
    """
    Gọi AI-core /ai/infer_user_traits và lưu vào:
      - ai.user_embeddings
      - ai.user_trait_preds (theo từng essay)
    Không raise ra ngoài, chỉ log nếu lỗi.
    """
    essay_text = (essay_text or "").strip()
    if not essay_text:
        print(f"[assessments] infer_user_traits_for_essay: empty essay_text for user_id={user_id}, essay_id={essay_id}")
        return

    print(f"[assessments] infer_user_traits_for_essay: calling AI-core for user_id={user_id}, essay_id={essay_id}, text_len={len(essay_text)}")
    
    try:
        url = f"{AI_CORE_URL}/ai/infer_user_traits"
        print(f"[assessments] POST {url}")
        
        resp = requests.post(
            url,
            json={"essay_text": essay_text, "lang": "auto"},
            timeout=60,
        )
        
        print(f"[assessments] AI-core response status: {resp.status_code}")
        
        resp.raise_for_status()
        data = resp.json()

        embedding = data.get("embedding") or []
        riasec = data.get("riasec")
        big5 = data.get("big5")
        
        print(f"[assessments] AI-core returned: embedding_len={len(embedding)}, riasec={riasec}, big5={big5}")

        save_essay_traits(
            session,
            user_id=user_id,
            essay_id=essay_id,
            embedding=embedding,
            riasec=riasec,
            big5=big5,
            model="phobert+vi-sbert",
        )
        session.commit()
        print(f"[assessments] infer_user_traits_for_essay: saved traits for user_id={user_id}, essay_id={essay_id}")
    except requests.exceptions.ConnectionError as e:
        session.rollback()
        print(f"[assessments] infer_user_traits_for_essay CONNECTION ERROR: AI-core not reachable at {AI_CORE_URL}")
        print(f"[assessments] Error details: {repr(e)}")
    except requests.exceptions.Timeout as e:
        session.rollback()
        print(f"[assessments] infer_user_traits_for_essay TIMEOUT: AI-core took too long")
        print(f"[assessments] Error details: {repr(e)}")
    except Exception as e:
        session.rollback()
        print(f"[assessments] infer_user_traits_for_essay error: {repr(e)}")



# -------------------------------------------------
# 2) Assessments: câu hỏi, lưu bài test, bài luận, kết quả
# -------------------------------------------------

def get_questions(
    session: Session,
    test_type: Literal["RIASEC", "BIG_FIVE"],
    *,
    shuffle: bool = False,
    seed: int | None = None,
    lang: str | None = None,
    limit: int | None = None,
    per_dim: int | None = None,
):
    db_type = _normalize_type(test_type)
    form_stmt = select(AssessmentForm.id).where(AssessmentForm.form_type == db_type)
    if lang:
        form_stmt = form_stmt.where(AssessmentForm.lang == lang)
    form_ids = [r[0] for r in session.execute(form_stmt).all()]
    if not form_ids:
        return []

    rows = (
        session.execute(
            select(AssessmentQuestion)
            .where(AssessmentQuestion.form_id.in_(form_ids))
            .order_by(
                AssessmentQuestion.form_id.asc(),
                AssessmentQuestion.question_no.asc(),
            )
        )
        .scalars()
        .all()
    )
    out = [q.to_client() | {"test_type": test_type} for q in rows]

    if shuffle:
        rng = random.Random(seed)
        rng.shuffle(out)
        for idx, item in enumerate(out, start=1):
            item["order_index"] = idx

    if per_dim and per_dim > 0:
        dims = "RIASEC" if test_type == "RIASEC" else "OCEAN"
        cap: dict[str, int] = {d: 0 for d in dims}
        sel: list[dict] = []
        for it in out:
            dim_key = str(it.get("dimension") or "").upper()
            d = dim_key[:1] if dim_key else None
            if not d or d not in cap:
                continue
            if cap[d] < per_dim:
                sel.append(it)
                cap[d] += 1
            if all(v >= per_dim for v in cap.values()):
                break
        out = sel

    if limit and limit > 0:
        out = out[:limit]

    for idx, item in enumerate(out, start=1):
        item["order_index"] = idx
    return out



LIKERT_MAP = {
    # RIASEC thang 5 mức
    "STRONGLY DISLIKE": 1.0,
    "DISLIKE": 2.0,
    "UNSURE": 3.0,
    "LIKE": 4.0,
    "STRONGLY LIKE": 5.0,
    # Big Five thang 5 mức (nếu sau này anh dùng wording khác)
    "STRONGLY DISAGREE": 1.0,
    "DISAGREE": 2.0,
    "NEUTRAL": 3.0,
    "AGREE": 4.0,
    "STRONGLY AGREE": 5.0,
}


def _coerce_answer(raw) -> float | None:
    """
    Nhận mọi kiểu answer từ FE:
      - số (1..5)
      - chuỗi '1', '2', ...
      - chuỗi mô tả Likert ('Like', 'Strongly Dislike', ...)
    Trả về float 1..5 hoặc None nếu không parse được.
    """
    if raw is None:
        return None

    # số nguyên / float
    if isinstance(raw, (int, float)):
        try:
            v = float(raw)
            return v
        except (TypeError, ValueError):
            return None

    s = str(raw).strip()
    if not s:
        return None

    # '1', '2', '3'...
    try:
        return float(s)
    except ValueError:
        pass

    # Text Likert
    s_up = s.upper()
    return LIKERT_MAP.get(s_up)



def _normalize_type(t: str) -> str:
    """
    Chuẩn hoá tên loại test (từ FE hoặc từ DB) về 2 giá trị:
      - 'RIASEC'
      - 'BigFive'

    Chấp nhận các alias:
      - RIASEC / Holland
      - BIGFIVE / BIG_FIVE / BIG5 / OCEAN / 'BigFive' (DB)
    """
    s = (t or "").strip()
    if not s:
        return s

    up = s.upper()

    if up in {"RIASEC", "HOLLAND"}:
        return "RIASEC"

    if up in {"BIGFIVE", "BIG_FIVE", "BIG5", "OCEAN", "BIG FIVE"}:
        return "BigFive"

    # fallback: giữ nguyên (ví dụ giá trị lạ để dễ debug)
    return s


def save_assessment(session: Session, user_id: int, payload: dict) -> int:
    """
    Lưu 1 lần làm bài test (RIASEC + BigFive) vào:
      - core.assessment_sessions (1 dòng cho lần test)
      - core.assessments (1–2 dòng: RIASEC, BigFive nếu có)
      - core.assessment_responses (từng câu trả lời)

    Payload FE hiện tại (Network tab):

        {
            "testTypes": ["RIASEC", "BIGFIVE"],
            "responses": [
                { "questionId": "121", "answer": "Strongly Like" },
                ...
            ]
        }

    Hàm này cũng chịu được các biến thể cũ:
      - "answers" thay cho "responses"
      - "responses" là object map { "121": 4, ... }
      - answer là số 1..5, "1".."5" thay vì nhãn Likert.
    """
    if not isinstance(payload, dict):
        raise ValueError("Invalid payload")

    # 0) Tạo session cho lần làm test này
    assess_session = AssessmentSession(user_id=user_id)
    session.add(assess_session)
    session.flush()  # lấy assess_session.id

    # 1) testTypes → set{'RIASEC','BigFive'} (nếu FE có gửi)
    raw_types = payload.get("testTypes") or payload.get("testType") or []
    if isinstance(raw_types, str):
        raw_types = [raw_types]

    test_types: set[str] = set()
    for t in raw_types:
        nt = _normalize_type(t)
        if nt:
            test_types.add(nt)

    # 2) Lấy responses từ nhiều key để tương thích các version FE khác nhau
    responses_raw = (
        payload.get("responses")
        or payload.get("answers")
        or payload.get("items")
        or []
    )

    # ---- helper: parse answer → score 1..5 ----
    def _to_score(raw: Any) -> float | None:
        """Chuyển answer từ FE (string / số) về thang 1..5.

        Hỗ trợ:
          - 1,2,3,4,5 hoặc "1".."5"
          - "Strongly Dislike","Dislike","Unsure","Like","Strongly Like"
          - "Strongly Agree","Agree","Neutral","Disagree","Strongly Disagree"
        """
        if raw is None:
            return None

        # số / string số
        if isinstance(raw, (int, float)):
            try:
                return float(raw)
            except (TypeError, ValueError):
                return None

        s = str(raw).strip()
        if not s:
            return None

        # string số "1".."5"
        if s.isdigit():
            try:
                return float(s)
            except (TypeError, ValueError):
                return None

        sl = s.lower()

        likert_map: dict[str, float] = {
            # RIASEC style
            "strongly dislike": 1.0,
            "dislike": 2.0,
            "unsure": 3.0,
            "neutral": 3.0,
            "like": 4.0,
            "strongly like": 5.0,
            # Big Five style
            "strongly disagree": 1.0,
            "disagree": 2.0,
            "agree": 4.0,
            "strongly agree": 5.0,
        }

        return likert_map.get(sl)

    # 3) Chuẩn hóa responses về list[{questionId, answer}]
    normalized_responses: list[dict[str, Any]] = []

    if isinstance(responses_raw, list):
        for item in responses_raw:
            if not isinstance(item, dict):
                continue
            qid = item.get("questionId") or item.get("question_id") or item.get("qid")
            ans = (
                item.get("answer")
                if "answer" in item
                else item.get("value") or item.get("score")
            )
            if qid is None:
                continue
            normalized_responses.append({"questionId": qid, "answer": ans})

    elif isinstance(responses_raw, dict):
        for k, v in responses_raw.items():
            normalized_responses.append({"questionId": k, "answer": v})

    if not normalized_responses:
        print("[assessments] save_assessment - raw payload with no responses:", payload)
        raise ValueError("No responses in payload")

    # 4) Lấy danh sách question_id
    question_ids: list[int] = []
    for r in normalized_responses:
        try:
            qid_int = int(str(r.get("questionId")))
        except (TypeError, ValueError):
            continue
        question_ids.append(qid_int)

    if not question_ids:
        raise ValueError("No valid question IDs in responses")

    # 5) Query meta từ core.assessment_questions + core.assessment_forms
    stmt = (
        select(
            AssessmentQuestion.id,
            AssessmentQuestion.question_key,
            AssessmentQuestion.reverse_score,
            AssessmentQuestion.options_json,
            AssessmentForm.form_type,
        )
        .join(AssessmentForm, AssessmentForm.id == AssessmentQuestion.form_id)
        .where(AssessmentQuestion.id.in_(question_ids))
    )
    rows = session.execute(stmt).all()

    # qmeta[qid] = (question_key, form_type_norm, reverse_flag)
    qmeta: dict[int, tuple[str | None, str | None, bool]] = {}
    for qid, qkey, rev, _opts, ftype in rows:
        form_type_norm = _normalize_type(ftype)
        qmeta[int(qid)] = (qkey, form_type_norm, bool(rev))

    if not qmeta:
        raise ValueError("No question metadata found for responses")

    # 6) Tích luỹ điểm theo từng dimension RIASEC / BigFive
    riasec_letters = {"R", "I", "A", "S", "E", "C"}
    big5_letters = {"O", "C", "E", "A", "N"}

    riasec_acc: dict[str, list[float]] = {k: [] for k in riasec_letters}
    big5_acc: dict[str, list[float]] = {k: [] for k in big5_letters}

    # Tạm lưu responses theo type để insert sau
    riasec_resp_rows: list[tuple[int, str | None, str, float | None]] = []
    big5_resp_rows: list[tuple[int, str | None, str, float | None]] = []

    for r in normalized_responses:
        raw_qid = r.get("questionId")
        raw_ans = r.get("answer")

        try:
            qid_int = int(str(raw_qid))
        except (TypeError, ValueError):
            continue

        meta = qmeta.get(qid_int)
        if not meta:
            continue

        qkey, form_type_norm, is_rev = meta
        if form_type_norm not in {"RIASEC", "BigFive"}:
            continue

        # Nếu FE có gửi testTypes, dùng để filter thêm (phòng trường hợp form có loại khác)
        if test_types and form_type_norm not in test_types:
            continue

        dim_letter = (qkey or "").strip()[:1].upper() or None
        if not dim_letter:
            continue

        score_val = _to_score(raw_ans)

        # Reverse 1–5 nếu là câu đảo
        if score_val is not None and is_rev:
            score_val = 6.0 - score_val

        if form_type_norm == "RIASEC":
            if dim_letter in riasec_letters and score_val is not None:
                riasec_acc[dim_letter].append(score_val)
            riasec_resp_rows.append((qid_int, qkey, str(raw_ans), score_val))
        elif form_type_norm == "BigFive":
            if dim_letter in big5_letters and score_val is not None:
                big5_acc[dim_letter].append(score_val)
            big5_resp_rows.append((qid_int, qkey, str(raw_ans), score_val))

    has_riasec = any(riasec_acc[k] for k in riasec_letters)
    has_big5 = any(big5_acc[k] for k in big5_letters)

    if not has_riasec and not has_big5:
        print("[assessments] save_assessment - no valid scores", normalized_responses)
        raise ValueError("No valid responses found")

    # 7) Tính điểm trung bình từng dimension và lưu core.assessments
    def _avg(values: list[float]) -> float | None:
        if not values:
            return None
        return float(sum(values) / len(values))

    riasec_scores: dict[str, float] = {}
    big5_scores: dict[str, float] = {}

    if has_riasec:
        for k in sorted(riasec_letters):
            v = _avg(riasec_acc[k])
            if v is not None:
                riasec_scores[k] = v

    if has_big5:
        for k in sorted(big5_letters):
            v = _avg(big5_acc[k])
            if v is not None:
                big5_scores[k] = v

    riasec_assess: Assessment | None = None
    big5_assess: Assessment | None = None

    if riasec_scores:
        riasec_assess = Assessment(
            user_id=user_id,
            a_type="RIASEC",
            scores=riasec_scores,
            session_id=assess_session.id,
        )
        session.add(riasec_assess)
        session.flush()

    if big5_scores:
        big5_assess = Assessment(
            user_id=user_id,
            a_type="BigFive",
            scores=big5_scores,
            session_id=assess_session.id,
        )
        session.add(big5_assess)
        session.flush()

    # 8) Lưu từng câu trả lời vào core.assessment_responses
    if riasec_assess is not None:
        for qid_int, qkey, answer_raw, score_val in riasec_resp_rows:
            session.add(
                AssessmentResponse(
                    assessment_id=riasec_assess.id,
                    question_id=qid_int,
                    question_key=qkey,
                    answer_raw=answer_raw,
                    score_value=score_val,
                )
            )

    if big5_assess is not None:
        for qid_int, qkey, answer_raw, score_val in big5_resp_rows:
            session.add(
                AssessmentResponse(
                    assessment_id=big5_assess.id,
                    question_id=qid_int,
                    question_key=qkey,
                    answer_raw=answer_raw,
                    score_value=score_val,
                )
            )

    # 9) Commit tất cả thay đổi
    session.commit()

    # 10) Trả về assessmentId cho FE dùng trong /results/{assessment_id}
    # Ưu tiên RIASEC, nếu không có thì dùng BigFive
    if riasec_assess is not None:
        return int(riasec_assess.id)
    if big5_assess is not None:
        return int(big5_assess.id)

    # Nếu tới được đây coi như tạo assessment thất bại
    raise ValueError("Failed to create assessments")


def _detect_vi_en_from_text(text: str) -> str:
    """
    Detect đơn giản: nếu có nhiều ký tự có dấu tiếng Việt -> 'vi', ngược lại 'en'.
    """
    s = (text or "").lower()
    vn_chars = "ăâêôơưđáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệóòỏõọốồổỗộớờởỡợíìỉĩịúùủũụứừửữựýỳỷỹỵ"
    if any(ch in s for ch in vn_chars):
        return "vi"
    return "en"


def fuse_user_traits(
    session: Session,
    user_id: int,
    test_riasec: dict[str, float] | None = None,
    test_big5: dict[str, float] | None = None,
) -> dict[str, Any] | None:
    """
    Tạo / cập nhật bản fused trait cho user vào ai.user_trait_fused
    + denormalize sang core.users (riasec_top_dim, big5_profile).

    - Nếu test_riasec / test_big5 không truyền vào:
        -> tự đọc từ core.assessments (a_type = 'RIASEC', 'BigFive')
    - Essay traits đọc từ ai.user_trait_preds (riasec_pred, big5_pred).

    Trả về snapshot cho FE dùng luôn.
    """
    try:
        letters_riasec = ["R", "I", "A", "S", "E", "C"]
        letters_big5 = ["O", "C", "E", "A", "N"]

        def _norm_1_to_5(v: float | None) -> float | None:
            if v is None:
                return None
            try:
                f = float(v)
            except (TypeError, ValueError):
                return None
            # map 1..5 -> 0..1
            return max(0.0, min(1.0, (f - 1.0) / 4.0))

        # 1) Lấy trait từ bài test (core.assessments) nếu caller chưa truyền vào
        # Query từng loại độc lập để tránh conflict khi timestamp giống nhau
        if test_riasec is None:
            riasec_row = (
                session.query(Assessment)
                .filter(
                    Assessment.user_id == user_id,
                    Assessment.a_type == "RIASEC",
                )
                .order_by(Assessment.created_at.desc())
                .first()
            )
            test_riasec = dict(riasec_row.scores or {}) if riasec_row else None
        
        if test_big5 is None:
            big5_row = (
                session.query(Assessment)
                .filter(
                    Assessment.user_id == user_id,
                    Assessment.a_type == "BigFive",
                )
                .order_by(Assessment.created_at.desc())
                .first()
            )
            test_big5 = dict(big5_row.scores or {}) if big5_row else None

        def _dict_to_vec(
            src: dict[str, float] | None,
            letters: list[str],
        ) -> list[float] | None:
            if not src:
                return None
            out: list[float | None] = []
            for ch in letters:
                v = src.get(ch)
                out.append(_norm_1_to_5(v) if v is not None else None)
            if all(v is None for v in out):
                return None
            # đảm bảo không có None, thay bằng 0.0
            return [0.0 if v is None else float(v) for v in out]

        test_riasec_vec = _dict_to_vec(test_riasec, letters_riasec)
        test_big5_vec = _dict_to_vec(test_big5, letters_big5)

        has_test = test_riasec_vec is not None or test_big5_vec is not None

        # 2) Lấy trait từ essay (ai.user_trait_preds)
        essay_rows = session.execute(
            text(
                """
                SELECT riasec_pred, big5_pred
                FROM ai.user_trait_preds
                WHERE user_id = :uid
                """
            ),
            {"uid": user_id},
        ).fetchall()

        riasec_arrs: list[list[float]] = []
        big5_arrs: list[list[float]] = []
        for row in essay_rows:
            r_vec = row[0]
            b_vec = row[1]
            if r_vec is not None and len(r_vec) == 6:
                riasec_arrs.append([float(x) for x in r_vec])
            if b_vec is not None and len(b_vec) == 5:
                big5_arrs.append([float(x) for x in b_vec])

        def _avg_arrays(arrs: list[list[float]], dim: int) -> list[float] | None:
            if not arrs:
                return None
            sums = [0.0] * dim
            count = 0
            for a in arrs:
                if len(a) != dim:
                    continue
                sums = [s + v for s, v in zip(sums, a)]
                count += 1
            if count == 0:
                return None
            return [s / count for s in sums]

        essay_riasec_vec = _avg_arrays(riasec_arrs, 6)
        essay_big5_vec = _avg_arrays(big5_arrs, 5)

        has_essay = essay_riasec_vec is not None or essay_big5_vec is not None

        if not has_test and not has_essay:
            # không có gì để fuse
            return {
                "has_test_traits": False,
                "has_essay_traits": False,
                "has_fused_traits": False,
            }

        # 3) Fuse theo rule/weight
        w_test_riasec, w_essay_riasec = 0.7, 0.3
        w_test_big5, w_essay_big5 = 0.6, 0.4

        def _fuse_vec(
            test_vec: list[float] | None,
            essay_vec: list[float] | None,
            w_test: float,
            w_essay: float,
            dim: int,
        ) -> list[float] | None:
            if test_vec is None and essay_vec is None:
                return None
            out: list[float] = []
            for i in range(dim):
                t = test_vec[i] if test_vec is not None and i < len(test_vec) else None
                e = essay_vec[i] if essay_vec is not None and i < len(essay_vec) else None
                if t is None and e is None:
                    out.append(0.0)
                elif t is None:
                    out.append(float(e))
                elif e is None:
                    out.append(float(t))
                else:
                    out.append(float(w_test * t + w_essay * e))
            return out

        riasec_fused_vec = _fuse_vec(
            test_riasec_vec,
            essay_riasec_vec,
            w_test_riasec,
            w_essay_riasec,
            6,
        )
        big5_fused_vec = _fuse_vec(
            test_big5_vec,
            essay_big5_vec,
            w_test_big5,
            w_essay_big5,
            5,
        )

        has_fused = riasec_fused_vec is not None and big5_fused_vec is not None

        # 4) Upsert vào ai.user_trait_fused + update core.users
        if has_fused:
            riasec_lit = _to_pg_real_array(riasec_fused_vec)
            big5_lit = _to_pg_real_array(big5_fused_vec)

            sources: list[str] = []
            if has_test:
                sources.append("test")
            if has_essay:
                sources.append("essay")

            # JSON literal cho source_components
            src_json = json.dumps(sources)
            src_json_escaped = src_json.replace("'", "''")

            # 4.1) Upsert fused
            sql_fused = f"""
                INSERT INTO ai.user_trait_fused
                    (user_id, riasec_scores_fused, big5_scores_fused, source_components, model_name, built_at)
                VALUES
                    (:uid, '{riasec_lit}'::real[], '{big5_lit}'::real[], '{src_json_escaped}'::jsonb, :model, now())
                ON CONFLICT (user_id) DO UPDATE
                   SET riasec_scores_fused = EXCLUDED.riasec_scores_fused,
                       big5_scores_fused   = EXCLUDED.big5_scores_fused,
                       source_components   = EXCLUDED.source_components,
                       model_name          = EXCLUDED.model_name,
                       built_at            = now();
            """

            session.execute(
                text(sql_fused),
                {
                    "uid": int(user_id),
                    "model": "fusion_v1",
                },
            )

            # 4.2) Tính riasec_top_dim + big5_profile để lưu vào core.users
            riasec_top_dim: Optional[str] = None
            if riasec_fused_vec:
                max_idx = max(range(len(riasec_fused_vec)), key=lambda i: riasec_fused_vec[i])
                riasec_top_dim = letters_riasec[max_idx]

            def _sign(v: float) -> str:
                return "+" if v >= 0.5 else "-"

            big5_profile: Optional[str] = None
            if big5_fused_vec and len(big5_fused_vec) == 5:
                parts = []
                for i, ch in enumerate(letters_big5):
                    v = big5_fused_vec[i]
                    parts.append(f"{ch}{_sign(v)}")
                big5_profile = ", ".join(parts)

            session.execute(
                text(
                    """
                    UPDATE core.users
                    SET riasec_top_dim = :rt,
                        big5_profile   = :bp
                    WHERE id = :uid
                    """
                ),
                {
                    "uid": int(user_id),
                    "rt": riasec_top_dim,
                    "bp": big5_profile,
                },
            )

            # commit cả fused + users
            session.commit()

        return {
            "has_test_traits": has_test,
            "has_essay_traits": has_essay,
            "has_fused_traits": has_fused,
            "riasec_test": test_riasec_vec,
            "big5_test": test_big5_vec,
            "riasec_essay": essay_riasec_vec,
            "big5_essay": essay_big5_vec,
            "riasec_fused": riasec_fused_vec,
            "big5_fused": big5_fused_vec,
        }
    except Exception as e:
        session.rollback()
        print("[assessments] fuse_user_traits error:", repr(e))
        return {
            "has_test_traits": False,
            "has_essay_traits": False,
            "has_fused_traits": False,
        }
    
def get_user_traits(
    session: Session,
    user_id: int,
    test_riasec: dict[str, float] | None = None,
    test_big5: dict[str, float] | None = None,
) -> TraitSnapshot:
    """
    Lấy snapshot traits cho user:
    - Ưu tiên dùng test_riasec/test_big5 nếu FE vừa làm xong assessment (tươi).
    - Nếu không truyền → tự đọc từ DB (core.assessments / ai.user_trait_preds / ai.user_trait_fused).
    """
    raw = fuse_user_traits(
        session=session,
        user_id=user_id,
        test_riasec=test_riasec,
        test_big5=test_big5,
    )

    return TraitSnapshot(
        has_test_traits=raw["has_test_traits"],
        has_essay_traits=raw["has_essay_traits"],
        has_fused_traits=raw["has_fused_traits"],
        riasec_test=raw.get("riasec_test"),
        big5_test=raw.get("big5_test"),
        riasec_essay=raw.get("riasec_essay"),
        big5_essay=raw.get("big5_essay"),
        riasec_fused=raw.get("riasec_fused"),
        big5_fused=raw.get("big5_fused"),
    )

def save_essay(
    session: Session,
    user_id: int,
    content: str,
    prompt_id: Optional[int] = None,
    lang: Optional[str] = None,
) -> int:
    """
    Lưu essay vào core.essays.

    - Lang:
        + Không tin 100% tham số lang từ FE.
        + Luôn detect lại từ nội dung; nếu detect ra 'vi' / 'en' thì override.
    - Prompt:
        + Nếu FE gửi prompt_id hợp lệ -> dùng **đúng** ID đó.
        + Nếu FE không gửi prompt_id -> random 1 prompt theo lang
          (nếu không có prompt cùng lang -> random toàn bảng).
    Sau khi lưu:
        - Gọi infer_user_traits_for_essay để nạp ai.user_embeddings / ai.user_trait_preds.
    """

    # 0) Chuẩn hoá nội dung
    content = (content or "").strip()
    if not content:
        raise ValueError("essay content is empty")

    # 1) Lang hint từ FE (nếu có)
    lang_hint = (lang or "").strip().lower()
    if lang_hint in {"vi", "vn", "vi-vn", "vietnam", "vietnamese", "tiếng việt"}:
        effective_lang = "vi"
    elif lang_hint in {"en", "eng", "english", "en-us", "en-gb"}:
        effective_lang = "en"
    else:
        effective_lang = "en"  # tạm, sẽ override ngay dưới

    # 2) Detect lại từ nội dung -> nếu ra 'vi' / 'en' thì ưu tiên kết quả detect
    try:
        detected = _detect_vi_en_from_text(content)
        if detected in {"vi", "en"}:
            effective_lang = detected
    except Exception as e:
        print("[assessments] save_essay lang detect error:", repr(e))

    resolved_prompt_id: Optional[int] = None

    # 3) Nếu FE gửi prompt_id → bắt buộc dùng đúng ID đó (nếu tồn tại)
    if prompt_id is not None:
        try:
            pid = int(prompt_id)
        except (TypeError, ValueError):
            raise ValueError(f"Invalid prompt_id={prompt_id!r}")

        prompt_obj = session.get(EssayPrompt, pid)
        if not prompt_obj:
            # Lỗi rõ ràng thay vì fallback random (tránh tình trạng FE/BE lệch ID)
            raise ValueError(f"Prompt with id={pid} not found in EssayPrompt")

        resolved_prompt_id = pid

    # 4) Nếu FE **không** gửi prompt_id → random theo lang (giữ logic cũ)
    if resolved_prompt_id is None:
        prompt_obj = None
        try:
            q = session.query(EssayPrompt)

            # ưu tiên random trong đúng lang
            q_lang = q.filter(EssayPrompt.lang == effective_lang)
            prompt_obj = q_lang.order_by(func.random()).first()

            if not prompt_obj:
                # không có cùng lang -> random toàn bảng
                prompt_obj = q.order_by(func.random()).first()

            if prompt_obj:
                resolved_prompt_id = int(prompt_obj.id)
        except Exception as e:
            print("[assessments] save_essay default prompt select error:", repr(e))

    # 5) Tạo bản ghi essay
    essay = Essay(
        user_id=user_id,
        lang=effective_lang,
        content=content,
        prompt_id=resolved_prompt_id,  # có thể None nếu DB không có prompt nào
    )
    session.add(essay)
    session.commit()
    essay_id = int(essay.id)

    # 6) Gọi AI-core để suy luận trait cho essay này
    print(f"[assessments] save_essay: calling infer_user_traits_for_essay for user_id={user_id}, essay_id={essay_id}")
    try:
        infer_user_traits_for_essay(
            session=session,
            user_id=user_id,
            essay_id=essay_id,
            essay_text=content,
        )
        # infer_user_traits_for_essay tự commit/rollback phần ai.*
    except Exception as e:
        print(
            "[assessments] save_essay -> infer_user_traits_for_essay error:",
            repr(e),
        )

    return essay_id


def build_results(session: Session, assessment_id: int) -> dict:
    """
    Build kết quả cho 1 assessment cụ thể:

    - Lấy Assessment (RIASEC hoặc BigFive) theo id.
    - Lấy scores từ chính assessment này và các assessment cùng session (trong 5 phút)
    - Chuẩn hoá điểm cho FE:
        + riasec_scores: realistic, investigative, ... (0–100)
        + big_five_scores: openness, conscientiousness, ... (0–100)
    - top_interest: L1 dimension từ raw test scores (1-5, khớp với filter logic)
    """
    obj = session.get(Assessment, assessment_id)
    if not obj:
        raise NotFoundError("Assessment not found")

    user_id = int(obj.user_id)
    assessment_created_at = obj.created_at
    
    # Map thứ tự vector → tên dimension FE đang dùng
    riasec_letters = ["R", "I", "A", "S", "E", "C"]
    riasec_name_map = {
        "R": "realistic",
        "I": "investigative",
        "A": "artistic",
        "S": "social",
        "E": "enterprising",
        "C": "conventional",
    }

    big5_letters = ["O", "C", "E", "A", "N"]
    big5_name_map = {
        "O": "openness",
        "C": "conscientiousness",
        "E": "extraversion",
        "A": "agreeableness",
        "N": "neuroticism",
    }

    # 1) Tìm RIASEC và BigFive assessment trong cùng session (trong 5 phút)
    # Nếu assessment hiện tại là RIASEC, dùng luôn scores của nó
    # Nếu không, tìm RIASEC trong cùng session
    riasec_scores_raw = None
    bigfive_scores_raw = None
    
    if obj.a_type == "RIASEC" and obj.scores:
        riasec_scores_raw = obj.scores
    else:
        # Tìm RIASEC trong cùng session (trong 5 phút)
        riasec_row = (
            session.query(Assessment)
            .filter(
                Assessment.user_id == user_id,
                Assessment.a_type == "RIASEC",
                Assessment.scores.isnot(None),
            )
            .filter(
                func.abs(func.extract('epoch', Assessment.created_at - assessment_created_at)) < 300
            )
            .order_by(func.abs(func.extract('epoch', Assessment.created_at - assessment_created_at)))
            .first()
        )
        if riasec_row and riasec_row.scores:
            riasec_scores_raw = riasec_row.scores
    
    if obj.a_type == "BigFive" and obj.scores:
        bigfive_scores_raw = obj.scores
    else:
        # Tìm BigFive trong cùng session (trong 5 phút)
        bigfive_row = (
            session.query(Assessment)
            .filter(
                Assessment.user_id == user_id,
                Assessment.a_type == "BigFive",
                Assessment.scores.isnot(None),
            )
            .filter(
                func.abs(func.extract('epoch', Assessment.created_at - assessment_created_at)) < 300
            )
            .order_by(func.abs(func.extract('epoch', Assessment.created_at - assessment_created_at)))
            .first()
        )
        if bigfive_row and bigfive_row.scores:
            bigfive_scores_raw = bigfive_row.scores

    # 2) Convert raw scores (1-5) to percentage (0-100)
    def _raw_to_percent(raw_scores: dict, letters: list, name_map: dict) -> dict:
        """Convert raw scores (1-5 scale) to percentage (0-100)"""
        result = {name_map[ch]: 0.0 for ch in letters}
        if not raw_scores:
            return result
        for letter in letters:
            raw = float(raw_scores.get(letter, 0.0))
            # Scale from 1-5 to 0-100: (raw - 1) / 4 * 100
            if raw > 0:
                percent = ((raw - 1) / 4) * 100
                result[name_map[letter]] = round(max(0, min(100, percent)), 1)
        return result

    riasec_scores = _raw_to_percent(riasec_scores_raw, riasec_letters, riasec_name_map)
    big_five_scores = _raw_to_percent(bigfive_scores_raw, big5_letters, big5_name_map)

    # 3) Tính top_interest từ RIASEC scores của session này
    top_interest: str | None = None
    if riasec_scores_raw:
        raw_riasec_vec = [float(riasec_scores_raw.get(dim, 0.0)) for dim in riasec_letters]
        sorted_indices = sorted(
            range(6),
            key=lambda i: (-raw_riasec_vec[i], i)
        )
        top_interest = riasec_letters[sorted_indices[0]]

    # 4) Lấy traits snapshot cho thông tin bổ sung
    # Truyền scores của assessment hiện tại để không lấy nhầm assessment mới nhất
    traits_snapshot: TraitSnapshot = get_user_traits(
        session=session,
        user_id=user_id,
        test_riasec=riasec_scores_raw,  # Dùng scores của assessment này
        test_big5=bigfive_scores_raw,   # Dùng scores của assessment này
    )

    # 4) Gợi ý nghề dựa trên top_interest và RIASEC scores
    # Map top_interest letter to column name in career_interests table
    riasec_column_map = {
        "R": "r", "I": "i", "A": "a", "S": "s", "E": "e", "C": "c"
    }
    
    rec_ids: list[str] = []
    careers_full: list[dict] = []
    
    if top_interest and top_interest in riasec_column_map:
        # Get careers sorted by the top_interest RIASEC dimension
        interest_col = riasec_column_map[top_interest]
        
        # Query careers with highest score in the user's top interest dimension
        # Join with career_interests table and sort by the relevant RIASEC column
        rec_query = text(f"""
            SELECT c.id, c.slug, c.title_vi, c.title_en, c.short_desc_vn, c.short_desc_en
            FROM core.careers c
            JOIN core.career_interests ci ON c.onet_code = ci.onet_code
            WHERE ci.{interest_col} IS NOT NULL
            ORDER BY ci.{interest_col} DESC, RANDOM()
            LIMIT 5
        """)
        
        rows = session.execute(rec_query).all()
        
        for rid, slug, tvi, ten, sdesc_vn, sdesc_en in rows:
            rec_ids.append(str(rid))
            title = tvi or ten or ((slug or "").replace("-", " ").title())
            sdesc = sdesc_vn or sdesc_en or ""
            careers_full.append({
                "id": str(rid),
                "title": title,
                "description": sdesc,
                "slug": slug,
            })
    
    # Fallback: if no careers found via RIASEC, get random careers
    if not rec_ids:
        rec_rows = session.execute(
            select(
                Career.id,
                Career.slug,
                Career.title_vi,
                Career.title_en,
                Career.short_desc_vn,
                Career.short_desc_en,
            ).order_by(func.random()).limit(5)
        ).all()
        
        for rid, slug, tvi, ten, sdesc_vn, sdesc_en in rec_rows:
            rec_ids.append(str(rid))
            title = tvi or ten or ((slug or "").replace("-", " ").title())
            sdesc = sdesc_vn or sdesc_en or ""
            careers_full.append({
                "id": str(rid),
                "title": title,
                "description": sdesc,
                "slug": slug,
            })

    return {
        "assessment_id": int(obj.id),
        "user_id": user_id,
        "riasec_scores": riasec_scores,
        "big_five_scores": big_five_scores,
        "top_interest": top_interest,  # L1 từ raw test scores - khớp với filter
        "traits": traits_snapshot.model_dump(),
        "career_recommendations": rec_ids,
        "career_recommendations_full": careers_full,
        "completed_at": (
            obj.created_at.isoformat()
            if getattr(obj, "created_at", None)
            else None
        ),
    }



def save_feedback(
    session: Session,
    user_id: int,
    assessment_id: int,
    rating: int,
    comment: str | None,
) -> None:
    if rating < 1 or rating > 5:
        raise ValueError("rating must be 1..5")
    fb = UserFeedback(user_id=user_id, assessment_id=assessment_id, rating=rating, comment=(comment or None))
    session.add(fb)
    session.commit()
