"""
Story Generator Service — single Gemini call for ALL groups at once.
Each group of ~5 questions shares one narrative context (like a book chapter).
"""
import re
import json
import logging
from typing import List, Dict, Any

from app.core.gemini_manager import multi_stream_manager

logger = logging.getLogger(__name__)

# Dimension → (emoji, title, intro) for local fallback
_DIM_MAP: Dict[str, tuple] = {
    "R": ("🔧", "Thực Hành",  "Bạn đang làm việc với công cụ và máy móc trong xưởng."),
    "I": ("🔬", "Nghiên Cứu", "Bạn đang phân tích dữ liệu trong phòng thí nghiệm."),
    "A": ("🎨", "Sáng Tạo",   "Bạn đang tham gia dự án nghệ thuật và thiết kế."),
    "S": ("🤝", "Giao Tiếp",  "Bạn đang hỗ trợ và làm việc cùng mọi người."),
    "E": ("💼", "Lãnh Đạo",   "Bạn đang thuyết phục và dẫn dắt một nhóm."),
    "C": ("📋", "Tổ Chức",    "Bạn cần xử lý công việc theo quy trình chặt chẽ."),
    "O": ("💡", "Tư Duy Mở",  "Bạn đang đối mặt với ý tưởng và thay đổi mới."),
    "N": ("😌", "Cảm Xúc",    "Bạn đang xử lý tình huống áp lực và cảm xúc."),
}

# Map full dimension names → single letter key (DB may store full names)
_DIM_ALIAS: Dict[str, str] = {
    "REALISTIC": "R", "INVESTIGATIVE": "I", "ARTISTIC": "A",
    "SOCIAL": "S", "ENTERPRISING": "E", "CONVENTIONAL": "C",
    "OPENNESS": "O", "CONSCIENTIOUSNESS": "C", "EXTRAVERSION": "E",
    "AGREEABLENESS": "A", "NEUROTICISM": "N",
    "RIASEC_R": "R", "RIASEC_I": "I", "RIASEC_A": "A",
    "RIASEC_S": "S", "RIASEC_E": "E", "RIASEC_C": "C",
}


def _normalize_dim(raw: str) -> str:
    """Convert any dimension string to single-letter key."""
    key = (raw or "").upper().strip()
    if key in _DIM_MAP:
        return key
    return _DIM_ALIAS.get(key, key[:1] if key else "")


