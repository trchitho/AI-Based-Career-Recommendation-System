#!/usr/bin/env python3
"""
ETL Mapping Script: ESCO/ISCO to O*NET-SOC Crosswalk
Chiến lược ETL Mapping dựa trên pandas để xử lý file Crosswalk.
Giải quyết vấn đề Many-to-One (Nhiều mã O*NET thuộc về 1 mã ISCO) và làm sạch dữ liệu.
"""

import pandas as pd
import psycopg2
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Load environment variables
load_dotenv('../../apps/backend/.env')

def main():
    print("🔧 Bắt đầu ETL Mapping: ESCO/ISCO to O*NET-SOC...")
    
    # 1. Kết nối Database
    print("📊 Kết nối database...")
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        raise ValueError("DATABASE_URL not found in environment variables")
    
    engine = create_engine(database_url)
    
    # 2. Đọc file Crosswalk
    print("📋 Đọc file crosswalk...")
    crosswalk_file = "data/raw/ESCO_to_ONET-SOC.csv"
    
    try:
        # Đọc với delimiter ';' và dtype=str để giữ số 0 ở đầu mã
        df_crosswalk = pd.read_csv(
            crosswalk_file,
            delimiter=';',
            dtype=str,  # Đọc tất cả là string để giữ số 0 ở đầu mã (VD: 0110)
            encoding='utf-8'
        )
        print(f"✅ Đọc thành công {len(df_crosswalk)} dòng từ file crosswalk")
        
    except Exception as e:
        print(f"❌ Lỗi đọc file crosswalk: {e}")
        return
    
    # 3. Chuẩn hóa tên cột (Rename columns cho dễ làm việc)
    print("🔄 Chuẩn hóa tên cột...")
    
    # File gốc có format: "ESCO/ISCO Code", "ESCO/ISCO Title", "O*NET-SOC 2019 Code", "O*NET-SOC 2019 Title"
    df_crosswalk = df_crosswalk.rename(columns={
        "ESCO/ISCO Code": "isco_code",
        "ESCO/ISCO Title  ": "isco_title_en",  # Có space thừa trong header
        "O*NET-SOC 2019 Code": "onet_code", 
        "O*NET-SOC 2019 Title": "onet_title_en"
    })
    
    print(f"Columns after rename: {list(df_crosswalk.columns)}")
    
    # 4. Làm sạch dữ liệu
    print("🧹 Làm sạch dữ liệu...")
    
    # Số dòng ban đầu
    initial_count = len(df_crosswalk)
    
    # Loại bỏ các dòng trống
    df_crosswalk = df_crosswalk.dropna(subset=["onet_code", "isco_code"])
    print(f"   Sau khi loại bỏ dòng trống: {len(df_crosswalk)} dòng")
    
    # Loại bỏ khoảng trắng thừa
    df_crosswalk["onet_code"] = df_crosswalk["onet_code"].str.strip()
    df_crosswalk["isco_code"] = df_crosswalk["isco_code"].str.strip()
    df_crosswalk["isco_title_en"] = df_crosswalk["isco_title_en"].str.strip()
    df_crosswalk["onet_title_en"] = df_crosswalk["onet_title_en"].str.strip()
    
    # Loại bỏ các dòng có mã rỗng sau khi strip
    df_crosswalk = df_crosswalk[
        (df_crosswalk["onet_code"] != "") & 
        (df_crosswalk["isco_code"] != "")
    ]
    print(f"   Sau khi loại bỏ mã rỗng: {len(df_crosswalk)} dòng")
    
    # 5. Xử lý "All Other" (Tùy chọn chiến lược)
    print("🔍 Xử lý 'All Other' occupations...")
    
    # Đếm số nghề "All Other" (kết thúc bằng .99)
    all_other_count = len(df_crosswalk[df_crosswalk["onet_code"].str.endswith(".99")])
    print(f"   Tìm thấy {all_other_count} nghề 'All Other' (kết thúc bằng .99)")
    
    # Tùy chọn: Giữ lại "All Other" vì chúng ta đã xử lý chúng trong ETL pipeline trước
    # df_crosswalk = df_crosswalk[~df_crosswalk["onet_code"].str.endswith(".99")]
    print(f"   Giữ lại tất cả nghề (bao gồm 'All Other')")
    
    # 6. Phân tích Many-to-One mapping
    print("📈 Phân tích mapping relationships...")
    
    # Đếm số O*NET codes unique
    unique_onet = df_crosswalk["onet_code"].nunique()
    unique_isco = df_crosswalk["isco_code"].nunique()
    total_mappings = len(df_crosswalk)
    
    print(f"   Unique O*NET codes: {unique_onet}")
    print(f"   Unique ISCO codes: {unique_isco}")
    print(f"   Total mappings: {total_mappings}")
    print(f"   Avg O*NET per ISCO: {total_mappings/unique_isco:.1f}")
    
    # Tìm ISCO codes có nhiều O*NET mappings nhất
    isco_counts = df_crosswalk["isco_code"].value_counts().head(10)
    print(f"   Top ISCO codes với nhiều O*NET mappings nhất:")
    for isco_code, count in isco_counts.items():
        isco_title = df_crosswalk[df_crosswalk["isco_code"] == isco_code]["isco_title_en"].iloc[0]
        print(f"     {isco_code} ({isco_title}): {count} O*NET codes")
    
    # 7. Thêm cột metadata
    print("🏷️ Thêm metadata...")
    
    # Xác định match type
    df_crosswalk["match_type"] = "Direct"  # Tạm thời gán là khớp trực tiếp
    
    # Thêm source và timestamp
    df_crosswalk["source"] = "ESCO_Crosswalk_2019"
    df_crosswalk["created_at"] = pd.Timestamp.now()
    df_crosswalk["updated_at"] = pd.Timestamp.now()
    
    # 8. Kiểm tra dữ liệu với careers hiện có
    print("🔍 Kiểm tra với dữ liệu careers hiện có...")
    
    try:
        # Lấy danh sách O*NET codes từ database
        existing_careers = pd.read_sql(
            "SELECT onet_code, title_en FROM core.careers",
            engine
        )
        
        print(f"   Database có {len(existing_careers)} careers")
        
        # Kiểm tra coverage
        crosswalk_onets = set(df_crosswalk["onet_code"].unique())
        existing_onets = set(existing_careers["onet_code"].unique())
        
        matched_onets = crosswalk_onets.intersection(existing_onets)
        missing_in_crosswalk = existing_onets - crosswalk_onets
        missing_in_db = crosswalk_onets - existing_onets
        
        print(f"   Matched O*NET codes: {len(matched_onets)}")
        print(f"   Missing in crosswalk: {len(missing_in_crosswalk)}")
        print(f"   Missing in database: {len(missing_in_db)}")
        
        if len(missing_in_crosswalk) > 0:
            print(f"   Sample missing in crosswalk: {list(missing_in_crosswalk)[:5]}")
        
    except Exception as e:
        print(f"   Warning: Không thể kiểm tra với database: {e}")
    
    # 9. Tạo bảng career_mapping nếu chưa tồn tại
    print("🗃️ Tạo bảng career_mapping...")
    
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS core.career_mapping (
        id SERIAL PRIMARY KEY,
        onet_code VARCHAR(20) NOT NULL,
        isco_code VARCHAR(20) NOT NULL,
        isco_title_en TEXT,
        onet_title_en TEXT,
        match_type VARCHAR(50) DEFAULT 'Direct',
        source VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(onet_code, isco_code)
    );
    
    CREATE INDEX IF NOT EXISTS idx_career_mapping_onet 
    ON core.career_mapping(onet_code);
    
    CREATE INDEX IF NOT EXISTS idx_career_mapping_isco 
    ON core.career_mapping(isco_code);
    
    COMMENT ON TABLE core.career_mapping 
    IS 'Mapping between O*NET-SOC codes and ISCO-08 codes';
    """
    
    try:
        with engine.connect() as conn:
            conn.execute(text(create_table_sql))
            conn.commit()
        print("✅ Bảng career_mapping đã được tạo/cập nhật")
    except Exception as e:
        print(f"❌ Lỗi tạo bảng: {e}")
        return
    
    # 10. Nạp vào Database
    print("💾 Nạp dữ liệu vào database...")
    
    try:
        # Chọn các cột cần thiết
        columns_to_insert = [
            "onet_code", "isco_code", "isco_title_en", "onet_title_en", 
            "match_type", "source", "created_at", "updated_at"
        ]
        
        # Xóa dữ liệu cũ trước khi insert
        with engine.connect() as conn:
            conn.execute(text("DELETE FROM core.career_mapping WHERE source = 'ESCO_Crosswalk_2019'"))
            conn.commit()
        
        # Insert dữ liệu mới
        df_crosswalk[columns_to_insert].to_sql(
            name="career_mapping",
            schema="core", 
            con=engine,
            if_exists="append",  # Append vì đã xóa dữ liệu cũ
            index=False,
            method='multi'  # Faster bulk insert
        )
        
        print(f"✅ Đã nạp thành công {len(df_crosswalk)} dòng mapping.")
        
    except Exception as e:
        print(f"❌ Lỗi nạp mapping: {e}")
        return
    
    # 11. Kiểm tra kết quả
    print("📋 Kiểm tra kết quả...")
    
    try:
        with engine.connect() as conn:
            # Đếm tổng số mappings
            result = conn.execute(text("SELECT COUNT(*) FROM core.career_mapping"))
            total_count = result.fetchone()[0]
            print(f"   Total mappings in database: {total_count}")
            
            # Sample data
            result = conn.execute(text("""
                SELECT onet_code, isco_code, isco_title_en, onet_title_en 
                FROM core.career_mapping 
                ORDER BY isco_code, onet_code 
                LIMIT 10
            """))
            
            print("   Sample mappings:")
            for row in result:
                print(f"     O*NET: {row[0]} ({row[3]}) → ISCO: {row[1]} ({row[2]})")
                
    except Exception as e:
        print(f"❌ Lỗi kiểm tra kết quả: {e}")
    
    print(f"\n🎉 ETL Mapping hoàn thành!")
    print(f"Database của bạn giờ đây đã có bảng career_mapping chứa:")
    print(f"● onet_code: Mã O*NET-SOC (VD: 13-2011.01 - Accountants)")
    print(f"● isco_code: Mã ISCO-08 (VD: 2411)")
    print(f"● isco_title_en: Tên nghề ISCO (VD: Accountants)")
    print(f"Bảng này sẽ là chìa khóa để mapping dữ liệu lương và kỹ năng từ ESCO!")

if __name__ == "__main__":
    main()