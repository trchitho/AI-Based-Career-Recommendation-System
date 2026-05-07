#!/usr/bin/env python3
"""
Script sửa tất cả các tên cột database đã thay đổi sau khi dịch sang tiếng Việt
Từ _vn thành _vi để phù hợp với schema mới
"""
import os
import re
from pathlib import Path

def fix_column_names_in_file(file_path):
    """Sửa tên cột trong một file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Mapping các cột cần sửa
        column_mappings = {
            'short_desc_vn': 'short_desc_vi',
            'title_vn': 'title_vi',
            'task_vn': 'task_vi',
            'name_vn': 'name_vi',
            'description_vn': 'description_vi',
            'category_vn': 'category_vi',
            'summary_md_vn': 'summary_md_vi',
            'growth_label_vn': 'growth_label_vi',
            'openings_est_vn': 'openings_est_vi',
            'element_name_vn': 'element_name_vi',
            'category_description_vn': 'category_description_vi',
            'dwa_title_vn': 'dwa_title_vi',
            'experience_text_vn': 'experience_text_vi',
            'degree_text_vn': 'degree_text_vi',
            'education_summary_vn': 'education_summary_vi',
            'experience_summary_vn': 'experience_summary_vi',
            'domain_source_vn': 'domain_source_vi',
            'commodity_title_vn': 'commodity_title_vi',
            'example_vn': 'example_vi',
            # Thêm mapping cho các cột đã đổi từ name -> name_en/name_vn
            '"name", "name_vi"': '"name_en", "name_vn"',
            '(name, name_vi)': '(name_en, name_vn)',
            'COALESCE(name, name_vi)': 'COALESCE(name_en, name_vn)',
            '"description", "description_vi"': '"description_en", "description_vn"',
            '(description, description_vi)': '(description_en, description_vn)',
            'COALESCE(description, description_vi)': 'COALESCE(description_en, description_vn)'
        }
        
        # Sửa từng mapping
        changes_made = []
        for old_col, new_col in column_mappings.items():
            if old_col in content:
                content = content.replace(old_col, new_col)
                changes_made.append(f"{old_col} -> {new_col}")
        
        # Ghi lại file nếu có thay đổi
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return changes_made
        
        return []
        
    except Exception as e:
        print(f"❌ Lỗi xử lý file {file_path}: {e}")
        return []

def main():
    print("🔧 FIXING COLUMN NAMES AFTER VIETNAMESE TRANSLATION")
    print("=" * 60)
    
    # Các thư mục cần kiểm tra
    directories_to_check = [
        "apps/backend/app",
        "packages/ai-core"
    ]
    
    # Các extension file cần kiểm tra
    file_extensions = ['.py', '.sql']
    
    total_files_checked = 0
    total_files_changed = 0
    total_changes = 0
    
    for directory in directories_to_check:
        if not os.path.exists(directory):
            print(f"⚠️  Thư mục không tồn tại: {directory}")
            continue
            
        print(f"\n📁 Kiểm tra thư mục: {directory}")
        
        # Duyệt tất cả file trong thư mục
        for root, dirs, files in os.walk(directory):
            for file in files:
                file_path = os.path.join(root, file)
                
                # Chỉ xử lý file có extension phù hợp
                if any(file.endswith(ext) for ext in file_extensions):
                    total_files_checked += 1
                    
                    changes = fix_column_names_in_file(file_path)
                    if changes:
                        total_files_changed += 1
                        total_changes += len(changes)
                        print(f"  ✅ {file_path}")
                        for change in changes:
                            print(f"     - {change}")
    
    print(f"\n" + "=" * 60)
    print("📊 KẾT QUẢ:")
    print(f"   - Files đã kiểm tra: {total_files_checked:,}")
    print(f"   - Files đã sửa: {total_files_changed:,}")
    print(f"   - Tổng số thay đổi: {total_changes:,}")
    
    if total_changes > 0:
        print("🎉 Đã sửa xong tất cả tên cột!")
    else:
        print("✅ Không có tên cột nào cần sửa!")

if __name__ == '__main__':
    main()