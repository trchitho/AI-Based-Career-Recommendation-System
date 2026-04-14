#!/usr/bin/env python3
"""
🗺️ O*NET-ESCO MAPPING ANALYSIS - Phân tích mapping giữa O*NET-SOC và ESCO
Nhiệm vụ: Phân tích mối quan hệ 1-to-many giữa O*NET-SOC và ESCO codes
Input: ESCO_to_ONET-SOC.csv mapping file
Output: Analysis report và recommendation cho RCM system
Quá trình: Load mapping, analyze relationships, provide solutions

Analyze O*NET-SOC to ESCO mapping relationships for RCM system
"""

from collections import defaultdict
from pathlib import Path

import pandas as pd


def analyze_onet_esco_mapping():
    """Analyze the O*NET-SOC to ESCO mapping relationships"""
    print("=" * 80)
    print("🗺️ O*NET-SOC TO ESCO MAPPING ANALYSIS")
    print("=" * 80)

    # Load mapping file
    mapping_file = Path("data/raw/ESCO_to_ONET-SOC.csv")

    if not mapping_file.exists():
        print(f"❌ Mapping file not found: {mapping_file}")
        return

    print(f"📖 Loading mapping file: {mapping_file}")
    df = pd.read_csv(mapping_file)
    print(f"   Loaded {len(df)} mapping records")

    # Analyze the structure
    print("\n📋 MAPPING FILE STRUCTURE")
    print("-" * 50)
    print(f"Columns: {list(df.columns)}")
    print("Sample data:")
    print(df.head(3).to_string(index=False))

    # Analyze O*NET-SOC to ESCO relationships
    print("\n🔍 RELATIONSHIP ANALYSIS")
    print("-" * 50)

    # Group by O*NET-SOC code to see how many ESCO codes each maps to
    onet_to_esco = defaultdict(list)
    esco_to_onet = defaultdict(list)

    # Assuming columns are something like 'ONET_SOC_Code' and 'ESCO_Code'
    # Let's check actual column names first
    onet_col = None
    esco_col = None

    for col in df.columns:
        col_lower = col.lower()
        if "onet" in col_lower or "soc" in col_lower:
            onet_col = col
        elif "esco" in col_lower:
            esco_col = col

    if not onet_col or not esco_col:
        print("❌ Could not identify O*NET and ESCO columns")
        print(f"Available columns: {list(df.columns)}")
        return

    print(f"O*NET column: {onet_col}")
    print(f"ESCO column: {esco_col}")

    # Build mappings
    for _, row in df.iterrows():
        onet_code = str(row[onet_col]).strip()
        esco_code = str(row[esco_col]).strip()

        if pd.notna(onet_code) and pd.notna(esco_code):
            onet_to_esco[onet_code].append(esco_code)
            esco_to_onet[esco_code].append(onet_code)

    # Analyze relationships
    print("\n📊 MAPPING STATISTICS")
    print("-" * 50)

    total_onet_codes = len(onet_to_esco)
    total_esco_codes = len(esco_to_onet)

    print(f"Unique O*NET-SOC codes: {total_onet_codes:,}")
    print(f"Unique ESCO codes: {total_esco_codes:,}")
    print(f"Total mapping records: {len(df):,}")

    # Analyze O*NET to ESCO (1-to-many)
    onet_esco_counts = [len(esco_list) for esco_list in onet_to_esco.values()]
    avg_esco_per_onet = sum(onet_esco_counts) / len(onet_esco_counts)
    max_esco_per_onet = max(onet_esco_counts)

    print("\n🎯 O*NET-SOC → ESCO Relationships:")
    print(f"   Average ESCO codes per O*NET: {avg_esco_per_onet:.2f}")
    print(f"   Maximum ESCO codes per O*NET: {max_esco_per_onet}")

    # Show examples of 1-to-many relationships
    print("\n📋 EXAMPLES OF 1-TO-MANY RELATIONSHIPS:")
    print("-" * 50)

    # Find O*NET codes with most ESCO mappings
    sorted_onet = sorted(onet_to_esco.items(), key=lambda x: len(x[1]), reverse=True)

    for i, (onet_code, esco_list) in enumerate(sorted_onet[:5]):
        print(f"{i + 1}. O*NET {onet_code} → {len(esco_list)} ESCO codes:")
        for _j, esco_code in enumerate(esco_list[:3]):  # Show first 3
            print(f"      - {esco_code}")
        if len(esco_list) > 3:
            print(f"      ... and {len(esco_list) - 3} more")

    return onet_to_esco, esco_to_onet


