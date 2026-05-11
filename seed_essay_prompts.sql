-- ============================================================
-- SEED: core.essay_prompts (50 prompts)
-- Phân bổ theo psychological dimensions:
--   Aspirations & Goals    : 10
--   Challenges & Resilience: 10
--   Creativity & Openness  :  8
--   Teamwork & Leadership  :  8
--   Future Planning        :  8
--   Values & Ethics        :  6
-- Mỗi prompt gắn Big Five + RIASEC trong comment
-- ============================================================

TRUNCATE core.essay_prompts RESTART IDENTITY CASCADE;

INSERT INTO core.essay_prompts (title, prompt_text, lang) VALUES

-- ── ASPIRATIONS & GOALS (10) ──────────────────────────────
-- [O,C] [E,S]
('Nghề nghiệp lý tưởng',
 'Hãy mô tả nghề nghiệp lý tưởng của bạn trong tương lai. Những kỹ năng và phẩm chất cá nhân nào khiến bạn phù hợp với công việc đó, và tại sao nó thu hút bạn?',
 'vi'),

-- [C,O] [E,C]
('Mục tiêu 5 năm tới',
 'Bạn muốn đạt được điều gì trong sự nghiệp sau 5 năm nữa? Hãy mô tả kế hoạch cụ thể và những bước bạn sẽ thực hiện để đạt được mục tiêu đó.',
 'vi'),

-- [O,E] [E,S]
('Ý nghĩa của thành công',
 'Thành công có ý nghĩa gì với bạn? Hãy chia sẻ quan điểm của bạn và những yếu tố nào bạn cho là quan trọng nhất để đạt được nó.',
 'vi'),

-- [C,E] [E,S]
('Nguồn động lực làm việc',
 'Điều gì thúc đẩy bạn làm việc chăm chỉ mỗi ngày? Hãy mô tả những nguồn động lực chính trong cuộc sống và công việc của bạn.',
 'vi'),

-- [O,N] [A,S]
('Ước mơ từ thuở nhỏ',
 'Khi còn nhỏ, bạn từng mơ ước trở thành gì? Ước mơ đó có thay đổi không và tại sao? Nó ảnh hưởng như thế nào đến lựa chọn hiện tại của bạn?',
 'vi'),

-- [E,A] [S,E]
('Môi trường làm việc lý tưởng',
 'Mô tả môi trường làm việc mà bạn cảm thấy thoải mái và hiệu quả nhất. Bạn thích làm việc một mình hay theo nhóm? Tại sao?',
 'vi'),

-- [C,O] [I,C]
('Kỹ năng muốn phát triển',
 'Bạn muốn phát triển kỹ năng gì nhất trong thời gian tới? Tại sao kỹ năng đó quan trọng với bạn và bạn có kế hoạch gì để cải thiện nó?',
 'vi'),

-- [A,O] [S,E]
('Đóng góp cho xã hội',
 'Bạn muốn đóng góp gì cho xã hội thông qua công việc của mình? Hãy chia sẻ về tác động tích cực mà bạn mong muốn tạo ra.',
 'vi'),

-- [C,A] [S,C]
('Cân bằng công việc và cuộc sống',
 'Làm thế nào bạn định cân bằng giữa sự nghiệp và cuộc sống cá nhân? Điều gì quan trọng nhất với bạn trong việc duy trì sự cân bằng này?',
 'vi'),

-- [O,E] [A,E]
('Nếu được chọn lại nghề nghiệp',
 'Nếu có cơ hội thay đổi hoàn toàn nghề nghiệp, bạn sẽ chọn làm gì? Tại sao lựa chọn đó hấp dẫn bạn và bạn sẵn sàng đối mặt với những thách thức gì?',
 'vi'),

-- ── CHALLENGES & RESILIENCE (10) ─────────────────────────
-- [N,C] [I,E]
('Vượt qua thử thách lớn',
 'Hãy kể về một lần bạn đối mặt với thử thách khó khăn. Bạn đã vượt qua nó như thế nào và học được gì về bản thân từ trải nghiệm đó?',
 'vi'),

-- [N,O] [I,A]
('Thất bại và bài học',
 'Thất bại lớn nhất trong cuộc đời bạn là gì? Bạn đã học được gì từ nó và nó thay đổi bạn như thế nào?',
 'vi'),

-- [N,C] [C,S]
('Quản lý áp lực',
 'Khi gặp áp lực lớn trong học tập hoặc công việc, bạn thường phản ứng như thế nào? Những phương pháp nào giúp bạn quản lý stress hiệu quả?',
 'vi'),

-- [C,N] [I,E]
('Quyết định khó khăn nhất',
 'Hãy mô tả một quyết định khó khăn mà bạn đã phải đưa ra. Bạn đã cân nhắc những yếu tố gì và cảm thấy thế nào về quyết định đó hiện tại?',
 'vi'),

-- [A,E] [S,E]
('Giải quyết xung đột',
 'Kể về một lần bạn có xung đột với ai đó. Bạn đã giải quyết tình huống đó như thế nào và học được gì từ kinh nghiệm này?',
 'vi'),

