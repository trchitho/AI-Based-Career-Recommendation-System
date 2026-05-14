// Translation utilities for admin pages

// Status translations
export const translateStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    'Published': 'Đã xuất bản',
    'Pending': 'Chờ duyệt',
    'Rejected': 'Đã từ chối',
    'Draft': 'Bản nháp',
    'Active': 'Hoạt động',
    'Inactive': 'Không hoạt động',
    'Approved': 'Đã duyệt',
    'Completed': 'Hoàn thành',
    'In Progress': 'Đang thực hiện',
    'Failed': 'Thất bại',
    'Success': 'Thành công',
    'Cancelled': 'Đã hủy',
    'Expired': 'Hết hạn'
  };
  return statusMap[status] || status;
};

// Translate KSA types
export const translateKSAType = (type: string): string => {
  const translations: Record<string, string> = {
    'Knowledge': 'Kiến thức',
    'knowledge': 'Kiến thức',
    'Skills': 'Kỹ năng',
    'skill': 'Kỹ năng',
    'Basic Skills': 'Kỹ năng cơ bản',
    'Abilities': 'Năng lực',
    'ability': 'Năng lực',
    'Cross-Functional Skills': 'Kỹ năng liên chức năng',
    'Technical Skills': 'Kỹ năng kỹ thuật',
  };
  return translations[type] || type;
};

// Translate category/skill names
export const translateCategory = (category: string): string => {
  const translations: Record<string, string> = {
    'Basic Skills': 'Kỹ năng cơ bản',
    'Complex Problem Solving': 'Giải quyết vấn đề phức tạp',
    'Resource Management': 'Quản lý nguồn lực',
    'Social Skills': 'Kỹ năng xã hội',
    'System Skills': 'Kỹ năng hệ thống',
    'Technical Skills': 'Kỹ năng kỹ thuật',
    'Active Learning': 'Học tập chủ động',
    'Active Listening': 'Lắng nghe tích cực',
    'Critical Thinking': 'Tư duy phản biện',
    'Learning Strategies': 'Chiến lược học tập',
    'Monitoring': 'Giám sát',
    'Reading Comprehension': 'Đọc hiểu',
    'Science': 'Khoa học',
    'Speaking': 'Nói',
    'Writing': 'Viết',
    'Mathematics': 'Toán học',
    'Judgment and Decision Making': 'Phán đoán và Ra quyết định',
    'Coordination': 'Phối hợp',
    'Instructing': 'Hướng dẫn',
    'Negotiation': 'Đàm phán',
    'Persuasion': 'Thuyết phục',
    'Service Orientation': 'Định hướng dịch vụ',
    'Social Perceptiveness': 'Nhạy bén xã hội',
    'Time Management': 'Quản lý thời gian',
    'Management of Financial Resources': 'Quản lý tài chính',
    'Management of Material Resources': 'Quản lý vật tư',
    'Management of Personnel Resources': 'Quản lý nhân sự',
  };
  return translations[category] || category;
};

// Translate RIASEC dimensions
export const translateRIASEC = (key: string): string => {
  const translations: Record<string, string> = {
    'realistic': 'Thực tế',
    'investigative': 'Nghiên cứu',
    'artistic': 'Nghệ thuật',
    'social': 'Xã hội',
    'enterprising': 'Doanh nghiệp',
    'conventional': 'Quy ước',
  };
  return translations[key.toLowerCase()] || key;
};

// Translate Big Five dimensions
export const translateBigFive = (key: string): string => {
  const translations: Record<string, string> = {
    'openness': 'Cởi mở',
    'conscientiousness': 'Tận tâm',
    'extraversion': 'Hướng ngoại',
    'agreeableness': 'Dễ chịu',
    'neuroticism': 'Bất ổn',
  };
  return translations[key.toLowerCase()] || key;
};

// Translate severity levels
export const translateSeverity = (severity: string): string => {
  const translations: Record<string, string> = {
    'critical': 'Nghiêm trọng',
    'high': 'Cao',
    'medium': 'Trung bình',
    'low': 'Thấp',
    'info': 'Thông tin',
  };
  return translations[severity.toLowerCase()] || severity;
};

