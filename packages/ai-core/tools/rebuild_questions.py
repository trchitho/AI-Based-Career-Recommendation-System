"""rebuild_questions.py -- Clean-slate rebuild 288+240"""
import psycopg2, json

DB = "postgresql://postgres:123456@localhost:5433/career_ai?client_encoding=utf8"
RIASEC_OPTS = json.dumps({"options":["Strongly Dislike","Dislike","Unsure","Like","Strongly Like"],"scale":"RIASEC"})
BIG5_OPTS   = json.dumps({"options":["Very Inaccurate","Moderately Inaccurate","Neither Accurate nor Inaccurate","Moderately Accurate","Very Accurate"],"scale":"BigFive"})

RIASEC = {
"R": [
  ("Build kitchen cabinets.",False),("Lay brick or tile.",False),("Repair household appliances.",False),
  ("Assemble electronic parts.",False),("Drive a truck to deliver packages.",False),
  ("Test the quality of parts before shipment.",False),("Repair and install locks.",False),
  ("Set up and operate machines to make products.",False),("Work on an oil rig.",False),
  ("Operate a grinding machine in a factory.",False),("Fix a broken faucet.",False),
  ("Raise fish in a fish hatchery.",False),("Build a brick walkway.",False),
  ("Operate heavy construction equipment.",False),("Install flooring in houses.",False),
  ("Maintain electrical equipment.",False),("Work outdoors in all weather conditions.",False),
  ("Weld metal parts together.",False),("Operate a forklift in a warehouse.",False),
  ("Repair engines on boats.",False),("Build furniture from raw wood.",False),
  ("Operate a lathe to shape metal parts.",False),("Install plumbing fixtures in buildings.",False),
  ("Perform routine maintenance on vehicles.",False),("Assemble mechanical components.",False),
  ("Work with power tools on construction sites.",False),("Inspect machinery for safety compliance.",False),
  ("Repair bicycles and motorcycles.",False),("Install solar panels on rooftops.",False),
  ("Operate a crane at a construction site.",False),("Perform electrical wiring in buildings.",False),
  ("Maintain and repair industrial robots.",False),("Build and repair fences.",False),
  ("Operate a bulldozer or excavator.",False),("Install and repair HVAC systems.",False),
  ("Work in a carpentry workshop.",False),("Repair and maintain farm equipment.",False),
  ("Operate a printing press.",False),("Install and configure computer hardware.",False),
  ("Repair and install irrigation systems.",False),
  ("Avoid working with tools or machinery.",True),("Prefer not to do physical labor.",True),
  ("Dislike working outdoors.",True),("Prefer desk work over manual tasks.",True),
  ("Dislike fixing or repairing things.",True),("Avoid working in workshops or factories.",True),
  ("Prefer not to operate heavy equipment.",True),("Dislike hands-on technical work.",True),
],
"I": [
  ("Conduct biological research.",False),("Study the structure of the human body.",False),
  ("Develop a new medical treatment or procedure.",False),("Conduct chemical experiments.",False),
  ("Study ways to reduce water pollution.",False),("Develop a new computer algorithm.",False),
  ("Analyze data to find patterns.",False),("Investigate the causes of a disease.",False),
  ("Study the history of past civilizations.",False),("Examine blood samples using a microscope.",False),
  ("Develop a theory about how the universe works.",False),("Research new sources of energy.",False),
  ("Investigate a crime scene.",False),("Study the behavior of animals in the wild.",False),
  ("Perform laboratory tests to identify diseases.",False),("Analyze financial data to forecast trends.",False),
  ("Develop a mathematical model for a real-world problem.",False),
  ("Research the psychological effects of social media.",False),
  ("Study climate change and its effects.",False),("Investigate how drugs affect the brain.",False),
  ("Develop software to solve complex problems.",False),
  ("Design experiments to test scientific hypotheses.",False),
  ("Research new materials for engineering applications.",False),
  ("Study the genetic basis of inherited diseases.",False),
  ("Analyze satellite data to study the Earth.",False),
  ("Investigate the origins of the universe.",False),
  ("Develop AI models for medical diagnosis.",False),
  ("Research the impact of diet on human health.",False),
  ("Study the effects of pollution on ecosystems.",False),
  ("Investigate cybersecurity vulnerabilities.",False),
  ("Develop new statistical methods for data analysis.",False),
  ("Research the history and evolution of languages.",False),
  ("Study the economic impact of climate change.",False),
  ("Investigate the neural basis of memory.",False),
  ("Develop new vaccines for infectious diseases.",False),
  ("Research renewable energy technologies.",False),
  ("Study the social behavior of primates.",False),
  ("Analyze archaeological artifacts.",False),
  ("Investigate the physics of black holes.",False),
  ("Study the microbiome and its effects on health.",False),
  ("Avoid tasks that require deep analysis.",True),
  ("Prefer not to read scientific articles.",True),
  ("Dislike working in a laboratory.",True),
  ("Avoid solving complex problems.",True),
  ("Prefer not to conduct research.",True),
  ("Dislike working with data and statistics.",True),
  ("Avoid tasks that require logical reasoning.",True),
  ("Dislike scientific or technical reading.",True),
],
"A": [
  ("Design a logo for a company.",False),("Write a short story or poem.",False),
  ("Compose or arrange music.",False),("Perform in a play or musical.",False),
  ("Create a painting or drawing.",False),("Design the layout of a magazine.",False),
  ("Direct a movie or video.",False),("Design a website with creative visuals.",False),
  ("Photograph people or nature.",False),("Create a sculpture or pottery.",False),
  ("Write scripts for films or TV shows.",False),("Design fashion clothing.",False),
  ("Illustrate a children book.",False),("Create animations or digital art.",False),
  ("Develop a creative advertising campaign.",False),("Design interior spaces for homes or offices.",False),
  ("Write lyrics for songs.",False),("Create a graphic novel or comic strip.",False),
  ("Choreograph a dance performance.",False),("Develop a brand identity for a product.",False),
  ("Edit and produce a podcast.",False),("Design a mobile app interface.",False),
  ("Create visual effects for films.",False),("Write a screenplay for a short film.",False),
  ("Design packaging for consumer products.",False),("Create a mural for a public space.",False),
  ("Develop a video game concept.",False),("Write and illustrate a graphic novel.",False),
  ("Design a typeface or font.",False),("Create a documentary film.",False),
  ("Develop an interactive art installation.",False),("Write a travel blog.",False),
  ("Design a board game.",False),("Create a fashion lookbook.",False),
  ("Produce a music album.",False),("Design a logo animation.",False),
  ("Write a children picture book.",False),("Create a virtual reality experience.",False),
  ("Design an immersive theme park attraction.",False),("Develop a children educational game.",False),
  ("Avoid creative or artistic tasks.",True),("Prefer structured tasks over open-ended ones.",True),
  ("Dislike expressing ideas through art.",True),("Avoid writing or storytelling.",True),
  ("Prefer not to work on design projects.",True),("Dislike performing in front of others.",True),
  ("Avoid tasks that require imagination.",True),("Prefer not to create visual content.",True),
],
"S": [
  ("Teach children how to read.",False),("Help people with personal problems.",False),
  ("Provide first aid to an injured person.",False),("Counsel people with mental health issues.",False),
  ("Organize community volunteer activities.",False),("Work with elderly people in a care home.",False),
  ("Tutor students who are struggling in school.",False),("Assist people with disabilities.",False),
  ("Lead a youth group or club.",False),("Provide career guidance to job seekers.",False),
  ("Work as a school counselor.",False),("Coordinate a health awareness campaign.",False),
  ("Teach adults a new skill.",False),("Support families in crisis situations.",False),
  ("Facilitate group therapy sessions.",False),("Mentor a new employee at work.",False),
  ("Develop educational programs for communities.",False),("Provide emotional support to patients.",False),
  ("Organize fundraising events for charities.",False),("Teach conflict resolution skills.",False),
  ("Work as a social worker in underserved areas.",False),("Provide nutrition counseling.",False),
  ("Teach English as a second language.",False),("Work in a refugee support center.",False),
  ("Develop after-school programs for youth.",False),("Provide life coaching services.",False),
  ("Work as a hospice care volunteer.",False),("Teach mindfulness and stress management.",False),
  ("Support victims of domestic violence.",False),("Work in a community health clinic.",False),
  ("Develop programs for at-risk youth.",False),("Provide financial literacy education.",False),
  ("Work as a special education teacher.",False),("Facilitate peer support groups.",False),
  ("Develop rehabilitation programs for prisoners.",False),("Work as a school nurse.",False),
  ("Provide crisis intervention services.",False),("Teach parenting skills to new parents.",False),
  ("Work as a school librarian.",False),("Develop wellness programs for employees.",False),
  ("Avoid working closely with other people.",True),("Prefer not to help others with their problems.",True),
  ("Dislike teaching or training others.",True),("Avoid caregiving or support roles.",True),
  ("Prefer not to work in social services.",True),("Dislike counseling or advising others.",True),
  ("Avoid community or volunteer work.",True),("Dislike emotionally demanding work.",True),
],
"E": [
  ("Manage a team of employees.",False),("Sell products or services to customers.",False),
  ("Start and run my own business.",False),("Negotiate a business contract.",False),
  ("Give a speech to a large audience.",False),("Develop a marketing strategy.",False),
  ("Lead a project from start to finish.",False),("Persuade others to support my ideas.",False),
  ("Manage a company budget.",False),("Recruit and hire new employees.",False),
  ("Represent a company in public events.",False),("Develop a business plan for a new venture.",False),
  ("Oversee the operations of a department.",False),("Motivate a team to achieve goals.",False),
  ("Identify new business opportunities.",False),("Manage relationships with key clients.",False),
  ("Lead organizational change initiatives.",False),("Pitch a product idea to investors.",False),
  ("Coordinate cross-functional teams.",False),("Evaluate employee performance.",False),
  ("Drive revenue growth for a company.",False),("Develop a franchise business model.",False),
  ("Lead a merger or acquisition process.",False),("Manage a political campaign.",False),
  ("Develop a corporate social responsibility program.",False),("Lead a startup from idea to launch.",False),
  ("Manage a sports team or organization.",False),("Develop a global expansion strategy.",False),
  ("Lead a nonprofit organization.",False),("Manage a media or entertainment company.",False),
  ("Develop a product launch strategy.",False),("Lead a government agency.",False),
  ("Manage an investment portfolio.",False),("Develop a crisis management plan.",False),
  ("Lead a research and development team.",False),("Manage a supply chain operation.",False),
  ("Develop a talent acquisition strategy.",False),("Lead a digital transformation initiative.",False),
  ("Build and manage a high-performing sales team.",False),("Develop a competitive pricing strategy.",False),
  ("Avoid taking on leadership roles.",True),("Prefer not to manage other people.",True),
  ("Dislike making high-stakes decisions.",True),("Avoid public speaking or presentations.",True),
  ("Prefer not to take financial responsibility.",True),("Dislike competitive work environments.",True),
  ("Avoid persuading or influencing others.",True),("Dislike high-pressure sales situations.",True),
],
"C": [
  ("Maintain financial records for a business.",False),("Organize files and documents systematically.",False),
  ("Enter data into a computer database.",False),("Prepare tax returns for individuals.",False),
  ("Proofread and edit written documents.",False),("Schedule appointments and manage calendars.",False),
  ("Audit financial statements for accuracy.",False),("Process payroll for a company.",False),
  ("Manage inventory in a warehouse.",False),("Follow detailed procedures and protocols.",False),
  ("Prepare detailed reports and summaries.",False),("Operate office equipment and software.",False),
  ("Verify the accuracy of financial transactions.",False),("Manage correspondence and communications.",False),
  ("Develop and maintain spreadsheets.",False),("Coordinate logistics and supply chains.",False),
  ("Ensure compliance with regulations.",False),("Manage a company administrative operations.",False),
  ("Reconcile bank statements.",False),("Maintain accurate records of transactions.",False),
  ("Organize and categorize large amounts of data.",False),("Develop standard operating procedures.",False),
  ("Manage a document management system.",False),("Prepare financial forecasts and budgets.",False),
  ("Conduct internal audits for quality control.",False),("Manage a customer database.",False),
  ("Develop and implement data governance policies.",False),("Prepare regulatory compliance reports.",False),
  ("Manage a project timeline and milestones.",False),("Develop a records retention policy.",False),
  ("Coordinate office relocation logistics.",False),("Manage vendor contracts and agreements.",False),
  ("Develop a quality assurance program.",False),("Prepare grant applications and reports.",False),
  ("Manage a library or archive system.",False),("Develop a risk management framework.",False),
  ("Coordinate employee benefits administration.",False),("Manage a billing and invoicing system.",False),
  ("Develop a compliance training program.",False),("Manage a procurement and purchasing process.",False),
  ("Avoid detailed or repetitive tasks.",True),("Prefer not to work with numbers or data.",True),
  ("Dislike following strict rules or procedures.",True),("Avoid administrative or clerical work.",True),
  ("Prefer not to manage records or files.",True),("Dislike working in structured environments.",True),
  ("Avoid tasks that require precision and accuracy.",True),("Dislike routine office work.",True),
],
}

