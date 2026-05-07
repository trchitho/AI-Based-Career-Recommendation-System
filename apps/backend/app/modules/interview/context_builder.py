"""
Context Builder - Xây dựng context cho phỏng vấn từ nhiều nguồn
Merge thông tin từ Neo4j, JD, và Career Level
"""

import time
from typing import Dict, List, Optional


def build_interview_context(career_context: Dict, jd_data: Optional[Dict] = None, level_context: Optional[Dict] = None) -> Dict:
    """
    Xây dựng context tổng hợp cho phỏng vấn
    Priority: Level > JD > Career (Neo4j/PostgreSQL)
    
    CRITICAL FIX: Đảm bảo AI HR có thể đọc được context
    """
    # Base context từ career với validation
    context = {
        "onet_code": career_context.get("onet_code", ""),
        "title": career_context.get("title", "Unknown Position"),
        "skills": career_context.get("skills", []),
        "effective_level": "junior",  # default
        "has_jd": False,
        "has_level": False,
        "context_quality": "basic",  # Track context completeness
        "ai_readable": True,  # Flag for AI readability
        "debug_info": {  # Add debug info for AI HR
            "context_build_time": time.time(),
            "sources_processed": [],
            "validation_passed": True
        }
    }
    
    # CRITICAL: Validate and clean skills data for AI readability
    validated_skills = []
    for skill in context["skills"]:
        if isinstance(skill, dict) and skill.get("skill_name"):
            # Ensure all required fields exist
            validated_skill = {
                "skill_name": str(skill.get("skill_name", "")).strip(),
                "skill_type": str(skill.get("skill_type", "General")).strip(),
                "importance": float(skill.get("importance", 3.0)),
                "level": float(skill.get("level", 3.0)),
                "source": str(skill.get("source", "career")).strip(),
                "is_hard_skill": bool(skill.get("is_hard_skill", False))
            }
            # Only add if skill name is meaningful
            if len(validated_skill["skill_name"]) > 2:
                validated_skills.append(validated_skill)
    
    context["skills"] = validated_skills
    context["debug_info"]["sources_processed"].append("career")
    print(f"✅ AI Context: Validated {len(validated_skills)} skills for AI readability")
    
    # Merge JD data nếu có
    if jd_data and isinstance(jd_data, dict):
        context["has_jd"] = True
        context["jd_data"] = jd_data
        context["context_quality"] = "enhanced"
        context["debug_info"]["sources_processed"].append("jd")
        
        print(f"🔍 AI Context: Processing JD data with {len(jd_data.get('required_skills', []))} required skills")
        
        # Separate soft and hard skills
        existing_soft_skills = [s for s in validated_skills if not s.get("is_hard_skill", False)]
        print(f"🔍 AI Context: Found {len(existing_soft_skills)} soft skills to preserve")
        
        # Build JD skills with proper validation
        jd_skills = []
        
        # 1. Required skills (kỹ năng chuyên môn)
        for skill in jd_data.get("required_skills", [])[:8]:
            if skill and isinstance(skill, str) and len(skill.strip()) > 2:
                jd_skills.append({
                    "skill_name": skill.strip(),
                    "skill_type": "JD Requirement",
                    "importance": 4.5,
                    "level": 4.0,
                    "source": "jd",
                    "is_hard_skill": True
                })
                
        # 2. Tools (công cụ/framework)
        for tool in jd_data.get("tools", [])[:5]:
            if tool and isinstance(tool, str) and len(tool.strip()) > 2:
                # Avoid duplicates
                if not any(s["skill_name"].lower() == tool.lower() for s in jd_skills):
                    jd_skills.append({
                        "skill_name": tool.strip(),
                        "skill_type": "JD Tool",
                        "importance": 4.0,
                        "level": 4.0,
                        "source": "jd",
                        "is_hard_skill": True
                    })
        
        # 3. Qualifications (bằng cấp/chứng chỉ)
        for qual in jd_data.get("qualifications", [])[:3]:
            if qual and isinstance(qual, str) and len(qual.strip()) > 10:
                # Avoid duplicates
                if not any(s["skill_name"].lower() == qual.lower() for s in jd_skills):
                    jd_skills.append({
                        "skill_name": qual.strip(),
                        "skill_type": "JD Qualification",
                        "importance": 4.2,
                        "level": 4.0,
                        "source": "jd",
                        "is_hard_skill": True
                    })
        
        # Combine skills: soft skills (max 5) + JD hard skills
        soft_skills_limited = existing_soft_skills[:5]
        context["skills"] = soft_skills_limited + jd_skills
        
        print(f"✅ AI Context: Final skills = {len(soft_skills_limited)} soft + {len(jd_skills)} JD hard = {len(context['skills'])} total")
        
        # Extract JD level with validation
        jd_level = str(jd_data.get("experience_level", "")).lower().strip()
        valid_levels = ["fresher", "junior", "middle", "senior", "lead"]
        if jd_level in valid_levels:
            context["jd_suggested_level"] = jd_level
            if not context.get("has_level"):
                context["effective_level"] = jd_level
                print(f"✅ AI Context: Set effective level from JD: {jd_level}")
        
        # Add other JD info with validation
        context["jd_responsibilities"] = [r for r in jd_data.get("responsibilities", []) if r and isinstance(r, str)][:5]
        context["jd_tools"] = [t for t in jd_data.get("tools", []) if t and isinstance(t, str)][:8]
        context["jd_domain"] = str(jd_data.get("domain", "")).strip()
    
    # Merge Level context nếu có (override JD level)
    if level_context and isinstance(level_context, dict):
        context["has_level"] = True
        context["level_context"] = level_context
        context["context_quality"] = "premium"
        context["debug_info"]["sources_processed"].append("level")
        
        # Validate level data
        level_name = str(level_context.get("name", "junior")).lower().strip()
        if level_name in ["fresher", "junior", "middle", "senior", "lead"]:
            context["effective_level"] = level_name
            print(f"✅ AI Context: Set effective level from user selection: {level_name}")
        
        context["level_description"] = str(level_context.get("focus", "")).strip()
        context["experience_range"] = str(level_context.get("experience", "")).strip()
        
        # Handle focus areas
        focus_text = str(level_context.get("focus", "")).strip()
        context["interview_focus"] = [f.strip() for f in focus_text.split(", ") if f.strip()] if focus_text else []
    
    # Final validation and AI optimization
    if not context["skills"]:
        print("⚠️ AI Context: No skills found, adding default skills")
        context["skills"] = [{
            "skill_name": "Communication",
            "skill_type": "Soft Skill",
            "importance": 4.0,
            "level": 3.0,
            "source": "default",
            "is_hard_skill": False
        }]
        context["ai_readable"] = False
        context["debug_info"]["validation_passed"] = False
    
    # Limit total skills for AI processing efficiency
    if len(context["skills"]) > 15:
        context["skills"] = context["skills"][:15]
        print(f"⚠️ AI Context: Limited skills to 15 for AI processing efficiency")
    
    # Add AI-specific metadata with enhanced debugging
    context["ai_metadata"] = {
        "total_skills": len(context["skills"]),
        "hard_skills": len([s for s in context["skills"] if s.get("is_hard_skill", False)]),
        "soft_skills": len([s for s in context["skills"] if not s.get("is_hard_skill", False)]),
        "context_sources": [s for s in context["debug_info"]["sources_processed"] if s],
        "readability_score": 1.0 if context["ai_readable"] else 0.5,
        "skill_distribution": {
            "career": len([s for s in context["skills"] if s.get("source") == "career"]),
            "jd": len([s for s in context["skills"] if s.get("source") == "jd"]),
            "default": len([s for s in context["skills"] if s.get("source") == "default"])
        }
    }
    
    # CRITICAL: Add AI-readable summary for better context understanding
    context["ai_summary"] = {
        "position": context["title"],
        "level": context["effective_level"],
        "key_skills": [s["skill_name"] for s in context["skills"][:8]],  # Top 8 skills
        "context_type": context["context_quality"],
        "has_jd_data": context["has_jd"],
        "has_level_data": context["has_level"],
        "total_context_items": len(context["skills"]) + (1 if context["has_jd"] else 0) + (1 if context["has_level"] else 0)
    }
    
    print(f"✅ AI Context Built: {context['context_quality']} quality, {context['ai_metadata']['total_skills']} skills, level={context['effective_level']}")
    print(f"🤖 AI Summary: {context['ai_summary']['position']} ({context['ai_summary']['level']}) with {len(context['ai_summary']['key_skills'])} key skills")
    
    return context


