"""
Seed 5,000 RANDOM Users with diverse trait distributions
=========================================================

Distribution strategy (production-grade diversity):
- 40% Strong-persona users: 1 RIASEC dim ≥ 0.85, others 0.10-0.45
  (allows top match careers to score ≥ 0.90)
- 30% Mixed-persona users: 2 RIASEC dims ≥ 0.70, others 0.10-0.50
- 20% Balanced users: all dims in 0.40-0.65
- 10% Edge users: extreme distributions (some dims very low / very high)

Big5 scores fully RANDOM with constraint: each user has 1-3 traits ≥ 0.75
to avoid all-flat profiles that destroy Pearson correlation signal.

Essay generation: 5 templates per RIASEC primary × random combination
of skills, hobbies, career goals → diverse PhoBERT embeddings.

NOTES:
- DOES NOT touch existing user_ids (max existing = 9327, new IDs auto-increment)
- Uses synthetic_5k_v#####@careerverse-train.local email pattern
- Each user gets 1 essay + RIASEC assessment + BigFive assessment
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

import numpy as np
import psycopg
import torch

_REPO_ROOT = Path(__file__).resolve().parents[1]
if str(_REPO_ROOT / "src") not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT / "src"))

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
logger = logging.getLogger(__name__)


RIASEC_DIMS = ["R", "I", "A", "S", "E", "C"]
BIG5_DIMS = ["O", "C", "E", "A", "N"]


# ============================================================================
# Essay templates: 5 per RIASEC dimension × diversity multipliers
# ============================================================================

ESSAY_TEMPLATES = {
    "R": [
        "Tôi đam mê {hobby1} và {hobby2}. Tôi có kỹ năng {skill1}, {skill2}, và {skill3}. "
        "Mục tiêu nghề nghiệp của tôi là trở thành {career_goal}. Tôi thích làm việc với "
        "{work_object} và môi trường {environment}.",
        "Sở thích lớn nhất của tôi là {hobby1}. Tôi đã có {experience} kinh nghiệm trong "
        "lĩnh vực {field}. Tôi giỏi {skill1} và {skill2}. Mục tiêu của tôi là {career_goal}, "
        "làm việc tại {workplace}.",
        "Tôi yêu thích {hobby1} từ nhỏ. Tôi thường tự tay {action} các thiết bị {object}. "
        "Tôi có khả năng {skill1} và {skill2}. Tôi muốn theo đuổi nghề {career_goal}.",
        "Tôi là người thích thực hành. Tôi đã từng làm {past_job} và rất hứng thú với "
        "{hobby1}. Kỹ năng nổi bật của tôi là {skill1}, {skill2}. Tôi muốn trở thành {career_goal}.",
        "Đam mê của tôi nằm ở {field}. Tôi giỏi giải quyết vấn đề kỹ thuật và làm việc với "
        "{work_object}. Tôi có kinh nghiệm {experience} với {skill1}. Mục tiêu nghề nghiệp: {career_goal}.",
    ],
    "I": [
        "Tôi đam mê {hobby1} và {hobby2}. Tôi yêu việc nghiên cứu, phân tích và tìm hiểu "
        "các vấn đề phức tạp. Mục tiêu của tôi là trở thành {career_goal}. Tôi giỏi {skill1}, "
        "{skill2}, và {skill3}.",
        "Sở thích của tôi là đọc sách khoa học, làm thí nghiệm và lập trình. Tôi đã hoàn thành "
        "các dự án {project_type}. Tôi muốn theo đuổi sự nghiệp {career_goal} tại {workplace}. "
        "Tôi giỏi {skill1} và phân tích dữ liệu.",
        "Tôi yêu toán học, thống kê và logic. Tôi thường dành thời gian giải các bài toán {puzzle}. "
        "Mục tiêu nghề nghiệp là {career_goal}. Tôi có kỹ năng {skill1}, {skill2}, và đam mê {field}.",
        "Tôi là người tò mò bẩm sinh. Tôi thích đặt câu hỏi và tìm câu trả lời thông qua nghiên cứu. "
        "Tôi giỏi {skill1}, {skill2}. Tôi muốn trở thành {career_goal} để khám phá {topic}.",
        "Niềm đam mê của tôi là {field}. Tôi đã đọc {books_read} sách về chủ đề này. "
        "Kỹ năng nổi bật: {skill1}, {skill2}, {skill3}. Tôi muốn theo đuổi sự nghiệp {career_goal}.",
    ],
    "A": [
        "Tôi yêu thích {hobby1} và {hobby2}. Tôi có khả năng sáng tạo cao và thường xuyên tạo ra "
        "{output_type}. Mục tiêu nghề nghiệp: {career_goal}. Kỹ năng: {skill1}, {skill2}, {skill3}.",
        "Sở thích của tôi là vẽ, sáng tác nhạc và viết lách. Tôi đã sản xuất {portfolio_count} "
        "tác phẩm. Tôi muốn trở thành {career_goal}. Giỏi {skill1} và {skill2}.",
        "Tôi đam mê nghệ thuật và thiết kế. Tôi sử dụng thành thạo {tool1}, {tool2}, {tool3}. "
        "Tôi thích thể hiện cảm xúc qua tác phẩm. Mục tiêu: {career_goal}.",
        "Tôi là người sáng tạo và độc lập. Tôi yêu thích {hobby1}, {hobby2}. Kỹ năng nổi bật: "
        "{skill1}, {skill2}. Tôi muốn theo đuổi sự nghiệp {career_goal} với {medium}.",
        "Đam mê lớn nhất của tôi là {field}. Tôi đã tạo ra {output_type} được nhiều người yêu thích. "
        "Mục tiêu nghề nghiệp: {career_goal}. Tôi giỏi {skill1}, {skill2}, {skill3}.",
    ],
    "S": [
        "Tôi yêu thích giúp đỡ người khác và làm việc với cộng đồng. Tôi đã tham gia {volunteer}. "
        "Mục tiêu nghề nghiệp: {career_goal}. Kỹ năng: {skill1}, {skill2}, {skill3}.",
        "Sở thích của tôi là dạy học, tư vấn và hỗ trợ cộng đồng. Tôi đã có {experience} kinh nghiệm "
        "{field}. Tôi muốn trở thành {career_goal}. Giỏi {skill1} và {skill2}.",
        "Tôi đam mê làm việc với con người. Tôi giỏi lắng nghe, đồng cảm và truyền đạt. "
        "Tôi đã làm {past_job}. Mục tiêu: {career_goal}.",
        "Tôi là người hướng ngoại, thích kết nối. Tôi đã tham gia {volunteer} để giúp đỡ {beneficiary}. "
        "Kỹ năng: {skill1}, {skill2}. Tôi muốn theo đuổi {career_goal}.",
        "Niềm đam mê của tôi là tạo ra tác động tích cực cho xã hội. Tôi giỏi {skill1}, {skill2}, "
        "{skill3}. Tôi muốn trở thành {career_goal} để giúp {beneficiary}.",
    ],
    "E": [
        "Tôi đam mê kinh doanh, lãnh đạo và xây dựng team. Tôi đã từng {past_role}. "
        "Mục tiêu nghề nghiệp: {career_goal}. Kỹ năng: {skill1}, {skill2}, {skill3}.",
        "Sở thích của tôi là bán hàng, đầu tư và xây dựng thương hiệu. Tôi đã đạt {achievement}. "
        "Tôi muốn trở thành {career_goal}. Giỏi {skill1} và {skill2}.",
        "Tôi là người quyết đoán, thích thử thách. Tôi đã quản lý {project}. Mục tiêu: {career_goal}. "
        "Tôi giỏi {skill1}, {skill2}.",
        "Tôi đam mê khởi nghiệp và tăng trưởng. Tôi đã xây dựng {venture}. Kỹ năng nổi bật: "
        "{skill1}, {skill2}, {skill3}. Tôi muốn theo đuổi {career_goal}.",
        "Niềm đam mê lớn nhất của tôi là {field}. Tôi giỏi {skill1}, {skill2}. Mục tiêu: "
        "{career_goal}, dẫn dắt team {team_size} người tại {workplace}.",
    ],
    "C": [
        "Tôi đam mê quản lý dữ liệu, lập kế hoạch và phân tích tài chính. Tôi giỏi {tool1}, "
        "{tool2}, {tool3}. Mục tiêu: {career_goal}. Kỹ năng: {skill1}, {skill2}.",
        "Sở thích của tôi là kế toán, kiểm toán và quản lý hồ sơ. Tôi đã có {experience} kinh nghiệm. "
        "Tôi muốn trở thành {career_goal}. Tôi giỏi {skill1} và {skill2}.",
        "Tôi là người tỉ mỉ, có kỷ luật. Tôi sử dụng thành thạo {tool1}, {tool2}. Mục tiêu: "
        "{career_goal}. Kỹ năng nổi bật: {skill1}, {skill2}, {skill3}.",
        "Tôi yêu thích công việc văn phòng có cấu trúc. Tôi đã thực tập tại {workplace}. "
        "Tôi giỏi {skill1}, {skill2}. Tôi muốn theo đuổi {career_goal}.",
        "Đam mê của tôi là {field}. Tôi giỏi tổ chức, theo dõi quy trình và đảm bảo chính xác. "
        "Kỹ năng: {skill1}, {skill2}, {skill3}. Mục tiêu nghề nghiệp: {career_goal}.",
    ],
}


# ============================================================================
# Random fillers per persona (HUGE diversity for embedding variation)
# ============================================================================

FILLERS = {
    "R": {
        "hobby1": ["sửa xe máy", "lắp ráp PC", "mộc", "DIY điện tử", "in 3D", "Arduino", "Raspberry Pi",
                   "robot", "mô hình máy bay", "thợ điện", "leo núi", "đua xe"],
        "hobby2": ["camping", "câu cá", "trồng cây", "nuôi cá", "chế tạo dao", "rèn kim loại",
                   "thủ công mỹ nghệ", "làm đồ gỗ", "tự sửa xe", "hàn điện"],
        "skill1": ["sửa chữa cơ khí", "vận hành máy CNC", "hàn TIG", "lập trình PLC",
                   "đọc bản vẽ kỹ thuật", "lắp đặt điện công nghiệp"],
        "skill2": ["thiết kế CAD", "phân tích kết cấu", "vận hành máy tiện", "tự động hóa",
                   "bảo trì máy móc", "kiểm tra chất lượng"],
        "skill3": ["lái xe nâng", "lập trình vi điều khiển", "sửa thiết bị điện tử",
                   "đo đạc trắc địa", "thi công xây dựng"],
        "career_goal": ["kỹ sư cơ khí", "kỹ thuật viên bảo trì", "kỹ sư điện", "kỹ sư xây dựng",
                        "thợ máy ô tô", "kỹ sư tự động hóa", "kỹ thuật viên IoT"],
        "work_object": ["máy móc", "thiết bị điện tử", "công cụ", "vật liệu xây dựng", "động cơ"],
        "environment": ["xưởng cơ khí", "nhà máy", "công trường", "phòng thí nghiệm kỹ thuật"],
        "field": ["cơ khí chính xác", "tự động hóa công nghiệp", "kỹ thuật ô tô", "điện công nghiệp"],
        "experience": ["1 năm", "2 năm", "6 tháng", "3 năm", "thực tập sinh"],
        "past_job": ["thợ phụ tại xưởng", "thực tập kỹ thuật viên", "operator máy CNC"],
        "workplace": ["nhà máy sản xuất", "công ty cơ khí", "công trường xây dựng", "garage ô tô"],
        "action": ["lắp ráp", "tháo lắp", "sửa chữa", "chế tạo", "hàn"],
        "object": ["điện tử", "cơ khí", "động cơ"],
    },
    "I": {
        "hobby1": ["lập trình", "đọc paper khoa học", "phân tích dữ liệu", "machine learning",
                   "giải toán", "thiên văn", "vật lý lượng tử", "sinh học phân tử"],
        "hobby2": ["chơi cờ vua", "logic puzzles", "code competitions", "data science contests",
                   "đọc Wikipedia", "nghiên cứu y sinh", "hóa học thực nghiệm"],
        "skill1": ["Python", "R", "SQL", "machine learning", "deep learning", "thống kê",
                   "phân tích dữ liệu lớn", "NLP", "computer vision"],
        "skill2": ["nghiên cứu khoa học", "viết báo cáo kỹ thuật", "Hadoop", "Spark", "TensorFlow",
                   "PyTorch", "PostgreSQL", "MongoDB"],
        "skill3": ["A/B testing", "regression analysis", "neural networks", "Bayesian statistics",
                   "data engineering", "feature engineering"],
        "career_goal": ["data scientist", "AI engineer", "research scientist", "biostatistician",
                        "kỹ sư AI", "nghiên cứu sinh tiến sĩ", "machine learning engineer"],
        "field": ["trí tuệ nhân tạo", "khoa học dữ liệu", "y sinh học", "vật lý", "hóa học",
                  "kinh tế lượng", "thần kinh học"],
        "topic": ["hành vi con người", "vũ trụ", "DNA", "trí tuệ nhân tạo", "biến đổi khí hậu"],
        "puzzle": ["thuật toán", "Putnam Mathematical", "Project Euler", "Codeforces"],
        "books_read": ["50+", "100+", "30+", "75+", "200+"],
        "project_type": ["machine learning end-to-end", "phân tích dữ liệu khách hàng",
                          "computer vision", "NLP cho tiếng Việt"],
        "workplace": ["viện nghiên cứu", "công ty công nghệ", "trường đại học", "phòng lab AI"],
    },
    "A": {
        "hobby1": ["vẽ tranh", "thiết kế đồ họa", "nhiếp ảnh", "viết văn", "làm phim",
                   "âm nhạc", "diễn xuất", "điêu khắc", "thời trang"],
        "hobby2": ["sáng tác nhạc", "viết blog", "làm vlog", "vẽ minh họa", "thiết kế UI",
                   "stop motion", "animation", "thiết kế nội thất"],
        "skill1": ["Photoshop", "Illustrator", "Procreate", "Figma", "Adobe Premiere",
                   "After Effects", "Blender", "Final Cut Pro"],
        "skill2": ["typography", "color theory", "storytelling", "thiết kế thương hiệu",
                   "animation 2D", "animation 3D", "video editing"],
        "skill3": ["concept art", "UI/UX design", "art direction", "creative writing",
                   "music production", "fashion design"],
        "career_goal": ["graphic designer", "UI/UX designer", "art director", "video producer",
                        "music producer", "writer", "fashion designer", "filmmaker"],
        "field": ["thiết kế đồ họa", "nhiếp ảnh", "âm nhạc", "điện ảnh", "thời trang", "kiến trúc"],
        "tool1": ["Adobe Creative Suite", "Sketch", "Figma", "Cinema 4D"],
        "tool2": ["Procreate", "Photoshop", "Illustrator", "Logic Pro"],
        "tool3": ["After Effects", "Premiere Pro", "Final Cut", "Ableton Live"],
        "output_type": ["sản phẩm minh họa", "video ngắn", "bài hát", "tiểu thuyết",
                        "thiết kế nội thất", "tác phẩm nhiếp ảnh"],
        "portfolio_count": ["50+", "100+", "20+", "30+"],
        "medium": ["digital art", "film", "âm nhạc", "thời trang", "kiến trúc"],
    },
    "S": {
        "hobby1": ["dạy học", "tình nguyện", "tâm lý học", "y học", "công tác xã hội"],
        "hobby2": ["tham gia CLB cộng đồng", "đọc sách self-help", "yoga", "thiền",
                   "tổ chức sự kiện cộng đồng", "tham gia camp tình nguyện"],
        "skill1": ["lắng nghe chủ động", "tư vấn", "đồng cảm", "giao tiếp đa văn hóa",
                   "giảng dạy", "huấn luyện", "công tác xã hội"],
        "skill2": ["quản lý xung đột", "làm việc nhóm", "thuyết trình", "viết bài",
                   "tổ chức sự kiện", "fundraising"],
        "skill3": ["sơ cứu", "tâm lý trị liệu", "Counseling", "interpretation",
                   "dạy ngoại ngữ", "training", "facilitation"],
        "career_goal": ["giáo viên", "chuyên viên tư vấn tâm lý", "y tá", "công tác xã hội",
                         "huấn luyện viên", "social worker", "human resources specialist"],
        "field": ["giáo dục", "y tế", "công tác xã hội", "tâm lý học", "phát triển cộng đồng"],
        "experience": ["1 năm", "2 năm", "3 năm", "thực tập"],
        "past_job": ["gia sư", "tình nguyện viên", "trợ giảng", "chăm sóc trẻ em"],
        "volunteer": ["dạy trẻ em ở vùng cao", "hỗ trợ người khuyết tật", "gây quỹ từ thiện",
                      "tổ chức trại hè", "dạy tiếng Anh miễn phí"],
        "beneficiary": ["trẻ em vùng cao", "người già neo đơn", "trẻ tự kỷ", "học sinh nghèo",
                        "người khuyết tật", "gia đình khó khăn"],
    },
    "E": {
        "hobby1": ["khởi nghiệp", "đầu tư cổ phiếu", "đọc sách kinh doanh", "marketing",
                   "bán hàng online", "xây dựng thương hiệu cá nhân"],
        "hobby2": ["networking", "public speaking", "đàm phán", "phân tích thị trường",
                   "đọc tin tức kinh tế", "đầu tư crypto"],
        "skill1": ["lãnh đạo", "đàm phán", "marketing", "sales", "branding",
                   "quản lý dự án", "phân tích thị trường"],
        "skill2": ["thuyết trình", "viết business plan", "phân tích tài chính",
                   "Google Ads", "Facebook Ads", "SEO", "content marketing"],
        "skill3": ["CRM Salesforce", "data-driven decision", "OKR", "Lean Startup",
                   "growth hacking", "quan hệ khách hàng"],
        "career_goal": ["marketing manager", "CEO", "founder startup", "sales director",
                        "business development", "product manager", "investment banker"],
        "field": ["kinh doanh", "marketing", "đầu tư", "khởi nghiệp", "phát triển sản phẩm"],
        "past_role": ["chủ tịch CLB sinh viên", "trưởng nhóm bán hàng", "co-founder startup nhỏ"],
        "achievement": ["doanh thu 500 triệu/năm", "tăng trưởng team 10x", "raise vốn seed",
                        "lead team 20 người", "đạt giải nhì cuộc thi khởi nghiệp"],
        "project": ["chiến dịch marketing toàn quốc", "ra mắt sản phẩm mới", "expand thị trường"],
        "venture": ["e-commerce startup", "ứng dụng mobile", "agency marketing", "F&B chain"],
        "team_size": ["5-10", "20+", "50+"],
        "workplace": ["công ty fintech", "startup unicorn", "tập đoàn đa quốc gia", "agency"],
    },
    "C": {
        "hobby1": ["lập kế hoạch tài chính", "phân tích báo cáo", "đọc luật doanh nghiệp",
                   "Excel pivot tables", "data visualization"],
        "hobby2": ["đọc sách quản trị", "tổ chức tài liệu", "automation Excel",
                   "kiểm toán nội bộ", "phân tích chi phí"],
        "skill1": ["Excel nâng cao", "SAP", "QuickBooks", "Power BI",
                   "kế toán tài chính", "kiểm toán", "tax compliance"],
        "skill2": ["IFRS", "GAAP", "Microsoft Office", "data entry chính xác",
                   "lập báo cáo tài chính", "phân tích chi phí"],
        "skill3": ["audit trail", "risk assessment", "compliance management",
                   "internal control", "process improvement"],
        "career_goal": ["accountant", "auditor", "financial analyst", "tax specialist",
                        "operations specialist", "data administrator", "office manager"],
        "field": ["kế toán", "kiểm toán", "tài chính doanh nghiệp", "quản trị vận hành"],
        "tool1": ["SAP", "Oracle ERP", "QuickBooks", "MISA"],
        "tool2": ["Excel", "Power BI", "Tableau", "FAST Accounting"],
        "tool3": ["SQL", "Access", "Pivot Tables", "VBA"],
        "experience": ["6 tháng", "1 năm", "2 năm", "thực tập Big4"],
        "workplace": ["công ty kiểm toán Big4", "ngân hàng", "tập đoàn đa quốc gia",
                      "doanh nghiệp vừa và nhỏ"],
    },
}


def gen_essay(persona: str, rng: random.Random) -> str:
    """Generate a unique essay for the given persona using random fillers."""
    template = rng.choice(ESSAY_TEMPLATES[persona])
    fillers = FILLERS[persona]

    # Build filler dict with random selections
    filler_values = {}
    for key, options in fillers.items():
        filler_values[key] = rng.choice(options)

    # Some templates may need additional generic fillers
    generic_fillers = {
        "hobby1": rng.choice(fillers.get("hobby1", ["đọc sách"])),
        "hobby2": rng.choice(fillers.get("hobby2", ["du lịch"])),
        "experience": rng.choice(["1 năm", "2 năm", "3 năm", "thực tập sinh", "fresher"]),
    }

    for k, v in generic_fillers.items():
        filler_values.setdefault(k, v)

    # Format with safe fallback
    try:
        text = template.format(**filler_values)
    except KeyError as e:
        # Add missing key with generic value
        missing = str(e).strip("'")
        filler_values[missing] = "kỹ năng chuyên môn"
        text = template.format(**filler_values)

    # Random suffix for diversity
    suffix_options = [
        f" Tôi đang ở giai đoạn {rng.choice(['sinh viên năm cuối', 'fresher', 'có 1 năm kinh nghiệm', 'mới chuyển ngành', 'đã làm việc 2 năm', 'đang tìm việc đầu tiên'])}.",
        f" Tôi mong muốn tìm môi trường {rng.choice(['năng động', 'ổn định', 'sáng tạo', 'có cơ hội học hỏi', 'có thể phát triển bản thân'])}.",
        f" Điểm mạnh của tôi là {rng.choice(['kiên trì', 'sáng tạo', 'logic', 'team work', 'leadership', 'tỉ mỉ'])}.",
        f" Tôi tin rằng nghề nghiệp này phù hợp với tính cách của tôi vì {rng.choice(['tôi thích thử thách', 'tôi thích sáng tạo', 'tôi giỏi phân tích', 'tôi thích giúp đỡ người khác', 'tôi thích tổ chức'])}.",
    ]

    text = text + " " + rng.choice(suffix_options)
    return text


# ============================================================================
# Trait score generators with DIVERSE distributions
# ============================================================================


def generate_riasec_strong_persona(rng: random.Random) -> tuple[str, dict[str, float]]:
    """
    Generate a user with one DOMINANT RIASEC dim (≥ 4.5/5).
    Other dims kept LOW (1.0-2.5) to maximize Pearson correlation with target career.
    """
    primary = rng.choice(RIASEC_DIMS)
    scores = {}
    for dim in RIASEC_DIMS:
        if dim == primary:
            scores[dim] = round(rng.uniform(4.50, 4.95), 3)  # Very high
        else:
            scores[dim] = round(rng.uniform(1.10, 2.50), 3)  # Low
    return primary, scores


def generate_riasec_mixed_persona(rng: random.Random) -> tuple[str, dict[str, float]]:
    """Generate user with 2 dominant dims (e.g., RI, AS)."""
    primaries = rng.sample(RIASEC_DIMS, 2)
    scores = {}
    for dim in RIASEC_DIMS:
        if dim in primaries:
            scores[dim] = round(rng.uniform(3.80, 4.70), 3)
        else:
            scores[dim] = round(rng.uniform(1.20, 2.80), 3)
    return primaries[0], scores


def generate_riasec_balanced(rng: random.Random) -> tuple[str, dict[str, float]]:
    """Generate user with all dims in mid range (no clear preference)."""
    scores = {dim: round(rng.uniform(2.50, 3.80), 3) for dim in RIASEC_DIMS}
    primary = max(scores, key=scores.get)
    return primary, scores


def generate_riasec_edge(rng: random.Random) -> tuple[str, dict[str, float]]:
    """Edge case: extreme distribution (some very high, some very low)."""
    scores = {}
    for dim in RIASEC_DIMS:
        choice = rng.random()
        if choice < 0.3:
            scores[dim] = round(rng.uniform(1.0, 1.8), 3)
        elif choice < 0.7:
            scores[dim] = round(rng.uniform(2.5, 3.5), 3)
        else:
            scores[dim] = round(rng.uniform(4.2, 4.95), 3)
    primary = max(scores, key=scores.get)
    return primary, scores


def generate_big5(rng: random.Random, persona: str) -> dict[str, float]:
    """
    Generate Big5 scores with REALISTIC correlation to RIASEC primary.
    Each user has 1-3 traits ≥ 3.75 (so Pearson signal is strong, not flat).
    """
    # Base on Costa & McCrae empirical mapping
    base_profiles = {
        "R": {"O": 0.30, "C": 0.65, "E": 0.40, "A": 0.45, "N": 0.40},
        "I": {"O": 0.85, "C": 0.65, "E": 0.35, "A": 0.45, "N": 0.35},
        "A": {"O": 0.95, "C": 0.40, "E": 0.55, "A": 0.55, "N": 0.55},
        "S": {"O": 0.55, "C": 0.55, "E": 0.80, "A": 0.85, "N": 0.40},
        "E": {"O": 0.55, "C": 0.55, "E": 0.85, "A": 0.45, "N": 0.30},
        "C": {"O": 0.30, "C": 0.85, "E": 0.45, "A": 0.55, "N": 0.40},
    }
    base = base_profiles.get(persona, {"O": 0.5, "C": 0.5, "E": 0.5, "A": 0.5, "N": 0.5})

    scores = {}
    for dim, base_val in base.items():
        # Random noise ±0.20 → still preserves persona signal
        noise = rng.uniform(-0.20, 0.20)
        unit = max(0.05, min(0.95, base_val + noise))
        # Convert 0-1 → 1-5 scale
        scores[dim] = round(1.0 + 4.0 * unit, 3)
    return scores


# ============================================================================
# DB helpers (same as before, but with idempotency check by email)
# ============================================================================


def insert_user(cur, email: str, full_name: str, persona: str) -> int:
    cur.execute(
        """
        INSERT INTO core.users (email, password_hash, full_name, role, is_locked, is_blocked,
                                is_email_verified, riasec_top_dim)
        VALUES (%s, %s, %s, 'Reader', false, false, true, %s)
        RETURNING id
        """,
        (email, "$synthetic_5k$noop", full_name, persona),
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
        VALUES (%s, %s, %s::jsonb, 'synthetic_5k')
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
        VALUES (%s, %s::vector(768), 'essay', 'phobert_synthetic_5k')
        ON CONFLICT (user_id) DO UPDATE
            SET emb = EXCLUDED.emb, source = EXCLUDED.source,
                model_name = EXCLUDED.model_name, built_at = now()
        """,
        (user_id, emb_str),
    )