// Translate anomaly types
export const translateAnomalyType = (type: string): string => {
  const translations: Record<string, string> = {
    'security': 'Bảo mật',
    'ai_error': 'Lỗi AI',
    'performance': 'Hiệu suất',
    'unusual_activity': 'Hoạt động bất thường',
    'unusual_api_access': 'Truy cập API bất thường',
  };
  return translations[type.toLowerCase()] || type;
};

// Translate anomaly titles/descriptions
export const translateAnomalyText = (text: string): string => {
  const translations: Record<string, string> = {
    // Anomaly titles
    'Unusual API access pattern': 'Mẫu truy cập API bất thường',
    'Multiple failed login attempts': 'Nhiều lần đăng nhập thất bại',
    'AI recommendation timeout': 'Hết thời gian đề xuất AI',
    'Slow database query': 'Truy vấn cơ sở dữ liệu chậm',
    'High error rate detected': 'Phát hiện tỷ lệ lỗi cao',
    'Unusual user behavior': 'Hành vi người dùng bất thường',
    'System overload': 'Hệ thống quá tải',
    'API rate limit exceeded': 'Vượt quá giới hạn API',
    
    // Anomaly descriptions
    'API endpoint accessed 1000 times in 1 minute': 'Điểm cuối API được truy cập 1000 lần trong 1 phút',
    'User attempted to login 10 times with wrong password': 'Người dùng cố gắng đăng nhập 10 lần với mật khẩu sai',
    'Career recommendation took longer than 30 seconds': 'Đề xuất nghề nghiệp mất hơn 30 giây',
    'Query took 5 seconds to complete': 'Truy vấn mất 5 giây để hoàn thành',
    
    // Status labels
    'Operational': 'Hoạt động',
    'Good': 'Tốt',
    'Warning': 'Cảnh báo',
    'Error': 'Lỗi',
    'Resolve': 'Giải quyết',
    'Resolved': 'Đã giải quyết',
  };
  return translations[text] || text;
};

// Common admin text translations
export const adminText = {
  // Actions
  view: 'Xem',
  edit: 'Sửa',
  delete: 'Xóa',
  approve: 'Duyệt',
  reject: 'Từ chối',
  publish: 'Xuất bản',
  unpublish: 'Gỡ xuất bản',
  save: 'Lưu',
  cancel: 'Hủy',
  search: 'Tìm kiếm',
  filter: 'Lọc',
  export: 'Xuất',
  import: 'Nhập',
  refresh: 'Làm mới',
  create: 'Tạo mới',
  update: 'Cập nhật',
  add: 'Thêm',
  remove: 'Xóa bỏ',
  confirm: 'Xác nhận',
  
  // Table headers
  title: 'Tiêu đề',
  category: 'Danh mục',
  status: 'Trạng thái',
  date: 'Ngày tạo',
  author: 'Tác giả',
  actions: 'Hành động',
  name: 'Tên',
  description: 'Mô tả',
  type: 'Loại',
  
  // Messages
  confirmDelete: 'Bạn có chắc chắn muốn xóa?',
  deleteSuccess: 'Xóa thành công!',
  deleteError: 'Xóa thất bại!',
  saveSuccess: 'Lưu thành công!',
  saveError: 'Lưu thất bại!',
  approveSuccess: 'Duyệt thành công!',
  rejectSuccess: 'Từ chối thành công!',
  loading: 'Đang tải...',
  noData: 'Không có dữ liệu',
  noResults: 'Không tìm thấy kết quả',
  
  // Pagination
  showing: 'Hiển thị',
  of: 'của',
  results: 'kết quả',
  page: 'Trang',
  previous: 'Trước',
  next: 'Sau',
  
  // Form labels
  required: 'Bắt buộc',
  optional: 'Tùy chọn',
  
  // Question Management specific
  questionText: 'Nội dung câu hỏi',
  testType: 'Loại bài kiểm tra',
  dimension: 'Chiều hướng',
  questionType: 'Loại câu hỏi',
  allTypes: 'Tất cả loại',
  all: 'Tất cả',
  active: 'Hoạt động',
  inactive: 'Không hoạt động',
  
  // Career Management specific
  career: 'Nghề nghiệp',
  careers: 'Nghề nghiệp',
  skill: 'Kỹ năng',
  skills: 'Kỹ năng',
  salary: 'Mức lương',
  salaryRange: 'Khoảng lương',
  
  // Blog Management specific
  blog: 'Blog',
  blogs: 'Blog',
  post: 'Bài viết',
  posts: 'Bài viết',
  
  // User Management specific
  user: 'Người dùng',
  users: 'Người dùng',
  role: 'Vai trò',
  email: 'Email',
  password: 'Mật khẩu',
  fullName: 'Họ và tên',
};