BIG5 = {
"O": [
  ("Have a vivid imagination.",False),("Enjoy hearing new ideas.",False),
  ("Carry the conversation to a higher level.",False),("Enjoy thinking about things.",False),
  ("Have a rich vocabulary.",False),("Spend time reflecting on things.",False),
  ("Am full of ideas.",False),("Enjoy wild flights of fantasy.",False),
  ("Love to read challenging material.",False),("Enjoy examining myself and my life.",False),
  ("Enjoy the beauty of nature.",False),("Am interested in many things.",False),
  ("Like to get lost in thought.",False),("Enjoy different types of art and music.",False),
  ("Prefer variety to routine.",False),("Enjoy exploring new ideas and concepts.",False),
  ("Like to think about complex problems.",False),("Am curious about many different things.",False),
  ("Enjoy learning about art, music, or literature.",False),("Like to imagine creative solutions.",False),
  ("Find abstract thinking stimulating.",False),("Enjoy philosophical debates.",False),
  ("Seek out new experiences regularly.",False),("Appreciate beauty in everyday things.",False),
  ("Like to experiment with new approaches.",False),("Enjoy reading about diverse topics.",False),
  ("Find it easy to think outside the box.",False),("Am open to changing my views.",False),
  ("Enjoy creative writing or storytelling.",False),("Like to explore different cultures.",False),
  ("Find new technologies fascinating.",False),("Enjoy learning new languages.",False),
  ("Like to visit museums and galleries.",False),("Enjoy solving puzzles and brain teasers.",False),
  ("Am fascinated by how things work.",False),("Like to question conventional wisdom.",False),
  ("Enjoy learning about history and philosophy.",False),("Find it exciting to discover new things.",False),
  ("Prefer familiar routines over new experiences.",True),("Avoid situations that require imagination.",True),
  ("Find abstract ideas confusing.",True),("Prefer practical tasks over theoretical ones.",True),
  ("Do not like art.",True),("Avoid philosophical discussions.",True),
  ("Do not enjoy going to art museums.",True),("Rarely look for a deeper meaning in things.",True),
  ("Am not interested in abstract ideas.",True),("Prefer the tried and true over the new.",True),
],
"C": [
  ("Am always prepared.",False),("Pay attention to details.",False),
  ("Get chores done right away.",False),("Carry out my plans.",False),
  ("Make plans and stick to them.",False),("Complete tasks successfully.",False),
  ("Do things according to a plan.",False),("Excel in what I do.",False),
  ("Handle tasks carefully.",False),("Am exacting in my work.",False),
  ("Follow a schedule.",False),("Keep things tidy.",False),
  ("Work hard.",False),("Finish what I start.",False),
  ("Want everything to be just right.",False),("Set high standards for myself and others.",False),
  ("Always complete tasks on time.",False),("Keep my workspace organized.",False),
  ("Set clear goals and work toward them.",False),("Double-check my work for errors.",False),
  ("Follow through on commitments.",False),("Maintain a consistent daily routine.",False),
  ("Plan ahead before starting a project.",False),("Take pride in doing quality work.",False),
  ("Am reliable and dependable.",False),("Prioritize tasks effectively.",False),
  ("Keep track of deadlines carefully.",False),("Am thorough in everything I do.",False),
  ("Strive for excellence in my work.",False),("Manage my time efficiently.",False),
  ("Am disciplined in my habits.",False),("Like to have a place for everything.",False),
  ("Am careful to avoid mistakes.",False),("Like to plan my day in advance.",False),
  ("Am persistent in achieving my goals.",False),("Take my responsibilities seriously.",False),
  ("Like to keep my environment clean and orderly.",False),("Am systematic in my approach to tasks.",False),
  ("Leave my belongings around.",True),("Shirk my duties.",True),
  ("Do just enough work to get by.",True),("Find it difficult to get down to work.",True),
  ("Waste my time.",True),("Do not see things through.",True),
  ("Mess things up.",True),("Often forget to put things back in their proper place.",True),
  ("Tend to be disorganized.",True),("Often start tasks without finishing them.",True),
],
"E": [
  ("Am the life of the party.",False),("Feel comfortable around people.",False),
  ("Start conversations.",False),("Talk to a lot of different people at parties.",False),
  ("Do not mind being the center of attention.",False),("Make friends easily.",False),
  ("Take charge.",False),("Radiate joy.",False),
  ("Am skilled in handling social situations.",False),("Know how to captivate people.",False),
  ("Enjoy being part of a loud crowd.",False),("Show my feelings when I am happy.",False),
  ("Cheer people up.",False),("Enjoy social gatherings.",False),
  ("Laugh a lot.",False),("Express myself easily.",False),
  ("Enjoy meeting new people.",False),("Feel energized by social interactions.",False),
  ("Like being in large groups.",False),("Am talkative and outgoing.",False),
  ("Like to lead group activities.",False),("Am enthusiastic and high-spirited.",False),
  ("Enjoy lively conversations.",False),("Feel at ease when meeting strangers.",False),
  ("Like to share my experiences with others.",False),("Am assertive in expressing my opinions.",False),
  ("Enjoy collaborating with others.",False),("Like to organize social events.",False),
  ("Am comfortable speaking in public.",False),("Enjoy being around people.",False),
  ("Like to introduce people to each other.",False),("Am good at keeping conversations going.",False),
  ("Enjoy team sports and group activities.",False),("Like to be involved in community events.",False),
  ("Do not talk a lot.",True),("Keep in the background.",True),
  ("Have little to say.",True),("Do not like to draw attention to myself.",True),
  ("Find it hard to approach others.",True),("Am quiet around strangers.",True),
  ("Retreat from others.",True),("Prefer to be alone.",True),
  ("Prefer to stay home rather than go out.",True),("Find social events draining.",True),
  ("Feel uncomfortable in large gatherings.",True),("Tend to keep to myself.",True),
  ("Avoid drawing attention to myself.",True),("Find it hard to start conversations.",True),
],
"A": [
  ("Am interested in people.",False),("Sympathize with others feelings.",False),
  ("Have a soft heart.",False),("Take time out for others.",False),
  ("Feel others emotions.",False),("Make people feel at ease.",False),
  ("Am concerned about others.",False),("Love to help others.",False),
  ("Am easy to satisfy.",False),("Respect others.",False),
  ("Accept people as they are.",False),("Believe that others have good intentions.",False),
  ("Try to understand others.",False),("Forgive others easily.",False),
  ("Am kind and gentle to almost everyone.",False),("Enjoy cooperating with others.",False),
  ("Enjoy helping others solve their problems.",False),("Am considerate of others feelings.",False),
  ("Like to cooperate rather than compete.",False),("Am generous with my time and resources.",False),
  ("Try to see things from others perspectives.",False),("Am patient with people who need help.",False),
  ("Enjoy volunteering for community activities.",False),("Am warm and caring toward others.",False),
  ("Try to avoid hurting others feelings.",False),("Am willing to compromise in disagreements.",False),
  ("Show empathy toward people in difficulty.",False),("Am polite and respectful to everyone.",False),
  ("Like to make others feel welcome.",False),("Am supportive of friends and family.",False),
  ("Believe in treating everyone fairly.",False),("Am quick to comfort others in distress.",False),
  ("Like to share what I have with others.",False),("Am attentive to the needs of others.",False),
  ("Feel little concern for others.",True),("Am not really interested in others.",True),
  ("Insult people.",True),("Am indifferent to the feelings of others.",True),
  ("Take advantage of others.",True),("Hold a grudge.",True),
  ("Get back at others.",True),("Suspect hidden motives in others.",True),
  ("Put my own needs before others.",True),("Am critical of others mistakes.",True),
  ("Find it difficult to forgive.",True),("Am blunt even when it hurts others.",True),
  ("Rarely consider how my actions affect others.",True),("Am indifferent to others problems.",True),
],
"N": [
  ("Get stressed out easily.",False),("Worry about things.",False),
  ("Am easily disturbed.",False),("Get upset easily.",False),
  ("Change my mood a lot.",False),("Have frequent mood swings.",False),
  ("Get irritated easily.",False),("Often feel blue.",False),
  ("Panic easily.",False),("Am filled with doubts about things.",False),
  ("Feel threatened easily.",False),("Fear for the worst.",False),
  ("Am afraid of many things.",False),("Get overwhelmed by emotions.",False),
  ("Feel desperate when things go wrong.",False),("Take things too personally.",False),
  ("Feel anxious in uncertain situations.",False),("Get nervous before important events.",False),
  ("Am sensitive to criticism.",False),("Feel insecure about my abilities.",False),
  ("Feel tense in challenging situations.",False),("Dwell on negative thoughts.",False),
  ("Am prone to self-doubt.",False),("Feel restless and unable to relax.",False),
  ("Am relaxed most of the time.",True),("Seldom feel blue.",True),
  ("Am not easily bothered by things.",True),("Rarely get irritated.",True),
  ("Keep my emotions under control.",True),("Am able to control my cravings.",True),
  ("Remain calm under pressure.",True),("Recover quickly from setbacks.",True),
  ("Stay calm under pressure.",True),("Rarely feel anxious or worried.",True),
  ("Handle stress well.",True),("Am emotionally stable.",True),
  ("Feel confident in difficult situations.",True),("Maintain a positive outlook.",True),
  ("Am not easily disturbed by events.",True),("Feel secure and self-assured.",True),
  ("Rarely worry about the future.",True),("Am resilient in the face of adversity.",True),
  ("Feel at peace with myself.",True),("Am not prone to anxiety.",True),
  ("Bounce back quickly from difficulties.",True),("Feel content most of the time.",True),
  ("Feel emotionally balanced.",True),("Am not easily overwhelmed.",True),
],
}