class StoryGeneratorService:
    def __init__(self):
        self.stream = multi_stream_manager.get_assessment_stream()
        if self.stream.is_available():
            logger.info(f"✅ Story generator ready: {self.stream.active_model_name}")
        else:
            logger.warning("⚠️ Gemini unavailable — will use local fallback")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def generate_group_stories(
        self, questions: List[Dict[str, Any]], group_size: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Split questions into groups of `group_size`, generate 1 group story per group.
        Uses 1 Gemini call for ALL groups — no rate limiting.

        Returns list of groups:
        [
          {
            "groupScenario": {"emoji": ..., "title": ..., "introduction": ...},
            "questionScenarios": [{"emoji":..,"title":..,"context":..,"situation":..}, ...]
          },
          ...
        ]
        """
        # Split into groups
        groups = [
            questions[i: i + group_size]
            for i in range(0, len(questions), group_size)
        ]

        if not self.stream.is_available():
            return [self._local_group(g, idx) for idx, g in enumerate(groups)]

        prompt = self._build_prompt(groups)
        raw = self.stream.generate_content_with_retry(
            prompt,
            max_output_tokens=8192,
            temperature=0.4,
        )

        if not raw:
            print("❌ [StoryGen] Gemini returned None — using local fallback")
            return [self._local_group(g, idx) for idx, g in enumerate(groups)]

        print(f"✅ [StoryGen] Gemini response length: {len(raw)} chars")
        print(f"   Preview: {raw[:300]}")

        try:
            cleaned = self._clean_json(raw)
            data = json.loads(cleaned)
            api_groups: List[Dict] = data.get("groups", [])

            result = []
            for idx, group_qs in enumerate(groups):
                ag = api_groups[idx] if idx < len(api_groups) else {}
                gs = ag.get("g") or ag.get("groupScenario") or {}
                qs_raw = ag.get("q") or ag.get("questionScenarios") or []

                # Build group scenario
                dim = _normalize_dim(group_qs[0].get("dimension") or "")
                fb_emoji, fb_title, fb_intro = _DIM_MAP.get(dim, ("📖", "Tình Huống", "Hãy trải nghiệm tình huống sau."))

                group_scenario = {
                    "emoji":        gs.get("e") or gs.get("emoji") or fb_emoji,
                    "title":        gs.get("t") or gs.get("title") or fb_title,
                    "introduction": gs.get("i") or gs.get("introduction") or fb_intro,
                }

                # Build per-question scenarios
                question_scenarios = []
                for qi, q in enumerate(group_qs):
                    qs = qs_raw[qi] if qi < len(qs_raw) else {}
                    question_scenarios.append({
                        "emoji":     qs.get("e") or qs.get("emoji") or group_scenario["emoji"],
                        "title":     qs.get("t") or qs.get("title") or group_scenario["title"],
                        "context":   qs.get("c") or qs.get("context") or group_scenario["introduction"],
                        "situation": qs.get("s") or qs.get("situation") or q.get("question_text", ""),
                    })

                result.append({
                    "groupScenario":     group_scenario,
                    "questionScenarios": question_scenarios,
                })

            return result

        except Exception as ex:
            print(f"❌ [StoryGen] JSON parse error: {ex}")
            print(f"   Raw (first 500): {raw[:500]}")
            return [self._local_group(g, idx) for idx, g in enumerate(groups)]

    def generate_all_stories(
        self, questions: List[Dict[str, Any]], group_size: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Flatten all group question scenarios into a single list (for batch endpoint).
        Returns one scenario dict per question.
        """
        groups = self.generate_group_stories(questions, group_size)
        flat = []
        for g in groups:
            flat.extend(g["questionScenarios"])
        return flat

    # ------------------------------------------------------------------
    # Prompt — all groups in 1 call
    # ------------------------------------------------------------------

    def _build_prompt(self, groups: List[List[Dict[str, Any]]]) -> str:
        n_groups = len(groups)
        lines = []
        for gi, group in enumerate(groups):
            dim = _normalize_dim(group[0].get("dimension") or "")
            lines.append(f"Nhóm {gi+1} [{dim}] ({len(group)} câu):")
            for qi, q in enumerate(group):
                lines.append(f"  {qi+1}. {q.get('question_text','')}")

        groups_text = "\n".join(lines)
        return (
            f"Nhiệm vụ: tạo {n_groups} CÂU CHUYỆN tiếng Việt cho bài trắc nghiệm nghề nghiệp.\n"
            f"\n"
            f"Mỗi nhóm câu hỏi = 1 câu chuyện có bối cảnh chung. Các kịch bản trong nhóm\n"
            f"phải liên kết với nhau trong cùng một câu chuyện đó (như các cảnh trong phim).\n"
            f"\n"
            f"Ví dụ nhóm [R]: câu chuyện 'Ngày làm việc tại xưởng cơ khí' →\n"
            f"  kịch bản 1: máy bị hỏng giữa ca\n"
            f"  kịch bản 2: đồng nghiệp nhờ bạn sửa thiết bị\n"
            f"  kịch bản 3: trưởng xưởng giao nhiệm vụ lắp ráp...\n"
            f"\n"
            f"Trả về JSON (không có text nào ngoài JSON):\n"
            f'{{"groups":[\n'
            f'  {{"g":{{"e":"emoji","t":"tên câu chuyện ≤5 từ","i":"mô tả bối cảnh chung 1-2 câu"}},\n'
            f'   "q":[{{"e":"emoji","t":"tên cảnh ≤4 từ","c":"ngữ cảnh trong câu chuyện 1 câu","s":"tình huống cụ thể 1 câu"}}]\n'
            f'  }}\n'
            f']}}\n'
            f"Đúng {n_groups} phần tử, mỗi nhóm có đúng số kịch bản bằng số câu hỏi.\n"
            f"\n"
            f"Các nhóm câu hỏi:\n{groups_text}"
        )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _clean_json(raw: str) -> str:
        s = raw.strip()
        s = re.sub(r"^```(?:json)?", "", s).rstrip("`").strip()
        m = re.search(r"\{.*\}", s, re.DOTALL)
        return m.group() if m else s

    def _local_group(self, group_qs: List[Dict[str, Any]], idx: int) -> Dict[str, Any]:
        dim = _normalize_dim(group_qs[0].get("dimension") or "") if group_qs else ""
        emoji, title, intro = _DIM_MAP.get(dim, ("📖", f"Nhóm {idx+1}", "Hãy trải nghiệm tình huống sau."))
        return {
            "groupScenario": {"emoji": emoji, "title": title, "introduction": intro},
            "questionScenarios": [
                {
                    "emoji":     emoji,
                    "title":     title,
                    "context":   intro,
                    "situation": q.get("question_text", ""),
                }
                for q in group_qs
            ],
        }