def extract_jd_questions_context(jd_data: Dict) -> Dict:
    """Trích xuất context để tạo câu hỏi JD"""
    return {
        "required_skills": jd_data.get("required_skills", [])[:5],
        "tools": jd_data.get("tools", [])[:3],
        "responsibilities": jd_data.get("responsibilities", [])[:3],
        "experience_level": jd_data.get("experience_level", "Junior"),
        "domain": jd_data.get("domain", ""),
        "training_program": jd_data.get("training_program", [])
    }


def get_level_difficulty_context(level_slug: str) -> Dict:
    """Lấy thông tin độ khó theo level"""
    level_configs = {
        "fresher": {
            "difficulty_score": 1,
            "question_complexity": "cơ bản",
            "focus_areas": ["kiến thức nền tảng", "thái độ học hỏi", "tiềm năng"],
            "avoid_topics": ["kiến trúc phức tạp", "quản lý team", "quyết định chiến lược"]
        },
        "junior": {
            "difficulty_score": 2,
            "question_complexity": "trung bình",
            "focus_areas": ["kỹ năng thực hành", "kinh nghiệm dự án", "làm việc nhóm"],
            "avoid_topics": ["thiết kế hệ thống lớn", "mentoring", "leadership"]
        },
        "middle": {
            "difficulty_score": 3,
            "question_complexity": "trung bình khá",
            "focus_areas": ["giải quyết vấn đề", "thiết kế", "mentoring junior"],
            "avoid_topics": ["chiến lược công ty", "quản lý nhiều team"]
        },
        "senior": {
            "difficulty_score": 4,
            "question_complexity": "khó",
            "focus_areas": ["kiến trúc hệ thống", "leadership", "ra quyết định"],
            "avoid_topics": []
        },
        "lead": {
            "difficulty_score": 5,
            "question_complexity": "rất khó",
            "focus_areas": ["quản lý team", "chiến lược", "mentoring nhiều người"],
            "avoid_topics": []
        }
    }
    
    return level_configs.get(level_slug.lower(), level_configs["junior"])