# 🎮 Puzzle Game Mode - Tổng Quan Chi Tiết

## Giới Thiệu Chung

Puzzle Game Mode là một chế độ làm bài assessment (đánh giá nghề nghiệp và tính cách) được gamification hóa theo phong cách **Tetris**. Thay vì trả lời câu hỏi theo cách truyền thống, người dùng sẽ kéo thả các khối Tetris chứa câu trả lời lên lưới để hoàn thành bài test.

## 🎯 Mục Đích

- Làm cho việc làm bài assessment trở nên **thú vị và hấp dẫn hơn**
- Giảm sự nhàm chán khi trả lời nhiều câu hỏi liên tiếp
- Tạo động lực hoàn thành bài test thông qua hệ thống XP, level, combo
- Thu thập dữ liệu assessment một cách **chính xác** nhưng **vui vẻ**

## 🎨 Có 2 Phiên Bản Game

### 1. **TetrisQuizGame** (Phiên bản chính - phức tạp hơn)
- Lưới 11 cột x 12 hàng
- Có hệ thống combo, power-ups, easter eggs
- Có âm thanh hiệu ứng
- Có animation xóa hàng/cột như Tetris thật

### 2. **PuzzleGameMode** (Phiên bản đơn giản hơn)
- Chỉ cần click vào piece để thả xuống
- Không có lưới phức tạp
- Đơn giản hơn cho người dùng mới

## 🎮 Cách Chơi (TetrisQuizGame)

### Bước 1: Đọc Câu Hỏi
- Mỗi câu hỏi hiển thị ở góc phải màn hình
- Có 2 loại câu hỏi:
  - **RIASEC** (Career Interest): Đánh giá hứng thú nghề nghiệp
  - **BigFive** (Personality): Đánh giá tính cách

### Bước 2: Chọn Câu Trả Lời
- Mỗi câu trả lời được biểu diễn bằng một **khối Tetris**
- Có 5 loại khối:
  - **I** (Cyan): Thanh dài 4 ô
  - **O** (Yellow): Hình vuông 2x2
  - **T** (Purple): Hình chữ T
  - **L** (Orange): Hình chữ L
  - **Z** (Red): Hình chữ Z

### Bước 3: Kéo Thả Khối
- **Kéo** khối từ danh sách bên dưới
- **Thả** lên lưới 11x12 ở giữa màn hình
- Khối sẽ được đặt vào vị trí bạn thả
- Có thể **xoay khối** bằng nút ↻ hoặc **chuột phải**

### Bước 4: Xóa Hàng/Cột (Tetris Mechanic)
- Khi một **hàng** hoặc **cột** đầy, nó sẽ bị xóa
- Nhận **bonus XP** và **điểm** khi xóa
- Tăng **combo** streak

## 🎯 Hệ Thống Điểm & Cấp Độ

### XP (Experience Points)
- Mỗi câu trả lời: **+50-70 XP** (tùy loại khối)
- Xóa hàng/cột: **+80 XP** mỗi hàng/cột
- Cần **400 XP** để lên level

### Level
- Bắt đầu từ **Level 1**
- Mỗi lần lên level nhận:
  - **2 Bombs** 💣
  - **1 Rocket** 🚀

### Score (Điểm)
- Mỗi câu trả lời: **+50-70 điểm**
- Xóa hàng/cột: **+150 điểm** mỗi hàng/cột
- Điểm càng cao = thành tích càng tốt

### Combo System
- Mỗi lần xóa hàng/cột: **Combo +1**
- Combo càng cao = hiệu ứng càng mạnh
- Combo **≥3**: Có thể unlock **Easter Egg**
- Combo **≥5**: Hiển thị màu đỏ, animate pulse
- Sử dụng power-up sẽ **reset combo về 0**

## 💥 Power-Ups (Vật Phẩm Đặc Biệt)

### 1. Bomb 💣 (2x2)
- Xóa khu vực **2x2 ô**
- Nhận được khi **lên level**
- Dùng khi lưới bị đầy, cần tạo không gian

### 2. Rocket 🚀 (4x4)
- Xóa khu vực **4x4 ô**
- Nhận được khi **lên level**
- Mạnh hơn Bomb, dùng cho tình huống khó

### 3. Nuclear ☢️ (Easter Egg - ALL!)
- **XÓA TOÀN BỘ LƯỚI**
- Chỉ có thể unlock bằng cách:
  - Đạt **Combo 3** → Nhận Nuclear thứ 1
  - Đạt **Combo 4** → Nhận Nuclear thứ 2
