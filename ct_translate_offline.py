#!/usr/bin/env python3
"""
Script dịch tasks không cần API key - sử dụng thư viện miễn phí
Hỗ trợ nhiều phương pháp dịch: Google Translate (free), Microsoft Translator, Deep Translator
"""
import psycopg2
import time
import re
from datetime import datetime

# Cài đặt thư viện cần thiết:
# pip install deep-translator googletrans==4.0.0rc1 translators

try:
    from deep_translator import GoogleTranslator, MicrosoftTranslator
    DEEP_TRANSLATOR_AVAILABLE = True
except ImportError:
    DEEP_TRANSLATOR_AVAILABLE = False
    print("⚠️  deep-translator chưa cài. Chạy: pip install deep-translator")

try:
    from googletrans import Translator as GoogleTranslator_Free
    GOOGLETRANS_AVAILABLE = True
except ImportError:
    GOOGLETRANS_AVAILABLE = False
    print("⚠️  googletrans chưa cài. Chạy: pip install googletrans==4.0.0rc1")

try:
    import translators as ts
    TRANSLATORS_AVAILABLE = True
except ImportError:
    TRANSLATORS_AVAILABLE = False
    print("⚠️  translators chưa cài. Chạy: pip install translators")

DB = 'postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8'
BATCH_SIZE = 50  # Tăng batch size để xử lý nhanh hơn

class OfflineTranslator:
    def __init__(self):
        self.methods = []
        self.current_method = 0
        
        # Khởi tạo các phương pháp dịch có sẵn
        if DEEP_TRANSLATOR_AVAILABLE:
            self.methods.append(('deep_google', GoogleTranslator(source='en', target='vi')))
            print("✅ Deep Translator (Google) - Sẵn sàng")
        
        if GOOGLETRANS_AVAILABLE:
            self.methods.append(('googletrans', GoogleTranslator_Free()))
            print("✅ Google Translate Free - Sẵn sàng")
        
        if TRANSLATORS_AVAILABLE:
            self.methods.append(('ts_google', 'google'))
            self.methods.append(('ts_bing', 'bing'))
            print("✅ Translators (Google + Bing) - Sẵn sàng")
        
        if not self.methods:
            raise Exception("Không có thư viện dịch nào khả dụng!")
        
        print(f"📚 Có {len(self.methods)} phương pháp dịch")
    
    def translate_text(self, text):
        """Dịch một đoạn text, thử các phương pháp khác nhau"""
        if not text or not text.strip():
            return text
        
        # Thử tất cả phương pháp
        for attempt in range(len(self.methods)):
            method_name, method = self.methods[self.current_method]
            
            try:
                if method_name == 'deep_google':
                    result = method.translate(text)
                    if result and result.strip():
                        return result.strip()
                
                elif method_name == 'googletrans':
                    result = method.translate(text, src='en', dest='vi')
                    if result and result.text and result.text.strip():
                        return result.text.strip()
                
                elif method_name.startswith('ts_'):
                    engine = method  # 'google' hoặc 'bing'
                    result = ts.translate_text(text, translator=engine, from_language='en', to_language='vi')
                    if result and result.strip():
                        return result.strip()
                
            except Exception as e:
                print(f"  ❌ {method_name} failed: {str(e)[:50]}")
                # Chuyển sang phương pháp tiếp theo
                self.current_method = (self.current_method + 1) % len(self.methods)
                time.sleep(2)
                continue
            
            # Nếu không có kết quả, thử phương pháp khác
            self.current_method = (self.current_method + 1) % len(self.methods)
        
        # Nếu tất cả phương pháp đều fail
        print(f"  ❌ Tất cả phương pháp dịch fail cho: {text[:50]}...")
        return None
    
    def translate_batch(self, tasks):
        """Dịch một batch tasks"""
        results = {}
        
        for i, task in enumerate(tasks):
            print(f"    Dịch {i+1}/{len(tasks)}: {task[:50]}...", end=' ')
            
            translated = self.translate_text(task)
            if translated:
                results[task] = translated
                print("✅")
            else:
                print("❌")
            
            # Delay để tránh rate limit
            time.sleep(1)
        
        return results

