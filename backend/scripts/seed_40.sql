-- Seeds 40 companies (verified), 40 jobs (active, one per company, across genuinely varied
-- industries and skillsets), and 40 partnership ideas (approved, one per company). All company
-- names are fictional — no real company's name, logo, or copied job listing is used anywhere in
-- this file (see backend/scripts/ discussion history for why: attributing invented listings to
-- real, named companies would falsely imply those companies are hiring through this platform).
-- Every generated row's id is recorded in seed_manifest_40 so delete_seed_40.sql can remove exactly
-- these rows and nothing else. Password for every seeded account: SeedPass123! (bcrypt hash
-- below was generated with the app's own BCryptPasswordEncoder, cost 10 — same hash seed_20.sql
-- uses, so both scripts document the same login password).
--
-- Distinct email/phone prefixes (seed40. / 81... instead of seed. / 80...) from seed_20.sql so
-- both can be loaded at the same time without a unique-constraint collision on (email, role).

BEGIN;

CREATE TABLE IF NOT EXISTS seed_manifest_40 (
    entity_type text NOT NULL,
    entity_id uuid NOT NULL
);

-- ============================== Companies (verified) ==============================
WITH company_raw (n, company_name, industry, address) AS (
    VALUES
    (1,  'Ledgerly Financial Technologies', 'Fintech',              'Bengaluru, Karnataka'),
    (2,  'Careline Health Systems',         'Healthcare',           'Mumbai, Maharashtra'),
    (3,  'Lernova Learning Labs',           'Education',            'Delhi, NCR'),
    (4,  'Suncrest Renewable Energy',       'Clean Energy',         'Hyderabad, Telangana'),
    (5,  'Routewise Supply Chain',          'Logistics',            'Chennai, Tamil Nadu'),
    (6,  'Marketloop Commerce',             'E-commerce',           'Pune, Maharashtra'),
    (7,  'Forgeline Industrial Systems',    'Manufacturing',        'Kolkata, West Bengal'),
    (8,  'Framecraft Studios',              'Media & Entertainment','Ahmedabad, Gujarat'),
    (9,  'Pixel Forge Games',               'Gaming',               'Gurgaon, Haryana'),
    (10, 'Genavya Biosciences',             'Biotechnology',        'Noida, Uttar Pradesh'),
    (11, 'Homegrid Realty Technologies',    'Real Estate Tech',     'Jaipur, Rajasthan'),
    (12, 'Harvestlink Agritech',            'Agriculture',          'Kochi, Kerala'),
    (13, 'Cipherwall Security',             'Cybersecurity',        'Chandigarh, Punjab'),
    (14, 'Waypoint Travel Technologies',    'Travel & Hospitality', 'Indore, Madhya Pradesh'),
    (15, 'Peoplestack HR Solutions',        'HR Technology',        'Coimbatore, Tamil Nadu'),
    (16, 'Statute Legal Technologies',      'Legal Technology',     'Lucknow, Uttar Pradesh'),
    (17, 'Assurly Insurance Technologies',  'Insurance',            'Bhopal, Madhya Pradesh'),
    (18, 'Freshcart Food Technologies',     'Food & Beverage',      'Nagpur, Maharashtra'),
    (19, 'Voltrun Mobility',                'Automotive & EV',      'Surat, Gujarat'),
    (20, 'Orbitrail Aerospace',             'Aerospace',            'Vadodara, Gujarat'),
    (21, 'Signalbridge Telecom',            'Telecommunications',   'Bengaluru, Karnataka'),
    (22, 'Buildpath Construction Tech',     'Construction Tech',    'Mumbai, Maharashtra'),
    (23, 'Adloom Marketing Technologies',   'Marketing Technology', 'Delhi, NCR'),
    (24, 'Playfield Sports Analytics',      'Sports Technology',    'Hyderabad, Telangana'),
    (25, 'Upliftly Social Ventures',        'Social Impact',        'Chennai, Tamil Nadu'),
    (26, 'Stackline Cloud Infrastructure',  'Cloud Infrastructure', 'Pune, Maharashtra'),
    (27, 'Cognivia AI Labs',                'Artificial Intelligence','Kolkata, West Bengal'),
    (28, 'Automata Robotics',               'Robotics',             'Ahmedabad, Gujarat'),
    (29, 'Waveform Music Technologies',     'Music Technology',     'Gurgaon, Haryana'),
    (30, 'Threadline Fashion Technologies', 'Fashion Technology',   'Noida, Uttar Pradesh'),
    (31, 'Aquanet Utilities Technologies',  'Utilities',            'Jaipur, Rajasthan'),
    (32, 'Oreline Mining Technologies',     'Mining',               'Kochi, Kerala'),
    (33, 'Skyfare Aviation Services',       'Aviation',             'Chandigarh, Punjab'),
    (34, 'Portwell Maritime Logistics',     'Maritime & Shipping',  'Indore, Madhya Pradesh'),
    (35, 'Vitalcore Wellness Technologies', 'Health & Fitness',     'Coimbatore, Tamil Nadu'),
    (36, 'Pawtrack Pet Technologies',       'Pet Technology',       'Lucknow, Uttar Pradesh'),
    (37, 'Caregiven Eldercare Technologies','Elder Care',           'Bhopal, Madhya Pradesh'),
    (38, 'Civitrack Governance Technologies','GovTech',             'Nagpur, Maharashtra'),
    (39, 'Heliopanel Energy Manufacturing', 'Solar Manufacturing',  'Surat, Gujarat'),
    (40, 'Datavantage Analytics',           'Data & Analytics',     'Vadodara, Gujarat')
),
company_seed AS (
    SELECT gen_random_uuid() AS user_id, gen_random_uuid() AS profile_id,
           n, company_name, industry, address,
           '81000000' || lpad(n::text, 2, '0') AS contact_number
    FROM company_raw
),
inserted_company_users AS (
    INSERT INTO users (id, email, password_hash, full_name, role, account_status, created_at, updated_at)
    SELECT
        user_id,
        'seed40.company.' || lpad(n::text, 2, '0') || '@example.com',
        '$2a$10$YpHnNDbUbZ1bNUFnieLbeOQxr85pPtgNxaZ94QGzl91uVMmfGfo5a',
        company_name,
        'COMPANY',
        'ACTIVE',
        now(),
        now()
    FROM company_seed
    RETURNING id
),
inserted_company_profiles AS (
    INSERT INTO company_profiles (
        id, user_id, entity_type, cin, gstin, pan, industry, address, signatory_name,
        contact_number, verification_status, created_at, updated_at)
    SELECT
        profile_id, user_id, 'Private Limited',
        'CIN4' || lpad(n::text, 7, '0'), 'GSTIN4' || lpad(n::text, 7, '0'), 'PAN4' || lpad(n::text, 6, '0'),
        industry, address, company_name || ' Signatory', contact_number,
        'VERIFIED', now(), now()
    FROM company_seed
    RETURNING id
)
INSERT INTO seed_manifest_40 (entity_type, entity_id)
SELECT 'company_user', id FROM inserted_company_users
UNION ALL
SELECT 'company_profile', id FROM inserted_company_profiles;

