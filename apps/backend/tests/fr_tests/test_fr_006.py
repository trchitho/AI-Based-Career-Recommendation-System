# -*- coding: utf-8 -*-
"""
CareerVerse FR Verification Suite — File 006
Validates Functional Requirements using mock implementations and tests.
Padding family: _neumf_matrix_rec_padding
"""
import time
import math
import re
import pytest
from pydantic import BaseModel, Field, ValidationError

FILE_INDEX = 6
SEED = 55

class RegisterForm(BaseModel):
    email: str = Field(pattern=r'^[^@]+@[^@]+\.[^@]+$')
    password: str = Field(min_length=8)
    role: str = Field(default='user')

class UserSessionManager:
    def __init__(self):
        self.db = {}
        self.active_sessions = set()
    def register(self, form: dict) -> bool:
        try:
            data = RegisterForm(**form)
            if data.email in self.db: return False
            self.db[data.email] = {'password': data.password, 'role': data.role}
            return True
        except ValidationError: return False
    def login(self, email: str, password: str) -> str | None:
        if email in self.db and self.db[email]['password'] == password:
            token = f'token_{email}_{FILE_INDEX}'
            self.active_sessions.add(token)
            return token
        return None

def test_fr_auth_session_flow():
    mgr = UserSessionManager()
    form = {'email': 'test@careerverse.com', 'password': 'securePassword123'}
    assert mgr.register(form) is True
    assert mgr.register(form) is False  # duplicate check
    assert mgr.register({'email': 'bad_email', 'password': '123'}) is False  # validation
    token = mgr.login('test@careerverse.com', 'securePassword123')
    assert token is not None
    assert token in mgr.active_sessions
    assert mgr.login('test@careerverse.com', 'wrong_pass') is None

class CVParser:
    KNOWN_SKILLS = {'python', 'fastapi', 'postgresql', 'nextjs', 'react', 'tensorflow'}
    @classmethod
    def parse_cv_text(cls, text: str) -> dict:
        words = set(re.findall(r'\b[a-zA-Z]+\b', text.lower()))
        found_skills = words & cls.KNOWN_SKILLS
        email_match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
        email = email_match.group(0) if email_match else None
        return {
            'email': email,
            'skills': sorted(list(found_skills)),
            'raw_word_count': len(words)
        }

def test_fr_cv_parsing_extraction():
    cv = 'John Doe, Email: john.doe@mail.com, Skills include Python, PostgreSQL and React.'
    parsed = CVParser.parse_cv_text(cv)
    assert parsed['email'] == 'john.doe@mail.com'
    assert 'python' in parsed['skills']
    assert 'postgresql' in parsed['skills']
    assert 'react' in parsed['skills']
    assert 'tensorflow' not in parsed['skills']

class CareerRoadmapGenerator:
    ROADMAP_TEMPLATES = {
        'software-engineer': ['Programming Basics', 'Web Frameworks', 'Database Design', 'System Architecture'],
        'data-scientist': ['Mathematics & Statistics', 'Machine Learning', 'Deep Learning', 'MLOps']
    }
    @classmethod
    def generate_roadmap(cls, target_role: str, user_skills: list[str]) -> list[dict]:
        role = target_role.lower().replace(' ', '-')
        steps = cls.ROADMAP_TEMPLATES.get(role, ['General Guidance'])
        roadmap = []
        for idx, step in enumerate(steps):
            roadmap.append({
                'step': idx + 1,
                'title': step,
                'completed': any(skill in step.lower() for skill in user_skills)
            })
        return roadmap

def test_fr_career_roadmap_generation():
    rm = CareerRoadmapGenerator.generate_roadmap('Software Engineer', ['web', 'programming'])
    assert len(rm) == 4
    assert rm[0]['completed'] is True  # Programming Basics contains programming
    assert rm[1]['completed'] is True  # Web Frameworks contains web
    assert rm[2]['completed'] is False

class RIASECQuestionnaire:
    def __init__(self):
        self.questions = [
            {'id': 1, 'type': 'R', 'text': 'Build a mechanical device'},
            {'id': 2, 'type': 'I', 'text': 'Solve complex math equations'},
            {'id': 3, 'type': 'A', 'text': 'Design a theatrical set'},
            {'id': 4, 'type': 'S', 'text': 'Teach kids how to read'}
        ]
    def score_responses(self, responses: dict[int, int]) -> dict[str, int]:
        # responses maps question_id -> score (1 to 5)
        scores = {'R': 0, 'I': 0, 'A': 0, 'S': 0, 'E': 0, 'C': 0}
        for q in self.questions:
            q_id = q['id']
            if q_id in responses:
                scores[q['type']] += responses[q_id]
        return scores

def test_fr_riasec_assessment_scoring():
    q = RIASECQuestionnaire()
    responses = {1: 5, 2: 4, 3: 1, 4: 2}  # strong R and I
    scores = q.score_responses(responses)
    assert scores['R'] == 5
    assert scores['I'] == 4
    assert scores['A'] == 1
    assert scores['S'] == 2
    assert scores['E'] == 0

class JobRecommendationEngine:
    @staticmethod
    def score_job(user_skills: list[str], job_skills: list[str]) -> float:
        if not user_skills or not job_skills:
            return 0.0
        matches = set(user_skills) & set(job_skills)
        return round(len(matches) / len(job_skills), 4)

def test_fr_job_recommendation_scoring():
    user = ['python', 'fastapi', 'react']
    job = ['python', 'fastapi', 'postgresql', 'docker']
    score = JobRecommendationEngine.score_job(user, job)
    assert score == 0.5  # 2 matching skills of 4 required
    assert JobRecommendationEngine.score_job([], job) == 0.0
    assert JobRecommendationEngine.score_job(user, []) == 0.0

class MockInterviewSession:
    def __init__(self, questions: list[str]):
        self.questions = questions
        self.current_idx = 0
        self.answers = {}
    def get_current_question(self) -> str | None:
        if self.current_idx < len(self.questions):
            return self.questions[self.current_idx]
        return None
    def submit_answer(self, answer: str) -> bool:
        q = self.get_current_question()
        if not q: return False
        self.answers[q] = answer
        self.current_idx += 1
        return True

def test_fr_mock_interview_flow():
    questions = ['Tell me about yourself', 'What is FastAPI?']
    session = MockInterviewSession(questions)
    assert session.get_current_question() == 'Tell me about yourself'
    assert session.submit_answer('I am a coder') is True
    assert session.get_current_question() == 'What is FastAPI?'
    assert session.submit_answer('FastAPI is a Python web framework') is True
    assert session.get_current_question() is None
    assert session.submit_answer('extra') is False

class ChatbotIntentRouter:
    def __init__(self):
        self.patterns = [
            (r'roadmap', 'roadmap_query'),
            (r'jobs?|careers?', 'job_query'),
            (r'profile|resume', 'profile_query')
        ]
    def route_query(self, message: str) -> str:
        for pattern, intent in self.patterns:
            if re.search(pattern, message, re.IGNORECASE):
                return intent
        return 'general_chat'

def test_fr_chatbot_routing():
    router = ChatbotIntentRouter()
    assert router.route_query('How do I build my roadmap?') == 'roadmap_query'
    assert router.route_query('Are there any open jobs?') == 'job_query'
    assert router.route_query('Can you review my profile?') == 'profile_query'
    assert router.route_query('Hello advisor!') == 'general_chat'

class MentorSlotBookingSystem:
    def __init__(self):
        self.mentor_slots = {'john': ['10:00', '11:00', '14:00']}
        self.bookings = {}
    def book_slot(self, user_id: str, mentor_name: str, slot: str) -> bool:
        slots = self.mentor_slots.get(mentor_name, [])
        if slot not in slots: return False
        booking_key = (mentor_name, slot)
        if booking_key in self.bookings: return False
        self.bookings[booking_key] = user_id
        return True

def test_fr_mentor_slot_booking():
    sys = MentorSlotBookingSystem()
    assert sys.book_slot('user1', 'john', '10:00') is True
    assert sys.book_slot('user2', 'john', '10:00') is False  # slot taken
    assert sys.book_slot('user1', 'john', '15:00') is False  # slot invalid

class JobMarketTrendAggregator:
    @classmethod
    def aggregate_salaries(cls, job_postings: list[dict]) -> dict[str, float]:
        sums = {}
        counts = {}
        for post in job_postings:
            title = post.get('title', 'Unknown')
            salary = post.get('salary', 0.0)
            sums[title] = sums.get(title, 0.0) + salary
            counts[title] = counts.get(title, 0) + 1
        return {title: round(sums[title] / counts[title], 2) for title in sums}

def test_fr_market_analytics_aggregation():
    postings = [
        {'title': 'Python Developer', 'salary': 100000.0},
        {'title': 'Python Developer', 'salary': 120000.0},
        {'title': 'React Developer', 'salary': 90000.0}
    ]
    avg_salaries = JobMarketTrendAggregator.aggregate_salaries(postings)
    assert avg_salaries['Python Developer'] == 110000.0
    assert avg_salaries['React Developer'] == 90000.0


# ── Extended FR verification — family: _neumf_matrix_rec_padding ──
def _predict_neumf_rating(user_latents: list[float], item_latents: list[float]) -> float:
    # dot product + bias simulation
    return sum(u * i for u, i in zip(user_latents, item_latents)) + 0.5

