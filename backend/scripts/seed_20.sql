-- Seeds 20 companies (verified), 20 jobs (active, one per company, skills/content matched to
-- each role), and 20 partnership ideas (approved, one per company).
-- Every generated row's id is recorded in seed_manifest so delete_seed_20.sql can remove
-- exactly these rows and nothing else. Password for every seeded account: SeedPass123!
-- (bcrypt hash below was generated with the app's own BCryptPasswordEncoder, cost 10).

BEGIN;

CREATE TABLE IF NOT EXISTS seed_manifest (
    entity_type text NOT NULL,
    entity_id uuid NOT NULL
);

-- ============================== Companies (verified) ==============================
WITH company_seed AS (
    SELECT
        gen_random_uuid() AS user_id,
        gen_random_uuid() AS profile_id,
        n,
        (ARRAY['Vertex Robotics','Nimbus Cloud Systems','Bright Path Analytics','Coral Reef Software',
               'Solstice Health Tech','Momentum Logistics','Everline Fintech','Quantum Leap AI',
               'Greenfield Agritech','Skyline Realty Tech','Pinnacle Consulting','Zenith Retail Solutions',
               'Ironclad Security Systems','Wavelength Media','Northstar Education','Bluewave Manufacturing',
               'Horizon Biotech','Crestline Ventures','Silverline Logistics','Meridian Software'])[n] AS company_name,
        -- Explicitly matched to each company name above (not cycled) so a company's stated
        -- industry actually reflects what the name says it does.
        (ARRAY['Technology','Technology','Technology','Technology','Healthcare','Logistics','Finance',
               'Technology','Agriculture','Real Estate','Consulting','E-commerce','Technology','Media',
               'Education','Manufacturing','Healthcare','Consulting','Logistics','Technology'])[n] AS industry,
        (ARRAY['Bengaluru, Karnataka','Mumbai, Maharashtra','Delhi, NCR','Hyderabad, Telangana',
               'Chennai, Tamil Nadu','Pune, Maharashtra','Kolkata, West Bengal','Ahmedabad, Gujarat',
               'Gurgaon, Haryana','Noida, Uttar Pradesh','Bengaluru, Karnataka','Mumbai, Maharashtra',
               'Delhi, NCR','Hyderabad, Telangana','Chennai, Tamil Nadu','Pune, Maharashtra',
               'Kolkata, West Bengal','Ahmedabad, Gujarat','Gurgaon, Haryana','Noida, Uttar Pradesh'])[n] AS address,
        '80000000' || lpad(n::text, 2, '0') AS contact_number
    FROM generate_series(1, 20) AS n
),
inserted_company_users AS (
    INSERT INTO users (id, email, password_hash, full_name, role, account_status, created_at, updated_at)
    SELECT
        user_id,
        'seed.company.' || lpad(n::text, 2, '0') || '@example.com',
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
        'CIN' || lpad(n::text, 8, '0'), 'GSTIN' || lpad(n::text, 8, '0'), 'PAN' || lpad(n::text, 7, '0'),
        industry, address, company_name || ' Signatory', contact_number,
        'VERIFIED', now(), now()
    FROM company_seed
    RETURNING id
)
INSERT INTO seed_manifest (entity_type, entity_id)
SELECT 'company_user', id FROM inserted_company_users
UNION ALL
SELECT 'company_profile', id FROM inserted_company_profiles;

-- ============================== Jobs (active, one per seeded company) ==============================
WITH company_users AS (
    SELECT u.id AS company_id, u.full_name AS company_name, u.email,
           row_number() OVER (ORDER BY u.email) AS n
    FROM seed_manifest sm
    JOIN users u ON u.id = sm.entity_id
    WHERE sm.entity_type = 'company_user'
),
job_seed AS (
    SELECT
        gen_random_uuid() AS job_id,
        cu.company_id,
        cu.company_name,
        n,
        (ARRAY['Senior Frontend Developer','Backend Engineer','Full Stack Developer','Data Analyst',
               'Product Manager','UX/UI Designer','DevOps Engineer','QA Automation Engineer',
               'Android Developer','ML Engineer','Business Analyst','Digital Marketing Manager',
               'Sales Development Representative','HR Business Partner','Content Strategist',
               'Graphic Designer','Financial Analyst','Operations Lead','Customer Success Manager',
               'Technical Writer'])[n] AS title,
        (ARRAY['FULL_TIME','FULL_TIME','FULL_TIME','FULL_TIME','FULL_TIME','FULL_TIME','FULL_TIME',
               'CONTRACT','FULL_TIME','FULL_TIME','FULL_TIME','FULL_TIME','FULL_TIME','FULL_TIME',
               'PART_TIME','FULL_TIME','FULL_TIME','FULL_TIME','FULL_TIME','INTERNSHIP'])[n] AS employment_type,
        (ARRAY['ENTRY_LEVEL','MID_LEVEL','SENIOR','LEADERSHIP'])[((n - 1) % 4) + 1] AS experience_level,
        (ARRAY['REMOTE','HYBRID','ON_SITE'])[((n - 1) % 3) + 1] AS work_mode,
        (ARRAY['Bengaluru','Mumbai','Delhi','Hyderabad','Chennai','Pune','Kolkata','Ahmedabad',
               'Gurgaon','Noida','Bengaluru','Mumbai','Delhi','Hyderabad','Chennai','Pune',
               'Kolkata','Ahmedabad','Gurgaon','Noida'])[n] AS location,
        (6 + n)::numeric AS salary_min_lakhs,
        (12 + n * 2)::numeric AS salary_max_lakhs,
        -- Three skills per role, chosen to actually fit that specific job title.
        ARRAY[
            (ARRAY['React','Java','React','SQL','Roadmapping','Figma','Docker','Selenium','Kotlin','Python',
                   'SQL','SEO','Salesforce','HRIS','SEO Writing','Adobe Photoshop','Excel','Process Improvement',
                   'CRM Tools','API Documentation'])[n],
            (ARRAY['TypeScript','Spring Boot','Node.js','Excel','Agile','Sketch','Kubernetes','Cypress',
                   'Android SDK','TensorFlow','Excel','Google Ads','Cold Outreach','Recruiting',
                   'Content Planning','Adobe Illustrator','Financial Modeling','Project Management',
                   'Zendesk','Markdown'])[n],
            (ARRAY['CSS/Tailwind','PostgreSQL','MongoDB','Power BI','Stakeholder Management','User Research',
                   'Terraform','CI/CD','Jetpack Compose','scikit-learn','Requirements Gathering',
                   'Google Analytics','Lead Generation','Employee Relations','CMS Platforms','Branding',
                   'Forecasting','Vendor Management','Account Management','Confluence'])[n]
        ] AS skills
    FROM company_users cu
),
job_copy AS (
    SELECT
        n,
        -- A one-line "what we do" blurb per company, matched to its industry above.
        (ARRAY[
            'Vertex Robotics builds automation software that helps manufacturing plants run more efficiently.',
            'Nimbus Cloud Systems provides cloud infrastructure and monitoring tools for fast-growing SaaS companies.',
            'Bright Path Analytics helps enterprises turn their data into actionable business insights.',
            'Coral Reef Software builds custom enterprise software for mid-market businesses.',
            'Solstice Health Tech builds digital tools that connect patients with healthcare providers.',
            'Momentum Logistics operates a technology-driven freight and delivery network across India.',
            'Everline Fintech builds digital lending and payments products for underserved small businesses.',
            'Quantum Leap AI develops machine learning products that automate business decision-making.',
            'Greenfield Agritech builds technology that helps farmers increase crop yields sustainably.',
            'Skyline Realty Tech runs an online marketplace for buying, selling, and renting property.',
            'Pinnacle Consulting advises growing companies on strategy, operations, and organizational design.',
            'Zenith Retail Solutions operates an online retail platform serving customers across India.',
            'Ironclad Security Systems builds cybersecurity software that protects businesses from digital threats.',
            'Wavelength Media produces and distributes digital content across streaming and social platforms.',
            'Northstar Education builds online learning platforms for students preparing for competitive exams.',
            'Bluewave Manufacturing produces industrial components for the automotive and electronics sectors.',
            'Horizon Biotech develops diagnostic tools and therapies for chronic disease management.',
            'Crestline Ventures is an advisory firm helping startups raise capital and scale operations.',
            'Silverline Logistics manages warehousing and last-mile delivery for e-commerce brands.',
            'Meridian Software builds workflow automation tools for enterprise operations teams.'
        ])[n] AS company_blurb,
        (ARRAY[
            'We''re hiring a Senior Frontend Developer to lead development of our customer-facing dashboard and internal tooling.',
            'We''re looking for a Backend Engineer to design and scale the APIs and services powering our platform.',
            'As a Full Stack Developer, you''ll ship features end-to-end across our web application.',
            'We''re hiring a Data Analyst to help our teams make better decisions using data.',
            'We''re seeking a Product Manager to own the roadmap for our patient engagement product.',
            'We''re looking for a UX/UI Designer to improve the experience for drivers and dispatchers using our platform.',
            'We''re hiring a DevOps Engineer to build and maintain the infrastructure behind our lending platform.',
            'We''re looking for a QA Automation Engineer to ensure our ML products ship reliably.',
            'We''re hiring an Android Developer to build and improve the app farmers use to track their fields.',
            'We''re looking for an ML Engineer to build the models that power our property price predictions.',
            'We''re hiring a Business Analyst to support client engagements across strategy and operations projects.',
            'We''re looking for a Digital Marketing Manager to grow traffic and revenue across our online store.',
            'We''re looking for a Sales Development Representative to build our pipeline of enterprise security customers.',
            'We''re seeking an HR Business Partner to support our growing content and production teams.',
            'We''re hiring a Content Strategist to shape how we communicate with students and parents.',
            'We''re looking for a Graphic Designer to create visuals for our marketing and product catalogs.',
            'We''re hiring a Financial Analyst to support budgeting and forecasting as we scale our research programs.',
            'We''re looking for an Operations Lead to streamline how we support our portfolio companies.',
            'We''re hiring a Customer Success Manager to support the e-commerce brands using our fulfillment network.',
            'We''re looking for a Technical Writer to create clear documentation for our workflow automation platform.'
        ])[n] AS role_intro,
        ARRAY[
            (ARRAY['Architect and build reusable, well-tested UI components in React',
                   'Design, build, and maintain RESTful APIs used by thousands of customers',
                   'Build features spanning both frontend and backend',
                   'Build dashboards and reports that track key business metrics',
                   'Define product requirements and prioritize the roadmap',
                   'Design wireframes, prototypes, and high-fidelity mockups',
                   'Manage and improve CI/CD pipelines',
                   'Build and maintain automated test suites across our products',
                   'Develop new features for our Android app using Kotlin',
                   'Develop and train machine learning models on property and market data',
                   'Gather and document business requirements from client stakeholders',
                   'Plan and execute digital marketing campaigns across paid and organic channels',
                   'Prospect and qualify new leads through outbound outreach',
                   'Partner with managers on hiring, performance, and employee development',
                   'Develop and execute a content strategy across our channels',
                   'Design marketing collateral, product catalogs, and social assets',
                   'Build financial models and forecasts for research programs',
                   'Oversee day-to-day operational workflows across the firm',
                   'Onboard new customers and ensure a smooth implementation',
                   'Write and maintain user guides, API docs, and release notes'])[n],
            (ARRAY['Partner with product and design to translate mockups into polished interfaces',
                   'Optimize database schemas and queries for performance at scale',
                   'Collaborate with data engineers to surface analytics in the product',
                   'Analyze usage and performance trends to guide product decisions',
                   'Work closely with engineering, design, and clinical teams',
                   'Conduct user research and usability testing with field teams',
                   'Monitor system reliability, uptime, and performance',
                   'Identify, document, and track bugs through resolution',
                   'Optimize app performance and battery usage for low-end devices',
                   'Deploy models into production pipelines',
                   'Analyze processes and data to identify improvement opportunities',
                   'Manage SEO strategy and paid advertising budgets',
                   'Schedule meetings and demos for the sales team',
                   'Support employee engagement and retention initiatives',
                   'Write and edit high-quality educational and marketing content',
                   'Maintain visual consistency with our brand guidelines',
                   'Analyze budget variances and prepare monthly reports',
                   'Identify and implement process improvements',
                   'Monitor account health and proactively address issues',
                   'Collaborate with engineers to ensure documentation accuracy'])[n],
            (ARRAY['Improve page performance, load times, and accessibility across the app',
                   'Write automated tests and participate in code reviews',
                   'Participate in architecture discussions and code reviews',
                   'Partner with stakeholders to define and track KPIs',
                   'Analyze user feedback and usage data to guide decisions',
                   'Maintain and evolve our design system',
                   'Automate infrastructure provisioning using infrastructure-as-code',
                   'Collaborate with engineers to improve overall test coverage',
                   'Collaborate with backend teams on API integration',
                   'Monitor model performance and retrain as needed',
                   'Build presentations and reports summarizing findings',
                   'Analyze campaign performance and report on ROI',
                   'Maintain accurate records of prospect interactions in the CRM',
                   'Ensure HR policies and processes are applied consistently',
                   'Collaborate with the marketing team on campaign content',
                   'Collaborate with the marketing team on campaign concepts',
                   'Support leadership with ad hoc financial analysis',
                   'Coordinate across teams to support portfolio company engagements',
                   'Manage renewals and identify upsell opportunities',
                   'Improve existing documentation based on customer feedback'])[n],
            (ARRAY['Mentor junior engineers and review pull requests',
                   'Collaborate with DevOps on deployment and monitoring',
                   'Debug and resolve issues across the stack',
                   'Maintain data accuracy and troubleshoot pipeline issues',
                   'Communicate progress and priorities to leadership',
                   'Collaborate closely with engineers during implementation',
                   'Support engineering teams with deployment and incident response',
                   'Validate model outputs and data pipelines before release',
                   'Ensure the app works reliably in low-connectivity rural areas',
                   'Collaborate with data engineers on feature pipelines',
                   'Support senior consultants during client engagements',
                   'Collaborate with the creative team on ad content',
                   'Collaborate with marketing on lead generation campaigns',
                   'Handle employee relations issues with discretion and care',
                   'Track content performance and iterate based on results',
                   'Prepare print-ready files for manufacturing catalogs',
                   'Assist with grant and investor reporting',
                   'Manage vendor and partner relationships',
                   'Gather customer feedback and relay it to the product team',
                   'Maintain a consistent voice and structure across all docs'])[n]
        ] AS responsibilities,
        ARRAY[
            (ARRAY['5+ years of experience building production React applications',
                   '3+ years of backend development experience with Java or a similar language',
                   '3+ years of experience working across the full stack',
                   '2+ years of experience in a data or business analyst role',
                   '3+ years of product management experience, ideally in healthcare or a regulated industry',
                   '3+ years of UX/UI design experience with a strong portfolio',
                   '3+ years of DevOps or infrastructure engineering experience',
                   '2+ years of experience with test automation frameworks',
                   '3+ years of experience with Kotlin and the Android SDK',
                   '3+ years of experience building and deploying ML models',
                   '2+ years of experience in a business analyst or consulting role',
                   '3+ years of experience in digital marketing, ideally in e-commerce',
                   '1-2 years of experience in sales development or a similar role',
                   '3+ years of experience as an HR generalist or business partner',
                   '3+ years of experience in content strategy or content marketing',
                   '3+ years of graphic design experience',
                   '2+ years of experience in financial analysis or FP&A',
                   '4+ years of experience in an operations role',
                   '2+ years of experience in a customer-facing or account management role',
                   '2+ years of experience as a technical writer'])[n],
            (ARRAY['Strong command of modern CSS, responsive design, and accessibility standards',
                   'Strong understanding of relational databases and API design',
                   'Proficiency with React and Node.js or a similar combination',
                   'Strong SQL skills and experience with a BI tool such as Power BI or Tableau',
                   'Strong written and verbal communication skills',
                   'Proficiency in Figma or a similar design tool',
                   'Hands-on experience with Docker and Kubernetes',
                   'Experience with tools such as Selenium or Cypress',
                   'Understanding of mobile UI/UX best practices',
                   'Strong Python skills and experience with frameworks such as TensorFlow or scikit-learn',
                   'Strong Excel skills and comfort with reporting tools',
                   'Hands-on experience with Google Ads and SEO tools',
                   'Strong communication and persuasion skills',
                   'Strong interpersonal and conflict-resolution skills',
                   'Excellent writing and editing skills',
                   'Proficiency in Adobe Photoshop and Illustrator',
                   'Strong Excel and financial modeling skills',
                   'Strong organizational and project management skills',
                   'Strong relationship-building and communication skills',
                   'Ability to explain complex technical concepts simply'])[n],
            (ARRAY['Experience with TypeScript and component-driven development',
                   'Experience with Spring Boot or a comparable framework',
                   'Solid understanding of SQL and relational data modeling',
                   'Comfort working with large datasets in Excel or Python',
                   'Comfort making data-driven decisions',
                   'Understanding of accessibility and responsive design principles',
                   'Familiarity with Terraform or similar IaC tools',
                   'Strong attention to detail and a quality-first mindset',
                   'Experience publishing and maintaining apps on the Play Store',
                   'Solid foundation in statistics and model evaluation',
                   'Excellent written and verbal communication skills',
                   'Strong analytical mindset and comfort with marketing analytics platforms',
                   'Comfort with outbound prospecting and cold outreach',
                   'Familiarity with HRIS systems',
                   'Experience with SEO and content planning tools',
                   'Strong portfolio demonstrating brand and print design work',
                   'Understanding of accounting principles',
                   'Comfort building and documenting processes from scratch',
                   'Comfort using CRM and support ticketing tools',
                   'Experience with documentation tools such as Confluence or GitBook'])[n],
            (ARRAY['Comfortable working closely with designers and product managers',
                   'Familiarity with cloud platforms such as AWS or GCP',
                   'Strong debugging and problem-solving skills',
                   'Ability to communicate findings clearly to non-technical stakeholders',
                   'Experience working with cross-functional engineering teams',
                   'Experience designing for operational or logistics-heavy products is a plus',
                   'Experience working in a regulated or security-conscious environment is a plus',
                   'Familiarity with CI/CD workflows',
                   'Interest in building for users with limited connectivity is a plus',
                   'Experience with real estate or pricing data is a plus',
                   'Ability to work with cross-functional teams under tight deadlines',
                   'Experience managing a marketing budget',
                   'Prior experience with Salesforce or a similar CRM preferred',
                   'Experience supporting creative or media teams is a plus',
                   'A portfolio of published work',
                   'Attention to detail and ability to manage multiple projects',
                   'Experience in biotech, pharma, or research is a plus',
                   'Experience in venture capital, consulting, or a fast-paced startup is a plus',
                   'Experience in logistics or e-commerce is a plus',
                   'Comfort working directly with engineering teams'])[n]
        ] AS requirements
    FROM generate_series(1, 20) AS n
),
inserted_jobs AS (
    INSERT INTO jobs (
        id, company_id, company_name, title, employment_type, experience_level, work_mode, location,
        salary_min_lakhs, salary_max_lakhs, about_role, responsibilities, requirements, skills,
        status, applicant_count, created_at, updated_at)
    SELECT
        js.job_id, js.company_id, js.company_name, js.title, js.employment_type, js.experience_level,
        js.work_mode, js.location, js.salary_min_lakhs, js.salary_max_lakhs,
        jc.company_blurb || ' ' || jc.role_intro,
        jc.responsibilities, jc.requirements, js.skills, 'ACTIVE', 0, now(), now()
    FROM job_seed js
    JOIN job_copy jc ON jc.n = js.n
    RETURNING id
)
INSERT INTO seed_manifest (entity_type, entity_id)
SELECT 'job', id FROM inserted_jobs;

-- ============================== Ideas (approved, one per seeded company) ==============================
WITH company_submitters AS (
    SELECT u.id AS submitter_id, u.full_name AS submitter_name, u.email,
           row_number() OVER (ORDER BY u.email) AS n
    FROM seed_manifest sm
    JOIN users u ON u.id = sm.entity_id
    WHERE sm.entity_type = 'company_user'
),
idea_seed AS (
    SELECT
        gen_random_uuid() AS idea_id,
        cs.submitter_id,
        cs.submitter_name,
        n,
        (ARRAY['AI-Powered Resume Screening','Hyperlocal Grocery Delivery','Peer-to-Peer Skill Exchange',
               'Smart Parking Solution','Sustainable Packaging Marketplace','Telehealth for Rural India',
               'Blockchain Supply Chain Tracker','EdTech for Vernacular Learning','Micro-Investment for Gig Workers',
               'Smart Waste Management','Virtual Interior Design Studio','Community Solar Energy Sharing',
               'On-Demand Tutoring Platform','Freelancer Payment Escrow','AI Meal Planning App',
               'Used EV Battery Marketplace','Remote Team Culture Platform','Local Artisan E-commerce Hub',
               'Predictive Maintenance for SMEs','Voice-First Customer Support Bot'])[n] AS title,
        (ARRAY['Technology','E-commerce','Education','Mobility','Sustainability','Healthcare',
               'Logistics','EdTech','Fintech','CleanTech','Design','Energy','Education','Fintech',
               'Health','Mobility','HR Tech','E-commerce','Manufacturing','Customer Service'])[n] AS category,
        (ARRAY['CONCEPT','PROTOTYPE','LIVE'])[((n - 1) % 3) + 1] AS stage,
        'partnerships@' || lower(regexp_replace(cs.submitter_name, '[^A-Za-z]', '', 'g')) || '.com' AS contact_email
    FROM company_submitters cs
),
idea_copy AS (
    SELECT
        n,
        (ARRAY[
            'Recruiters spend hours manually screening hundreds of resumes for every open role, leading to slow hiring and missed top talent.',
            'Residents in tier-2 and tier-3 cities lack access to fast, reliable grocery delivery that larger metros already enjoy.',
            'Learning a new skill often requires expensive courses, while many people have valuable skills they would happily teach in trade.',
            'Drivers in dense urban areas waste 15-20 minutes on average searching for parking, adding to congestion and emissions.',
            'Small and mid-size brands want eco-friendly packaging but struggle to find affordable, reliable suppliers.',
            'Rural communities often have no access to specialist doctors, forcing long and costly trips to cities for basic consultations.',
            'Buyers cannot verify the origin or authenticity of goods as they move through complex, multi-party supply chains.',
            'Millions of students learn best in their native language, but most quality digital education content is only in English.',
            'Gig workers earn irregular income and rarely have access to investment products designed for their cash flow.',
            'Municipal waste collection routes are fixed and inefficient, leading to overflowing bins and wasted fuel on empty pickups.',
            'Hiring an interior designer is expensive and slow, leaving budget-conscious homeowners to DIY with limited guidance.',
            'Many households cannot install solar panels due to space or cost, missing out on renewable energy savings.',
            'Parents struggle to find qualified, affordable tutors on short notice, especially before exams.',
            'Freelancers frequently face late or unpaid invoices, while clients worry about paying upfront for undelivered work.',
            'People with dietary goals or restrictions spend hours each week planning meals and grocery lists from scratch.',
            'Retired EV batteries still hold 70-80% capacity but are usually discarded, wasting valuable materials and value.',
            'Distributed teams struggle to build the informal connections and culture that happen naturally in an office.',
            'Local artisans and craftspeople struggle to reach customers beyond their immediate geography without e-commerce expertise.',
            'Small manufacturers cannot afford enterprise-grade predictive maintenance systems, leading to costly unplanned downtime.',
            'Text-based chatbots frustrate customers who prefer speaking, especially for urgent or complex issues.'
        ])[n] AS problem,
        (ARRAY[
            'An AI-powered screening tool that ranks and shortlists candidates against role requirements in seconds, freeing recruiters to focus on interviews.',
            'A hyperlocal delivery network partnering with neighborhood kirana stores to fulfill orders within 30 minutes.',
            'A platform where users trade skills directly using a credit-based exchange system.',
            'IoT sensors and a mobile app that show real-time parking availability and let drivers reserve a spot in advance.',
            'An online marketplace connecting sustainable packaging manufacturers directly with brands, with bulk pricing and sample kits.',
            'A telehealth platform connecting rural patients with certified doctors via low-bandwidth video calls, with local health worker support.',
            'A blockchain-based tracking system that records every handoff, giving buyers a verifiable, tamper-proof product history.',
            'A learning platform offering interactive courses and doubt-solving in regional Indian languages.',
            'An app that automatically rounds up gig earnings and invests the spare change into diversified, low-risk funds.',
            'Sensor-equipped bins that report fill levels in real time, letting municipalities dynamically optimize collection routes.',
            'An online studio where users upload room photos and get AI-assisted design mockups plus affordable virtual consultations.',
            'A community solar model where neighbors co-invest in a shared installation and split the generated power and savings.',
            'An on-demand platform connecting students with vetted tutors for live sessions within minutes of booking.',
            'An escrow service that holds client funds until milestones are approved, protecting both freelancers and clients.',
            'An app that generates personalized weekly meal plans and shoppable grocery lists based on dietary preferences and budget.',
            'A marketplace that certifies and resells used EV batteries for second-life applications like home energy storage.',
            'A platform combining virtual watercooler chats, recognition tools, and async team rituals to build remote culture.',
            'A curated marketplace with built-in logistics and storytelling tools to help artisans sell nationally.',
            'An affordable IoT sensor kit and analytics dashboard that predicts equipment failures before they happen.',
            'A voice-first AI support assistant that handles calls naturally and escalates to humans only when needed.'
        ])[n] AS solution,
        (ARRAY[
            'Mid-size and large companies with high-volume hiring needs, especially in tech and BPO sectors.',
            'Urban households in tier-2/tier-3 Indian cities without access to quick-commerce apps.',
            'Students, freelancers, and hobbyists looking to learn affordably outside formal education.',
            'Commuters and property owners in congested metro business districts.',
            'D2C brands and small manufacturers looking to reduce their environmental footprint.',
            'Primary health centers and residents in rural and semi-urban India.',
            'Manufacturers and retailers in food, pharma, and luxury goods where provenance matters.',
            'K-12 and competitive-exam students in tier-2/tier-3 cities and rural areas.',
            'Ride-share drivers, delivery partners, and freelance gig workers.',
            'City municipal corporations and large residential or commercial complexes.',
            'First-time homeowners and renters furnishing new apartments.',
            'Residential societies and gated communities in sunny regions.',
            'School and college students preparing for exams, and their parents.',
            'Independent freelancers and the small businesses that hire them.',
            'Health-conscious professionals and families managing dietary restrictions.',
            'EV manufacturers, recyclers, and off-grid energy storage buyers.',
            'Mid-size remote and hybrid companies with distributed teams.',
            'Independent artisans and craft cooperatives, and buyers seeking authentic handmade goods.',
            'Small and medium manufacturing units without in-house data science teams.',
            'Mid-size e-commerce and services companies with high call-center volume.'
        ])[n] AS target_market
    FROM generate_series(1, 20) AS n
),
inserted_ideas AS (
    INSERT INTO ideas (
        id, submitter_id, submitter_name, submitter_role, title, category, stage,
        problem, solution, target_market, contact_email, status, created_at, updated_at)
    SELECT
        idsd.idea_id, idsd.submitter_id, idsd.submitter_name, 'COMPANY', idsd.title, idsd.category,
        idsd.stage, ic.problem, ic.solution, ic.target_market, idsd.contact_email, 'APPROVED', now(), now()
    FROM idea_seed idsd
    JOIN idea_copy ic ON ic.n = idsd.n
    RETURNING id
)
INSERT INTO seed_manifest (entity_type, entity_id)
SELECT 'idea', id FROM inserted_ideas;

COMMIT;

-- Summary
SELECT entity_type, count(*) FROM seed_manifest GROUP BY entity_type ORDER BY entity_type;
