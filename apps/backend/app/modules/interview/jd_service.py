"""
JD Service - Parse và lưu Job Description
"""
import json
import re
from typing import Dict, Optional
from sqlalchemy.orm import Session
from .models import JobDescription
from .services import get_gemini_service


class JDService:
    def __init__(self, db: Session):
        self.db = db
        self.gemini = get_gemini_service()

    def parse_jd_text(self, raw_text: str) -> Dict:
        """Dùng Gemini parse JD thành structured JSON đầy đủ"""
        prompt = f"""Phân tích toàn bộ Job Description sau và trích xuất TẤT CẢ thông tin quan trọng.

QUAN TRỌNG về experience_level:
- "Fresher", "tân binh", "mới ra trường", "sinh viên", "entry", "đào tạo" → "Fresher"
- "Junior", "1-2 năm" → "Junior"
- "Senior", "5+ năm", "lead" → "Senior"
- Mặc định → "Junior"

JD:
{raw_text[:4000]}

Trả về JSON đầy đủ (chỉ JSON, không giải thích):
{{
  "required_skills": ["liệt kê TẤT CẢ kỹ năng kỹ thuật yêu cầu, ít nhất 5-10 items"],
  "tools": ["liệt kê TẤT CẢ công cụ/framework/ngôn ngữ, ít nhất 5-10 items"],
  "responsibilities": ["liệt kê TẤT CẢ nhiệm vụ/công việc cụ thể, ít nhất 3-5 items"],
  "training_program": ["nội dung đào tạo nếu có, ít nhất 3 items"],
  "qualifications": ["yêu cầu về bằng cấp/chứng chỉ/ngoại ngữ"],
  "experience_level": "Fresher|Junior|Middle|Senior",
  "domain": "lĩnh vực công việc cụ thể",
  "company_name": "tên công ty nếu có",
  "location": "địa điểm làm việc",
  "company_culture": "văn hóa công ty nếu có",
  "benefits": ["quyền lợi cụ thể, ít nhất 3 items"]
}}"""

        try:
            response = self.gemini.stream_manager.generate_content_with_retry(
                prompt, max_output_tokens=1000, temperature=0.1
            )
            if response:
                match = re.search(r"\{[\s\S]*\}", response)
                if match:
                    result = json.loads(match.group())
                    # Post-process: detect Fresher từ raw text nếu AI parse sai
                    raw_lower = raw_text.lower()
                    if any(kw in raw_lower for kw in ["fresher", "tân binh", "mới ra trường", "sinh viên", "entry level", "đào tạo tân binh"]):
                        result["experience_level"] = "Fresher"
                    # Đảm bảo các list không rỗng
                    for key in ["required_skills", "tools", "responsibilities", "training_program", "qualifications", "benefits"]:
                        if key not in result or not isinstance(result[key], list):
                            result[key] = []
                    return result
        except Exception as e:
            print(f"⚠️ JD parsing failed: {e}")

        return {
            "required_skills": [], "tools": [], "responsibilities": [],
            "training_program": [], "qualifications": [], "benefits": [],
            "experience_level": "Junior", "domain": "", "company_name": "",
            "location": "", "company_culture": ""
        }

    def calc_jd_questions_count(self, extracted_data: Dict) -> int:
        """Tính số câu hỏi về JD dựa trên độ phức tạp"""
        score = 0
        score += min(len(extracted_data.get("required_skills", [])), 10)
        score += min(len(extracted_data.get("tools", [])), 5)
        score += min(len(extracted_data.get("responsibilities", [])), 5)
        score += min(len(extracted_data.get("training_program", [])), 3)
        # 1-5 skills → 1 câu, 6-12 → 2 câu, 13+ → 3 câu
        if score <= 8:
            return 1
        elif score <= 16:
            return 2
        else:
            return 3

    def save_jd(self, user_id: int, career_id: Optional[str], raw_text: str, source: str = "manual") -> tuple:
        """Parse và lưu JD vào DB. Returns (JobDescription, jd_questions_count)"""
        extracted = self.parse_jd_text(raw_text)
        jd_questions_count = self.calc_jd_questions_count(extracted)
        jd = JobDescription(
            user_id=user_id,
            career_id=career_id,
            raw_text=raw_text,
            extracted_data=extracted,
            source=source
        )
        self.db.add(jd)
        self.db.commit()
        self.db.refresh(jd)
        return jd, jd_questions_count

    def get_jd(self, jd_id: int, user_id: int) -> Optional[JobDescription]:
        return self.db.query(JobDescription).filter(
            JobDescription.id == jd_id,
            JobDescription.user_id == user_id
        ).first()

    def extract_pdf_text(self, file_bytes: bytes) -> str:
        """Extract text từ PDF bytes dùng pdfplumber"""
        import io
        try:
            import pdfplumber
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                text = "\n".join(p.extract_text() or "" for p in pdf.pages)
            if text.strip():
                return text
            raise ValueError("PDF không có text (có thể là file scan)")
        except ImportError:
            raise ValueError("Thiếu thư viện pdfplumber. Chạy: pip install pdfplumber")
        except Exception as e:
            raise ValueError(f"Không thể đọc PDF: {e}")

    def extract_docx_text(self, file_bytes: bytes) -> str:
        """Extract text từ DOCX bytes"""
        try:
            import io
            from docx import Document
            doc = Document(io.BytesIO(file_bytes))
            return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
        except Exception as e:
            raise ValueError(f"Không thể đọc DOCX: {e}")
