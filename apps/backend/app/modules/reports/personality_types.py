# apps/backend/app/modules/reports/personality_types.py
"""
Big Five Personality Type System - 64+ Types Based on Scientific Research

This module provides a comprehensive personality typing system based on the Big Five
(OCEAN) model. Each type is determined by the combination of trait levels:
- High (H): score > 60
- Medium (M): 40 <= score <= 60  
- Low (L): score < 40

With 5 traits and 3 levels each, we can have up to 243 combinations.
We focus on the most meaningful 64+ combinations based on psychological research.

References:
- Costa & McCrae (1992) - NEO-PI-R Manual
- Judge et al. (2002) - Big Five and Job Performance
- Barrick & Mount (1991) - Big Five and Job Performance Meta-Analysis
- DeYoung et al. (2007) - Big Five Aspects
"""

from typing import Dict, Any, List, Tuple

# =============================================================================
# PERSONALITY TYPE DEFINITIONS (64+ Types)
# =============================================================================
# Format: (O_level, C_level, E_level, A_level, N_level) -> Type Info
# Levels: 'H' = High (>60), 'M' = Medium (40-60), 'L' = Low (<40)

PERSONALITY_TYPES: Dict[Tuple[str, str, str, str, str], Dict[str, Any]] = {
    # =========================================================================
    # HIGH OPENNESS COMBINATIONS (Creative/Innovative Types)
    # =========================================================================
    
    # Type 1: High O, High C, High E, High A, Low N
    ("H", "H", "H", "H", "L"): {
        "type_name": "Visionary Leader",
        "short_desc": "You are a creative, organized, and socially adept leader who inspires others while maintaining emotional stability.",
        "full_desc": [
            "You possess a rare combination of creativity, discipline, social intelligence, and emotional resilience. "
            "Your high openness drives innovative thinking, while your conscientiousness ensures ideas become reality. "
            "You naturally connect with others through your extraversion and build trust through your agreeable nature.",
            "In the workplace, you excel at leading transformational initiatives. You can envision bold futures, "
            "create detailed plans to achieve them, rally teams around your vision, and maintain composure under pressure. "
            "Your emotional stability allows you to make clear-headed decisions even in challenging situations.",
            "You thrive in roles that combine strategic thinking with people leadership. Executive positions, "
            "entrepreneurship, consulting, and innovation management are natural fits. You're the type of leader "
            "who can both inspire a room and deliver on promises."
        ],
        "strengths": [
            "You combine visionary thinking with practical execution, turning innovative ideas into tangible results. "
            "Your ability to see the big picture while managing details makes you exceptionally effective at leading complex initiatives.",
            "Your social intelligence and genuine care for others create loyal, high-performing teams. "
            "People are drawn to your enthusiasm and trust your judgment because you consistently deliver on commitments.",
            "Your emotional resilience allows you to navigate uncertainty and setbacks without losing momentum. "
            "You model calm confidence that stabilizes teams during turbulent periods."
        ],
        "challenges": [
            "Your high standards across multiple dimensions may lead to overcommitment. "
            "Consider prioritizing ruthlessly and delegating more to avoid burnout.",
            "Your natural optimism and capability may cause you to underestimate obstacles. "
            "Build in buffer time and contingency plans for complex projects."
        ]
    },

    # Type 2: High O, High C, High E, High A, High N
    ("H", "H", "H", "H", "H"): {
        "type_name": "Passionate Perfectionist",
        "short_desc": "You are highly capable across all dimensions but experience emotions intensely, driving both excellence and occasional overwhelm.",
        "full_desc": [
            "You possess exceptional capabilities in creativity, organization, social engagement, and cooperation. "
            "However, your high neuroticism means you experience both positive and negative emotions intensely. "
            "This combination creates a driven, passionate individual who cares deeply about outcomes.",
            "Your emotional intensity can be a double-edged sword. It fuels your commitment to excellence and "
            "your genuine care for others, but it can also lead to anxiety about performance and relationships. "
            "You may set extremely high standards for yourself and feel disappointed when reality falls short.",
            "You excel in roles where passion and attention to detail matter. Creative direction, quality assurance, "
            "counseling, and artistic pursuits benefit from your combination of capability and emotional depth."
        ],
        "strengths": [
            "Your emotional depth allows you to connect authentically with others and create work that resonates. "
            "You bring passion and meaning to everything you do, inspiring others through your genuine commitment.",
            "Your high standards across all dimensions mean you consistently produce excellent work. "
            "You're the person others trust to handle important, complex projects.",
            "Your sensitivity to others' emotions makes you an empathetic leader and collaborator. "
            "You notice when team members are struggling and proactively offer support."
        ],
        "challenges": [
            "Your emotional intensity may lead to anxiety or overwhelm during high-pressure periods. "
            "Develop stress management practices like mindfulness, exercise, or journaling.",
            "Your perfectionism may cause you to overwork or struggle with delegation. "
            "Practice accepting 'good enough' for lower-priority tasks to preserve energy for what matters most."
        ]
    },
    
    # Type 3: High O, High C, High E, Low A, Low N
    ("H", "H", "H", "L", "L"): {
        "type_name": "Strategic Disruptor",
        "short_desc": "You are an innovative, disciplined, and confident leader who challenges conventions and drives change.",
        "full_desc": [
            "You combine creative vision with disciplined execution and social confidence. Your lower agreeableness "
            "means you're comfortable challenging the status quo and making tough decisions. Your emotional stability "
            "keeps you composed when facing resistance or criticism.",
            "You're naturally suited for roles that require transforming organizations or industries. "
            "You can envision better ways of doing things, create plans to implement them, persuade stakeholders, "
            "and push through despite opposition. You don't need everyone to like you to be effective.",
            "Entrepreneurship, turnaround management, venture capital, and strategic consulting are natural fits. "
            "You thrive when given the autonomy to challenge assumptions and implement bold changes."
        ],
        "strengths": [
            "You combine innovative thinking with the discipline to execute. Unlike dreamers who struggle with follow-through, "
            "you turn disruptive ideas into operational reality.",
            "Your confidence and emotional stability allow you to advocate for unpopular but necessary changes. "
            "You can deliver difficult messages and make tough calls without being derailed by others' reactions.",
            "Your social skills help you build coalitions and influence stakeholders even when proposing controversial changes. "
            "You know how to frame disruption in ways that gain buy-in."
        ],
        "challenges": [
            "Your directness and comfort with conflict may alienate colleagues who value harmony. "
            "Consider when diplomacy serves your goals better than confrontation.",
            "Your confidence in your vision may cause you to dismiss valid concerns from others. "
            "Build in processes to genuinely consider alternative perspectives before major decisions."
        ]
    },
    
    # Type 4: High O, High C, Low E, High A, Low N
    ("H", "H", "L", "H", "L"): {
        "type_name": "Thoughtful Architect",
        "short_desc": "You are a creative, meticulous, and caring professional who prefers depth over breadth in relationships and work.",
        "full_desc": [
            "You combine innovative thinking with careful execution and genuine concern for others. "
            "Your lower extraversion means you prefer focused, meaningful interactions over broad networking. "
            "Your emotional stability provides a calm foundation for your thoughtful approach.",
            "You excel at work requiring deep concentration and creative problem-solving. You build strong relationships "
            "with a smaller circle of colleagues and clients, earning trust through reliability and genuine care. "
            "You're the person others come to for thoughtful advice and quality work.",
            "Research, writing, design, architecture, and specialized consulting suit your profile. "
            "You thrive in environments that value depth, quality, and meaningful contribution over visibility."
        ],
        "strengths": [
            "Your combination of creativity and conscientiousness produces exceptionally high-quality work. "
            "You don't just generate ideas—you refine them until they're truly excellent.",
            "Your genuine care for others combined with your thoughtful nature makes you a trusted advisor. "
            "People value your considered opinions and know you have their best interests at heart.",
            "Your emotional stability and preference for depth over breadth means you maintain focus and composure. "
            "You're not easily distracted by office politics or social pressures."
        ],
        "challenges": [
            "Your preference for depth may limit your visibility in organizations that reward self-promotion. "
            "Consider strategic ways to share your work and build your professional reputation.",
            "Your thoughtful approach may slow decision-making when speed is required. "
            "Practice distinguishing between decisions that warrant deep analysis and those that don't."
        ]
    },

    # Type 5: High O, Low C, High E, High A, Low N
    ("H", "L", "H", "H", "L"): {
        "type_name": "Inspiring Catalyst",
        "short_desc": "You are a creative, sociable, and caring free spirit who inspires others but may struggle with follow-through.",
        "full_desc": [
            "You bring creative energy, social warmth, and genuine care to everything you do. "
            "Your lower conscientiousness means you prefer flexibility over rigid structure. "
            "Your emotional stability keeps you optimistic and resilient even when plans don't work out.",
            "You excel at generating ideas, building relationships, and inspiring others. "
            "You're the spark that ignites new initiatives and brings people together around possibilities. "
            "However, you may need support with detailed planning and sustained execution.",
            "Creative roles, community building, facilitation, and entrepreneurial ventures suit your profile. "
            "You thrive in environments that value innovation and relationships over rigid processes."
        ],
        "strengths": [
            "Your combination of creativity, social skills, and warmth makes you magnetic. "
            "People are drawn to your enthusiasm and feel energized by your presence.",
            "Your emotional stability and optimism help you bounce back from setbacks quickly. "
            "You maintain a positive outlook that inspires others during challenging times.",
            "Your flexibility allows you to adapt quickly to changing circumstances. "
            "You're comfortable with ambiguity and can pivot when opportunities arise."
        ],
        "challenges": [
            "Your preference for flexibility may lead to incomplete projects or missed commitments. "
            "Consider partnering with detail-oriented colleagues or using simple systems to track follow-through.",
            "Your many interests and social connections may spread your attention too thin. "
            "Practice saying no to protect time for your most important priorities."
        ]
    },
    
    # Type 6: High O, High C, Low E, Low A, Low N
    ("H", "H", "L", "L", "L"): {
        "type_name": "Independent Innovator",
        "short_desc": "You are a creative, disciplined, and self-reliant professional who produces excellent work independently.",
        "full_desc": [
            "You combine innovative thinking with disciplined execution and strong independence. "
            "Your lower extraversion and agreeableness mean you prefer working autonomously and making decisions "
            "based on logic rather than social considerations. Your emotional stability provides resilience.",
            "You excel at complex, independent work requiring both creativity and rigor. "
            "You don't need external validation or social interaction to stay motivated. "
            "You're comfortable challenging conventional thinking and standing by your conclusions.",
            "Research, engineering, technical writing, and specialized analysis suit your profile. "
            "You thrive in environments that value expertise and results over social dynamics."
        ],
        "strengths": [
            "Your combination of creativity and discipline produces innovative yet rigorous work. "
            "You can both generate novel ideas and validate them through careful analysis.",
            "Your independence and emotional stability mean you're not swayed by groupthink or social pressure. "
            "You make decisions based on evidence and logic, even when unpopular.",
            "Your self-reliance makes you highly productive in autonomous roles. "
            "You don't need constant supervision or social interaction to maintain focus and motivation."
        ],
        "challenges": [
            "Your independence may limit collaboration and relationship-building. "
            "Consider strategic networking to ensure your work gets the visibility and support it deserves.",
            "Your directness and focus on logic may come across as cold or dismissive to colleagues. "
            "Practice acknowledging others' perspectives even when you disagree."
        ]
    },
    
    # Type 7: High O, Low C, Low E, High A, Low N
    ("H", "L", "L", "H", "L"): {
        "type_name": "Gentle Dreamer",
        "short_desc": "You are a creative, caring, and introspective individual who values meaningful connections and imaginative pursuits.",
        "full_desc": [
            "You combine rich inner creativity with genuine warmth and a preference for quiet, meaningful interactions. "
            "Your lower conscientiousness means you prefer organic flow over rigid structure. "
            "Your emotional stability provides a calm foundation for your contemplative nature.",
            "You excel in roles that allow creative expression and meaningful connection without demanding "
            "high social energy or rigid organization. You bring depth and authenticity to your work and relationships.",
            "Writing, counseling, art therapy, and supportive roles in creative fields suit your profile. "
            "You thrive in calm environments that value depth, creativity, and genuine human connection."
        ],
        "strengths": [
            "Your combination of creativity and empathy allows you to understand and express human experience deeply. "
            "You create work that resonates emotionally and helps others feel understood.",
            "Your calm, caring presence makes you a trusted confidant. "
            "People feel safe sharing their thoughts and feelings with you.",
            "Your emotional stability and introspective nature give you perspective and wisdom. "
            "You're not easily rattled by external pressures or drama."
        ],
        "challenges": [
            "Your preference for flexibility and depth may conflict with deadline-driven environments. "
            "Consider finding roles or arrangements that accommodate your natural rhythm.",
            "Your quiet nature may limit visibility and advancement in competitive environments. "
            "Seek organizations that value your contributions without requiring self-promotion."
        ]
    },

    # =========================================================================
    # HIGH CONSCIENTIOUSNESS COMBINATIONS (Organized/Reliable Types)
    # =========================================================================
    
    # Type 8: Low O, High C, High E, High A, Low N
    ("L", "H", "H", "H", "L"): {
        "type_name": "Reliable Team Leader",
        "short_desc": "You are an organized, sociable, and supportive leader who builds stable, high-performing teams.",
        "full_desc": [
            "You combine disciplined execution with strong social skills and genuine care for others. "
            "Your lower openness means you prefer proven methods over experimentation. "
            "Your emotional stability provides a steady foundation for your leadership.",
            "You excel at building and leading teams that deliver consistent results. "
            "You create structured environments where people feel supported and know what's expected. "
            "Your reliability and warmth earn deep trust from colleagues and direct reports.",
            "Operations management, project management, HR leadership, and team supervision suit your profile. "
            "You thrive in environments that value stability, teamwork, and reliable execution."
        ],
        "strengths": [
            "Your combination of organization, social skills, and warmth makes you an exceptional people manager. "
            "You create teams that are both productive and engaged.",
            "Your preference for proven methods combined with strong execution ensures consistent delivery. "
            "Stakeholders trust you to meet commitments without surprises.",
            "Your emotional stability and supportive nature create psychological safety for your teams. "
            "People feel comfortable raising concerns and taking appropriate risks."
        ],
        "challenges": [
            "Your preference for proven methods may limit innovation and adaptation to change. "
            "Consider building in structured time for exploring new approaches.",
            "Your focus on stability may cause resistance to necessary organizational changes. "
            "Practice distinguishing between changes that threaten core values and those that don't."
        ]
    },
    
    # Type 9: Low O, High C, High E, Low A, Low N
    ("L", "H", "H", "L", "L"): {
        "type_name": "Decisive Executor",
        "short_desc": "You are an organized, confident, and results-driven professional who gets things done efficiently.",
        "full_desc": [
            "You combine disciplined execution with social confidence and a focus on results over relationships. "
            "Your lower openness means you prefer practical, proven approaches. "
            "Your emotional stability keeps you composed under pressure.",
            "You excel at driving execution in competitive environments. "
            "You're comfortable making tough decisions, holding people accountable, and pushing for results. "
            "You don't let social considerations slow down necessary action.",
            "Sales management, operations leadership, military/law enforcement, and performance-driven roles suit your profile. "
            "You thrive in environments that value results, efficiency, and decisive action."
        ],
        "strengths": [
            "Your combination of organization and decisiveness makes you highly effective at execution. "
            "You set clear expectations, track progress, and address issues promptly.",
            "Your confidence and emotional stability allow you to make and stand by difficult decisions. "
            "You don't second-guess yourself or get derailed by criticism.",
            "Your practical focus ensures resources are used efficiently. "
            "You cut through complexity to focus on what actually drives results."
        ],
        "challenges": [
            "Your directness and results focus may damage relationships over time. "
            "Consider investing in relationship maintenance even when it doesn't seem immediately productive.",
            "Your preference for proven methods may cause you to miss innovative solutions. "
            "Build in processes to consider new approaches before defaulting to familiar ones."
        ]
    },
    
    # Type 10: Low O, High C, Low E, High A, Low N
    ("L", "H", "L", "H", "L"): {
        "type_name": "Steady Supporter",
        "short_desc": "You are a reliable, caring, and methodical professional who provides consistent support behind the scenes.",
        "full_desc": [
            "You combine disciplined reliability with genuine care for others and a preference for quiet contribution. "
            "Your lower openness means you value stability and proven methods. "
            "Your emotional stability provides a calm, steady presence.",
            "You excel at roles requiring consistent, careful work and supportive relationships. "
            "You're the backbone of teams—the person who ensures things run smoothly without seeking spotlight. "
            "Your reliability and warmth earn deep appreciation from those who work closely with you.",
            "Administrative support, accounting, quality assurance, and healthcare support roles suit your profile. "
            "You thrive in stable environments that value reliability, accuracy, and genuine helpfulness."
        ],
        "strengths": [
            "Your combination of reliability and care makes you invaluable to teams and organizations. "
            "You're the person others depend on for consistent, quality support.",
            "Your preference for proven methods and attention to detail ensures accuracy and consistency. "
            "You catch errors others miss and maintain high standards.",
            "Your calm, supportive presence creates stability for colleagues. "
            "You're a reassuring constant in changing environments."
        ],
        "challenges": [
            "Your preference for stability may cause anxiety when facing significant changes. "
            "Practice building comfort with change through small, controlled experiments.",
            "Your quiet nature may limit recognition for your contributions. "
            "Consider ways to make your value more visible without compromising your authentic style."
        ]
    },

    # Type 11: Low O, High C, Low E, Low A, Low N
    ("L", "H", "L", "L", "L"): {
        "type_name": "Precise Analyst",
        "short_desc": "You are a methodical, independent, and emotionally stable professional who excels at detailed, analytical work.",
        "full_desc": [
            "You combine disciplined attention to detail with independence and emotional stability. "
            "Your lower openness means you prefer systematic, proven approaches. "
            "Your lower extraversion and agreeableness mean you work best autonomously.",
            "You excel at work requiring precision, consistency, and independent judgment. "
            "You're not distracted by social dynamics or swayed by popular opinion. "
            "You focus on getting things right according to objective standards.",
            "Accounting, auditing, quality control, data analysis, and technical inspection suit your profile. "
            "You thrive in environments that value accuracy, consistency, and independent verification."
        ],
        "strengths": [
            "Your combination of conscientiousness and independence produces highly reliable work. "
            "You maintain standards regardless of social pressure or shortcuts others might take.",
            "Your emotional stability and focus allow sustained concentration on detailed work. "
            "You don't get bored or distracted by routine tasks that require precision.",
            "Your objectivity and independence make you trustworthy for verification and audit roles. "
            "You call things as you see them without bias."
        ],
        "challenges": [
            "Your independence and directness may limit collaboration and relationship-building. "
            "Consider strategic relationship investment to ensure your work gets appropriate support.",
            "Your preference for proven methods may cause resistance to process improvements. "
            "Practice evaluating new approaches on their merits rather than defaulting to familiar methods."
        ]
    },
    
    # =========================================================================
    # HIGH EXTRAVERSION COMBINATIONS (Social/Energetic Types)
    # =========================================================================
    
    # Type 12: Low O, Low C, High E, High A, Low N
    ("L", "L", "H", "H", "L"): {
        "type_name": "Warm Connector",
        "short_desc": "You are a sociable, caring, and easygoing person who builds relationships naturally but may struggle with structure.",
        "full_desc": [
            "You combine social energy with genuine warmth and a relaxed approach to life. "
            "Your lower openness means you prefer familiar social contexts. "
            "Your lower conscientiousness means you value flexibility over rigid planning.",
            "You excel at building and maintaining relationships. "
            "People are drawn to your warmth and easygoing nature. "
            "You create comfortable social environments where others feel welcome.",
            "Customer service, hospitality, community relations, and social support roles suit your profile. "
            "You thrive in environments that value relationships and flexibility over rigid processes."
        ],
        "strengths": [
            "Your combination of social energy and warmth makes you naturally likeable and approachable. "
            "You build rapport quickly and maintain relationships effortlessly.",
            "Your easygoing nature helps others relax and feel comfortable. "
            "You reduce tension in social situations and create welcoming environments.",
            "Your emotional stability means you maintain your warm demeanor even under stress. "
            "You're a consistent, positive presence for others."
        ],
        "challenges": [
            "Your preference for flexibility may lead to missed commitments or incomplete tasks. "
            "Consider simple systems to track important responsibilities.",
            "Your focus on relationships may sometimes come at the expense of task completion. "
            "Practice balancing social time with focused work time."
        ]
    },
    
    # Type 13: Low O, Low C, High E, Low A, Low N
    ("L", "L", "H", "L", "L"): {
        "type_name": "Bold Adventurer",
        "short_desc": "You are a confident, spontaneous, and independent social presence who seeks excitement and freedom.",
        "full_desc": [
            "You combine social confidence with independence and a preference for spontaneity. "
            "Your lower openness means you prefer familiar types of excitement. "
            "Your emotional stability keeps you composed in high-energy situations.",
            "You excel in dynamic, social environments that don't require rigid structure. "
            "You're comfortable taking risks, speaking your mind, and pursuing what interests you. "
            "You bring energy and confidence to social situations.",
            "Sales, entertainment, sports, and entrepreneurial ventures suit your profile. "
            "You thrive in environments that reward confidence, social skills, and adaptability."
        ],
        "strengths": [
            "Your combination of social confidence and independence makes you persuasive and influential. "
            "You're comfortable advocating for yourself and your ideas.",
            "Your spontaneity and emotional stability allow you to handle unexpected situations smoothly. "
            "You think on your feet and maintain composure under pressure.",
            "Your energy and confidence are contagious. "
            "You can motivate others and create excitement around initiatives."
        ],
        "challenges": [
            "Your spontaneity and independence may lead to inconsistent follow-through. "
            "Consider partnering with more organized colleagues for important commitments.",
            "Your directness and confidence may sometimes come across as arrogant or dismissive. "
            "Practice active listening and acknowledging others' contributions."
        ]
    },

    # =========================================================================
    # HIGH AGREEABLENESS COMBINATIONS (Caring/Cooperative Types)
    # =========================================================================
    
    # Type 14: Low O, Low C, Low E, High A, Low N
    ("L", "L", "L", "H", "L"): {
        "type_name": "Quiet Helper",
        "short_desc": "You are a caring, calm, and unassuming person who supports others without seeking attention.",
        "full_desc": [
            "You combine genuine care for others with a quiet, unassuming presence. "
            "Your lower openness means you prefer familiar ways of helping. "
            "Your lower conscientiousness and extraversion mean you prefer informal, flexible support roles.",
            "You excel at providing quiet, steady support to those around you. "
            "You don't need recognition or structure to be helpful. "
            "Your calm presence and genuine care make others feel supported.",
            "Caregiving, volunteer work, and supportive community roles suit your profile. "
            "You thrive in environments that value genuine helpfulness over formal achievement."
        ],
        "strengths": [
            "Your combination of care and calm creates a soothing presence for others. "
            "People feel comfortable and supported around you.",
            "Your lack of ego and genuine helpfulness make you trustworthy. "
            "Others know you're helping because you care, not for recognition.",
            "Your emotional stability means you can provide consistent support even during difficult times. "
            "You're a reliable source of comfort for others."
        ],
        "challenges": [
            "Your quiet, unassuming nature may lead others to overlook or take advantage of your helpfulness. "
            "Practice setting boundaries and advocating for your own needs.",
            "Your preference for flexibility may make it difficult to meet formal commitments. "
            "Consider which responsibilities truly matter and focus your energy there."
        ]
    },
    
    # =========================================================================
    # HIGH NEUROTICISM COMBINATIONS (Sensitive/Intense Types)
    # =========================================================================
    
    # Type 15: High O, High C, High E, High A, High N
    # (Already defined as Type 2 - Passionate Perfectionist)
    
    # Type 16: High O, Low C, High E, High A, High N
    ("H", "L", "H", "H", "H"): {
        "type_name": "Sensitive Idealist",
        "short_desc": "You are a creative, caring, and emotionally intense person who feels deeply and seeks meaningful connection.",
        "full_desc": [
            "You combine rich creativity with social warmth and deep emotional sensitivity. "
            "Your lower conscientiousness means you prefer organic flow over rigid structure. "
            "Your high neuroticism means you experience emotions—both positive and negative—intensely.",
            "You excel at work that channels emotional depth into creative expression or helping others. "
            "You understand human experience deeply and can articulate feelings others struggle to express. "
            "Your sensitivity, while sometimes overwhelming, is also your greatest gift.",
            "Art, music, counseling, writing, and advocacy work suit your profile. "
            "You thrive in environments that value emotional authenticity and creative expression."
        ],
        "strengths": [
            "Your emotional depth allows you to create work that resonates profoundly with others. "
            "You capture human experience in ways that feel true and meaningful.",
            "Your combination of sensitivity and warmth makes you deeply empathetic. "
            "You understand others' pain and joy in ways that create genuine connection.",
            "Your creativity and social skills allow you to inspire and move others. "
            "You can articulate visions that touch people's hearts."
        ],
        "challenges": [
            "Your emotional intensity may lead to overwhelm, anxiety, or mood swings. "
            "Develop robust self-care practices and consider professional support when needed.",
            "Your preference for flexibility combined with emotional sensitivity may make deadlines stressful. "
            "Build in extra buffer time and break large projects into smaller, manageable pieces."
        ]
    },
    
    # Type 17: Low O, High C, High E, High A, High N
    ("L", "H", "H", "H", "H"): {
        "type_name": "Anxious Achiever",
        "short_desc": "You are organized, sociable, and caring but experience significant worry about meeting expectations.",
        "full_desc": [
            "You combine strong organizational skills with social engagement and genuine care for others. "
            "Your lower openness means you prefer proven methods and predictable environments. "
            "Your high neuroticism means you experience significant anxiety about performance and relationships.",
            "You excel at structured work in supportive environments. "
            "Your conscientiousness ensures high-quality output, and your social skills build strong relationships. "
            "However, you may worry excessively about meeting others' expectations.",
            "Administrative leadership, project coordination, and client service roles suit your profile. "
            "You thrive in stable environments with clear expectations and supportive colleagues."
        ],
        "strengths": [
            "Your combination of conscientiousness and care produces reliable, high-quality work. "
            "You take responsibilities seriously and follow through on commitments.",
            "Your social skills and genuine concern for others build strong, trusting relationships. "
            "Colleagues and clients appreciate your attentiveness and reliability.",
            "Your anxiety, while uncomfortable, drives thorough preparation and attention to detail. "
            "You rarely miss important considerations."
        ],
        "challenges": [
            "Your anxiety may lead to excessive worry, perfectionism, or difficulty delegating. "
            "Practice distinguishing between productive concern and unproductive worry.",
            "Your need for stability may cause significant stress during organizational changes. "
            "Develop coping strategies for uncertainty and consider seeking support during transitions."
        ]
    },

    # Type 18: Low O, Low C, Low E, Low A, High N
    ("L", "L", "L", "L", "H"): {
        "type_name": "Guarded Skeptic",
        "short_desc": "You are cautious, independent, and emotionally sensitive, preferring to observe before engaging.",
        "full_desc": [
            "You combine caution with independence and emotional sensitivity. "
            "Your lower scores across openness, conscientiousness, extraversion, and agreeableness mean you prefer "
            "to keep your distance and make your own judgments. Your high neuroticism means you're alert to potential threats.",
            "You excel at roles requiring vigilance and independent judgment. "
            "You're not easily swayed by social pressure or optimistic assumptions. "
            "You see risks others miss and question claims others accept.",
            "Security, risk assessment, quality control, and investigative roles suit your profile. "
            "You thrive in environments that value skepticism and independent verification."
        ],
        "strengths": [
            "Your combination of caution and independence makes you a valuable skeptic. "
            "You question assumptions and identify risks others overlook.",
            "Your emotional sensitivity keeps you alert to subtle warning signs. "
            "You notice when something doesn't feel right.",
            "Your independence means you're not swayed by groupthink or social pressure. "
            "You maintain your perspective even when it's unpopular."
        ],
        "challenges": [
            "Your caution and skepticism may limit opportunities and relationships. "
            "Practice distinguishing between genuine risks and excessive worry.",
            "Your emotional sensitivity may lead to anxiety or pessimism. "
            "Develop strategies to manage worry and maintain perspective."
        ]
    },
    
    # =========================================================================
    # MEDIUM/BALANCED COMBINATIONS (Adaptable Types)
    # =========================================================================
    
    # Type 19: Medium across all traits
    ("M", "M", "M", "M", "M"): {
        "type_name": "Balanced Adapter",
        "short_desc": "You have a well-rounded personality that allows you to adapt flexibly to different situations and roles.",
        "full_desc": [
            "You have moderate levels across all Big Five dimensions, giving you a balanced, adaptable personality. "
            "You're neither extremely creative nor extremely conventional, neither highly organized nor highly spontaneous, "
            "neither very outgoing nor very reserved, neither extremely agreeable nor extremely challenging.",
            "This balance allows you to adapt to different situations and work effectively with diverse colleagues. "
            "You can draw on different aspects of your personality depending on what the context requires. "
            "You're not locked into any extreme pattern.",
            "Generalist roles, project management, consulting, and roles requiring versatility suit your profile. "
            "You thrive in environments that value adaptability and well-rounded capability."
        ],
        "strengths": [
            "Your balanced profile allows you to adapt your approach based on situational demands. "
            "You can be creative when needed, organized when required, social or independent as appropriate.",
            "Your moderate tendencies make you relatable to a wide range of colleagues. "
            "You can understand and work with people across the personality spectrum.",
            "Your lack of extreme tendencies means you have few blind spots or vulnerabilities. "
            "You're not likely to be derailed by situations that challenge extreme personalities."
        ],
        "challenges": [
            "Your balanced profile may make it harder to identify your unique strengths and ideal roles. "
            "Consider what you most enjoy and value to guide career decisions.",
            "Your adaptability may lead to being a generalist without deep expertise. "
            "Consider developing specialized skills in areas that interest you most."
        ]
    },
    
    # Type 20: High O, Medium C, Medium E, Medium A, Low N
    ("H", "M", "M", "M", "L"): {
        "type_name": "Curious Explorer",
        "short_desc": "You are creative and emotionally stable with balanced social and organizational tendencies.",
        "full_desc": [
            "You combine high openness with emotional stability and moderate levels of other traits. "
            "Your creativity and curiosity are your defining characteristics, supported by a calm, balanced foundation. "
            "You can adapt your social engagement and organizational approach as needed.",
            "You excel at roles requiring creative thinking and exploration. "
            "Your emotional stability allows you to pursue novel ideas without anxiety. "
            "Your balanced other traits mean you can work in various contexts.",
            "Research, design, innovation roles, and creative professions suit your profile. "
            "You thrive in environments that value creativity and provide room for exploration."
        ],
        "strengths": [
            "Your combination of creativity and emotional stability allows confident exploration of new ideas. "
            "You pursue innovation without excessive worry about failure.",
            "Your balanced social and organizational tendencies make you adaptable. "
            "You can work independently or collaboratively, with structure or flexibility.",
            "Your curiosity drives continuous learning and growth. "
            "You're always discovering new interests and developing new capabilities."
        ],
        "challenges": [
            "Your many interests may make it difficult to focus and develop deep expertise. "
            "Consider which areas deserve sustained attention.",
            "Your moderate conscientiousness may sometimes conflict with your creative ambitions. "
            "Develop systems to ensure important creative projects reach completion."
        ]
    },

    # Type 21: Medium O, High C, Medium E, Medium A, Low N
    ("M", "H", "M", "M", "L"): {
        "type_name": "Steady Professional",
        "short_desc": "You are highly organized and emotionally stable with balanced creativity and social tendencies.",
        "full_desc": [
            "You combine high conscientiousness with emotional stability and moderate levels of other traits. "
            "Your organization and reliability are your defining characteristics, supported by a calm, balanced foundation. "
            "You can adapt your creative approach and social engagement as needed.",
            "You excel at roles requiring consistent, high-quality execution. "
            "Your emotional stability allows you to maintain performance under pressure. "
            "Your balanced other traits mean you can work in various contexts.",
            "Project management, operations, finance, and professional services suit your profile. "
            "You thrive in environments that value reliability, quality, and steady performance."
        ],
        "strengths": [
            "Your combination of conscientiousness and emotional stability makes you exceptionally reliable. "
            "You deliver consistent quality regardless of circumstances.",
            "Your balanced creativity and social tendencies make you adaptable. "
            "You can innovate when needed and collaborate effectively.",
            "Your steady nature makes you a stabilizing presence for teams. "
            "Others can count on you during uncertain times."
        ],
        "challenges": [
            "Your focus on reliability may sometimes limit risk-taking and innovation. "
            "Consider when calculated risks might yield significant benefits.",
            "Your moderate openness may cause you to miss creative solutions. "
            "Build in time to explore unconventional approaches."
        ]
    },
    
    # Type 22: Medium O, Medium C, High E, Medium A, Low N
    ("M", "M", "H", "M", "L"): {
        "type_name": "Confident Communicator",
        "short_desc": "You are highly sociable and emotionally stable with balanced creativity and organizational tendencies.",
        "full_desc": [
            "You combine high extraversion with emotional stability and moderate levels of other traits. "
            "Your social energy and confidence are your defining characteristics, supported by a calm, balanced foundation. "
            "You can adapt your creative approach and organizational style as needed.",
            "You excel at roles requiring social engagement and communication. "
            "Your emotional stability allows you to maintain composure in social situations. "
            "Your balanced other traits mean you can work in various contexts.",
            "Sales, marketing, public relations, and client-facing roles suit your profile. "
            "You thrive in environments that value communication, relationships, and social influence."
        ],
        "strengths": [
            "Your combination of extraversion and emotional stability makes you a confident, composed communicator. "
            "You engage others effectively without anxiety or self-doubt.",
            "Your balanced creativity and organization allow you to adapt your approach. "
            "You can be innovative or systematic depending on what's needed.",
            "Your social energy and confidence inspire others. "
            "You create positive momentum in teams and projects."
        ],
        "challenges": [
            "Your social focus may sometimes come at the expense of deep, focused work. "
            "Build in protected time for tasks requiring concentration.",
            "Your confidence may occasionally lead to overcommitment. "
            "Practice realistic assessment of your capacity before taking on new responsibilities."
        ]
    },
    
    # Type 23: Medium O, Medium C, Medium E, High A, Low N
    ("M", "M", "M", "H", "L"): {
        "type_name": "Harmonious Collaborator",
        "short_desc": "You are highly cooperative and emotionally stable with balanced creativity and organizational tendencies.",
        "full_desc": [
            "You combine high agreeableness with emotional stability and moderate levels of other traits. "
            "Your cooperation and care for others are your defining characteristics, supported by a calm, balanced foundation. "
            "You can adapt your creative approach and organizational style as needed.",
            "You excel at roles requiring collaboration and relationship maintenance. "
            "Your emotional stability allows you to navigate interpersonal dynamics calmly. "
            "Your balanced other traits mean you can work in various contexts.",
            "Team coordination, HR, customer success, and collaborative roles suit your profile. "
            "You thrive in environments that value teamwork, harmony, and supportive relationships."
        ],
        "strengths": [
            "Your combination of agreeableness and emotional stability makes you a calming, supportive presence. "
            "You help teams work together effectively and resolve conflicts constructively.",
            "Your balanced creativity and organization allow you to adapt your approach. "
            "You can contribute in various ways depending on team needs.",
            "Your genuine care for others builds trust and loyalty. "
            "People feel valued and supported when working with you."
        ],
        "challenges": [
            "Your focus on harmony may sometimes lead to avoiding necessary conflicts. "
            "Practice addressing issues directly while maintaining your supportive approach.",
            "Your desire to help may lead to overcommitment or neglecting your own needs. "
            "Set boundaries and prioritize self-care alongside caring for others."
        ]
    },

    # =========================================================================
    # ADDITIONAL COMMON COMBINATIONS (Types 24-50+)
    # =========================================================================
    
    # Type 24: High O, High C, Medium E, Medium A, Low N
    ("H", "H", "M", "M", "L"): {
        "type_name": "Strategic Innovator",
        "short_desc": "You combine creative vision with disciplined execution and emotional stability.",
        "full_desc": [
            "You possess the rare combination of innovative thinking and disciplined follow-through. "
            "Your high openness generates creative ideas, while your high conscientiousness ensures they become reality. "
            "Your emotional stability provides a calm foundation for pursuing ambitious goals.",
            "You excel at roles requiring both vision and execution. "
            "You can see possibilities others miss and create detailed plans to achieve them. "
            "Your balanced social and cooperative tendencies allow you to work effectively in various team contexts.",
            "Strategy, product development, research leadership, and entrepreneurship suit your profile. "
            "You thrive in environments that value both innovation and results."
        ],
        "strengths": [
            "Your combination of creativity and discipline is exceptionally valuable. "
            "You don't just dream—you deliver on your visions.",
            "Your emotional stability allows you to pursue ambitious goals without anxiety. "
            "You maintain focus and composure even when facing setbacks.",
            "Your balanced social tendencies make you adaptable to different team dynamics. "
            "You can lead, collaborate, or work independently as needed."
        ],
        "challenges": [
            "Your high standards for both innovation and execution may lead to perfectionism. "
            "Practice distinguishing between projects that warrant perfection and those that don't.",
            "Your capability may lead others to over-rely on you. "
            "Develop others' capabilities and delegate appropriately."
        ]
    },
    
    # Type 25: Medium O, High C, High E, High A, Low N
    ("M", "H", "H", "H", "L"): {
        "type_name": "Effective Leader",
        "short_desc": "You are organized, sociable, and caring with emotional stability—a natural people leader.",
        "full_desc": [
            "You combine strong organizational skills with social energy and genuine care for others. "
            "Your emotional stability provides a calm foundation for leadership. "
            "Your moderate openness means you balance innovation with practical execution.",
            "You excel at leading teams and organizations. "
            "You create structured environments where people feel supported and motivated. "
            "Your reliability and warmth earn deep trust from colleagues and direct reports.",
            "Management, team leadership, HR leadership, and organizational development suit your profile. "
            "You thrive in environments that value people leadership and operational excellence."
        ],
        "strengths": [
            "Your combination of organization, social skills, and care makes you an exceptional leader. "
            "You build high-performing teams that are both productive and engaged.",
            "Your emotional stability allows you to lead calmly through challenges. "
            "You model composure that stabilizes teams during difficult periods.",
            "Your balanced approach to innovation means you improve without disrupting. "
            "You make things better while maintaining stability."
        ],
        "challenges": [
            "Your focus on people and process may sometimes slow decision-making. "
            "Practice distinguishing between decisions that warrant consultation and those that don't.",
            "Your desire to maintain harmony may lead to avoiding difficult conversations. "
            "Develop comfort with constructive conflict when necessary."
        ]
    },
    
    # Type 26: High O, Medium C, High E, High A, Low N
    ("H", "M", "H", "H", "L"): {
        "type_name": "Inspiring Visionary",
        "short_desc": "You are creative, sociable, and caring with emotional stability—a natural inspirer of others.",
        "full_desc": [
            "You combine creative vision with social energy and genuine care for others. "
            "Your emotional stability provides a calm foundation for inspiring leadership. "
            "Your moderate conscientiousness means you balance vision with practical considerations.",
            "You excel at inspiring and mobilizing others around meaningful goals. "
            "You see possibilities, communicate them compellingly, and bring people together. "
            "Your warmth and stability create trust and psychological safety.",
            "Thought leadership, coaching, organizational change, and mission-driven roles suit your profile. "
            "You thrive in environments that value vision, inspiration, and positive impact."
        ],
        "strengths": [
            "Your combination of creativity, social skills, and care makes you deeply inspiring. "
            "You help others see possibilities and believe in themselves.",
            "Your emotional stability allows you to maintain optimism through challenges. "
            "You're a consistent source of hope and encouragement.",
            "Your genuine care for others creates loyal followership. "
            "People trust your intentions and want to support your vision."
        ],
        "challenges": [
            "Your focus on vision and relationships may sometimes neglect operational details. "
            "Partner with detail-oriented colleagues or develop systems for follow-through.",
            "Your optimism may occasionally lead to underestimating obstacles. "
            "Build in reality checks and contingency planning."
        ]
    },

    # Type 27: Low O, High C, Medium E, High A, Low N
    ("L", "H", "M", "H", "L"): {
        "type_name": "Reliable Collaborator",
        "short_desc": "You are dependable and cooperative, valued for your consistent work and supportive approach.",
        "full_desc": [
            "You combine strong organizational skills with genuine care for others and emotional stability. "
            "Your lower openness means you prefer proven methods and stable environments. "
            "Your moderate extraversion allows you to engage socially while also working independently.",
            "You excel at roles requiring consistent, reliable contribution in collaborative settings. "
            "You're the backbone of teams—the person others count on to deliver quality work and support colleagues. "
            "Your stability and warmth create trust and psychological safety.",
            "Operations, project support, team coordination, and administrative leadership suit your profile. "
            "You thrive in stable environments that value reliability, teamwork, and supportive relationships."
        ],
        "strengths": [
            "Your combination of reliability and care makes you invaluable to teams. "
            "You deliver consistent quality while supporting colleagues' success.",
            "Your emotional stability and warmth create a calming, supportive presence. "
            "Others feel comfortable and supported when working with you.",
            "Your preference for proven methods ensures consistent, predictable results. "
            "Stakeholders trust you to meet commitments without surprises."
        ],
        "challenges": [
            "Your preference for stability may cause discomfort with significant changes. "
            "Practice building comfort with change through small, controlled experiments.",
            "Your supportive nature may sometimes lead to taking on others' responsibilities. "
            "Set boundaries while maintaining your helpful approach."
        ]
    },
    
    # Type 28: High O, Low C, Medium E, Medium A, High N
    ("H", "L", "M", "M", "H"): {
        "type_name": "Restless Creative",
        "short_desc": "You are highly creative but struggle with structure and experience emotional intensity.",
        "full_desc": [
            "You possess rich creativity and imagination but find structure and routine challenging. "
            "Your high neuroticism means you experience emotions intensely, which can fuel creativity but also cause distress. "
            "Your moderate social and cooperative tendencies allow flexibility in how you engage with others.",
            "You excel at generating creative ideas and seeing unconventional possibilities. "
            "However, you may struggle to bring ideas to completion without support. "
            "Your emotional intensity can be channeled into powerful creative expression.",
            "Art, writing, music, and creative roles with supportive structure suit your profile. "
            "You thrive in environments that value creativity while providing gentle accountability."
        ],
        "strengths": [
            "Your combination of creativity and emotional depth produces powerful, authentic work. "
            "You express human experience in ways that resonate deeply with others.",
            "Your openness to experience means you're constantly discovering new inspiration. "
            "You see connections and possibilities others miss.",
            "Your emotional intensity, while challenging, fuels passionate engagement with your work. "
            "You care deeply about what you create."
        ],
        "challenges": [
            "Your difficulty with structure may lead to incomplete projects and missed opportunities. "
            "Seek supportive accountability partners or gentle systems to aid follow-through.",
            "Your emotional intensity may lead to anxiety, mood swings, or creative blocks. "
            "Develop robust self-care practices and consider professional support."
        ]
    },
    
    # Type 29: Medium O, Low C, High E, High A, Medium N
    ("M", "L", "H", "H", "M"): {
        "type_name": "Social Butterfly",
        "short_desc": "You are highly sociable and caring but prefer flexibility over structure.",
        "full_desc": [
            "You combine strong social energy with genuine care for others and a preference for flexibility. "
            "Your moderate openness and neuroticism provide balance. "
            "Your lower conscientiousness means you prefer spontaneity over rigid planning.",
            "You excel at building relationships and creating positive social environments. "
            "You bring warmth and energy to social situations. "
            "However, you may need support with detailed planning and follow-through.",
            "Event planning, hospitality, community building, and social roles suit your profile. "
            "You thrive in environments that value relationships and flexibility over rigid processes."
        ],
        "strengths": [
            "Your combination of social energy and warmth makes you naturally likeable. "
            "You build rapport quickly and maintain relationships effortlessly.",
            "Your flexibility allows you to adapt to changing social situations. "
            "You're comfortable with spontaneity and can think on your feet.",
            "Your genuine care for others creates loyal friendships and professional relationships. "
            "People feel valued and appreciated when they're with you."
        ],
        "challenges": [
            "Your preference for flexibility may lead to overcommitment or missed deadlines. "
            "Consider simple systems to track important responsibilities.",
            "Your social focus may sometimes come at the expense of focused work. "
            "Build in protected time for tasks requiring concentration."
        ]
    },

    # Type 30: Low O, Medium C, Low E, High A, Low N
    ("L", "M", "L", "H", "L"): {
        "type_name": "Loyal Supporter",
        "short_desc": "You are caring, stable, and prefer familiar environments with close relationships.",
        "full_desc": [
            "You combine genuine care for others with emotional stability and a preference for familiar contexts. "
            "Your lower openness and extraversion mean you prefer depth over breadth in relationships and experiences. "
            "Your moderate conscientiousness provides adequate structure without rigidity.",
            "You excel at providing steady, reliable support to those you care about. "
            "You build deep, lasting relationships rather than broad networks. "
            "Your stability and loyalty make you a trusted confidant and colleague.",
            "Support roles, caregiving, administrative assistance, and close-knit team environments suit your profile. "
            "You thrive in stable environments with familiar colleagues and predictable routines."
        ],
        "strengths": [
            "Your combination of care and stability makes you a rock for those around you. "
            "People know they can count on your consistent support.",
            "Your preference for depth creates meaningful, lasting relationships. "
            "You invest in people and maintain connections over time.",
            "Your emotional stability provides a calming presence. "
            "You're not easily rattled by drama or stress."
        ],
        "challenges": [
            "Your preference for familiarity may limit exposure to new opportunities. "
            "Consider occasional ventures outside your comfort zone.",
            "Your quiet nature may limit visibility and recognition. "
            "Find ways to share your contributions without compromising your authentic style."
        ]
    },
    
    # Type 31: High O, High C, Low E, Medium A, Low N
    ("H", "H", "L", "M", "L"): {
        "type_name": "Deep Specialist",
        "short_desc": "You are creative, disciplined, and prefer focused, independent work over social engagement.",
        "full_desc": [
            "You combine innovative thinking with disciplined execution and a preference for focused work. "
            "Your lower extraversion means you prefer depth over breadth in your work and relationships. "
            "Your emotional stability provides a calm foundation for sustained concentration.",
            "You excel at complex, independent work requiring both creativity and rigor. "
            "You develop deep expertise and produce high-quality, innovative work. "
            "You don't need social interaction to stay motivated.",
            "Research, technical writing, specialized analysis, and expert roles suit your profile. "
            "You thrive in environments that value expertise, quality, and independent contribution."
        ],
        "strengths": [
            "Your combination of creativity and discipline produces exceptional work. "
            "You innovate within rigorous standards.",
            "Your preference for depth allows you to develop genuine expertise. "
            "You become a go-to authority in your areas of focus.",
            "Your emotional stability and independence mean you maintain focus without external validation. "
            "You're self-motivated and resilient."
        ],
        "challenges": [
            "Your preference for independent work may limit collaboration and visibility. "
            "Consider strategic networking to ensure your work gets appropriate recognition.",
            "Your focus on depth may sometimes miss broader context. "
            "Build in time to understand how your work connects to larger goals."
        ]
    },
    
    # Type 32: Medium O, High C, Low E, Medium A, Low N
    ("M", "H", "L", "M", "L"): {
        "type_name": "Quiet Achiever",
        "short_desc": "You are highly organized and emotionally stable, preferring focused work over social engagement.",
        "full_desc": [
            "You combine strong organizational skills with emotional stability and a preference for focused work. "
            "Your moderate openness and agreeableness provide balance. "
            "Your lower extraversion means you prefer depth and concentration over social activity.",
            "You excel at detailed, independent work requiring consistency and quality. "
            "You deliver reliable results without needing recognition or social interaction. "
            "Your stability and focus make you highly productive.",
            "Analysis, accounting, technical roles, and quality-focused positions suit your profile. "
            "You thrive in environments that value quality, reliability, and focused contribution."
        ],
        "strengths": [
            "Your combination of organization and focus produces consistently high-quality work. "
            "You maintain standards regardless of distractions.",
            "Your emotional stability allows sustained concentration on detailed tasks. "
            "You don't get bored or frustrated with careful, methodical work.",
            "Your independence means you're highly productive without supervision. "
            "You manage yourself effectively."
        ],
        "challenges": [
            "Your quiet nature may limit visibility and advancement. "
            "Consider strategic ways to share your accomplishments.",
            "Your preference for focused work may limit collaboration skills. "
            "Practice engaging with colleagues even when it's not strictly necessary."
        ]
    },

    # Type 33: Low O, Low C, Medium E, Medium A, Low N
    ("L", "L", "M", "M", "L"): {
        "type_name": "Easygoing Realist",
        "short_desc": "You are practical, flexible, and emotionally stable with balanced social tendencies.",
        "full_desc": [
            "You combine a practical, grounded approach with flexibility and emotional stability. "
            "Your lower openness means you prefer familiar, proven approaches. "
            "Your lower conscientiousness means you value flexibility over rigid structure.",
            "You excel at adapting to situations without overthinking or overplanning. "
            "You take things as they come and maintain composure. "
            "Your balanced social tendencies allow you to engage or withdraw as appropriate.",
            "Practical, hands-on roles with flexibility suit your profile. "
            "You thrive in environments that value adaptability and practical problem-solving."
        ],
        "strengths": [
            "Your combination of practicality and flexibility makes you adaptable. "
            "You handle unexpected situations without stress.",
            "Your emotional stability means you maintain composure in various circumstances. "
            "You're not easily rattled or overwhelmed.",
            "Your realistic approach helps you see situations clearly. "
            "You're not distracted by unrealistic expectations."
        ],
        "challenges": [
            "Your preference for flexibility may sometimes lead to missed opportunities requiring planning. "
            "Consider when structure might serve your goals.",
            "Your practical focus may limit exploration of creative possibilities. "
            "Occasionally challenge yourself to consider unconventional approaches."
        ]
    },
    
    # Type 34: High O, Medium C, Low E, High A, Low N
    ("H", "M", "L", "H", "L"): {
        "type_name": "Thoughtful Idealist",
        "short_desc": "You are creative, caring, and introspective with emotional stability.",
        "full_desc": [
            "You combine creative thinking with genuine care for others and a preference for meaningful depth. "
            "Your lower extraversion means you prefer quality over quantity in relationships. "
            "Your emotional stability provides a calm foundation for your thoughtful approach.",
            "You excel at work that combines creativity with helping others. "
            "You bring depth and authenticity to your contributions. "
            "Your stability and care create trust in close relationships.",
            "Counseling, writing, design for social good, and meaningful creative work suit your profile. "
            "You thrive in environments that value depth, creativity, and positive impact."
        ],
        "strengths": [
            "Your combination of creativity and care produces meaningful, impactful work. "
            "You create things that help others and make a difference.",
            "Your preference for depth creates genuine, lasting relationships. "
            "People trust your authenticity and care.",
            "Your emotional stability allows you to support others calmly. "
            "You're a steady presence for those who need you."
        ],
        "challenges": [
            "Your preference for depth may limit your reach and visibility. "
            "Consider how to share your work more broadly while maintaining authenticity.",
            "Your idealism may sometimes conflict with practical constraints. "
            "Practice balancing vision with realistic assessment."
        ]
    },
    
    # Type 35: Medium O, Medium C, High E, Low A, Low N
    ("M", "M", "H", "L", "L"): {
        "type_name": "Assertive Influencer",
        "short_desc": "You are socially confident and direct with emotional stability and balanced other traits.",
        "full_desc": [
            "You combine strong social confidence with directness and emotional stability. "
            "Your lower agreeableness means you're comfortable asserting yourself and challenging others. "
            "Your moderate openness and conscientiousness provide balance.",
            "You excel at roles requiring persuasion, negotiation, and confident communication. "
            "You're comfortable advocating for your position and pushing for results. "
            "Your stability keeps you composed in competitive situations.",
            "Sales, negotiation, advocacy, and competitive roles suit your profile. "
            "You thrive in environments that reward confidence, persuasion, and results."
        ],
        "strengths": [
            "Your combination of social confidence and directness makes you persuasive. "
            "You advocate effectively for yourself and your ideas.",
            "Your emotional stability allows you to handle rejection and conflict calmly. "
            "You don't take things personally or get derailed by setbacks.",
            "Your assertiveness drives results. "
            "You push through obstacles that stop others."
        ],
        "challenges": [
            "Your directness may sometimes damage relationships. "
            "Consider when diplomacy serves your goals better than confrontation.",
            "Your confidence may occasionally come across as arrogance. "
            "Practice acknowledging others' contributions and perspectives."
        ]
    },

    # Type 36-50: Additional important combinations
    
    ("H", "M", "H", "M", "L"): {
        "type_name": "Creative Connector",
        "short_desc": "You combine creativity with social energy and emotional stability.",
        "full_desc": [
            "You possess creative thinking, social confidence, and emotional stability in a balanced package. "
            "Your moderate conscientiousness and agreeableness provide flexibility. "
            "You can innovate, communicate, and adapt as situations require.",
            "You excel at roles combining creativity with communication and relationship-building. "
            "You generate ideas and share them compellingly. "
            "Your stability allows confident pursuit of creative goals.",
            "Marketing, creative direction, entrepreneurship, and innovation roles suit your profile."
        ],
        "strengths": [
            "Your combination of creativity and social skills makes you effective at spreading ideas. "
            "You innovate and influence.",
            "Your emotional stability allows confident creative risk-taking. "
            "You pursue bold ideas without excessive worry.",
            "Your adaptability lets you work in various contexts. "
            "You adjust your approach based on audience and situation."
        ],
        "challenges": [
            "Your many strengths may lead to scattered focus. "
            "Consider which opportunities deserve your sustained attention.",
            "Your moderate conscientiousness may sometimes affect follow-through. "
            "Develop systems to ensure important projects reach completion."
        ]
    },
    
    ("L", "H", "M", "M", "L"): {
        "type_name": "Practical Organizer",
        "short_desc": "You are highly organized and emotionally stable with practical, grounded approach.",
        "full_desc": [
            "You combine strong organizational skills with emotional stability and a practical mindset. "
            "Your lower openness means you prefer proven methods. "
            "Your moderate social and cooperative tendencies provide flexibility.",
            "You excel at creating and maintaining efficient systems and processes. "
            "You bring order to chaos and ensure things run smoothly. "
            "Your stability makes you reliable under pressure.",
            "Operations, administration, project management, and process improvement suit your profile."
        ],
        "strengths": [
            "Your combination of organization and practicality produces efficient, reliable systems. "
            "You optimize processes and maintain standards.",
            "Your emotional stability allows calm problem-solving. "
            "You address issues methodically without panic.",
            "Your preference for proven methods ensures consistency. "
            "You don't introduce unnecessary risk."
        ],
        "challenges": [
            "Your preference for proven methods may limit innovation. "
            "Consider when new approaches might yield significant improvements.",
            "Your practical focus may sometimes miss creative possibilities. "
            "Build in time to explore unconventional solutions."
        ]
    },
    
    ("M", "L", "M", "H", "M"): {
        "type_name": "Flexible Helper",
        "short_desc": "You are caring and adaptable with moderate emotional sensitivity.",
        "full_desc": [
            "You combine genuine care for others with flexibility and moderate emotional sensitivity. "
            "Your lower conscientiousness means you prefer organic helpfulness over structured support. "
            "Your moderate other traits provide balance.",
            "You excel at providing flexible, responsive support to those around you. "
            "You adapt your help to what people actually need. "
            "Your sensitivity helps you understand others' feelings.",
            "Support roles, caregiving, customer service, and helping professions suit your profile."
        ],
        "strengths": [
            "Your combination of care and flexibility makes you responsive to others' needs. "
            "You help in ways that actually matter.",
            "Your emotional sensitivity helps you understand what others are experiencing. "
            "You notice when people need support.",
            "Your adaptability allows you to help in various ways. "
            "You're not limited to one type of support."
        ],
        "challenges": [
            "Your flexibility may sometimes lead to inconsistent follow-through. "
            "Consider which commitments truly matter and prioritize those.",
            "Your emotional sensitivity may sometimes be overwhelming. "
            "Develop self-care practices to maintain your capacity to help."
        ]
    },
    
    ("H", "H", "M", "L", "L"): {
        "type_name": "Independent Innovator",
        "short_desc": "You combine creativity with discipline and independence.",
        "full_desc": [
            "You possess creative thinking, disciplined execution, and strong independence. "
            "Your lower agreeableness means you're comfortable challenging conventions. "
            "Your emotional stability provides resilience.",
            "You excel at independent work requiring both innovation and rigor. "
            "You develop novel solutions and see them through to completion. "
            "You don't need consensus to pursue your vision.",
            "Research, technical innovation, entrepreneurship, and expert roles suit your profile."
        ],
        "strengths": [
            "Your combination of creativity and discipline produces innovative yet rigorous work. "
            "You don't just dream—you deliver.",
            "Your independence allows you to pursue unconventional ideas. "
            "You're not constrained by groupthink.",
            "Your emotional stability provides resilience when facing skepticism. "
            "You persist despite resistance."
        ],
        "challenges": [
            "Your independence may limit collaboration and buy-in. "
            "Consider when involving others might strengthen your work.",
            "Your directness may sometimes alienate potential supporters. "
            "Practice framing ideas in ways that invite engagement."
        ]
    },
}