def upsert_user_trait_pred(cur, user_id: int, essay_id: int, riasec: list[float],
                            big5: list[float], source: str, model_name: str):
    cur.execute(
        f"""
        INSERT INTO ai.user_trait_preds (user_id, essay_id, riasec_pred, big5_pred, source, model_name)
        VALUES (%s, %s, ARRAY{riasec}::real[], ARRAY{big5}::real[], %s, %s)
        ON CONFLICT (user_id, essay_id) DO UPDATE
            SET riasec_pred = EXCLUDED.riasec_pred, big5_pred = EXCLUDED.big5_pred,
                source = EXCLUDED.source, model_name = EXCLUDED.model_name, built_at = now()
        """,
        (user_id, essay_id, source, model_name),
    )


def upsert_user_trait_fused(cur, user_id: int, riasec_fused: list[float],
                             big5_fused: list[float], sources: list[str]):
    sources_json = json.dumps(sources)
    cur.execute(
        f"""
        INSERT INTO ai.user_trait_fused (user_id, riasec_scores_fused, big5_scores_fused,
                                          source_components, model_name)
        VALUES (%s, ARRAY{riasec_fused}::real[], ARRAY{big5_fused}::real[], %s::jsonb, 'fusion_v1')
        ON CONFLICT (user_id) DO UPDATE
            SET riasec_scores_fused = EXCLUDED.riasec_scores_fused,
                big5_scores_fused = EXCLUDED.big5_scores_fused,
                source_components = EXCLUDED.source_components, built_at = now()
        """,
        (user_id, sources_json),
    )


