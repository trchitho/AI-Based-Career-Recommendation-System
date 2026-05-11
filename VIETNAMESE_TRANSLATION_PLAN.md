# Kế Hoạch Chuyển Đổi Sang Tiếng Việt

## Mục Tiêu
Chuyển TẤT CẢ text trong 2 game (Puzzle Game và Personality Garden) sang tiếng Việt 100%.

## Danh Sách File Cần Dịch

### 1. Puzzle Game (TetrisQuizGame)
- `TetrisQuizGame.tsx` - Game chính
- `PuzzleGameIntro.tsx` - Màn hình giới thiệu

### 2. Personality Garden
- `PersonalityGardenFlow.tsx` - Flow chính
- `GardenTutorial.tsx` - ✅ ĐÃ DỊCH
- `SeedSelection.tsx` - Chọn hạt giống
- `PlantingIntro.tsx` - Giới thiệu trồng cây
- `QuestionNurture.tsx` - ✅ ĐÃ DỊCH MỘT PHẦN (cần hoàn thiện)
- `PersonalityTreeResult.tsx` - Kết quả
- `NatureEnergyBar.tsx` - Thanh năng lượng
- `AnswerHistory.tsx` - Lịch sử trả lời

### 3. Story-based Assessment
- `StoryBasedAssessment.tsx` - Game câu chuyện

## Từ Điển Dịch Thuật

### Câu Trả Lời (Likert Scale)
- Strongly Disagree → Rất không đồng ý
- Disagree → Không đồng ý
- Neutral → Trung lập
- Agree → Đồng ý
- Strongly Agree → Rất đồng ý

### Game Terms
- Level → Cấp độ
- Score → Điểm số
- XP → Điểm kinh nghiệm
- Combo → Chuỗi combo
- Progress → Tiến trình
- Question → Câu hỏi
- Bomb → Bom
- Rocket → Tên lửa
- Nuclear → Hạt nhân
- Power-up → Vật phẩm hỗ trợ

### UI Elements
- Drag and drop → Kéo và thả
- Continue → Tiếp tục
- Skip → Bỏ qua
- Save → Lưu
- Exit → Thoát
- Cancel → Hủy
- Confirm → Xác nhận
- Loading → Đang tải
- Completed → Hoàn thành

### Personality Garden Specific
- Seed → Hạt giống
- Plant → Trồng
- Grow → Phát triển
- Tree → Cây
- Garden → Vườn
- Nurture → Chăm sóc
- Water → Nước
- Sunlight → Ánh nắng
- Soil → Đất
- Fertilizer → Phân bón
- Nutrients → Dinh dưỡng

## Trạng Thái Thực Hiện

### ✅ Đã Hoàn Thành
1. GardenTutorial.tsx - 100% tiếng Việt
2. QuestionNurture.tsx - Đã dịch labels (Rất đồng ý, Đồng ý, etc.)
3. AssessmentPage.tsx - Đã thêm logic load 33 câu cho game mode

### 🔄 Đang Thực Hiện
1. TetrisQuizGame.tsx - Cần dịch toàn bộ
2. PuzzleGameIntro.tsx - Cần dịch toàn bộ
3. StoryBasedAssessment.tsx - Cần dịch toàn bộ

### ⏳ Chưa Bắt Đầu
1. SeedSelection.tsx
2. PlantingIntro.tsx
3. PersonalityTreeResult.tsx
4. NatureEnergyBar.tsx
5. AnswerHistory.tsx
6. PersonalityGardenFlow.tsx (các dialog, button)

## Ghi Chú
- Ưu tiên dịch các text hiển thị cho người dùng
- Giữ nguyên tên biến, function trong code
- Giữ nguyên emoji và icon
- Đảm bảo không có text tiếng Anh nào còn sót lại
