# app/core/exceptions.py

class NotFoundError(Exception):
    """Domain-level 'not found' error (không gắn HTTP ở đây)."""

    def __init__(self, message: str = "Not found"):
        self.message = message
        super().__init__(message)