def provide_rcm_solution():
    """Provide solution for RCM system mapping issue"""
    print("\n🎯 RCM SYSTEM MAPPING SOLUTION")
    print("=" * 80)

    print(
        """
🤔 VẤN ĐỀ: 
   Hệ thống RCM gợi ý 1 nghề với mã O*NET-SOC cố định
   Nhưng khi convert sang ESCO để lấy tên nghề, có nhiều mã ESCO tương ứng
   
💡 GIẢI PHÁP ĐỀ XUẤT:

1️⃣ STRATEGY 1: Primary ESCO Mapping (Recommended)
   - Tạo bảng mapping với 1 ESCO "primary" cho mỗi O*NET-SOC
   - Chọn ESCO code phổ biến nhất hoặc có độ tương đồng cao nhất
   - Lưu các ESCO alternatives như metadata
   
   Database schema:
   ```sql
   CREATE TABLE onet_esco_primary_mapping (
       onet_code VARCHAR(20) PRIMARY KEY,
       primary_esco_code VARCHAR(20) NOT NULL,
       primary_esco_title TEXT NOT NULL,
       alternative_esco_codes JSONB,  -- Array of alternatives
       confidence_score DECIMAL(3,2),
       created_at TIMESTAMP DEFAULT NOW()
   );
   ```

2️⃣ STRATEGY 2: Context-Based Selection
   - Dựa vào context của user (industry, skills, location) để chọn ESCO phù hợp
   - Sử dụng ML model để predict ESCO tốt nhất cho từng user
   
   Implementation:
   ```python
   def select_best_esco(onet_code, user_context):
       esco_options = get_esco_mappings(onet_code)
       
       # Score each ESCO based on user context
       scores = []
       for esco in esco_options:
           score = calculate_context_similarity(esco, user_context)
           scores.append((esco, score))
       
       # Return highest scoring ESCO
       return max(scores, key=lambda x: x[1])[0]
   ```

3️⃣ STRATEGY 3: Hybrid Approach (Best Practice)
   - Combine Strategy 1 + 2
   - Use primary mapping as default
   - Apply context-based selection when available
   - Fallback to primary if context matching fails
   
   ```python
   def get_career_title_for_rcm(onet_code, user_context=None):
       # Get primary ESCO mapping
       primary_esco = get_primary_esco_mapping(onet_code)
       
       if user_context:
           # Try context-based selection
           contextual_esco = select_best_esco(onet_code, user_context)
           if contextual_esco:
               return contextual_esco
       
       # Fallback to primary mapping
       return primary_esco
   ```

🎯 IMPLEMENTATION STEPS:

1. Analyze current O*NET-ESCO mappings
2. Create primary mapping table with most relevant ESCO for each O*NET
3. Implement context-based selection algorithm
4. Add fallback mechanism
5. Test with real user scenarios
6. Monitor and improve mapping quality

📊 EXPECTED BENEFITS:
   ✅ Consistent career titles for same O*NET code
   ✅ Personalized results based on user context  
   ✅ Robust fallback mechanism
   ✅ Easy to maintain and update
   ✅ Scalable for future enhancements
"""
    )


def main():
    print("🗺️ O*NET-ESCO MAPPING ANALYSIS FOR RCM SYSTEM")

    # Analyze current mappings (for reference)
    # mappings = analyze_onet_esco_mapping()

    # Provide RCM solution
    provide_rcm_solution()

    print("\n🎉 ANALYSIS COMPLETED")
    print("=" * 80)


if __name__ == "__main__":
    main()