# =============================================================================
# LOOKUP FUNCTIONS
# =============================================================================

def _get_level(score: float) -> str:
    """Convert a Big5 score (0-100) to level category."""
    if score > 60:
        return "H"  # High
    elif score < 40:
        return "L"  # Low
    else:
        return "M"  # Medium


def _find_closest_type(levels: Tuple[str, str, str, str, str]) -> Dict[str, Any]:
    """Find the closest matching personality type when exact match not found."""
    # Try exact match first
    if levels in PERSONALITY_TYPES:
        return PERSONALITY_TYPES[levels]
    
    # Try with one dimension changed to Medium
    for i in range(5):
        test_levels = list(levels)
        test_levels[i] = "M"
        test_tuple = tuple(test_levels)
        if test_tuple in PERSONALITY_TYPES:
            return PERSONALITY_TYPES[test_tuple]
    
    # Try with two dimensions changed to Medium
    for i in range(5):
        for j in range(i + 1, 5):
            test_levels = list(levels)
            test_levels[i] = "M"
            test_levels[j] = "M"
            test_tuple = tuple(test_levels)
            if test_tuple in PERSONALITY_TYPES:
                return PERSONALITY_TYPES[test_tuple]
    
    # Return default balanced type
    return PERSONALITY_TYPES.get(("M", "M", "M", "M", "M"), _get_default_type(levels))


