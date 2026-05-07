#!/usr/bin/env python3
"""
Fix column naming inconsistencies after Vietnamese translation
Thay đổi từ _vi thành _vn cho các cột trong career_ksas và các bảng khác
"""

import os
import re
from pathlib import Path

def fix_column_names_in_file(file_path: Path) -> bool:
    """Sửa tên cột trong một file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Mapping các cột cần thay đổi
        replacements = {
            # career_ksas table
            'name_vi': 'name_vn',
            'description_vi': 'description_vn',
            
            # career_outlook table  
            'summary_md_vi': 'summary_md_vn',
            'growth_label_vi': 'growth_label_vn',
            'openings_est_vi': 'openings_est_vn',
            
            # career_dwas table
            'dwa_title_vi': 'dwa_title_vn',
            
            # career_education_pct table
            'element_name_vi': 'element_name_vn',
            'category_description_vi': 'category_description_vn',
        }
        
        # Áp dụng các thay thế
        for old_col, new_col in replacements.items():
            # Thay thế trong SQL queries
            content = re.sub(rf'\b{old_col}\b', new_col, content)
            
            # Thay thế trong Python attribute access
            content = re.sub(rf'\.{old_col}\b', f'.{new_col}', content)
            
            # Thay thế trong dictionary keys
            content = re.sub(rf'["\'{old_col}["\']', f'"{new_col}"', content)
        
        # Kiểm tra xem có thay đổi gì không
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        
        return False
        
    except Exception as e:
        print(f"❌ Lỗi khi xử lý {file_path}: {e}")
        return False

def main():
    """Main function"""
    print("🔧 Bắt đầu sửa column naming inconsistencies...")
    
    # Các thư mục cần kiểm tra
    directories = [
        "apps/backend/app",
        "apps/backend/neo4j", 
        "packages/ai-core/scripts"
    ]
    
    total_files = 0
    fixed_files = 0
    
    for directory in directories:
        dir_path = Path(directory)
        if not dir_path.exists():
            print(f"⚠️  Thư mục không tồn tại: {directory}")
            continue
            
        print(f"\n📁 Đang kiểm tra: {directory}")
        
        # Tìm tất cả file Python
        for file_path in dir_path.rglob("*.py"):
            total_files += 1
            
            if fix_column_names_in_file(file_path):
                print(f"✅ Đã sửa: {file_path}")
                fixed_files += 1
    
    print(f"\n📊 KẾT QUẢ:")
    print(f"   Tổng số file kiểm tra: {total_files}")
    print(f"   Số file đã sửa: {fixed_files}")
    print(f"   Số file không cần sửa: {total_files - fixed_files}")
    
    if fixed_files > 0:
        print(f"\n✅ Đã sửa xong {fixed_files} files!")
        print("🔄 Hãy restart backend server để áp dụng thay đổi.")
    else:
        print("\nℹ️  Không có file nào cần sửa.")

if __name__ == "__main__":
    main()