-- ============================== Jobs (active, one per seeded company) ==============================
WITH job_raw (n, title, employment_type, experience_level, work_mode, location, salary_min, salary_max, about_role, responsibilities, requirements, skills) AS (
    VALUES
    (1, 'Backend Engineer, Payments', 'FULL_TIME', 'ENTRY_LEVEL', 'REMOTE', 'Bengaluru', 6, 11,
     'Ledgerly Financial Technologies builds the ledger and settlement infrastructure banks and NBFCs use to reconcile digital payments in real time. We''re hiring a Backend Engineer to help build and harden the transaction-processing services at the core of that ledger.',
     ARRAY['Build and maintain APIs that process thousands of transactions per minute','Write reconciliation jobs that catch and flag settlement mismatches','Participate in on-call rotation for payment-critical services','Add test coverage for edge cases in currency rounding and idempotency'],
     ARRAY['1+ years of backend development experience, Java or Kotlin preferred','Basic understanding of relational databases and transactions','Comfort reading and reasoning about financial data','Eagerness to learn how real-time settlement systems work'],
     ARRAY['Java', 'PostgreSQL', 'REST APIs', 'Spring Boot', 'Distributed Systems']),

    (2, 'Product Designer', 'FULL_TIME', 'MID_LEVEL', 'HYBRID', 'Mumbai', 9, 16,
     'Careline Health Systems builds appointment and records software used by over 400 outpatient clinics across India. We''re looking for a Product Designer to improve how doctors and front-desk staff use the platform day to day.',
     ARRAY['Design workflows for clinic staff who are often mid-task and short on time','Run usability sessions directly inside partner clinics','Maintain and extend our design system across web and tablet','Partner with support to turn recurring complaints into design fixes'],
     ARRAY['3+ years of product design experience, healthcare or enterprise software a plus','A portfolio showing real usability problem-solving, not just visuals','Comfort designing for time-pressured, non-technical users','Proficiency in Figma'],
     ARRAY['Figma', 'User Research', 'Design Systems', 'Prototyping', 'Accessibility']),

    (3, 'Curriculum Content Lead', 'FULL_TIME', 'SENIOR', 'ON_SITE', 'Delhi', 14, 24,
     'Lernova Learning Labs builds exam-prep courses for state-board and competitive exams, taught in regional languages. We''re hiring a Curriculum Content Lead to own quality and pedagogy across our science and math course lines.',
     ARRAY['Set the curriculum structure and learning outcomes for each course','Review and approve content written by a team of subject-matter writers','Analyze student performance data to find where courses under-teach','Coordinate translation and localization across five languages'],
     ARRAY['5+ years in curriculum design or academic content leadership','Deep familiarity with at least one state board or competitive exam syllabus','Experience managing a team of content writers','Comfort using data to guide content decisions'],
     ARRAY['Curriculum Design', 'Team Leadership', 'Academic Content', 'Instructional Design', 'Learning Assessment']),

    (4, 'Electrical Design Engineer', 'FULL_TIME', 'LEADERSHIP', 'ON_SITE', 'Hyderabad', 26, 42,
     'Suncrest Renewable Energy designs and installs rooftop and utility-scale solar systems across South India. We''re hiring a Head of Electrical Design to lead the engineering team responsible for every system we deploy.',
     ARRAY['Own electrical design standards across residential and utility-scale projects','Lead and grow a team of design engineers across three regional offices','Sign off on system designs before they go to installation crews','Represent engineering in conversations with utility and regulatory bodies'],
     ARRAY['8+ years of electrical design experience, solar or power systems required','Prior experience leading an engineering team','Deep familiarity with Indian grid interconnection standards','Professional engineering credentials preferred'],
     ARRAY['Solar PV Design', 'Team Leadership', 'Grid Compliance', 'AutoCAD Electrical', 'Load Calculations']),

    (5, 'Fleet Operations Manager', 'FULL_TIME', 'ENTRY_LEVEL', 'REMOTE', 'Chennai', 5, 9,
     'Routewise Supply Chain operates a technology-driven freight network connecting manufacturers to retailers across Tamil Nadu and Karnataka. We''re looking for a Fleet Operations Manager to help keep our delivery routes running on time.',
     ARRAY['Monitor live fleet dashboards and flag delayed or off-route deliveries','Coordinate directly with drivers to resolve issues as they come up','Maintain accurate records of delivery timelines and exceptions','Support the operations team during peak shipping periods'],
     ARRAY['1+ years of experience in logistics, dispatch, or operations','Comfort working with dashboards and spreadsheets under time pressure','Clear, calm communication style on the phone','Willingness to work occasional evening shifts during peak periods'],
     ARRAY['Logistics Coordination', 'Excel', 'Dispatch Software', 'Route Optimization', 'GPS Tracking Systems']),

    (6, 'Growth Marketing Manager', 'FULL_TIME', 'MID_LEVEL', 'HYBRID', 'Pune', 10, 18,
     'Marketloop Commerce runs an online marketplace connecting small D2C brands with customers across tier-2 and tier-3 cities. We''re hiring a Growth Marketing Manager to scale acquisition without blowing up our ad spend.',
     ARRAY['Own paid acquisition strategy across search, social, and marketplace ads','Run structured A/B tests on landing pages and checkout flow','Build and monitor cohort-level LTV and CAC dashboards','Manage a small team of performance marketing specialists'],
     ARRAY['3+ years of growth or performance marketing experience','Hands-on experience managing a real ad budget, not just reporting on one','Strong analytical skills and comfort in spreadsheets or SQL','E-commerce experience preferred'],
     ARRAY['Performance Marketing', 'Google Analytics', 'A/B Testing', 'SQL', 'Facebook Ads Manager']),

    (7, 'Embedded Systems Engineer', 'FULL_TIME', 'SENIOR', 'ON_SITE', 'Kolkata', 16, 28,
     'Forgeline Industrial Systems builds sensor and control hardware for mid-size manufacturing plants. We''re hiring a Senior Embedded Systems Engineer to lead firmware development for our next generation of factory-floor sensors.',
     ARRAY['Design and write firmware for low-power industrial sensor hardware','Debug field issues reported from live factory deployments','Mentor two junior firmware engineers on the team','Work directly with hardware engineers on board bring-up'],
     ARRAY['5+ years of embedded C/C++ experience on real hardware','Experience debugging issues in the field, not just on a bench','Familiarity with industrial communication protocols (Modbus, CAN, or similar)','Comfort working closely with hardware engineering'],
     ARRAY['Embedded C', 'RTOS', 'Industrial Protocols', 'PCB Debugging', 'Git']),

    (8, 'Video Editor', 'CONTRACT', 'ENTRY_LEVEL', 'REMOTE', 'Ahmedabad', 4, 7,
     'Framecraft Studios produces short-form video content for brands and streaming platforms. We''re looking for a Video Editor on a project basis to help us keep up with a growing content calendar.',
     ARRAY['Edit raw footage into polished short-form videos on tight deadlines','Add motion graphics, captions, and sound design to finished cuts','Organize and archive project files for easy handoff between editors','Take feedback from creative leads and turn around revisions quickly'],
     ARRAY['1+ years of video editing experience, a reel is required','Proficiency in Premiere Pro or DaVinci Resolve','Comfort working against deadlines without close supervision','Basic motion graphics skills a plus'],
     ARRAY['Premiere Pro', 'DaVinci Resolve', 'Motion Graphics', 'Color Grading', 'Sound Design']),

    (9, 'Game Backend Developer', 'FULL_TIME', 'MID_LEVEL', 'REMOTE', 'Gurgaon', 11, 20,
     'Pixel Forge Games builds mobile multiplayer games with millions of monthly active players. We''re hiring a Backend Developer to help scale the matchmaking and leaderboard services behind our flagship title.',
     ARRAY['Build and scale matchmaking services handling high concurrent load','Design leaderboard and progression systems that stay fair under load','Investigate and fix live production issues affecting real players','Work closely with game designers to translate mechanics into services'],
     ARRAY['3+ years of backend development, ideally on a live real-time service','Experience with low-latency systems or game backends a strong plus','Comfort with distributed systems and caching strategies','Genuine interest in games, not just backend work in general'],
     ARRAY['Go', 'Redis', 'WebSockets', 'Docker', 'Load Testing']),

    (10, 'Research Associate', 'FULL_TIME', 'ENTRY_LEVEL', 'ON_SITE', 'Noida', 5, 8,
     'Genavya Biosciences researches diagnostic tools for early detection of chronic disease. We''re hiring a Research Associate to support our wet-lab team on active diagnostic assay projects.',
     ARRAY['Run assay experiments following established lab protocols','Maintain accurate, audit-ready lab notebooks for every experiment','Prepare samples and reagents ahead of scheduled experiments','Support senior scientists in troubleshooting failed runs'],
     ARRAY['Bachelor''s or Master''s degree in life sciences, biotechnology, or related field','Hands-on wet-lab experience from coursework or internships','Meticulous attention to documentation and protocol','Comfort working in a regulated lab environment'],
     ARRAY['Lab Techniques', 'Assay Development', 'Documentation', 'PCR', 'Data Recording']),

    (11, 'Full Stack Developer', 'FULL_TIME', 'MID_LEVEL', 'HYBRID', 'Jaipur', 10, 17,
     'Homegrid Realty Technologies runs a property search and virtual-tour platform used by brokers across North India. We''re hiring a Full Stack Developer to build features across our listings and tour products.',
     ARRAY['Build features spanning our React frontend and Node.js backend','Optimize page load performance for listing pages with heavy media','Integrate third-party mapping and virtual-tour APIs','Fix bugs reported directly by broker partners using the platform'],
     ARRAY['3+ years of full stack development experience','Proficiency in React and Node.js or a comparable combination','Experience optimizing for real-world performance, not just local dev','Comfort working directly with non-technical stakeholders'],
     ARRAY['React', 'Node.js', 'PostgreSQL', 'TypeScript', 'REST APIs']),

    (12, 'IoT Product Manager', 'FULL_TIME', 'SENIOR', 'HYBRID', 'Kochi', 18, 30,
     'Harvestlink Agritech builds soil-sensor hardware and irrigation-scheduling software for mid-size farms. We''re hiring a Senior Product Manager to own the roadmap for our IoT sensor line.',
     ARRAY['Define the product roadmap for our next-generation soil sensors','Run field visits with farmers to validate assumptions before building','Coordinate closely with hardware, firmware, and app teams','Own pricing and packaging decisions for the sensor product line'],
     ARRAY['5+ years of product management experience, hardware or IoT preferred','Comfort spending real time in the field with end users','Experience coordinating across hardware and software teams','Strong written and verbal communication skills'],
     ARRAY['Product Strategy', 'IoT', 'Stakeholder Management', 'Agile', 'Roadmapping']),

    (13, 'Security Analyst', 'FULL_TIME', 'ENTRY_LEVEL', 'ON_SITE', 'Chandigarh', 6, 10,
     'Cipherwall Security provides managed threat-monitoring services to mid-size enterprises. We''re hiring a Security Analyst to join our 24x7 security operations center.',
     ARRAY['Monitor security alerts across client environments in real time','Triage and escalate confirmed incidents following runbooks','Document findings clearly for both technical and non-technical clients','Assist senior analysts during active incident response'],
     ARRAY['1+ years of experience in a SOC, helpdesk, or IT security role','Foundational knowledge of networking and common attack patterns','Comfort working rotating shifts, including some nights and weekends','A security certification (Security+ or similar) is a plus, not required'],
     ARRAY['SIEM Tools', 'Incident Response', 'Networking Fundamentals', 'Threat Intelligence', 'Log Analysis']),

    (14, 'Backend Engineer', 'FULL_TIME', 'MID_LEVEL', 'REMOTE', 'Indore', 10, 18,
     'Waypoint Travel Technologies builds booking and itinerary software for travel agencies across India. We''re hiring a Backend Engineer to help scale our booking engine ahead of peak travel season.',
     ARRAY['Design and maintain APIs powering flight, hotel, and package bookings','Integrate with third-party GDS and hotel inventory providers','Optimize booking-flow latency during high-traffic periods','Write and maintain integration tests for booking edge cases'],
     ARRAY['3+ years of backend development experience','Experience integrating third-party APIs with inconsistent documentation','Strong understanding of relational databases','Comfort working with a distributed, partly remote team'],
     ARRAY['Python', 'Django', 'PostgreSQL', 'API Integration', 'Redis']),

    (15, 'Customer Success Manager', 'PART_TIME', 'ENTRY_LEVEL', 'REMOTE', 'Coimbatore', 3, 5,
     'Peoplestack HR Solutions builds payroll and compliance software for small businesses. We''re hiring a part-time Customer Success Manager to support our growing base of small-business customers.',
     ARRAY['Onboard new small-business customers onto the payroll platform','Answer support tickets related to payroll and compliance questions','Flag recurring customer issues to the product team','Maintain accurate records of customer interactions in our CRM'],
     ARRAY['1+ years of customer-facing experience, SaaS support a plus','Comfort explaining payroll or compliance concepts in plain language','Reliable availability for at least 20 hours a week','Patience with first-time small-business software users'],
     ARRAY['Customer Support', 'CRM Tools', 'Payroll Basics', 'Zendesk', 'Onboarding']),

    (16, 'Legal Operations Analyst', 'FULL_TIME', 'MID_LEVEL', 'ON_SITE', 'Lucknow', 9, 15,
     'Statute Legal Technologies builds contract review and compliance-tracking software for corporate legal teams. We''re hiring a Legal Operations Analyst to help our clients get the most out of the platform.',
     ARRAY['Configure contract templates and approval workflows for new clients','Analyze usage data to identify where clients are stuck in the product','Support the product team with legal-domain context on new features','Run quarterly reviews with client legal teams'],
     ARRAY['2+ years of experience in legal operations, paralegal work, or legal tech','Comfort reading and summarizing contract language','Strong attention to detail and process orientation','Bachelor''s degree required; legal background preferred'],
     ARRAY['Contract Management', 'Legal Operations', 'Process Design', 'Excel', 'Compliance Tracking']),

    (17, 'Data Analyst', 'FULL_TIME', 'ENTRY_LEVEL', 'HYBRID', 'Bhopal', 5, 9,
     'Assurly Insurance Technologies builds underwriting and claims software for regional insurers. We''re hiring a Data Analyst to help our underwriting team make faster, better-informed decisions.',
     ARRAY['Build dashboards tracking claims trends and underwriting performance','Clean and validate incoming policy and claims data','Support actuaries with ad hoc data pulls and analysis','Document data definitions so reports stay consistent over time'],
     ARRAY['1+ years of experience in a data or analyst role','Strong SQL skills and comfort with a BI tool such as Power BI','Insurance or financial services exposure a plus, not required','Careful, detail-oriented approach to data validation'],
     ARRAY['SQL', 'Power BI', 'Data Validation', 'Excel', 'Statistical Analysis']),

    (18, 'Supply Chain Analyst', 'FULL_TIME', 'MID_LEVEL', 'ON_SITE', 'Nagpur', 8, 14,
     'Freshcart Food Technologies operates a cold-chain grocery delivery network across central India. We''re hiring a Supply Chain Analyst to help us reduce spoilage and improve delivery reliability.',
     ARRAY['Analyze spoilage and delivery-delay data across warehouse regions','Recommend inventory and routing adjustments based on findings','Coordinate with warehouse managers to implement process changes','Track the impact of changes against baseline metrics'],
     ARRAY['2+ years of supply chain or operations analyst experience','Strong Excel or SQL skills','Cold-chain or perishable-goods experience a plus','Comfort working cross-functionally with warehouse operations'],
     ARRAY['Supply Chain Analysis', 'Excel', 'Inventory Planning', 'Demand Forecasting', 'SQL']),

    (19, 'Battery Systems Engineer', 'FULL_TIME', 'SENIOR', 'ON_SITE', 'Surat', 20, 34,
     'Voltrun Mobility designs battery packs and management systems for electric two- and three-wheelers. We''re hiring a Senior Battery Systems Engineer to lead thermal and safety design on our next platform.',
     ARRAY['Lead thermal and safety design for next-generation battery packs','Run and interpret abuse and durability testing on prototype packs','Work with suppliers on cell sourcing and qualification','Mentor junior engineers on the battery systems team'],
     ARRAY['5+ years of battery pack or energy storage design experience','Deep understanding of lithium-ion cell chemistry and safety standards','Experience taking a design from prototype through certification','Comfort working directly with cell and component suppliers'],
     ARRAY['Battery Management Systems', 'Thermal Design', 'Safety Testing', 'MATLAB/Simulink', 'Cell Chemistry']),

    (20, 'Mechanical Design Engineer', 'FULL_TIME', 'LEADERSHIP', 'ON_SITE', 'Vadodara', 30, 50,
     'Orbitrail Aerospace designs structural components for small satellite launch systems. We''re hiring a Head of Mechanical Design to lead structural engineering across our launch vehicle program.',
     ARRAY['Own structural design and analysis across the launch vehicle program','Lead a team of mechanical engineers through design reviews','Interface directly with manufacturing on tolerancing and materials','Represent mechanical engineering in program-level design decisions'],
     ARRAY['10+ years of structural or mechanical design experience, aerospace required','Prior experience leading an engineering team through a hardware program','Deep familiarity with FEA tools and aerospace materials','Comfort operating under strict weight and safety margins'],
     ARRAY['Structural Analysis', 'FEA', 'Team Leadership', 'CATIA', 'GD&T']),

    (21, 'Network Engineer', 'FULL_TIME', 'MID_LEVEL', 'ON_SITE', 'Bengaluru', 10, 17,
     'Signalbridge Telecom operates regional fiber and wireless backhaul networks. We''re hiring a Network Engineer to help maintain and expand our core network infrastructure.',
     ARRAY['Monitor core network health and respond to outages','Plan and execute capacity upgrades ahead of demand growth','Configure and maintain routing and switching infrastructure','Document network topology changes as they happen'],
     ARRAY['3+ years of network engineering experience','Strong understanding of routing protocols (BGP, OSPF)','Experience with both wired and wireless backhaul a plus','Comfort with on-call rotation for network incidents'],
     ARRAY['BGP', 'Network Monitoring', 'Fiber Infrastructure', 'OSPF', 'Cisco IOS']),

    (22, 'Site Operations Manager', 'FULL_TIME', 'SENIOR', 'ON_SITE', 'Mumbai', 15, 26,
     'Buildpath Construction Technologies builds project-management software used directly on construction sites. We''re hiring a Site Operations Manager to lead deployment and support at active project sites.',
     ARRAY['Oversee platform rollout and adoption across active construction sites','Train site supervisors and crews on daily platform use','Resolve on-site technical issues quickly to avoid work stoppages','Report site-level usage and issues back to the product team'],
     ARRAY['5+ years of experience in construction operations or site management','Comfort spending significant time on active job sites','Experience rolling out new tools or processes to field teams','Strong problem-solving skills under real-world constraints'],
     ARRAY['Site Operations', 'Change Management', 'Construction Tech', 'Team Training', 'Field Reporting']),

    (23, 'Marketing Automation Specialist', 'FULL_TIME', 'MID_LEVEL', 'REMOTE', 'Delhi', 9, 16,
     'Adloom Marketing Technologies builds campaign automation software for mid-size marketing teams. We''re hiring a Marketing Automation Specialist to help our clients get more value from the platform.',
     ARRAY['Build and troubleshoot automated email and campaign workflows for clients','Train new clients on platform best practices during onboarding','Identify opportunities to simplify complex client workflows','Collaborate with support on recurring technical issues'],
     ARRAY['2+ years of experience with a marketing automation platform','Comfort working directly with client marketing teams','Basic HTML/CSS for email template troubleshooting','Strong written communication skills'],
     ARRAY['Marketing Automation', 'Email Campaigns', 'HTML/CSS', 'HubSpot', 'Audience Segmentation']),

    (24, 'Data Scientist', 'FULL_TIME', 'SENIOR', 'HYBRID', 'Hyderabad', 18, 30,
     'Playfield Sports Analytics builds performance-tracking software for professional cricket and football academies. We''re hiring a Senior Data Scientist to build models that turn raw match data into coaching insight.',
     ARRAY['Build models that translate raw tracking data into player insights','Work directly with coaches to validate model outputs against intuition','Own the full pipeline from raw sensor data to dashboard-ready metrics','Mentor a junior data analyst on the team'],
     ARRAY['5+ years of data science experience, sports analytics a strong plus','Strong Python and statistical modeling skills','Comfort working with noisy, real-world sensor data','Genuine interest in sports performance a plus'],
     ARRAY['Python', 'Statistical Modeling', 'Data Pipelines', 'Machine Learning', 'SQL']),

    (25, 'Program Manager', 'FULL_TIME', 'MID_LEVEL', 'ON_SITE', 'Chennai', 8, 14,
     'Upliftly Social Ventures runs skill-training programs for underemployed youth in partnership with local NGOs. We''re hiring a Program Manager to run our next cohort of training programs end to end.',
     ARRAY['Coordinate training schedules across multiple NGO partner sites','Track participant attendance, progress, and outcomes','Manage relationships with corporate and NGO partners','Report program impact metrics to funders quarterly'],
     ARRAY['3+ years of program or project management experience','Experience working with NGOs or community organizations a plus','Strong organizational skills across multiple concurrent sites','Genuine commitment to social impact work'],
     ARRAY['Program Management', 'Stakeholder Coordination', 'Impact Reporting', 'Budget Management', 'Excel']),

    (26, 'Site Reliability Engineer', 'FULL_TIME', 'SENIOR', 'REMOTE', 'Pune', 20, 34,
     'Stackline Cloud Infrastructure provides managed Kubernetes hosting for mid-size SaaS companies. We''re hiring a Senior Site Reliability Engineer to help keep customer clusters healthy at scale.',
     ARRAY['Own incident response for customer-facing infrastructure issues','Build automation that reduces manual operational toil','Improve observability across hundreds of customer clusters','Participate in a shared on-call rotation with the rest of the team'],
     ARRAY['5+ years of SRE or infrastructure engineering experience','Deep hands-on experience with Kubernetes in production','Strong scripting skills (Python, Go, or Bash)','Comfort being paged and debugging under pressure'],
     ARRAY['Kubernetes', 'Terraform', 'Observability', 'Prometheus', 'Incident Response']),

    (27, 'Machine Learning Engineer', 'FULL_TIME', 'MID_LEVEL', 'REMOTE', 'Kolkata', 14, 24,
     'Cognivia AI Labs builds document-understanding models for enterprise back-office automation. We''re hiring a Machine Learning Engineer to help take models from research to production.',
     ARRAY['Take models from research notebooks to production-ready services','Build evaluation pipelines that catch regressions before deployment','Optimize inference latency for large document-processing workloads','Collaborate with research scientists on model improvements'],
     ARRAY['3+ years of ML engineering experience, NLP a strong plus','Strong Python skills and experience with PyTorch or TensorFlow','Experience deploying models to production, not just research','Comfort working closely with research-focused teammates'],
     ARRAY['PyTorch', 'NLP', 'Model Deployment', 'Docker', 'MLOps']),

    (28, 'Robotics Software Engineer', 'FULL_TIME', 'SENIOR', 'ON_SITE', 'Ahmedabad', 18, 30,
     'Automata Robotics builds autonomous mobile robots for warehouse fulfillment centers. We''re hiring a Senior Robotics Software Engineer to improve navigation and obstacle avoidance on our fleet.',
     ARRAY['Improve navigation and path-planning algorithms for warehouse robots','Debug real-world navigation failures using recorded sensor logs','Work with hardware teams on sensor placement and calibration','Run controlled field tests to validate improvements before rollout'],
     ARRAY['5+ years of robotics software experience, ROS preferred','Strong C++ skills and experience with real-time systems','Experience with SLAM or path-planning algorithms','Comfort debugging issues that only show up on real hardware'],
     ARRAY['ROS', 'C++', 'Path Planning', 'SLAM', 'Sensor Fusion']),

    (29, 'Backend Developer', 'FULL_TIME', 'ENTRY_LEVEL', 'REMOTE', 'Gurgaon', 6, 10,
     'Waveform Music Technologies builds royalty-tracking and distribution software for independent musicians. We''re hiring a Backend Developer to help us process royalty data from a growing list of streaming platforms.',
     ARRAY['Build integrations with streaming platform royalty reporting APIs','Write jobs that reconcile royalty data across multiple sources','Fix bugs reported by artists using the royalty dashboard','Add test coverage for royalty calculation edge cases'],
     ARRAY['1+ years of backend development experience','Comfort working with third-party APIs and inconsistent data formats','Basic understanding of relational databases','Interest in the music industry a plus, not required'],
     ARRAY['Node.js', 'PostgreSQL', 'REST APIs', 'API Integration', 'Git']),

    (30, 'Merchandising Analyst', 'FULL_TIME', 'MID_LEVEL', 'HYBRID', 'Noida', 8, 14,
     'Threadline Fashion Technologies runs a size-recommendation and virtual try-on platform for online fashion retailers. We''re hiring a Merchandising Analyst to help our retail partners use fit data to reduce returns.',
     ARRAY['Analyze fit and return data to identify sizing problem areas','Build reports that help retail partners understand return drivers','Work with partner merchandising teams to test recommendations','Track the impact of sizing changes on return rates over time'],
     ARRAY['2+ years of merchandising, retail analytics, or related experience','Strong Excel skills; SQL a plus','Fashion or apparel retail background preferred','Comfort presenting findings to retail partner teams'],
     ARRAY['Retail Analytics', 'Excel', 'Merchandising', 'SQL', 'Trend Analysis']),

    (31, 'Field Engineer', 'FULL_TIME', 'ENTRY_LEVEL', 'ON_SITE', 'Jaipur', 5, 9,
     'Aquanet Utilities Technologies builds smart water-metering hardware for municipal utilities. We''re hiring a Field Engineer to install and troubleshoot smart meters across our deployment sites.',
     ARRAY['Install and configure smart water meters at customer sites','Troubleshoot connectivity issues between meters and the central system','Document installation details accurately for each site','Coordinate scheduling with municipal utility staff'],
     ARRAY['Diploma or degree in electrical or instrumentation engineering','Comfort with fieldwork and hands-on hardware installation','Basic troubleshooting skills for connectivity issues','Valid driver''s license for site visits'],
     ARRAY['Field Installation', 'Hardware Troubleshooting', 'IoT Connectivity', 'Wiring Diagrams', 'Customer Communication']),

    (32, 'Safety & Compliance Officer', 'FULL_TIME', 'SENIOR', 'ON_SITE', 'Kochi', 14, 24,
     'Oreline Mining Technologies builds safety-monitoring sensor systems for mid-size mining operations. We''re hiring a Safety & Compliance Officer to ensure our own deployments meet regulatory standards.',
     ARRAY['Audit sensor deployments against mining safety regulations','Coordinate with client safety teams during system rollout','Maintain compliance documentation across active client sites','Investigate and report on any safety-related system failures'],
     ARRAY['5+ years of safety or compliance experience, mining industry required','Deep familiarity with Indian mining safety regulations','Strong documentation and audit skills','Comfort traveling to remote mine sites regularly'],
     ARRAY['Regulatory Compliance', 'Safety Auditing', 'Mining Regulations', 'Risk Assessment', 'Incident Investigation']),

    (33, 'Ground Operations Executive', 'FULL_TIME', 'ENTRY_LEVEL', 'ON_SITE', 'Chandigarh', 4, 7,
     'Skyfare Aviation Services provides ground handling services for regional airports. We''re hiring a Ground Operations Executive to coordinate flight turnarounds at our Chandigarh station.',
     ARRAY['Coordinate baggage, fueling, and cleaning crews during flight turnarounds','Communicate delays or issues to airline representatives in real time','Maintain accurate turnaround logs for every flight handled','Follow strict safety protocols on the tarmac at all times'],
     ARRAY['1+ years of experience in aviation, hospitality, or operations','Comfort working rotating shifts, including early mornings and nights','Calm, clear communication under time pressure','Willingness to work outdoors in all weather conditions'],
     ARRAY['Ground Operations', 'Aviation Safety', 'Team Coordination', 'Radio Communication', 'Load Planning']),

    (34, 'Operations Coordinator', 'FULL_TIME', 'MID_LEVEL', 'ON_SITE', 'Indore', 8, 14,
     'Portwell Maritime Logistics coordinates container shipping and customs clearance for import/export businesses. We''re hiring an Operations Coordinator to manage shipment documentation and customs coordination.',
     ARRAY['Track shipment status across ocean and inland transport legs','Prepare and verify customs documentation for outbound shipments','Coordinate directly with customs brokers and shipping lines','Resolve documentation issues before they delay a shipment'],
     ARRAY['2+ years of experience in shipping, freight forwarding, or customs','Strong attention to detail with documentation','Comfort coordinating across multiple external parties','Familiarity with export/import regulations a plus'],
     ARRAY['Freight Documentation', 'Customs Coordination', 'Logistics', 'Bill of Lading', 'Vendor Management']),

    (35, 'iOS Developer', 'FULL_TIME', 'MID_LEVEL', 'REMOTE', 'Coimbatore', 10, 18,
     'Vitalcore Wellness Technologies builds a habit-tracking and guided-workout app used by over a million people. We''re hiring an iOS Developer to help build our next round of fitness tracking features.',
     ARRAY['Build and ship new features in our SwiftUI-based iOS app','Integrate with HealthKit and wearable device data sources','Fix bugs reported through App Store reviews and support tickets','Collaborate with design on smooth, native-feeling interactions'],
     ARRAY['3+ years of iOS development experience','Strong Swift and SwiftUI skills','Experience with HealthKit or wearable integrations a plus','Comfort shipping features on a regular release cadence'],
     ARRAY['Swift', 'SwiftUI', 'HealthKit', 'Core Data', 'Unit Testing']),

    (36, 'Product Manager', 'FULL_TIME', 'SENIOR', 'HYBRID', 'Lucknow', 16, 27,
     'Pawtrack Pet Technologies builds GPS tracking collars and health-monitoring wearables for pets. We''re hiring a Senior Product Manager to own our health-monitoring product line.',
     ARRAY['Own the roadmap for health-monitoring features across our wearable line','Work with hardware and firmware teams on sensor accuracy improvements','Run customer interviews with pet owners to validate new features','Analyze usage data to identify where the product falls short'],
     ARRAY['5+ years of product management experience, hardware a plus','Comfort working across hardware, firmware, and app teams','Strong analytical skills and customer research experience','Genuine enthusiasm for pets and pet care a plus'],
     ARRAY['Product Strategy', 'Hardware Products', 'Customer Research', 'Roadmapping', 'Agile']),

    (37, 'Customer Support Lead', 'FULL_TIME', 'MID_LEVEL', 'REMOTE', 'Bhopal', 8, 14,
     'Caregiven Eldercare Technologies builds a fall-detection and family-alert platform for elderly care. We''re hiring a Customer Support Lead to manage our support team and improve response times on urgent alerts.',
     ARRAY['Lead a team of support agents handling time-sensitive family alerts','Set and monitor response-time targets for urgent support cases','Build support documentation and training for new agents','Escalate recurring product issues to the engineering team'],
     ARRAY['3+ years of customer support experience, team lead experience preferred','Comfort managing time-sensitive, high-stakes support cases','Strong empathy and communication skills','Experience in healthcare or eldercare support a plus'],
     ARRAY['Team Leadership', 'Customer Support', 'Escalation Management', 'Zendesk', 'Training & Onboarding']),

    (38, 'Backend Engineer', 'INTERNSHIP', 'ENTRY_LEVEL', 'HYBRID', 'Nagpur', 2, 4,
     'Civitrack Governance Technologies builds citizen-service portals for municipal governments. We''re hiring a Backend Engineering Intern to support our team building public-facing government services.',
     ARRAY['Assist in building APIs for citizen-facing government service portals','Write tests for existing backend services under senior engineer guidance','Help investigate and fix low-priority bugs in the issue tracker','Document API endpoints as they''re built'],
     ARRAY['Currently pursuing or recently completed a degree in computer science','Basic proficiency in at least one backend language','Genuine interest in public-sector or civic technology','Comfort asking questions and learning on the job'],
     ARRAY['Java', 'SQL', 'REST APIs', 'Git', 'Unit Testing']),

    (39, 'Quality Control Engineer', 'FULL_TIME', 'MID_LEVEL', 'ON_SITE', 'Surat', 9, 15,
     'Heliopanel Energy Manufacturing manufactures solar panels for residential and commercial installers. We''re hiring a Quality Control Engineer to maintain manufacturing quality standards on our production line.',
     ARRAY['Run quality inspections at each stage of the panel production line','Investigate and root-cause defects flagged during inspection','Maintain quality documentation for regulatory and customer audits','Recommend process changes to reduce recurring defect types'],
     ARRAY['3+ years of quality control experience, manufacturing required','Familiarity with solar panel or electronics manufacturing a plus','Strong root-cause analysis skills','Comfort working on an active production floor'],
     ARRAY['Quality Control', 'Root Cause Analysis', 'Manufacturing Standards', 'Six Sigma', 'Statistical Process Control']),

    (40, 'BI Developer', 'CONTRACT', 'MID_LEVEL', 'REMOTE', 'Vadodara', 9, 16,
     'Datavantage Analytics builds custom business intelligence dashboards for mid-size enterprise clients. We''re hiring a BI Developer on a project basis to help deliver a backlog of client dashboard requests.',
     ARRAY['Build custom dashboards against client data warehouses','Write and optimize SQL queries powering dashboard reports','Meet directly with clients to clarify reporting requirements','Hand off finished dashboards with clear documentation'],
     ARRAY['3+ years of BI development experience (Power BI, Tableau, or Looker)','Strong SQL skills across different database engines','Comfort working directly with client stakeholders','Ability to work independently on a project basis'],
     ARRAY['Power BI', 'SQL', 'Data Warehousing', 'DAX', 'ETL'])
),
company_users AS (
    SELECT u.id AS company_id, u.full_name AS company_name,
           row_number() OVER (ORDER BY u.email) AS n
    FROM seed_manifest_40 sm
    JOIN users u ON u.id = sm.entity_id
    WHERE sm.entity_type = 'company_user'
      AND u.email LIKE 'seed40.company.%'
),
inserted_jobs AS (
    INSERT INTO jobs (
        id, company_id, company_name, title, employment_type, experience_level, work_mode, location,
        salary_min_lakhs, salary_max_lakhs, about_role, responsibilities, requirements, skills,
        status, applicant_count, created_at, updated_at)
    SELECT
        gen_random_uuid(), cu.company_id, cu.company_name, jr.title, jr.employment_type,
        jr.experience_level, jr.work_mode, jr.location, jr.salary_min, jr.salary_max,
        jr.about_role, jr.responsibilities, jr.requirements, jr.skills, 'ACTIVE', 0, now(), now()
    FROM job_raw jr
    JOIN company_users cu ON cu.n = jr.n
    RETURNING id
)
INSERT INTO seed_manifest_40 (entity_type, entity_id)
SELECT 'job', id FROM inserted_jobs;

