from sqlalchemy import Column, BigInteger, Text, Integer, Boolean, TIMESTAMP, Numeric, func
from sqlalchemy.dialects.postgresql import JSONB
from ...core.db import Base


class AssessmentForm(Base):
    __tablename__ = "assessment_forms"
    __table_args__ = {"schema": "core"}

    id = Column(BigInteger, primary_key=True)
    code = Column(Text)
    title = Column(Text)
    form_type = Column(Text, nullable=False)
    lang = Column(Text)
    version = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())


class AssessmentQuestion(Base):
    __tablename__ = "assessment_questions"
    __table_args__ = {"schema": "core"}

    id = Column(BigInteger, primary_key=True)
    form_id = Column(BigInteger)
    question_no = Column(Integer)
    question_key = Column(Text)
    prompt = Column(Text, nullable=False)
    options_json = Column(JSONB)
    reverse_score = Column(Boolean)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    def to_client(self):
        # Normalize options: only expose list options; structured objects (e.g., scale descriptors)
        # should be treated as SCALE questions on the FE.
        opts = self.options_json if isinstance(self.options_json, list) else None
        qtype = "MULTIPLE_CHOICE" if opts else "SCALE"
        return {
            "id": str(self.id),
            "test_type": None,  # filled at service level if needed
            "question_text": self.prompt,
            "question_type": qtype,
            "options": opts,
            "dimension": self.question_key,
            "order_index": self.question_no or 0,
        }


class Assessment(Base):
    __tablename__ = "assessments"
    __table_args__ = {"schema": "core"}

    id = Column(BigInteger, primary_key=True)
    user_id = Column(BigInteger, nullable=False)
    a_type = Column(Text, nullable=False)  # DB enum; map as text
    scores = Column(JSONB, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())


class AssessmentResponse(Base):
    __tablename__ = "assessment_responses"
    __table_args__ = {"schema": "core"}

    id = Column(BigInteger, primary_key=True)
    assessment_id = Column(BigInteger)
    question_id = Column(BigInteger)
    question_key = Column(Text)
    answer_raw = Column(Text)
    score_value = Column(Numeric(6, 3))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())


class UserFeedback(Base):
    __tablename__ = "user_feedback"
    __table_args__ = {"schema": "core"}

    id = Column(BigInteger, primary_key=True)
    user_id = Column(BigInteger, nullable=False)
    assessment_id = Column(BigInteger)
    rating = Column(Integer)
    comment = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