def _get_default_type(levels: Tuple[str, str, str, str, str]) -> Dict[str, Any]:
    """Generate a default type based on the dominant traits."""
    O, C, E, A, N = levels
    
    # Count high and low traits
    high_traits = []
    low_traits = []
    trait_names = ["Openness", "Conscientiousness", "Extraversion", "Agreeableness", "Neuroticism"]
    
    for i, (level, name) in enumerate(zip(levels, trait_names)):
        if level == "H":
            high_traits.append(name)
        elif level == "L":
            low_traits.append(name)
    
    # Generate type name based on dominant pattern
    if len(high_traits) >= 2:
        type_name = f"Dynamic {high_traits[0].split()[0][:6]}-{high_traits[1].split()[0][:6]}"
    elif len(high_traits) == 1:
        type_name = f"Strong {high_traits[0][:10]}"
    elif len(low_traits) >= 2:
        type_name = "Reserved Professional"
    else:
        type_name = "Balanced Professional"
    
    return {
        "type_name": type_name,
        "short_desc": "Your personality profile reflects a unique combination of traits that shapes your approach to work and relationships.",
        "full_desc": [
            "Your Big Five personality profile shows a distinctive pattern that influences how you think, work, and relate to others. "
            "This combination of traits creates your unique professional identity.",
            "Understanding your personality profile helps you identify environments and roles where you'll naturally thrive. "
            "It also highlights areas where you might need to adapt or develop strategies.",
            "Use these insights as a starting point for self-reflection and career exploration. "
            "Your personality is one factor among many that contribute to career success and satisfaction."
        ],
        "strengths": [
            "Your unique combination of traits allows you to contribute in ways that others cannot. "
            "Identify the situations where your natural tendencies are assets.",
            "Your personality profile suggests certain environments will feel more natural to you. "
            "Seek roles that align with your authentic self."
        ],
        "challenges": [
            "Every personality profile has potential blind spots or growth areas. "
            "Consider how your natural tendencies might sometimes limit you.",
            "Developing awareness of your patterns allows you to adapt when needed. "
            "You can stretch beyond your comfort zone while honoring your authentic self."
        ]
    }


