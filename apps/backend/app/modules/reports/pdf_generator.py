"""
PDF Report Generator for CareerVerse AI.

Generates a professional PDF report containing Big Five and RIASEC personality
assessment results. Uses fpdf2 with Unicode support for Vietnamese text.
"""

import os
from datetime import datetime
from typing import Dict, List, Optional

from fpdf import FPDF


# ─── Font paths ────────────────────────────────────────────────────────────────
# fpdf2 ships with DejaVu which supports Vietnamese diacritics out of the box.
# We use the built-in DejaVu font family.

# ─── Color palette ─────────────────────────────────────────────────────────────
COLOR_PRIMARY = (99, 102, 241)       # Indigo-500
COLOR_PRIMARY_DARK = (67, 56, 202)   # Indigo-700
COLOR_SECONDARY = (168, 85, 247)     # Purple-500
COLOR_TEXT = (15, 23, 42)            # Slate-900
COLOR_TEXT_MUTED = (71, 85, 105)     # Slate-600
COLOR_BG_LIGHT = (241, 245, 249)    # Slate-100
COLOR_SUCCESS = (16, 185, 129)       # Emerald-500
COLOR_WARNING = (245, 158, 11)       # Amber-500
COLOR_DANGER = (239, 68, 68)         # Red-500
COLOR_WHITE = (255, 255, 255)


class ReportPDF(FPDF):
    """Custom PDF class with header/footer for CareerVerse reports."""

    def __init__(self, user_name: str = "", report_date: str = ""):
        super().__init__()
        self.user_name = user_name
        self.report_date = report_date
        self.set_auto_page_break(auto=True, margin=20)
        self._font_family_name = "helvetica"  # fallback

        # fpdf2 bundles DejaVu fonts with full Unicode/Vietnamese support.
        try:
            import fpdf
            fpdf_dir = os.path.dirname(fpdf.__file__)
            # First try local fonts directory (bundled with this module)
            local_font_dir = os.path.join(os.path.dirname(__file__), "fonts")
            dejavu_regular = os.path.join(local_font_dir, "DejaVuSans.ttf")
            dejavu_bold = os.path.join(local_font_dir, "DejaVuSans-Bold.ttf")

            if not os.path.exists(dejavu_regular):
                # Fallback: try fpdf2's font directory
                dejavu_regular = os.path.join(fpdf_dir, "font", "DejaVuSans.ttf")
                dejavu_bold = os.path.join(fpdf_dir, "font", "DejaVuSans-Bold.ttf")

            if os.path.exists(dejavu_regular) and os.path.exists(dejavu_bold):
                self.add_font("DejaVu", style="", fname=dejavu_regular)
                self.add_font("DejaVu", style="B", fname=dejavu_bold)
                self._font_family_name = "DejaVu"
            else:
                print(f"[pdf_generator] DejaVu fonts not found at {dejavu_regular}")
                self._font_family_name = "helvetica"
        except Exception as e:
            print(f"[pdf_generator] Could not load DejaVu font: {e}. Using Helvetica fallback.")
            self._font_family_name = "helvetica"

    @property
    def font_name(self) -> str:
        return self._font_family_name

    def header(self):
        if self.page_no() == 1:
            return  # Cover page has custom header
        self.set_font(self._font_family_name, "B", 8)
        self.set_text_color(*COLOR_TEXT_MUTED)
        self.cell(0, 8, "CareerVerse AI - Báo Cáo Đánh Giá Tính Cách & Nghề Nghiệp", align="L")
        self.ln(4)
        self.set_draw_color(*COLOR_PRIMARY)
        self.set_line_width(0.5)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(8)

    def footer(self):
        if self.page_no() == 1:
            return
        self.set_y(-15)
        self.set_font(self._font_family_name, "", 7)
        self.set_text_color(*COLOR_TEXT_MUTED)
        self.cell(0, 10, f"Trang {self.page_no()} | {self.user_name} | {self.report_date}", align="C")


