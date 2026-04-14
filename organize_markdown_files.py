#!/usr/bin/env python3
"""
Script tổ chức và dọn dẹp các file Markdown trong packages/ai-core
Author: Project Librarian & DevOps
Date: 2026-01-29
"""

import os
import shutil
from pathlib import Path

def organize_markdown_files():
    """Tổ chức các file Markdown theo quy tắc đã định"""
    
    ai_core_dir = Path("packages/ai-core")
    docs_dir = ai_core_dir / "docs"
    
    if not ai_core_dir.exists():
        print(f"❌ Thư mục {ai_core_dir} không tồn tại!")
        return
    
    print("📚 SCRIPT TỔ CHỨC FILE MARKDOWN")
    print("Author: Project Librarian & DevOps")
    print("Date: 2026-01-29")
    print("=" * 60)
    
    # Tạo thư mục docs nếu chưa có
    if not docs_dir.exists():
        docs_dir.mkdir(exist_ok=True)
        print(f"📁 Đã tạo thư mục: {docs_dir}")
    
    # Quét tất cả file .md trong thư mục ai-core (không recursive)
    md_files = []
    for file_path in ai_core_dir.iterdir():
        if file_path.is_file() and file_path.suffix.lower() == '.md':
            md_files.append(file_path.name)
    
    print(f"\n🔍 Tìm thấy {len(md_files)} file Markdown:")
    for i, filename in enumerate(sorted(md_files), 1):
        print(f"  {i:2d}. {filename}")
    
    # Phân loại file
    files_to_delete = []  # NHÓM 1: XÓA BỎ
    files_to_archive = []  # NHÓM 2: LƯU TRỮ
    
    # Từ khóa để xác định file cần xóa
    delete_keywords = [
        'SUMMARY', 'ANALYSIS', 'SESSION', 'REPORT'
    ]
    
    # Từ khóa để xác định file cần lưu trữ
    archive_keywords = [
        'README', 'COMPLETION', 'CLAUDE'
    ]
    
    for filename in md_files:
        filename_upper = filename.upper()
        
        # Kiểm tra file cần xóa
        should_delete = False
        for keyword in delete_keywords:
            if keyword in filename_upper:
                # Đặc biệt: không xóa file FINAL_REPORT nếu là kết quả cuối cùng
                if 'FINAL' in filename_upper and 'REPORT' in filename_upper:
                    continue
                should_delete = True
                break
        
        if should_delete:
            files_to_delete.append(filename)
            continue
        
        # Kiểm tra file cần lưu trữ
        should_archive = False
        for keyword in archive_keywords:
            if keyword in filename_upper:
                should_archive = True
                break
        
        # Các file quan trọng khác cần lưu trữ
        important_files = [
            'README_ETL.md',
            'CAREER_DETAILS_COMPLETION.md',
            'VIETNAMESE_LOCALIZATION_FINAL_REPORT.md',
            'FINAL_COMPLETION_SUMMARY.md',
            'FINAL_SUMMARY.md'
        ]
        
        if filename in important_files:
            should_archive = True
        
        if should_archive:
            files_to_archive.append(filename)
    
    # In danh sách file sẽ xóa
    print(f"\n🗑️  NHÓM 1: XÓA BỎ ({len(files_to_delete)} files)")
    print("-" * 60)
    if files_to_delete:
        for i, filename in enumerate(sorted(files_to_delete), 1):
            print(f"  {i:2d}. Deleting: {filename}")
    else:
        print("  (Không có file nào cần xóa)")
    
    # In danh sách file sẽ lưu trữ
    print(f"\n📁 NHÓM 2: LƯU TRỮ VÀO DOCS ({len(files_to_archive)} files)")
    print("-" * 60)
    if files_to_archive:
        for i, filename in enumerate(sorted(files_to_archive), 1):
            print(f"  {i:2d}. Moving to docs: {filename}")
    else:
        print("  (Không có file nào cần lưu trữ)")
    
    # Các file còn lại
    remaining_files = [f for f in md_files if f not in files_to_delete and f not in files_to_archive]
    if remaining_files:
        print(f"\n⚠️  CÁC FILE KHÁC ({len(remaining_files)} files)")
        print("-" * 60)
        for i, filename in enumerate(sorted(remaining_files), 1):
            print(f"  {i:2d}. Keeping in place: {filename}")
    
    print(f"\n⚠️  CHUẨN BỊ THỰC HIỆN...")
    
    # Thực hiện xóa file
    deleted_count = 0
    delete_errors = []
    
    for filename in files_to_delete:
        file_path = ai_core_dir / filename
        try:
            os.remove(file_path)
            deleted_count += 1
            print(f"🗑️  Deleted: {filename}")
        except Exception as e:
            delete_errors.append(f"❌ Lỗi xóa {filename}: {e}")
    
    # Thực hiện di chuyển file
    moved_count = 0
    move_errors = []
    
    for filename in files_to_archive:
        source_path = ai_core_dir / filename
        dest_path = docs_dir / filename
        try:
            # Kiểm tra nếu file đích đã tồn tại
            if dest_path.exists():
                print(f"⚠️  File {filename} đã tồn tại trong docs, ghi đè...")
                dest_path.unlink()
            
            shutil.move(str(source_path), str(dest_path))
            moved_count += 1
            print(f"📁 Moved to docs: {filename}")
        except Exception as e:
            move_errors.append(f"❌ Lỗi di chuyển {filename}: {e}")
    
    # Báo cáo kết quả
    print("\n" + "=" * 60)
    print(f"🎉 KẾT QUẢ TỔ CHỨC FILE MARKDOWN:")
    print(f"   🗑️  Đã xóa: {deleted_count} file")
    print(f"   📁 Đã di chuyển vào docs: {moved_count} file")
    print(f"   📄 Giữ nguyên: {len(remaining_files)} file")
    
    if delete_errors:
        print(f"   ❌ Lỗi xóa: {len(delete_errors)} file")
        for error in delete_errors:
            print(f"      {error}")
    
    if move_errors:
        print(f"   ❌ Lỗi di chuyển: {len(move_errors)} file")
        for error in move_errors:
            print(f"      {error}")
    
    print(f"\n✨ HOÀN THÀNH: Đã tổ chức {len(md_files)} file Markdown.")
    
    return deleted_count, moved_count, len(remaining_files)

if __name__ == "__main__":
    try:
        deleted, moved, remaining = organize_markdown_files()
        print(f"\n🚀 TỔNG KẾT: Xóa {deleted}, Di chuyển {moved}, Giữ lại {remaining} file.")
    except Exception as e:
        print(f"❌ LỖI: {e}")