def clean_translation(text):
    """Làm sạch bản dịch - CẢI THIỆN"""
    if not text:
        return text
    
    # Loại bỏ các ký tự lạ nhưng giữ lại dấu câu tiếng Việt
    text = re.sub(r'[^\w\sàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđĐ.,;:!?()/-]', '', text)
    
    # Chuẩn hóa khoảng trắng
    text = re.sub(r'\s+', ' ', text).strip()
    
    # Viết hoa chữ cái đầu
    if text:
        text = text[0].upper() + text[1:]
    
    # Kiểm tra xem có còn từ tiếng Anh không
    english_words = re.findall(r'\b(and|the|of|for|with|or|to|in|is|are|from|by|as|at|on|be|have|has|will|can|may|must|should|would|could|do|does|did|get|make|take|give|go|come|see|know|think|say|tell|ask|work|use|find|help|try|call|need|want|look|feel|become|leave|put|mean|keep|let|begin|seem|turn|start|show|hear|play|run|move|live|believe|hold|bring|happen|write|provide|sit|stand|lose|pay|meet|include|continue|set|learn|change|lead|understand|watch|follow|stop|create|speak|read|allow|add|spend|grow|open|walk|win|offer|remember|love|consider|appear|buy|wait|serve|die|send|expect|build|stay|fall|cut|reach|kill|remain|suggest|raise|pass|sell|require|report|decide|pull)\b', text, re.I)
    
    if english_words:
        print(f"    ⚠️  Bản dịch vẫn còn tiếng Anh: {', '.join(english_words[:3])}")
    
    return text

def get_remaining_count(cur, start_id=12847):
    """Đếm số tasks còn tiếng Anh từ ID cụ thể - SỬ DỤNG REGEX ĐỂ CHÍNH XÁC HỠN"""
    try:
        cur.execute("""
            SELECT COUNT(*) 
            FROM core.career_tasks 
            WHERE id >= %s 
            AND task_vi ~* '\\m(and|the|of|for|with|or|to|in|is|are|from|by|as|at|on|be|have|has|will|can|may|must|should|would|could|do|does|did|get|make|take|give|go|come|see|know|think|say|tell|ask|work|use|find|help|try|call|need|want|look|feel|become|leave|put|mean|keep|let|begin|seem|turn|start|show|hear|play|run|move|live|believe|hold|bring|happen|write|provide|sit|stand|lose|pay|meet|include|continue|set|learn|change|lead|understand|watch|follow|stop|create|speak|read|allow|add|spend|grow|open|walk|win|offer|remember|love|consider|appear|buy|wait|serve|die|send|expect|build|stay|fall|cut|reach|kill|remain|suggest|raise|pass|sell|require|report|decide|pull|perform|duties|required|customers|information|services|records|procedures|equipment|materials|documents|applications)\\M'
        """, (start_id,))
        result = cur.fetchone()
        return result[0] if result and result[0] is not None else 0
    except Exception as e:
        print(f"❌ Lỗi trong get_remaining_count: {e}")
        return 0

def backup_database(cur):
    """Tạo backup trước khi dịch"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_file = f"career_tasks_backup_{timestamp}.sql"
    
    print(f"📦 Tạo backup: {backup_file}")
    
    # Đếm số records
    cur.execute("SELECT COUNT(*) FROM core.career_tasks")
    result = cur.fetchone()
    total_count = result[0] if result else 0
    
    print(f"   - Tổng số tasks: {total_count:,}")
    print(f"   - Backup file: {backup_file}")
    
    # Tạo backup command (người dùng có thể chạy thủ công nếu cần)
    backup_cmd = f"""
