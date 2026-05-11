from sqlalchemy import TIMESTAMP, BigInteger, Boolean, Column, Integer, Numeric, Text, func
from sqlalchemy.dialects.postgresql import JSONB

from ...core.db import Base


class AssessmentForm(Base):
    __tablename__ = "assessment_forms"
    __table_args__ = {"schema": "core"}

    id = Column(BigInteger, primary_key=True)
    code = Column(Text, nullable=False)
    title = Column(Text, nullable=False)
    form_type = Column(Text, nullable=False)  # 'RIASEC' | 'BigFive'
    lang = Column(Text, nullable=True)
    version = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())


class AssessmentQuestion(Base):
    __tablename__ = "assessment_questions"
    __table_args__ = {"schema": "core"}

    id            = Column(BigInteger, primary_key=True)
    form_id       = Column(BigInteger)
    question_no   = Column(Integer)
    question_key  = Column(Text)
    prompt_en     = Column(Text, nullable=False)
    prompt_vi     = Column(Text, nullable=False)
    options_json  = Column(JSONB)
    reverse_score = Column(Boolean, default=False)
    created_at    = Column(TIMESTAMP(timezone=True), server_default=func.now())

    @property
    def prompt(self) -> str:
        """Backward-compatible property that returns Vietnamese prompt by default."""
        return self.prompt_vi or self.prompt_en or ""
    
    @prompt.setter
    def prompt(self, value: str) -> None:
        """Backward-compatible setter that updates Vietnamese prompt."""
        self.prompt_vi = value

    def get_prompt(self, lang: str = "vi") -> str:
        return self.prompt_vi if lang == "vi" else self.prompt_en

    def to_client(self, lang: str = "vi") -> dict:
        opts_src = self.options_json or {}
        # Chọn options theo lang
        if isinstance(opts_src, dict):
            if lang == "vi" and "options_vi" in opts_src:
                opts = opts_src["options_vi"]
            elif "options" in opts_src:
                opts = opts_src["options"]
            else:
                opts = None
        elif isinstance(opts_src, list):
            opts = opts_src
        else:
            opts = None

        qtype = "MULTIPLE_CHOICE" if opts else "SCALE"
        
        # Use Vietnamese prompt by default, fallback to English
        question_text = self.prompt_vi or self.prompt_en or ""

        return {
            "id":            str(self.id),
            "test_type":     None,   # fill ở service
            "question_text": self.get_prompt(lang),
            "question_type": qtype,
            "options":       opts,
            "dimension":     self.question_key,
            "order_index":   self.question_no or 0,
            "reverse_score": self.reverse_score,
        }


class Assessment(Base):
    __tablename__ = "assessments"
    __table_args__ = {"schema": "core"}

    id = Column(BigInteger, primary_key=True)
    user_id = Column(BigInteger, nullable=False)
    a_type = Column(Text, nullable=False)  # 'RIASEC' | 'BigFive'
    scores = Column(JSONB, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    session_id = Column(BigInteger)
    test_mode = Column(Text, nullable=True)        # 'traditional' | 'story' | 'enhanced'
    
    # Processed results fields for persistence
    processed_riasec_scores = Column(JSONB, nullable=True)
    processed_big_five_scores = Column(JSONB, nullable=True)
    top_interest = Column(Text, nullable=True)
    career_recommendations = Column(JSONB, nullable=True)
    essay_analysis = Column(JSONB, nullable=True)


class AssessmentSession(Base):
    __tablename__ = "assessment_sessions"
    __table_args__ = {"schema": "core"}

    id = Column(BigInteger, primary_key=True)
    user_id = Column(BigInteger, nullable=False)
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
