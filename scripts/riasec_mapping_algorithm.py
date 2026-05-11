#!/usr/bin/env python3
"""
THUẬT TOÁN MAPPING RIASEC CHUẨN PRODUCTION
==========================================

Mục tiêu: Tạo mapping chính xác giữa careers và RIASEC labels
Dựa trên: Holland's RIASEC Theory và O*NET Interest Profiler

Thuật toán:
1. Lấy điểm RIASEC từ core.career_interests (R,I,A,S,E,C scores 0-1)
2. Áp dụng threshold khoa học để xác định dominant types
3. Tạo combinations theo thứ tự ưu tiên
4. Map với core.riasec_labels để lấy label_id

Tác giả: AI Assistant
Ngày: 2026-01-08
"""

import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from datetime import datetime
import json

# Thêm thư mục backend vào Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'apps', 'backend'))

class RIASECMappingAlgorithm:
    """
    Thuật toán mapping RIASEC chuẩn khoa học
    Dựa trên Holland's Theory và O*NET standards
    """
    
    def __init__(self):
        self.conn = None
        self.cursor = None
        
        # Cấu hình thuật toán theo chuẩn khoa học
        self.config = {
            # Threshold để xác định dominant type (dựa trên nghiên cứu Holland)
            'primary_threshold': 0.6,      # Điểm >= 0.6 được coi là dominant
            'secondary_threshold': 0.4,    # Điểm >= 0.4 được coi là secondary
            'tertiary_threshold': 0.3,     # Điểm >= 0.3 được coi là tertiary
            
            # Số lượng tối đa types trong combination
            'max_combination_length': 3,   # Tối đa 3 chữ cái (theo chuẩn Holland)
            
            # Trọng số ưu tiên (primary > secondary > tertiary)
            'weights': {
                'primary': 1.0,
                'secondary': 0.7,
                'tertiary': 0.4
            }
        }
        
        # Mapping RIASEC letters
        self.riasec_letters = ['R', 'I', 'A', 'S', 'E', 'C']
        
    def connect_database(self):
        """Kết nối database"""
        try:
            database_url = "postgresql://postgres:123456@localhost:5433/career_ai"
            print(f"🔗 Đang kết nối database...")
            
            self.conn = psycopg2.connect(database_url)
            self.conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            self.cursor = self.conn.cursor()
            
            print("✅ Kết nối database thành công!")
            return True
            
        except Exception as e:
            print(f"❌ Lỗi kết nối database: {e}")
            return False
    
    def load_riasec_labels(self):
        """Load tất cả RIASEC labels từ database"""
        try:
            self.cursor.execute("""
                SELECT id, code 
                FROM core.riasec_labels 
                ORDER BY LENGTH(code), code
            """)
            
            labels = {}
            for row in self.cursor.fetchall():
                labels[row[1]] = row[0]  # code -> id
            
            print(f"📋 Đã load {len(labels)} RIASEC labels")
            return labels
            
        except Exception as e:
            print(f"❌ Lỗi load RIASEC labels: {e}")
            return {}
    
    def load_career_interests(self):
        """Load career interests data"""
        try:
            self.cursor.execute("""
                SELECT ci.onet_code, ci.r, ci.i, ci.a, ci.s, ci.e, ci.c, c.id as career_id
                FROM core.career_interests ci
                JOIN core.careers c ON c.onet_code = ci.onet_code
                ORDER BY ci.onet_code
            """)
            
            interests = []
            for row in self.cursor.fetchall():
                interests.append({
                    'onet_code': row[0],
                    'career_id': row[7],
                    'scores': {
                        'R': float(row[1]),
                        'I': float(row[2]),
                        'A': float(row[3]),
                        'S': float(row[4]),
                        'E': float(row[5]),
                        'C': float(row[6])
                    }
                })
            
            print(f"📊 Đã load {len(interests)} career interests")
            return interests
            
        except Exception as e:
            print(f"❌ Lỗi load career interests: {e}")
            return []
    
    def calculate_riasec_profile(self, scores):
        """
        Tính toán RIASEC profile theo thuật toán khoa học
        
        Thuật toán:
        1. Sắp xếp scores theo thứ tự giảm dần
        2. Áp dụng threshold để phân loại primary/secondary/tertiary
        3. Tạo combinations theo độ ưu tiên (luôn ưu tiên điểm cao nhất)
        
        Args:
            scores (dict): Dictionary chứa điểm R,I,A,S,E,C
            
        Returns:
            list: Danh sách RIASEC codes theo thứ tự ưu tiên
        """
        
        # Bước 1: Sắp xếp theo điểm số (giảm dần)
        sorted_types = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        
        # Bước 2: Phân loại theo threshold
        primary_types = []
        secondary_types = []
        tertiary_types = []
        
        for riasec_type, score in sorted_types:
            if score >= self.config['primary_threshold']:
                primary_types.append((riasec_type, score))
            elif score >= self.config['secondary_threshold']:
                secondary_types.append((riasec_type, score))
            elif score >= self.config['tertiary_threshold']:
                tertiary_types.append((riasec_type, score))
        
        # Bước 3: Tạo combinations theo logic Holland (luôn theo thứ tự điểm số)
        combinations = []
        
        # Luôn có ít nhất 1 type (highest score)
        if sorted_types:
            combinations.append(sorted_types[0][0])
        
        # Thêm combinations 2 chữ cái (luôn lấy 2 điểm cao nhất)
        if len(sorted_types) >= 2:
            combinations.append(sorted_types[0][0] + sorted_types[1][0])
        
        # Thêm combinations 3 chữ cái (luôn lấy 3 điểm cao nhất)
        if len(sorted_types) >= 3:
            combinations.append(sorted_types[0][0] + sorted_types[1][0] + sorted_types[2][0])
        
        return combinations
    
    def validate_algorithm(self, sample_scores):
        """
        Validate thuật toán với test cases
        """
        print("\n🧪 VALIDATION: Kiểm tra thuật toán với test cases")
        
        test_cases = [
            {
                'name': 'Engineer Profile',
                'scores': {'R': 0.8, 'I': 0.9, 'A': 0.2, 'S': 0.3, 'E': 0.4, 'C': 0.1},
                'expected': ['I', 'IR', 'IRE']  # I(0.9), R(0.8), E(0.4) - 3 điểm cao nhất
            },
            {
                'name': 'Artist Profile', 
                'scores': {'R': 0.1, 'I': 0.3, 'A': 0.9, 'S': 0.6, 'E': 0.2, 'C': 0.1},
                'expected': ['A', 'AS', 'ASI']  # A(0.9), S(0.6), I(0.3) - 3 điểm cao nhất
            },
            {
                'name': 'Manager Profile',
                'scores': {'R': 0.2, 'I': 0.4, 'A': 0.3, 'S': 0.7, 'E': 0.8, 'C': 0.6},
                'expected': ['E', 'ES', 'ESC']  # E(0.8), S(0.7), C(0.6) - 3 điểm cao nhất
            }
        ]
        
        all_passed = True
        
        for test in test_cases:
            result = self.calculate_riasec_profile(test['scores'])
            passed = result == test['expected']
            
            print(f"  {'✅' if passed else '❌'} {test['name']}")
            print(f"    Input: {test['scores']}")
            print(f"    Expected: {test['expected']}")
            print(f"    Got: {result}")
            
            if not passed:
                all_passed = False
        
        return all_passed
    
    def clear_existing_mappings(self):
        """Xóa sạch dữ liệu cũ trong core.career_riasec_map"""
        try:
            # Đếm số dòng hiện tại
            self.cursor.execute("SELECT COUNT(*) FROM core.career_riasec_map")
            old_count = self.cursor.fetchone()[0]
            
            # Xóa sạch
            self.cursor.execute("DELETE FROM core.career_riasec_map")
            
            print(f"🗑️  Đã xóa {old_count:,} dòng cũ từ core.career_riasec_map")
            return True
            
        except Exception as e:
            print(f"❌ Lỗi xóa dữ liệu cũ: {e}")
            return False
    
    def generate_mappings(self, career_interests, riasec_labels):
        """
        Tạo mappings mới dựa trên thuật toán
        """
        mappings = []
        stats = {
            'total_careers': len(career_interests),
            'successful_mappings': 0,
            'failed_mappings': 0,
            'total_combinations': 0
        }
        
        print(f"\n🔄 Đang tạo mappings cho {len(career_interests)} careers...")
        
        for i, career in enumerate(career_interests):
            try:
                # Tính RIASEC profile
                combinations = self.calculate_riasec_profile(career['scores'])
                
                # Tạo mappings cho career này
                career_mappings = []
                for combo in combinations:
                    if combo in riasec_labels:
                        career_mappings.append({
                            'career_id': career['career_id'],
                            'label_id': riasec_labels[combo],
                            'onet_code': career['onet_code'],
                            'riasec_code': combo
                        })
                
                mappings.extend(career_mappings)
                stats['successful_mappings'] += 1
                stats['total_combinations'] += len(career_mappings)
                
                # Progress indicator
                if (i + 1) % 100 == 0:
                    print(f"  Đã xử lý {i + 1}/{len(career_interests)} careers...")
                
            except Exception as e:
                print(f"⚠️  Lỗi xử lý career {career['onet_code']}: {e}")
                stats['failed_mappings'] += 1
        
        print(f"\n📊 Thống kê tạo mappings:")
        print(f"  - Tổng careers: {stats['total_careers']:,}")
        print(f"  - Thành công: {stats['successful_mappings']:,}")
        print(f"  - Thất bại: {stats['failed_mappings']:,}")
        print(f"  - Tổng mappings: {stats['total_combinations']:,}")
        
        return mappings, stats
    
    def insert_mappings(self, mappings):
        """Insert mappings vào database"""
        try:
            print(f"\n💾 Đang insert {len(mappings):,} mappings vào database...")
            
            # Prepare data for batch insert
            insert_data = [(m['career_id'], m['label_id']) for m in mappings]
            
            # Batch insert
            self.cursor.executemany(
                "INSERT INTO core.career_riasec_map (career_id, label_id) VALUES (%s, %s)",
                insert_data
            )
            
            print(f"✅ Đã insert thành công {len(mappings):,} mappings")
            return True
            
        except Exception as e:
            print(f"❌ Lỗi insert mappings: {e}")
            return False
    
    def verify_results(self):
        """Verify kết quả sau khi insert"""
        try:
            print(f"\n🔍 VERIFICATION: Kiểm tra kết quả")
            
            # Đếm tổng mappings
            self.cursor.execute("SELECT COUNT(*) FROM core.career_riasec_map")
            total_mappings = self.cursor.fetchone()[0]
            
            # Đếm số careers có mappings
            self.cursor.execute("""
                SELECT COUNT(DISTINCT career_id) 
                FROM core.career_riasec_map
            """)
            careers_with_mappings = self.cursor.fetchone()[0]
            
            # Đếm tổng careers
            self.cursor.execute("SELECT COUNT(*) FROM core.careers")
            total_careers = self.cursor.fetchone()[0]
            
            # Thống kê theo số lượng mappings per career
            self.cursor.execute("""
                SELECT 
                    COUNT(label_id) as mapping_count,
                    COUNT(*) as career_count
                FROM core.career_riasec_map 
                GROUP BY career_id
                ORDER BY mapping_count
            """)
            
            mapping_distribution = {}
            for row in self.cursor.fetchall():
                mapping_count = row[0]
                career_count = row[1]
                if mapping_count not in mapping_distribution:
                    mapping_distribution[mapping_count] = 0
                mapping_distribution[mapping_count] += career_count
            
            print(f"  📊 Tổng mappings: {total_mappings:,}")
            print(f"  📊 Careers có mappings: {careers_with_mappings:,}/{total_careers:,}")
            print(f"  📊 Coverage: {careers_with_mappings/total_careers*100:.1f}%")
            
            print(f"\n  📈 Phân bố mappings per career:")
            for mapping_count, career_count in sorted(mapping_distribution.items()):
                print(f"    {mapping_count} mappings: {career_count:,} careers")
            
            # Kiểm tra sample mappings
            self.cursor.execute("""
                SELECT 
                    c.title_vi,
                    c.onet_code,
                    rl.code,
                    ci.r, ci.i, ci.a, ci.s, ci.e, ci.c
                FROM core.career_riasec_map crm
                JOIN core.careers c ON c.id = crm.career_id
                JOIN core.riasec_labels rl ON rl.id = crm.label_id
                JOIN core.career_interests ci ON ci.onet_code = c.onet_code
                ORDER BY c.title_vi
                LIMIT 5
            """)
            
            print(f"\n  🔍 Sample mappings:")
            for row in self.cursor.fetchall():
                title_vi, onet_code, riasec_code = row[0], row[1], row[2]
                scores = {'R': row[3], 'I': row[4], 'A': row[5], 'S': row[6], 'E': row[7], 'C': row[8]}
                print(f"    {title_vi[:40]:<40} | {onet_code} | {riasec_code} | {scores}")
            
            return True
            
        except Exception as e:
            print(f"❌ Lỗi verification: {e}")
            return False
    
    def run_algorithm(self):
        """Chạy toàn bộ thuật toán"""
        print("🚀 BẮT ĐẦU THUẬT TOÁN MAPPING RIASEC")
        print("=" * 60)
        
        try:
            # Bước 1: Kết nối database
            if not self.connect_database():
                return False
            
            # Bước 2: Validate thuật toán
            if not self.validate_algorithm({}):
                print("❌ Thuật toán validation failed!")
                return False
            
            print("✅ Thuật toán đã được validate thành công!")
            
            # Bước 3: Load dữ liệu
            print(f"\n📥 BƯỚC 1: Load dữ liệu từ database")
            riasec_labels = self.load_riasec_labels()
            career_interests = self.load_career_interests()
            
            if not riasec_labels or not career_interests:
                print("❌ Không thể load dữ liệu!")
                return False
            
            # Bước 4: Xóa dữ liệu cũ
            print(f"\n🗑️  BƯỚC 2: Xóa dữ liệu cũ")
            if not self.clear_existing_mappings():
                return False
            
            # Bước 5: Tạo mappings mới
            print(f"\n🔄 BƯỚC 3: Tạo mappings mới")
            mappings, stats = self.generate_mappings(career_interests, riasec_labels)
            
            if not mappings:
                print("❌ Không tạo được mappings!")
                return False
            
            # Bước 6: Insert vào database
            print(f"\n💾 BƯỚC 4: Insert vào database")
            if not self.insert_mappings(mappings):
                return False
            
            # Bước 7: Verify kết quả
            print(f"\n🔍 BƯỚC 5: Verify kết quả")
            if not self.verify_results():
                return False
            
            print(f"\n🎉 HOÀN THÀNH THUẬT TOÁN!")
            print(f"✅ Đã tạo thành công {len(mappings):,} RIASEC mappings")
            print(f"✅ Coverage: {stats['successful_mappings']}/{stats['total_careers']} careers")
            
            return True
            
        except Exception as e:
            print(f"❌ Lỗi không mong muốn: {e}")
            return False
            
        finally:
            if self.cursor:
                self.cursor.close()
            if self.conn:
                self.conn.close()
            print("🔌 Đã đóng kết nối database")

def main():
    """Hàm chính"""
    algorithm = RIASECMappingAlgorithm()
    success = algorithm.run_algorithm()
    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)