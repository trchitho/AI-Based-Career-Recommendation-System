# DTO schema trả về FE
from pydantic import BaseModel

class CareerOut(BaseModel):
    id: int
    title: str