// Translate audit log actions
export const translateAuditAction = (action: string): string => {
  const translations: Record<string, string> = {
    'login': 'Đăng nhập',
    'logout': 'Đăng xuất',
    'create_user': 'Tạo người dùng',
    'update_user': 'Cập nhật người dùng',
    'delete_user': 'Xóa người dùng',
    'create_career': 'Tạo nghề nghiệp',
    'update_career': 'Cập nhật nghề nghiệp',
    'delete_career': 'Xóa nghề nghiệp',
    'create_question': 'Tạo câu hỏi',
    'update_question': 'Cập nhật câu hỏi',
    'delete_question': 'Xóa câu hỏi',
    'create_skill': 'Tạo kỹ năng',
    'update_skill': 'Cập nhật kỹ năng',
    'delete_skill': 'Xóa kỹ năng',
    'create_blog': 'Tạo blog',
    'update_blog': 'Cập nhật blog',
    'delete_blog': 'Xóa blog',
    'payment_create': 'Tạo thanh toán',
    'payment_success': 'Thanh toán thành công',
    'payment_failed': 'Thanh toán thất bại',
    'update_settings': 'Cập nhật cài đặt',
    'change_password': 'Đổi mật khẩu',
    'reset_password': 'Đặt lại mật khẩu',
    'upload_file': 'Tải lên tệp',
    'delete_file': 'Xóa tệp',
    'export_data': 'Xuất dữ liệu',
    'import_data': 'Nhập dữ liệu',
  };
  return translations[action] || action;
};

// Translate resource types
export const translateResourceType = (resourceType: string): string => {
  const translations: Record<string, string> = {
    'user': 'Người dùng',
    'career': 'Nghề nghiệp',
    'skill': 'Kỹ năng',
    'question': 'Câu hỏi',
    'payment': 'Thanh toán',
    'settings': 'Cài đặt',
    'blog': 'Blog',
    'assessment': 'Đánh giá',
    'roadmap': 'Lộ trình',
    'notification': 'Thông báo',
  };
  return translations[resourceType] || resourceType;
};

// Translate industry categories
export const translateIndustryCategory = (category: string): string => {
  const translations: Record<string, string> = {
    'Technology': 'Công nghệ',
    'Healthcare': 'Y tế',
    'Finance': 'Tài chính',
    'Education': 'Giáo dục',
    'Engineering': 'Kỹ thuật',
    'Arts': 'Nghệ thuật',
    'Business': 'Kinh doanh',
    'Science': 'Khoa học',
    'Manufacturing': 'Sản xuất',
    'Retail': 'Bán lẻ',
    'Hospitality': 'Khách sạn',
    'Transportation': 'Vận tải',
    'Construction': 'Xây dựng',
    'Agriculture': 'Nông nghiệp',
    'Media': 'Truyền thông',
    'Legal': 'Pháp lý',
    'Government': 'Chính phủ',
    'Non-Profit': 'Phi lợi nhuận',
    'Other': 'Khác',
  };
  return translations[category] || category;
};

// Translate sync job status
export const translateSyncStatus = (status: string): string => {
  const translations: Record<string, string> = {
    'pending': 'Chờ xử lý',
    'running': 'Đang chạy',
    'completed': 'Hoàn thành',
    'failed': 'Thất bại',
    'success': 'Thành công',
    'error': 'Lỗi',
    'cancelled': 'Đã hủy',
  };
  return translations[status] || status;
};