def normalize_to_unit(scores: dict[str, float], dims: list[str]) -> list[float]:
    """1-5 → 0-1 normalize."""
    return [round(max(0.0, min(1.0, (float(scores.get(d, 0)) - 1.0) / 4.0)), 4) for d in dims]


# ============================================================================
# PhoBERT embedding (same as previous seeder)
# ============================================================================

_PHOBERT_TOK = None
_PHOBERT_MODEL = None


def _load_phobert():
    global _PHOBERT_TOK, _PHOBERT_MODEL
    if _PHOBERT_MODEL is not None:
        return _PHOBERT_TOK, _PHOBERT_MODEL
    logger.info("Loading PhoBERT model...")
    from transformers import AutoModel, AutoTokenizer
    model_dir = _REPO_ROOT / "models" / "riasec_phobert"
    _PHOBERT_TOK = AutoTokenizer.from_pretrained(str(model_dir))
    _PHOBERT_MODEL = AutoModel.from_pretrained(str(model_dir))
    _PHOBERT_MODEL.eval()
    logger.info("PhoBERT loaded")
    return _PHOBERT_TOK, _PHOBERT_MODEL


def encode_essay(text: str) -> list[float]:
    tok, model = _load_phobert()
    inputs = tok(text, padding=True, truncation=True, max_length=256, return_tensors="pt")
    with torch.no_grad():
        outputs = model(**inputs)
        last = outputs.last_hidden_state
        mask = inputs["attention_mask"].unsqueeze(-1).float()
        pooled = (last * mask).sum(dim=1) / mask.sum(dim=1).clamp(min=1e-9)
        normed = pooled / pooled.norm(dim=1, keepdim=True).clamp(min=1e-9)
    return normed[0].cpu().numpy().tolist()