-- [N,C] [C,E]
('Khi muốn bỏ cuộc',
 'Có lúc nào bạn muốn bỏ cuộc không? Điều gì đã giúp bạn tiếp tục và vượt qua giai đoạn khó khăn đó?',
 'vi'),

-- [O,N] [A,I]
('Thích ứng với thay đổi bất ngờ',
 'Bạn thích ứng với những thay đổi bất ngờ như thế nào? Hãy chia sẻ một ví dụ cụ thể về cách bạn đối phó với sự thay đổi.',
 'vi'),

-- [O,C] [I,C]
('Học hỏi từ sai lầm',
 'Hãy kể về một sai lầm mà bạn đã mắc phải và cách bạn học hỏi từ nó. Sai lầm đó đã giúp bạn trở nên tốt hơn như thế nào?',
 'vi'),

-- [N,E] [E,A]
('Vượt qua nỗi sợ hãi',
 'Bạn đã từng vượt qua nỗi sợ hãi nào của mình chưa? Hãy mô tả trải nghiệm đó và cảm giác của bạn sau khi vượt qua nó.',
 'vi'),

-- [A,E] [S,A]
('Tìm kiếm sự hỗ trợ',
 'Khi gặp khó khăn, bạn thường tìm kiếm sự hỗ trợ từ đâu? Vai trò của gia đình, bạn bè trong việc giúp bạn vượt qua thử thách là gì?',
 'vi'),

-- ── CREATIVITY & OPENNESS (8) ────────────────────────────
-- [O,A] [A,I]
('Dự án sáng tạo yêu thích',
 'Hãy mô tả một dự án sáng tạo mà bạn đã thực hiện hoặc muốn thực hiện. Điều gì truyền cảm hứng cho bạn và bạn đã tiếp cận nó như thế nào?',
 'vi'),

-- [O,C] [A,I]
('Giải quyết vấn đề theo cách mới',
 'Kể về một lần bạn giải quyết vấn đề theo cách sáng tạo, khác với cách thông thường. Ý tưởng đó đến từ đâu và kết quả như thế nào?',
 'vi'),

-- [O,E] [A,S]
('Sở thích nghệ thuật',
 'Bạn có sở thích nghệ thuật hoặc sáng tạo nào không? Hãy chia sẻ về nó và cách nó ảnh hưởng đến cuộc sống và công việc của bạn.',
 'vi'),

-- [O,A] [A,R]
('Kết hợp ý tưởng từ nhiều lĩnh vực',
 'Hãy mô tả một lần bạn kết hợp ý tưởng từ các lĩnh vực khác nhau để tạo ra điều gì đó mới. Quá trình đó diễn ra như thế nào?',
 'vi'),

-- [O,N] [A,I]
('Trải nghiệm văn hóa mới',
 'Hãy kể về một trải nghiệm văn hóa hoặc nghệ thuật đã thay đổi cách bạn nhìn nhận thế giới. Nó ảnh hưởng đến bạn như thế nào?',
 'vi'),

-- [O,C] [I,A]
('Tư duy phản biện',
 'Hãy mô tả một tình huống bạn đã đặt câu hỏi về một quan điểm phổ biến. Bạn đã tiếp cận vấn đề đó như thế nào và kết luận của bạn là gì?',
 'vi'),

-- [O,E] [A,E]
('Ý tưởng kinh doanh sáng tạo',
 'Nếu bạn có thể tạo ra một sản phẩm hoặc dịch vụ hoàn toàn mới, đó sẽ là gì? Hãy mô tả ý tưởng và lý do bạn nghĩ nó có giá trị.',
 'vi'),

-- [O,A] [A,S]
('Học hỏi qua trải nghiệm',
 'Hãy mô tả một trải nghiệm học hỏi không chính thức (ngoài trường lớp) đã có tác động lớn đến bạn. Bạn học được gì và nó thay đổi bạn như thế nào?',
 'vi'),

-- ── TEAMWORK & LEADERSHIP (8) ────────────────────────────
-- [E,A] [S,E]
('Dẫn dắt nhóm',
 'Hãy kể về một lần bạn dẫn dắt một nhóm. Bạn đã tiếp cận vai trò lãnh đạo như thế nào và học được gì từ trải nghiệm đó?',
 'vi'),

-- [A,E] [S,E]
('Làm việc nhóm hiệu quả',
 'Mô tả một dự án nhóm thành công mà bạn đã tham gia. Vai trò của bạn là gì và nhóm đã vượt qua những thách thức nào?',
 'vi'),

-- [A,C] [S,I]
('Xử lý thành viên khó tính',
 'Bạn đã từng làm việc với một thành viên nhóm khó hợp tác chưa? Bạn đã xử lý tình huống đó như thế nào?',
 'vi'),

-- [E,A] [E,S]
('Truyền cảm hứng cho người khác',
 'Hãy kể về một lần bạn truyền cảm hứng hoặc động viên người khác. Bạn đã làm gì và tác động của nó là gì?',
 'vi'),

