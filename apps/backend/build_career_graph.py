# -*- coding: utf-8 -*-
"""
build_career_graph.py
=====================
Build Neo4j graph database cho:
  1. Career nodes + REQUIRES Skill edges
  2. User nodes + INTERESTS career edges (tu assessment)
  3. Mentor nodes + HAS_SKILL edges
  4. Mentee nodes + WANTS_SKILL edges
  5. UserProgress nodes + COMPLETED milestone edges

Schema:
  (:Career {id, title, slug, onet_code})
  (:Skill  {name, category})
  (:User   {id, email, name})
  (:Mentor {user_id, name, position, experience_years})
  (:Mentee {user_id, name, target_career})

  (:Career)-[:REQUIRES {level, importance}]->(:Skill)
  (:Mentor)-[:HAS_SKILL {level: 'expert'}]->(:Skill)
  (:Mentee)-[:WANTS_SKILL]->(:Skill)
  (:User)-[:INTERESTED_IN {score}]->(:Career)
  (:Mentor)-[:CAN_GUIDE_FOR]->(:Career)
  (:Mentee)-[:TARGETS]->(:Career)
  (:User)-[:COMPLETED_ROADMAP {progress_pct}]->(:Career)

Chay: python build_career_graph.py
"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

from sqlalchemy.orm import Session
from app.core.db import engine
from app.modules.graph.neo4j_client import get_driver

driver = get_driver()
if not driver:
    print('[ERR] Neo4j not available. Check NEO4J_URL in .env')
    sys.exit(1)

def run_batch(session, statements):
    for cypher, params in statements:
        session.run(cypher, **params)

def build_career_nodes():
    """1. Career nodes va REQUIRES skill edges."""
    from app.modules.content.models import Career, CareerKSA
    with Session(engine) as db:
        careers = db.query(Career).all()
        ksas    = db.query(CareerKSA).all()

    onet_map = {c.onet_code: c for c in careers if c.onet_code}

    with driver.session() as s:
        # Clear first in one transaction
        s.run("MATCH (n:Career) DETACH DELETE n")
        s.run("MATCH (n:Skill) DETACH DELETE n")

    # Insert careers in batches
    BATCH = 50
    with driver.session() as s:
        for i in range(0, len(careers), BATCH):
            batch = careers[i:i+BATCH]
            s.run(
                "UNWIND $rows AS row "
                "MERGE (n:Career {id:row.id}) "
                "SET n.title=row.title, n.slug=row.slug, n.onet_code=row.onet",
                rows=[{
                    'id': str(c.id),
                    'title': getattr(c,'title_en',None) or getattr(c,'title_vi',None) or str(c.id),
                    'slug': getattr(c,'slug',str(c.id)),
                    'onet': c.onet_code or '',
                } for c in batch]
            )

    # Insert KSA in batches
    ksa_rows = []
    for k in ksas:
        career = onet_map.get(k.onet_code)
        if career:
            ksa_rows.append({'cid': str(career.id), 'name': k.name, 'cat': k.ksa_type or 'skill', 'lvl': float(k.level or 0), 'imp': float(k.importance or 0)})

    with driver.session() as s:
        for i in range(0, len(ksa_rows), BATCH):
            batch = ksa_rows[i:i+BATCH]
            s.run(
                "UNWIND $rows AS row "
                "MERGE (sk:Skill {name:row.name}) SET sk.category=row.cat "
                "WITH sk, row "
                "MATCH (c:Career {id:row.cid}) "
                "MERGE (c)-[r:REQUIRES]->(sk) SET r.level=row.lvl, r.importance=row.imp",
                rows=batch
            )
    print(f'[1] Career nodes: {len(careers)} | KSA edges: {len(ksa_rows)}')


def build_mentor_nodes():
    """2. Mentor nodes + HAS_SKILL + CAN_GUIDE_FOR edges."""
    from app.modules.mentor_matching.models import MentorProfile
    from app.modules.auth.models import User

    with Session(engine) as db:
        mentors = db.query(MentorProfile).filter(MentorProfile.is_active == True).all()
        user_map = {u.id: u for u in db.query(User).all()}

    with driver.session() as s:
        s.run("MATCH (n:Mentor) DETACH DELETE n")
        for m in mentors:
            user = user_map.get(m.user_id)
            # Create Mentor node
            s.run(
                "MERGE (mn:Mentor {user_id:$uid}) "
                "SET mn.name=$name, mn.position=$pos, mn.company=$co, "
                "    mn.experience_years=$exp, mn.max_mentees=$max",
                uid=m.user_id, name=m.full_name or (user.email if user else ''),
                pos=m.current_position or '', co=m.company or '',
                exp=m.experience_years or 0, max=m.max_mentees or 5,
            )
            # HAS_SKILL edges
            for skill_name in (m.expertise_areas or []):
                s.run("MERGE (sk:Skill {name:$name})", name=skill_name)
                s.run(
                    "MATCH (mn:Mentor {user_id:$uid}), (sk:Skill {name:$name}) "
                    "MERGE (mn)-[:HAS_SKILL {level:'expert'}]->(sk)",
                    uid=m.user_id, name=skill_name,
                )
            # CAN_GUIDE_FOR: match career by position keyword
            if m.current_position:
                s.run(
                    "MATCH (mn:Mentor {user_id:$uid}), (c:Career) "
                    "WHERE toLower(c.title) CONTAINS toLower($pos) "
                    "MERGE (mn)-[:CAN_GUIDE_FOR]->(c)",
                    uid=m.user_id, pos=m.current_position,
                )
    print(f'[2] Mentor nodes: {len(mentors)}')


def build_mentee_nodes():
    """3. Mentee nodes + WANTS_SKILL + TARGETS career edges."""
    from app.modules.mentor_matching.models import MenteeProfile

    with Session(engine) as db:
        mentees = db.query(MenteeProfile).all()

    with driver.session() as s:
        s.run("MATCH (n:Mentee) DETACH DELETE n")
        for m in mentees:
            s.run(
                "MERGE (mn:Mentee {user_id:$uid}) "
                "SET mn.name=$name, mn.target_career=$tc",
                uid=m.user_id, name=m.full_name or '',
                tc=m.target_career or '',
            )
            # WANTS_SKILL
            for skill_name in (m.desired_skills or []):
                s.run("MERGE (sk:Skill {name:$name})", name=skill_name)
                s.run(
                    "MATCH (mn:Mentee {user_id:$uid}), (sk:Skill {name:$name}) "
                    "MERGE (mn)-[:WANTS_SKILL]->(sk)",
                    uid=m.user_id, name=skill_name,
                )
            # TARGETS career
            if m.target_career:
                s.run(
                    "MATCH (mn:Mentee {user_id:$uid}), (c:Career) "
                    "WHERE toLower(c.title) CONTAINS toLower($tc) "
                    "MERGE (mn)-[:TARGETS]->(c)",
                    uid=m.user_id, tc=m.target_career,
                )
    print(f'[3] Mentee nodes: {len(mentees)}')


def build_roadmap_progress():
    """4. UserProgress → COMPLETED_ROADMAP edges."""
    from app.modules.roadmap.models import UserProgress
    from app.modules.content.models import Career

    with Session(engine) as db:
        progresses = db.query(UserProgress).all()
        career_map = {c.id: c for c in db.query(Career).all()}

    with driver.session() as s:
        s.run("MATCH ()-[r:COMPLETED_ROADMAP]->() DELETE r")
        count = 0
        for p in progresses:
            career = career_map.get(p.career_id)
            if not career:
                continue
            completed = p.completed_milestones or []
            if not completed:
                continue
            try:
                pct = float(p.progress_percentage or 0)
            except Exception:
                pct = 0.0

            # Create User node if not exists
            s.run("MERGE (u:User {id:$uid})", uid=p.user_id)
            # Career should exist
            title = getattr(career, 'title_en', None) or getattr(career, 'title_vi', None) or ''
            s.run(
                "MATCH (u:User {id:$uid}), (c:Career {id:$cid}) "
                "MERGE (u)-[r:COMPLETED_ROADMAP]->(c) "
                "SET r.progress_pct=$pct, r.steps_done=$steps",
                uid=p.user_id, cid=str(p.career_id),
                pct=pct, steps=len(completed),
            )
            count += 1
    print(f'[4] Roadmap progress edges: {count}')


def build_assessment_interests():
    """5. User INTERESTED_IN career (from assessment career_recommendations)."""
    from app.modules.assessments.models import Assessment

    with Session(engine) as db:
        assessments = db.query(Assessment).filter(
            Assessment.career_recommendations != None
        ).all()

    with driver.session() as s:
        s.run("MATCH ()-[r:INTERESTED_IN]->() DELETE r")
        count = 0
        for a in assessments:
            recs = a.career_recommendations or []
            if not isinstance(recs, list):
                continue
            for rec in recs[:5]:  # top 5 only
                if not isinstance(rec, dict):
                    continue
                title = (rec.get('title_en') or rec.get('title_vi') or
                         rec.get('career_title') or rec.get('title') or '')
                score = float(rec.get('score', 0.5))
                if not title:
                    continue
                s.run("MERGE (u:User {id:$uid})", uid=a.user_id)
                s.run(
                    "MATCH (u:User {id:$uid}), (c:Career) "
                    "WHERE toLower(c.title) CONTAINS toLower($title) "
                    "MERGE (u)-[r:INTERESTED_IN]->(c) "
                    "SET r.score=$score",
                    uid=a.user_id, title=title[:50], score=score,
                )
                count += 1
    print(f'[5] Assessment interest edges: {count}')


def create_indexes():
    """Create indexes for fast lookups."""
    with driver.session() as s:
        for idx in [
            "CREATE INDEX career_id IF NOT EXISTS FOR (n:Career) ON (n.id)",
            "CREATE INDEX skill_name IF NOT EXISTS FOR (n:Skill) ON (n.name)",
            "CREATE INDEX mentor_uid IF NOT EXISTS FOR (n:Mentor) ON (n.user_id)",
            "CREATE INDEX mentee_uid IF NOT EXISTS FOR (n:Mentee) ON (n.user_id)",
            "CREATE INDEX user_id IF NOT EXISTS FOR (n:User) ON (n.id)",
        ]:
            try:
                s.run(idx)
            except Exception:
                pass
    print('[IDX] Indexes created')


def summary():
    with driver.session() as s:
        labels = s.run('CALL db.labels() YIELD label RETURN label').data()
        counts = {}
        for l in labels:
            label = l['label']
            cnt = s.run(f'MATCH (n:{label}) RETURN count(n) as c').single()['c']
            counts[label] = cnt
        rels = s.run('MATCH ()-[r]->() RETURN type(r) as t, count(r) as c').data()
        print('\n=== Graph Summary ===')
        for label, cnt in counts.items():
            print(f'  :{label}  {cnt} nodes')
        for r in rels:
            print(f'  [:{r["t"]}]  {r["c"]} relationships')


if __name__ == '__main__':
    print('Building Career Knowledge Graph...\n')
    create_indexes()
    build_career_nodes()
    build_mentor_nodes()
    build_mentee_nodes()
    build_roadmap_progress()
    build_assessment_interests()
    summary()
    print('\nGraph built successfully!')
    print('View at: http://localhost:7474 (neo4j / CareerAI2026!)')
