"""
Hard-coded industry groups for Vietnam labor market intelligence.
DO NOT modify these — they are the canonical taxonomy for all crawling,
analytics, and AI recommendation features.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List


@dataclass(frozen=True)
class IndustryGroup:
    id: int
    name: str          # English canonical name
    slug: str          # URL-safe identifier
    name_vi: str       # Vietnamese display name
    # Search keywords per job board (used to build search URLs)
    vnw_keywords: List[str]
    itviec_keywords: List[str]
    topcv_keywords: List[str]
    careerviet_keywords: List[str]


INDUSTRY_GROUPS: List[IndustryGroup] = [
    IndustryGroup(
        id=1, name="Information Technology", slug="information-technology",
        name_vi="Công nghệ thông tin",
        vnw_keywords=["công nghệ thông tin", "lập trình", "phần mềm"],
        itviec_keywords=["software", "developer", "engineer"],
        topcv_keywords=["công nghệ thông tin", "lập trình viên"],
        careerviet_keywords=["IT", "phần mềm"],
    ),
    IndustryGroup(
        id=2, name="Marketing and Communication", slug="marketing-communication",
        name_vi="Marketing & Truyền thông",
        vnw_keywords=["marketing", "truyền thông", "quảng cáo"],
        itviec_keywords=["marketing", "digital marketing"],
        topcv_keywords=["marketing", "truyền thông"],
        careerviet_keywords=["marketing", "quảng cáo"],
    ),
    IndustryGroup(
        id=3, name="Finance and Banking", slug="finance-banking",
        name_vi="Tài chính & Ngân hàng",
        vnw_keywords=["tài chính", "ngân hàng", "đầu tư"],
        itviec_keywords=["finance", "banking", "fintech"],
        topcv_keywords=["tài chính", "ngân hàng"],
        careerviet_keywords=["tài chính", "ngân hàng"],
    ),
    IndustryGroup(
        id=4, name="Accounting and Auditing", slug="accounting-auditing",
        name_vi="Kế toán & Kiểm toán",
        vnw_keywords=["kế toán", "kiểm toán", "kế toán trưởng"],
        itviec_keywords=["accounting", "audit"],
        topcv_keywords=["kế toán", "kiểm toán"],
        careerviet_keywords=["kế toán", "kiểm toán"],
    ),
    IndustryGroup(
        id=5, name="Human Resources", slug="human-resources",
        name_vi="Nhân sự",
        vnw_keywords=["nhân sự", "tuyển dụng", "HR"],
        itviec_keywords=["HR", "human resources", "recruitment"],
        topcv_keywords=["nhân sự", "tuyển dụng"],
        careerviet_keywords=["nhân sự", "HR"],
    ),
    IndustryGroup(
        id=6, name="Sales and Business Development", slug="sales-business-development",
        name_vi="Kinh doanh & Phát triển",
        vnw_keywords=["kinh doanh", "bán hàng", "phát triển kinh doanh"],
        itviec_keywords=["sales", "business development"],
        topcv_keywords=["kinh doanh", "bán hàng"],
        careerviet_keywords=["kinh doanh", "sales"],
    ),
    IndustryGroup(
        id=7, name="Customer Service", slug="customer-service",
        name_vi="Dịch vụ khách hàng",
        vnw_keywords=["dịch vụ khách hàng", "chăm sóc khách hàng", "CSKH"],
        itviec_keywords=["customer service", "support"],
        topcv_keywords=["dịch vụ khách hàng", "CSKH"],
        careerviet_keywords=["dịch vụ khách hàng"],
    ),
    IndustryGroup(
        id=8, name="Education and Training", slug="education-training",
        name_vi="Giáo dục & Đào tạo",
        vnw_keywords=["giáo dục", "đào tạo", "giảng viên", "giáo viên"],
        itviec_keywords=["education", "training", "teaching"],
        topcv_keywords=["giáo dục", "đào tạo"],
        careerviet_keywords=["giáo dục", "giảng dạy"],
    ),
    IndustryGroup(
        id=9, name="Healthcare and Medical", slug="healthcare-medical",
        name_vi="Y tế & Chăm sóc sức khỏe",
        vnw_keywords=["y tế", "bác sĩ", "dược", "điều dưỡng"],
        itviec_keywords=["healthcare", "medical", "pharma"],
        topcv_keywords=["y tế", "bác sĩ", "dược"],
        careerviet_keywords=["y tế", "sức khỏe"],
    ),
    IndustryGroup(
        id=10, name="Logistics and Supply Chain", slug="logistics-supply-chain",
        name_vi="Logistics & Chuỗi cung ứng",
        vnw_keywords=["logistics", "xuất nhập khẩu", "chuỗi cung ứng", "kho vận"],
        itviec_keywords=["logistics", "supply chain"],
        topcv_keywords=["logistics", "xuất nhập khẩu"],
        careerviet_keywords=["logistics", "kho vận"],
    ),
    IndustryGroup(
        id=11, name="Manufacturing and Production", slug="manufacturing-production",
        name_vi="Sản xuất & Vận hành",
        vnw_keywords=["sản xuất", "vận hành", "quản lý sản xuất", "kỹ thuật sản xuất"],
        itviec_keywords=["manufacturing", "production", "operations"],
        topcv_keywords=["sản xuất", "vận hành"],
        careerviet_keywords=["sản xuất", "nhà máy"],
    ),
    IndustryGroup(
        id=12, name="Construction and Engineering", slug="construction-engineering",
        name_vi="Xây dựng & Kỹ thuật",
        vnw_keywords=["xây dựng", "kỹ sư", "cơ khí", "điện", "kiến trúc"],
        itviec_keywords=["construction", "engineering", "civil"],
        topcv_keywords=["xây dựng", "kỹ sư"],
        careerviet_keywords=["xây dựng", "kỹ thuật"],
    ),
    IndustryGroup(
        id=13, name="Real Estate", slug="real-estate",
        name_vi="Bất động sản",
        vnw_keywords=["bất động sản", "môi giới", "quản lý tòa nhà"],
        itviec_keywords=["real estate", "property"],
        topcv_keywords=["bất động sản"],
        careerviet_keywords=["bất động sản"],
    ),
    IndustryGroup(
        id=14, name="Retail and E-commerce", slug="retail-ecommerce",
        name_vi="Bán lẻ & Thương mại điện tử",
        vnw_keywords=["bán lẻ", "thương mại điện tử", "e-commerce", "retail"],
        itviec_keywords=["ecommerce", "retail", "marketplace"],
        topcv_keywords=["bán lẻ", "thương mại điện tử"],
        careerviet_keywords=["bán lẻ", "e-commerce"],
    ),
    IndustryGroup(
        id=15, name="Media and Content", slug="media-content",
        name_vi="Truyền thông & Nội dung",
        vnw_keywords=["truyền thông", "nội dung", "báo chí", "content"],
        itviec_keywords=["media", "content", "journalism"],
        topcv_keywords=["truyền thông", "nội dung"],
        careerviet_keywords=["truyền thông", "báo chí"],
    ),
    IndustryGroup(
        id=16, name="Hospitality and Tourism", slug="hospitality-tourism",
        name_vi="Khách sạn & Du lịch",
        vnw_keywords=["khách sạn", "du lịch", "nhà hàng", "F&B"],
        itviec_keywords=["hospitality", "tourism", "hotel"],
        topcv_keywords=["khách sạn", "du lịch"],
        careerviet_keywords=["khách sạn", "du lịch"],
    ),
    IndustryGroup(
        id=17, name="Legal and Compliance", slug="legal-compliance",
        name_vi="Pháp lý & Tuân thủ",
        vnw_keywords=["pháp lý", "luật sư", "tuân thủ", "compliance"],
        itviec_keywords=["legal", "compliance", "law"],
        topcv_keywords=["pháp lý", "luật"],
        careerviet_keywords=["pháp lý", "luật sư"],
    ),
    IndustryGroup(
        id=18, name="Administration and Office Support", slug="administration-office",
        name_vi="Hành chính & Văn phòng",
        vnw_keywords=["hành chính", "văn phòng", "thư ký", "lễ tân"],
        itviec_keywords=["admin", "office", "secretary"],
        topcv_keywords=["hành chính", "văn phòng"],
        careerviet_keywords=["hành chính", "văn phòng"],
    ),
    IndustryGroup(
        id=19, name="Transportation", slug="transportation",
        name_vi="Vận tải",
        vnw_keywords=["vận tải", "lái xe", "giao nhận", "tài xế"],
        itviec_keywords=["transportation", "driver", "delivery"],
        topcv_keywords=["vận tải", "lái xe"],
        careerviet_keywords=["vận tải", "giao nhận"],
    ),
    IndustryGroup(
        id=20, name="Energy and Environment", slug="energy-environment",
        name_vi="Năng lượng & Môi trường",
        vnw_keywords=["năng lượng", "môi trường", "điện", "năng lượng tái tạo"],
        itviec_keywords=["energy", "environment", "renewable"],
        topcv_keywords=["năng lượng", "môi trường"],
        careerviet_keywords=["năng lượng", "môi trường"],
    ),
]

# Fast lookup maps
INDUSTRY_BY_ID: Dict[int, IndustryGroup] = {g.id: g for g in INDUSTRY_GROUPS}
INDUSTRY_BY_SLUG: Dict[str, IndustryGroup] = {g.slug: g for g in INDUSTRY_GROUPS}
INDUSTRY_BY_NAME: Dict[str, IndustryGroup] = {g.name: g for g in INDUSTRY_GROUPS}

# How many jobs to crawl per industry per source
JOBS_PER_INDUSTRY = 30
