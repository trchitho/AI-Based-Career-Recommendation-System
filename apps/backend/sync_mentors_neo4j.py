# -*- coding: utf-8 -*-
"""Sync new mentor profiles to Neo4j graph."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
sys.stdout.reconfigure(encoding='utf-8')
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

from neo4j import GraphDatabase
from sqlalchemy.orm import Session
from app.core.db import engine
from app.modules.mentor_matching.models import MentorProfile
from app.modules.auth.models import User

driver = GraphDatabase.driver(
    os.getenv('NEO4J_URL', 'bolt://localhost:7687'),
    auth=('neo4j', os.getenv('NEO4J_PASS', 'CareerAI2026!'))
)

with Session(engine) as db:
    mentors = db.query(MentorProfile).filter(MentorProfile.is_active == True).all()
    user_map = {u.id: u for u in db.query(User).all()}
    print(f'Syncing {len(mentors)} mentors...')

    with driver.session() as s:
        s.run('MATCH (n:Mentor) DETACH DELETE n')

        for m in mentors:
            user = user_map.get(m.user_id)
            name = m.full_name or (user.email.split('@')[0] if user else str(m.user_id))

            s.run(
                'MERGE (mn:Mentor {user_id:$uid}) '
                'SET mn.name=$name, mn.position=$pos, mn.company=$co, '
                '    mn.experience_years=$exp, mn.max_mentees=$max',
                uid=m.user_id, name=name,
                pos=m.current_position or '',
                co=m.company or '',
                exp=m.experience_years or 0,
                max=m.max_mentees or 5,
            )

            for skill_name in (m.expertise_areas or []):
                s.run('MERGE (sk:Skill {name:$n})', n=skill_name)
                s.run(
                    'MATCH (mn:Mentor {user_id:$uid}), (sk:Skill {name:$n}) '
                    'MERGE (mn)-[:HAS_SKILL {level:"expert"}]->(sk)',
                    uid=m.user_id, n=skill_name,
                )

            if m.current_position:
                s.run(
                    'MATCH (mn:Mentor {user_id:$uid}), (c:Career) '
                    'WHERE toLower(c.title) CONTAINS toLower($pos) '
                    'MERGE (mn)-[:CAN_GUIDE_FOR]->(c)',
                    uid=m.user_id, pos=m.current_position,
                )

    with driver.session() as s:
        mn = s.run('MATCH (n:Mentor) RETURN count(n) as c').single()['c']
        sk = s.run('MATCH (n:Skill) RETURN count(n) as c').single()['c']
        hs = s.run('MATCH ()-[r:HAS_SKILL]->() RETURN count(r) as c').single()['c']
        cg = s.run('MATCH ()-[r:CAN_GUIDE_FOR]->() RETURN count(r) as c').single()['c']

    print(f'[OK] Mentor nodes : {mn}')
    print(f'[OK] Skill nodes  : {sk}')
    print(f'[OK] HAS_SKILL    : {hs}')
    print(f'[OK] CAN_GUIDE_FOR: {cg}')

driver.close()
print('Neo4j sync complete!')