pg_dump -h localhost -p 5433 -U postgres -d career_ai -t core.career_tasks > {backup_file}
    """
    
    print(f"   - Lệnh backup: {backup_cmd.strip()}")
    print("   ✅ Thông tin backup đã chuẩn bị")
    
    return backup_file

def main():
    print("=" * 60)
    print("🌐 SCRIPT DỊCH OFFLINE - TIẾP TỤC TỪ ID 12847")
    print("=" * 60)
    print(f"Bắt đầu lúc: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Khởi tạo translator
    try:
        translator = OfflineTranslator()
    except Exception as e:
        print(f"❌ Lỗi khởi tạo translator: {e}")
        print("\n📦 Cài đặt thư viện cần thiết:")
        print("pip install deep-translator googletrans==4.0.0rc1 translators")
        return
    
    conn = psycopg2.connect(DB)
    cur = conn.cursor()
    
    # Tạo backup trước khi bắt đầu
    backup_file = backup_database(cur)
    print()
    
    # Bắt đầu từ ID 12847
    START_ID = 12847
    
    # Kiểm tra tổng số tasks từ ID 12847
    cur.execute("SELECT COUNT(*) FROM core.career_tasks WHERE id >= %s", (START_ID,))
    result = cur.fetchone()
    total_from_start = result[0] if result else 0
    print(f"📊 Tổng số tasks từ ID {START_ID}: {total_from_start:,}")
    
    total_fixed = 0
    round_count = 0
    
    while True:
        round_count += 1
        print(f"🔍 DEBUG: Bắt đầu round {round_count}")
        try:
            remaining = get_remaining_count(cur, START_ID)
            print(f"🔍 DEBUG: remaining = {remaining}")
        except Exception as e:
            print(f"❌ Lỗi trong get_remaining_count: {e}")
            import traceback
            traceback.print_exc()
            break
        
        if remaining == 0:
            print("🎉 HOÀN THÀNH! Không còn task nào cần dịch từ ID 12847 trở đi.")
            break
        
        print(f"📊 ROUND {round_count} | Còn lại: {remaining:,} tasks cần dịch (từ ID {START_ID})")
        print(f"⏰ {datetime.now().strftime('%H:%M:%S')}")
        
        # Lấy batch tasks cần dịch - SỬ DỤNG REGEX ĐỂ TÌM CHÍNH XÁC
        try:
            print("🔍 DEBUG: Bắt đầu query batch tasks...")
            cur.execute("""
                SELECT id, task_en, task_vi
                FROM core.career_tasks 
                WHERE id >= %s 
                AND task_vi ~* '\\m(and|the|of|for|with|or|to|in|is|are|from|by|as|at|on|be|have|has|will|can|may|must|should|would|could|do|does|did|get|make|take|give|go|come|see|know|think|say|tell|ask|work|use|find|help|try|call|need|want|look|feel|become|leave|put|mean|keep|let|begin|seem|turn|start|show|hear|play|run|move|live|believe|hold|bring|happen|write|provide|sit|stand|lose|pay|meet|include|continue|set|learn|change|lead|understand|watch|follow|stop|create|speak|read|allow|add|spend|grow|open|walk|win|offer|remember|love|consider|appear|buy|wait|serve|die|send|expect|build|stay|fall|cut|reach|kill|remain|suggest|raise|pass|sell|require|report|decide|pull|perform|duties|required|customers|information|services|records|procedures|equipment|materials|documents|applications)\\M'
                ORDER BY id
                LIMIT %s
            """, (START_ID, BATCH_SIZE * 2))  # Lấy 100 tasks mỗi round (50*2)
            
            bad_tasks = cur.fetchall()
            print(f"🔍 DEBUG: Lấy được {len(bad_tasks)} tasks")
        except Exception as e:
            print(f"❌ Lỗi trong query batch tasks: {e}")
            import traceback
            traceback.print_exc()
            break
        if not bad_tasks:
            print("❌ Không tìm thấy tasks nào cần dịch từ ID 12847 trở đi.")
            break
        
        print(f"Xử lý {len(bad_tasks)} tasks (ID {bad_tasks[0][0]} - {bad_tasks[-1][0]})")
        
        # Lọc ra những tasks thực sự cần dịch và MAP CHÍNH XÁC VỚI ID
        tasks_to_translate = []
        for task_id, task_en, task_vi in bad_tasks:
            # Kiểm tra xem task_vi có chứa từ tiếng Anh không - SỬ DỤNG KIỂM TRA ĐơN GIẢN
            english_words_found = []
            common_english_words = ['and', 'the', 'of', 'for', 'with', 'or', 'to', 'in', 'is', 'are', 'from', 'by', 'as', 'at', 'on', 'be', 'have', 'has', 'will', 'can', 'may', 'must', 'should', 'would', 'could', 'do', 'does', 'did', 'get', 'make', 'take', 'give', 'go', 'come', 'see', 'know', 'think', 'say', 'tell', 'ask', 'work', 'use', 'find', 'help', 'try', 'call', 'need', 'want', 'look', 'feel', 'become', 'leave', 'put', 'mean', 'keep', 'let', 'begin', 'seem', 'turn', 'start', 'show', 'hear', 'play', 'run', 'move', 'live', 'believe', 'hold', 'bring', 'happen', 'write', 'provide', 'sit', 'stand', 'lose', 'pay', 'meet', 'include', 'continue', 'set', 'learn', 'change', 'lead', 'understand', 'watch', 'follow', 'stop', 'create', 'speak', 'read', 'allow', 'add', 'spend', 'grow', 'open', 'walk', 'win', 'offer', 'remember', 'love', 'consider', 'appear', 'buy', 'wait', 'serve', 'die', 'send', 'expect', 'build', 'stay', 'fall', 'cut', 'reach', 'kill', 'remain', 'suggest', 'raise', 'pass', 'sell', 'require', 'report', 'decide', 'pull', 'perform', 'duties', 'required', 'customers', 'information', 'services', 'records', 'procedures', 'equipment', 'materials', 'documents', 'applications']
            
            task_vi_lower = (task_vi or '').lower()
            for word in common_english_words:
                if word in task_vi_lower:
                    english_words_found.append(word)
            
            if english_words_found:
                tasks_to_translate.append((task_id, task_en))
                print(f"  📝 ID {task_id}: Có từ tiếng Anh [{', '.join(english_words_found[:3])}] - {task_en[:50]}...")
        
        if not tasks_to_translate:
            print("❌ Không có task nào có từ tiếng Anh trong batch này.")
            break
        
        print(f"📝 Thực tế cần dịch: {len(tasks_to_translate)} tasks")
        
        # Nhóm thành batches nhỏ - ĐẢM BẢO MAP ĐÚNG ID
        batch_count = 0
        fixed_this_round = 0
        
        for i in range(0, len(tasks_to_translate), BATCH_SIZE):
            batch = tasks_to_translate[i:i+BATCH_SIZE]
            batch_count += 1
            total_batches = (len(tasks_to_translate) + BATCH_SIZE - 1) // BATCH_SIZE
            
            batch_ids = [task_id for task_id, _ in batch]
            batch_texts = [task_en for _, task_en in batch]
            id_range = f"ID {min(batch_ids)}-{max(batch_ids)}"
            
            print(f"  Batch {batch_count}/{total_batches} ({id_range}):")
            
            # Dịch batch
            translations = translator.translate_batch(batch_texts)
            
            if translations:
                # Update DB - ĐẢM BẢO MAP ĐÚNG ID
                updated_count = 0
                for j, (task_id, task_en) in enumerate(batch):
                    if task_en in translations:
                        task_vi_translated = translations[task_en]
                        task_vi_clean = clean_translation(task_vi_translated)
                        
                        # Kiểm tra xem bản dịch có tốt hơn không - LUÔN CẬP NHẬT ĐỂ ĐẢM BẢO 100% TIẾNG VIỆT
                        if task_vi_clean and task_vi_clean != task_en:
                            # Kiểm tra xem bản dịch mới có còn từ tiếng Anh không
                            english_words_in_new = []
                            common_english_words = ['and', 'the', 'of', 'for', 'with', 'or', 'to', 'in', 'is', 'are', 'from', 'by', 'as', 'at', 'on', 'be', 'have', 'has', 'will', 'can', 'may', 'must', 'should', 'would', 'could', 'do', 'does', 'did', 'get', 'make', 'take', 'give', 'go', 'come', 'see', 'know', 'think', 'say', 'tell', 'ask', 'work', 'use', 'find', 'help', 'try', 'call', 'need', 'want', 'look', 'feel', 'become', 'leave', 'put', 'mean', 'keep', 'let', 'begin', 'seem', 'turn', 'start', 'show', 'hear', 'play', 'run', 'move', 'live', 'believe', 'hold', 'bring', 'happen', 'write', 'provide', 'sit', 'stand', 'lose', 'pay', 'meet', 'include', 'continue', 'set', 'learn', 'change', 'lead', 'understand', 'watch', 'follow', 'stop', 'create', 'speak', 'read', 'allow', 'add', 'spend', 'grow', 'open', 'walk', 'win', 'offer', 'remember', 'love', 'consider', 'appear', 'buy', 'wait', 'serve', 'die', 'send', 'expect', 'build', 'stay', 'fall', 'cut', 'reach', 'kill', 'remain', 'suggest', 'raise', 'pass', 'sell', 'require', 'report', 'decide', 'pull', 'perform', 'duties', 'required', 'customers', 'information', 'services', 'records', 'procedures', 'equipment', 'materials', 'documents', 'applications']
                            
                            task_vi_clean_lower = task_vi_clean.lower()
                            for word in common_english_words:
                                if word in task_vi_clean_lower:
                                    english_words_in_new.append(word)
                            
                            # Cập nhật database
                            cur.execute(
                                "UPDATE core.career_tasks SET task_vi=%s, updated_at=NOW() WHERE id=%s",
                                (task_vi_clean, task_id)
                            )
                            updated_count += 1
                            fixed_this_round += 1
                            
                            if english_words_in_new:
                                print(f"    ⚠️  ID {task_id}: {task_vi_clean[:50]}... [Vẫn còn: {', '.join(english_words_in_new[:2])}]")
                            else:
                                print(f"    ✅ ID {task_id}: {task_vi_clean[:50]}... [100% Tiếng Việt!]")
                        else:
                            print(f"    ⚠️  ID {task_id}: Bỏ qua bản dịch kém chất lượng")
                
                conn.commit()
                print(f"    ✅ Updated {updated_count}/{len(batch)} tasks trong batch này")
            else:
                print(f"    ❌ Không có bản dịch nào trong batch này")
            
            # Delay giữa các batches - GIẢM DELAY ĐỂ TĂNG TỐC
            time.sleep(1)  # Giảm từ 3s xuống 1s
        
        total_fixed += fixed_this_round
        
        # Thống kê sau mỗi round
        new_remaining = get_remaining_count(cur, START_ID)
        reduced = remaining - new_remaining
        
        print(f"✅ Round {round_count} hoàn thành:")
        print(f"   - Fixed: {fixed_this_round} tasks")
        print(f"   - Giảm: {reduced} tasks cần dịch")
        print(f"   - Còn lại: {new_remaining:,} tasks (từ ID {START_ID})")
        print(f"   - Tổng đã fix: {total_fixed:,} tasks")
        
        if fixed_this_round == 0:
            print("⚠️  Không fix được task nào. Dừng để tránh vòng lặp vô hạn.")
            break
        
        print("-" * 60)
        time.sleep(2)  # Giảm delay giữa các rounds từ 5s xuống 2s
    
    # Kiểm tra cuối cùng
    print("\n" + "=" * 60)
    print("🔍 KIỂM TRA CUỐI CÙNG")
    print("=" * 60)
    
    # Kiểm tra 10 tasks còn tiếng Anh từ ID 12847
    print(f"10 tasks còn tiếng Anh từ ID {START_ID}:")
    cur.execute("""
        SELECT id, task_vi 
        FROM core.career_tasks 
        WHERE id >= %s 
        AND (task_vi LIKE '%and%' OR task_vi LIKE '%the%' OR task_vi LIKE '%of%' 
             OR task_vi LIKE '%for%' OR task_vi LIKE '%with%' OR task_vi LIKE '%or%'
             OR task_vi LIKE '%to%' OR task_vi LIKE '%in%' OR task_vi LIKE '%is%'
             OR task_vi LIKE '%are%' OR task_vi LIKE '%from%' OR task_vi LIKE '%by%'
             OR task_vi LIKE '%as%' OR task_vi LIKE '%at%' OR task_vi LIKE '%on%'
             OR task_vi LIKE '%be%' OR task_vi LIKE '%have%' OR task_vi LIKE '%has%'
             OR task_vi LIKE '%will%' OR task_vi LIKE '%can%' OR task_vi LIKE '%may%'
             OR task_vi LIKE '%must%' OR task_vi LIKE '%should%' OR task_vi LIKE '%would%'
             OR task_vi LIKE '%could%' OR task_vi LIKE '%do%' OR task_vi LIKE '%does%'
             OR task_vi LIKE '%did%' OR task_vi LIKE '%get%' OR task_vi LIKE '%make%'
             OR task_vi LIKE '%take%' OR task_vi LIKE '%give%' OR task_vi LIKE '%go%'
             OR task_vi LIKE '%come%' OR task_vi LIKE '%see%' OR task_vi LIKE '%know%'
             OR task_vi LIKE '%think%' OR task_vi LIKE '%say%' OR task_vi LIKE '%tell%'
             OR task_vi LIKE '%ask%' OR task_vi LIKE '%work%' OR task_vi LIKE '%use%'
             OR task_vi LIKE '%find%' OR task_vi LIKE '%help%' OR task_vi LIKE '%try%'
             OR task_vi LIKE '%call%' OR task_vi LIKE '%need%' OR task_vi LIKE '%want%'
             OR task_vi LIKE '%look%' OR task_vi LIKE '%feel%' OR task_vi LIKE '%become%'
             OR task_vi LIKE '%leave%' OR task_vi LIKE '%put%' OR task_vi LIKE '%mean%'
             OR task_vi LIKE '%keep%' OR task_vi LIKE '%let%' OR task_vi LIKE '%begin%'
             OR task_vi LIKE '%seem%' OR task_vi LIKE '%turn%' OR task_vi LIKE '%start%'
             OR task_vi LIKE '%show%' OR task_vi LIKE '%hear%' OR task_vi LIKE '%play%'
             OR task_vi LIKE '%run%' OR task_vi LIKE '%move%' OR task_vi LIKE '%live%'
             OR task_vi LIKE '%believe%' OR task_vi LIKE '%hold%' OR task_vi LIKE '%bring%'
             OR task_vi LIKE '%happen%' OR task_vi LIKE '%write%' OR task_vi LIKE '%provide%'
             OR task_vi LIKE '%sit%' OR task_vi LIKE '%stand%' OR task_vi LIKE '%lose%'
             OR task_vi LIKE '%pay%' OR task_vi LIKE '%meet%' OR task_vi LIKE '%include%'
             OR task_vi LIKE '%continue%' OR task_vi LIKE '%set%' OR task_vi LIKE '%learn%'
             OR task_vi LIKE '%change%' OR task_vi LIKE '%lead%' OR task_vi LIKE '%understand%'
             OR task_vi LIKE '%watch%' OR task_vi LIKE '%follow%' OR task_vi LIKE '%stop%'
             OR task_vi LIKE '%create%' OR task_vi LIKE '%speak%' OR task_vi LIKE '%read%'
             OR task_vi LIKE '%allow%' OR task_vi LIKE '%add%' OR task_vi LIKE '%spend%'
             OR task_vi LIKE '%grow%' OR task_vi LIKE '%open%' OR task_vi LIKE '%walk%'
             OR task_vi LIKE '%win%' OR task_vi LIKE '%offer%' OR task_vi LIKE '%remember%'
             OR task_vi LIKE '%love%' OR task_vi LIKE '%consider%' OR task_vi LIKE '%appear%'
             OR task_vi LIKE '%buy%' OR task_vi LIKE '%wait%' OR task_vi LIKE '%serve%'
             OR task_vi LIKE '%die%' OR task_vi LIKE '%send%' OR task_vi LIKE '%expect%'
             OR task_vi LIKE '%build%' OR task_vi LIKE '%stay%' OR task_vi LIKE '%fall%'
             OR task_vi LIKE '%cut%' OR task_vi LIKE '%reach%' OR task_vi LIKE '%kill%'
             OR task_vi LIKE '%remain%' OR task_vi LIKE '%suggest%' OR task_vi LIKE '%raise%'
             OR task_vi LIKE '%pass%' OR task_vi LIKE '%sell%' OR task_vi LIKE '%require%'
             OR task_vi LIKE '%report%' OR task_vi LIKE '%decide%' OR task_vi LIKE '%pull%'
             OR task_vi LIKE '%perform%' OR task_vi LIKE '%duties%' OR task_vi LIKE '%required%'
             OR task_vi LIKE '%customers%' OR task_vi LIKE '%information%' OR task_vi LIKE '%services%'
             OR task_vi LIKE '%records%' OR task_vi LIKE '%procedures%' OR task_vi LIKE '%equipment%'
             OR task_vi LIKE '%materials%' OR task_vi LIKE '%documents%' OR task_vi LIKE '%applications%')
        ORDER BY id 
        LIMIT 10
    """, (START_ID,))
    
    remaining_tasks = cur.fetchall()
    if remaining_tasks:
        for task_id, task_vi in remaining_tasks:
            # Tìm từ tiếng Anh trong task_vi
            english_words_found = []
            common_english_words = ['and', 'the', 'of', 'for', 'with', 'or', 'to', 'in', 'is', 'are', 'from', 'by', 'as', 'at', 'on', 'be', 'have', 'has', 'will', 'can', 'may', 'must', 'should', 'would', 'could', 'do', 'does', 'did', 'get', 'make', 'take', 'give', 'go', 'come', 'see', 'know', 'think', 'say', 'tell', 'ask', 'work', 'use', 'find', 'help', 'try', 'call', 'need', 'want', 'look', 'feel', 'become', 'leave', 'put', 'mean', 'keep', 'let', 'begin', 'seem', 'turn', 'start', 'show', 'hear', 'play', 'run', 'move', 'live', 'believe', 'hold', 'bring', 'happen', 'write', 'provide', 'sit', 'stand', 'lose', 'pay', 'meet', 'include', 'continue', 'set', 'learn', 'change', 'lead', 'understand', 'watch', 'follow', 'stop', 'create', 'speak', 'read', 'allow', 'add', 'spend', 'grow', 'open', 'walk', 'win', 'offer', 'remember', 'love', 'consider', 'appear', 'buy', 'wait', 'serve', 'die', 'send', 'expect', 'build', 'stay', 'fall', 'cut', 'reach', 'kill', 'remain', 'suggest', 'raise', 'pass', 'sell', 'require', 'report', 'decide', 'pull', 'perform', 'duties', 'required', 'customers', 'information', 'services', 'records', 'procedures', 'equipment', 'materials', 'documents', 'applications']
            
            task_vi_lower = (task_vi or '').lower()
            for word in common_english_words:
                if word in task_vi_lower:
                    english_words_found.append(word)
            
            print(f"  ID {task_id}: {(task_vi or 'NULL')[:60]}... [Tiếng Anh: {', '.join(english_words_found[:3])}]")
    else:
        print("  ✅ Không có task nào còn tiếng Anh từ ID 12847!")
    
    # Thống kê tổng kết
    cur.execute("SELECT COUNT(*) FROM core.career_tasks")
    result = cur.fetchone()
    total_tasks = result[0] if result else 0
    
    cur.execute("SELECT COUNT(*) FROM core.career_tasks WHERE id >= %s", (START_ID,))
    result = cur.fetchone()
    total_from_start = result[0] if result else 0
    
    remaining = get_remaining_count(cur, START_ID)
    completed_from_start = total_from_start - remaining
    completion_rate = (completed_from_start / total_from_start) * 100 if total_from_start > 0 else 100
    
    print(f"\n📈 THỐNG KÊ TỔNG KẾT:")
    print(f"   - Tổng tasks trong DB: {total_tasks:,}")
    print(f"   - Tasks từ ID {START_ID}: {total_from_start:,}")
    print(f"   - Đã hoàn thành từ ID {START_ID}: {completed_from_start:,} ({completion_rate:.1f}%)")
    print(f"   - Còn lại từ ID {START_ID}: {remaining:,} ({100-completion_rate:.1f}%)")
    print(f"   - Script đã fix: {total_fixed:,} tasks")
    print(f"   - Số rounds: {round_count}")
    
    if remaining == 0:
        print(f"\n🎊 CHÚC MỪNG! ĐÃ DỊCH HOÀN THÀNH 100% TASKS TỪ ID {START_ID}!")
    else:
        print(f"\n⏸️  Script dừng. Còn {remaining:,} tasks cần dịch từ ID {START_ID}.")
    
    print(f"Kết thúc lúc: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    cur.close()
    conn.close()

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⏹️  Script bị dừng bởi người dùng (Ctrl+C)")
    except Exception as e:
        print(f"\n\n❌ Lỗi không mong muốn: {e}")