def _draw_cover_page(pdf: ReportPDF, user_name: str, report_date: str, assessment_id: int):
    """Draw the cover page."""
    pdf.add_page()

    # Background gradient effect (solid color block)
    pdf.set_fill_color(*COLOR_PRIMARY)
    pdf.rect(0, 0, 210, 100, "F")

    # Title
    pdf.set_y(30)
    pdf.set_font(pdf.font_name, "B", 28)
    pdf.set_text_color(*COLOR_WHITE)
    pdf.cell(0, 12, "CareerVerse AI", align="C", new_x="LMARGIN", new_y="NEXT")

    pdf.set_font(pdf.font_name, "", 14)
    pdf.cell(0, 8, "Báo Cáo Đánh Giá Tính Cách & Nghề Nghiệp", align="C", new_x="LMARGIN", new_y="NEXT")

    # User info box
    pdf.set_y(115)
    pdf.set_fill_color(*COLOR_BG_LIGHT)
    pdf.rect(30, 110, 150, 50, "F")

    pdf.set_y(118)
    pdf.set_font(pdf.font_name, "B", 12)
    pdf.set_text_color(*COLOR_TEXT)
    pdf.cell(0, 8, f"Họ và tên: {user_name}", align="C", new_x="LMARGIN", new_y="NEXT")

    pdf.set_font(pdf.font_name, "", 10)
    pdf.set_text_color(*COLOR_TEXT_MUTED)
    pdf.cell(0, 7, f"Ngày đánh giá: {report_date}", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 7, f"Mã đánh giá: #{assessment_id}", align="C", new_x="LMARGIN", new_y="NEXT")

    # Disclaimer
    pdf.set_y(180)
    pdf.set_font(pdf.font_name, "", 8)
    pdf.set_text_color(*COLOR_TEXT_MUTED)
    pdf.multi_cell(
        0, 5,
        "Báo cáo này được tạo tự động bởi hệ thống CareerVerse AI dựa trên kết quả đánh giá "
        "tính cách Big Five và sở thích nghề nghiệp RIASEC của bạn. Kết quả mang tính tham khảo "
        "và không thay thế tư vấn chuyên môn.",
        align="C",
    )

    # Footer
    pdf.set_y(260)
    pdf.set_font(pdf.font_name, "", 7)
    pdf.cell(0, 5, f"© {datetime.now().year} CareerVerse AI System. All rights reserved.", align="C")


def _draw_score_bar(pdf: ReportPDF, label: str, score: float, y: float, color: tuple):
    """Draw a horizontal score bar."""
    bar_x = 70
    bar_width = 110
    bar_height = 7

    # Label
    pdf.set_xy(12, y)
    pdf.set_font(pdf.font_name, "", 9)
    pdf.set_text_color(*COLOR_TEXT)
    pdf.cell(55, bar_height, label, align="R")

    # Background bar
    pdf.set_fill_color(*COLOR_BG_LIGHT)
    pdf.rect(bar_x, y, bar_width, bar_height, "F")

    # Score bar
    fill_width = (score / 100.0) * bar_width
    pdf.set_fill_color(*color)
    pdf.rect(bar_x, y, fill_width, bar_height, "F")

    # Score text
    pdf.set_xy(bar_x + bar_width + 3, y)
    pdf.set_font(pdf.font_name, "B", 9)
    pdf.set_text_color(*color)
    pdf.cell(15, bar_height, f"{score:.0f}%", align="L")


