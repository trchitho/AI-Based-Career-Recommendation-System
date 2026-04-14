"""
Test CV Parser
"""
import os
import sys

# Add app to path
sys.path.insert(0, os.path.dirname(__file__))

from app.modules.skill_gap.cv_parser import CVParser


def test_parser():
    print("🧪 Testing CV Parser...")
    print("=" * 60)
    
    parser = CVParser()
    
    # Test text
    test_cv = """
    JOHN DOE
    Software Engineer | Full Stack Developer
    
    TECHNICAL SKILLS:
    - Programming Languages: Python, Java, JavaScript, TypeScript, C++
    - Web Technologies: React, Angular, Vue.js, Node.js, Express
    - Databases: MySQL, PostgreSQL, MongoDB, Redis
    - Cloud & DevOps: AWS, Docker, Kubernetes, Jenkins, GitLab
    - Machine Learning: TensorFlow, PyTorch, Scikit-learn, Pandas, NumPy
    - Tools: Git, VS Code, IntelliJ IDEA
    
    SOFT SKILLS:
    - Leadership and Team Management
    - Communication and Presentation
    - Problem Solving and Critical Thinking
    - Project Management (Agile, Scrum)
    
    EXPERIENCE:
    Senior Software Engineer at Tech Corp (2020-Present)
    - Built scalable web applications using React and Node.js
    - Developed ML models with Python and TensorFlow
    - Deployed microservices on AWS with Docker and Kubernetes
    - Led a team of 5 developers using Agile methodology
    
    Software Developer at StartupXYZ (2018-2020)
    - Created RESTful APIs with Django and Flask
    - Managed PostgreSQL and MongoDB databases
    - Implemented CI/CD pipelines with Jenkins
    """
    
    # Extract skills
    skills = parser.extract_skills(test_cv)
    
    print(f"\n✅ Extracted {len(skills)} skills:\n")
    
    # Group by category
    by_category = {}
    for skill in skills:
        cat = skill['category']
        if cat not in by_category:
            by_category[cat] = []
        by_category[cat].append(skill['name'])
    
    # Display
    for category, skill_list in sorted(by_category.items()):
        print(f"📌 {category}:")
        for skill in sorted(skill_list):
            print(f"   - {skill}")
        print()
    
    print("=" * 60)
    print(f"✅ Test completed! Found {len(skills)} skills across {len(by_category)} categories")
    
    return skills

if __name__ == '__main__':
    test_parser()