# ============================================================================
# Main seeder
# ============================================================================


def seed(num_users: int = 5000, batch_size: int = 100, seed_value: int = 1234, dry_run: bool = False):
    rng = random.Random(seed_value)
    np.random.seed(seed_value)

    _load_phobert()

    db_url = os.getenv("DATABASE_URL", "postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8")

    logger.info("Seeding %d random users (batch=%d, seed=%d)", num_users, batch_size, seed_value)
    start = time.time()
    inserted = 0

    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT MAX(id) FROM core.users")
            max_existing_id = cur.fetchone()[0] or 0
            logger.info("Existing max user_id: %d (will NOT touch)", max_existing_id)

        tag_suffix = f"v{int(time.time()) % 100000}"

        # Distribution targets
        n_strong = int(num_users * 0.40)
        n_mixed = int(num_users * 0.30)
        n_balanced = int(num_users * 0.20)
        n_edge = num_users - n_strong - n_mixed - n_balanced

        distribution = (
            ["strong"] * n_strong + ["mixed"] * n_mixed +
            ["balanced"] * n_balanced + ["edge"] * n_edge
        )
        rng.shuffle(distribution)

        for batch_start in range(0, num_users, batch_size):
            batch_end = min(batch_start + batch_size, num_users)

            with conn.cursor() as cur:
                for i in range(batch_start, batch_end):
                    user_idx = i + 1
                    dist_type = distribution[i]

                    # Generate RIASEC based on distribution type
                    if dist_type == "strong":
                        primary, riasec_scores = generate_riasec_strong_persona(rng)
                    elif dist_type == "mixed":
                        primary, riasec_scores = generate_riasec_mixed_persona(rng)
                    elif dist_type == "balanced":
                        primary, riasec_scores = generate_riasec_balanced(rng)
                    else:
                        primary, riasec_scores = generate_riasec_edge(rng)

                    big5_scores = generate_big5(rng, primary)
                    essay_text = gen_essay(primary, rng)

                    email = f"synthetic_5k_{tag_suffix}_{user_idx:05d}@careerverse-train.local"
                    full_name = f"Random User {user_idx} ({dist_type}/{primary})"

                    cur.execute("SELECT id FROM core.users WHERE email = %s", (email,))
                    if cur.fetchone():
                        continue

                    user_id = insert_user(cur, email, full_name, primary)
                    essay_id = insert_essay(cur, user_id, essay_text)
                    insert_assessment(cur, user_id, "RIASEC", riasec_scores)
                    insert_assessment(cur, user_id, "BigFive", big5_scores)

                    emb = encode_essay(essay_text)
                    upsert_user_embedding(cur, user_id, emb)

                    riasec_unit = normalize_to_unit(riasec_scores, RIASEC_DIMS)
                    big5_unit = normalize_to_unit(big5_scores, BIG5_DIMS)

                    upsert_user_trait_pred(cur, user_id, essay_id, riasec_unit, big5_unit,
                                            "test", "rule_based")
                    # Add small noise for essay-derived prediction
                    riasec_essay = [round(max(0, min(1, v + rng.gauss(0, 0.03))), 4) for v in riasec_unit]
                    big5_essay = [round(max(0, min(1, v + rng.gauss(0, 0.03))), 4) for v in big5_unit]
                    upsert_user_trait_pred(cur, user_id, essay_id, riasec_essay, big5_essay,
                                            "essay", "phobert_synthetic_5k")

                    riasec_fused = [(a + b) / 2.0 for a, b in zip(riasec_unit, riasec_essay)]
                    big5_fused = [(a + b) / 2.0 for a, b in zip(big5_unit, big5_essay)]
                    upsert_user_trait_fused(cur, user_id, riasec_fused, big5_fused,
                                             ["test", "essay"])

                    inserted += 1

                if dry_run:
                    conn.rollback()
                else:
                    conn.commit()

            elapsed = time.time() - start
            rate = inserted / max(elapsed, 0.001)
            logger.info(
                "Batch %d-%d: inserted=%d total, elapsed=%.1fs, rate=%.1f users/s",
                batch_start, batch_end, inserted, elapsed, rate,
            )

    elapsed = time.time() - start
    logger.info("DONE. Inserted %d users in %.1fs (%.1f users/s)", inserted, elapsed, inserted / max(elapsed, 0.001))
    return inserted


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--num", type=int, default=5000)
    ap.add_argument("--batch", type=int, default=100)
    ap.add_argument("--seed", type=int, default=1234)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    seed(num_users=args.num, batch_size=args.batch, seed_value=args.seed, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
