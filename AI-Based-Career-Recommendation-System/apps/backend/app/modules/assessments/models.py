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
        return {
            "id": str(self.id),
            "test_type": None,  # filled at service level if needed
            "question_text": self.prompt,
            "question_type": "SCALE" if not self.options_json else "MULTIPLE_CHOICE",
            "options": self.options_json or None,
            "dimension": None,
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