-- ============================== Ideas (approved, one per seeded company) ==============================
WITH idea_raw (n, title, category, stage, problem, solution, target_market) AS (
    VALUES
    (1, 'Instant Micro-Settlement Network', 'Fintech', 'LIVE',
     'Small merchants often wait 2-3 days for digital payment settlements, straining their cash flow.',
     'A network that settles small transactions instantly for a modest fee, funded by float management rather than merchant charges.',
     'Small retailers and kirana stores accepting digital payments.'),

    (2, 'AI Symptom Triage for Rural Clinics', 'Healthcare', 'PROTOTYPE',
     'Rural clinics are often staffed by a single nurse who must triage dozens of patients with varying urgency.',
     'A tablet-based symptom checker that helps non-doctor staff prioritize patients before a doctor is available.',
     'Primary health centers and rural clinics across India.'),

    (3, 'Peer Tutoring Marketplace for Regional Languages', 'Education', 'CONCEPT',
     'Students in smaller towns struggle to find tutors who teach effectively in their regional language.',
     'A marketplace connecting students with vetted local tutors who teach in the student''s preferred language.',
     'Secondary school students in tier-2 and tier-3 cities.'),

    (4, 'Community Solar Leasing for Renters', 'Clean Energy', 'CONCEPT',
     'Renters can''t install rooftop solar, missing out on savings available to homeowners.',
     'A leasing model where renters subscribe to a share of a nearby community solar installation.',
     'Urban renters in apartment complexes without rooftop access.'),

    (5, 'Predictive Empty-Return Routing', 'Logistics', 'PROTOTYPE',
     'Delivery trucks often return empty after drop-offs, wasting fuel and capacity.',
     'A routing system that matches empty return legs with nearby pickup requests in real time.',
     'Regional freight and last-mile delivery fleets.'),

    (6, 'Verified Local Artisan Marketplace', 'E-commerce', 'LIVE',
     'Local artisans struggle to prove authenticity to online buyers wary of mass-produced imitations.',
     'A marketplace with verified artisan profiles, video provenance, and direct buyer-artisan messaging.',
     'Urban consumers seeking authentic handmade goods.'),

    (7, 'Predictive Maintenance for Small Factories', 'Manufacturing', 'PROTOTYPE',
     'Small manufacturers can''t afford enterprise predictive maintenance systems, leading to costly downtime.',
     'An affordable sensor kit with a simple dashboard that flags equipment likely to fail soon.',
     'Small and mid-size manufacturing units.'),

    (8, 'Micro-Licensing for Independent Filmmakers', 'Media', 'CONCEPT',
     'Independent filmmakers struggle to monetize short clips beyond a single platform release.',
     'A licensing marketplace where brands can license short clips directly from independent creators.',
     'Independent filmmakers and content-hungry brands.'),

    (9, 'Skill-Based Matchmaking for Casual Games', 'Gaming', 'LIVE',
     'Casual mobile game matchmaking often pairs mismatched skill levels, frustrating new players.',
     'A matchmaking algorithm tuned specifically for casual games that balances fairness with fast queue times.',
     'Mobile game studios building casual multiplayer titles.'),

    (10, 'Decentralized Clinical Trial Recruitment', 'Biotechnology', 'PROTOTYPE',
     'Clinical trials struggle to recruit diverse participants beyond a handful of major hospitals.',
     'A platform connecting trial sponsors with participants through a network of smaller regional clinics.',
     'Biotech companies running Phase II and III clinical trials.'),

    (11, 'Fractional Ownership for First-Time Buyers', 'Real Estate', 'CONCEPT',
     'First-time buyers are priced out of property ownership in major cities.',
     'A fractional ownership platform letting buyers co-own property with a clear path to full ownership.',
     'First-time property buyers in major metros.'),

    (12, 'Soil Health Marketplace', 'Agriculture', 'LIVE',
     'Farmers often apply fertilizer without knowing their soil''s actual nutrient deficiencies.',
     'A soil-testing kit paired with a marketplace recommending only the fertilizer a farmer''s soil actually needs.',
     'Small and mid-size farm operators.'),

    (13, 'Shared Threat Intelligence for SMEs', 'Cybersecurity', 'PROTOTYPE',
     'Small businesses can''t afford enterprise-grade threat intelligence feeds.',
     'A cooperative threat-sharing network where SMEs pool anonymized attack data to warn each other.',
     'Small and mid-size businesses without dedicated security teams.'),

    (14, 'Group Travel Splitting Platform', 'Travel', 'LIVE',
     'Group trips often fall apart over disagreements about splitting costs fairly.',
     'A trip-planning app with built-in expense splitting and group payment collection.',
     'Friend groups and families planning trips together.'),

    (15, 'Compliance Automation for Gig Payroll', 'HR Technology', 'PROTOTYPE',
     'Businesses hiring gig workers struggle to stay compliant with shifting labor classification rules.',
     'A payroll add-on that automatically flags compliance risks in gig worker classification.',
     'Businesses that hire a mix of gig and full-time workers.'),

    (16, 'Plain-Language Contract Review', 'Legal Technology', 'LIVE',
     'Small business owners sign contracts they don''t fully understand due to dense legal language.',
     'An AI tool that rewrites contract clauses in plain language and flags unusually risky terms.',
     'Small business owners without in-house legal counsel.'),

    (17, 'Usage-Based Micro-Insurance', 'Insurance', 'CONCEPT',
     'Gig workers often go without insurance because traditional policies don''t fit irregular income.',
     'A micro-insurance product that charges premiums as a small percentage of each gig payment received.',
     'Gig economy workers across delivery and ride-hailing platforms.'),

    (18, 'Surplus Food Redistribution Network', 'Food & Beverage', 'LIVE',
     'Restaurants throw away significant surplus food daily while nearby shelters go undersupplied.',
     'A logistics network connecting restaurant surplus with local shelters on the same day it''s prepared.',
     'Restaurants, caterers, and local shelters.'),

    (19, 'Battery Swap Network for Delivery Fleets', 'Automotive', 'PROTOTYPE',
     'Electric delivery fleets lose productive hours waiting for vehicles to charge.',
     'A network of battery swap stations letting delivery riders swap depleted batteries in under two minutes.',
     'Electric two-wheeler delivery fleets.'),

    (20, 'Satellite Data for Crop Insurance Claims', 'Aerospace', 'CONCEPT',
     'Crop insurance claims take weeks to verify through manual field inspection.',
     'A service using satellite imagery to verify crop damage claims within days instead of weeks.',
     'Agricultural insurers and crop insurance cooperatives.'),

    (21, 'Rural Broadband Mesh Cooperative', 'Telecommunications', 'PROTOTYPE',
     'Rural areas often lack reliable broadband because it''s unprofitable for major telecom providers.',
     'A community-owned mesh network cooperative that shares the cost of a single fiber backhaul connection.',
     'Rural communities without reliable broadband access.'),

    (22, 'On-Site Safety Compliance Scanner', 'Construction', 'LIVE',
     'Construction site safety violations often go unnoticed until an inspection or incident occurs.',
     'A mobile app letting site supervisors scan for common safety violations using a phone camera.',
     'Mid-size construction contractors.'),

    (23, 'Attribution-Honest Ad Analytics', 'Marketing Technology', 'PROTOTYPE',
     'Small businesses often overspend on ads due to inflated attribution from ad platforms themselves.',
     'An independent analytics layer that reconciles ad platform claims against actual incremental sales.',
     'Small and mid-size D2C brands running paid ads.'),

    (24, 'Injury Risk Prediction for Youth Athletes', 'Sports Technology', 'CONCEPT',
     'Youth sports academies lack the tools professional teams use to catch injury risk early.',
     'A wearable and dashboard that flags movement patterns associated with elevated injury risk.',
     'Youth sports academies and coaching programs.'),

    (25, 'Skills-to-Jobs Bridge for Displaced Workers', 'Social Impact', 'LIVE',
     'Workers displaced by automation often don''t know which of their existing skills transfer to new roles.',
     'A skills-mapping tool that shows displaced workers exactly which nearby jobs match their existing experience.',
     'Workers in industries undergoing automation-driven disruption.'),

    (26, 'Carbon-Aware Cloud Scheduling', 'Cloud Infrastructure', 'PROTOTYPE',
     'Cloud workloads run regardless of how carbon-intensive the local power grid is at that moment.',
     'A scheduler that shifts non-urgent compute jobs to run when the grid is greenest.',
     'Companies running large batch compute workloads.'),

    (27, 'Explainable AI Audit Toolkit', 'Artificial Intelligence', 'CONCEPT',
     'Companies deploying AI models struggle to explain decisions to regulators and affected customers.',
     'A toolkit that generates plain-language explanations for individual AI model decisions.',
     'Companies deploying AI in regulated industries like lending and insurance.'),

    (28, 'Modular Warehouse Robotics Leasing', 'Robotics', 'LIVE',
     'Small warehouses can''t justify the capital cost of automation robots for seasonal demand spikes.',
     'A leasing service providing warehouse robots on a short-term, demand-based basis.',
     'Small and mid-size fulfillment warehouses.'),

    (29, 'Direct-to-Fan Royalty Splitting', 'Music Technology', 'PROTOTYPE',
     'Independent musicians struggle to split royalties fairly among collaborators without expensive legal help.',
     'A tool that automates royalty splitting based on a simple, transparent agreement set up at release time.',
     'Independent musicians and small labels.'),

    (30, 'Body-Scan Sizing for Online Fashion', 'Fashion Technology', 'LIVE',
     'Online fashion shoppers frequently return items that don''t fit as expected.',
     'A phone-camera body scan that generates accurate size recommendations across different brands.',
     'Online fashion retailers with high return rates.'),

    (31, 'Leak Detection for Aging Water Infrastructure', 'Utilities', 'PROTOTYPE',
     'Municipal water utilities lose significant water to undetected pipe leaks.',
     'Acoustic sensors that detect leaks in underground pipes before they become visible surface breaks.',
     'Municipal water utilities with aging infrastructure.'),

    (32, 'Real-Time Air Quality Monitoring for Mines', 'Mining', 'LIVE',
     'Underground mine air quality is often checked only periodically, missing dangerous fluctuations.',
     'A sensor network providing continuous underground air quality monitoring with instant alerts.',
     'Underground mining operations.'),

    (33, 'Dynamic Pricing for Regional Flight Routes', 'Aviation', 'CONCEPT',
     'Regional airlines often leave seats empty on routes with unpredictable demand.',
     'A dynamic pricing tool tuned specifically for the unusual demand patterns of regional routes.',
     'Regional airlines operating tier-2 city routes.'),

    (34, 'Container Space-Sharing for Small Exporters', 'Maritime', 'PROTOTYPE',
     'Small exporters often can''t fill a full shipping container, making export economically unviable.',
     'A platform matching small exporters to share container space on the same route.',
     'Small and mid-size export businesses.'),

    (35, 'Recovery Tracking for Physical Therapy', 'Health & Fitness', 'LIVE',
     'Physical therapy patients often lose motivation and stop doing prescribed exercises at home.',
     'An app that tracks at-home exercise completion and shares progress directly with the treating therapist.',
     'Physical therapy clinics and their patients.'),

    (36, 'Lost Pet Recovery Network', 'Pet Technology', 'LIVE',
     'Lost pets are often found by strangers with no easy way to identify or contact the owner.',
     'A QR-code tag network letting anyone who finds a pet instantly message the owner.',
     'Pet owners in urban areas.'),

    (37, 'Family Care Coordination Hub', 'Elder Care', 'PROTOTYPE',
     'Adult children coordinating care for aging parents often lose track of appointments and medications across siblings.',
     'A shared family dashboard tracking an elderly parent''s appointments, medications, and daily wellbeing.',
     'Adult children coordinating care for aging parents.'),

    (38, 'Participatory Budgeting Platform', 'GovTech', 'CONCEPT',
     'Local governments struggle to meaningfully involve citizens in budget allocation decisions.',
     'A platform letting residents propose and vote on how a portion of local budgets gets spent.',
     'Municipal governments and local civic bodies.'),

    (39, 'Panel Degradation Early-Warning System', 'Solar Manufacturing', 'PROTOTYPE',
     'Solar panel underperformance often goes unnoticed until a significant chunk of output is already lost.',
     'A monitoring system that flags individual panel degradation patterns before losses become significant.',
     'Commercial and utility-scale solar operators.'),

    (40, 'Self-Serve Data Warehouse for SMBs', 'Data & Analytics', 'LIVE',
     'Small businesses want data-driven decisions but can''t afford a dedicated data engineering team.',
     'A self-serve data warehouse that connects directly to common SMB tools with no engineering required.',
     'Small and mid-size businesses without dedicated data teams.')
),
company_submitters AS (
    SELECT u.id AS submitter_id, u.full_name AS submitter_name,
           row_number() OVER (ORDER BY u.email) AS n
    FROM seed_manifest_40 sm
    JOIN users u ON u.id = sm.entity_id
    WHERE sm.entity_type = 'company_user'
      AND u.email LIKE 'seed40.company.%'
),
inserted_ideas AS (
    INSERT INTO ideas (
        id, submitter_id, submitter_name, submitter_role, title, category, stage,
        problem, solution, target_market, contact_email, status, created_at, updated_at)
    SELECT
        gen_random_uuid(), cs.submitter_id, cs.submitter_name, 'COMPANY', ir.title, ir.category,
        ir.stage, ir.problem, ir.solution, ir.target_market,
        'partnerships40@' || lower(regexp_replace(cs.submitter_name, '[^A-Za-z]', '', 'g')) || '.com',
        'APPROVED', now(), now()
    FROM idea_raw ir
    JOIN company_submitters cs ON cs.n = ir.n
    RETURNING id
)
INSERT INTO seed_manifest_40 (entity_type, entity_id)
SELECT 'idea', id FROM inserted_ideas;

COMMIT;

-- Summary
SELECT entity_type, count(*) FROM seed_manifest_40 GROUP BY entity_type ORDER BY entity_type;
