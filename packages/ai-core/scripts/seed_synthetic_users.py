"""
Synthetic User Seeder for Production Recommendation Training
============================================================

Generates 1000 synthetic users with realistic distributions for:
- core.users (1000 dummy accounts)
- core.essays (1 essay per user, persona-driven)
- core.assessments (RIASEC + BigFive assessments)
- ai.user_embeddings (PhoBERT 768d encoding of essays)
- ai.user_trait_preds (predictions per source)
- ai.user_trait_fused (fused traits)

Design principles:
- Users are clustered into 6 RIASEC personas (R, I, A, S, E, C primary)
  to match the career RIASEC distribution → enables NeuMF to learn meaningful
  patterns instead of random noise.
- Each persona has hand-crafted Vietnamese essay templates with realistic
  career goals, skills, and motivations.
- BigFive scores derived from RIASEC primary using empirical mapping
  (Costa & McCrae correlations).
- Embeddings computed from real PhoBERT model so retrieval works.

Output: 1000 user_ids starting from MAX(core.users.id) + 1
        — does NOT touch existing user IDs.
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import random
import sys
import time
from pathlib import Path
from typing import Optional

import numpy as np
import psycopg
import torch

# Ensure repo root on path
_REPO_ROOT = Path(__file__).resolve().parents[1]
if str(_REPO_ROOT / "src") not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT / "src"))

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
logger = logging.getLogger(__name__)


# ============================================================================
# RIASEC PERSONAS (Vietnamese essays for realistic embedding clusters)
# ============================================================================

PERSONAS: dict[str, dict] = {
    "R": {
        "name": "Realistic / Kỹ thuật thực hành",
        # Score peak at R (0.85), low at A (0.20)
        "riasec_template": [0.85, 0.55, 0.20, 0.35, 0.40, 0.65],
        # OCEAN: low Openness, high Conscientiousness
        "big5_template": [0.30, 0.75, 0.40, 0.50, 0.35],
        "essay_templates": [
            "Tôi yêu thích làm việc với máy móc, công cụ và các vật thể vật lý. Tôi có kỹ năng sửa chữa, lắp ráp các thiết bị điện tử, cơ khí. Mục tiêu nghề nghiệp của tôi là trở thành kỹ sư cơ khí hoặc kỹ thuật viên bảo trì máy móc trong nhà máy. Tôi thích làm việc thực hành ngoài trời, vận hành máy móc, hơn là ngồi văn phòng. Sở trường của tôi là tỉ mỉ, kiên nhẫn khi xử lý các vấn đề kỹ thuật.",
            "Sở thích của tôi là tự lắp ráp PC, sửa xe máy và làm các dự án DIY. Tôi đã từng làm việc bán thời gian tại xưởng cơ khí và rất thích công việc này. Tôi muốn theo đuổi nghề kỹ sư xây dựng hoặc kỹ thuật ô tô. Tôi thích các công việc đòi hỏi sức bền, khả năng vận hành máy móc, và tạo ra sản phẩm hữu hình. Tôi không thích các công việc trừu tượng hoặc phải thuyết phục người khác.",
            "Tôi đam mê thiết kế và chế tạo các thiết bị điện tử. Tôi có kinh nghiệm với Arduino, Raspberry Pi và in 3D. Mục tiêu của tôi là trở thành kỹ sư phần cứng hoặc kỹ thuật viên IoT. Tôi thích nghiên cứu cách hoạt động của máy móc và tự tay tạo ra giải pháp cho các vấn đề thực tế. Công việc lý tưởng là trong môi trường workshop hoặc nhà máy sản xuất.",
        ],
    },
    "I": {
        "name": "Investigative / Nghiên cứu phân tích",
        "riasec_template": [0.40, 0.85, 0.45, 0.35, 0.30, 0.55],
        "big5_template": [0.85, 0.70, 0.40, 0.55, 0.40],
        "essay_templates": [
            "Tôi đam mê toán học, khoa học và phân tích dữ liệu. Tôi thường xuyên đọc các bài báo nghiên cứu khoa học và thích giải quyết các bài toán phức tạp. Mục tiêu của tôi là trở thành nhà khoa học dữ liệu, kỹ sư AI hoặc nhà nghiên cứu. Tôi giỏi suy luận logic, phân tích vấn đề từ nhiều góc độ, và tìm ra mô hình ẩn trong dữ liệu. Tôi thích làm việc một mình hoặc trong nhóm nghiên cứu nhỏ.",
            "Sở thích của tôi là tìm hiểu cơ chế hoạt động của vũ trụ. Tôi học chuyên sâu về vật lý, hóa học và sinh học. Tôi muốn theo đuổi sự nghiệp nghiên cứu y sinh, dược học hoặc khoa học máy tính. Tôi thích đọc, suy nghĩ độc lập, đặt câu hỏi và tìm câu trả lời thông qua thực nghiệm. Tôi không thích bị giám sát chặt chẽ hoặc làm công việc lặp đi lặp lại không có thử thách trí tuệ.",
            "Tôi rất hứng thú với lập trình, trí tuệ nhân tạo và khoa học dữ liệu. Tôi đã hoàn thành các dự án machine learning và phân tích dữ liệu lớn. Mục tiêu nghề nghiệp là trở thành Data Scientist hoặc Research Engineer. Tôi thích đặt giả thuyết, kiểm chứng bằng số liệu và tìm hiểu sâu các thuật toán. Môi trường lý tưởng là viện nghiên cứu, công ty công nghệ hoặc trường đại học.",
        ],
    },
    "A": {
        "name": "Artistic / Sáng tạo nghệ thuật",
        "riasec_template": [0.30, 0.45, 0.85, 0.50, 0.45, 0.30],
        "big5_template": [0.95, 0.45, 0.55, 0.55, 0.55],
        "essay_templates": [
            "Tôi đam mê thiết kế đồ họa, vẽ minh họa và viết lách. Tôi sử dụng thành thạo Photoshop, Illustrator, Procreate. Mục tiêu của tôi là trở thành Graphic Designer, UI/UX Designer hoặc Illustrator. Tôi thích sáng tạo những thứ mới mẻ, thể hiện cảm xúc qua hình ảnh và màu sắc. Tôi không thích công việc nặng về quy trình cứng nhắc hoặc quá nhiều quy tắc.",
            "Sở thích của tôi là âm nhạc, nhiếp ảnh và làm phim. Tôi đã sản xuất nhiều video ngắn và nhạc cover trên YouTube. Tôi muốn theo đuổi sự nghiệp Director, Music Producer hoặc Content Creator. Tôi giỏi tưởng tượng, kể chuyện và truyền cảm hứng qua các tác phẩm nghệ thuật. Tôi thích môi trường tự do, linh hoạt, được thể hiện cá tính.",
            "Tôi yêu viết văn, làm thơ và sáng tác kịch bản. Tôi đang viết tiểu thuyết và làm cộng tác viên cho các tạp chí văn học. Mục tiêu nghề nghiệp là Writer, Journalist hoặc Screenwriter. Tôi giỏi quan sát con người, mô tả cảm xúc và tạo ra những câu chuyện cuốn hút. Tôi cần không gian sáng tạo, không bị gò bó bởi deadline cứng nhắc.",
        ],
    },
    "S": {
        "name": "Social / Hỗ trợ con người",
        "riasec_template": [0.30, 0.40, 0.50, 0.85, 0.55, 0.40],
        "big5_template": [0.65, 0.65, 0.80, 0.90, 0.40],
        "essay_templates": [
            "Tôi yêu thích giúp đỡ người khác và làm việc với cộng đồng. Tôi đã tham gia tình nguyện tại trại trẻ mồ côi và các chương trình hỗ trợ học sinh nghèo. Mục tiêu của tôi là trở thành giáo viên, công tác xã hội hoặc tâm lý học. Tôi giỏi lắng nghe, đồng cảm và truyền đạt kiến thức một cách dễ hiểu. Tôi thích môi trường có tương tác con người cao.",
            "Sở thích của tôi là dạy học, tư vấn và chăm sóc sức khỏe. Tôi đã làm gia sư trong 3 năm và đăng ký khóa tâm lý học. Tôi muốn theo đuổi nghề Counselor, Nurse hoặc Teacher. Tôi giỏi kết nối với người khác, hiểu nhu cầu của họ và đưa ra lời khuyên hữu ích. Tôi tin rằng thành công lớn nhất là tạo ra tác động tích cực cho cộng đồng.",
            "Tôi đam mê y học, công tác xã hội và phát triển cộng đồng. Tôi đã tham gia các chương trình y tế tình nguyện ở vùng sâu vùng xa. Mục tiêu nghề nghiệp là Bác sĩ, Y tá hoặc Social Worker. Tôi thích chăm sóc người bệnh, hỗ trợ trẻ em và làm việc trong các tổ chức phi lợi nhuận. Môi trường lý tưởng là bệnh viện, trường học hoặc NGO.",
        ],
    },
    "E": {
        "name": "Enterprising / Kinh doanh lãnh đạo",
        "riasec_template": [0.40, 0.40, 0.45, 0.55, 0.85, 0.55],
        "big5_template": [0.65, 0.70, 0.90, 0.50, 0.30],
        "essay_templates": [
            "Tôi đam mê kinh doanh, marketing và lãnh đạo team. Tôi đã từng làm chủ tịch CLB sinh viên và quản lý dự án khởi nghiệp nhỏ. Mục tiêu của tôi là trở thành Marketing Manager, Sales Director hoặc Founder. Tôi giỏi thuyết phục, đàm phán và xây dựng mối quan hệ. Tôi thích môi trường cạnh tranh, có cơ hội thăng tiến và thưởng theo hiệu suất.",
            "Sở thích của tôi là bán hàng, đầu tư và xây dựng thương hiệu cá nhân. Tôi đã kinh doanh online từ năm 2 đại học và đạt doanh thu ổn định. Tôi muốn theo đuổi nghề Business Development, Brand Manager hoặc Investment Banker. Tôi giỏi nhìn ra cơ hội thị trường, ra quyết định nhanh và lãnh đạo nhóm hướng tới mục tiêu. Tôi không sợ rủi ro nếu phần thưởng đáng giá.",
            "Tôi yêu thích quản lý dự án, phát triển kinh doanh và xây dựng startup. Tôi đã đạt giải nhì cuộc thi khởi nghiệp toàn quốc. Mục tiêu nghề nghiệp là CEO, Product Manager hoặc Business Consultant. Tôi giỏi tổng hợp thông tin, đưa ra chiến lược và truyền cảm hứng cho team. Tôi thích thách thức, đa nhiệm và môi trường có nhịp độ nhanh.",
        ],
    },
    "C": {
        "name": "Conventional / Tổ chức quy trình",
        "riasec_template": [0.55, 0.55, 0.30, 0.40, 0.55, 0.85],
        "big5_template": [0.40, 0.90, 0.45, 0.55, 0.40],
        "essay_templates": [
            "Tôi đam mê kế toán, kiểm toán và quản lý tài chính. Tôi giỏi Excel, SAP và các phần mềm kế toán. Mục tiêu của tôi là trở thành Accountant, Auditor hoặc Financial Analyst. Tôi giỏi làm việc với con số, theo dõi quy trình và đảm bảo độ chính xác. Tôi thích môi trường có quy tắc rõ ràng, công việc có thể đo lường được.",
            "Sở thích của tôi là phân tích dữ liệu tài chính, lập báo cáo và quản lý hồ sơ. Tôi đã thực tập tại công ty kiểm toán Big4 và rất thích công việc này. Tôi muốn theo đuổi nghề Internal Auditor, Tax Specialist hoặc HR Administrator. Tôi giỏi tổ chức, tỉ mỉ và tuân thủ quy trình. Tôi không thích sự thay đổi đột ngột hoặc môi trường thiếu cấu trúc.",
            "Tôi yêu thích công việc văn phòng, lập kế hoạch và quản lý dữ liệu. Tôi sử dụng thành thạo Excel, Power BI và các công cụ quản lý dự án. Mục tiêu nghề nghiệp là Office Manager, Operations Specialist hoặc Data Analyst. Tôi giỏi làm việc theo deadline, theo dõi tiến độ và đảm bảo mọi thứ diễn ra đúng kế hoạch. Tôi thích môi trường ổn định, có cấu trúc rõ ràng.",
        ],
    },
}

PERSONA_DISTRIBUTION = ["R", "I", "A", "S", "E", "C"]
RIASEC_DIMS = ["R", "I", "A", "S", "E", "C"]
BIG5_DIMS = ["O", "C", "E", "A", "N"]


# ============================================================================
# Embedding model (PhoBERT for semantic encoding)
# ============================================================================


_PHOBERT_MODEL = None
_PHOBERT_TOK = None


def _load_phobert():
    """Load PhoBERT for essay encoding (lazy)."""
    global _PHOBERT_MODEL, _PHOBERT_TOK
    if _PHOBERT_MODEL is not None:
        return _PHOBERT_TOK, _PHOBERT_MODEL

    logger.info("Loading PhoBERT model from models/riasec_phobert ...")
    from transformers import AutoModel, AutoTokenizer

    model_dir = _REPO_ROOT / "models" / "riasec_phobert"
    _PHOBERT_TOK = AutoTokenizer.from_pretrained(str(model_dir))
    _PHOBERT_MODEL = AutoModel.from_pretrained(str(model_dir))
    _PHOBERT_MODEL.eval()
    logger.info("PhoBERT model loaded")
    return _PHOBERT_TOK, _PHOBERT_MODEL


def encode_essay(text: str) -> list[float]:
    """Encode an essay → 768-d L2-normalized vector."""
    tok, model = _load_phobert()
    inputs = tok(text, padding=True, truncation=True, max_length=256, return_tensors="pt")
    with torch.no_grad():
        outputs = model(**inputs)
        # Mean pooling on last hidden state
        last = outputs.last_hidden_state  # (1, T, 768)
        mask = inputs["attention_mask"].unsqueeze(-1).float()
        pooled = (last * mask).sum(dim=1) / mask.sum(dim=1).clamp(min=1e-9)
        # L2 normalize
        normed = pooled / pooled.norm(dim=1, keepdim=True).clamp(min=1e-9)
    return normed[0].cpu().numpy().tolist()


# ============================================================================
# Score generators
# ============================================================================


def jitter(value: float, magnitude: float = 0.10, rng: random.Random = None) -> float:
    """Add gaussian-like noise around a base value, clamped to [0, 1]."""
    rng = rng or random
    noise = rng.gauss(0.0, magnitude)
    return max(0.05, min(0.95, value + noise))


def generate_riasec_scores(persona_key: str, rng: random.Random) -> dict[str, float]:
    """Return a RIASEC scores dict (1-5 scale) jittered around persona template."""
    template = PERSONAS[persona_key]["riasec_template"]
    out: dict[str, float] = {}
    for i, dim in enumerate(RIASEC_DIMS):
        # Convert 0-1 template → 1-5 scale (typical assessment range)
        scaled = 1.0 + 4.0 * jitter(template[i], magnitude=0.08, rng=rng)
        out[dim] = round(scaled, 3)
    return out


def generate_big5_scores(persona_key: str, rng: random.Random) -> dict[str, float]:
    """Return a Big5 scores dict (1-5 scale) jittered around persona template."""
    template = PERSONAS[persona_key]["big5_template"]
    out: dict[str, float] = {}
    for i, dim in enumerate(BIG5_DIMS):
        scaled = 1.0 + 4.0 * jitter(template[i], magnitude=0.08, rng=rng)
        out[dim] = round(scaled, 3)
    return out


def normalize_to_unit(scores: dict[str, float], dims: list[str]) -> list[float]:
    """Convert 1-5 scores → [0, 1] for ai.user_trait_* tables."""
    out = []
    for d in dims:
        v = scores.get(d, 0.0)
        # 1-5 → 0-1
        normed = (float(v) - 1.0) / 4.0
        out.append(round(max(0.0, min(1.0, normed)), 4))
    return out


# ============================================================================
# Database operations
# ============================================================================


def _get_db_url() -> str:
    return os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8",
    )


def insert_user(
    cur, email: str, full_name: str, persona: str, rng: random.Random
) -> int:
    """Insert a synthetic user. Returns the new user_id."""
    cur.execute(
        """
        INSERT INTO core.users (
            email, password_hash, full_name, role, is_locked, is_blocked,
            is_email_verified, riasec_top_dim
        )
        VALUES (%s, %s, %s, 'Reader', false, false, true, %s)
        RETURNING id
        """,
        (
            email,
            "$synthetic$noop",
            full_name,
            persona,
        ),
    )
    return cur.fetchone()[0]


def insert_essay(cur, user_id: int, content: str) -> int:
    cur.execute(
        """
        INSERT INTO core.essays (user_id, lang, content)
        VALUES (%s, 'vi', %s)
        RETURNING id
        """,
        (user_id, content),
    )
    return cur.fetchone()[0]


def insert_assessment(cur, user_id: int, a_type: str, scores: dict) -> int:
    cur.execute(
        """
        INSERT INTO core.assessments (user_id, a_type, scores, test_mode)
        VALUES (%s, %s, %s::jsonb, 'synthetic')
        RETURNING id
        """,
        (user_id, a_type, json.dumps(scores, ensure_ascii=False)),
    )
    return cur.fetchone()[0]


def upsert_user_embedding(cur, user_id: int, emb: list[float]):
    emb_str = "[" + ",".join(f"{x:.8f}" for x in emb) + "]"
    cur.execute(
        """
        INSERT INTO ai.user_embeddings (user_id, emb, source, model_name)
        VALUES (%s, %s::vector(768), 'essay', 'phobert_synthetic')
        ON CONFLICT (user_id) DO UPDATE
            SET emb = EXCLUDED.emb,
                source = EXCLUDED.source,
                model_name = EXCLUDED.model_name,
                built_at = now()
        """,
        (user_id, emb_str),
    )


def upsert_user_trait_pred(
    cur,
    user_id: int,
    essay_id: int,
    riasec: list[float],
    big5: list[float],
    source: str,
    model_name: str,
):
    cur.execute(
        f"""
        INSERT INTO ai.user_trait_preds (user_id, essay_id, riasec_pred, big5_pred, source, model_name)
        VALUES (%s, %s, ARRAY{riasec}::real[], ARRAY{big5}::real[], %s, %s)
        ON CONFLICT (user_id, essay_id) DO UPDATE
            SET riasec_pred = EXCLUDED.riasec_pred,
                big5_pred = EXCLUDED.big5_pred,
                source = EXCLUDED.source,
                model_name = EXCLUDED.model_name,
                built_at = now()
        """,
        (user_id, essay_id, source, model_name),
    )


def upsert_user_trait_fused(
    cur,
    user_id: int,
    riasec_fused: list[float],
    big5_fused: list[float],
    sources: list[str],
):
    sources_json = json.dumps(sources)
    cur.execute(
        f"""
        INSERT INTO ai.user_trait_fused (user_id, riasec_scores_fused, big5_scores_fused, source_components, model_name)
        VALUES (%s, ARRAY{riasec_fused}::real[], ARRAY{big5_fused}::real[], %s::jsonb, 'fusion_v1')
        ON CONFLICT (user_id) DO UPDATE
            SET riasec_scores_fused = EXCLUDED.riasec_scores_fused,
                big5_scores_fused = EXCLUDED.big5_scores_fused,
                source_components = EXCLUDED.source_components,
                built_at = now()
        """,
        (user_id, sources_json),
    )


# ============================================================================
# Main seeder
# ============================================================================


def seed(num_users: int = 1000, batch_size: int = 50, seed_value: int = 42, dry_run: bool = False):
    """Generate `num_users` synthetic users and write to DB."""
    rng = random.Random(seed_value)
    np.random.seed(seed_value)

    # Pre-load PhoBERT
    _load_phobert()

    logger.info("Seeding %d synthetic users (batch=%d, seed=%d) ...", num_users, batch_size, seed_value)

    db_url = _get_db_url()
    start = time.time()

    inserted = 0
    skipped_existing = 0

    with psycopg.connect(db_url) as conn:
        # Find max existing user_id (DO NOT touch existing data)
        with conn.cursor() as cur:
            cur.execute("SELECT MAX(id) FROM core.users")
            max_existing_id = cur.fetchone()[0] or 0
            logger.info("Existing max user_id: %d", max_existing_id)

        # Use tag suffix to avoid email collisions across re-runs
        tag_suffix = f"v{int(time.time()) % 100000}"

        for batch_start in range(0, num_users, batch_size):
            batch_end = min(batch_start + batch_size, num_users)
            batch_n = batch_end - batch_start

            with conn.cursor() as cur:
                for i in range(batch_start, batch_end):
                    persona = PERSONA_DISTRIBUTION[i % 6]
                    persona_meta = PERSONAS[persona]
                    user_idx = i + 1
                    email = f"synthetic_{tag_suffix}_{user_idx:04d}@careerverse-train.local"
                    full_name = f"Synthetic User {user_idx} ({persona_meta['name']})"

                    # Skip if exists
                    cur.execute("SELECT id FROM core.users WHERE email = %s", (email,))
                    existing = cur.fetchone()
                    if existing:
                        skipped_existing += 1
                        continue

                    # 1. Insert user
                    user_id = insert_user(cur, email, full_name, persona, rng)

                    # 2. Pick a random essay template + slight variation
                    essay_text = rng.choice(persona_meta["essay_templates"])
                    # Add user-specific suffix for diversity
                    essay_text = essay_text + f" Tôi đang ở giai đoạn {rng.choice(['sinh viên năm cuối', 'fresher đi làm 1 năm', 'có 2 năm kinh nghiệm', 'đang chuyển ngành'])}, mong muốn tìm được nghề phù hợp với năng lực bản thân."
                    essay_id = insert_essay(cur, user_id, essay_text)

                    # 3. Generate RIASEC + Big5 scores
                    riasec_scores = generate_riasec_scores(persona, rng)
                    big5_scores = generate_big5_scores(persona, rng)

                    insert_assessment(cur, user_id, "RIASEC", riasec_scores)
                    insert_assessment(cur, user_id, "BigFive", big5_scores)

                    # 4. Encode essay → embedding
                    emb = encode_essay(essay_text)
                    upsert_user_embedding(cur, user_id, emb)

                    # 5. Trait predictions (per-source)
                    riasec_unit = normalize_to_unit(riasec_scores, RIASEC_DIMS)
                    big5_unit = normalize_to_unit(big5_scores, BIG5_DIMS)

                    # source='test' for the assessment, source='essay' for AI prediction
                    upsert_user_trait_pred(
                        cur, user_id, essay_id, riasec_unit, big5_unit, "test", "rule_based",
                    )
                    # Add tiny noise for essay source (simulates AI inference)
                    riasec_essay = [round(jitter(v, 0.04, rng), 4) for v in riasec_unit]
                    big5_essay = [round(jitter(v, 0.04, rng), 4) for v in big5_unit]
                    upsert_user_trait_pred(
                        cur, user_id, essay_id, riasec_essay, big5_essay, "essay", "phobert_synthetic",
                    )

                    # 6. Fused traits = weighted average (test 0.5, essay 0.5)
                    riasec_fused = [(a + b) / 2.0 for a, b in zip(riasec_unit, riasec_essay)]
                    big5_fused = [(a + b) / 2.0 for a, b in zip(big5_unit, big5_essay)]
                    upsert_user_trait_fused(
                        cur, user_id, riasec_fused, big5_fused, ["test", "essay"],
                    )

                    inserted += 1

                if dry_run:
                    conn.rollback()
                    logger.info("[DRY RUN] Rolled back batch %d-%d", batch_start, batch_end)
                else:
                    conn.commit()

            elapsed = time.time() - start
            rate = inserted / max(elapsed, 0.001)
            logger.info(
                "Batch %d-%d done. Total: inserted=%d, skipped=%d, elapsed=%.1fs, rate=%.1f users/s",
                batch_start, batch_end, inserted, skipped_existing, elapsed, rate,
            )

    elapsed = time.time() - start
    logger.info(
        "DONE. Inserted %d new users in %.1fs (%.1f users/s). Skipped existing: %d",
        inserted, elapsed, inserted / max(elapsed, 0.001), skipped_existing,
    )
    return inserted


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--num", type=int, default=1000, help="Number of users to seed")
    ap.add_argument("--batch", type=int, default=50, help="Commit batch size")
    ap.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    ap.add_argument("--dry-run", action="store_true", help="Don't commit, just simulate")
    args = ap.parse_args()

    seed(num_users=args.num, batch_size=args.batch, seed_value=args.seed, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
