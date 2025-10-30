# Pydantic models nội bộ
from pydantic import BaseModel

apps / backend / app / __init__.py
apps / backend / app / core / __init__.py
apps / backend / app / modules / __init__.py
apps / backend / app / modules / users / __init__.py


class UserSchema(BaseModel):
    id: int
    name: str
