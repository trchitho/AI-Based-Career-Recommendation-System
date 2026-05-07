#!/usr/bin/env python3
"""
Sửa column naming inconsistencies - phiên bản đơn giản
Chỉ sửa các file quan trọng nhất
"""

import os
import re
from pathlib import Path

def fix_file(file_path: Path) -> bool:
    """Sửa một file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        
        # Sửa các lỗi phổ biến nhất
        # career_ksas table: name_vi -> name_vn, description_vi -> description_vn
        content = re.sub(r'\bname_vi\b', 'name_vn', content)
        content = re.sub(r'\bdescription_vi\b', 'description_vn', content)
        
        # career_outlook table
        content = re.sub(r'\bsummary_md_vi\b', 'summary_md_vn', content)
        content = re.sub(r'\bgrowth_label_vi\b', 'growth_label_vn', content)
        content = re.sub(r'\bopenings_est_vi\b', 'openings_est_vn', content)
        
        # career_dwas table
        content = re.sub(r'\bdwa_title_vi\b', 'dwa_title_vn', content)
        
        # career_education_pct table
        content = re.sub(r'\belement_name_vi\b', 'element_name_vn', content)
        content = re.sub(r'\bcategory_description_vi\b', 'category_description_vn', content)
        
        if content != original:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
        
    except Exception as e:
        print(f"❌ Lỗi: {file_path}: {e}")
        return False

def main():
    """Main function"""
    print("🔧 Sửa column naming inconsistencies...")
    
    # Các file quan trọng cần sửa
    important_files = [
        "apps/backend/app/api/bff_career.py",
        "apps/backend/app/modules/careers/services.py",
        "apps/backend/app/modules/careers/services_enhanced.py",
        "apps/backend/app/modules/careers/routes.py",
        "apps/backend/app/modules/interview/services.py",
        "apps/backend/app/modules/interview/routes.py",
        "apps/backend/app/modules/nlp/service_nlp.py",
        "apps/backend/app/modules/nlp/routes_nlp.py"
    ]
    
    fixed_count = 0
    
    for file_path_str in important_files:
        file_path = Path(file_path_str)
        if file_path.exists():
            if fix_file(file_path):
                print(f"✅ Đã sửa: {file_path}")
                fixed_count += 1
            else:
                print(f"ℹ️  Không cần sửa: {file_path}")
        else:
            print(f"⚠️  File không tồn tại: {file_path}")
    
    print(f"\n📊 Đã sửa {fixed_count} files")
    
    if fixed_count > 0:
        print("🔄 Hãy restart backend server để áp dụng thay đổi")

if __name__ == "__main__":
    main()