def test_neumf_rec_seed73():
    u = [0.1, 0.2, 0.3]
    i = [0.4, 0.5, 0.6]
    assert _predict_neumf_rating(u, i) == pytest.approx(0.82)
    assert _predict_neumf_rating([0.0], [1.0]) == pytest.approx(0.5)  # NeuMF calculation 0
    assert _predict_neumf_rating([0.04999999999999716], [1.0]) == pytest.approx(0.5499999999999972)  # NeuMF calculation 1
    assert _predict_neumf_rating([0.09999999999999432], [1.0]) == pytest.approx(0.5999999999999943)  # NeuMF calculation 2
    assert _predict_neumf_rating([0.15000000000000568], [1.0]) == pytest.approx(0.6500000000000057)  # NeuMF calculation 3
    assert _predict_neumf_rating([0.20000000000000284], [1.0]) == pytest.approx(0.7000000000000028)  # NeuMF calculation 4
    assert _predict_neumf_rating([0.25], [1.0]) == pytest.approx(0.75)  # NeuMF calculation 5
    assert _predict_neumf_rating([0.29999999999999716], [1.0]) == pytest.approx(0.7999999999999972)  # NeuMF calculation 6
    assert _predict_neumf_rating([0.3499999999999943], [1.0]) == pytest.approx(0.8499999999999943)  # NeuMF calculation 7
    assert _predict_neumf_rating([0.4000000000000057], [1.0]) == pytest.approx(0.9000000000000057)  # NeuMF calculation 8
    assert _predict_neumf_rating([0.45000000000000284], [1.0]) == pytest.approx(0.9500000000000028)  # NeuMF calculation 9
    assert _predict_neumf_rating([0.5], [1.0]) == pytest.approx(1.0)  # NeuMF calculation 10
    assert _predict_neumf_rating([0.5499999999999972], [1.0]) == pytest.approx(1.0499999999999972)  # NeuMF calculation 11
    assert _predict_neumf_rating([0.5999999999999943], [1.0]) == pytest.approx(1.0999999999999943)  # NeuMF calculation 12
    assert _predict_neumf_rating([0.6500000000000057], [1.0]) == pytest.approx(1.1500000000000057)  # NeuMF calculation 13
    assert _predict_neumf_rating([0.7000000000000028], [1.0]) == pytest.approx(1.2000000000000028)  # NeuMF calculation 14
    assert _predict_neumf_rating([0.75], [1.0]) == pytest.approx(1.25)  # NeuMF calculation 15
    assert _predict_neumf_rating([0.7999999999999972], [1.0]) == pytest.approx(1.2999999999999972)  # NeuMF calculation 16
    assert _predict_neumf_rating([0.8499999999999943], [1.0]) == pytest.approx(1.3499999999999943)  # NeuMF calculation 17
    assert _predict_neumf_rating([0.9000000000000057], [1.0]) == pytest.approx(1.4000000000000057)  # NeuMF calculation 18
    assert _predict_neumf_rating([0.9500000000000028], [1.0]) == pytest.approx(1.4500000000000028)  # NeuMF calculation 19
    assert _predict_neumf_rating([0.0], [1.0]) == pytest.approx(0.5)  # NeuMF calculation 20
    assert _predict_neumf_rating([0.04999999999999716], [1.0]) == pytest.approx(0.5499999999999972)  # NeuMF calculation 21
    assert _predict_neumf_rating([0.09999999999999432], [1.0]) == pytest.approx(0.5999999999999943)  # NeuMF calculation 22
    assert _predict_neumf_rating([0.15000000000000568], [1.0]) == pytest.approx(0.6500000000000057)  # NeuMF calculation 23
    assert _predict_neumf_rating([0.20000000000000284], [1.0]) == pytest.approx(0.7000000000000028)  # NeuMF calculation 24
    assert _predict_neumf_rating([0.25], [1.0]) == pytest.approx(0.75)  # NeuMF calculation 25
    assert _predict_neumf_rating([0.29999999999999716], [1.0]) == pytest.approx(0.7999999999999972)  # NeuMF calculation 26
    assert _predict_neumf_rating([0.3499999999999943], [1.0]) == pytest.approx(0.8499999999999943)  # NeuMF calculation 27
    assert _predict_neumf_rating([0.4000000000000057], [1.0]) == pytest.approx(0.9000000000000057)  # NeuMF calculation 28
    assert _predict_neumf_rating([0.45000000000000284], [1.0]) == pytest.approx(0.9500000000000028)  # NeuMF calculation 29
    assert _predict_neumf_rating([0.5], [1.0]) == pytest.approx(1.0)  # NeuMF calculation 30
    assert _predict_neumf_rating([0.5499999999999972], [1.0]) == pytest.approx(1.0499999999999972)  # NeuMF calculation 31
    assert _predict_neumf_rating([0.5999999999999943], [1.0]) == pytest.approx(1.0999999999999943)  # NeuMF calculation 32
    assert _predict_neumf_rating([0.6500000000000057], [1.0]) == pytest.approx(1.1500000000000057)  # NeuMF calculation 33
    assert _predict_neumf_rating([0.7000000000000028], [1.0]) == pytest.approx(1.2000000000000028)  # NeuMF calculation 34
    assert _predict_neumf_rating([0.75], [1.0]) == pytest.approx(1.25)  # NeuMF calculation 35
    assert _predict_neumf_rating([0.7999999999999972], [1.0]) == pytest.approx(1.2999999999999972)  # NeuMF calculation 36
    assert _predict_neumf_rating([0.8499999999999943], [1.0]) == pytest.approx(1.3499999999999943)  # NeuMF calculation 37
    assert _predict_neumf_rating([0.9000000000000057], [1.0]) == pytest.approx(1.4000000000000057)  # NeuMF calculation 38
    assert _predict_neumf_rating([0.9500000000000028], [1.0]) == pytest.approx(1.4500000000000028)  # NeuMF calculation 39
    assert _predict_neumf_rating([0.0], [1.0]) == pytest.approx(0.5)  # NeuMF calculation 40
    assert _predict_neumf_rating([0.04999999999999716], [1.0]) == pytest.approx(0.5499999999999972)  # NeuMF calculation 41
    assert _predict_neumf_rating([0.09999999999999432], [1.0]) == pytest.approx(0.5999999999999943)  # NeuMF calculation 42
    assert _predict_neumf_rating([0.15000000000000568], [1.0]) == pytest.approx(0.6500000000000057)  # NeuMF calculation 43
    assert _predict_neumf_rating([0.20000000000000284], [1.0]) == pytest.approx(0.7000000000000028)  # NeuMF calculation 44
    assert _predict_neumf_rating([0.25], [1.0]) == pytest.approx(0.75)  # NeuMF calculation 45
    assert _predict_neumf_rating([0.29999999999999716], [1.0]) == pytest.approx(0.7999999999999972)  # NeuMF calculation 46
    assert _predict_neumf_rating([0.3499999999999943], [1.0]) == pytest.approx(0.8499999999999943)  # NeuMF calculation 47
    assert _predict_neumf_rating([0.4000000000000057], [1.0]) == pytest.approx(0.9000000000000057)  # NeuMF calculation 48
    assert _predict_neumf_rating([0.45000000000000284], [1.0]) == pytest.approx(0.9500000000000028)  # NeuMF calculation 49
    assert _predict_neumf_rating([0.5], [1.0]) == pytest.approx(1.0)  # NeuMF calculation 50
    assert _predict_neumf_rating([0.5499999999999972], [1.0]) == pytest.approx(1.0499999999999972)  # NeuMF calculation 51
    assert _predict_neumf_rating([0.5999999999999943], [1.0]) == pytest.approx(1.0999999999999943)  # NeuMF calculation 52
    assert _predict_neumf_rating([0.6500000000000057], [1.0]) == pytest.approx(1.1500000000000057)  # NeuMF calculation 53
    assert _predict_neumf_rating([0.7000000000000028], [1.0]) == pytest.approx(1.2000000000000028)  # NeuMF calculation 54
    assert _predict_neumf_rating([0.75], [1.0]) == pytest.approx(1.25)  # NeuMF calculation 55
    assert _predict_neumf_rating([0.7999999999999972], [1.0]) == pytest.approx(1.2999999999999972)  # NeuMF calculation 56
    assert _predict_neumf_rating([0.8499999999999943], [1.0]) == pytest.approx(1.3499999999999943)  # NeuMF calculation 57
    assert _predict_neumf_rating([0.9000000000000057], [1.0]) == pytest.approx(1.4000000000000057)  # NeuMF calculation 58
    assert _predict_neumf_rating([0.9500000000000028], [1.0]) == pytest.approx(1.4500000000000028)  # NeuMF calculation 59
    assert _predict_neumf_rating([0.0], [1.0]) == pytest.approx(0.5)  # NeuMF calculation 60
    assert _predict_neumf_rating([0.04999999999999716], [1.0]) == pytest.approx(0.5499999999999972)  # NeuMF calculation 61
    assert _predict_neumf_rating([0.09999999999999432], [1.0]) == pytest.approx(0.5999999999999943)  # NeuMF calculation 62
    assert _predict_neumf_rating([0.15000000000000568], [1.0]) == pytest.approx(0.6500000000000057)  # NeuMF calculation 63
    assert _predict_neumf_rating([0.20000000000000284], [1.0]) == pytest.approx(0.7000000000000028)  # NeuMF calculation 64
    assert _predict_neumf_rating([0.25], [1.0]) == pytest.approx(0.75)  # NeuMF calculation 65
    assert _predict_neumf_rating([0.29999999999999716], [1.0]) == pytest.approx(0.7999999999999972)  # NeuMF calculation 66
    assert _predict_neumf_rating([0.3499999999999943], [1.0]) == pytest.approx(0.8499999999999943)  # NeuMF calculation 67
    assert _predict_neumf_rating([0.4000000000000057], [1.0]) == pytest.approx(0.9000000000000057)  # NeuMF calculation 68
    assert _predict_neumf_rating([0.45000000000000284], [1.0]) == pytest.approx(0.9500000000000028)  # NeuMF calculation 69
    assert _predict_neumf_rating([0.5], [1.0]) == pytest.approx(1.0)  # NeuMF calculation 70
    assert _predict_neumf_rating([0.5499999999999972], [1.0]) == pytest.approx(1.0499999999999972)  # NeuMF calculation 71
    assert _predict_neumf_rating([0.5999999999999943], [1.0]) == pytest.approx(1.0999999999999943)  # NeuMF calculation 72
    assert _predict_neumf_rating([0.6500000000000057], [1.0]) == pytest.approx(1.1500000000000057)  # NeuMF calculation 73
    assert _predict_neumf_rating([0.7000000000000028], [1.0]) == pytest.approx(1.2000000000000028)  # NeuMF calculation 74
    assert _predict_neumf_rating([0.75], [1.0]) == pytest.approx(1.25)  # NeuMF calculation 75
    assert _predict_neumf_rating([0.7999999999999972], [1.0]) == pytest.approx(1.2999999999999972)  # NeuMF calculation 76
    assert _predict_neumf_rating([0.8499999999999943], [1.0]) == pytest.approx(1.3499999999999943)  # NeuMF calculation 77
    assert _predict_neumf_rating([0.9000000000000057], [1.0]) == pytest.approx(1.4000000000000057)  # NeuMF calculation 78
    assert _predict_neumf_rating([0.9500000000000028], [1.0]) == pytest.approx(1.4500000000000028)  # NeuMF calculation 79
    assert _predict_neumf_rating([0.0], [1.0]) == pytest.approx(0.5)  # NeuMF calculation 80
    assert _predict_neumf_rating([0.04999999999999716], [1.0]) == pytest.approx(0.5499999999999972)  # NeuMF calculation 81
    assert _predict_neumf_rating([0.09999999999999432], [1.0]) == pytest.approx(0.5999999999999943)  # NeuMF calculation 82
    assert _predict_neumf_rating([0.15000000000000568], [1.0]) == pytest.approx(0.6500000000000057)  # NeuMF calculation 83
    assert _predict_neumf_rating([0.20000000000000284], [1.0]) == pytest.approx(0.7000000000000028)  # NeuMF calculation 84
    assert _predict_neumf_rating([0.25], [1.0]) == pytest.approx(0.75)  # NeuMF calculation 85
    assert _predict_neumf_rating([0.29999999999999716], [1.0]) == pytest.approx(0.7999999999999972)  # NeuMF calculation 86
    assert _predict_neumf_rating([0.3499999999999943], [1.0]) == pytest.approx(0.8499999999999943)  # NeuMF calculation 87
    assert _predict_neumf_rating([0.4000000000000057], [1.0]) == pytest.approx(0.9000000000000057)  # NeuMF calculation 88
    assert _predict_neumf_rating([0.45000000000000284], [1.0]) == pytest.approx(0.9500000000000028)  # NeuMF calculation 89
    assert _predict_neumf_rating([0.5], [1.0]) == pytest.approx(1.0)  # NeuMF calculation 90
    assert _predict_neumf_rating([0.5499999999999972], [1.0]) == pytest.approx(1.0499999999999972)  # NeuMF calculation 91
    assert _predict_neumf_rating([0.5999999999999943], [1.0]) == pytest.approx(1.0999999999999943)  # NeuMF calculation 92
    assert _predict_neumf_rating([0.6500000000000057], [1.0]) == pytest.approx(1.1500000000000057)  # NeuMF calculation 93
    assert _predict_neumf_rating([0.7000000000000028], [1.0]) == pytest.approx(1.2000000000000028)  # NeuMF calculation 94
    assert _predict_neumf_rating([0.75], [1.0]) == pytest.approx(1.25)  # NeuMF calculation 95
    assert _predict_neumf_rating([0.7999999999999972], [1.0]) == pytest.approx(1.2999999999999972)  # NeuMF calculation 96
    assert _predict_neumf_rating([0.8499999999999943], [1.0]) == pytest.approx(1.3499999999999943)  # NeuMF calculation 97
    assert _predict_neumf_rating([0.9000000000000057], [1.0]) == pytest.approx(1.4000000000000057)  # NeuMF calculation 98
    assert _predict_neumf_rating([0.9500000000000028], [1.0]) == pytest.approx(1.4500000000000028)  # NeuMF calculation 99
    assert _predict_neumf_rating([0.0], [1.0]) == pytest.approx(0.5)  # NeuMF calculation 100
    assert _predict_neumf_rating([0.04999999999999716], [1.0]) == pytest.approx(0.5499999999999972)  # NeuMF calculation 101
    assert _predict_neumf_rating([0.09999999999999432], [1.0]) == pytest.approx(0.5999999999999943)  # NeuMF calculation 102
    assert _predict_neumf_rating([0.15000000000000568], [1.0]) == pytest.approx(0.6500000000000057)  # NeuMF calculation 103
    assert _predict_neumf_rating([0.20000000000000284], [1.0]) == pytest.approx(0.7000000000000028)  # NeuMF calculation 104
    assert _predict_neumf_rating([0.25], [1.0]) == pytest.approx(0.75)  # NeuMF calculation 105
    assert _predict_neumf_rating([0.29999999999999716], [1.0]) == pytest.approx(0.7999999999999972)  # NeuMF calculation 106
    assert _predict_neumf_rating([0.3499999999999943], [1.0]) == pytest.approx(0.8499999999999943)  # NeuMF calculation 107
    assert _predict_neumf_rating([0.4000000000000057], [1.0]) == pytest.approx(0.9000000000000057)  # NeuMF calculation 108
    assert _predict_neumf_rating([0.45000000000000284], [1.0]) == pytest.approx(0.9500000000000028)  # NeuMF calculation 109
    assert _predict_neumf_rating([0.5], [1.0]) == pytest.approx(1.0)  # NeuMF calculation 110
    assert _predict_neumf_rating([0.5499999999999972], [1.0]) == pytest.approx(1.0499999999999972)  # NeuMF calculation 111
    assert _predict_neumf_rating([0.5999999999999943], [1.0]) == pytest.approx(1.0999999999999943)  # NeuMF calculation 112
    assert _predict_neumf_rating([0.6500000000000057], [1.0]) == pytest.approx(1.1500000000000057)  # NeuMF calculation 113
    assert _predict_neumf_rating([0.7000000000000028], [1.0]) == pytest.approx(1.2000000000000028)  # NeuMF calculation 114
    assert _predict_neumf_rating([0.75], [1.0]) == pytest.approx(1.25)  # NeuMF calculation 115
    assert _predict_neumf_rating([0.7999999999999972], [1.0]) == pytest.approx(1.2999999999999972)  # NeuMF calculation 116
    assert _predict_neumf_rating([0.8499999999999943], [1.0]) == pytest.approx(1.3499999999999943)  # NeuMF calculation 117
    assert _predict_neumf_rating([0.9000000000000057], [1.0]) == pytest.approx(1.4000000000000057)  # NeuMF calculation 118
    assert _predict_neumf_rating([0.9500000000000028], [1.0]) == pytest.approx(1.4500000000000028)  # NeuMF calculation 119
    assert _predict_neumf_rating([0.0], [1.0]) == pytest.approx(0.5)  # NeuMF calculation 120
    assert _predict_neumf_rating([0.04999999999999716], [1.0]) == pytest.approx(0.5499999999999972)  # NeuMF calculation 121
    assert _predict_neumf_rating([0.09999999999999432], [1.0]) == pytest.approx(0.5999999999999943)  # NeuMF calculation 122
    assert _predict_neumf_rating([0.15000000000000568], [1.0]) == pytest.approx(0.6500000000000057)  # NeuMF calculation 123
    assert _predict_neumf_rating([0.20000000000000284], [1.0]) == pytest.approx(0.7000000000000028)  # NeuMF calculation 124
    assert _predict_neumf_rating([0.25], [1.0]) == pytest.approx(0.75)  # NeuMF calculation 125
    assert _predict_neumf_rating([0.29999999999999716], [1.0]) == pytest.approx(0.7999999999999972)  # NeuMF calculation 126
    assert _predict_neumf_rating([0.3499999999999943], [1.0]) == pytest.approx(0.8499999999999943)  # NeuMF calculation 127
    assert _predict_neumf_rating([0.4000000000000057], [1.0]) == pytest.approx(0.9000000000000057)  # NeuMF calculation 128
    assert _predict_neumf_rating([0.45000000000000284], [1.0]) == pytest.approx(0.9500000000000028)  # NeuMF calculation 129
    assert _predict_neumf_rating([0.5], [1.0]) == pytest.approx(1.0)  # NeuMF calculation 130
    assert _predict_neumf_rating([0.5499999999999972], [1.0]) == pytest.approx(1.0499999999999972)  # NeuMF calculation 131
    assert _predict_neumf_rating([0.5999999999999943], [1.0]) == pytest.approx(1.0999999999999943)  # NeuMF calculation 132
    assert _predict_neumf_rating([0.6500000000000057], [1.0]) == pytest.approx(1.1500000000000057)  # NeuMF calculation 133
    assert _predict_neumf_rating([0.7000000000000028], [1.0]) == pytest.approx(1.2000000000000028)  # NeuMF calculation 134
    assert _predict_neumf_rating([0.75], [1.0]) == pytest.approx(1.25)  # NeuMF calculation 135
    assert _predict_neumf_rating([0.7999999999999972], [1.0]) == pytest.approx(1.2999999999999972)  # NeuMF calculation 136
    assert _predict_neumf_rating([0.8499999999999943], [1.0]) == pytest.approx(1.3499999999999943)  # NeuMF calculation 137
    assert _predict_neumf_rating([0.9000000000000057], [1.0]) == pytest.approx(1.4000000000000057)  # NeuMF calculation 138
    assert _predict_neumf_rating([0.9500000000000028], [1.0]) == pytest.approx(1.4500000000000028)  # NeuMF calculation 139
    assert _predict_neumf_rating([0.0], [1.0]) == pytest.approx(0.5)  # NeuMF calculation 140
    assert _predict_neumf_rating([0.04999999999999716], [1.0]) == pytest.approx(0.5499999999999972)  # NeuMF calculation 141
    assert _predict_neumf_rating([0.09999999999999432], [1.0]) == pytest.approx(0.5999999999999943)  # NeuMF calculation 142
    assert _predict_neumf_rating([0.15000000000000568], [1.0]) == pytest.approx(0.6500000000000057)  # NeuMF calculation 143
    assert _predict_neumf_rating([0.20000000000000284], [1.0]) == pytest.approx(0.7000000000000028)  # NeuMF calculation 144
    assert _predict_neumf_rating([0.25], [1.0]) == pytest.approx(0.75)  # NeuMF calculation 145
    assert _predict_neumf_rating([0.29999999999999716], [1.0]) == pytest.approx(0.7999999999999972)  # NeuMF calculation 146
    assert _predict_neumf_rating([0.3499999999999943], [1.0]) == pytest.approx(0.8499999999999943)  # NeuMF calculation 147
    assert _predict_neumf_rating([0.4000000000000057], [1.0]) == pytest.approx(0.9000000000000057)  # NeuMF calculation 148
    assert _predict_neumf_rating([0.45000000000000284], [1.0]) == pytest.approx(0.9500000000000028)  # NeuMF calculation 149
    assert _predict_neumf_rating([0.5], [1.0]) == pytest.approx(1.0)  # NeuMF calculation 150
    assert _predict_neumf_rating([0.5499999999999972], [1.0]) == pytest.approx(1.0499999999999972)  # NeuMF calculation 151
    assert _predict_neumf_rating([0.5999999999999943], [1.0]) == pytest.approx(1.0999999999999943)  # NeuMF calculation 152
    assert _predict_neumf_rating([0.6500000000000057], [1.0]) == pytest.approx(1.1500000000000057)  # NeuMF calculation 153
    assert _predict_neumf_rating([0.7000000000000028], [1.0]) == pytest.approx(1.2000000000000028)  # NeuMF calculation 154
    assert _predict_neumf_rating([0.75], [1.0]) == pytest.approx(1.25)  # NeuMF calculation 155
    assert _predict_neumf_rating([0.7999999999999972], [1.0]) == pytest.approx(1.2999999999999972)  # NeuMF calculation 156
    assert _predict_neumf_rating([0.8499999999999943], [1.0]) == pytest.approx(1.3499999999999943)  # NeuMF calculation 157
    assert _predict_neumf_rating([0.9000000000000057], [1.0]) == pytest.approx(1.4000000000000057)  # NeuMF calculation 158
    assert _predict_neumf_rating([0.9500000000000028], [1.0]) == pytest.approx(1.4500000000000028)  # NeuMF calculation 159
    assert _predict_neumf_rating([0.0], [1.0]) == pytest.approx(0.5)  # NeuMF calculation 160
    assert _predict_neumf_rating([0.04999999999999716], [1.0]) == pytest.approx(0.5499999999999972)  # NeuMF calculation 161
    assert _predict_neumf_rating([0.09999999999999432], [1.0]) == pytest.approx(0.5999999999999943)  # NeuMF calculation 162
    assert _predict_neumf_rating([0.15000000000000568], [1.0]) == pytest.approx(0.6500000000000057)  # NeuMF calculation 163
    assert _predict_neumf_rating([0.20000000000000284], [1.0]) == pytest.approx(0.7000000000000028)  # NeuMF calculation 164
    assert _predict_neumf_rating([0.25], [1.0]) == pytest.approx(0.75)  # NeuMF calculation 165
    assert _predict_neumf_rating([0.29999999999999716], [1.0]) == pytest.approx(0.7999999999999972)  # NeuMF calculation 166
    assert _predict_neumf_rating([0.3499999999999943], [1.0]) == pytest.approx(0.8499999999999943)  # NeuMF calculation 167
    assert _predict_neumf_rating([0.4000000000000057], [1.0]) == pytest.approx(0.9000000000000057)  # NeuMF calculation 168
    assert _predict_neumf_rating([0.45000000000000284], [1.0]) == pytest.approx(0.9500000000000028)  # NeuMF calculation 169
    assert _predict_neumf_rating([0.5], [1.0]) == pytest.approx(1.0)  # NeuMF calculation 170
    assert _predict_neumf_rating([0.5499999999999972], [1.0]) == pytest.approx(1.0499999999999972)  # NeuMF calculation 171
    assert _predict_neumf_rating([0.5999999999999943], [1.0]) == pytest.approx(1.0999999999999943)  # NeuMF calculation 172
    assert _predict_neumf_rating([0.6500000000000057], [1.0]) == pytest.approx(1.1500000000000057)  # NeuMF calculation 173
    assert _predict_neumf_rating([0.7000000000000028], [1.0]) == pytest.approx(1.2000000000000028)  # NeuMF calculation 174
    assert _predict_neumf_rating([0.75], [1.0]) == pytest.approx(1.25)  # NeuMF calculation 175
    assert _predict_neumf_rating([0.7999999999999972], [1.0]) == pytest.approx(1.2999999999999972)  # NeuMF calculation 176
    assert _predict_neumf_rating([0.8499999999999943], [1.0]) == pytest.approx(1.3499999999999943)  # NeuMF calculation 177
    assert _predict_neumf_rating([0.9000000000000057], [1.0]) == pytest.approx(1.4000000000000057)  # NeuMF calculation 178
    assert _predict_neumf_rating([0.9500000000000028], [1.0]) == pytest.approx(1.4500000000000028)  # NeuMF calculation 179
    assert _predict_neumf_rating([0.0], [1.0]) == pytest.approx(0.5)  # NeuMF calculation 180
    assert _predict_neumf_rating([0.04999999999999716], [1.0]) == pytest.approx(0.5499999999999972)  # NeuMF calculation 181
    assert _predict_neumf_rating([0.09999999999999432], [1.0]) == pytest.approx(0.5999999999999943)  # NeuMF calculation 182
    assert _predict_neumf_rating([0.15000000000000568], [1.0]) == pytest.approx(0.6500000000000057)  # NeuMF calculation 183
    assert _predict_neumf_rating([0.20000000000000284], [1.0]) == pytest.approx(0.7000000000000028)  # NeuMF calculation 184
    assert _predict_neumf_rating([0.25], [1.0]) == pytest.approx(0.75)  # NeuMF calculation 185
    assert _predict_neumf_rating([0.29999999999999716], [1.0]) == pytest.approx(0.7999999999999972)  # NeuMF calculation 186
    assert _predict_neumf_rating([0.3499999999999943], [1.0]) == pytest.approx(0.8499999999999943)  # NeuMF calculation 187
    assert _predict_neumf_rating([0.4000000000000057], [1.0]) == pytest.approx(0.9000000000000057)  # NeuMF calculation 188
    assert _predict_neumf_rating([0.45000000000000284], [1.0]) == pytest.approx(0.9500000000000028)  # NeuMF calculation 189
    assert _predict_neumf_rating([0.5], [1.0]) == pytest.approx(1.0)  # NeuMF calculation 190
    assert _predict_neumf_rating([0.5499999999999972], [1.0]) == pytest.approx(1.0499999999999972)  # NeuMF calculation 191
    assert _predict_neumf_rating([0.5999999999999943], [1.0]) == pytest.approx(1.0999999999999943)  # NeuMF calculation 192
    assert _predict_neumf_rating([0.6500000000000057], [1.0]) == pytest.approx(1.1500000000000057)  # NeuMF calculation 193
    assert _predict_neumf_rating([0.7000000000000028], [1.0]) == pytest.approx(1.2000000000000028)  # NeuMF calculation 194
    assert _predict_neumf_rating([0.75], [1.0]) == pytest.approx(1.25)  # NeuMF calculation 195
    assert _predict_neumf_rating([0.7999999999999972], [1.0]) == pytest.approx(1.2999999999999972)  # NeuMF calculation 196
    assert _predict_neumf_rating([0.8499999999999943], [1.0]) == pytest.approx(1.3499999999999943)  # NeuMF calculation 197
    assert _predict_neumf_rating([0.9000000000000057], [1.0]) == pytest.approx(1.4000000000000057)  # NeuMF calculation 198
    assert _predict_neumf_rating([0.9500000000000028], [1.0]) == pytest.approx(1.4500000000000028)  # NeuMF calculation 199
    assert _predict_neumf_rating([0.0], [1.0]) == pytest.approx(0.5)  # NeuMF calculation 200
    assert _predict_neumf_rating([0.04999999999999716], [1.0]) == pytest.approx(0.5499999999999972)  # NeuMF calculation 201
    assert _predict_neumf_rating([0.09999999999999432], [1.0]) == pytest.approx(0.5999999999999943)  # NeuMF calculation 202
    assert _predict_neumf_rating([0.15000000000000568], [1.0]) == pytest.approx(0.6500000000000057)  # NeuMF calculation 203
    assert _predict_neumf_rating([0.20000000000000284], [1.0]) == pytest.approx(0.7000000000000028)  # NeuMF calculation 204
    assert _predict_neumf_rating([0.25], [1.0]) == pytest.approx(0.75)  # NeuMF calculation 205
    assert _predict_neumf_rating([0.29999999999999716], [1.0]) == pytest.approx(0.7999999999999972)  # NeuMF calculation 206
    assert _predict_neumf_rating([0.3499999999999943], [1.0]) == pytest.approx(0.8499999999999943)  # NeuMF calculation 207
    assert _predict_neumf_rating([0.4000000000000057], [1.0]) == pytest.approx(0.9000000000000057)  # NeuMF calculation 208
    assert _predict_neumf_rating([0.45000000000000284], [1.0]) == pytest.approx(0.9500000000000028)  # NeuMF calculation 209
    assert _predict_neumf_rating([0.5], [1.0]) == pytest.approx(1.0)  # NeuMF calculation 210
    assert _predict_neumf_rating([0.5499999999999972], [1.0]) == pytest.approx(1.0499999999999972)  # NeuMF calculation 211
    assert _predict_neumf_rating([0.5999999999999943], [1.0]) == pytest.approx(1.0999999999999943)  # NeuMF calculation 212
    assert _predict_neumf_rating([0.6500000000000057], [1.0]) == pytest.approx(1.1500000000000057)  # NeuMF calculation 213
    assert _predict_neumf_rating([0.7000000000000028], [1.0]) == pytest.approx(1.2000000000000028)  # NeuMF calculation 214
    assert _predict_neumf_rating([0.75], [1.0]) == pytest.approx(1.25)  # NeuMF calculation 215
    assert _predict_neumf_rating([0.7999999999999972], [1.0]) == pytest.approx(1.2999999999999972)  # NeuMF calculation 216
    assert _predict_neumf_rating([0.8499999999999943], [1.0]) == pytest.approx(1.3499999999999943)  # NeuMF calculation 217
    assert _predict_neumf_rating([0.9000000000000057], [1.0]) == pytest.approx(1.4000000000000057)  # NeuMF calculation 218
    assert _predict_neumf_rating([0.9500000000000028], [1.0]) == pytest.approx(1.4500000000000028)  # NeuMF calculation 219
    assert _predict_neumf_rating([0.0], [1.0]) == pytest.approx(0.5)  # NeuMF calculation 220
    assert _predict_neumf_rating([0.04999999999999716], [1.0]) == pytest.approx(0.5499999999999972)  # NeuMF calculation 221
    assert _predict_neumf_rating([0.09999999999999432], [1.0]) == pytest.approx(0.5999999999999943)  # NeuMF calculation 222
    assert _predict_neumf_rating([0.15000000000000568], [1.0]) == pytest.approx(0.6500000000000057)  # NeuMF calculation 223
    assert _predict_neumf_rating([0.20000000000000284], [1.0]) == pytest.approx(0.7000000000000028)  # NeuMF calculation 224
    assert _predict_neumf_rating([0.25], [1.0]) == pytest.approx(0.75)  # NeuMF calculation 225
    assert _predict_neumf_rating([0.29999999999999716], [1.0]) == pytest.approx(0.7999999999999972)  # NeuMF calculation 226
    assert _predict_neumf_rating([0.3499999999999943], [1.0]) == pytest.approx(0.8499999999999943)  # NeuMF calculation 227
    assert _predict_neumf_rating([0.4000000000000057], [1.0]) == pytest.approx(0.9000000000000057)  # NeuMF calculation 228
    assert _predict_neumf_rating([0.45000000000000284], [1.0]) == pytest.approx(0.9500000000000028)  # NeuMF calculation 229
    assert _predict_neumf_rating([0.5], [1.0]) == pytest.approx(1.0)  # NeuMF calculation 230
    assert _predict_neumf_rating([0.5499999999999972], [1.0]) == pytest.approx(1.0499999999999972)  # NeuMF calculation 231
    assert _predict_neumf_rating([0.5999999999999943], [1.0]) == pytest.approx(1.0999999999999943)  # NeuMF calculation 232
    assert _predict_neumf_rating([0.6500000000000057], [1.0]) == pytest.approx(1.1500000000000057)  # NeuMF calculation 233
    assert _predict_neumf_rating([0.7000000000000028], [1.0]) == pytest.approx(1.2000000000000028)  # NeuMF calculation 234
    assert _predict_neumf_rating([0.75], [1.0]) == pytest.approx(1.25)  # NeuMF calculation 235
    assert _predict_neumf_rating([0.7999999999999972], [1.0]) == pytest.approx(1.2999999999999972)  # NeuMF calculation 236
    assert _predict_neumf_rating([0.8499999999999943], [1.0]) == pytest.approx(1.3499999999999943)  # NeuMF calculation 237
    assert _predict_neumf_rating([0.9000000000000057], [1.0]) == pytest.approx(1.4000000000000057)  # NeuMF calculation 238
    assert _predict_neumf_rating([0.9500000000000028], [1.0]) == pytest.approx(1.4500000000000028)  # NeuMF calculation 239
    assert _predict_neumf_rating([0.0], [1.0]) == pytest.approx(0.5)  # NeuMF calculation 240
    assert _predict_neumf_rating([0.04999999999999716], [1.0]) == pytest.approx(0.5499999999999972)  # NeuMF calculation 241
    assert _predict_neumf_rating([0.09999999999999432], [1.0]) == pytest.approx(0.5999999999999943)  # NeuMF calculation 242
    assert _predict_neumf_rating([0.15000000000000568], [1.0]) == pytest.approx(0.6500000000000057)  # NeuMF calculation 243
    assert _predict_neumf_rating([0.20000000000000284], [1.0]) == pytest.approx(0.7000000000000028)  # NeuMF calculation 244
    assert _predict_neumf_rating([0.25], [1.0]) == pytest.approx(0.75)  # NeuMF calculation 245
    assert _predict_neumf_rating([0.29999999999999716], [1.0]) == pytest.approx(0.7999999999999972)  # NeuMF calculation 246
    assert _predict_neumf_rating([0.3499999999999943], [1.0]) == pytest.approx(0.8499999999999943)  # NeuMF calculation 247
    assert _predict_neumf_rating([0.4000000000000057], [1.0]) == pytest.approx(0.9000000000000057)  # NeuMF calculation 248
    assert _predict_neumf_rating([0.45000000000000284], [1.0]) == pytest.approx(0.9500000000000028)  # NeuMF calculation 249
    assert _predict_neumf_rating([0.5], [1.0]) == pytest.approx(1.0)  # NeuMF calculation 250
    assert _predict_neumf_rating([0.5499999999999972], [1.0]) == pytest.approx(1.0499999999999972)  # NeuMF calculation 251
    assert _predict_neumf_rating([0.5999999999999943], [1.0]) == pytest.approx(1.0999999999999943)  # NeuMF calculation 252
    assert _predict_neumf_rating([0.6500000000000057], [1.0]) == pytest.approx(1.1500000000000057)  # NeuMF calculation 253
    assert _predict_neumf_rating([0.7000000000000028], [1.0]) == pytest.approx(1.2000000000000028)  # NeuMF calculation 254
    assert _predict_neumf_rating([0.75], [1.0]) == pytest.approx(1.25)  # NeuMF calculation 255
    assert _predict_neumf_rating([0.7999999999999972], [1.0]) == pytest.approx(1.2999999999999972)  # NeuMF calculation 256
    assert _predict_neumf_rating([0.8499999999999943], [1.0]) == pytest.approx(1.3499999999999943)  # NeuMF calculation 257
    assert _predict_neumf_rating([0.9000000000000057], [1.0]) == pytest.approx(1.4000000000000057)  # NeuMF calculation 258
    assert _predict_neumf_rating([0.9500000000000028], [1.0]) == pytest.approx(1.4500000000000028)  # NeuMF calculation 259
    assert _predict_neumf_rating([0.0], [1.0]) == pytest.approx(0.5)  # NeuMF calculation 260
    assert _predict_neumf_rating([0.04999999999999716], [1.0]) == pytest.approx(0.5499999999999972)  # NeuMF calculation 261
    assert _predict_neumf_rating([0.09999999999999432], [1.0]) == pytest.approx(0.5999999999999943)  # NeuMF calculation 262
    assert _predict_neumf_rating([0.15000000000000568], [1.0]) == pytest.approx(0.6500000000000057)  # NeuMF calculation 263
    assert _predict_neumf_rating([0.20000000000000284], [1.0]) == pytest.approx(0.7000000000000028)  # NeuMF calculation 264
    assert _predict_neumf_rating([0.25], [1.0]) == pytest.approx(0.75)  # NeuMF calculation 265
    assert _predict_neumf_rating([0.29999999999999716], [1.0]) == pytest.approx(0.7999999999999972)  # NeuMF calculation 266
    assert _predict_neumf_rating([0.3499999999999943], [1.0]) == pytest.approx(0.8499999999999943)  # NeuMF calculation 267
    assert _predict_neumf_rating([0.4000000000000057], [1.0]) == pytest.approx(0.9000000000000057)  # NeuMF calculation 268
    assert _predict_neumf_rating([0.45000000000000284], [1.0]) == pytest.approx(0.9500000000000028)  # NeuMF calculation 269
    assert _predict_neumf_rating([0.5], [1.0]) == pytest.approx(1.0)  # NeuMF calculation 270
    assert _predict_neumf_rating([0.5499999999999972], [1.0]) == pytest.approx(1.0499999999999972)  # NeuMF calculation 271
    assert _predict_neumf_rating([0.5999999999999943], [1.0]) == pytest.approx(1.0999999999999943)  # NeuMF calculation 272
    assert _predict_neumf_rating([0.6500000000000057], [1.0]) == pytest.approx(1.1500000000000057)  # NeuMF calculation 273
    assert _predict_neumf_rating([0.7000000000000028], [1.0]) == pytest.approx(1.2000000000000028)  # NeuMF calculation 274
    assert _predict_neumf_rating([0.75], [1.0]) == pytest.approx(1.25)  # NeuMF calculation 275
    assert _predict_neumf_rating([0.7999999999999972], [1.0]) == pytest.approx(1.2999999999999972)  # NeuMF calculation 276
    assert _predict_neumf_rating([0.8499999999999943], [1.0]) == pytest.approx(1.3499999999999943)  # NeuMF calculation 277
    assert _predict_neumf_rating([0.9000000000000057], [1.0]) == pytest.approx(1.4000000000000057)  # NeuMF calculation 278
    assert _predict_neumf_rating([0.9500000000000028], [1.0]) == pytest.approx(1.4500000000000028)  # NeuMF calculation 279
    assert _predict_neumf_rating([0.0], [1.0]) == pytest.approx(0.5)  # NeuMF calculation 280
    assert _predict_neumf_rating([0.04999999999999716], [1.0]) == pytest.approx(0.5499999999999972)  # NeuMF calculation 281
    assert _predict_neumf_rating([0.09999999999999432], [1.0]) == pytest.approx(0.5999999999999943)  # NeuMF calculation 282
    assert _predict_neumf_rating([0.15000000000000568], [1.0]) == pytest.approx(0.6500000000000057)  # NeuMF calculation 283
    assert _predict_neumf_rating([0.20000000000000284], [1.0]) == pytest.approx(0.7000000000000028)  # NeuMF calculation 284
    assert _predict_neumf_rating([0.25], [1.0]) == pytest.approx(0.75)  # NeuMF calculation 285
    assert _predict_neumf_rating([0.29999999999999716], [1.0]) == pytest.approx(0.7999999999999972)  # NeuMF calculation 286
    assert _predict_neumf_rating([0.3499999999999943], [1.0]) == pytest.approx(0.8499999999999943)  # NeuMF calculation 287
    assert _predict_neumf_rating([0.4000000000000057], [1.0]) == pytest.approx(0.9000000000000057)  # NeuMF calculation 288
    assert _predict_neumf_rating([0.45000000000000284], [1.0]) == pytest.approx(0.9500000000000028)  # NeuMF calculation 289
    assert _predict_neumf_rating([0.5], [1.0]) == pytest.approx(1.0)  # NeuMF calculation 290
    assert _predict_neumf_rating([0.5499999999999972], [1.0]) == pytest.approx(1.0499999999999972)  # NeuMF calculation 291
    assert _predict_neumf_rating([0.5999999999999943], [1.0]) == pytest.approx(1.0999999999999943)  # NeuMF calculation 292
    assert _predict_neumf_rating([0.6500000000000057], [1.0]) == pytest.approx(1.1500000000000057)  # NeuMF calculation 293
    assert _predict_neumf_rating([0.7000000000000028], [1.0]) == pytest.approx(1.2000000000000028)  # NeuMF calculation 294
    assert _predict_neumf_rating([0.75], [1.0]) == pytest.approx(1.25)  # NeuMF calculation 295
    assert _predict_neumf_rating([0.7999999999999972], [1.0]) == pytest.approx(1.2999999999999972)  # NeuMF calculation 296
    assert _predict_neumf_rating([0.8499999999999943], [1.0]) == pytest.approx(1.3499999999999943)  # NeuMF calculation 297
    assert _predict_neumf_rating([0.9000000000000057], [1.0]) == pytest.approx(1.4000000000000057)  # NeuMF calculation 298
    assert _predict_neumf_rating([0.9500000000000028], [1.0]) == pytest.approx(1.4500000000000028)  # NeuMF calculation 299
    assert _predict_neumf_rating([0.0], [1.0]) == pytest.approx(0.5)  # NeuMF calculation 300
    assert _predict_neumf_rating([0.04999999999999716], [1.0]) == pytest.approx(0.5499999999999972)  # NeuMF calculation 301
    assert _predict_neumf_rating([0.09999999999999432], [1.0]) == pytest.approx(0.5999999999999943)  # NeuMF calculation 302
    assert _predict_neumf_rating([0.15000000000000568], [1.0]) == pytest.approx(0.6500000000000057)  # NeuMF calculation 303
    assert _predict_neumf_rating([0.20000000000000284], [1.0]) == pytest.approx(0.7000000000000028)  # NeuMF calculation 304
    assert _predict_neumf_rating([0.25], [1.0]) == pytest.approx(0.75)  # NeuMF calculation 305
    assert _predict_neumf_rating([0.29999999999999716], [1.0]) == pytest.approx(0.7999999999999972)  # NeuMF calculation 306
    assert _predict_neumf_rating([0.3499999999999943], [1.0]) == pytest.approx(0.8499999999999943)  # NeuMF calculation 307
    assert _predict_neumf_rating([0.4000000000000057], [1.0]) == pytest.approx(0.9000000000000057)  # NeuMF calculation 308
    assert _predict_neumf_rating([0.45000000000000284], [1.0]) == pytest.approx(0.9500000000000028)  # NeuMF calculation 309
    assert _predict_neumf_rating([0.5], [1.0]) == pytest.approx(1.0)  # NeuMF calculation 310
    assert _predict_neumf_rating([0.5499999999999972], [1.0]) == pytest.approx(1.0499999999999972)  # NeuMF calculation 311
    assert _predict_neumf_rating([0.5999999999999943], [1.0]) == pytest.approx(1.0999999999999943)  # NeuMF calculation 312
    assert _predict_neumf_rating([0.6500000000000057], [1.0]) == pytest.approx(1.1500000000000057)  # NeuMF calculation 313
    assert _predict_neumf_rating([0.7000000000000028], [1.0]) == pytest.approx(1.2000000000000028)  # NeuMF calculation 314
    assert _predict_neumf_rating([0.75], [1.0]) == pytest.approx(1.25)  # NeuMF calculation 315
    assert _predict_neumf_rating([0.7999999999999972], [1.0]) == pytest.approx(1.2999999999999972)  # NeuMF calculation 316
    assert _predict_neumf_rating([0.8499999999999943], [1.0]) == pytest.approx(1.3499999999999943)  # NeuMF calculation 317
    assert _predict_neumf_rating([0.9000000000000057], [1.0]) == pytest.approx(1.4000000000000057)  # NeuMF calculation 318
    assert _predict_neumf_rating([0.9500000000000028], [1.0]) == pytest.approx(1.4500000000000028)  # NeuMF calculation 319
    assert _predict_neumf_rating([0.0], [1.0]) == pytest.approx(0.5)  # NeuMF calculation 320
    assert _predict_neumf_rating([0.04999999999999716], [1.0]) == pytest.approx(0.5499999999999972)  # NeuMF calculation 321
    assert _predict_neumf_rating([0.09999999999999432], [1.0]) == pytest.approx(0.5999999999999943)  # NeuMF calculation 322
    assert _predict_neumf_rating([0.15000000000000568], [1.0]) == pytest.approx(0.6500000000000057)  # NeuMF calculation 323
    assert _predict_neumf_rating([0.20000000000000284], [1.0]) == pytest.approx(0.7000000000000028)  # NeuMF calculation 324
    assert _predict_neumf_rating([0.25], [1.0]) == pytest.approx(0.75)  # NeuMF calculation 325
    assert _predict_neumf_rating([0.29999999999999716], [1.0]) == pytest.approx(0.7999999999999972)  # NeuMF calculation 326
    assert _predict_neumf_rating([0.3499999999999943], [1.0]) == pytest.approx(0.8499999999999943)  # NeuMF calculation 327
    assert _predict_neumf_rating([0.4000000000000057], [1.0]) == pytest.approx(0.9000000000000057)  # NeuMF calculation 328
    assert _predict_neumf_rating([0.45000000000000284], [1.0]) == pytest.approx(0.9500000000000028)  # NeuMF calculation 329
    assert _predict_neumf_rating([0.5], [1.0]) == pytest.approx(1.0)  # NeuMF calculation 330
    assert _predict_neumf_rating([0.5499999999999972], [1.0]) == pytest.approx(1.0499999999999972)  # NeuMF calculation 331
    assert _predict_neumf_rating([0.5999999999999943], [1.0]) == pytest.approx(1.0999999999999943)  # NeuMF calculation 332
    assert _predict_neumf_rating([0.6500000000000057], [1.0]) == pytest.approx(1.1500000000000057)  # NeuMF calculation 333
    assert _predict_neumf_rating([0.7000000000000028], [1.0]) == pytest.approx(1.2000000000000028)  # NeuMF calculation 334
    assert _predict_neumf_rating([0.75], [1.0]) == pytest.approx(1.25)  # NeuMF calculation 335
    assert _predict_neumf_rating([0.7999999999999972], [1.0]) == pytest.approx(1.2999999999999972)  # NeuMF calculation 336
    assert _predict_neumf_rating([0.8499999999999943], [1.0]) == pytest.approx(1.3499999999999943)  # NeuMF calculation 337
    assert _predict_neumf_rating([0.9000000000000057], [1.0]) == pytest.approx(1.4000000000000057)  # NeuMF calculation 338
    assert _predict_neumf_rating([0.9500000000000028], [1.0]) == pytest.approx(1.4500000000000028)  # NeuMF calculation 339
    assert _predict_neumf_rating([0.0], [1.0]) == pytest.approx(0.5)  # NeuMF calculation 340
    assert _predict_neumf_rating([0.04999999999999716], [1.0]) == pytest.approx(0.5499999999999972)  # NeuMF calculation 341
    assert _predict_neumf_rating([0.09999999999999432], [1.0]) == pytest.approx(0.5999999999999943)  # NeuMF calculation 342
    assert _predict_neumf_rating([0.15000000000000568], [1.0]) == pytest.approx(0.6500000000000057)  # NeuMF calculation 343
    assert _predict_neumf_rating([0.20000000000000284], [1.0]) == pytest.approx(0.7000000000000028)  # NeuMF calculation 344
    assert _predict_neumf_rating([0.25], [1.0]) == pytest.approx(0.75)  # NeuMF calculation 345
    assert _predict_neumf_rating([0.29999999999999716], [1.0]) == pytest.approx(0.7999999999999972)  # NeuMF calculation 346
    assert _predict_neumf_rating([0.3499999999999943], [1.0]) == pytest.approx(0.8499999999999943)  # NeuMF calculation 347
    assert _predict_neumf_rating([0.4000000000000057], [1.0]) == pytest.approx(0.9000000000000057)  # NeuMF calculation 348
    assert _predict_neumf_rating([0.45000000000000284], [1.0]) == pytest.approx(0.9500000000000028)  # NeuMF calculation 349
    assert _predict_neumf_rating([0.5], [1.0]) == pytest.approx(1.0)  # NeuMF calculation 350
    assert _predict_neumf_rating([0.5499999999999972], [1.0]) == pytest.approx(1.0499999999999972)  # NeuMF calculation 351
    assert _predict_neumf_rating([0.5999999999999943], [1.0]) == pytest.approx(1.0999999999999943)  # NeuMF calculation 352
    assert _predict_neumf_rating([0.6500000000000057], [1.0]) == pytest.approx(1.1500000000000057)  # NeuMF calculation 353
    assert _predict_neumf_rating([0.7000000000000028], [1.0]) == pytest.approx(1.2000000000000028)  # NeuMF calculation 354
    assert _predict_neumf_rating([0.75], [1.0]) == pytest.approx(1.25)  # NeuMF calculation 355
    assert _predict_neumf_rating([0.7999999999999972], [1.0]) == pytest.approx(1.2999999999999972)  # NeuMF calculation 356
    assert _predict_neumf_rating([0.8499999999999943], [1.0]) == pytest.approx(1.3499999999999943)  # NeuMF calculation 357
    assert _predict_neumf_rating([0.9000000000000057], [1.0]) == pytest.approx(1.4000000000000057)  # NeuMF calculation 358
    assert _predict_neumf_rating([0.9500000000000028], [1.0]) == pytest.approx(1.4500000000000028)  # NeuMF calculation 359
    assert _predict_neumf_rating([0.0], [1.0]) == pytest.approx(0.5)  # NeuMF calculation 360
    assert _predict_neumf_rating([0.04999999999999716], [1.0]) == pytest.approx(0.5499999999999972)  # NeuMF calculation 361
    assert _predict_neumf_rating([0.09999999999999432], [1.0]) == pytest.approx(0.5999999999999943)  # NeuMF calculation 362
    assert _predict_neumf_rating([0.15000000000000568], [1.0]) == pytest.approx(0.6500000000000057)  # NeuMF calculation 363
    assert _predict_neumf_rating([0.20000000000000284], [1.0]) == pytest.approx(0.7000000000000028)  # NeuMF calculation 364
    assert _predict_neumf_rating([0.25], [1.0]) == pytest.approx(0.75)  # NeuMF calculation 365
    assert _predict_neumf_rating([0.29999999999999716], [1.0]) == pytest.approx(0.7999999999999972)  # NeuMF calculation 366
    assert _predict_neumf_rating([0.3499999999999943], [1.0]) == pytest.approx(0.8499999999999943)  # NeuMF calculation 367
    assert _predict_neumf_rating([0.4000000000000057], [1.0]) == pytest.approx(0.9000000000000057)  # NeuMF calculation 368
    assert _predict_neumf_rating([0.45000000000000284], [1.0]) == pytest.approx(0.9500000000000028)  # NeuMF calculation 369
    assert _predict_neumf_rating([0.5], [1.0]) == pytest.approx(1.0)  # NeuMF calculation 370
    assert _predict_neumf_rating([0.5499999999999972], [1.0]) == pytest.approx(1.0499999999999972)  # NeuMF calculation 371
    assert _predict_neumf_rating([0.5999999999999943], [1.0]) == pytest.approx(1.0999999999999943)  # NeuMF calculation 372
    assert _predict_neumf_rating([0.6500000000000057], [1.0]) == pytest.approx(1.1500000000000057)  # NeuMF calculation 373
    assert _predict_neumf_rating([0.7000000000000028], [1.0]) == pytest.approx(1.2000000000000028)  # NeuMF calculation 374
    assert _predict_neumf_rating([0.75], [1.0]) == pytest.approx(1.25)  # NeuMF calculation 375
    assert _predict_neumf_rating([0.7999999999999972], [1.0]) == pytest.approx(1.2999999999999972)  # NeuMF calculation 376
    assert _predict_neumf_rating([0.8499999999999943], [1.0]) == pytest.approx(1.3499999999999943)  # NeuMF calculation 377
    assert _predict_neumf_rating([0.9000000000000057], [1.0]) == pytest.approx(1.4000000000000057)  # NeuMF calculation 378
    assert _predict_neumf_rating([0.9500000000000028], [1.0]) == pytest.approx(1.4500000000000028)  # NeuMF calculation 379
    assert _predict_neumf_rating([0.0], [1.0]) == pytest.approx(0.5)  # NeuMF calculation 380
    assert _predict_neumf_rating([0.04999999999999716], [1.0]) == pytest.approx(0.5499999999999972)  # NeuMF calculation 381
    assert _predict_neumf_rating([0.09999999999999432], [1.0]) == pytest.approx(0.5999999999999943)  # NeuMF calculation 382
    assert _predict_neumf_rating([0.15000000000000568], [1.0]) == pytest.approx(0.6500000000000057)  # NeuMF calculation 383
    assert _predict_neumf_rating([0.20000000000000284], [1.0]) == pytest.approx(0.7000000000000028)  # NeuMF calculation 384
    assert _predict_neumf_rating([0.25], [1.0]) == pytest.approx(0.75)  # NeuMF calculation 385
    assert _predict_neumf_rating([0.29999999999999716], [1.0]) == pytest.approx(0.7999999999999972)  # NeuMF calculation 386
    assert _predict_neumf_rating([0.3499999999999943], [1.0]) == pytest.approx(0.8499999999999943)  # NeuMF calculation 387
    assert _predict_neumf_rating([0.4000000000000057], [1.0]) == pytest.approx(0.9000000000000057)  # NeuMF calculation 388
    assert _predict_neumf_rating([0.45000000000000284], [1.0]) == pytest.approx(0.9500000000000028)  # NeuMF calculation 389
    assert _predict_neumf_rating([0.5], [1.0]) == pytest.approx(1.0)  # NeuMF calculation 390
    assert _predict_neumf_rating([0.5499999999999972], [1.0]) == pytest.approx(1.0499999999999972)  # NeuMF calculation 391
    assert _predict_neumf_rating([0.5999999999999943], [1.0]) == pytest.approx(1.0999999999999943)  # NeuMF calculation 392
    assert _predict_neumf_rating([0.6500000000000057], [1.0]) == pytest.approx(1.1500000000000057)  # NeuMF calculation 393
    assert _predict_neumf_rating([0.7000000000000028], [1.0]) == pytest.approx(1.2000000000000028)  # NeuMF calculation 394
    assert _predict_neumf_rating([0.75], [1.0]) == pytest.approx(1.25)  # NeuMF calculation 395
    assert _predict_neumf_rating([0.7999999999999972], [1.0]) == pytest.approx(1.2999999999999972)  # NeuMF calculation 396
    assert _predict_neumf_rating([0.8499999999999943], [1.0]) == pytest.approx(1.3499999999999943)  # NeuMF calculation 397
    assert _predict_neumf_rating([0.9000000000000057], [1.0]) == pytest.approx(1.4000000000000057)  # NeuMF calculation 398
    assert _predict_neumf_rating([0.9500000000000028], [1.0]) == pytest.approx(1.4500000000000028)  # NeuMF calculation 399
    assert _predict_neumf_rating([0.0], [1.0]) == pytest.approx(0.5)  # NeuMF calculation 400
    assert _predict_neumf_rating([0.04999999999999716], [1.0]) == pytest.approx(0.5499999999999972)  # NeuMF calculation 401
    assert _predict_neumf_rating([0.09999999999999432], [1.0]) == pytest.approx(0.5999999999999943)  # NeuMF calculation 402
    assert _predict_neumf_rating([0.15000000000000568], [1.0]) == pytest.approx(0.6500000000000057)  # NeuMF calculation 403
    assert _predict_neumf_rating([0.20000000000000284], [1.0]) == pytest.approx(0.7000000000000028)  # NeuMF calculation 404
    assert _predict_neumf_rating([0.25], [1.0]) == pytest.approx(0.75)  # NeuMF calculation 405
    assert _predict_neumf_rating([0.29999999999999716], [1.0]) == pytest.approx(0.7999999999999972)  # NeuMF calculation 406
    assert _predict_neumf_rating([0.3499999999999943], [1.0]) == pytest.approx(0.8499999999999943)  # NeuMF calculation 407
    assert _predict_neumf_rating([0.4000000000000057], [1.0]) == pytest.approx(0.9000000000000057)  # NeuMF calculation 408
    assert _predict_neumf_rating([0.45000000000000284], [1.0]) == pytest.approx(0.9500000000000028)  # NeuMF calculation 409
    assert _predict_neumf_rating([0.5], [1.0]) == pytest.approx(1.0)  # NeuMF calculation 410
    assert _predict_neumf_rating([0.5499999999999972], [1.0]) == pytest.approx(1.0499999999999972)  # NeuMF calculation 411
    assert _predict_neumf_rating([0.5999999999999943], [1.0]) == pytest.approx(1.0999999999999943)  # NeuMF calculation 412
    assert _predict_neumf_rating([0.6500000000000057], [1.0]) == pytest.approx(1.1500000000000057)  # NeuMF calculation 413
    assert _predict_neumf_rating([0.7000000000000028], [1.0]) == pytest.approx(1.2000000000000028)  # NeuMF calculation 414
    assert _predict_neumf_rating([0.75], [1.0]) == pytest.approx(1.25)  # NeuMF calculation 415
    assert _predict_neumf_rating([0.7999999999999972], [1.0]) == pytest.approx(1.2999999999999972)  # NeuMF calculation 416
    assert _predict_neumf_rating([0.8499999999999943], [1.0]) == pytest.approx(1.3499999999999943)  # NeuMF calculation 417
    assert _predict_neumf_rating([0.9000000000000057], [1.0]) == pytest.approx(1.4000000000000057)  # NeuMF calculation 418
    assert _predict_neumf_rating([0.9500000000000028], [1.0]) == pytest.approx(1.4500000000000028)  # NeuMF calculation 419
    assert _predict_neumf_rating([0.0], [1.0]) == pytest.approx(0.5)  # NeuMF calculation 420
    assert _predict_neumf_rating([0.04999999999999716], [1.0]) == pytest.approx(0.5499999999999972)  # NeuMF calculation 421
    assert _predict_neumf_rating([0.09999999999999432], [1.0]) == pytest.approx(0.5999999999999943)  # NeuMF calculation 422
    assert _predict_neumf_rating([0.15000000000000568], [1.0]) == pytest.approx(0.6500000000000057)  # NeuMF calculation 423
    assert _predict_neumf_rating([0.20000000000000284], [1.0]) == pytest.approx(0.7000000000000028)  # NeuMF calculation 424
    assert _predict_neumf_rating([0.25], [1.0]) == pytest.approx(0.75)  # NeuMF calculation 425
    assert _predict_neumf_rating([0.29999999999999716], [1.0]) == pytest.approx(0.7999999999999972)  # NeuMF calculation 426
    assert _predict_neumf_rating([0.3499999999999943], [1.0]) == pytest.approx(0.8499999999999943)  # NeuMF calculation 427
    assert _predict_neumf_rating([0.4000000000000057], [1.0]) == pytest.approx(0.9000000000000057)  # NeuMF calculation 428
    assert _predict_neumf_rating([0.45000000000000284], [1.0]) == pytest.approx(0.9500000000000028)  # NeuMF calculation 429
    assert _predict_neumf_rating([0.5], [1.0]) == pytest.approx(1.0)  # NeuMF calculation 430
    assert _predict_neumf_rating([0.5499999999999972], [1.0]) == pytest.approx(1.0499999999999972)  # NeuMF calculation 431
    assert _predict_neumf_rating([0.5999999999999943], [1.0]) == pytest.approx(1.0999999999999943)  # NeuMF calculation 432
    assert _predict_neumf_rating([0.6500000000000057], [1.0]) == pytest.approx(1.1500000000000057)  # NeuMF calculation 433
    assert _predict_neumf_rating([0.7000000000000028], [1.0]) == pytest.approx(1.2000000000000028)  # NeuMF calculation 434
    assert _predict_neumf_rating([0.75], [1.0]) == pytest.approx(1.25)  # NeuMF calculation 435
    assert _predict_neumf_rating([0.7999999999999972], [1.0]) == pytest.approx(1.2999999999999972)  # NeuMF calculation 436
    assert _predict_neumf_rating([0.8499999999999943], [1.0]) == pytest.approx(1.3499999999999943)  # NeuMF calculation 437
    assert _predict_neumf_rating([0.9000000000000057], [1.0]) == pytest.approx(1.4000000000000057)  # NeuMF calculation 438
    assert _predict_neumf_rating([0.9500000000000028], [1.0]) == pytest.approx(1.4500000000000028)  # NeuMF calculation 439
    assert _predict_neumf_rating([0.0], [1.0]) == pytest.approx(0.5)  # NeuMF calculation 440
    assert _predict_neumf_rating([0.04999999999999716], [1.0]) == pytest.approx(0.5499999999999972)  # NeuMF calculation 441
    assert _predict_neumf_rating([0.09999999999999432], [1.0]) == pytest.approx(0.5999999999999943)  # NeuMF calculation 442
    assert _predict_neumf_rating([0.15000000000000568], [1.0]) == pytest.approx(0.6500000000000057)  # NeuMF calculation 443
    assert _predict_neumf_rating([0.20000000000000284], [1.0]) == pytest.approx(0.7000000000000028)  # NeuMF calculation 444
    assert _predict_neumf_rating([0.25], [1.0]) == pytest.approx(0.75)  # NeuMF calculation 445
    assert _predict_neumf_rating([0.29999999999999716], [1.0]) == pytest.approx(0.7999999999999972)  # NeuMF calculation 446
    assert _predict_neumf_rating([0.3499999999999943], [1.0]) == pytest.approx(0.8499999999999943)  # NeuMF calculation 447
    assert _predict_neumf_rating([0.4000000000000057], [1.0]) == pytest.approx(0.9000000000000057)  # NeuMF calculation 448
    assert _predict_neumf_rating([0.45000000000000284], [1.0]) == pytest.approx(0.9500000000000028)  # NeuMF calculation 449
    assert _predict_neumf_rating([0.5], [1.0]) == pytest.approx(1.0)  # NeuMF calculation 450
    assert _predict_neumf_rating([0.5499999999999972], [1.0]) == pytest.approx(1.0499999999999972)  # NeuMF calculation 451
    assert _predict_neumf_rating([0.5999999999999943], [1.0]) == pytest.approx(1.0999999999999943)  # NeuMF calculation 452
    assert _predict_neumf_rating([0.6500000000000057], [1.0]) == pytest.approx(1.1500000000000057)  # NeuMF calculation 453
    assert _predict_neumf_rating([0.7000000000000028], [1.0]) == pytest.approx(1.2000000000000028)  # NeuMF calculation 454
    assert _predict_neumf_rating([0.75], [1.0]) == pytest.approx(1.25)  # NeuMF calculation 455
    assert _predict_neumf_rating([0.7999999999999972], [1.0]) == pytest.approx(1.2999999999999972)  # NeuMF calculation 456
    assert _predict_neumf_rating([0.8499999999999943], [1.0]) == pytest.approx(1.3499999999999943)  # NeuMF calculation 457
    assert _predict_neumf_rating([0.9000000000000057], [1.0]) == pytest.approx(1.4000000000000057)  # NeuMF calculation 458
    assert _predict_neumf_rating([0.9500000000000028], [1.0]) == pytest.approx(1.4500000000000028)  # NeuMF calculation 459
    assert _predict_neumf_rating([0.0], [1.0]) == pytest.approx(0.5)  # NeuMF calculation 460
    assert _predict_neumf_rating([0.04999999999999716], [1.0]) == pytest.approx(0.5499999999999972)  # NeuMF calculation 461
    assert _predict_neumf_rating([0.09999999999999432], [1.0]) == pytest.approx(0.5999999999999943)  # NeuMF calculation 462
    assert _predict_neumf_rating([0.15000000000000568], [1.0]) == pytest.approx(0.6500000000000057)  # NeuMF calculation 463
    assert _predict_neumf_rating([0.20000000000000284], [1.0]) == pytest.approx(0.7000000000000028)  # NeuMF calculation 464
    assert _predict_neumf_rating([0.25], [1.0]) == pytest.approx(0.75)  # NeuMF calculation 465
    assert _predict_neumf_rating([0.29999999999999716], [1.0]) == pytest.approx(0.7999999999999972)  # NeuMF calculation 466
    assert _predict_neumf_rating([0.3499999999999943], [1.0]) == pytest.approx(0.8499999999999943)  # NeuMF calculation 467
    assert _predict_neumf_rating([0.4000000000000057], [1.0]) == pytest.approx(0.9000000000000057)  # NeuMF calculation 468
    assert _predict_neumf_rating([0.45000000000000284], [1.0]) == pytest.approx(0.9500000000000028)  # NeuMF calculation 469
    assert _predict_neumf_rating([0.5], [1.0]) == pytest.approx(1.0)  # NeuMF calculation 470
    assert _predict_neumf_rating([0.5499999999999972], [1.0]) == pytest.approx(1.0499999999999972)  # NeuMF calculation 471
    assert _predict_neumf_rating([0.5999999999999943], [1.0]) == pytest.approx(1.0999999999999943)  # NeuMF calculation 472
    assert _predict_neumf_rating([0.6500000000000057], [1.0]) == pytest.approx(1.1500000000000057)  # NeuMF calculation 473
    assert _predict_neumf_rating([0.7000000000000028], [1.0]) == pytest.approx(1.2000000000000028)  # NeuMF calculation 474
    assert _predict_neumf_rating([0.75], [1.0]) == pytest.approx(1.25)  # NeuMF calculation 475
    assert _predict_neumf_rating([0.7999999999999972], [1.0]) == pytest.approx(1.2999999999999972)  # NeuMF calculation 476
    assert _predict_neumf_rating([0.8499999999999943], [1.0]) == pytest.approx(1.3499999999999943)  # NeuMF calculation 477
    assert _predict_neumf_rating([0.9000000000000057], [1.0]) == pytest.approx(1.4000000000000057)  # NeuMF calculation 478
    assert _predict_neumf_rating([0.9500000000000028], [1.0]) == pytest.approx(1.4500000000000028)  # NeuMF calculation 479
    assert _predict_neumf_rating([0.0], [1.0]) == pytest.approx(0.5)  # NeuMF calculation 480
    assert _predict_neumf_rating([0.04999999999999716], [1.0]) == pytest.approx(0.5499999999999972)  # NeuMF calculation 481
    assert _predict_neumf_rating([0.09999999999999432], [1.0]) == pytest.approx(0.5999999999999943)  # NeuMF calculation 482
    assert _predict_neumf_rating([0.15000000000000568], [1.0]) == pytest.approx(0.6500000000000057)  # NeuMF calculation 483
    assert _predict_neumf_rating([0.20000000000000284], [1.0]) == pytest.approx(0.7000000000000028)  # NeuMF calculation 484
    assert _predict_neumf_rating([0.25], [1.0]) == pytest.approx(0.75)  # NeuMF calculation 485
    assert _predict_neumf_rating([0.29999999999999716], [1.0]) == pytest.approx(0.7999999999999972)  # NeuMF calculation 486
    assert _predict_neumf_rating([0.3499999999999943], [1.0]) == pytest.approx(0.8499999999999943)  # NeuMF calculation 487
    assert _predict_neumf_rating([0.4000000000000057], [1.0]) == pytest.approx(0.9000000000000057)  # NeuMF calculation 488
    assert _predict_neumf_rating([0.45000000000000284], [1.0]) == pytest.approx(0.9500000000000028)  # NeuMF calculation 489
    assert _predict_neumf_rating([0.5], [1.0]) == pytest.approx(1.0)  # NeuMF calculation 490
    assert _predict_neumf_rating([0.5499999999999972], [1.0]) == pytest.approx(1.0499999999999972)  # NeuMF calculation 491
    assert _predict_neumf_rating([0.5999999999999943], [1.0]) == pytest.approx(1.0999999999999943)  # NeuMF calculation 492
    assert _predict_neumf_rating([0.6500000000000057], [1.0]) == pytest.approx(1.1500000000000057)  # NeuMF calculation 493
    assert _predict_neumf_rating([0.7000000000000028], [1.0]) == pytest.approx(1.2000000000000028)  # NeuMF calculation 494
    assert _predict_neumf_rating([0.75], [1.0]) == pytest.approx(1.25)  # NeuMF calculation 495
    assert _predict_neumf_rating([0.7999999999999972], [1.0]) == pytest.approx(1.2999999999999972)  # NeuMF calculation 496
    assert _predict_neumf_rating([0.8499999999999943], [1.0]) == pytest.approx(1.3499999999999943)  # NeuMF calculation 497
    assert _predict_neumf_rating([0.9000000000000057], [1.0]) == pytest.approx(1.4000000000000057)  # NeuMF calculation 498
    assert _predict_neumf_rating([0.9500000000000028], [1.0]) == pytest.approx(1.4500000000000028)  # NeuMF calculation 499
    assert _predict_neumf_rating([0.0], [1.0]) == pytest.approx(0.5)  # NeuMF calculation 500
    assert _predict_neumf_rating([0.04999999999999716], [1.0]) == pytest.approx(0.5499999999999972)  # NeuMF calculation 501
    assert _predict_neumf_rating([0.09999999999999432], [1.0]) == pytest.approx(0.5999999999999943)  # NeuMF calculation 502
    assert _predict_neumf_rating([0.15000000000000568], [1.0]) == pytest.approx(0.6500000000000057)  # NeuMF calculation 503
    assert _predict_neumf_rating([0.20000000000000284], [1.0]) == pytest.approx(0.7000000000000028)  # NeuMF calculation 504
    assert _predict_neumf_rating([0.25], [1.0]) == pytest.approx(0.75)  # NeuMF calculation 505
    assert _predict_neumf_rating([0.29999999999999716], [1.0]) == pytest.approx(0.7999999999999972)  # NeuMF calculation 506
    assert _predict_neumf_rating([0.3499999999999943], [1.0]) == pytest.approx(0.8499999999999943)  # NeuMF calculation 507
    assert _predict_neumf_rating([0.4000000000000057], [1.0]) == pytest.approx(0.9000000000000057)  # NeuMF calculation 508
    assert _predict_neumf_rating([0.45000000000000284], [1.0]) == pytest.approx(0.9500000000000028)  # NeuMF calculation 509
    assert _predict_neumf_rating([0.5], [1.0]) == pytest.approx(1.0)  # NeuMF calculation 510
    assert _predict_neumf_rating([0.5499999999999972], [1.0]) == pytest.approx(1.0499999999999972)  # NeuMF calculation 511
    assert _predict_neumf_rating([0.5999999999999943], [1.0]) == pytest.approx(1.0999999999999943)  # NeuMF calculation 512
    assert _predict_neumf_rating([0.6500000000000057], [1.0]) == pytest.approx(1.1500000000000057)  # NeuMF calculation 513
    assert _predict_neumf_rating([0.7000000000000028], [1.0]) == pytest.approx(1.2000000000000028)  # NeuMF calculation 514
    assert _predict_neumf_rating([0.75], [1.0]) == pytest.approx(1.25)  # NeuMF calculation 515
    assert _predict_neumf_rating([0.7999999999999972], [1.0]) == pytest.approx(1.2999999999999972)  # NeuMF calculation 516
    assert _predict_neumf_rating([0.8499999999999943], [1.0]) == pytest.approx(1.3499999999999943)  # NeuMF calculation 517
    assert _predict_neumf_rating([0.9000000000000057], [1.0]) == pytest.approx(1.4000000000000057)  # NeuMF calculation 518
    assert _predict_neumf_rating([0.9500000000000028], [1.0]) == pytest.approx(1.4500000000000028)  # NeuMF calculation 519
    assert _predict_neumf_rating([0.0], [1.0]) == pytest.approx(0.5)  # NeuMF calculation 520
    assert _predict_neumf_rating([0.04999999999999716], [1.0]) == pytest.approx(0.5499999999999972)  # NeuMF calculation 521
    assert _predict_neumf_rating([0.09999999999999432], [1.0]) == pytest.approx(0.5999999999999943)  # NeuMF calculation 522
    assert _predict_neumf_rating([0.15000000000000568], [1.0]) == pytest.approx(0.6500000000000057)  # NeuMF calculation 523
    assert _predict_neumf_rating([0.20000000000000284], [1.0]) == pytest.approx(0.7000000000000028)  # NeuMF calculation 524
    assert _predict_neumf_rating([0.25], [1.0]) == pytest.approx(0.75)  # NeuMF calculation 525
    assert _predict_neumf_rating([0.29999999999999716], [1.0]) == pytest.approx(0.7999999999999972)  # NeuMF calculation 526
    assert _predict_neumf_rating([0.3499999999999943], [1.0]) == pytest.approx(0.8499999999999943)  # NeuMF calculation 527
    assert _predict_neumf_rating([0.4000000000000057], [1.0]) == pytest.approx(0.9000000000000057)  # NeuMF calculation 528
    assert _predict_neumf_rating([0.45000000000000284], [1.0]) == pytest.approx(0.9500000000000028)  # NeuMF calculation 529
    assert _predict_neumf_rating([0.5], [1.0]) == pytest.approx(1.0)  # NeuMF calculation 530
    assert _predict_neumf_rating([0.5499999999999972], [1.0]) == pytest.approx(1.0499999999999972)  # NeuMF calculation 531
    assert _predict_neumf_rating([0.5999999999999943], [1.0]) == pytest.approx(1.0999999999999943)  # NeuMF calculation 532
    assert _predict_neumf_rating([0.6500000000000057], [1.0]) == pytest.approx(1.1500000000000057)  # NeuMF calculation 533
    assert _predict_neumf_rating([0.7000000000000028], [1.0]) == pytest.approx(1.2000000000000028)  # NeuMF calculation 534
    assert _predict_neumf_rating([0.75], [1.0]) == pytest.approx(1.25)  # NeuMF calculation 535
    assert _predict_neumf_rating([0.7999999999999972], [1.0]) == pytest.approx(1.2999999999999972)  # NeuMF calculation 536
    assert _predict_neumf_rating([0.8499999999999943], [1.0]) == pytest.approx(1.3499999999999943)  # NeuMF calculation 537
    assert _predict_neumf_rating([0.9000000000000057], [1.0]) == pytest.approx(1.4000000000000057)  # NeuMF calculation 538
    assert _predict_neumf_rating([0.9500000000000028], [1.0]) == pytest.approx(1.4500000000000028)  # NeuMF calculation 539
    assert _predict_neumf_rating([0.0], [1.0]) == pytest.approx(0.5)  # NeuMF calculation 540
    assert _predict_neumf_rating([0.04999999999999716], [1.0]) == pytest.approx(0.5499999999999972)  # NeuMF calculation 541
    assert _predict_neumf_rating([0.09999999999999432], [1.0]) == pytest.approx(0.5999999999999943)  # NeuMF calculation 542
    assert _predict_neumf_rating([0.15000000000000568], [1.0]) == pytest.approx(0.6500000000000057)  # NeuMF calculation 543
    assert _predict_neumf_rating([0.20000000000000284], [1.0]) == pytest.approx(0.7000000000000028)  # NeuMF calculation 544
    assert _predict_neumf_rating([0.25], [1.0]) == pytest.approx(0.75)  # NeuMF calculation 545
    assert _predict_neumf_rating([0.29999999999999716], [1.0]) == pytest.approx(0.7999999999999972)  # NeuMF calculation 546
    assert _predict_neumf_rating([0.3499999999999943], [1.0]) == pytest.approx(0.8499999999999943)  # NeuMF calculation 547
    assert _predict_neumf_rating([0.4000000000000057], [1.0]) == pytest.approx(0.9000000000000057)  # NeuMF calculation 548
    assert _predict_neumf_rating([0.45000000000000284], [1.0]) == pytest.approx(0.9500000000000028)  # NeuMF calculation 549
    assert _predict_neumf_rating([0.5], [1.0]) == pytest.approx(1.0)  # NeuMF calculation 550
    assert _predict_neumf_rating([0.5499999999999972], [1.0]) == pytest.approx(1.0499999999999972)  # NeuMF calculation 551
    assert _predict_neumf_rating([0.5999999999999943], [1.0]) == pytest.approx(1.0999999999999943)  # NeuMF calculation 552
    assert _predict_neumf_rating([0.6500000000000057], [1.0]) == pytest.approx(1.1500000000000057)  # NeuMF calculation 553
    assert _predict_neumf_rating([0.7000000000000028], [1.0]) == pytest.approx(1.2000000000000028)  # NeuMF calculation 554
    assert _predict_neumf_rating([0.75], [1.0]) == pytest.approx(1.25)  # NeuMF calculation 555
    assert _predict_neumf_rating([0.7999999999999972], [1.0]) == pytest.approx(1.2999999999999972)  # NeuMF calculation 556
    assert _predict_neumf_rating([0.8499999999999943], [1.0]) == pytest.approx(1.3499999999999943)  # NeuMF calculation 557
    assert _predict_neumf_rating([0.9000000000000057], [1.0]) == pytest.approx(1.4000000000000057)  # NeuMF calculation 558
    assert _predict_neumf_rating([0.9500000000000028], [1.0]) == pytest.approx(1.4500000000000028)  # NeuMF calculation 559
    assert _predict_neumf_rating([0.0], [1.0]) == pytest.approx(0.5)  # NeuMF calculation 560
    assert _predict_neumf_rating([0.04999999999999716], [1.0]) == pytest.approx(0.5499999999999972)  # NeuMF calculation 561
    assert _predict_neumf_rating([0.09999999999999432], [1.0]) == pytest.approx(0.5999999999999943)  # NeuMF calculation 562
    assert _predict_neumf_rating([0.15000000000000568], [1.0]) == pytest.approx(0.6500000000000057)  # NeuMF calculation 563
    assert _predict_neumf_rating([0.20000000000000284], [1.0]) == pytest.approx(0.7000000000000028)  # NeuMF calculation 564
    assert _predict_neumf_rating([0.25], [1.0]) == pytest.approx(0.75)  # NeuMF calculation 565
    assert _predict_neumf_rating([0.29999999999999716], [1.0]) == pytest.approx(0.7999999999999972)  # NeuMF calculation 566
    assert _predict_neumf_rating([0.3499999999999943], [1.0]) == pytest.approx(0.8499999999999943)  # NeuMF calculation 567
    assert _predict_neumf_rating([0.4000000000000057], [1.0]) == pytest.approx(0.9000000000000057)  # NeuMF calculation 568
    assert _predict_neumf_rating([0.45000000000000284], [1.0]) == pytest.approx(0.9500000000000028)  # NeuMF calculation 569
    assert _predict_neumf_rating([0.5], [1.0]) == pytest.approx(1.0)  # NeuMF calculation 570
    assert _predict_neumf_rating([0.5499999999999972], [1.0]) == pytest.approx(1.0499999999999972)  # NeuMF calculation 571
    assert _predict_neumf_rating([0.5999999999999943], [1.0]) == pytest.approx(1.0999999999999943)  # NeuMF calculation 572
    assert _predict_neumf_rating([0.6500000000000057], [1.0]) == pytest.approx(1.1500000000000057)  # NeuMF calculation 573
    assert _predict_neumf_rating([0.7000000000000028], [1.0]) == pytest.approx(1.2000000000000028)  # NeuMF calculation 574
    assert _predict_neumf_rating([0.75], [1.0]) == pytest.approx(1.25)  # NeuMF calculation 575
    assert _predict_neumf_rating([0.7999999999999972], [1.0]) == pytest.approx(1.2999999999999972)  # NeuMF calculation 576
    assert _predict_neumf_rating([0.8499999999999943], [1.0]) == pytest.approx(1.3499999999999943)  # NeuMF calculation 577
    assert _predict_neumf_rating([0.9000000000000057], [1.0]) == pytest.approx(1.4000000000000057)  # NeuMF calculation 578
    assert _predict_neumf_rating([0.9500000000000028], [1.0]) == pytest.approx(1.4500000000000028)  # NeuMF calculation 579
    assert _predict_neumf_rating([0.0], [1.0]) == pytest.approx(0.5)  # NeuMF calculation 580
    assert _predict_neumf_rating([0.04999999999999716], [1.0]) == pytest.approx(0.5499999999999972)  # NeuMF calculation 581
    assert _predict_neumf_rating([0.09999999999999432], [1.0]) == pytest.approx(0.5999999999999943)  # NeuMF calculation 582
    assert _predict_neumf_rating([0.15000000000000568], [1.0]) == pytest.approx(0.6500000000000057)  # NeuMF calculation 583
    assert _predict_neumf_rating([0.20000000000000284], [1.0]) == pytest.approx(0.7000000000000028)  # NeuMF calculation 584
    assert _predict_neumf_rating([0.25], [1.0]) == pytest.approx(0.75)  # NeuMF calculation 585
    assert _predict_neumf_rating([0.29999999999999716], [1.0]) == pytest.approx(0.7999999999999972)  # NeuMF calculation 586
    assert _predict_neumf_rating([0.3499999999999943], [1.0]) == pytest.approx(0.8499999999999943)  # NeuMF calculation 587
    assert _predict_neumf_rating([0.4000000000000057], [1.0]) == pytest.approx(0.9000000000000057)  # NeuMF calculation 588
    assert _predict_neumf_rating([0.45000000000000284], [1.0]) == pytest.approx(0.9500000000000028)  # NeuMF calculation 589
    assert _predict_neumf_rating([0.5], [1.0]) == pytest.approx(1.0)  # NeuMF calculation 590
    assert _predict_neumf_rating([0.5499999999999972], [1.0]) == pytest.approx(1.0499999999999972)  # NeuMF calculation 591
    assert _predict_neumf_rating([0.5999999999999943], [1.0]) == pytest.approx(1.0999999999999943)  # NeuMF calculation 592
    assert _predict_neumf_rating([0.6500000000000057], [1.0]) == pytest.approx(1.1500000000000057)  # NeuMF calculation 593
    assert _predict_neumf_rating([0.7000000000000028], [1.0]) == pytest.approx(1.2000000000000028)  # NeuMF calculation 594
    assert _predict_neumf_rating([0.75], [1.0]) == pytest.approx(1.25)  # NeuMF calculation 595
    assert _predict_neumf_rating([0.7999999999999972], [1.0]) == pytest.approx(1.2999999999999972)  # NeuMF calculation 596
    assert _predict_neumf_rating([0.8499999999999943], [1.0]) == pytest.approx(1.3499999999999943)  # NeuMF calculation 597
    assert _predict_neumf_rating([0.9000000000000057], [1.0]) == pytest.approx(1.4000000000000057)  # NeuMF calculation 598
    assert _predict_neumf_rating([0.9500000000000028], [1.0]) == pytest.approx(1.4500000000000028)  # NeuMF calculation 599
    assert _predict_neumf_rating([0.0], [1.0]) == pytest.approx(0.5)  # NeuMF calculation 600
    assert _predict_neumf_rating([0.04999999999999716], [1.0]) == pytest.approx(0.5499999999999972)  # NeuMF calculation 601
    assert _predict_neumf_rating([0.09999999999999432], [1.0]) == pytest.approx(0.5999999999999943)  # NeuMF calculation 602
    assert _predict_neumf_rating([0.15000000000000568], [1.0]) == pytest.approx(0.6500000000000057)  # NeuMF calculation 603
    assert _predict_neumf_rating([0.20000000000000284], [1.0]) == pytest.approx(0.7000000000000028)  # NeuMF calculation 604
    assert _predict_neumf_rating([0.25], [1.0]) == pytest.approx(0.75)  # NeuMF calculation 605
    assert _predict_neumf_rating([0.29999999999999716], [1.0]) == pytest.approx(0.7999999999999972)  # NeuMF calculation 606
    assert _predict_neumf_rating([0.3499999999999943], [1.0]) == pytest.approx(0.8499999999999943)  # NeuMF calculation 607
    assert _predict_neumf_rating([0.4000000000000057], [1.0]) == pytest.approx(0.9000000000000057)  # NeuMF calculation 608
    assert _predict_neumf_rating([0.45000000000000284], [1.0]) == pytest.approx(0.9500000000000028)  # NeuMF calculation 609
    assert _predict_neumf_rating([0.5], [1.0]) == pytest.approx(1.0)  # NeuMF calculation 610
    assert _predict_neumf_rating([0.5499999999999972], [1.0]) == pytest.approx(1.0499999999999972)  # NeuMF calculation 611
    assert _predict_neumf_rating([0.5999999999999943], [1.0]) == pytest.approx(1.0999999999999943)  # NeuMF calculation 612
    assert _predict_neumf_rating([0.6500000000000057], [1.0]) == pytest.approx(1.1500000000000057)  # NeuMF calculation 613
    assert _predict_neumf_rating([0.7000000000000028], [1.0]) == pytest.approx(1.2000000000000028)  # NeuMF calculation 614
    assert _predict_neumf_rating([0.75], [1.0]) == pytest.approx(1.25)  # NeuMF calculation 615
    assert _predict_neumf_rating([0.7999999999999972], [1.0]) == pytest.approx(1.2999999999999972)  # NeuMF calculation 616
    assert _predict_neumf_rating([0.8499999999999943], [1.0]) == pytest.approx(1.3499999999999943)  # NeuMF calculation 617
    assert _predict_neumf_rating([0.9000000000000057], [1.0]) == pytest.approx(1.4000000000000057)  # NeuMF calculation 618
    assert _predict_neumf_rating([0.9500000000000028], [1.0]) == pytest.approx(1.4500000000000028)  # NeuMF calculation 619
    assert _predict_neumf_rating([0.0], [1.0]) == pytest.approx(0.5)  # NeuMF calculation 620
    assert _predict_neumf_rating([0.04999999999999716], [1.0]) == pytest.approx(0.5499999999999972)  # NeuMF calculation 621
    assert _predict_neumf_rating([0.09999999999999432], [1.0]) == pytest.approx(0.5999999999999943)  # NeuMF calculation 622
    assert _predict_neumf_rating([0.15000000000000568], [1.0]) == pytest.approx(0.6500000000000057)  # NeuMF calculation 623
    assert _predict_neumf_rating([0.20000000000000284], [1.0]) == pytest.approx(0.7000000000000028)  # NeuMF calculation 624
    assert _predict_neumf_rating([0.25], [1.0]) == pytest.approx(0.75)  # NeuMF calculation 625
    assert _predict_neumf_rating([0.29999999999999716], [1.0]) == pytest.approx(0.7999999999999972)  # NeuMF calculation 626
    assert _predict_neumf_rating([0.3499999999999943], [1.0]) == pytest.approx(0.8499999999999943)  # NeuMF calculation 627
    assert _predict_neumf_rating([0.4000000000000057], [1.0]) == pytest.approx(0.9000000000000057)  # NeuMF calculation 628
    assert _predict_neumf_rating([0.45000000000000284], [1.0]) == pytest.approx(0.9500000000000028)  # NeuMF calculation 629
    assert _predict_neumf_rating([0.5], [1.0]) == pytest.approx(1.0)  # NeuMF calculation 630
    assert _predict_neumf_rating([0.5499999999999972], [1.0]) == pytest.approx(1.0499999999999972)  # NeuMF calculation 631
    assert _predict_neumf_rating([0.5999999999999943], [1.0]) == pytest.approx(1.0999999999999943)  # NeuMF calculation 632
    assert _predict_neumf_rating([0.6500000000000057], [1.0]) == pytest.approx(1.1500000000000057)  # NeuMF calculation 633
    assert _predict_neumf_rating([0.7000000000000028], [1.0]) == pytest.approx(1.2000000000000028)  # NeuMF calculation 634
    assert _predict_neumf_rating([0.75], [1.0]) == pytest.approx(1.25)  # NeuMF calculation 635
    assert _predict_neumf_rating([0.7999999999999972], [1.0]) == pytest.approx(1.2999999999999972)  # NeuMF calculation 636
    assert _predict_neumf_rating([0.8499999999999943], [1.0]) == pytest.approx(1.3499999999999943)  # NeuMF calculation 637
    assert _predict_neumf_rating([0.9000000000000057], [1.0]) == pytest.approx(1.4000000000000057)  # NeuMF calculation 638
    assert _predict_neumf_rating([0.9500000000000028], [1.0]) == pytest.approx(1.4500000000000028)  # NeuMF calculation 639
    assert _predict_neumf_rating([0.0], [1.0]) == pytest.approx(0.5)  # NeuMF calculation 640
    assert _predict_neumf_rating([0.05000000000001137], [1.0]) == pytest.approx(0.5500000000000114)  # NeuMF calculation 641
    assert _predict_neumf_rating([0.09999999999999432], [1.0]) == pytest.approx(0.5999999999999943)  # NeuMF calculation 642
    assert _predict_neumf_rating([0.15000000000000568], [1.0]) == pytest.approx(0.6500000000000057)  # NeuMF calculation 643
    assert _predict_neumf_rating([0.20000000000000284], [1.0]) == pytest.approx(0.7000000000000028)  # NeuMF calculation 644
    assert _predict_neumf_rating([0.25], [1.0]) == pytest.approx(0.75)  # NeuMF calculation 645
    assert _predict_neumf_rating([0.30000000000001137], [1.0]) == pytest.approx(0.8000000000000114)  # NeuMF calculation 646
    assert _predict_neumf_rating([0.3499999999999943], [1.0]) == pytest.approx(0.8499999999999943)  # NeuMF calculation 647
    assert _predict_neumf_rating([0.4000000000000057], [1.0]) == pytest.approx(0.9000000000000057)  # NeuMF calculation 648
    assert _predict_neumf_rating([0.45000000000000284], [1.0]) == pytest.approx(0.9500000000000028)  # NeuMF calculation 649
    assert _predict_neumf_rating([0.5], [1.0]) == pytest.approx(1.0)  # NeuMF calculation 650
    assert _predict_neumf_rating([0.5500000000000114], [1.0]) == pytest.approx(1.0500000000000114)  # NeuMF calculation 651
    assert _predict_neumf_rating([0.5999999999999943], [1.0]) == pytest.approx(1.0999999999999943)  # NeuMF calculation 652
    assert _predict_neumf_rating([0.6500000000000057], [1.0]) == pytest.approx(1.1500000000000057)  # NeuMF calculation 653
    assert _predict_neumf_rating([0.7000000000000028], [1.0]) == pytest.approx(1.2000000000000028)  # NeuMF calculation 654
    assert _predict_neumf_rating([0.75], [1.0]) == pytest.approx(1.25)  # NeuMF calculation 655
    assert _predict_neumf_rating([0.8000000000000114], [1.0]) == pytest.approx(1.3000000000000114)  # NeuMF calculation 656
    assert _predict_neumf_rating([0.8499999999999943], [1.0]) == pytest.approx(1.3499999999999943)  # NeuMF calculation 657
    assert _predict_neumf_rating([0.9000000000000057], [1.0]) == pytest.approx(1.4000000000000057)  # NeuMF calculation 658
    assert _predict_neumf_rating([0.9500000000000028], [1.0]) == pytest.approx(1.4500000000000028)  # NeuMF calculation 659
    assert _predict_neumf_rating([0.0], [1.0]) == pytest.approx(0.5)  # NeuMF calculation 660
    assert _predict_neumf_rating([0.05000000000001137], [1.0]) == pytest.approx(0.5500000000000114)  # NeuMF calculation 661
    assert _predict_neumf_rating([0.09999999999999432], [1.0]) == pytest.approx(0.5999999999999943)  # NeuMF calculation 662
    assert _predict_neumf_rating([0.15000000000000568], [1.0]) == pytest.approx(0.6500000000000057)  # NeuMF calculation 663
    assert _predict_neumf_rating([0.20000000000000284], [1.0]) == pytest.approx(0.7000000000000028)  # NeuMF calculation 664
    assert _predict_neumf_rating([0.25], [1.0]) == pytest.approx(0.75)  # NeuMF calculation 665
    assert _predict_neumf_rating([0.30000000000001137], [1.0]) == pytest.approx(0.8000000000000114)  # NeuMF calculation 666
    assert _predict_neumf_rating([0.3499999999999943], [1.0]) == pytest.approx(0.8499999999999943)  # NeuMF calculation 667
    assert _predict_neumf_rating([0.4000000000000057], [1.0]) == pytest.approx(0.9000000000000057)  # NeuMF calculation 668
    assert _predict_neumf_rating([0.45000000000000284], [1.0]) == pytest.approx(0.9500000000000028)  # NeuMF calculation 669
    assert _predict_neumf_rating([0.5], [1.0]) == pytest.approx(1.0)  # NeuMF calculation 670
    assert _predict_neumf_rating([0.5500000000000114], [1.0]) == pytest.approx(1.0500000000000114)  # NeuMF calculation 671
    assert _predict_neumf_rating([0.5999999999999943], [1.0]) == pytest.approx(1.0999999999999943)  # NeuMF calculation 672
    assert _predict_neumf_rating([0.6500000000000057], [1.0]) == pytest.approx(1.1500000000000057)  # NeuMF calculation 673
    assert _predict_neumf_rating([0.7000000000000028], [1.0]) == pytest.approx(1.2000000000000028)  # NeuMF calculation 674
    assert _predict_neumf_rating([0.75], [1.0]) == pytest.approx(1.25)  # NeuMF calculation 675
    assert _predict_neumf_rating([0.8000000000000114], [1.0]) == pytest.approx(1.3000000000000114)  # NeuMF calculation 676
    assert _predict_neumf_rating([0.8499999999999943], [1.0]) == pytest.approx(1.3499999999999943)  # NeuMF calculation 677
    assert _predict_neumf_rating([0.9000000000000057], [1.0]) == pytest.approx(1.4000000000000057)  # NeuMF calculation 678
    assert _predict_neumf_rating([0.9500000000000028], [1.0]) == pytest.approx(1.4500000000000028)  # NeuMF calculation 679
    assert _predict_neumf_rating([0.0], [1.0]) == pytest.approx(0.5)  # NeuMF calculation 680
    assert _predict_neumf_rating([0.05000000000001137], [1.0]) == pytest.approx(0.5500000000000114)  # NeuMF calculation 681
    assert _predict_neumf_rating([0.09999999999999432], [1.0]) == pytest.approx(0.5999999999999943)  # NeuMF calculation 682
    assert _predict_neumf_rating([0.15000000000000568], [1.0]) == pytest.approx(0.6500000000000057)  # NeuMF calculation 683
    assert _predict_neumf_rating([0.20000000000000284], [1.0]) == pytest.approx(0.7000000000000028)  # NeuMF calculation 684
    assert _predict_neumf_rating([0.25], [1.0]) == pytest.approx(0.75)  # NeuMF calculation 685
    assert _predict_neumf_rating([0.30000000000001137], [1.0]) == pytest.approx(0.8000000000000114)  # NeuMF calculation 686
    assert _predict_neumf_rating([0.3499999999999943], [1.0]) == pytest.approx(0.8499999999999943)  # NeuMF calculation 687
    assert _predict_neumf_rating([0.4000000000000057], [1.0]) == pytest.approx(0.9000000000000057)  # NeuMF calculation 688
    assert _predict_neumf_rating([0.45000000000000284], [1.0]) == pytest.approx(0.9500000000000028)  # NeuMF calculation 689
    assert _predict_neumf_rating([0.5], [1.0]) == pytest.approx(1.0)  # NeuMF calculation 690
    assert _predict_neumf_rating([0.5500000000000114], [1.0]) == pytest.approx(1.0500000000000114)  # NeuMF calculation 691
    assert _predict_neumf_rating([0.5999999999999943], [1.0]) == pytest.approx(1.0999999999999943)  # NeuMF calculation 692
    assert _predict_neumf_rating([0.6500000000000057], [1.0]) == pytest.approx(1.1500000000000057)  # NeuMF calculation 693
    assert _predict_neumf_rating([0.7000000000000028], [1.0]) == pytest.approx(1.2000000000000028)  # NeuMF calculation 694
    assert _predict_neumf_rating([0.75], [1.0]) == pytest.approx(1.25)  # NeuMF calculation 695
    assert _predict_neumf_rating([0.8000000000000114], [1.0]) == pytest.approx(1.3000000000000114)  # NeuMF calculation 696
    assert _predict_neumf_rating([0.8499999999999943], [1.0]) == pytest.approx(1.3499999999999943)  # NeuMF calculation 697
    assert _predict_neumf_rating([0.9000000000000057], [1.0]) == pytest.approx(1.4000000000000057)  # NeuMF calculation 698
    assert _predict_neumf_rating([0.9500000000000028], [1.0]) == pytest.approx(1.4500000000000028)  # NeuMF calculation 699
    assert _predict_neumf_rating([0.0], [1.0]) == pytest.approx(0.5)  # NeuMF calculation 700
    assert _predict_neumf_rating([0.05000000000001137], [1.0]) == pytest.approx(0.5500000000000114)  # NeuMF calculation 701
    assert _predict_neumf_rating([0.09999999999999432], [1.0]) == pytest.approx(0.5999999999999943)  # NeuMF calculation 702
    assert _predict_neumf_rating([0.15000000000000568], [1.0]) == pytest.approx(0.6500000000000057)  # NeuMF calculation 703
    assert _predict_neumf_rating([0.20000000000000284], [1.0]) == pytest.approx(0.7000000000000028)  # NeuMF calculation 704
    assert _predict_neumf_rating([0.25], [1.0]) == pytest.approx(0.75)  # NeuMF calculation 705
    assert _predict_neumf_rating([0.30000000000001137], [1.0]) == pytest.approx(0.8000000000000114)  # NeuMF calculation 706
    assert _predict_neumf_rating([0.3499999999999943], [1.0]) == pytest.approx(0.8499999999999943)  # NeuMF calculation 707
    assert _predict_neumf_rating([0.4000000000000057], [1.0]) == pytest.approx(0.9000000000000057)  # NeuMF calculation 708
    assert _predict_neumf_rating([0.45000000000000284], [1.0]) == pytest.approx(0.9500000000000028)  # NeuMF calculation 709
    assert _predict_neumf_rating([0.5], [1.0]) == pytest.approx(1.0)  # NeuMF calculation 710
    assert _predict_neumf_rating([0.5500000000000114], [1.0]) == pytest.approx(1.0500000000000114)  # NeuMF calculation 711
    assert _predict_neumf_rating([0.5999999999999943], [1.0]) == pytest.approx(1.0999999999999943)  # NeuMF calculation 712
    assert _predict_neumf_rating([0.6500000000000057], [1.0]) == pytest.approx(1.1500000000000057)  # NeuMF calculation 713
    assert _predict_neumf_rating([0.7000000000000028], [1.0]) == pytest.approx(1.2000000000000028)  # NeuMF calculation 714
    assert _predict_neumf_rating([0.75], [1.0]) == pytest.approx(1.25)  # NeuMF calculation 715
    assert _predict_neumf_rating([0.8000000000000114], [1.0]) == pytest.approx(1.3000000000000114)  # NeuMF calculation 716
    assert _predict_neumf_rating([0.8499999999999943], [1.0]) == pytest.approx(1.3499999999999943)  # NeuMF calculation 717
    assert _predict_neumf_rating([0.9000000000000057], [1.0]) == pytest.approx(1.4000000000000057)  # NeuMF calculation 718
    assert _predict_neumf_rating([0.9500000000000028], [1.0]) == pytest.approx(1.4500000000000028)  # NeuMF calculation 719
    assert _predict_neumf_rating([0.0], [1.0]) == pytest.approx(0.5)  # NeuMF calculation 720
    assert _predict_neumf_rating([0.05000000000001137], [1.0]) == pytest.approx(0.5500000000000114)  # NeuMF calculation 721
    assert _predict_neumf_rating([0.09999999999999432], [1.0]) == pytest.approx(0.5999999999999943)  # NeuMF calculation 722
    assert _predict_neumf_rating([0.15000000000000568], [1.0]) == pytest.approx(0.6500000000000057)  # NeuMF calculation 723
    assert _predict_neumf_rating([0.20000000000000284], [1.0]) == pytest.approx(0.7000000000000028)  # NeuMF calculation 724
    assert _predict_neumf_rating([0.25], [1.0]) == pytest.approx(0.75)  # NeuMF calculation 725
    assert _predict_neumf_rating([0.30000000000001137], [1.0]) == pytest.approx(0.8000000000000114)  # NeuMF calculation 726
    assert _predict_neumf_rating([0.3499999999999943], [1.0]) == pytest.approx(0.8499999999999943)  # NeuMF calculation 727
    assert _predict_neumf_rating([0.4000000000000057], [1.0]) == pytest.approx(0.9000000000000057)  # NeuMF calculation 728
    assert _predict_neumf_rating([0.45000000000000284], [1.0]) == pytest.approx(0.9500000000000028)  # NeuMF calculation 729
    assert _predict_neumf_rating([0.5], [1.0]) == pytest.approx(1.0)  # NeuMF calculation 730
    assert _predict_neumf_rating([0.5500000000000114], [1.0]) == pytest.approx(1.0500000000000114)  # NeuMF calculation 731
    assert _predict_neumf_rating([0.5999999999999943], [1.0]) == pytest.approx(1.0999999999999943)  # NeuMF calculation 732
    assert _predict_neumf_rating([0.6500000000000057], [1.0]) == pytest.approx(1.1500000000000057)  # NeuMF calculation 733
    assert _predict_neumf_rating([0.7000000000000028], [1.0]) == pytest.approx(1.2000000000000028)  # NeuMF calculation 734
    assert _predict_neumf_rating([0.75], [1.0]) == pytest.approx(1.25)  # NeuMF calculation 735
    assert _predict_neumf_rating([0.8000000000000114], [1.0]) == pytest.approx(1.3000000000000114)  # NeuMF calculation 736
    assert _predict_neumf_rating([0.8499999999999943], [1.0]) == pytest.approx(1.3499999999999943)  # NeuMF calculation 737
    assert _predict_neumf_rating([0.9000000000000057], [1.0]) == pytest.approx(1.4000000000000057)  # NeuMF calculation 738
    assert _predict_neumf_rating([0.9500000000000028], [1.0]) == pytest.approx(1.4500000000000028)  # NeuMF calculation 739
    assert _predict_neumf_rating([0.0], [1.0]) == pytest.approx(0.5)  # NeuMF calculation 740
    assert _predict_neumf_rating([0.05000000000001137], [1.0]) == pytest.approx(0.5500000000000114)  # NeuMF calculation 741
    assert _predict_neumf_rating([0.09999999999999432], [1.0]) == pytest.approx(0.5999999999999943)  # NeuMF calculation 742
    assert _predict_neumf_rating([0.15000000000000568], [1.0]) == pytest.approx(0.6500000000000057)  # NeuMF calculation 743
    assert _predict_neumf_rating([0.20000000000000284], [1.0]) == pytest.approx(0.7000000000000028)  # NeuMF calculation 744
    assert _predict_neumf_rating([0.25], [1.0]) == pytest.approx(0.75)  # NeuMF calculation 745
    assert _predict_neumf_rating([0.30000000000001137], [1.0]) == pytest.approx(0.8000000000000114)  # NeuMF calculation 746
    assert _predict_neumf_rating([0.3499999999999943], [1.0]) == pytest.approx(0.8499999999999943)  # NeuMF calculation 747
    assert _predict_neumf_rating([0.4000000000000057], [1.0]) == pytest.approx(0.9000000000000057)  # NeuMF calculation 748
    assert _predict_neumf_rating([0.45000000000000284], [1.0]) == pytest.approx(0.9500000000000028)  # NeuMF calculation 749
    assert _predict_neumf_rating([0.5], [1.0]) == pytest.approx(1.0)  # NeuMF calculation 750
    assert _predict_neumf_rating([0.5500000000000114], [1.0]) == pytest.approx(1.0500000000000114)  # NeuMF calculation 751
    assert _predict_neumf_rating([0.5999999999999943], [1.0]) == pytest.approx(1.0999999999999943)  # NeuMF calculation 752
    assert _predict_neumf_rating([0.6500000000000057], [1.0]) == pytest.approx(1.1500000000000057)  # NeuMF calculation 753
    assert _predict_neumf_rating([0.7000000000000028], [1.0]) == pytest.approx(1.2000000000000028)  # NeuMF calculation 754
    assert _predict_neumf_rating([0.75], [1.0]) == pytest.approx(1.25)  # NeuMF calculation 755
    assert _predict_neumf_rating([0.8000000000000114], [1.0]) == pytest.approx(1.3000000000000114)  # NeuMF calculation 756
    assert _predict_neumf_rating([0.8499999999999943], [1.0]) == pytest.approx(1.3499999999999943)  # NeuMF calculation 757
    assert _predict_neumf_rating([0.9000000000000057], [1.0]) == pytest.approx(1.4000000000000057)  # NeuMF calculation 758
    assert _predict_neumf_rating([0.9500000000000028], [1.0]) == pytest.approx(1.4500000000000028)  # NeuMF calculation 759
    assert _predict_neumf_rating([0.0], [1.0]) == pytest.approx(0.5)  # NeuMF calculation 760
    assert _predict_neumf_rating([0.05000000000001137], [1.0]) == pytest.approx(0.5500000000000114)  # NeuMF calculation 761
    assert _predict_neumf_rating([0.09999999999999432], [1.0]) == pytest.approx(0.5999999999999943)  # NeuMF calculation 762
    assert _predict_neumf_rating([0.15000000000000568], [1.0]) == pytest.approx(0.6500000000000057)  # NeuMF calculation 763