def rebuild():
    conn = psycopg2.connect(DB)
    conn.autocommit = False
    cur = conn.cursor()

    # Validate data truoc khi insert
    for trait, items in RIASEC.items():
        assert len(items) == 48, f"RIASEC.{trait} has {len(items)} items, expected 48"
    for trait, items in BIG5.items():
        assert len(items) == 48, f"BIG5.{trait} has {len(items)} items, expected 48"
    print("[0] Data validation passed: all traits have exactly 48 items")

    print("[1] Drop constraints...")
    cur.execute("ALTER TABLE core.assessment_questions DROP CONSTRAINT IF EXISTS uq_assessment_questions_form_no")
    cur.execute("ALTER TABLE core.assessment_questions DROP CONSTRAINT IF EXISTS assessment_questions_form_id_fkey")

    print("[2] Delete ALL existing questions for form 1 and 2...")
    cur.execute("DELETE FROM core.assessment_questions WHERE form_id IN (1,2)")
    print(f"    Deleted {cur.rowcount} rows")

    print("[3] Insert RIASEC 288 items (6 traits x 48)...")
    q_no = 1
    for trait in ["R","I","A","S","E","C"]:
        for local_no, (prompt, rev) in enumerate(RIASEC[trait], start=1):
            cur.execute(
                "INSERT INTO core.assessment_questions (form_id,question_no,question_key,prompt,options_json,reverse_score,created_at) VALUES (1,%s,%s,%s,%s,%s,NOW())",
                (q_no, f"{trait}{local_no}", prompt, RIASEC_OPTS, rev)
            )
            q_no += 1
    print(f"    Inserted {q_no-1} RIASEC rows")

    print("[4] Insert BIG5 240 items (5 traits x 48)...")
    q_no = 1
    for trait in ["O","C","E","A","N"]:
        for local_no, (prompt, rev) in enumerate(BIG5[trait], start=1):
            cur.execute(
                "INSERT INTO core.assessment_questions (form_id,question_no,question_key,prompt,options_json,reverse_score,created_at) VALUES (2,%s,%s,%s,%s,%s,NOW())",
                (q_no, f"{trait}{local_no}", prompt, BIG5_OPTS, rev)
            )
            q_no += 1
    print(f"    Inserted {q_no-1} BIG5 rows")

    print("[5] Update assessment_forms...")
    cur.execute("UPDATE core.assessment_forms SET code='RIASEC288', title='RIASEC Career Interest Test (288 items)', version='3.0' WHERE id=1")
    cur.execute("UPDATE core.assessment_forms SET code='BIG5_240',  title='Big Five Personality Test (240 items)',   version='3.0' WHERE id=2")

    print("[6] Recreate constraints...")
    cur.execute("ALTER TABLE core.assessment_questions ADD CONSTRAINT uq_assessment_questions_form_no UNIQUE (form_id, question_no)")
    cur.execute("""
        ALTER TABLE core.assessment_questions
        ADD CONSTRAINT assessment_questions_form_id_fkey
        FOREIGN KEY (form_id) REFERENCES core.assessment_forms(id)
        ON UPDATE NO ACTION ON DELETE CASCADE
    """)

    conn.commit()
    print("[7] Committed.\n")

    # VERIFICATION
    errors = []
    print("="*60)
    print("VERIFICATION")
    print("="*60)

    cur.execute("SELECT id,code,title,version FROM core.assessment_forms ORDER BY id")
    for r in cur.fetchall():
        print(f"  id={r[0]}  code={r[1]}  ver={r[3]}  title={r[2]}")

    for form_id, trait_order, fname in [(1,["R","I","A","S","E","C"],"RIASEC"),(2,["O","C","E","A","N"],"BIG5")]:
        print(f"\n  {fname} trait distribution:")
        for trait in trait_order:
            cur.execute("""
                SELECT COUNT(*), SUM(CASE WHEN reverse_score THEN 1 ELSE 0 END),
                       MIN(question_key), MAX(question_key), MIN(question_no), MAX(question_no)
                FROM core.assessment_questions
                WHERE form_id=%s AND LEFT(question_key,1)=%s
            """, (form_id, trait))
            cnt,rev,kmin,kmax,nmin,nmax = cur.fetchone()
            rev = rev or 0
            tag = "OK" if cnt==48 else f"ERR(expected 48, got {cnt})"
            print(f"    {trait}: {cnt} items, {rev} rev | key {kmin}-{kmax} | q_no {nmin}-{nmax} [{tag}]")
            if cnt != 48: errors.append(f"{fname}.{trait}: {cnt} items")

        cur.execute("SELECT COUNT(*),MIN(question_no),MAX(question_no) FROM core.assessment_questions WHERE form_id=%s",(form_id,))
        total,mn,mx = cur.fetchone()
        print(f"  {fname} total={total} q_no={mn}-{mx}")
        if mn!=1:     errors.append(f"{fname} q_no min={mn}")
        if mx!=total: errors.append(f"{fname} q_no max={mx}!={total}")

    # NULL check
    for col in ["form_id","question_no","question_key","prompt","options_json","reverse_score"]:
        cur.execute(f"SELECT COUNT(*) FROM core.assessment_questions WHERE {col} IS NULL")
        n = cur.fetchone()[0]
        if n>0: errors.append(f"NULL in {col}: {n} rows")

    # Dup checks
    cur.execute("SELECT COUNT(*) FROM (SELECT form_id,question_key FROM core.assessment_questions GROUP BY form_id,question_key HAVING COUNT(*)>1) t")
    n = cur.fetchone()[0]
    if n>0: errors.append(f"Duplicate question_key: {n}")
    else: print("\n  No duplicate question_key [OK]")

    cur.execute("SELECT COUNT(*) FROM (SELECT form_id,prompt FROM core.assessment_questions GROUP BY form_id,prompt HAVING COUNT(*)>1) t")
    n = cur.fetchone()[0]
    if n>0: errors.append(f"Duplicate prompt: {n}")
    else: print("  No duplicate prompt [OK]")

    # Spot check
    cur.execute("SELECT COUNT(*) FROM core.assessment_questions WHERE prompt='Build kitchen cabinets.'")
    n = cur.fetchone()[0]
    if n!=1: errors.append(f"'Build kitchen cabinets.' = {n} rows")
    else: print("  'Build kitchen cabinets.' = 1 row [OK]")

    # First 5 rows each form
    print("\n  First 5 rows form_id=1:")
    cur.execute("SELECT question_no,question_key,LEFT(prompt,45) FROM core.assessment_questions WHERE form_id=1 ORDER BY question_no LIMIT 5")
    for r in cur.fetchall(): print(f"    no={r[0]} key={r[1]} prompt={r[2]}")

    print("  First 5 rows form_id=2:")
    cur.execute("SELECT question_no,question_key,LEFT(prompt,45) FROM core.assessment_questions WHERE form_id=2 ORDER BY question_no LIMIT 5")
    for r in cur.fetchall(): print(f"    no={r[0]} key={r[1]} prompt={r[2]}")

    print(f"\n  ERRORS: {len(errors)}")
    for e in errors: print(f"    x {e}")
    if not errors: print("  ALL OK - READY TO DELIVER")

    cur.close()
    conn.close()


if __name__ == "__main__":
    rebuild()
