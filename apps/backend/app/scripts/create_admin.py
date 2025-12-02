import os
import datetime

from sqlalchemy.orm import sessionmaker

from ..core.db import engine
from ..core.security import hash_password
from ..modules.users.models import User


def main():
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    session = Session()
    try:
        email = os.getenv("ADMIN_EMAIL", "admin@example.com").strip().lower()
        password = os.getenv("ADMIN_PASSWORD", "Admin12345")
        full_name = os.getenv("ADMIN_FULL_NAME", "Administrator")

        exists = session.query(User).filter(User.email == email).first()
        if exists:
            print(f"Admin already exists: {email}")
            return

        u = User(
            email=email,
            password_hash=hash_password(password),
            full_name=full_name,
            role="admin",
            is_locked=False,
            is_email_verified=True,
            email_verified_at=datetime.datetime.now(datetime.timezone.utc),
        )
        session.add(u)
        session.commit()
        print(f"Created admin: {email}")
    finally:
        session.close()


if __name__ == "__main__":
    main()
