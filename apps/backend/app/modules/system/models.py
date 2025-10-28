from sqlalchemy import Column, BigInteger, Text, TIMESTAMP, func
from ...core.db import Base


class AppSettings(Base):
    __tablename__ = "app_settings"
    __table_args__ = {"schema": "core"}

    id = Column(BigInteger, primary_key=True)
    logo_url = Column(Text)
    app_title = Column(Text)
    app_name = Column(Text)
    footer_html = Column(Text)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_by = Column(BigInteger)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "logo_url": self.logo_url,
            "app_title": self.app_title,
            "app_name": self.app_name,
            "footer_html": self.footer_html,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "updated_by": self.updated_by,
        }