- Tối đa **2 Nuclear** trong cả game
- Có hiệu ứng đặc biệt: animate pulse, màu tím-hồng
- Khi sử dụng: Hiệu ứng nổ lớn, xóa tất cả

## 🎵 Hiệu Ứng Âm Thanh

### Line Clear Sound
- Phát khi xóa hàng/cột
- Âm thanh "pop" với tần số tăng dần (400Hz → 800Hz)
- Tạo cảm giác thỏa mãn

### Power-Up Sound
- Phát khi dùng Bomb/Rocket/Nuclear
- Âm thanh "explosion" với nhiều tần số chồng lên nhau
- Tạo cảm giác mạnh mẽ

## 🎨 Giao Diện (UI Layout)

### Bố Cục Màn Hình
```
┌─────────────────────────────────────────────────────────┐
│  Stats Bar (Top): Level | XP | Combo | Score | Progress │
├──────┬──────────────────────────────────────────┬───────┤
│ Left │           Center (Grid 11x12)            │ Right │
│Stats │                                          │Question│
│      │  ┌────────────────────────────────┐     │       │
│Power │  │                                │     │Power  │
│Ups   │  │      Tetris Grid               │     │Ups    │
│      │  │                                │     │       │
│      │  └────────────────────────────────┘     │       │
│      │                                          │       │
│      │  Available Pieces (Draggable)           │       │
│      │  [I] [O] [T] [L] [Z]                   │       │
├──────┴──────────────────────────────────────────┴───────┤
│  Completed Answers (Bottom): Lịch sử câu trả lời       │
└─────────────────────────────────────────────────────────┘
```

### Màu Sắc
- **Cyan/Blue**: Level, XP
- **Yellow/Orange**: Score, Bomb
- **Red/Orange**: Combo (khi cao)
- **Green**: Progress
- **Purple/Pink**: Nuclear (Easter Egg)

## 💾 Hệ Thống Lưu/Tải

### Auto-Save
- Tự động lưu khi:
  - User click nút back
  - User refresh trang (F5)
  - User đóng tab

### Save Dialog
Khi user thoát, hiện dialog với 3 lựa chọn:
1. **"Có, lưu lại"** → Lưu tiến trình, có thể chơi tiếp sau
2. **"Không, reset kết quả"** → Xóa tiến trình, bắt đầu lại
3. **"Tiếp tục chơi"** → Hủy, quay lại game

### Dữ Liệu Được Lưu
- `currentIndex`: Câu hỏi hiện tại
- `responses`: Map câu trả lời (questionId → answer)
- `completedAnswers`: Lịch sử câu trả lời
- `xp`, `level`, `score`: Stats
- `bombs`, `rockets`, `nuclear`: Power-ups
- `combo`, `maxCombo`: Combo streak
- `grid`: Toàn bộ trạng thái lưới (quan trọng!)

### Chiến Lược Lưu
1. **Database First**: Ưu tiên lưu vào PostgreSQL
   - Bảng: `core.assessment_gamification_sessions`
   - Field: `extra_data` (JSON)
2. **LocalStorage Fallback**: Nếu database fail
   - Key: `tetris_quiz_progress`

## 🏆 Victory Modal (Màn Hình Chiến Thắng)

Khi hoàn thành tất cả câu hỏi:

### Hiển Thị
- 🏆 Trophy icon lớn
- "CONGRATULATIONS!" với gradient text
- Stats grid 2x2:
  - ⭐ Final Score
  - 🎯 Final Level
  - 💎 Total XP
  - 🔥 Max Combo

### Special Achievements
Hiển thị nếu đạt được:
- **Combo Master**: Max Combo ≥ 5
- **Level Champion**: Level ≥ 5
- **Nuclear Unlocked**: Có unlock Nuclear
- **High Scorer**: Score ≥ 5000

### Button
- "✨ View My Analysis ✨" → Xem kết quả phân tích

## 🔧 Kỹ Thuật Implementation

### State Management
- React Hooks (useState, useEffect)
- Map cho responses (hiệu quả hơn array)
- Set cho clearingCells (animation)

### Drag & Drop
- HTML5 Drag & Drop API
- `draggable`, `onDragStart`, `onDragEnd`, `onDragOver`, `onDrop`
- Preview overlay khi hover