def _draw_big5_page(pdf: ReportPDF, big5_scores: Dict[str, float], strengths: List[str], challenges: List[str]):
    """Draw Big Five personality scores page."""
    pdf.add_page()

    pdf.set_font(pdf.font_name, "B", 16)
    pdf.set_text_color(*COLOR_PRIMARY_DARK)
    pdf.cell(0, 10, "Big Five - Năm Yếu Tố Tính Cách", align="L", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)

    pdf.set_font(pdf.font_name, "", 9)
    pdf.set_text_color(*COLOR_TEXT_MUTED)
    pdf.multi_cell(
        0, 5,
        "Mô hình Big Five đánh giá 5 chiều tính cách cốt lõi. Điểm số thể hiện mức độ "
        "biểu hiện của từng đặc điểm so với trung bình.",
    )
    pdf.ln(8)

    # Score bars
    trait_labels = {
        "openness": "Cởi mở (Openness)",
        "conscientiousness": "Tận tâm (Conscientiousness)",
        "extraversion": "Hướng ngoại (Extraversion)",
        "agreeableness": "Dễ chịu (Agreeableness)",
        "neuroticism": "Nhạy cảm (Neuroticism)",
    }

    trait_colors = {
        "openness": (99, 102, 241),
        "conscientiousness": (16, 185, 129),
        "extraversion": (245, 158, 11),
        "agreeableness": (168, 85, 247),
        "neuroticism": (239, 68, 68),
    }

    y = pdf.get_y()
    for trait, label in trait_labels.items():
        score = big5_scores.get(trait, 50)
        _draw_score_bar(pdf, label, score, y, trait_colors[trait])
        y += 14

    pdf.set_y(y + 10)

    # Strengths
    if strengths:
        pdf.set_font(pdf.font_name, "B", 11)
        pdf.set_text_color(*COLOR_SUCCESS)
        pdf.cell(0, 8, "Điểm mạnh", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font(pdf.font_name, "", 9)
        pdf.set_text_color(*COLOR_TEXT)
        for s in strengths[:5]:
            pdf.cell(5, 6, "•")
            pdf.cell(0, 6, f" {s}", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)

    # Challenges
    if challenges:
        pdf.set_font(pdf.font_name, "B", 11)
        pdf.set_text_color(*COLOR_WARNING)
        pdf.cell(0, 8, "Thách thức", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font(pdf.font_name, "", 9)
        pdf.set_text_color(*COLOR_TEXT)
        for c in challenges[:5]:
            pdf.cell(5, 6, "•")
            pdf.cell(0, 6, f" {c}", new_x="LMARGIN", new_y="NEXT")


def _draw_riasec_page(pdf: ReportPDF, riasec_scores: Dict[str, float]):
    """Draw RIASEC career interest scores page."""
    pdf.add_page()

    pdf.set_font(pdf.font_name, "B", 16)
    pdf.set_text_color(*COLOR_PRIMARY_DARK)
    pdf.cell(0, 10, "RIASEC - Sở Thích Nghề Nghiệp", align="L", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)

    pdf.set_font(pdf.font_name, "", 9)
    pdf.set_text_color(*COLOR_TEXT_MUTED)
    pdf.multi_cell(
        0, 5,
        "Mô hình Holland RIASEC phân loại sở thích nghề nghiệp thành 6 nhóm. "
        "Điểm cao cho thấy bạn phù hợp với các nghề thuộc nhóm đó.",
    )
    pdf.ln(8)

    trait_labels = {
        "realistic": "Thực tế (Realistic)",
        "investigative": "Nghiên cứu (Investigative)",
        "artistic": "Nghệ thuật (Artistic)",
        "social": "Xã hội (Social)",
        "enterprising": "Doanh nhân (Enterprising)",
        "conventional": "Quy ước (Conventional)",
    }

    trait_colors = {
        "realistic": (239, 68, 68),
        "investigative": (99, 102, 241),
        "artistic": (168, 85, 247),
        "social": (16, 185, 129),
        "enterprising": (245, 158, 11),
        "conventional": (71, 85, 105),
    }

    y = pdf.get_y()
    for trait, label in trait_labels.items():
        score = riasec_scores.get(trait, 50)
        _draw_score_bar(pdf, label, score, y, trait_colors[trait])
        y += 14

    # Top 3 interests
    pdf.set_y(y + 12)
    sorted_traits = sorted(riasec_scores.items(), key=lambda x: x[1], reverse=True)
    top3 = sorted_traits[:3]

    pdf.set_font(pdf.font_name, "B", 11)
    pdf.set_text_color(*COLOR_PRIMARY_DARK)
    pdf.cell(0, 8, "Top 3 Sở Thích Nghề Nghiệp Của Bạn", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)

    for i, (trait, score) in enumerate(top3, 1):
        label = trait_labels.get(trait, trait)
        pdf.set_font(pdf.font_name, "B", 10)
        pdf.set_text_color(*trait_colors.get(trait, COLOR_TEXT))
        pdf.cell(0, 7, f"  {i}. {label} — {score:.0f}%", new_x="LMARGIN", new_y="NEXT")

    # Interpretation
    pdf.ln(8)
    pdf.set_font(pdf.font_name, "", 9)
    pdf.set_text_color(*COLOR_TEXT_MUTED)
    pdf.multi_cell(
        0, 5,
        "Kết hợp 3 sở thích hàng đầu tạo thành mã Holland của bạn. "
        "Hãy tìm kiếm các nghề nghiệp phù hợp với mã này để có sự nghiệp thỏa mãn nhất.",
    )


def _draw_closing_page(pdf: ReportPDF, assessment_id: int):
    """Draw closing page with next steps."""
    pdf.add_page()

    pdf.set_font(pdf.font_name, "B", 16)
    pdf.set_text_color(*COLOR_PRIMARY_DARK)
    pdf.cell(0, 10, "Bước Tiếp Theo", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(8)

    steps = [
        ("1", "Khám phá nghề nghiệp phù hợp", "Xem danh sách nghề nghiệp được AI gợi ý dựa trên kết quả đánh giá của bạn."),
        ("2", "Phân tích khoảng cách kỹ năng", "Tải CV lên để AI so sánh kỹ năng hiện tại với yêu cầu công việc mục tiêu."),
        ("3", "Lộ trình học tập cá nhân hóa", "Nhận kế hoạch học tập chi tiết để bổ sung các kỹ năng còn thiếu."),
        ("4", "Phỏng vấn thử với AI", "Luyện tập phỏng vấn với AI để tự tin hơn khi ứng tuyển."),
    ]

    for num, title, desc in steps:
        pdf.set_fill_color(*COLOR_BG_LIGHT)
        y = pdf.get_y()
        pdf.rect(12, y, 186, 18, "F")

        pdf.set_xy(16, y + 2)
        pdf.set_font(pdf.font_name, "B", 10)
        pdf.set_text_color(*COLOR_PRIMARY)
        pdf.cell(8, 7, num + ".")
        pdf.set_text_color(*COLOR_TEXT)
        pdf.cell(0, 7, title, new_x="LMARGIN", new_y="NEXT")

        pdf.set_x(28)
        pdf.set_font(pdf.font_name, "", 8)
        pdf.set_text_color(*COLOR_TEXT_MUTED)
        pdf.cell(0, 5, desc, new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)

    # Link
    pdf.ln(10)
    pdf.set_font(pdf.font_name, "", 9)
    pdf.set_text_color(*COLOR_PRIMARY)
    base_url = os.getenv("FRONTEND_BASE_URL", "https://careerverse.ai")
    pdf.cell(0, 7, f"Xem báo cáo đầy đủ tại: {base_url}/results/{assessment_id}/report", align="C", new_x="LMARGIN", new_y="NEXT")

    # Disclaimer
    pdf.ln(20)
    pdf.set_font(pdf.font_name, "", 7)
    pdf.set_text_color(*COLOR_TEXT_MUTED)
    pdf.multi_cell(
        0, 4,
        "Lưu ý: Báo cáo này được tạo tự động bởi AI và mang tính tham khảo. "
        "Kết quả không thay thế tư vấn nghề nghiệp chuyên nghiệp. "
        "Nếu bạn cần hỗ trợ thêm, vui lòng liên hệ support@careerverse.ai.",
        align="C",
    )


def generate_report_pdf(
    user_name: str,
    user_email: str,
    assessment_id: int,
    report_date: str,
    big5_scores: Optional[Dict[str, float]] = None,
    riasec_scores: Optional[Dict[str, float]] = None,
    strengths: Optional[List[str]] = None,
    challenges: Optional[List[str]] = None,
) -> bytes:
    """
    Generate a complete PDF report and return as bytes.

    Args:
        user_name: Full name of the user
        user_email: Email of the user
        assessment_id: Assessment ID
        report_date: Formatted date string
        big5_scores: Dict of Big Five scores (0-100)
        riasec_scores: Dict of RIASEC scores (0-100)
        strengths: List of strength descriptions
        challenges: List of challenge descriptions

    Returns:
        PDF file content as bytes
    """
    pdf = ReportPDF(user_name=user_name, report_date=report_date)

    # Cover page
    _draw_cover_page(pdf, user_name, report_date, assessment_id)

    # Big Five page
    if big5_scores:
        _draw_big5_page(pdf, big5_scores, strengths or [], challenges or [])

    # RIASEC page
    if riasec_scores:
        _draw_riasec_page(pdf, riasec_scores)

    # Closing page
    _draw_closing_page(pdf, assessment_id)

    # Output to bytes
    return bytes(pdf.output())

