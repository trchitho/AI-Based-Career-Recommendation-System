import { useState, useEffect } from "react";
import api from "../../lib/api";

interface AdminNotification {
  id: number;
  user_id?: number;
  user_email?: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  severity: string;
  is_read: boolean;
  created_at: string;
}

const AdminNotificationsPage = () => {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<{ type?: string | undefined; is_read?: boolean | undefined }>({});
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Create notification modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newNotification, setNewNotification] = useState({
    type: "system",
    title: "",
    message: "",
    link: "",
    user_id: "" as string | number,
    send_to_all: false,
  });
  const [users, setUsers] = useState<{ id: number; email: string; full_name?: string }[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  const notificationTypes = [
    { value: "", label: "Tất cả" },
    { value: "new_user", label: "Người dùng mới" },
    { value: "payment", label: "Thanh toán" },
    { value: "assessment", label: "Bài test" },
    { value: "anomaly", label: "Bất thường" },
    { value: "system", label: "Hệ thống" },
  ];

  useEffect(() => {
    loadNotifications();
  }, [filter, page]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        limit: pageSize,
        offset: (page - 1) * pageSize,
      };
      if (filter.type) params["type"] = filter.type;
      if (filter.is_read !== undefined) params["is_read"] = filter.is_read;

      const res = await api.get("/api/admin/notifications", { params });
      setNotifications(res.data.items || []);
      setTotal(res.data.total || 0);
      setUnreadCount(res.data.unread_count || 0);
    } catch (err) {
      console.error("Error loading notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await api.put(`/api/admin/notifications/${id}/read`);
      loadNotifications();
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put("/api/admin/notifications/read-all");
      loadNotifications();
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  const deleteNotification = async (id: number) => {
    if (!confirm("Are you sure you want to delete this notification?")) return;
    try {
      await api.delete(`/api/admin/notifications/${id}`);
      loadNotifications();
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  // Search users for notification
  const searchUsers = async (query: string) => {
    if (!query || query.length < 2) {
      setUsers([]);
      return;
    }
    try {
      setSearchingUsers(true);
      const res = await api.get("/api/admin/users", { 
        params: { search: query, limit: 10 } 
      });
      setUsers(res.data.items || res.data || []);
    } catch (err) {
      console.error("Error searching users:", err);
    } finally {
      setSearchingUsers(false);
    }
  };

  // Debounce user search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (userSearch) {
        searchUsers(userSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch]);

  // Create notification
  const handleCreateNotification = async () => {
    if (!newNotification.title.trim()) {
      alert("Vui lòng nhập tiêu đề thông báo");
      return;
    }
    if (!newNotification.send_to_all && !newNotification.user_id) {
      alert("Vui lòng chọn người nhận hoặc gửi cho tất cả");
      return;
    }

    try {
      setCreating(true);
      
      if (newNotification.send_to_all) {
        // Send to all users
        await api.post("/api/admin/notifications/broadcast", {
          type: newNotification.type,
          title: newNotification.title,
          message: newNotification.message,
          link: newNotification.link || null,
        });
      } else {
        // Send to specific user
        await api.post("/api/admin/notifications", {
          type: newNotification.type,
          title: newNotification.title,
          message: newNotification.message,
          link: newNotification.link || null,
          user_id: Number(newNotification.user_id),
        });
      }

      setShowCreateModal(false);
      setNewNotification({
        type: "system",
        title: "",
        message: "",
        link: "",
        user_id: "",
        send_to_all: false,
      });
      setUserSearch("");
      setUsers([]);
      loadNotifications();
      alert("Đã gửi thông báo thành công!");
    } catch (err) {
      console.error("Error creating notification:", err);
      alert("Không thể gửi thông báo. Vui lòng thử lại.");
    } finally {
      setCreating(false);
    }
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case "success":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 border-green-200 dark:border-green-800";
      case "warning":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800";
      case "error":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 border-red-200 dark:border-red-800";
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "new_user":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        );
      case "payment":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        );
      case "assessment":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        );
      case "anomaly":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString("vi-VN");
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Thông báo Admin</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : "Không có thông báo mới"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tạo thông báo
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Đánh dấu tất cả đã đọc
            </button>
          )}
        </div>
      </div>

      {/* Create Notification Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold dark:text-white">Tạo thông báo mới</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Loại thông báo
                </label>
                <select
                  value={newNotification.type}
                  onChange={(e) => setNewNotification({ ...newNotification, type: e.target.value })}
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="system">Hệ thống</option>
                  <option value="payment">Thanh toán</option>
                  <option value="assessment">Bài test</option>
                  <option value="promotion">Khuyến mãi</option>
                  <option value="announcement">Thông báo chung</option>
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tiêu đề *
                </label>
                <input
                  type="text"
                  value={newNotification.title}
                  onChange={(e) => setNewNotification({ ...newNotification, title: e.target.value })}
                  placeholder="Nhập tiêu đề thông báo..."
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nội dung
                </label>
                <textarea
                  value={newNotification.message}
                  onChange={(e) => setNewNotification({ ...newNotification, message: e.target.value })}
                  placeholder="Nhập nội dung thông báo..."
                  rows={3}
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Link */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Link (tùy chọn)
                </label>
                <input
                  type="text"
                  value={newNotification.link}
                  onChange={(e) => setNewNotification({ ...newNotification, link: e.target.value })}
                  placeholder="/pricing hoặc https://..."
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Send to all checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="send_to_all"
                  checked={newNotification.send_to_all}
                  onChange={(e) => setNewNotification({ 
                    ...newNotification, 
                    send_to_all: e.target.checked,
                    user_id: e.target.checked ? "" : newNotification.user_id 
                  })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="send_to_all" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Gửi cho tất cả người dùng
                </label>
              </div>

              {/* User selection (if not send to all) */}
              {!newNotification.send_to_all && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Người nhận *
                  </label>
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Tìm kiếm theo email..."
                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                  {searchingUsers && (
                    <p className="text-sm text-gray-500 mt-1">Đang tìm kiếm...</p>
                  )}
                  {users.length > 0 && (
                    <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
                      {users.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => {
                            setNewNotification({ ...newNotification, user_id: user.id });
                            setUserSearch(user.email);
                            setUsers([]);
                          }}
                          className={`w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-sm ${
                            newNotification.user_id === user.id ? "bg-blue-50 dark:bg-blue-900/20" : ""
                          }`}
                        >
                          <div className="font-medium dark:text-white">{user.email}</div>
                          {user.full_name && (
                            <div className="text-gray-500 text-xs">{user.full_name}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {newNotification.user_id && (
                    <p className="text-sm text-green-600 mt-1">
                      Đã chọn: User #{newNotification.user_id}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateNotification}
                disabled={creating}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {creating ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang gửi...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    {newNotification.send_to_all ? "Gửi cho tất cả" : "Gửi thông báo"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Loại thông báo
            </label>
            <select
              value={filter.type || ""}
              onChange={(e) => setFilter({ ...filter, type: e.target.value || undefined })}
              className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              {notificationTypes.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Trạng thái
            </label>
            <select
              value={filter.is_read === undefined ? "" : filter.is_read ? "true" : "false"}
              onChange={(e) => {
                const val = e.target.value;
                setFilter({ 
                  ...filter, 
                  is_read: val === "" ? undefined : val === "true" 
                });
              }}
              className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Tất cả</option>
              <option value="false">Chưa đọc</option>
              <option value="true">Đã đọc</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => { setFilter({}); setPage(1); }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              Xóa bộ lọc
            </button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            Đang tải...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Không có thông báo nào
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                  !notification.is_read ? "bg-blue-50/50 dark:bg-blue-900/10" : ""
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`p-2 rounded-full ${getSeverityStyle(notification.severity)}`}>
                    {getTypeIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-semibold ${!notification.is_read ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"}`}>
                        {notification.title}
                      </h3>
                      {!notification.is_read && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-500">
                      <span>{formatDate(notification.created_at)}</span>
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                        {notificationTypes.find(t => t.value === notification.type)?.label || notification.type}
                      </span>
                      {notification.user_email && (
                        <span className="text-blue-600 dark:text-blue-400">
                          {notification.user_email}
                        </span>
                      )}
                      {notification.link && (
                        <a 
                          href={notification.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-green-600 dark:text-green-400 hover:underline flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Xem chi tiết
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {!notification.is_read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                        title="Đánh dấu đã đọc"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      title="Xóa"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Trang {page} / {totalPages} ({total} thông báo)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Trước
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminNotificationsPage;