### Grid System
- 2D Array: `(GridCell | null)[][]`
- GridCell interface:
  ```typescript
  {
    filled: boolean;
    text: string;
    emoji?: string;
    value: string | number;
    questionId: string;
    color: string;
  }
  ```

### Piece Rotation
- 4 rotations (0°, 90°, 180°, 270°)
- Transform coordinates: `(x, y) → (y, -x)`
- Normalize to positive space
- Store rotation per piece index

### Animation
- CSS transitions cho smooth movement
- `animate-pulse` cho clearing cells
- `animate-bounce` cho notifications
- Tailwind CSS classes

### Sound Effects
- Web Audio API
- OscillatorNode cho tạo âm thanh
- GainNode cho volume control
- Frequency ramping cho hiệu ứng

## 📊 Database Integration

### Gamification Tables
1. **assessment_gamification_sessions**
   - Lưu game progress trong `extra_data`
   - Link với `assessment_session_id`

2. **user_gamification_profiles**
   - Tổng XP, Level của user
   - Cập nhật mỗi lần chơi

3. **user_achievements**
   - Lưu thành tích đặc biệt
   - Combo Master, Level Champion, etc.

### API Endpoints
- `POST /api/assessments/gamification/start-session`
- `POST /api/assessments/gamification/save-progress`
- `GET /api/assessments/gamification/load-progress/{id}`

## 🎯 Ưu Điểm

1. **Engaging**: Vui, không nhàm chán
2. **Motivating**: Hệ thống XP/Level tạo động lực
3. **Accurate**: Vẫn thu thập đúng dữ liệu assessment
4. **Memorable**: User nhớ trải nghiệm lâu hơn
5. **Replayable**: Có thể chơi lại để cải thiện score

## 🎮 Chiến Thuật Chơi

### Beginner Tips
1. Đọc kỹ câu hỏi trước khi chọn
2. Xoay khối để fit vào chỗ trống
3. Cố gắng xóa hàng/cột để nhận bonus
4. Giữ combo cao để unlock Nuclear

### Advanced Tips
1. Plan ahead: Nghĩ trước vị trí đặt khối
2. Build combo: Cố gắng xóa liên tiếp
3. Save power-ups: Dùng khi thật sự cần
4. Aim for Easter Egg: Combo 3-4 để unlock Nuclear
5. Max score: Xóa nhiều hàng/cột cùng lúc

## 🐛 Known Issues & Solutions

### Issue: Grid đầy, không đặt được khối
**Solution**: Dùng Bomb/Rocket để tạo không gian

### Issue: Không biết xoay khối
**Solution**: Click nút ↻ hoặc chuột phải vào khối

### Issue: Mất tiến trình khi refresh
**Solution**: Đã có auto-save, nhưng nên click "Lưu lại" khi thoát

### Issue: Không thấy Nuclear
**Solution**: Phải đạt Combo 3 hoặc 4 mới unlock

## 📈 Metrics & Analytics

### Tracked Data
- Completion rate: Bao nhiêu % user hoàn thành
- Average time: Thời gian trung bình
- Average score: Điểm trung bình
- Max combo achieved: Combo cao nhất
- Power-up usage: Tần suất dùng power-ups
- Nuclear unlock rate: % user unlock Nuclear

### Business Value
- Tăng engagement: User chơi lâu hơn
- Giảm drop-off: Ít bỏ dở hơn
- Tăng completion: Nhiều người hoàn thành hơn
- Better data: Dữ liệu assessment chất lượng cao

## 🚀 Future Enhancements

### Planned Features
1. **Multiplayer Mode**: Chơi với bạn bè
2. **Leaderboard**: Bảng xếp hạng
3. **Daily Challenges**: Thử thách hàng ngày
4. **More Power-Ups**: Thêm vật phẩm mới
5. **Themes**: Đổi giao diện
6. **Mobile Support**: Tối ưu cho mobile

### Technical Improvements
1. **Performance**: Optimize rendering
2. **Accessibility**: Keyboard controls
3. **Offline Mode**: Chơi offline
4. **Cloud Sync**: Đồng bộ đa thiết bị

## 📝 Kết Luận

Puzzle Game Mode là một cách sáng tạo để làm cho việc assessment trở nên thú vị. Nó kết hợp:
- **Game mechanics** (Tetris)
- **Gamification** (XP, Level, Combo)
- **Assessment** (RIASEC, BigFive)
- **Data persistence** (Database + LocalStorage)

Kết quả là một trải nghiệm **vui vẻ**, **hấp dẫn**, và **hiệu quả** cho cả user và business.
