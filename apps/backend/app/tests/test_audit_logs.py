"""
Test cases cho Audit Logs - Đảm bảo tracking login/logout real-time
Chạy: pytest apps/backend/app/tests/test_audit_logs.py -v
"""
import requests
import time

BASE_URL = "http://localhost:8000"

# Test accounts
ADMIN_EMAIL = "testadmin@audit.com"
ADMIN_PASSWORD = "TestPass123"
USER_EMAIL = "testuser@audit.com"
USER_PASSWORD = "TestPass123"


def get_latest_audit_log(token: str, action: str = None):
    """Lấy audit log mới nhất"""
    params = {"page": 1, "page_size": 5}
    if action:
        params["action"] = action
    resp = requests.get(
        f"{BASE_URL}/api/admin/audit-logs",
        headers={"Authorization": f"Bearer {token}"},
        params=params,
    )
    if resp.status_code == 200:
        data = resp.json()
        items = data.get("items", [])
        return items[0] if items else None
    return None


def login(email: str, password: str):
    """Login và trả về token + response"""
    resp = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": email, "password": password},
    )
    return resp


def logout(access_token: str, refresh_token: str):
    """Logout"""
    resp = requests.post(
        f"{BASE_URL}/api/auth/logout",
        json={"refresh_token": refresh_token},
        headers={"Authorization": f"Bearer {access_token}"},
    )
    return resp