-- [C,A] [C,S]
('Phân công công việc nhóm',
 'Khi làm việc nhóm, bạn thường tiếp cận việc phân công nhiệm vụ như thế nào? Hãy chia sẻ một ví dụ cụ thể.',
 'vi'),

-- [A,E] [S,E]
('Nhận và đưa ra phản hồi',
 'Bạn cảm thấy thế nào khi nhận phản hồi tiêu cực? Bạn đã học cách đưa ra phản hồi mang tính xây dựng như thế nào?',
 'vi'),

-- [E,C] [E,I]
('Quyết định trong nhóm',
 'Hãy mô tả một tình huống nhóm bạn phải đưa ra quyết định quan trọng dưới áp lực thời gian. Quá trình đó diễn ra như thế nào?',
 'vi'),

-- [A,O] [S,A]
('Đa dạng trong nhóm',
 'Bạn đã từng làm việc trong một nhóm có sự đa dạng về văn hóa hoặc quan điểm chưa? Điều đó ảnh hưởng đến công việc như thế nào?',
 'vi'),

-- ── FUTURE PLANNING (8) ──────────────────────────────────
-- [C,O] [C,I]
('Kế hoạch học tập dài hạn',
 'Bạn có kế hoạch học tập hoặc phát triển chuyên môn trong 3-5 năm tới không? Hãy mô tả lộ trình và lý do bạn chọn hướng đó.',
 'vi'),

-- [C,E] [E,C]
('Xây dựng thương hiệu cá nhân',
 'Bạn muốn người khác nhớ đến bạn như thế nào trong sự nghiệp? Bạn đang làm gì để xây dựng hình ảnh chuyên nghiệp của mình?',
 'vi'),

-- [O,C] [I,E]
('Xu hướng ngành nghề tương lai',
 'Bạn nghĩ ngành nghề của mình sẽ thay đổi như thế nào trong 10 năm tới? Bạn đang chuẩn bị gì để thích ứng với những thay đổi đó?',
 'vi'),

-- [C,A] [S,C]
('Mạng lưới quan hệ nghề nghiệp',
 'Bạn tiếp cận việc xây dựng mạng lưới quan hệ nghề nghiệp như thế nào? Những mối quan hệ nào bạn cho là quan trọng nhất?',
 'vi'),

-- [O,C] [A,I]
('Học hỏi liên tục',
 'Trong thế giới thay đổi nhanh chóng, bạn duy trì việc học hỏi liên tục như thế nào? Hãy chia sẻ phương pháp và thói quen học tập của bạn.',
 'vi'),

-- [C,N] [C,E]
('Quản lý tài chính cá nhân',
 'Bạn có kế hoạch tài chính cá nhân không? Hãy chia sẻ cách bạn tiếp cận việc quản lý tài chính để đạt được mục tiêu nghề nghiệp.',
 'vi'),

-- [O,E] [E,I]
('Khởi nghiệp hay làm thuê',
 'Bạn có muốn khởi nghiệp trong tương lai không? Hãy phân tích ưu và nhược điểm của việc khởi nghiệp so với làm việc cho tổ chức.',
 'vi'),

-- [C,O] [C,I]
('Phát triển kỹ năng số',
 'Công nghệ số đang thay đổi mọi ngành nghề. Bạn đang phát triển những kỹ năng số nào và tại sao bạn cho chúng là quan trọng?',
 'vi'),

-- ── VALUES & ETHICS (6) ──────────────────────────────────
-- [A,O] [S,I]
('Giá trị cốt lõi trong công việc',
 'Những giá trị nào quan trọng nhất với bạn trong công việc? Hãy mô tả một tình huống bạn đã hành động theo những giá trị đó dù gặp khó khăn.',
 'vi'),

-- [A,C] [S,E]
('Đạo đức nghề nghiệp',
 'Hãy mô tả một tình huống bạn phải đối mặt với vấn đề đạo đức trong công việc hoặc học tập. Bạn đã xử lý nó như thế nào?',
 'vi'),

-- [A,O] [S,A]
('Trách nhiệm xã hội',
 'Bạn nghĩ doanh nghiệp và cá nhân có trách nhiệm gì với xã hội? Hãy chia sẻ quan điểm của bạn và cách bạn thực hiện trách nhiệm đó.',
 'vi'),

-- [O,A] [I,S]
('Công bằng và bình đẳng',
 'Bạn đã từng chứng kiến hoặc trải qua sự bất công chưa? Bạn đã phản ứng như thế nào và điều đó ảnh hưởng đến quan điểm của bạn ra sao?',
 'vi'),

-- [C,A] [C,S]
('Tính trung thực trong công việc',
 'Hãy kể về một lần bạn phải lựa chọn giữa sự trung thực và lợi ích cá nhân. Bạn đã quyết định như thế nào và tại sao?',
 'vi'),

-- [O,A] [S,I]
('Tác động môi trường',
 'Bạn nghĩ thế hệ của mình có trách nhiệm gì với môi trường? Bạn đang làm gì hoặc muốn làm gì để đóng góp cho sự bền vững?',
 'vi');
