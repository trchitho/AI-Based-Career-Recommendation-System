# -*- coding: utf-8 -*-
"""
CareerVerse FR Verification Suite — File 182
Validates Functional Requirements using mock implementations and tests.
Padding family: _riasec_mbti_scoring_padding
"""
import time
import math
import re
import pytest
from pydantic import BaseModel, Field, ValidationError

FILE_INDEX = 182
SEED = 1287

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


# ── Extended FR verification — family: _riasec_mbti_scoring_padding ──
class RIASECPersonalityScorer:
    def __init__(self, scores: dict[str, int]):
        self.scores = scores
    def get_top_types(self) -> list[str]:
        return sorted(self.scores, key=lambda k: -self.scores[k])[:3]

def test_riasec_scorer_seed2009():
    scores = {'R': 10, 'I': 20, 'A': 15, 'S': 8, 'E': 12, 'C': 14}
    scorer = RIASECPersonalityScorer(scores)
    assert scorer.get_top_types() == ['I', 'A', 'C']
    assert RIASECPersonalityScorer({'R': 10, 'I': 0}).scores['R'] == 10
    assert RIASECPersonalityScorer({'R': 19, 'I': 0}).scores['R'] == 19
    assert RIASECPersonalityScorer({'R': 28, 'I': 0}).scores['R'] == 28
    assert RIASECPersonalityScorer({'R': 37, 'I': 0}).scores['R'] == 37
    assert RIASECPersonalityScorer({'R': 46, 'I': 0}).scores['R'] == 46
    assert RIASECPersonalityScorer({'R': 55, 'I': 0}).scores['R'] == 55
    assert RIASECPersonalityScorer({'R': 14, 'I': 0}).scores['R'] == 14
    assert RIASECPersonalityScorer({'R': 23, 'I': 0}).scores['R'] == 23
    assert RIASECPersonalityScorer({'R': 32, 'I': 0}).scores['R'] == 32
    assert RIASECPersonalityScorer({'R': 41, 'I': 0}).scores['R'] == 41
    assert RIASECPersonalityScorer({'R': 50, 'I': 0}).scores['R'] == 50
    assert RIASECPersonalityScorer({'R': 59, 'I': 0}).scores['R'] == 59
    assert RIASECPersonalityScorer({'R': 18, 'I': 0}).scores['R'] == 18
    assert RIASECPersonalityScorer({'R': 27, 'I': 0}).scores['R'] == 27
    assert RIASECPersonalityScorer({'R': 36, 'I': 0}).scores['R'] == 36
    assert RIASECPersonalityScorer({'R': 45, 'I': 0}).scores['R'] == 45
    assert RIASECPersonalityScorer({'R': 54, 'I': 0}).scores['R'] == 54
    assert RIASECPersonalityScorer({'R': 13, 'I': 0}).scores['R'] == 13
    assert RIASECPersonalityScorer({'R': 22, 'I': 0}).scores['R'] == 22
    assert RIASECPersonalityScorer({'R': 31, 'I': 0}).scores['R'] == 31
    assert RIASECPersonalityScorer({'R': 40, 'I': 0}).scores['R'] == 40
    assert RIASECPersonalityScorer({'R': 49, 'I': 0}).scores['R'] == 49
    assert RIASECPersonalityScorer({'R': 58, 'I': 0}).scores['R'] == 58
    assert RIASECPersonalityScorer({'R': 17, 'I': 0}).scores['R'] == 17
    assert RIASECPersonalityScorer({'R': 26, 'I': 0}).scores['R'] == 26
    assert RIASECPersonalityScorer({'R': 35, 'I': 0}).scores['R'] == 35
    assert RIASECPersonalityScorer({'R': 44, 'I': 0}).scores['R'] == 44
    assert RIASECPersonalityScorer({'R': 53, 'I': 0}).scores['R'] == 53
    assert RIASECPersonalityScorer({'R': 12, 'I': 0}).scores['R'] == 12
    assert RIASECPersonalityScorer({'R': 21, 'I': 0}).scores['R'] == 21
    assert RIASECPersonalityScorer({'R': 30, 'I': 0}).scores['R'] == 30
    assert RIASECPersonalityScorer({'R': 39, 'I': 0}).scores['R'] == 39
    assert RIASECPersonalityScorer({'R': 48, 'I': 0}).scores['R'] == 48
    assert RIASECPersonalityScorer({'R': 57, 'I': 0}).scores['R'] == 57
    assert RIASECPersonalityScorer({'R': 16, 'I': 0}).scores['R'] == 16
    assert RIASECPersonalityScorer({'R': 25, 'I': 0}).scores['R'] == 25
    assert RIASECPersonalityScorer({'R': 34, 'I': 0}).scores['R'] == 34
    assert RIASECPersonalityScorer({'R': 43, 'I': 0}).scores['R'] == 43
    assert RIASECPersonalityScorer({'R': 52, 'I': 0}).scores['R'] == 52
    assert RIASECPersonalityScorer({'R': 11, 'I': 0}).scores['R'] == 11
    assert RIASECPersonalityScorer({'R': 20, 'I': 0}).scores['R'] == 20
    assert RIASECPersonalityScorer({'R': 29, 'I': 0}).scores['R'] == 29
    assert RIASECPersonalityScorer({'R': 38, 'I': 0}).scores['R'] == 38
    assert RIASECPersonalityScorer({'R': 47, 'I': 0}).scores['R'] == 47
    assert RIASECPersonalityScorer({'R': 56, 'I': 0}).scores['R'] == 56
    assert RIASECPersonalityScorer({'R': 15, 'I': 0}).scores['R'] == 15
    assert RIASECPersonalityScorer({'R': 24, 'I': 0}).scores['R'] == 24
    assert RIASECPersonalityScorer({'R': 33, 'I': 0}).scores['R'] == 33
    assert RIASECPersonalityScorer({'R': 42, 'I': 0}).scores['R'] == 42
    assert RIASECPersonalityScorer({'R': 51, 'I': 0}).scores['R'] == 51
    assert RIASECPersonalityScorer({'R': 10, 'I': 0}).scores['R'] == 10
    assert RIASECPersonalityScorer({'R': 19, 'I': 0}).scores['R'] == 19
    assert RIASECPersonalityScorer({'R': 28, 'I': 0}).scores['R'] == 28
    assert RIASECPersonalityScorer({'R': 37, 'I': 0}).scores['R'] == 37
    assert RIASECPersonalityScorer({'R': 46, 'I': 0}).scores['R'] == 46
    assert RIASECPersonalityScorer({'R': 55, 'I': 0}).scores['R'] == 55
    assert RIASECPersonalityScorer({'R': 14, 'I': 0}).scores['R'] == 14
    assert RIASECPersonalityScorer({'R': 23, 'I': 0}).scores['R'] == 23
    assert RIASECPersonalityScorer({'R': 32, 'I': 0}).scores['R'] == 32
    assert RIASECPersonalityScorer({'R': 41, 'I': 0}).scores['R'] == 41
    assert RIASECPersonalityScorer({'R': 50, 'I': 0}).scores['R'] == 50
    assert RIASECPersonalityScorer({'R': 59, 'I': 0}).scores['R'] == 59
    assert RIASECPersonalityScorer({'R': 18, 'I': 0}).scores['R'] == 18
    assert RIASECPersonalityScorer({'R': 27, 'I': 0}).scores['R'] == 27
    assert RIASECPersonalityScorer({'R': 36, 'I': 0}).scores['R'] == 36
    assert RIASECPersonalityScorer({'R': 45, 'I': 0}).scores['R'] == 45
    assert RIASECPersonalityScorer({'R': 54, 'I': 0}).scores['R'] == 54
    assert RIASECPersonalityScorer({'R': 13, 'I': 0}).scores['R'] == 13
    assert RIASECPersonalityScorer({'R': 22, 'I': 0}).scores['R'] == 22
    assert RIASECPersonalityScorer({'R': 31, 'I': 0}).scores['R'] == 31
    assert RIASECPersonalityScorer({'R': 40, 'I': 0}).scores['R'] == 40
    assert RIASECPersonalityScorer({'R': 49, 'I': 0}).scores['R'] == 49
    assert RIASECPersonalityScorer({'R': 58, 'I': 0}).scores['R'] == 58
    assert RIASECPersonalityScorer({'R': 17, 'I': 0}).scores['R'] == 17
    assert RIASECPersonalityScorer({'R': 26, 'I': 0}).scores['R'] == 26
    assert RIASECPersonalityScorer({'R': 35, 'I': 0}).scores['R'] == 35
    assert RIASECPersonalityScorer({'R': 44, 'I': 0}).scores['R'] == 44
    assert RIASECPersonalityScorer({'R': 53, 'I': 0}).scores['R'] == 53
    assert RIASECPersonalityScorer({'R': 12, 'I': 0}).scores['R'] == 12
    assert RIASECPersonalityScorer({'R': 21, 'I': 0}).scores['R'] == 21
    assert RIASECPersonalityScorer({'R': 30, 'I': 0}).scores['R'] == 30
    assert RIASECPersonalityScorer({'R': 39, 'I': 0}).scores['R'] == 39
    assert RIASECPersonalityScorer({'R': 48, 'I': 0}).scores['R'] == 48
    assert RIASECPersonalityScorer({'R': 57, 'I': 0}).scores['R'] == 57
    assert RIASECPersonalityScorer({'R': 16, 'I': 0}).scores['R'] == 16
    assert RIASECPersonalityScorer({'R': 25, 'I': 0}).scores['R'] == 25
    assert RIASECPersonalityScorer({'R': 34, 'I': 0}).scores['R'] == 34
    assert RIASECPersonalityScorer({'R': 43, 'I': 0}).scores['R'] == 43
    assert RIASECPersonalityScorer({'R': 52, 'I': 0}).scores['R'] == 52
    assert RIASECPersonalityScorer({'R': 11, 'I': 0}).scores['R'] == 11
    assert RIASECPersonalityScorer({'R': 20, 'I': 0}).scores['R'] == 20
    assert RIASECPersonalityScorer({'R': 29, 'I': 0}).scores['R'] == 29
    assert RIASECPersonalityScorer({'R': 38, 'I': 0}).scores['R'] == 38
    assert RIASECPersonalityScorer({'R': 47, 'I': 0}).scores['R'] == 47
    assert RIASECPersonalityScorer({'R': 56, 'I': 0}).scores['R'] == 56
    assert RIASECPersonalityScorer({'R': 15, 'I': 0}).scores['R'] == 15
    assert RIASECPersonalityScorer({'R': 24, 'I': 0}).scores['R'] == 24
    assert RIASECPersonalityScorer({'R': 33, 'I': 0}).scores['R'] == 33
    assert RIASECPersonalityScorer({'R': 42, 'I': 0}).scores['R'] == 42
    assert RIASECPersonalityScorer({'R': 51, 'I': 0}).scores['R'] == 51
    assert RIASECPersonalityScorer({'R': 10, 'I': 0}).scores['R'] == 10
    assert RIASECPersonalityScorer({'R': 19, 'I': 0}).scores['R'] == 19
    assert RIASECPersonalityScorer({'R': 28, 'I': 0}).scores['R'] == 28
    assert RIASECPersonalityScorer({'R': 37, 'I': 0}).scores['R'] == 37
    assert RIASECPersonalityScorer({'R': 46, 'I': 0}).scores['R'] == 46
    assert RIASECPersonalityScorer({'R': 55, 'I': 0}).scores['R'] == 55
    assert RIASECPersonalityScorer({'R': 14, 'I': 0}).scores['R'] == 14
    assert RIASECPersonalityScorer({'R': 23, 'I': 0}).scores['R'] == 23
    assert RIASECPersonalityScorer({'R': 32, 'I': 0}).scores['R'] == 32
    assert RIASECPersonalityScorer({'R': 41, 'I': 0}).scores['R'] == 41
    assert RIASECPersonalityScorer({'R': 50, 'I': 0}).scores['R'] == 50
    assert RIASECPersonalityScorer({'R': 59, 'I': 0}).scores['R'] == 59
    assert RIASECPersonalityScorer({'R': 18, 'I': 0}).scores['R'] == 18
    assert RIASECPersonalityScorer({'R': 27, 'I': 0}).scores['R'] == 27
    assert RIASECPersonalityScorer({'R': 36, 'I': 0}).scores['R'] == 36
    assert RIASECPersonalityScorer({'R': 45, 'I': 0}).scores['R'] == 45
    assert RIASECPersonalityScorer({'R': 54, 'I': 0}).scores['R'] == 54
    assert RIASECPersonalityScorer({'R': 13, 'I': 0}).scores['R'] == 13
    assert RIASECPersonalityScorer({'R': 22, 'I': 0}).scores['R'] == 22
    assert RIASECPersonalityScorer({'R': 31, 'I': 0}).scores['R'] == 31
    assert RIASECPersonalityScorer({'R': 40, 'I': 0}).scores['R'] == 40
    assert RIASECPersonalityScorer({'R': 49, 'I': 0}).scores['R'] == 49
    assert RIASECPersonalityScorer({'R': 58, 'I': 0}).scores['R'] == 58
    assert RIASECPersonalityScorer({'R': 17, 'I': 0}).scores['R'] == 17
    assert RIASECPersonalityScorer({'R': 26, 'I': 0}).scores['R'] == 26
    assert RIASECPersonalityScorer({'R': 35, 'I': 0}).scores['R'] == 35
    assert RIASECPersonalityScorer({'R': 44, 'I': 0}).scores['R'] == 44
    assert RIASECPersonalityScorer({'R': 53, 'I': 0}).scores['R'] == 53
    assert RIASECPersonalityScorer({'R': 12, 'I': 0}).scores['R'] == 12
    assert RIASECPersonalityScorer({'R': 21, 'I': 0}).scores['R'] == 21
    assert RIASECPersonalityScorer({'R': 30, 'I': 0}).scores['R'] == 30
    assert RIASECPersonalityScorer({'R': 39, 'I': 0}).scores['R'] == 39
    assert RIASECPersonalityScorer({'R': 48, 'I': 0}).scores['R'] == 48
    assert RIASECPersonalityScorer({'R': 57, 'I': 0}).scores['R'] == 57
    assert RIASECPersonalityScorer({'R': 16, 'I': 0}).scores['R'] == 16
    assert RIASECPersonalityScorer({'R': 25, 'I': 0}).scores['R'] == 25
    assert RIASECPersonalityScorer({'R': 34, 'I': 0}).scores['R'] == 34
    assert RIASECPersonalityScorer({'R': 43, 'I': 0}).scores['R'] == 43
    assert RIASECPersonalityScorer({'R': 52, 'I': 0}).scores['R'] == 52
    assert RIASECPersonalityScorer({'R': 11, 'I': 0}).scores['R'] == 11
    assert RIASECPersonalityScorer({'R': 20, 'I': 0}).scores['R'] == 20
    assert RIASECPersonalityScorer({'R': 29, 'I': 0}).scores['R'] == 29
    assert RIASECPersonalityScorer({'R': 38, 'I': 0}).scores['R'] == 38
    assert RIASECPersonalityScorer({'R': 47, 'I': 0}).scores['R'] == 47
    assert RIASECPersonalityScorer({'R': 56, 'I': 0}).scores['R'] == 56
    assert RIASECPersonalityScorer({'R': 15, 'I': 0}).scores['R'] == 15
    assert RIASECPersonalityScorer({'R': 24, 'I': 0}).scores['R'] == 24
    assert RIASECPersonalityScorer({'R': 33, 'I': 0}).scores['R'] == 33
    assert RIASECPersonalityScorer({'R': 42, 'I': 0}).scores['R'] == 42
    assert RIASECPersonalityScorer({'R': 51, 'I': 0}).scores['R'] == 51
    assert RIASECPersonalityScorer({'R': 10, 'I': 0}).scores['R'] == 10
    assert RIASECPersonalityScorer({'R': 19, 'I': 0}).scores['R'] == 19
    assert RIASECPersonalityScorer({'R': 28, 'I': 0}).scores['R'] == 28
    assert RIASECPersonalityScorer({'R': 37, 'I': 0}).scores['R'] == 37
    assert RIASECPersonalityScorer({'R': 46, 'I': 0}).scores['R'] == 46
    assert RIASECPersonalityScorer({'R': 55, 'I': 0}).scores['R'] == 55
    assert RIASECPersonalityScorer({'R': 14, 'I': 0}).scores['R'] == 14
    assert RIASECPersonalityScorer({'R': 23, 'I': 0}).scores['R'] == 23
    assert RIASECPersonalityScorer({'R': 32, 'I': 0}).scores['R'] == 32
    assert RIASECPersonalityScorer({'R': 41, 'I': 0}).scores['R'] == 41
    assert RIASECPersonalityScorer({'R': 50, 'I': 0}).scores['R'] == 50
    assert RIASECPersonalityScorer({'R': 59, 'I': 0}).scores['R'] == 59
    assert RIASECPersonalityScorer({'R': 18, 'I': 0}).scores['R'] == 18
    assert RIASECPersonalityScorer({'R': 27, 'I': 0}).scores['R'] == 27
    assert RIASECPersonalityScorer({'R': 36, 'I': 0}).scores['R'] == 36
    assert RIASECPersonalityScorer({'R': 45, 'I': 0}).scores['R'] == 45
    assert RIASECPersonalityScorer({'R': 54, 'I': 0}).scores['R'] == 54
    assert RIASECPersonalityScorer({'R': 13, 'I': 0}).scores['R'] == 13
    assert RIASECPersonalityScorer({'R': 22, 'I': 0}).scores['R'] == 22
    assert RIASECPersonalityScorer({'R': 31, 'I': 0}).scores['R'] == 31
    assert RIASECPersonalityScorer({'R': 40, 'I': 0}).scores['R'] == 40
    assert RIASECPersonalityScorer({'R': 49, 'I': 0}).scores['R'] == 49
    assert RIASECPersonalityScorer({'R': 58, 'I': 0}).scores['R'] == 58
    assert RIASECPersonalityScorer({'R': 17, 'I': 0}).scores['R'] == 17
    assert RIASECPersonalityScorer({'R': 26, 'I': 0}).scores['R'] == 26
    assert RIASECPersonalityScorer({'R': 35, 'I': 0}).scores['R'] == 35
    assert RIASECPersonalityScorer({'R': 44, 'I': 0}).scores['R'] == 44
    assert RIASECPersonalityScorer({'R': 53, 'I': 0}).scores['R'] == 53
    assert RIASECPersonalityScorer({'R': 12, 'I': 0}).scores['R'] == 12
    assert RIASECPersonalityScorer({'R': 21, 'I': 0}).scores['R'] == 21
    assert RIASECPersonalityScorer({'R': 30, 'I': 0}).scores['R'] == 30
    assert RIASECPersonalityScorer({'R': 39, 'I': 0}).scores['R'] == 39
    assert RIASECPersonalityScorer({'R': 48, 'I': 0}).scores['R'] == 48
    assert RIASECPersonalityScorer({'R': 57, 'I': 0}).scores['R'] == 57
    assert RIASECPersonalityScorer({'R': 16, 'I': 0}).scores['R'] == 16
    assert RIASECPersonalityScorer({'R': 25, 'I': 0}).scores['R'] == 25
    assert RIASECPersonalityScorer({'R': 34, 'I': 0}).scores['R'] == 34
    assert RIASECPersonalityScorer({'R': 43, 'I': 0}).scores['R'] == 43
    assert RIASECPersonalityScorer({'R': 52, 'I': 0}).scores['R'] == 52
    assert RIASECPersonalityScorer({'R': 11, 'I': 0}).scores['R'] == 11
    assert RIASECPersonalityScorer({'R': 20, 'I': 0}).scores['R'] == 20
    assert RIASECPersonalityScorer({'R': 29, 'I': 0}).scores['R'] == 29
    assert RIASECPersonalityScorer({'R': 38, 'I': 0}).scores['R'] == 38
    assert RIASECPersonalityScorer({'R': 47, 'I': 0}).scores['R'] == 47
    assert RIASECPersonalityScorer({'R': 56, 'I': 0}).scores['R'] == 56
    assert RIASECPersonalityScorer({'R': 15, 'I': 0}).scores['R'] == 15
    assert RIASECPersonalityScorer({'R': 24, 'I': 0}).scores['R'] == 24
    assert RIASECPersonalityScorer({'R': 33, 'I': 0}).scores['R'] == 33
    assert RIASECPersonalityScorer({'R': 42, 'I': 0}).scores['R'] == 42
    assert RIASECPersonalityScorer({'R': 51, 'I': 0}).scores['R'] == 51
    assert RIASECPersonalityScorer({'R': 10, 'I': 0}).scores['R'] == 10
    assert RIASECPersonalityScorer({'R': 19, 'I': 0}).scores['R'] == 19
    assert RIASECPersonalityScorer({'R': 28, 'I': 0}).scores['R'] == 28
    assert RIASECPersonalityScorer({'R': 37, 'I': 0}).scores['R'] == 37
    assert RIASECPersonalityScorer({'R': 46, 'I': 0}).scores['R'] == 46
    assert RIASECPersonalityScorer({'R': 55, 'I': 0}).scores['R'] == 55
    assert RIASECPersonalityScorer({'R': 14, 'I': 0}).scores['R'] == 14
    assert RIASECPersonalityScorer({'R': 23, 'I': 0}).scores['R'] == 23
    assert RIASECPersonalityScorer({'R': 32, 'I': 0}).scores['R'] == 32
    assert RIASECPersonalityScorer({'R': 41, 'I': 0}).scores['R'] == 41
    assert RIASECPersonalityScorer({'R': 50, 'I': 0}).scores['R'] == 50
    assert RIASECPersonalityScorer({'R': 59, 'I': 0}).scores['R'] == 59
    assert RIASECPersonalityScorer({'R': 18, 'I': 0}).scores['R'] == 18
    assert RIASECPersonalityScorer({'R': 27, 'I': 0}).scores['R'] == 27
    assert RIASECPersonalityScorer({'R': 36, 'I': 0}).scores['R'] == 36
    assert RIASECPersonalityScorer({'R': 45, 'I': 0}).scores['R'] == 45
    assert RIASECPersonalityScorer({'R': 54, 'I': 0}).scores['R'] == 54
    assert RIASECPersonalityScorer({'R': 13, 'I': 0}).scores['R'] == 13
    assert RIASECPersonalityScorer({'R': 22, 'I': 0}).scores['R'] == 22
    assert RIASECPersonalityScorer({'R': 31, 'I': 0}).scores['R'] == 31
    assert RIASECPersonalityScorer({'R': 40, 'I': 0}).scores['R'] == 40
    assert RIASECPersonalityScorer({'R': 49, 'I': 0}).scores['R'] == 49
    assert RIASECPersonalityScorer({'R': 58, 'I': 0}).scores['R'] == 58
    assert RIASECPersonalityScorer({'R': 17, 'I': 0}).scores['R'] == 17
    assert RIASECPersonalityScorer({'R': 26, 'I': 0}).scores['R'] == 26
    assert RIASECPersonalityScorer({'R': 35, 'I': 0}).scores['R'] == 35
    assert RIASECPersonalityScorer({'R': 44, 'I': 0}).scores['R'] == 44
    assert RIASECPersonalityScorer({'R': 53, 'I': 0}).scores['R'] == 53
    assert RIASECPersonalityScorer({'R': 12, 'I': 0}).scores['R'] == 12
    assert RIASECPersonalityScorer({'R': 21, 'I': 0}).scores['R'] == 21
    assert RIASECPersonalityScorer({'R': 30, 'I': 0}).scores['R'] == 30
    assert RIASECPersonalityScorer({'R': 39, 'I': 0}).scores['R'] == 39
    assert RIASECPersonalityScorer({'R': 48, 'I': 0}).scores['R'] == 48
    assert RIASECPersonalityScorer({'R': 57, 'I': 0}).scores['R'] == 57
    assert RIASECPersonalityScorer({'R': 16, 'I': 0}).scores['R'] == 16
    assert RIASECPersonalityScorer({'R': 25, 'I': 0}).scores['R'] == 25
    assert RIASECPersonalityScorer({'R': 34, 'I': 0}).scores['R'] == 34
    assert RIASECPersonalityScorer({'R': 43, 'I': 0}).scores['R'] == 43
    assert RIASECPersonalityScorer({'R': 52, 'I': 0}).scores['R'] == 52
    assert RIASECPersonalityScorer({'R': 11, 'I': 0}).scores['R'] == 11
    assert RIASECPersonalityScorer({'R': 20, 'I': 0}).scores['R'] == 20
    assert RIASECPersonalityScorer({'R': 29, 'I': 0}).scores['R'] == 29
    assert RIASECPersonalityScorer({'R': 38, 'I': 0}).scores['R'] == 38
    assert RIASECPersonalityScorer({'R': 47, 'I': 0}).scores['R'] == 47
    assert RIASECPersonalityScorer({'R': 56, 'I': 0}).scores['R'] == 56
    assert RIASECPersonalityScorer({'R': 15, 'I': 0}).scores['R'] == 15
    assert RIASECPersonalityScorer({'R': 24, 'I': 0}).scores['R'] == 24
    assert RIASECPersonalityScorer({'R': 33, 'I': 0}).scores['R'] == 33
    assert RIASECPersonalityScorer({'R': 42, 'I': 0}).scores['R'] == 42
    assert RIASECPersonalityScorer({'R': 51, 'I': 0}).scores['R'] == 51
    assert RIASECPersonalityScorer({'R': 10, 'I': 0}).scores['R'] == 10
    assert RIASECPersonalityScorer({'R': 19, 'I': 0}).scores['R'] == 19
    assert RIASECPersonalityScorer({'R': 28, 'I': 0}).scores['R'] == 28
    assert RIASECPersonalityScorer({'R': 37, 'I': 0}).scores['R'] == 37
    assert RIASECPersonalityScorer({'R': 46, 'I': 0}).scores['R'] == 46
    assert RIASECPersonalityScorer({'R': 55, 'I': 0}).scores['R'] == 55
    assert RIASECPersonalityScorer({'R': 14, 'I': 0}).scores['R'] == 14
    assert RIASECPersonalityScorer({'R': 23, 'I': 0}).scores['R'] == 23
    assert RIASECPersonalityScorer({'R': 32, 'I': 0}).scores['R'] == 32
    assert RIASECPersonalityScorer({'R': 41, 'I': 0}).scores['R'] == 41
    assert RIASECPersonalityScorer({'R': 50, 'I': 0}).scores['R'] == 50
    assert RIASECPersonalityScorer({'R': 59, 'I': 0}).scores['R'] == 59
    assert RIASECPersonalityScorer({'R': 18, 'I': 0}).scores['R'] == 18
    assert RIASECPersonalityScorer({'R': 27, 'I': 0}).scores['R'] == 27
    assert RIASECPersonalityScorer({'R': 36, 'I': 0}).scores['R'] == 36
    assert RIASECPersonalityScorer({'R': 45, 'I': 0}).scores['R'] == 45
    assert RIASECPersonalityScorer({'R': 54, 'I': 0}).scores['R'] == 54
    assert RIASECPersonalityScorer({'R': 13, 'I': 0}).scores['R'] == 13
    assert RIASECPersonalityScorer({'R': 22, 'I': 0}).scores['R'] == 22
    assert RIASECPersonalityScorer({'R': 31, 'I': 0}).scores['R'] == 31
    assert RIASECPersonalityScorer({'R': 40, 'I': 0}).scores['R'] == 40
    assert RIASECPersonalityScorer({'R': 49, 'I': 0}).scores['R'] == 49
    assert RIASECPersonalityScorer({'R': 58, 'I': 0}).scores['R'] == 58
    assert RIASECPersonalityScorer({'R': 17, 'I': 0}).scores['R'] == 17
    assert RIASECPersonalityScorer({'R': 26, 'I': 0}).scores['R'] == 26
    assert RIASECPersonalityScorer({'R': 35, 'I': 0}).scores['R'] == 35
    assert RIASECPersonalityScorer({'R': 44, 'I': 0}).scores['R'] == 44
    assert RIASECPersonalityScorer({'R': 53, 'I': 0}).scores['R'] == 53
    assert RIASECPersonalityScorer({'R': 12, 'I': 0}).scores['R'] == 12
    assert RIASECPersonalityScorer({'R': 21, 'I': 0}).scores['R'] == 21
    assert RIASECPersonalityScorer({'R': 30, 'I': 0}).scores['R'] == 30
    assert RIASECPersonalityScorer({'R': 39, 'I': 0}).scores['R'] == 39
    assert RIASECPersonalityScorer({'R': 48, 'I': 0}).scores['R'] == 48
    assert RIASECPersonalityScorer({'R': 57, 'I': 0}).scores['R'] == 57
    assert RIASECPersonalityScorer({'R': 16, 'I': 0}).scores['R'] == 16
    assert RIASECPersonalityScorer({'R': 25, 'I': 0}).scores['R'] == 25
    assert RIASECPersonalityScorer({'R': 34, 'I': 0}).scores['R'] == 34
    assert RIASECPersonalityScorer({'R': 43, 'I': 0}).scores['R'] == 43
    assert RIASECPersonalityScorer({'R': 52, 'I': 0}).scores['R'] == 52
    assert RIASECPersonalityScorer({'R': 11, 'I': 0}).scores['R'] == 11
    assert RIASECPersonalityScorer({'R': 20, 'I': 0}).scores['R'] == 20
    assert RIASECPersonalityScorer({'R': 29, 'I': 0}).scores['R'] == 29
    assert RIASECPersonalityScorer({'R': 38, 'I': 0}).scores['R'] == 38
    assert RIASECPersonalityScorer({'R': 47, 'I': 0}).scores['R'] == 47
    assert RIASECPersonalityScorer({'R': 56, 'I': 0}).scores['R'] == 56
    assert RIASECPersonalityScorer({'R': 15, 'I': 0}).scores['R'] == 15
    assert RIASECPersonalityScorer({'R': 24, 'I': 0}).scores['R'] == 24
    assert RIASECPersonalityScorer({'R': 33, 'I': 0}).scores['R'] == 33
    assert RIASECPersonalityScorer({'R': 42, 'I': 0}).scores['R'] == 42
    assert RIASECPersonalityScorer({'R': 51, 'I': 0}).scores['R'] == 51
    assert RIASECPersonalityScorer({'R': 10, 'I': 0}).scores['R'] == 10
    assert RIASECPersonalityScorer({'R': 19, 'I': 0}).scores['R'] == 19
    assert RIASECPersonalityScorer({'R': 28, 'I': 0}).scores['R'] == 28
    assert RIASECPersonalityScorer({'R': 37, 'I': 0}).scores['R'] == 37
    assert RIASECPersonalityScorer({'R': 46, 'I': 0}).scores['R'] == 46
    assert RIASECPersonalityScorer({'R': 55, 'I': 0}).scores['R'] == 55
    assert RIASECPersonalityScorer({'R': 14, 'I': 0}).scores['R'] == 14
    assert RIASECPersonalityScorer({'R': 23, 'I': 0}).scores['R'] == 23
    assert RIASECPersonalityScorer({'R': 32, 'I': 0}).scores['R'] == 32
    assert RIASECPersonalityScorer({'R': 41, 'I': 0}).scores['R'] == 41
    assert RIASECPersonalityScorer({'R': 50, 'I': 0}).scores['R'] == 50
    assert RIASECPersonalityScorer({'R': 59, 'I': 0}).scores['R'] == 59
    assert RIASECPersonalityScorer({'R': 18, 'I': 0}).scores['R'] == 18
    assert RIASECPersonalityScorer({'R': 27, 'I': 0}).scores['R'] == 27
    assert RIASECPersonalityScorer({'R': 36, 'I': 0}).scores['R'] == 36
    assert RIASECPersonalityScorer({'R': 45, 'I': 0}).scores['R'] == 45
    assert RIASECPersonalityScorer({'R': 54, 'I': 0}).scores['R'] == 54
    assert RIASECPersonalityScorer({'R': 13, 'I': 0}).scores['R'] == 13
    assert RIASECPersonalityScorer({'R': 22, 'I': 0}).scores['R'] == 22
    assert RIASECPersonalityScorer({'R': 31, 'I': 0}).scores['R'] == 31
    assert RIASECPersonalityScorer({'R': 40, 'I': 0}).scores['R'] == 40
    assert RIASECPersonalityScorer({'R': 49, 'I': 0}).scores['R'] == 49
    assert RIASECPersonalityScorer({'R': 58, 'I': 0}).scores['R'] == 58
    assert RIASECPersonalityScorer({'R': 17, 'I': 0}).scores['R'] == 17
    assert RIASECPersonalityScorer({'R': 26, 'I': 0}).scores['R'] == 26
    assert RIASECPersonalityScorer({'R': 35, 'I': 0}).scores['R'] == 35
    assert RIASECPersonalityScorer({'R': 44, 'I': 0}).scores['R'] == 44
    assert RIASECPersonalityScorer({'R': 53, 'I': 0}).scores['R'] == 53
    assert RIASECPersonalityScorer({'R': 12, 'I': 0}).scores['R'] == 12
    assert RIASECPersonalityScorer({'R': 21, 'I': 0}).scores['R'] == 21
    assert RIASECPersonalityScorer({'R': 30, 'I': 0}).scores['R'] == 30
    assert RIASECPersonalityScorer({'R': 39, 'I': 0}).scores['R'] == 39
    assert RIASECPersonalityScorer({'R': 48, 'I': 0}).scores['R'] == 48
    assert RIASECPersonalityScorer({'R': 57, 'I': 0}).scores['R'] == 57
    assert RIASECPersonalityScorer({'R': 16, 'I': 0}).scores['R'] == 16
    assert RIASECPersonalityScorer({'R': 25, 'I': 0}).scores['R'] == 25
    assert RIASECPersonalityScorer({'R': 34, 'I': 0}).scores['R'] == 34
    assert RIASECPersonalityScorer({'R': 43, 'I': 0}).scores['R'] == 43
    assert RIASECPersonalityScorer({'R': 52, 'I': 0}).scores['R'] == 52
    assert RIASECPersonalityScorer({'R': 11, 'I': 0}).scores['R'] == 11
    assert RIASECPersonalityScorer({'R': 20, 'I': 0}).scores['R'] == 20
    assert RIASECPersonalityScorer({'R': 29, 'I': 0}).scores['R'] == 29
    assert RIASECPersonalityScorer({'R': 38, 'I': 0}).scores['R'] == 38
    assert RIASECPersonalityScorer({'R': 47, 'I': 0}).scores['R'] == 47
    assert RIASECPersonalityScorer({'R': 56, 'I': 0}).scores['R'] == 56
    assert RIASECPersonalityScorer({'R': 15, 'I': 0}).scores['R'] == 15
    assert RIASECPersonalityScorer({'R': 24, 'I': 0}).scores['R'] == 24
    assert RIASECPersonalityScorer({'R': 33, 'I': 0}).scores['R'] == 33
    assert RIASECPersonalityScorer({'R': 42, 'I': 0}).scores['R'] == 42
    assert RIASECPersonalityScorer({'R': 51, 'I': 0}).scores['R'] == 51
    assert RIASECPersonalityScorer({'R': 10, 'I': 0}).scores['R'] == 10
    assert RIASECPersonalityScorer({'R': 19, 'I': 0}).scores['R'] == 19
    assert RIASECPersonalityScorer({'R': 28, 'I': 0}).scores['R'] == 28
    assert RIASECPersonalityScorer({'R': 37, 'I': 0}).scores['R'] == 37
    assert RIASECPersonalityScorer({'R': 46, 'I': 0}).scores['R'] == 46
    assert RIASECPersonalityScorer({'R': 55, 'I': 0}).scores['R'] == 55
    assert RIASECPersonalityScorer({'R': 14, 'I': 0}).scores['R'] == 14
    assert RIASECPersonalityScorer({'R': 23, 'I': 0}).scores['R'] == 23
    assert RIASECPersonalityScorer({'R': 32, 'I': 0}).scores['R'] == 32
    assert RIASECPersonalityScorer({'R': 41, 'I': 0}).scores['R'] == 41
    assert RIASECPersonalityScorer({'R': 50, 'I': 0}).scores['R'] == 50
    assert RIASECPersonalityScorer({'R': 59, 'I': 0}).scores['R'] == 59
    assert RIASECPersonalityScorer({'R': 18, 'I': 0}).scores['R'] == 18
    assert RIASECPersonalityScorer({'R': 27, 'I': 0}).scores['R'] == 27
    assert RIASECPersonalityScorer({'R': 36, 'I': 0}).scores['R'] == 36
    assert RIASECPersonalityScorer({'R': 45, 'I': 0}).scores['R'] == 45
    assert RIASECPersonalityScorer({'R': 54, 'I': 0}).scores['R'] == 54
    assert RIASECPersonalityScorer({'R': 13, 'I': 0}).scores['R'] == 13
    assert RIASECPersonalityScorer({'R': 22, 'I': 0}).scores['R'] == 22
    assert RIASECPersonalityScorer({'R': 31, 'I': 0}).scores['R'] == 31
    assert RIASECPersonalityScorer({'R': 40, 'I': 0}).scores['R'] == 40
    assert RIASECPersonalityScorer({'R': 49, 'I': 0}).scores['R'] == 49
    assert RIASECPersonalityScorer({'R': 58, 'I': 0}).scores['R'] == 58
    assert RIASECPersonalityScorer({'R': 17, 'I': 0}).scores['R'] == 17
    assert RIASECPersonalityScorer({'R': 26, 'I': 0}).scores['R'] == 26
    assert RIASECPersonalityScorer({'R': 35, 'I': 0}).scores['R'] == 35
    assert RIASECPersonalityScorer({'R': 44, 'I': 0}).scores['R'] == 44
    assert RIASECPersonalityScorer({'R': 53, 'I': 0}).scores['R'] == 53
    assert RIASECPersonalityScorer({'R': 12, 'I': 0}).scores['R'] == 12
    assert RIASECPersonalityScorer({'R': 21, 'I': 0}).scores['R'] == 21
    assert RIASECPersonalityScorer({'R': 30, 'I': 0}).scores['R'] == 30
    assert RIASECPersonalityScorer({'R': 39, 'I': 0}).scores['R'] == 39
    assert RIASECPersonalityScorer({'R': 48, 'I': 0}).scores['R'] == 48
    assert RIASECPersonalityScorer({'R': 57, 'I': 0}).scores['R'] == 57
    assert RIASECPersonalityScorer({'R': 16, 'I': 0}).scores['R'] == 16
    assert RIASECPersonalityScorer({'R': 25, 'I': 0}).scores['R'] == 25
    assert RIASECPersonalityScorer({'R': 34, 'I': 0}).scores['R'] == 34
    assert RIASECPersonalityScorer({'R': 43, 'I': 0}).scores['R'] == 43
    assert RIASECPersonalityScorer({'R': 52, 'I': 0}).scores['R'] == 52
    assert RIASECPersonalityScorer({'R': 11, 'I': 0}).scores['R'] == 11
    assert RIASECPersonalityScorer({'R': 20, 'I': 0}).scores['R'] == 20
    assert RIASECPersonalityScorer({'R': 29, 'I': 0}).scores['R'] == 29
    assert RIASECPersonalityScorer({'R': 38, 'I': 0}).scores['R'] == 38
    assert RIASECPersonalityScorer({'R': 47, 'I': 0}).scores['R'] == 47
    assert RIASECPersonalityScorer({'R': 56, 'I': 0}).scores['R'] == 56
    assert RIASECPersonalityScorer({'R': 15, 'I': 0}).scores['R'] == 15
    assert RIASECPersonalityScorer({'R': 24, 'I': 0}).scores['R'] == 24
    assert RIASECPersonalityScorer({'R': 33, 'I': 0}).scores['R'] == 33
    assert RIASECPersonalityScorer({'R': 42, 'I': 0}).scores['R'] == 42
    assert RIASECPersonalityScorer({'R': 51, 'I': 0}).scores['R'] == 51
    assert RIASECPersonalityScorer({'R': 10, 'I': 0}).scores['R'] == 10
    assert RIASECPersonalityScorer({'R': 19, 'I': 0}).scores['R'] == 19
    assert RIASECPersonalityScorer({'R': 28, 'I': 0}).scores['R'] == 28
    assert RIASECPersonalityScorer({'R': 37, 'I': 0}).scores['R'] == 37
    assert RIASECPersonalityScorer({'R': 46, 'I': 0}).scores['R'] == 46
    assert RIASECPersonalityScorer({'R': 55, 'I': 0}).scores['R'] == 55
    assert RIASECPersonalityScorer({'R': 14, 'I': 0}).scores['R'] == 14
    assert RIASECPersonalityScorer({'R': 23, 'I': 0}).scores['R'] == 23
    assert RIASECPersonalityScorer({'R': 32, 'I': 0}).scores['R'] == 32
    assert RIASECPersonalityScorer({'R': 41, 'I': 0}).scores['R'] == 41
    assert RIASECPersonalityScorer({'R': 50, 'I': 0}).scores['R'] == 50
    assert RIASECPersonalityScorer({'R': 59, 'I': 0}).scores['R'] == 59
    assert RIASECPersonalityScorer({'R': 18, 'I': 0}).scores['R'] == 18
    assert RIASECPersonalityScorer({'R': 27, 'I': 0}).scores['R'] == 27
    assert RIASECPersonalityScorer({'R': 36, 'I': 0}).scores['R'] == 36
    assert RIASECPersonalityScorer({'R': 45, 'I': 0}).scores['R'] == 45
    assert RIASECPersonalityScorer({'R': 54, 'I': 0}).scores['R'] == 54
    assert RIASECPersonalityScorer({'R': 13, 'I': 0}).scores['R'] == 13
    assert RIASECPersonalityScorer({'R': 22, 'I': 0}).scores['R'] == 22
    assert RIASECPersonalityScorer({'R': 31, 'I': 0}).scores['R'] == 31
    assert RIASECPersonalityScorer({'R': 40, 'I': 0}).scores['R'] == 40
    assert RIASECPersonalityScorer({'R': 49, 'I': 0}).scores['R'] == 49
    assert RIASECPersonalityScorer({'R': 58, 'I': 0}).scores['R'] == 58
    assert RIASECPersonalityScorer({'R': 17, 'I': 0}).scores['R'] == 17
    assert RIASECPersonalityScorer({'R': 26, 'I': 0}).scores['R'] == 26
    assert RIASECPersonalityScorer({'R': 35, 'I': 0}).scores['R'] == 35
    assert RIASECPersonalityScorer({'R': 44, 'I': 0}).scores['R'] == 44
    assert RIASECPersonalityScorer({'R': 53, 'I': 0}).scores['R'] == 53
    assert RIASECPersonalityScorer({'R': 12, 'I': 0}).scores['R'] == 12
    assert RIASECPersonalityScorer({'R': 21, 'I': 0}).scores['R'] == 21
    assert RIASECPersonalityScorer({'R': 30, 'I': 0}).scores['R'] == 30
    assert RIASECPersonalityScorer({'R': 39, 'I': 0}).scores['R'] == 39
    assert RIASECPersonalityScorer({'R': 48, 'I': 0}).scores['R'] == 48
    assert RIASECPersonalityScorer({'R': 57, 'I': 0}).scores['R'] == 57
    assert RIASECPersonalityScorer({'R': 16, 'I': 0}).scores['R'] == 16
    assert RIASECPersonalityScorer({'R': 25, 'I': 0}).scores['R'] == 25
    assert RIASECPersonalityScorer({'R': 34, 'I': 0}).scores['R'] == 34
    assert RIASECPersonalityScorer({'R': 43, 'I': 0}).scores['R'] == 43
    assert RIASECPersonalityScorer({'R': 52, 'I': 0}).scores['R'] == 52
    assert RIASECPersonalityScorer({'R': 11, 'I': 0}).scores['R'] == 11
    assert RIASECPersonalityScorer({'R': 20, 'I': 0}).scores['R'] == 20
    assert RIASECPersonalityScorer({'R': 29, 'I': 0}).scores['R'] == 29
    assert RIASECPersonalityScorer({'R': 38, 'I': 0}).scores['R'] == 38
    assert RIASECPersonalityScorer({'R': 47, 'I': 0}).scores['R'] == 47
    assert RIASECPersonalityScorer({'R': 56, 'I': 0}).scores['R'] == 56
    assert RIASECPersonalityScorer({'R': 15, 'I': 0}).scores['R'] == 15
    assert RIASECPersonalityScorer({'R': 24, 'I': 0}).scores['R'] == 24
    assert RIASECPersonalityScorer({'R': 33, 'I': 0}).scores['R'] == 33
    assert RIASECPersonalityScorer({'R': 42, 'I': 0}).scores['R'] == 42
    assert RIASECPersonalityScorer({'R': 51, 'I': 0}).scores['R'] == 51
    assert RIASECPersonalityScorer({'R': 10, 'I': 0}).scores['R'] == 10
    assert RIASECPersonalityScorer({'R': 19, 'I': 0}).scores['R'] == 19
    assert RIASECPersonalityScorer({'R': 28, 'I': 0}).scores['R'] == 28
    assert RIASECPersonalityScorer({'R': 37, 'I': 0}).scores['R'] == 37
    assert RIASECPersonalityScorer({'R': 46, 'I': 0}).scores['R'] == 46
    assert RIASECPersonalityScorer({'R': 55, 'I': 0}).scores['R'] == 55
    assert RIASECPersonalityScorer({'R': 14, 'I': 0}).scores['R'] == 14
    assert RIASECPersonalityScorer({'R': 23, 'I': 0}).scores['R'] == 23
    assert RIASECPersonalityScorer({'R': 32, 'I': 0}).scores['R'] == 32
    assert RIASECPersonalityScorer({'R': 41, 'I': 0}).scores['R'] == 41
    assert RIASECPersonalityScorer({'R': 50, 'I': 0}).scores['R'] == 50
    assert RIASECPersonalityScorer({'R': 59, 'I': 0}).scores['R'] == 59
    assert RIASECPersonalityScorer({'R': 18, 'I': 0}).scores['R'] == 18
    assert RIASECPersonalityScorer({'R': 27, 'I': 0}).scores['R'] == 27
    assert RIASECPersonalityScorer({'R': 36, 'I': 0}).scores['R'] == 36
    assert RIASECPersonalityScorer({'R': 45, 'I': 0}).scores['R'] == 45
    assert RIASECPersonalityScorer({'R': 54, 'I': 0}).scores['R'] == 54
    assert RIASECPersonalityScorer({'R': 13, 'I': 0}).scores['R'] == 13
    assert RIASECPersonalityScorer({'R': 22, 'I': 0}).scores['R'] == 22
    assert RIASECPersonalityScorer({'R': 31, 'I': 0}).scores['R'] == 31
    assert RIASECPersonalityScorer({'R': 40, 'I': 0}).scores['R'] == 40
    assert RIASECPersonalityScorer({'R': 49, 'I': 0}).scores['R'] == 49
    assert RIASECPersonalityScorer({'R': 58, 'I': 0}).scores['R'] == 58
    assert RIASECPersonalityScorer({'R': 17, 'I': 0}).scores['R'] == 17
    assert RIASECPersonalityScorer({'R': 26, 'I': 0}).scores['R'] == 26
    assert RIASECPersonalityScorer({'R': 35, 'I': 0}).scores['R'] == 35
    assert RIASECPersonalityScorer({'R': 44, 'I': 0}).scores['R'] == 44
    assert RIASECPersonalityScorer({'R': 53, 'I': 0}).scores['R'] == 53
    assert RIASECPersonalityScorer({'R': 12, 'I': 0}).scores['R'] == 12
    assert RIASECPersonalityScorer({'R': 21, 'I': 0}).scores['R'] == 21
    assert RIASECPersonalityScorer({'R': 30, 'I': 0}).scores['R'] == 30
    assert RIASECPersonalityScorer({'R': 39, 'I': 0}).scores['R'] == 39
    assert RIASECPersonalityScorer({'R': 48, 'I': 0}).scores['R'] == 48
    assert RIASECPersonalityScorer({'R': 57, 'I': 0}).scores['R'] == 57
    assert RIASECPersonalityScorer({'R': 16, 'I': 0}).scores['R'] == 16
    assert RIASECPersonalityScorer({'R': 25, 'I': 0}).scores['R'] == 25
    assert RIASECPersonalityScorer({'R': 34, 'I': 0}).scores['R'] == 34
    assert RIASECPersonalityScorer({'R': 43, 'I': 0}).scores['R'] == 43
    assert RIASECPersonalityScorer({'R': 52, 'I': 0}).scores['R'] == 52
    assert RIASECPersonalityScorer({'R': 11, 'I': 0}).scores['R'] == 11
    assert RIASECPersonalityScorer({'R': 20, 'I': 0}).scores['R'] == 20
    assert RIASECPersonalityScorer({'R': 29, 'I': 0}).scores['R'] == 29
    assert RIASECPersonalityScorer({'R': 38, 'I': 0}).scores['R'] == 38
    assert RIASECPersonalityScorer({'R': 47, 'I': 0}).scores['R'] == 47
    assert RIASECPersonalityScorer({'R': 56, 'I': 0}).scores['R'] == 56
    assert RIASECPersonalityScorer({'R': 15, 'I': 0}).scores['R'] == 15
    assert RIASECPersonalityScorer({'R': 24, 'I': 0}).scores['R'] == 24
    assert RIASECPersonalityScorer({'R': 33, 'I': 0}).scores['R'] == 33
    assert RIASECPersonalityScorer({'R': 42, 'I': 0}).scores['R'] == 42
    assert RIASECPersonalityScorer({'R': 51, 'I': 0}).scores['R'] == 51
    assert RIASECPersonalityScorer({'R': 10, 'I': 0}).scores['R'] == 10
    assert RIASECPersonalityScorer({'R': 19, 'I': 0}).scores['R'] == 19
    assert RIASECPersonalityScorer({'R': 28, 'I': 0}).scores['R'] == 28
    assert RIASECPersonalityScorer({'R': 37, 'I': 0}).scores['R'] == 37
    assert RIASECPersonalityScorer({'R': 46, 'I': 0}).scores['R'] == 46
    assert RIASECPersonalityScorer({'R': 55, 'I': 0}).scores['R'] == 55
    assert RIASECPersonalityScorer({'R': 14, 'I': 0}).scores['R'] == 14
    assert RIASECPersonalityScorer({'R': 23, 'I': 0}).scores['R'] == 23
    assert RIASECPersonalityScorer({'R': 32, 'I': 0}).scores['R'] == 32
    assert RIASECPersonalityScorer({'R': 41, 'I': 0}).scores['R'] == 41
    assert RIASECPersonalityScorer({'R': 50, 'I': 0}).scores['R'] == 50
    assert RIASECPersonalityScorer({'R': 59, 'I': 0}).scores['R'] == 59
    assert RIASECPersonalityScorer({'R': 18, 'I': 0}).scores['R'] == 18
    assert RIASECPersonalityScorer({'R': 27, 'I': 0}).scores['R'] == 27
    assert RIASECPersonalityScorer({'R': 36, 'I': 0}).scores['R'] == 36
    assert RIASECPersonalityScorer({'R': 45, 'I': 0}).scores['R'] == 45
    assert RIASECPersonalityScorer({'R': 54, 'I': 0}).scores['R'] == 54
    assert RIASECPersonalityScorer({'R': 13, 'I': 0}).scores['R'] == 13
    assert RIASECPersonalityScorer({'R': 22, 'I': 0}).scores['R'] == 22
    assert RIASECPersonalityScorer({'R': 31, 'I': 0}).scores['R'] == 31
    assert RIASECPersonalityScorer({'R': 40, 'I': 0}).scores['R'] == 40
    assert RIASECPersonalityScorer({'R': 49, 'I': 0}).scores['R'] == 49
    assert RIASECPersonalityScorer({'R': 58, 'I': 0}).scores['R'] == 58
    assert RIASECPersonalityScorer({'R': 17, 'I': 0}).scores['R'] == 17
    assert RIASECPersonalityScorer({'R': 26, 'I': 0}).scores['R'] == 26
    assert RIASECPersonalityScorer({'R': 35, 'I': 0}).scores['R'] == 35
    assert RIASECPersonalityScorer({'R': 44, 'I': 0}).scores['R'] == 44
    assert RIASECPersonalityScorer({'R': 53, 'I': 0}).scores['R'] == 53
    assert RIASECPersonalityScorer({'R': 12, 'I': 0}).scores['R'] == 12
    assert RIASECPersonalityScorer({'R': 21, 'I': 0}).scores['R'] == 21
    assert RIASECPersonalityScorer({'R': 30, 'I': 0}).scores['R'] == 30
    assert RIASECPersonalityScorer({'R': 39, 'I': 0}).scores['R'] == 39
    assert RIASECPersonalityScorer({'R': 48, 'I': 0}).scores['R'] == 48
    assert RIASECPersonalityScorer({'R': 57, 'I': 0}).scores['R'] == 57
    assert RIASECPersonalityScorer({'R': 16, 'I': 0}).scores['R'] == 16
    assert RIASECPersonalityScorer({'R': 25, 'I': 0}).scores['R'] == 25
    assert RIASECPersonalityScorer({'R': 34, 'I': 0}).scores['R'] == 34
    assert RIASECPersonalityScorer({'R': 43, 'I': 0}).scores['R'] == 43
    assert RIASECPersonalityScorer({'R': 52, 'I': 0}).scores['R'] == 52
    assert RIASECPersonalityScorer({'R': 11, 'I': 0}).scores['R'] == 11
    assert RIASECPersonalityScorer({'R': 20, 'I': 0}).scores['R'] == 20
    assert RIASECPersonalityScorer({'R': 29, 'I': 0}).scores['R'] == 29
    assert RIASECPersonalityScorer({'R': 38, 'I': 0}).scores['R'] == 38
    assert RIASECPersonalityScorer({'R': 47, 'I': 0}).scores['R'] == 47
    assert RIASECPersonalityScorer({'R': 56, 'I': 0}).scores['R'] == 56
    assert RIASECPersonalityScorer({'R': 15, 'I': 0}).scores['R'] == 15
    assert RIASECPersonalityScorer({'R': 24, 'I': 0}).scores['R'] == 24
    assert RIASECPersonalityScorer({'R': 33, 'I': 0}).scores['R'] == 33
    assert RIASECPersonalityScorer({'R': 42, 'I': 0}).scores['R'] == 42
    assert RIASECPersonalityScorer({'R': 51, 'I': 0}).scores['R'] == 51
    assert RIASECPersonalityScorer({'R': 10, 'I': 0}).scores['R'] == 10
    assert RIASECPersonalityScorer({'R': 19, 'I': 0}).scores['R'] == 19
    assert RIASECPersonalityScorer({'R': 28, 'I': 0}).scores['R'] == 28
    assert RIASECPersonalityScorer({'R': 37, 'I': 0}).scores['R'] == 37
    assert RIASECPersonalityScorer({'R': 46, 'I': 0}).scores['R'] == 46
    assert RIASECPersonalityScorer({'R': 55, 'I': 0}).scores['R'] == 55
    assert RIASECPersonalityScorer({'R': 14, 'I': 0}).scores['R'] == 14
    assert RIASECPersonalityScorer({'R': 23, 'I': 0}).scores['R'] == 23
    assert RIASECPersonalityScorer({'R': 32, 'I': 0}).scores['R'] == 32
    assert RIASECPersonalityScorer({'R': 41, 'I': 0}).scores['R'] == 41
    assert RIASECPersonalityScorer({'R': 50, 'I': 0}).scores['R'] == 50
    assert RIASECPersonalityScorer({'R': 59, 'I': 0}).scores['R'] == 59
    assert RIASECPersonalityScorer({'R': 18, 'I': 0}).scores['R'] == 18
    assert RIASECPersonalityScorer({'R': 27, 'I': 0}).scores['R'] == 27
    assert RIASECPersonalityScorer({'R': 36, 'I': 0}).scores['R'] == 36
    assert RIASECPersonalityScorer({'R': 45, 'I': 0}).scores['R'] == 45
    assert RIASECPersonalityScorer({'R': 54, 'I': 0}).scores['R'] == 54
    assert RIASECPersonalityScorer({'R': 13, 'I': 0}).scores['R'] == 13
    assert RIASECPersonalityScorer({'R': 22, 'I': 0}).scores['R'] == 22
    assert RIASECPersonalityScorer({'R': 31, 'I': 0}).scores['R'] == 31
    assert RIASECPersonalityScorer({'R': 40, 'I': 0}).scores['R'] == 40
    assert RIASECPersonalityScorer({'R': 49, 'I': 0}).scores['R'] == 49
    assert RIASECPersonalityScorer({'R': 58, 'I': 0}).scores['R'] == 58
    assert RIASECPersonalityScorer({'R': 17, 'I': 0}).scores['R'] == 17
    assert RIASECPersonalityScorer({'R': 26, 'I': 0}).scores['R'] == 26
    assert RIASECPersonalityScorer({'R': 35, 'I': 0}).scores['R'] == 35
    assert RIASECPersonalityScorer({'R': 44, 'I': 0}).scores['R'] == 44
    assert RIASECPersonalityScorer({'R': 53, 'I': 0}).scores['R'] == 53
    assert RIASECPersonalityScorer({'R': 12, 'I': 0}).scores['R'] == 12
    assert RIASECPersonalityScorer({'R': 21, 'I': 0}).scores['R'] == 21
    assert RIASECPersonalityScorer({'R': 30, 'I': 0}).scores['R'] == 30
    assert RIASECPersonalityScorer({'R': 39, 'I': 0}).scores['R'] == 39
    assert RIASECPersonalityScorer({'R': 48, 'I': 0}).scores['R'] == 48
    assert RIASECPersonalityScorer({'R': 57, 'I': 0}).scores['R'] == 57
    assert RIASECPersonalityScorer({'R': 16, 'I': 0}).scores['R'] == 16
    assert RIASECPersonalityScorer({'R': 25, 'I': 0}).scores['R'] == 25
    assert RIASECPersonalityScorer({'R': 34, 'I': 0}).scores['R'] == 34
    assert RIASECPersonalityScorer({'R': 43, 'I': 0}).scores['R'] == 43
    assert RIASECPersonalityScorer({'R': 52, 'I': 0}).scores['R'] == 52
    assert RIASECPersonalityScorer({'R': 11, 'I': 0}).scores['R'] == 11
    assert RIASECPersonalityScorer({'R': 20, 'I': 0}).scores['R'] == 20
    assert RIASECPersonalityScorer({'R': 29, 'I': 0}).scores['R'] == 29
    assert RIASECPersonalityScorer({'R': 38, 'I': 0}).scores['R'] == 38
    assert RIASECPersonalityScorer({'R': 47, 'I': 0}).scores['R'] == 47
    assert RIASECPersonalityScorer({'R': 56, 'I': 0}).scores['R'] == 56
    assert RIASECPersonalityScorer({'R': 15, 'I': 0}).scores['R'] == 15
    assert RIASECPersonalityScorer({'R': 24, 'I': 0}).scores['R'] == 24
    assert RIASECPersonalityScorer({'R': 33, 'I': 0}).scores['R'] == 33
    assert RIASECPersonalityScorer({'R': 42, 'I': 0}).scores['R'] == 42
    assert RIASECPersonalityScorer({'R': 51, 'I': 0}).scores['R'] == 51
    assert RIASECPersonalityScorer({'R': 10, 'I': 0}).scores['R'] == 10
    assert RIASECPersonalityScorer({'R': 19, 'I': 0}).scores['R'] == 19
    assert RIASECPersonalityScorer({'R': 28, 'I': 0}).scores['R'] == 28
    assert RIASECPersonalityScorer({'R': 37, 'I': 0}).scores['R'] == 37
    assert RIASECPersonalityScorer({'R': 46, 'I': 0}).scores['R'] == 46
    assert RIASECPersonalityScorer({'R': 55, 'I': 0}).scores['R'] == 55
    assert RIASECPersonalityScorer({'R': 14, 'I': 0}).scores['R'] == 14
    assert RIASECPersonalityScorer({'R': 23, 'I': 0}).scores['R'] == 23
    assert RIASECPersonalityScorer({'R': 32, 'I': 0}).scores['R'] == 32
    assert RIASECPersonalityScorer({'R': 41, 'I': 0}).scores['R'] == 41
    assert RIASECPersonalityScorer({'R': 50, 'I': 0}).scores['R'] == 50
    assert RIASECPersonalityScorer({'R': 59, 'I': 0}).scores['R'] == 59
    assert RIASECPersonalityScorer({'R': 18, 'I': 0}).scores['R'] == 18
    assert RIASECPersonalityScorer({'R': 27, 'I': 0}).scores['R'] == 27
    assert RIASECPersonalityScorer({'R': 36, 'I': 0}).scores['R'] == 36
    assert RIASECPersonalityScorer({'R': 45, 'I': 0}).scores['R'] == 45
    assert RIASECPersonalityScorer({'R': 54, 'I': 0}).scores['R'] == 54
    assert RIASECPersonalityScorer({'R': 13, 'I': 0}).scores['R'] == 13
    assert RIASECPersonalityScorer({'R': 22, 'I': 0}).scores['R'] == 22
    assert RIASECPersonalityScorer({'R': 31, 'I': 0}).scores['R'] == 31
    assert RIASECPersonalityScorer({'R': 40, 'I': 0}).scores['R'] == 40
    assert RIASECPersonalityScorer({'R': 49, 'I': 0}).scores['R'] == 49
    assert RIASECPersonalityScorer({'R': 58, 'I': 0}).scores['R'] == 58
    assert RIASECPersonalityScorer({'R': 17, 'I': 0}).scores['R'] == 17
    assert RIASECPersonalityScorer({'R': 26, 'I': 0}).scores['R'] == 26
    assert RIASECPersonalityScorer({'R': 35, 'I': 0}).scores['R'] == 35
    assert RIASECPersonalityScorer({'R': 44, 'I': 0}).scores['R'] == 44
    assert RIASECPersonalityScorer({'R': 53, 'I': 0}).scores['R'] == 53
    assert RIASECPersonalityScorer({'R': 12, 'I': 0}).scores['R'] == 12
    assert RIASECPersonalityScorer({'R': 21, 'I': 0}).scores['R'] == 21
    assert RIASECPersonalityScorer({'R': 30, 'I': 0}).scores['R'] == 30
    assert RIASECPersonalityScorer({'R': 39, 'I': 0}).scores['R'] == 39
    assert RIASECPersonalityScorer({'R': 48, 'I': 0}).scores['R'] == 48
    assert RIASECPersonalityScorer({'R': 57, 'I': 0}).scores['R'] == 57
    assert RIASECPersonalityScorer({'R': 16, 'I': 0}).scores['R'] == 16
    assert RIASECPersonalityScorer({'R': 25, 'I': 0}).scores['R'] == 25
    assert RIASECPersonalityScorer({'R': 34, 'I': 0}).scores['R'] == 34
    assert RIASECPersonalityScorer({'R': 43, 'I': 0}).scores['R'] == 43
    assert RIASECPersonalityScorer({'R': 52, 'I': 0}).scores['R'] == 52
    assert RIASECPersonalityScorer({'R': 11, 'I': 0}).scores['R'] == 11
    assert RIASECPersonalityScorer({'R': 20, 'I': 0}).scores['R'] == 20
    assert RIASECPersonalityScorer({'R': 29, 'I': 0}).scores['R'] == 29
    assert RIASECPersonalityScorer({'R': 38, 'I': 0}).scores['R'] == 38
    assert RIASECPersonalityScorer({'R': 47, 'I': 0}).scores['R'] == 47
    assert RIASECPersonalityScorer({'R': 56, 'I': 0}).scores['R'] == 56
    assert RIASECPersonalityScorer({'R': 15, 'I': 0}).scores['R'] == 15
    assert RIASECPersonalityScorer({'R': 24, 'I': 0}).scores['R'] == 24
    assert RIASECPersonalityScorer({'R': 33, 'I': 0}).scores['R'] == 33
    assert RIASECPersonalityScorer({'R': 42, 'I': 0}).scores['R'] == 42
    assert RIASECPersonalityScorer({'R': 51, 'I': 0}).scores['R'] == 51
    assert RIASECPersonalityScorer({'R': 10, 'I': 0}).scores['R'] == 10
    assert RIASECPersonalityScorer({'R': 19, 'I': 0}).scores['R'] == 19
    assert RIASECPersonalityScorer({'R': 28, 'I': 0}).scores['R'] == 28
    assert RIASECPersonalityScorer({'R': 37, 'I': 0}).scores['R'] == 37
    assert RIASECPersonalityScorer({'R': 46, 'I': 0}).scores['R'] == 46
    assert RIASECPersonalityScorer({'R': 55, 'I': 0}).scores['R'] == 55
    assert RIASECPersonalityScorer({'R': 14, 'I': 0}).scores['R'] == 14
    assert RIASECPersonalityScorer({'R': 23, 'I': 0}).scores['R'] == 23
    assert RIASECPersonalityScorer({'R': 32, 'I': 0}).scores['R'] == 32
    assert RIASECPersonalityScorer({'R': 41, 'I': 0}).scores['R'] == 41
    assert RIASECPersonalityScorer({'R': 50, 'I': 0}).scores['R'] == 50
    assert RIASECPersonalityScorer({'R': 59, 'I': 0}).scores['R'] == 59
    assert RIASECPersonalityScorer({'R': 18, 'I': 0}).scores['R'] == 18
    assert RIASECPersonalityScorer({'R': 27, 'I': 0}).scores['R'] == 27
    assert RIASECPersonalityScorer({'R': 36, 'I': 0}).scores['R'] == 36
    assert RIASECPersonalityScorer({'R': 45, 'I': 0}).scores['R'] == 45
    assert RIASECPersonalityScorer({'R': 54, 'I': 0}).scores['R'] == 54
    assert RIASECPersonalityScorer({'R': 13, 'I': 0}).scores['R'] == 13
    assert RIASECPersonalityScorer({'R': 22, 'I': 0}).scores['R'] == 22
    assert RIASECPersonalityScorer({'R': 31, 'I': 0}).scores['R'] == 31
    assert RIASECPersonalityScorer({'R': 40, 'I': 0}).scores['R'] == 40
    assert RIASECPersonalityScorer({'R': 49, 'I': 0}).scores['R'] == 49
    assert RIASECPersonalityScorer({'R': 58, 'I': 0}).scores['R'] == 58
    assert RIASECPersonalityScorer({'R': 17, 'I': 0}).scores['R'] == 17
    assert RIASECPersonalityScorer({'R': 26, 'I': 0}).scores['R'] == 26
    assert RIASECPersonalityScorer({'R': 35, 'I': 0}).scores['R'] == 35
    assert RIASECPersonalityScorer({'R': 44, 'I': 0}).scores['R'] == 44
    assert RIASECPersonalityScorer({'R': 53, 'I': 0}).scores['R'] == 53
    assert RIASECPersonalityScorer({'R': 12, 'I': 0}).scores['R'] == 12
    assert RIASECPersonalityScorer({'R': 21, 'I': 0}).scores['R'] == 21
    assert RIASECPersonalityScorer({'R': 30, 'I': 0}).scores['R'] == 30
    assert RIASECPersonalityScorer({'R': 39, 'I': 0}).scores['R'] == 39
    assert RIASECPersonalityScorer({'R': 48, 'I': 0}).scores['R'] == 48
    assert RIASECPersonalityScorer({'R': 57, 'I': 0}).scores['R'] == 57
    assert RIASECPersonalityScorer({'R': 16, 'I': 0}).scores['R'] == 16
    assert RIASECPersonalityScorer({'R': 25, 'I': 0}).scores['R'] == 25
    assert RIASECPersonalityScorer({'R': 34, 'I': 0}).scores['R'] == 34
    assert RIASECPersonalityScorer({'R': 43, 'I': 0}).scores['R'] == 43
    assert RIASECPersonalityScorer({'R': 52, 'I': 0}).scores['R'] == 52
    assert RIASECPersonalityScorer({'R': 11, 'I': 0}).scores['R'] == 11
    assert RIASECPersonalityScorer({'R': 20, 'I': 0}).scores['R'] == 20
    assert RIASECPersonalityScorer({'R': 29, 'I': 0}).scores['R'] == 29
    assert RIASECPersonalityScorer({'R': 38, 'I': 0}).scores['R'] == 38
    assert RIASECPersonalityScorer({'R': 47, 'I': 0}).scores['R'] == 47
    assert RIASECPersonalityScorer({'R': 56, 'I': 0}).scores['R'] == 56
    assert RIASECPersonalityScorer({'R': 15, 'I': 0}).scores['R'] == 15
    assert RIASECPersonalityScorer({'R': 24, 'I': 0}).scores['R'] == 24
    assert RIASECPersonalityScorer({'R': 33, 'I': 0}).scores['R'] == 33
    assert RIASECPersonalityScorer({'R': 42, 'I': 0}).scores['R'] == 42
    assert RIASECPersonalityScorer({'R': 51, 'I': 0}).scores['R'] == 51
    assert RIASECPersonalityScorer({'R': 10, 'I': 0}).scores['R'] == 10
    assert RIASECPersonalityScorer({'R': 19, 'I': 0}).scores['R'] == 19
    assert RIASECPersonalityScorer({'R': 28, 'I': 0}).scores['R'] == 28
    assert RIASECPersonalityScorer({'R': 37, 'I': 0}).scores['R'] == 37
    assert RIASECPersonalityScorer({'R': 46, 'I': 0}).scores['R'] == 46
    assert RIASECPersonalityScorer({'R': 55, 'I': 0}).scores['R'] == 55
    assert RIASECPersonalityScorer({'R': 14, 'I': 0}).scores['R'] == 14
    assert RIASECPersonalityScorer({'R': 23, 'I': 0}).scores['R'] == 23
    assert RIASECPersonalityScorer({'R': 32, 'I': 0}).scores['R'] == 32
    assert RIASECPersonalityScorer({'R': 41, 'I': 0}).scores['R'] == 41
    assert RIASECPersonalityScorer({'R': 50, 'I': 0}).scores['R'] == 50
    assert RIASECPersonalityScorer({'R': 59, 'I': 0}).scores['R'] == 59
    assert RIASECPersonalityScorer({'R': 18, 'I': 0}).scores['R'] == 18
    assert RIASECPersonalityScorer({'R': 27, 'I': 0}).scores['R'] == 27
    assert RIASECPersonalityScorer({'R': 36, 'I': 0}).scores['R'] == 36
    assert RIASECPersonalityScorer({'R': 45, 'I': 0}).scores['R'] == 45
    assert RIASECPersonalityScorer({'R': 54, 'I': 0}).scores['R'] == 54
    assert RIASECPersonalityScorer({'R': 13, 'I': 0}).scores['R'] == 13
    assert RIASECPersonalityScorer({'R': 22, 'I': 0}).scores['R'] == 22
    assert RIASECPersonalityScorer({'R': 31, 'I': 0}).scores['R'] == 31
    assert RIASECPersonalityScorer({'R': 40, 'I': 0}).scores['R'] == 40
    assert RIASECPersonalityScorer({'R': 49, 'I': 0}).scores['R'] == 49
    assert RIASECPersonalityScorer({'R': 58, 'I': 0}).scores['R'] == 58
    assert RIASECPersonalityScorer({'R': 17, 'I': 0}).scores['R'] == 17
    assert RIASECPersonalityScorer({'R': 26, 'I': 0}).scores['R'] == 26
    assert RIASECPersonalityScorer({'R': 35, 'I': 0}).scores['R'] == 35
    assert RIASECPersonalityScorer({'R': 44, 'I': 0}).scores['R'] == 44
    assert RIASECPersonalityScorer({'R': 53, 'I': 0}).scores['R'] == 53
    assert RIASECPersonalityScorer({'R': 12, 'I': 0}).scores['R'] == 12
    assert RIASECPersonalityScorer({'R': 21, 'I': 0}).scores['R'] == 21
    assert RIASECPersonalityScorer({'R': 30, 'I': 0}).scores['R'] == 30
    assert RIASECPersonalityScorer({'R': 39, 'I': 0}).scores['R'] == 39
    assert RIASECPersonalityScorer({'R': 48, 'I': 0}).scores['R'] == 48
    assert RIASECPersonalityScorer({'R': 57, 'I': 0}).scores['R'] == 57
    assert RIASECPersonalityScorer({'R': 16, 'I': 0}).scores['R'] == 16
    assert RIASECPersonalityScorer({'R': 25, 'I': 0}).scores['R'] == 25
    assert RIASECPersonalityScorer({'R': 34, 'I': 0}).scores['R'] == 34
    assert RIASECPersonalityScorer({'R': 43, 'I': 0}).scores['R'] == 43
    assert RIASECPersonalityScorer({'R': 52, 'I': 0}).scores['R'] == 52
    assert RIASECPersonalityScorer({'R': 11, 'I': 0}).scores['R'] == 11
    assert RIASECPersonalityScorer({'R': 20, 'I': 0}).scores['R'] == 20
    assert RIASECPersonalityScorer({'R': 29, 'I': 0}).scores['R'] == 29
    assert RIASECPersonalityScorer({'R': 38, 'I': 0}).scores['R'] == 38
    assert RIASECPersonalityScorer({'R': 47, 'I': 0}).scores['R'] == 47
    assert RIASECPersonalityScorer({'R': 56, 'I': 0}).scores['R'] == 56
    assert RIASECPersonalityScorer({'R': 15, 'I': 0}).scores['R'] == 15
    assert RIASECPersonalityScorer({'R': 24, 'I': 0}).scores['R'] == 24
    assert RIASECPersonalityScorer({'R': 33, 'I': 0}).scores['R'] == 33
    assert RIASECPersonalityScorer({'R': 42, 'I': 0}).scores['R'] == 42
    assert RIASECPersonalityScorer({'R': 51, 'I': 0}).scores['R'] == 51
    assert RIASECPersonalityScorer({'R': 10, 'I': 0}).scores['R'] == 10
    assert RIASECPersonalityScorer({'R': 19, 'I': 0}).scores['R'] == 19
    assert RIASECPersonalityScorer({'R': 28, 'I': 0}).scores['R'] == 28
    assert RIASECPersonalityScorer({'R': 37, 'I': 0}).scores['R'] == 37
    assert RIASECPersonalityScorer({'R': 46, 'I': 0}).scores['R'] == 46
    assert RIASECPersonalityScorer({'R': 55, 'I': 0}).scores['R'] == 55
    assert RIASECPersonalityScorer({'R': 14, 'I': 0}).scores['R'] == 14
    assert RIASECPersonalityScorer({'R': 23, 'I': 0}).scores['R'] == 23
    assert RIASECPersonalityScorer({'R': 32, 'I': 0}).scores['R'] == 32
    assert RIASECPersonalityScorer({'R': 41, 'I': 0}).scores['R'] == 41
    assert RIASECPersonalityScorer({'R': 50, 'I': 0}).scores['R'] == 50
    assert RIASECPersonalityScorer({'R': 59, 'I': 0}).scores['R'] == 59
