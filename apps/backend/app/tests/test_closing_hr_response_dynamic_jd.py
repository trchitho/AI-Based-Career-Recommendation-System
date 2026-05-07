"""
Test suite for _generate_hr_response_to_candidate_question JD data extraction logic.
Tests verify that extracted = jd_data.get("extracted_data", jd_data) works correctly
for flat JD format, and that company_name/benefits/training_program are extracted properly.

No imports from AIPipelineService — tests the extraction logic directly.
"""

from typing import Any, Dict, List, Optional


# ── Core extraction logic (mirrors the actual implementation) ──────────────────

def extract_jd_fields(jd_data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Replicate the extraction logic from _generate_hr_response_to_candidate_question."""
    if not jd_data:
        return {
            "company_name": "công ty",
            "benefits": [],
            "training_program": [],
            "location": "",
            "company_culture": "",
            "required_skills": [],
            "tools": [],
            "qualifications": [],
            "responsibilities": [],
            "domain": [],
            "experience_level": "",
        }
    # Key logic under test
    extracted = jd_data.get("extracted_data", jd_data)
    return {
        "company_name": extracted.get("company_name", "công ty"),
        "benefits": extracted.get("benefits", []),
        "training_program": extracted.get("training_program", []),
        "location": extracted.get("location", ""),
        "company_culture": extracted.get("company_culture", ""),
        "required_skills": extracted.get("required_skills", []),
        "tools": extracted.get("tools", []),
        "qualifications": extracted.get("qualifications", []),
        "responsibilities": extracted.get("responsibilities", []),
        "domain": extracted.get("domain", []),
        "experience_level": extracted.get("experience_level", ""),
    }


# ── TC01–TC05: Vietnamese tech companies ──────────────────────────────────────

def test_tc01_fpt_software():
    """TC01: FPT Software flat JD format."""
    jd_data = {
        "company_name": "FPT Software",
        "benefits": ["Lương tháng 13", "Bảo hiểm sức khỏe FPT Care", "Cổ phần ESOP"],
        "training_program": ["FPT Academy", "Chứng chỉ AWS được tài trợ"],
        "location": "Hà Nội",
        "required_skills": ["Python", "Java", "Microservices"],
        "domain": ["Outsourcing", "Enterprise Software"],
        "experience_level": "Mid-level",
    }
    result = extract_jd_fields(jd_data)
    assert result["company_name"] == "FPT Software"
    assert "Lương tháng 13" in result["benefits"]
    assert "FPT Academy" in result["training_program"]
    assert len(result["benefits"]) == 3
    assert result["location"] == "Hà Nội"


def test_tc02_vng_corporation():
    """TC02: VNG Corporation flat JD format."""
    jd_data = {
        "company_name": "VNG Corporation",
        "benefits": ["Thưởng hiệu suất Q4", "Gym membership", "Ăn trưa miễn phí"],
        "training_program": ["VNG Tech Talk", "Khóa học Golang nội bộ"],
        "location": "TP. Hồ Chí Minh",
        "required_skills": ["Golang", "Kubernetes", "Redis"],
        "domain": ["Gaming", "Cloud Services"],
        "experience_level": "Senior",
    }
    result = extract_jd_fields(jd_data)
    assert result["company_name"] == "VNG Corporation"
    assert "Gym membership" in result["benefits"]
    assert "VNG Tech Talk" in result["training_program"]
    assert len(result["training_program"]) == 2


def test_tc03_viettel_group():
    """TC03: Viettel Group flat JD format."""
    jd_data = {
        "company_name": "Viettel Group",
        "benefits": ["Phụ cấp điện thoại", "Nhà ở tập thể", "Vé máy bay hàng năm"],
        "training_program": ["Viettel Academy", "Đào tạo 5G", "Học bổng thạc sĩ"],
        "location": "Hà Nội",
        "required_skills": ["C++", "Embedded Systems", "5G Protocol"],
        "domain": ["Telecommunications"],
        "experience_level": "Mid-level",
    }
    result = extract_jd_fields(jd_data)
    assert result["company_name"] == "Viettel Group"
    assert "Vé máy bay hàng năm" in result["benefits"]
    assert "Học bổng thạc sĩ" in result["training_program"]
    assert len(result["benefits"]) == 3


def test_tc04_vnpt_technology():
    """TC04: VNPT Technology flat JD format."""
    jd_data = {
        "company_name": "VNPT Technology",
        "benefits": ["Bảo hiểm xã hội đầy đủ", "Thưởng Tết", "Du lịch hàng năm"],
        "training_program": ["VNPT iLearn", "Chứng chỉ CCNA tài trợ"],
        "location": "Hà Nội",
        "required_skills": ["Network Engineering", "Python", "Linux"],
        "domain": ["Telecommunications", "IoT"],
        "experience_level": "Junior",
    }
    result = extract_jd_fields(jd_data)
    assert result["company_name"] == "VNPT Technology"
    assert "Thưởng Tết" in result["benefits"]
    assert "VNPT iLearn" in result["training_program"]
    assert result["experience_level"] == "Junior"


def test_tc05_momo_fintech():
    """TC05: MoMo (M_Service) flat JD format."""
    jd_data = {
        "company_name": "MoMo (M_Service)",
        "benefits": ["Stock options", "Flexible working hours", "Health insurance premium"],
        "training_program": ["MoMo Tech Summit", "Fintech certification support"],
        "location": "TP. Hồ Chí Minh",
        "required_skills": ["React Native", "Node.js", "Payment Gateway"],
        "domain": ["Fintech", "Mobile Payment"],
        "experience_level": "Mid-level",
    }
    result = extract_jd_fields(jd_data)
    assert result["company_name"] == "MoMo (M_Service)"
    assert "Stock options" in result["benefits"]
    assert "MoMo Tech Summit" in result["training_program"]
    assert result["location"] == "TP. Hồ Chí Minh"


# ── TC06–TC10: Different industries ───────────────────────────────────────────

def test_tc06_healthcare_industry():
    """TC06: Healthcare company JD."""
    jd_data = {
        "company_name": "Vinmec Healthcare",
        "benefits": ["Khám bệnh miễn phí", "Bảo hiểm y tế cao cấp", "Phụ cấp ca đêm"],
        "training_program": ["Đào tạo y tế liên tục CME", "Chứng chỉ chuyên khoa"],
        "location": "Hà Nội",
        "required_skills": ["HL7 FHIR", "Python", "Medical Imaging"],
        "domain": ["Healthcare", "MedTech"],
        "experience_level": "Senior",
    }
    result = extract_jd_fields(jd_data)
    assert result["company_name"] == "Vinmec Healthcare"
    assert "Khám bệnh miễn phí" in result["benefits"]
    assert "Đào tạo y tế liên tục CME" in result["training_program"]
    assert "Healthcare" in result["domain"]


def test_tc07_finance_industry():
    """TC07: Finance/banking company JD."""
    jd_data = {
        "company_name": "Techcombank",
        "benefits": ["Lãi suất vay ưu đãi nhân viên", "Thưởng KPI hàng quý", "Xe đưa đón"],
        "training_program": ["CFA study support", "Risk Management certification"],
        "location": "Hà Nội",
        "required_skills": ["SQL", "Power BI", "Risk Modeling"],
        "domain": ["Banking", "Finance"],
        "experience_level": "Mid-level",
    }
    result = extract_jd_fields(jd_data)
    assert result["company_name"] == "Techcombank"
    assert "Thưởng KPI hàng quý" in result["benefits"]
    assert "CFA study support" in result["training_program"]
    assert len(result["required_skills"]) == 3


def test_tc08_education_industry():
    """TC08: EdTech company JD."""
    jd_data = {
        "company_name": "ELSA Speak",
        "benefits": ["Remote work 100%", "Learning budget $1000/năm", "Equity package"],
        "training_program": ["AI/ML bootcamp nội bộ", "English coaching"],
        "location": "Remote",
        "required_skills": ["NLP", "TensorFlow", "Python"],
        "domain": ["EdTech", "AI"],
        "experience_level": "Senior",
    }
    result = extract_jd_fields(jd_data)
    assert result["company_name"] == "ELSA Speak"
    assert "Remote work 100%" in result["benefits"]
    assert "AI/ML bootcamp nội bộ" in result["training_program"]
    assert result["location"] == "Remote"


def test_tc09_logistics_industry():
    """TC09: Logistics company JD."""
    jd_data = {
        "company_name": "Giao Hàng Nhanh (GHN)",
        "benefits": ["Phụ cấp xăng xe", "Bảo hiểm tai nạn 24/7", "Thưởng giao hàng đúng hạn"],
        "training_program": ["Đào tạo vận hành kho", "Chứng chỉ logistics quốc tế"],
        "location": "TP. Hồ Chí Minh",
        "required_skills": ["Supply Chain", "Python", "Data Analysis"],
        "domain": ["Logistics", "E-commerce"],
        "experience_level": "Junior",
    }
    result = extract_jd_fields(jd_data)
    assert result["company_name"] == "Giao Hàng Nhanh (GHN)"
    assert "Phụ cấp xăng xe" in result["benefits"]
    assert "Chứng chỉ logistics quốc tế" in result["training_program"]
    assert "Logistics" in result["domain"]


def test_tc10_retail_industry():
    """TC10: Retail/e-commerce company JD."""
    jd_data = {
        "company_name": "Tiki Corporation",
        "benefits": ["Giảm giá mua hàng 20%", "Thưởng doanh số", "Bảo hiểm sức khỏe"],
        "training_program": ["Tiki Data School", "Product Management course"],
        "location": "TP. Hồ Chí Minh",
        "required_skills": ["React", "TypeScript", "GraphQL"],
        "domain": ["E-commerce", "Retail"],
        "experience_level": "Mid-level",
    }
    result = extract_jd_fields(jd_data)
    assert result["company_name"] == "Tiki Corporation"
    assert "Giảm giá mua hàng 20%" in result["benefits"]
    assert "Tiki Data School" in result["training_program"]
    assert len(result["benefits"]) == 3


# ── TC11–TC15: Different benefit structures ───────────────────────────────────

def test_tc11_high_salary_benefits():
    """TC11: JD with high salary / compensation-focused benefits."""
    jd_data = {
        "company_name": "Sea Limited (Shopee)",
        "benefits": [
            "Lương cạnh tranh top 10% thị trường",
            "Thưởng hiệu suất lên đến 6 tháng lương",
            "RSU cổ phiếu Sea Limited",
            "Phụ cấp ăn trưa 50.000 VND/ngày",
        ],
        "training_program": ["Sea Leadership Program", "Tech Bootcamp Singapore"],
        "location": "TP. Hồ Chí Minh",
        "required_skills": ["Java", "Kafka", "MySQL"],
        "domain": ["E-commerce", "Gaming"],
        "experience_level": "Senior",
    }
    result = extract_jd_fields(jd_data)
    assert result["company_name"] == "Sea Limited (Shopee)"
    assert len(result["benefits"]) == 4
    assert any("RSU" in b for b in result["benefits"])
    assert "Sea Leadership Program" in result["training_program"]


def test_tc12_stock_options_benefits():
    """TC12: JD with stock options and equity benefits."""
    jd_data = {
        "company_name": "KiotViet",
        "benefits": ["ESOP 2% equity", "Vesting 4 năm", "Cliff 1 năm", "Bảo hiểm sức khỏe"],
        "training_program": ["Startup mentorship", "Product thinking workshop"],
        "location": "Hà Nội",
        "required_skills": ["Vue.js", "Laravel", "PostgreSQL"],
        "domain": ["SaaS", "POS"],
        "experience_level": "Mid-level",
    }
    result = extract_jd_fields(jd_data)
    assert result["company_name"] == "KiotViet"
    assert "ESOP 2% equity" in result["benefits"]
    assert "Vesting 4 năm" in result["benefits"]
    assert len(result["training_program"]) == 2


def test_tc13_remote_work_benefits():
    """TC13: JD with remote-work-focused benefits."""
    jd_data = {
        "company_name": "Axon Active Vietnam",
        "benefits": [
            "Remote work toàn thời gian",
            "Home office allowance 5.000.000 VND",
            "Flexible hours (core 10h-15h)",
            "Co-working space budget",
        ],
        "training_program": ["Agile/Scrum certification", "Remote collaboration tools training"],
        "location": "Remote (toàn quốc)",
        "required_skills": [".NET", "Azure", "Scrum"],
        "domain": ["Outsourcing", "Enterprise"],
        "experience_level": "Mid-level",
    }
    result = extract_jd_fields(jd_data)
    assert result["company_name"] == "Axon Active Vietnam"
    assert "Remote work toàn thời gian" in result["benefits"]
    assert any("Remote" in t for t in result["training_program"])
    assert result["location"] == "Remote (toàn quốc)"


def test_tc14_wellness_benefits():
    """TC14: JD with wellness and lifestyle benefits."""
    jd_data = {
        "company_name": "Grab Vietnam",
        "benefits": [
            "GrabFlex wellness allowance 3.000.000 VND/năm",
            "Mental health support (BetterHelp)",
            "Gym & yoga reimbursement",
            "Paid volunteer days 3 ngày/năm",
        ],
        "training_program": ["Grab Tech Academy", "Leadership Essentials Program"],
        "location": "TP. Hồ Chí Minh",
        "required_skills": ["Go", "gRPC", "Kubernetes"],
        "domain": ["Super App", "Ride-hailing"],
        "experience_level": "Senior",
    }
    result = extract_jd_fields(jd_data)
    assert result["company_name"] == "Grab Vietnam"
    assert "Mental health support (BetterHelp)" in result["benefits"]
    assert "Grab Tech Academy" in result["training_program"]
    assert len(result["benefits"]) == 4


def test_tc15_international_benefits():
    """TC15: JD with international/relocation benefits."""
    jd_data = {
        "company_name": "Bosch Vietnam",
        "benefits": [
            "Cơ hội luân chuyển quốc tế",
            "Hỗ trợ visa & relocation",
            "Bảo hiểm quốc tế CIGNA",
            "Phụ cấp tiếng Đức",
        ],
        "training_program": ["Bosch Global Training Center", "Six Sigma Green Belt"],
        "location": "Bình Dương",
        "required_skills": ["C", "AUTOSAR", "CAN Bus"],
        "domain": ["Automotive", "Manufacturing"],
        "experience_level": "Senior",
    }
    result = extract_jd_fields(jd_data)
    assert result["company_name"] == "Bosch Vietnam"
    assert "Hỗ trợ visa & relocation" in result["benefits"]
    assert "Six Sigma Green Belt" in result["training_program"]
    assert result["location"] == "Bình Dương"


# ── TC16–TC20: Edge cases ─────────────────────────────────────────────────────

def test_tc16_empty_benefits_list():
    """TC16: JD with empty benefits and training_program lists."""
    jd_data = {
        "company_name": "Startup XYZ",
        "benefits": [],
        "training_program": [],
        "location": "Hà Nội",
        "required_skills": ["Python"],
        "domain": ["SaaS"],
        "experience_level": "Junior",
    }
    result = extract_jd_fields(jd_data)
    assert result["company_name"] == "Startup XYZ"
    assert result["benefits"] == []
    assert result["training_program"] == []
    # Empty lists are falsy — verify fallback string logic would trigger
    assert not result["benefits"]
    assert not result["training_program"]


def test_tc17_missing_optional_fields():
    """TC17: JD missing several optional fields — fallback defaults apply."""
    jd_data = {
        "company_name": "TechCorp",
        "benefits": ["Bảo hiểm y tế"],
        # training_program, location, company_culture intentionally absent
    }
    result = extract_jd_fields(jd_data)
    assert result["company_name"] == "TechCorp"
    assert result["benefits"] == ["Bảo hiểm y tế"]
    assert result["training_program"] == []       # default fallback
    assert result["location"] == ""               # default fallback
    assert result["company_culture"] == ""        # default fallback
    assert result["required_skills"] == []        # default fallback


def test_tc18_nested_extracted_data_format():
    """TC18: JD in nested format with 'extracted_data' wrapper — nested takes priority."""
    jd_data = {
        "extracted_data": {
            "company_name": "Nested Corp",
            "benefits": ["Benefit từ nested", "Stock options"],
            "training_program": ["Nested training program"],
            "location": "Đà Nẵng",
        },
        # These top-level fields should be IGNORED when extracted_data exists
        "company_name": "Should NOT appear",
        "benefits": ["Should NOT appear"],
    }
    result = extract_jd_fields(jd_data)
    assert result["company_name"] == "Nested Corp"
    assert "Benefit từ nested" in result["benefits"]
    assert "Should NOT appear" not in result["benefits"]
    assert result["location"] == "Đà Nẵng"


def test_tc19_unicode_and_special_characters():
    """TC19: JD with Vietnamese unicode, special chars, and emoji-free text."""
    jd_data = {
        "company_name": "Công ty TNHH Phần Mềm Việt Á",
        "benefits": [
            "Lương trợ cấp đào tạo lên đến 21.000.000 VND/khóa",
            "Phụ cấp ăn trưa: 50.000đ/ngày",
            "Nghỉ phép 15 ngày/năm (có thể tích lũy)",
        ],
        "training_program": [
            "Chương trình đào tạo kỹ sư phần mềm cấp cao",
            "Hỗ trợ thi chứng chỉ AWS/GCP/Azure",
        ],
        "location": "Quận 1, TP. Hồ Chí Minh",
        "company_culture": "Văn hóa học hỏi liên tục, đề cao sự sáng tạo",
        "required_skills": ["Python", "FastAPI", "PostgreSQL"],
        "domain": ["Phần mềm doanh nghiệp"],
        "experience_level": "Mid-level",
    }
    result = extract_jd_fields(jd_data)
    assert result["company_name"] == "Công ty TNHH Phần Mềm Việt Á"
    assert "Lương trợ cấp đào tạo lên đến 21.000.000 VND/khóa" in result["benefits"]
    assert "Hỗ trợ thi chứng chỉ AWS/GCP/Azure" in result["training_program"]
    assert "Văn hóa học hỏi liên tục" in result["company_culture"]


def test_tc20_long_text_fields():
    """TC20: JD with long text in benefits and training_program entries."""
    long_benefit = "A" * 500  # 500-char benefit string
    long_training = "B" * 300  # 300-char training string
    jd_data = {
        "company_name": "LongText Inc",
        "benefits": [long_benefit, "Normal benefit"],
        "training_program": [long_training, "Normal training"],
        "location": "Hà Nội",
        "required_skills": ["Python"],
        "domain": ["SaaS"],
        "experience_level": "Senior",
    }
    result = extract_jd_fields(jd_data)
    assert result["company_name"] == "LongText Inc"
    assert result["benefits"][0] == long_benefit
    assert len(result["benefits"][0]) == 500
    assert result["training_program"][0] == long_training
    assert len(result["training_program"][0]) == 300
    assert len(result["benefits"]) == 2
    assert len(result["training_program"]) == 2