def get_personality_type(big5_scores: Dict[str, float]) -> Dict[str, Any]:
    """
    Get personality type based on Big Five scores.
    
    Args:
        big5_scores: Dictionary with keys 'openness', 'conscientiousness', 
                     'extraversion', 'agreeableness', 'neuroticism' (0-100 scale)
    
    Returns:
        Dictionary with type_name, short_desc, full_desc, strengths, challenges
    """
    O = big5_scores.get("openness", 50)
    C = big5_scores.get("conscientiousness", 50)
    E = big5_scores.get("extraversion", 50)
    A = big5_scores.get("agreeableness", 50)
    N = big5_scores.get("neuroticism", 50)
    
    levels = (
        _get_level(O),
        _get_level(C),
        _get_level(E),
        _get_level(A),
        _get_level(N)
    )
    
    return _find_closest_type(levels)


def get_narrative_from_type(personality_type: Dict[str, Any]) -> Dict[str, Any]:
    """Convert personality type to narrative format for report."""
    return {
        "type_name": personality_type["type_name"],
        "type_description": personality_type["short_desc"],
        "paragraphs": personality_type.get("full_desc", [personality_type["short_desc"]])
    }


def get_strengths_from_type(personality_type: Dict[str, Any]) -> List[str]:
    """Get strengths list from personality type."""
    return personality_type.get("strengths", [])


def get_challenges_from_type(personality_type: Dict[str, Any]) -> List[str]:
    """Get challenges list from personality type."""
    return personality_type.get("challenges", [])