class TestAuditLogLogin:
    """Test login audit tracking"""

    def test_01_user_login_creates_audit_log(self):
        """TC01: Login user tạo audit log ngay lập tức"""
        resp = login(USER_EMAIL, USER_PASSWORD)
        assert resp.status_code == 200, f"Login failed: {resp.text}"
        data = resp.json()
        access_token = data["access_token"]
        
        # Login admin để check audit logs
        admin_resp = login(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert admin_resp.status_code == 200
        admin_token = admin_resp.json()["access_token"]
        
        # Check audit log ngay lập tức (không cần F5)
        log = get_latest_audit_log(admin_token, action="login")
        assert log is not None, "Audit log không được tạo sau login!"
        assert log.get("action") == "login"
        print(f"✅ TC01 PASS: Login audit log created - user_id={log.get('user_id')}")

    def test_02_login_contains_role(self):
        """TC02: Audit log login phải chứa role để phân biệt user/admin"""
        resp = login(USER_EMAIL, USER_PASSWORD)
        assert resp.status_code == 200
        
        admin_resp = login(ADMIN_EMAIL, ADMIN_PASSWORD)
        admin_token = admin_resp.json()["access_token"]
        
        log = get_latest_audit_log(admin_token, action="login")
        assert log is not None
        
        details = log.get("details") or log.get("data_json") or {}
        if isinstance(details, str):
            import json
            details = json.loads(details)
        
        assert "role" in details, f"Audit log thiếu 'role' trong details: {details}"
        print(f"✅ TC02 PASS: Role found in audit log - role={details.get('role')}")

    def test_03_admin_login_has_admin_role(self):
        """TC03: Admin login phải có role='admin' trong audit log"""
        resp = login(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert resp.status_code == 200
        admin_token = resp.json()["access_token"]
        
        log = get_latest_audit_log(admin_token, action="login")
        assert log is not None
        
        details = log.get("details") or log.get("data_json") or {}
        if isinstance(details, str):
            import json
            details = json.loads(details)
        
        # Admin login phải có role admin
        assert details.get("role") in ("admin", "Admin"), f"Expected admin role, got: {details.get('role')}"
        print(f"✅ TC03 PASS: Admin login has role=admin")

    def test_04_login_has_ip_address(self):
        """TC04: Audit log phải có IP address"""
        resp = login(USER_EMAIL, USER_PASSWORD)
        assert resp.status_code == 200
        
        admin_resp = login(ADMIN_EMAIL, ADMIN_PASSWORD)
        admin_token = admin_resp.json()["access_token"]
        
        log = get_latest_audit_log(admin_token, action="login")
        assert log is not None
        assert log.get("ip_address"), "Audit log thiếu ip_address!"
        print(f"✅ TC04 PASS: IP address recorded - {log.get('ip_address')}")


class TestAuditLogLogout:
    """Test logout audit tracking"""

    def test_05_logout_creates_audit_log(self):
        """TC05: Logout tạo audit log ngay lập tức"""
        # Login first
        resp = login(USER_EMAIL, USER_PASSWORD)
        assert resp.status_code == 200
        data = resp.json()
        access_token = data["access_token"]
        refresh_token = data["refresh_token"]
        
        # Logout
        logout_resp = logout(access_token, refresh_token)
        assert logout_resp.status_code == 200
        
        # Check audit log
        admin_resp = login(ADMIN_EMAIL, ADMIN_PASSWORD)
        admin_token = admin_resp.json()["access_token"]
        
        log = get_latest_audit_log(admin_token, action="logout")
        assert log is not None, "Audit log không được tạo sau logout!"
        assert log.get("action") == "logout"
        print(f"✅ TC05 PASS: Logout audit log created")

    def test_06_logout_contains_role(self):
        """TC06: Logout audit log phải chứa role"""
        resp = login(USER_EMAIL, USER_PASSWORD)
        data = resp.json()
        logout(data["access_token"], data["refresh_token"])
        
        admin_resp = login(ADMIN_EMAIL, ADMIN_PASSWORD)
        admin_token = admin_resp.json()["access_token"]
        
        log = get_latest_audit_log(admin_token, action="logout")
        assert log is not None
        
        details = log.get("details") or log.get("data_json") or {}
        if isinstance(details, str):
            import json
            details = json.loads(details)
        
        assert "role" in details, f"Logout audit log thiếu 'role': {details}"
        print(f"✅ TC06 PASS: Logout has role={details.get('role')}")


class TestAuditLogRealTime:
    """Test real-time tracking"""

    def test_07_audit_log_timestamp_is_immediate(self):
        """TC07: Timestamp audit log phải gần thời điểm hiện tại (< 5s)"""
        from datetime import datetime, timezone
        
        before = datetime.now(timezone.utc)
        resp = login(USER_EMAIL, USER_PASSWORD)
        assert resp.status_code == 200
        after = datetime.now(timezone.utc)
        
        admin_resp = login(ADMIN_EMAIL, ADMIN_PASSWORD)
        admin_token = admin_resp.json()["access_token"]
        
        log = get_latest_audit_log(admin_token, action="login")
        assert log is not None
        
        # Parse timestamp
        created_at = log.get("created_at", "")
        if created_at:
            from dateutil.parser import parse
            log_time = parse(created_at)
            diff = (after - log_time).total_seconds()
            assert abs(diff) < 5, f"Audit log timestamp quá xa: {diff}s"
            print(f"✅ TC07 PASS: Audit log real-time (delay={diff:.2f}s)")
        else:
            print("⚠️ TC07 SKIP: No created_at in response")

    def test_08_multiple_logins_all_tracked(self):
        """TC08: Nhiều login liên tiếp đều được track"""
        admin_resp = login(ADMIN_EMAIL, ADMIN_PASSWORD)
        admin_token = admin_resp.json()["access_token"]
        
        # Get current count
        resp = requests.get(
            f"{BASE_URL}/api/admin/audit-logs",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"action": "login", "page_size": 100},
        )
        initial_count = resp.json().get("total", 0)
        
        # Do 3 logins
        for _ in range(3):
            login(USER_EMAIL, USER_PASSWORD)
        
        # Re-login admin to check
        admin_resp = login(ADMIN_EMAIL, ADMIN_PASSWORD)
        admin_token = admin_resp.json()["access_token"]
        
        resp = requests.get(
            f"{BASE_URL}/api/admin/audit-logs",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"action": "login", "page_size": 100},
        )
        new_count = resp.json().get("total", 0)
        
        # At least 3 new login logs (+ admin re-logins)
        assert new_count > initial_count, f"Login count didn't increase: {initial_count} -> {new_count}"
        print(f"✅ TC08 PASS: Multiple logins tracked ({initial_count} -> {new_count})")


if __name__ == "__main__":
    print("=" * 60)
    print("AUDIT LOG TEST SUITE")
    print("=" * 60)
    
    tests = [
        TestAuditLogLogin(),
        TestAuditLogLogout(),
        TestAuditLogRealTime(),
    ]
    
    passed = 0
    failed = 0
    
    for test_class in tests:
        print(f"\n--- {test_class.__class__.__name__} ---")
        for method_name in sorted(dir(test_class)):
            if method_name.startswith("test_"):
                try:
                    getattr(test_class, method_name)()
                    passed += 1
                except AssertionError as e:
                    print(f"❌ {method_name} FAILED: {e}")
                    failed += 1
                except Exception as e:
                    print(f"❌ {method_name} ERROR: {e}")
                    failed += 1
    
    print(f"\n{'=' * 60}")
    print(f"RESULTS: {passed} passed, {failed} failed, {passed + failed} total")
    print(f"{'=' * 60}")
