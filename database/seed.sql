-- ============================================================
-- Smart Healthcare PM System — Seed Data
-- All data matches the case study. EVM numbers are designed so
-- CPI ≈ 0.85 and SPI ≈ 0.88 at status date 2026-11-01.
-- ============================================================

PRAGMA foreign_keys = ON;

-- ==================== SETTINGS ====================
INSERT INTO settings (key, value) VALUES ('status_date',           '2026-12-01');
INSERT INTO settings (key, value) VALUES ('cpi_warning_threshold', '0.90');
INSERT INTO settings (key, value) VALUES ('cpi_critical_threshold','0.80');
INSERT INTO settings (key, value) VALUES ('spi_warning_threshold', '0.90');
INSERT INTO settings (key, value) VALUES ('spi_critical_threshold','0.80');

-- ==================== PROJECT CHARTER ====================
INSERT INTO project_charter (
  id, title, description, objectives, scope_in, scope_out,
  approved_budget, start_date, end_date, sponsor, project_manager, approval_status
) VALUES (
  1,
  'Smart Healthcare Management System',
  'Development of a comprehensive healthcare management system for a network of 5 hospitals covering patient appointments, laboratory reports, doctor schedules, online consultations, and hospital billing.',
  '["Develop an integrated healthcare management platform for 5 hospitals","Automate patient appointment scheduling and management","Implement laboratory report generation and tracking","Create doctor schedule management with shift planning","Build secure online consultation platform","Develop comprehensive hospital billing system","Ensure HIPAA-compliant data security and privacy","Deploy within 16 weeks with full training"]',
  '["Patient Appointment Scheduling","Laboratory Report Management","Doctor Schedule Management","Online Consultation Platform","Hospital Billing System","Patient Record Management","User Authentication & Authorization","Dashboard & Analytics","Role-Based Access Control","Multi-Hospital Support","Notification System","Data Export & Reporting","Audit Trail Logging"]',
  '["Hardware procurement for hospitals","Network infrastructure setup","Legacy data migration from paper records","Third-party insurance integration","Custom hardware device drivers","Hospital physical security systems"]',
  5000000, '2026-09-07', '2026-12-27',
  'Hospital Board of Directors', 'Ahmad Khan', 'Approved'
);

-- ==================== PROJECT PLAN ====================
INSERT INTO project_plan (id, charter_id, scope_notes, schedule_notes, cost_notes, quality_notes)
VALUES (
  1, 1,
  'Scope is baselined with 15 approved requirements covering all 5 hospital modules. Two additional requirements (AI Diagnosis, Mobile App) are proposed via change requests CR-001 and CR-002.',
  'Project follows a 16-week waterfall schedule with overlapping development phases. Critical path runs through UI/UX Design → Frontend Integration → Integration Testing → UAT → Bug Fixing → Deployment → Data Migration → Training → Closure.',
  'Budget at Completion (BAC) is PKR 5,000,000. Cost tracking uses Earned Value Management with weekly snapshots. Current CPI indicates cost overrun trend.',
  'Quality is tracked via checklists per deliverable with pass/fail inspection results. Defects are logged with severity levels. Target overall checklist pass rate: 90%. Current critical defects in appointment scheduling and patient records must be resolved before closure.'
);

-- ==================== TEAM MEMBERS ====================
-- 7 members as per case study: 1 PM, 2 Backend, 2 Frontend, 1 DB, 1 QA
INSERT INTO team_members (id, name, role, email, phone, daily_rate) VALUES
  (1, 'Ahmad Khan',      'Project Manager',          'ahmad.khan@healthtech.pk',   '+92-300-1234567', 5000),
  (2, 'Sarah Ali',       'Senior Backend Developer', 'sarah.ali@healthtech.pk',    '+92-301-2345678', 4500),
  (3, 'Hassan Raza',     'Backend Developer',        'hassan.raza@healthtech.pk',  '+92-302-3456789', 3500),
  (4, 'Fatima Noor',     'Senior Frontend Developer','fatima.noor@healthtech.pk',  '+92-303-4567890', 4000),
  (5, 'Omar Malik',      'Frontend Developer',       'omar.malik@healthtech.pk',   '+92-304-5678901', 3500),
  (6, 'Ayesha Siddiqui', 'Database Developer',       'ayesha.siddiqui@healthtech.pk','+92-305-6789012', 4000),
  (7, 'Bilal Ahmed',     'QA Engineer',              'bilal.ahmed@healthtech.pk',  '+92-306-7890123', 3500);

-- ==================== STAKEHOLDERS ====================
INSERT INTO stakeholders (id, name, role, organization, influence, interest, contact) VALUES
  (1, 'Hospital Board of Directors', 'Sponsor',    'City Hospital Network', 'High',   'High',   'board@cityhospital.pk'),
  (2, 'IT Department',              'End User',    'City Hospital Network', 'Medium', 'High',   'it@cityhospital.pk'),
  (3, 'Medical Staff',              'End User',    'City Hospital Network', 'High',   'High',   'medical@cityhospital.pk'),
  (4, 'Patients',                   'Beneficiary', 'General Public',       'Medium', 'Medium', NULL),
  (5, 'Regulatory Compliance Team', 'Regulator',   'Health Authority',     'High',   'Medium', 'compliance@healthauth.pk');

-- ==================== REQUIREMENTS ====================
-- 15 Approved/Implemented + 2 Proposed (linked to CRs)
INSERT INTO requirements (id, code, title, description, type, priority, status) VALUES
  (1,  'REQ-001', 'Patient Appointment Management',     'Enable patients to book, reschedule, and cancel appointments with doctors across all 5 hospitals.',                              'Functional',     'Must',   'Implemented'),
  (2,  'REQ-002', 'Laboratory Report Generation',       'Generate, store, and distribute laboratory test reports electronically with PDF export.',                                        'Functional',     'Must',   'Implemented'),
  (3,  'REQ-003', 'Doctor Schedule Management',          'Manage doctor shifts, availability, leaves, and on-call schedules across hospitals.',                                            'Functional',     'Must',   'Approved'),
  (4,  'REQ-004', 'Online Consultation Platform',        'Provide secure video/audio consultation between doctors and patients with chat and file sharing.',                               'Functional',     'Must',   'Approved'),
  (5,  'REQ-005', 'Hospital Billing System',             'Automated billing, invoice generation, and payment tracking for all hospital services.',                                         'Functional',     'Must',   'Approved'),
  (6,  'REQ-006', 'Patient Record Management',           'Comprehensive electronic health records (EHR) with search, edit, and export capabilities.',                                     'Functional',     'Must',   'Approved'),
  (7,  'REQ-007', 'User Authentication & Authorization', 'Secure login with multi-factor authentication and session management.',                                                         'Technical',      'Must',   'Implemented'),
  (8,  'REQ-008', 'Dashboard & Analytics',               'Real-time dashboard showing hospital statistics, appointment trends, and resource utilization.',                                 'Functional',     'Should', 'Approved'),
  (9,  'REQ-009', 'Notification System',                 'Email and SMS notifications for appointments, lab results, and system alerts.',                                                  'Functional',     'Should', 'Approved'),
  (10, 'REQ-010', 'Data Export & Reporting',             'Export data in CSV, PDF, and Excel formats with customizable report templates.',                                                  'Functional',     'Should', 'Approved'),
  (11, 'REQ-011', 'Multi-Hospital Support',              'Support for 5 hospitals with centralized management and hospital-specific configurations.',                                      'Technical',      'Must',   'Approved'),
  (12, 'REQ-012', 'Role-Based Access Control',           'Granular permissions based on roles: Admin, Doctor, Nurse, Receptionist, Lab Tech, Patient.',                                    'Technical',      'Must',   'Implemented'),
  (13, 'REQ-013', 'Audit Trail Logging',                 'Log all data access and modifications for compliance and forensic analysis.',                                                    'Non-Functional', 'Should', 'Approved'),
  (14, 'REQ-014', 'System Performance',                  'Response time under 2 seconds for all pages, support 500 concurrent users.',                                                    'Non-Functional', 'Must',   'Approved'),
  (15, 'REQ-015', 'Data Backup & Recovery',              'Automated daily backups with point-in-time recovery and disaster recovery plan.',                                                'Non-Functional', 'Should', 'Approved'),
  -- Proposed requirements linked to Change Requests (NOT in approved scope)
  (16, 'REQ-016', 'AI-Based Preliminary Diagnosis',      'Machine learning module that suggests preliminary diagnoses based on symptoms, vital signs, and patient history.',               'Functional',     'Must',   'Proposed'),
  (17, 'REQ-017', 'Mobile Application',                  'Native iOS and Android mobile app for patients and doctors with appointment booking and consultation features.',                 'Functional',     'Must',   'Proposed');

-- ==================== WBS ITEMS ====================
-- Hierarchical: 1.0 → 1.1 → 1.1.1 etc.
-- Work packages (is_work_package=1) link to requirements
INSERT INTO wbs_items (id, code, title, description, parent_id, level, requirement_id, is_work_package, sort_order) VALUES
  -- Root
  (1,  '1.0',   'Smart Healthcare System',        'Top-level project deliverable',                    NULL, 0, NULL, 0, 1),
  -- Phase 1: Initiation
  (2,  '1.1',   'Project Initiation',             'Project planning and setup activities',             1,   1, NULL, 0, 1),
  (3,  '1.1.1', 'Project Charter & Planning',     'Create project charter and management plan',        2,   2, NULL, 1, 1),
  (4,  '1.1.2', 'Requirements Analysis',          'Gather and analyze all requirements',               2,   2, NULL, 1, 2),
  (5,  '1.1.3', 'Stakeholder Analysis',           'Identify and analyze all stakeholders',             2,   2, NULL, 1, 3),
  -- Phase 2: Design
  (6,  '1.2',   'System Design',                  'Design phase deliverables',                         1,   1, NULL, 0, 2),
  (7,  '1.2.1', 'UI/UX Design',                   'User interface and experience design',              6,   2, NULL, 1, 1),
  (8,  '1.2.2', 'Database Design',                'Database schema and data model design',             6,   2, NULL, 1, 2),
  (9,  '1.2.3', 'System Architecture',            'Overall system architecture and API design',        6,   2, NULL, 1, 3),
  -- Phase 3: Core Modules
  (10, '1.3',   'Core Module Development',         'Hospital management modules',                      1,   1, NULL, 0, 3),
  (11, '1.3.1', 'Appointment Scheduling Module',   'Patient appointment booking and management',       10,  2, 1,    1, 1),
  (12, '1.3.2', 'Laboratory Reports Module',       'Lab test report generation and tracking',          10,  2, 2,    1, 2),
  (13, '1.3.3', 'Doctor Schedules Module',         'Doctor shift and availability management',         10,  2, 3,    1, 3),
  (14, '1.3.4', 'Online Consultation Module',      'Video/audio consultation platform',                10,  2, 4,    1, 4),
  (15, '1.3.5', 'Hospital Billing Module',         'Billing and payment processing',                   10,  2, 5,    1, 5),
  (16, '1.3.6', 'Patient Record Management',       'Electronic health records management',             10,  2, 6,    1, 6),
  -- Phase 4: Integration
  (17, '1.4',   'System Integration',              'Integration and cross-cutting concerns',            1,   1, NULL, 0, 4),
  (18, '1.4.1', 'Frontend Integration',            'Frontend component integration and routing',        17,  2, 8,    1, 1),
  (19, '1.4.2', 'API Development',                 'Backend REST API development',                      17,  2, 7,    1, 2),
  (20, '1.4.3', 'Security Implementation',         'Authentication, RBAC, and security hardening',      17,  2, 12,   1, 3),
  -- Phase 5: Testing
  (21, '1.5',   'Testing & Quality Assurance',     'All testing activities',                            1,   1, NULL, 0, 5),
  (22, '1.5.1', 'Integration Testing',             'End-to-end integration test suite',                 21,  2, 14,   1, 1),
  (23, '1.5.2', 'Performance Testing',             'Load testing and performance benchmarks',           21,  2, 14,   1, 2),
  (24, '1.5.3', 'User Acceptance Testing',         'UAT with hospital staff',                           21,  2, NULL, 1, 3),
  (25, '1.5.4', 'Bug Fixing & Optimization',       'Resolve defects and optimize performance',          21,  2, NULL, 1, 4),
  -- Phase 6: Deployment
  (26, '1.6',   'Deployment & Closure',            'Deployment, training, and project closure',          1,   1, NULL, 0, 6),
  (27, '1.6.1', 'Deployment Preparation',          'Prepare production environment',                    26,  2, NULL, 1, 1),
  (28, '1.6.2', 'Server Configuration',            'Configure production servers and infrastructure',    26,  2, NULL, 1, 2),
  (29, '1.6.3', 'Data Migration',                  'Migrate existing data to new system',               26,  2, 15,   1, 3),
  (30, '1.6.4', 'User Training',                   'Train hospital staff on the new system',            26,  2, NULL, 1, 4),
  (31, '1.6.5', 'Documentation',                   'System and user documentation',                     26,  2, NULL, 1, 5),
  (32, '1.6.6', 'Project Closure & Handover',       'Final handover and project closure',                26,  2, NULL, 1, 6);

-- ==================== CHANGE REQUESTS ====================
-- CR-001 and CR-002 together add +PKR 800,000 and +3 weeks
INSERT INTO change_requests (id, code, title, description, justification, requested_by, cost_impact, schedule_impact_weeks, status) VALUES
  (1, 'CR-001', 'AI-Based Preliminary Diagnosis Module',
   'Add an AI/ML module that analyzes patient symptoms, vital signs, and history to suggest preliminary diagnoses for doctors to review.',
   'Hospital management requires AI-assisted diagnosis to reduce wait times and improve diagnostic accuracy. Similar systems show 30% faster triage.',
   'Hospital Board of Directors', 500000, 2, 'Submitted'),
  (2, 'CR-002', 'Mobile Application Development',
   'Develop native iOS and Android mobile applications for patients (appointment booking, reports) and doctors (schedule view, consultations).',
   'Over 70% of patients prefer mobile access. Competitor hospitals already offer mobile apps. Critical for patient satisfaction.',
   'Hospital Board of Directors', 300000, 1, 'Submitted');

-- Junction: link CRs to their proposed requirements
INSERT INTO change_request_requirements (change_request_id, requirement_id) VALUES
  (1, 16),   -- CR-001 → REQ-016 (AI Diagnosis)
  (2, 17);   -- CR-002 → REQ-017 (Mobile App)

-- ==================== ACTIVITIES ====================
-- 25 activities with realistic durations. Costs sum to EXACTLY PKR 5,000,000.
-- Planned dates are CPM-consistent with the dependency network.
-- % complete values are set so EVM computes CPI≈0.85, SPI≈0.88 at status date 2026-11-01.
--
-- Critical path: 1→2→4→13→16→18→19→20→22→23→25  (total 112 calendar days)

INSERT INTO activities (id, code, name, wbs_item_id, assignee_id, duration, planned_start, planned_end, actual_start, actual_finish, percent_complete, status, estimated_cost) VALUES
  -- Phase 1: Initiation
  (1,  'ACT-001', 'Project Initiation & Charter',    3,  1, 5,  '2026-09-07','2026-09-11', '2026-09-07','2026-09-11', 100, 'Completed',  100000),
  (2,  'ACT-002', 'Requirements Analysis',            4,  1, 8,  '2026-09-12','2026-09-19', '2026-09-12','2026-09-20', 100, 'Completed',  180000),
  (3,  'ACT-003', 'Stakeholder Analysis',              5,  1, 5,  '2026-09-12','2026-09-16', '2026-09-12','2026-09-16', 100, 'Completed',   70000),
  -- Phase 2: Design
  (4,  'ACT-004', 'UI/UX Design',                     7,  4, 14, '2026-09-20','2026-10-03', '2026-09-20','2026-10-05', 100, 'Completed',  250000),
  (5,  'ACT-005', 'Database Design',                   8,  6, 12, '2026-09-20','2026-10-01', '2026-09-20','2026-10-02', 100, 'Completed',  200000),
  (6,  'ACT-006', 'System Architecture Design',        9,  2, 14, '2026-09-20','2026-10-03', '2026-09-20','2026-10-04', 100, 'Completed',  180000),
  -- Phase 3: Development (parallel modules)
  (7,  'ACT-007', 'Appointment Scheduling Module',    11,  2, 45, '2026-10-02','2026-11-15', '2026-10-03', NULL,          65, 'In Progress', 450000),
  (8,  'ACT-008', 'Laboratory Reports Module',        12,  3, 38, '2026-10-02','2026-11-08', '2026-10-03','2026-11-10', 100, 'Completed',  320000),
  (9,  'ACT-009', 'Doctor Schedules Module',           13,  6, 45, '2026-10-02','2026-11-15', '2026-10-03', NULL,          78, 'In Progress', 350000),
  (10, 'ACT-010', 'Online Consultation Module',        14,  3, 48, '2026-10-02','2026-11-18', '2026-10-03','2026-11-18', 100, 'Completed',  380000),
  (11, 'ACT-011', 'Hospital Billing Module',           15,  3, 48, '2026-10-02','2026-11-18', '2026-10-03', NULL,          88, 'In Progress', 380000),
  (12, 'ACT-012', 'Patient Record Management',         16,  6, 38, '2026-10-02','2026-11-08', '2026-10-03', NULL,          78, 'In Progress', 300000),
  -- Phase 4: Integration
  (13, 'ACT-013', 'Frontend Integration',              18,  4, 55, '2026-10-04','2026-11-27', '2026-10-06', NULL,          75, 'In Progress', 350000),
  (14, 'ACT-014', 'API Development',                   19,  5, 42, '2026-10-04','2026-11-14', '2026-10-05','2026-11-16', 100, 'Completed',  280000),
  (15, 'ACT-015', 'Security Implementation',           20,  2, 45, '2026-10-04','2026-11-17', '2026-10-05','2026-11-17', 100, 'Completed',  200000),
  -- Phase 5: Testing
  (16, 'ACT-016', 'Integration Testing',               22,  7, 12, '2026-11-28','2026-12-09', '2026-11-28', NULL,           8, 'In Progress', 200000),
  (17, 'ACT-017', 'Performance Testing',                23,  7, 6,  '2026-12-10','2026-12-15',  NULL,         NULL,           0, 'Not Started', 100000),
  (18, 'ACT-018', 'User Acceptance Testing',            24,  7, 9,  '2026-12-10','2026-12-18',  NULL,         NULL,           0, 'Not Started', 150000),
  (19, 'ACT-019', 'Bug Fixing & Optimization',         25,  3, 3,  '2026-12-19','2026-12-21',  NULL,         NULL,           0, 'Not Started', 130000),
  -- Phase 6: Deployment
  (20, 'ACT-020', 'Deployment Preparation',            27,  2, 2,  '2026-12-22','2026-12-23',  NULL,         NULL,           0, 'Not Started',  80000),
  (21, 'ACT-021', 'Server Configuration',              28,  3, 2,  '2026-12-22','2026-12-23',  NULL,         NULL,           0, 'Not Started',  60000),
  (22, 'ACT-022', 'Data Migration',                    29,  6, 1,  '2026-12-24','2026-12-24',  NULL,         NULL,           0, 'Not Started', 100000),
  (23, 'ACT-023', 'User Training',                     30,  1, 2,  '2026-12-25','2026-12-26',  NULL,         NULL,           0, 'Not Started',  80000),
  (24, 'ACT-024', 'Documentation',                     31,  5, 4,  '2026-12-22','2026-12-25',  NULL,         NULL,           0, 'Not Started',  60000),
  (25, 'ACT-025', 'Project Closure & Handover',        32,  1, 1,  '2026-12-27','2026-12-27',  NULL,         NULL,           0, 'Not Started',  50000);

-- ==================== PROGRESS HISTORY ====================
-- Latest entries on or before 2026-12-01 reproduce the seeded activity progress
-- and provide dated history for earlier EVM status dates.
INSERT INTO progress_log (activity_id, date, percent_complete) VALUES
  (1, '2026-09-07', 0), (1, '2026-09-11', 100),
  (2, '2026-09-12', 0), (2, '2026-09-20', 100),
  (3, '2026-09-12', 0), (3, '2026-09-16', 100),
  (4, '2026-09-20', 0), (4, '2026-09-27', 50), (4, '2026-10-05', 100),
  (5, '2026-09-20', 0), (5, '2026-09-26', 50), (5, '2026-10-02', 100),
  (6, '2026-09-20', 0), (6, '2026-09-28', 50), (6, '2026-10-04', 100),
  (7, '2026-10-03', 0), (7, '2026-10-15', 25), (7, '2026-11-01', 65),
  (8, '2026-10-03', 0), (8, '2026-10-15', 50), (8, '2026-11-10', 100),
  (9, '2026-10-03', 0), (9, '2026-10-15', 30), (9, '2026-11-01', 78),
  (10, '2026-10-03', 0), (10, '2026-10-15', 35), (10, '2026-11-18', 100),
  (11, '2026-10-03', 0), (11, '2026-10-15', 30), (11, '2026-11-01', 88),
  (12, '2026-10-03', 0), (12, '2026-10-15', 30), (12, '2026-11-01', 78),
  (13, '2026-10-06', 0), (13, '2026-10-15', 20), (13, '2026-11-01', 75),
  (14, '2026-10-05', 0), (14, '2026-10-15', 40), (14, '2026-11-16', 100),
  (15, '2026-10-05', 0), (15, '2026-10-15', 40), (15, '2026-11-17', 100),
  (16, '2026-11-28', 0), (16, '2026-11-30', 8), (16, '2026-12-09', 100),
  (7, '2026-12-10', 100), (9, '2026-12-10', 100), (11, '2026-12-12', 100),
  (12, '2026-12-08', 100), (13, '2026-12-10', 100),
  (17, '2026-12-10', 0), (17, '2026-12-15', 100),
  (18, '2026-12-10', 0), (18, '2026-12-18', 100),
  (19, '2026-12-19', 0), (19, '2026-12-21', 100),
  (20, '2026-12-22', 0), (20, '2026-12-23', 100),
  (21, '2026-12-22', 0), (21, '2026-12-23', 100),
  (22, '2026-12-24', 100),
  (23, '2026-12-25', 0), (23, '2026-12-26', 100),
  (24, '2026-12-22', 0), (24, '2026-12-25', 100),
  (25, '2026-12-27', 100);

-- ==================== ACTIVITY DEPENDENCIES ====================
-- All Finish-to-Start (FS), lag = 0 unless noted
INSERT INTO activity_dependencies (activity_id, predecessor_id, dependency_type, lag_days) VALUES
  -- Initiation
  (2,  1,  'FS', 0),   -- Requirements after Initiation
  (3,  1,  'FS', 0),   -- Stakeholder after Initiation
  -- Design depends on Requirements
  (4,  2,  'FS', 0),   -- UI/UX after Requirements
  (5,  2,  'FS', 0),   -- DB Design after Requirements
  (6,  2,  'FS', 0),   -- Architecture after Requirements
  -- Development depends on DB Design (all modules need the schema)
  (7,  5,  'FS', 0),   -- Appointment after DB Design
  (8,  5,  'FS', 0),   -- Lab Reports after DB Design
  (9,  5,  'FS', 0),   -- Doctor Schedules after DB Design
  (10, 5,  'FS', 0),   -- Online Consultation after DB Design
  (11, 5,  'FS', 0),   -- Billing after DB Design
  (12, 5,  'FS', 0),   -- Patient Records after DB Design
  -- Integration depends on Design
  (13, 4,  'FS', 0),   -- Frontend Integration after UI/UX Design (critical path)
  (14, 6,  'FS', 0),   -- API after Architecture
  (15, 6,  'FS', 0),   -- Security after Architecture
  -- Integration Testing after ALL dev and integration tasks
  (16, 7,  'FS', 0),
  (16, 8,  'FS', 0),
  (16, 9,  'FS', 0),
  (16, 10, 'FS', 0),
  (16, 11, 'FS', 0),
  (16, 12, 'FS', 0),
  (16, 13, 'FS', 0),   -- Frontend Integration (critical path)
  (16, 14, 'FS', 0),
  (16, 15, 'FS', 0),
  -- Testing chain
  (17, 16, 'FS', 0),   -- Perf Testing after Integration Testing
  (18, 16, 'FS', 0),   -- UAT after Integration Testing (critical path)
  -- Bug Fixing after both testing tracks
  (19, 17, 'FS', 0),
  (19, 18, 'FS', 0),   -- (critical path)
  -- Deployment
  (20, 19, 'FS', 0),   -- Deployment after Bug Fixing (critical path)
  (21, 19, 'FS', 0),   -- Server Config after Bug Fixing
  (24, 19, 'FS', 0),   -- Documentation after Bug Fixing
  -- Data Migration after Deployment & Server Config
  (22, 20, 'FS', 0),   -- (critical path)
  (22, 21, 'FS', 0),
  -- Training after Migration
  (23, 22, 'FS', 0),   -- (critical path)
  -- Closure after Training & Documentation
  (25, 23, 'FS', 0),   -- (critical path)
  (25, 24, 'FS', 0);

-- ==================== EXPENSES ====================
-- Actual cost entries. Total AC = PKR 4,203,000 at status date.
-- Distributed across 2-4 entries per active activity for realism.

-- Activity 1: Budget 100K, Actual 112K (12% over)
INSERT INTO expenses (activity_id, date, amount, description) VALUES
  (1, '2026-09-08', 55000,  'Team kickoff meeting and project charter development'),
  (1, '2026-09-10', 57000,  'Initial project setup and stakeholder meetings');

-- Activity 2: Budget 180K, Actual 198K (10% over)
INSERT INTO expenses (activity_id, date, amount, description) VALUES
  (2, '2026-09-13', 68000,  'Requirements gathering workshops with hospital staff'),
  (2, '2026-09-16', 72000,  'Requirements analysis and documentation'),
  (2, '2026-09-19', 58000,  'Requirements review and prioritization sessions');

-- Activity 3: Budget 70K, Actual 74K
INSERT INTO expenses (activity_id, date, amount, description) VALUES
  (3, '2026-09-13', 38000,  'Stakeholder identification and analysis'),
  (3, '2026-09-15', 36000,  'Stakeholder communication planning');

-- Activity 4: Budget 250K, Actual 320K (28% over — design iteration overrun)
INSERT INTO expenses (activity_id, date, amount, description) VALUES
  (4, '2026-09-22', 85000,  'Wireframing and initial UI mockups'),
  (4, '2026-09-27', 95000,  'UI prototyping and usability testing'),
  (4, '2026-10-01', 80000,  'Design system and component library creation'),
  (4, '2026-10-03', 75000,  'Design review and final revisions');

-- Activity 5: Budget 200K, Actual 218K
INSERT INTO expenses (activity_id, date, amount, description) VALUES
  (5, '2026-09-22', 72000,  'ER diagram and schema design'),
  (5, '2026-09-26', 78000,  'Database normalization and optimization'),
  (5, '2026-10-01', 78000,  'Database implementation and testing');

-- Activity 6: Budget 180K, Actual 196K
INSERT INTO expenses (activity_id, date, amount, description) VALUES
  (6, '2026-09-22', 65000,  'Architecture planning and technology selection'),
  (6, '2026-09-28', 70000,  'API design and documentation'),
  (6, '2026-10-03', 61000,  'Architecture review and approval');

-- Activity 7: Budget 450K, 65% done, Actual 420K (rework due to critical defects)
INSERT INTO expenses (activity_id, date, amount, description) VALUES
  (7, '2026-10-06', 95000,  'Appointment booking interface development'),
  (7, '2026-10-12', 105000, 'Calendar integration and scheduling logic'),
  (7, '2026-10-18', 110000, 'Appointment management and notifications'),
  (7, '2026-10-25', 110000, 'Rework due to double-booking defect');

-- Activity 8: Budget 320K, 100% done, Actual 348K (finished late Oct 21)
INSERT INTO expenses (activity_id, date, amount, description) VALUES
  (8, '2026-10-06', 85000,  'Lab report template development'),
  (8, '2026-10-12', 92000,  'Report generation engine'),
  (8, '2026-10-17', 88000,  'Lab data integration and validation'),
  (8, '2026-10-20', 93000,  'Testing and PDF export feature');

-- Activity 9: Budget 350K, 78% done, Actual 285K
INSERT INTO expenses (activity_id, date, amount, description) VALUES
  (9, '2026-10-06', 70000,  'Schedule management UI development'),
  (9, '2026-10-13', 80000,  'Doctor availability algorithm'),
  (9, '2026-10-20', 75000,  'Shift management implementation'),
  (9, '2026-10-27', 60000,  'Integration with appointment system');

-- Activity 10: Budget 380K, 100% done, Actual 435K (finished on time but over budget)
INSERT INTO expenses (activity_id, date, amount, description) VALUES
  (10, '2026-10-06', 100000, 'Video consultation infrastructure setup'),
  (10, '2026-10-13', 110000, 'Real-time communication engine'),
  (10, '2026-10-19', 120000, 'Chat and file sharing features'),
  (10, '2026-10-24', 105000, 'Testing and optimization');

-- Activity 11: Budget 380K, 88% done, Actual 365K
INSERT INTO expenses (activity_id, date, amount, description) VALUES
  (11, '2026-10-06', 85000,  'Billing data model and calculation engine'),
  (11, '2026-10-14', 95000,  'Invoice generation system'),
  (11, '2026-10-21', 100000, 'Payment processing integration'),
  (11, '2026-10-28', 85000,  'Billing reports and analytics');

-- Activity 12: Budget 300K, 78% done, Actual 325K (rework due to defects)
INSERT INTO expenses (activity_id, date, amount, description) VALUES
  (12, '2026-10-06', 80000,  'Patient data model implementation'),
  (12, '2026-10-10', 90000,  'CRUD operations and search functionality'),
  (12, '2026-10-14', 85000,  'Data validation and deduplication logic'),
  (12, '2026-10-20', 70000,  'Rework for data integrity issues');

-- Activity 13: Budget 350K, 75% done, Actual 310K
INSERT INTO expenses (activity_id, date, amount, description) VALUES
  (13, '2026-10-08', 75000,  'Component library integration'),
  (13, '2026-10-15', 85000,  'Page layout and routing setup'),
  (13, '2026-10-22', 80000,  'State management and API integration'),
  (13, '2026-10-28', 80000,  'Responsive design and cross-browser testing');

-- Activity 14: Budget 280K, 100% done, Actual 305K (finished late Oct 22)
INSERT INTO expenses (activity_id, date, amount, description) VALUES
  (14, '2026-10-06', 78000,  'Core API endpoints development'),
  (14, '2026-10-12', 82000,  'Authentication and middleware'),
  (14, '2026-10-17', 80000,  'Data validation and error handling'),
  (14, '2026-10-21', 65000,  'API documentation and integration testing');

-- Activity 15: Budget 200K, 100% done, Actual 215K
INSERT INTO expenses (activity_id, date, amount, description) VALUES
  (15, '2026-10-06', 55000,  'Authentication system setup'),
  (15, '2026-10-13', 60000,  'RBAC implementation'),
  (15, '2026-10-19', 55000,  'Security audit and hardening'),
  (15, '2026-10-24', 45000,  'Penetration testing and fixes');

-- Activity 16: Budget 200K, 8% done, Actual 22K
INSERT INTO expenses (activity_id, date, amount, description) VALUES
  (16, '2026-11-28', 22000,  'Test environment setup and configuration'),
  (16, '2026-11-30', 10000,  'Initial integration test case development');

-- Re-date costs within each activity window so cumulative AC follows the work
-- curve instead of front-loading all expenditure.
UPDATE expenses SET date = '2026-10-03' WHERE id = 10;
UPDATE expenses SET date = '2026-10-01' WHERE id = 14;
UPDATE expenses SET date = '2026-10-02' WHERE id = 9;
UPDATE expenses SET date = '2026-10-18' WHERE id = 18;
UPDATE expenses SET date = '2026-10-20' WHERE id = 22;
UPDATE expenses SET date = '2026-10-20' WHERE id = 26;
UPDATE expenses SET date = '2026-10-19' WHERE id = 30;
UPDATE expenses SET date = '2026-11-05' WHERE id = 19;
UPDATE expenses SET date = '2026-11-04' WHERE id = 23;
UPDATE expenses SET date = '2026-11-05' WHERE id = 27;
UPDATE expenses SET date = '2026-11-05' WHERE id = 31;
UPDATE expenses SET date = '2026-11-16' WHERE id = 32;
UPDATE expenses SET date = '2026-11-16' WHERE id = 33;
UPDATE expenses SET date = '2026-11-17' WHERE id = 37;
UPDATE expenses SET date = '2026-11-16' WHERE id = 45;
UPDATE expenses SET date = '2026-11-16' WHERE id = 53;
INSERT INTO expenses (activity_id, date, amount, description) VALUES
  (16, '2026-12-09', 168000, 'Integration testing execution and defect retest'),
  (17, '2026-12-15', 100000, 'Performance test execution and analysis'),
  (18, '2026-12-18', 150000, 'User acceptance sessions and sign-off preparation'),
  (19, '2026-12-21', 130000, 'Defect fixing and optimization sprint'),
  (20, '2026-12-23', 80000,  'Deployment preparation and release packaging'),
  (21, '2026-12-23', 60000,  'Production server configuration'),
  (22, '2026-12-24', 10000,  'Patient data migration execution'),
  (23, '2026-12-26', 20000,  'Hospital staff training sessions'),
  (24, '2026-12-25', 40000,  'Operational and handover documentation'),
  (25, '2026-12-27', 39000,  'Project closure and handover archive');

-- ==================== MILESTONES ====================
INSERT INTO milestones (id, name, planned_date, actual_date, status, description) VALUES
  (1, 'Project Kickoff',             '2026-09-11', '2026-09-11', 'Completed',   'Project charter approved and team onboarded'),
  (2, 'Design Phase Complete',       '2026-10-03', '2026-10-05', 'Completed',   'All design deliverables reviewed and approved'),
  (3, 'Core Development Complete',   '2026-11-27', NULL,         'In Progress', 'All 6 core hospital modules developed and integrated'),
  (4, 'Testing Phase Complete',      '2026-12-18', NULL,         'Not Started', 'Integration testing and UAT completed'),
  (5, 'Go-Live & Project Handover',  '2026-12-27', NULL,         'Not Started', 'System deployed, staff trained, project closed');

-- Link milestones to activities
INSERT INTO milestone_activities (milestone_id, activity_id) VALUES
  (1, 1),                   -- Kickoff → Project Initiation
  (2, 4), (2, 5), (2, 6),  -- Design → UI/UX, DB Design, Architecture
  (3, 7), (3, 8), (3, 9), (3, 10), (3, 11), (3, 12),  -- Core Dev → all modules
  (4, 16), (4, 17), (4, 18), (4, 19),                   -- Testing → all test activities
  (5, 23), (5, 25);         -- Go-Live → Training, Closure

-- ==================== RESPONSIBILITIES (RACI) ====================
INSERT INTO responsibilities (team_member_id, deliverable, responsibility_type) VALUES
  -- Ahmad Khan (PM) — Accountable for everything, Responsible for charter
  (1, 'Project Charter',       'R'), (1, 'Project Charter',       'A'),
  (1, 'Requirements Document', 'R'), (1, 'Requirements Document', 'A'),
  (1, 'System Design',         'A'),
  (1, 'Core Modules',          'A'),
  (1, 'Integration',           'A'),
  (1, 'Testing',               'A'),
  (1, 'Deployment',            'A'),
  -- Sarah Ali (Sr. Backend)
  (2, 'Project Charter',       'C'),
  (2, 'System Architecture',   'R'),
  (2, 'Core Modules',          'R'),
  (2, 'API & Backend',         'R'),
  (2, 'Security Module',       'R'),
  (2, 'Deployment',            'R'),
  -- Hassan Raza (Backend)
  (3, 'Core Modules',          'R'),
  (3, 'API & Backend',         'C'),
  (3, 'Deployment',            'R'),
  (3, 'Testing',               'C'),
  -- Fatima Noor (Sr. Frontend)
  (4, 'UI/UX Design',          'R'),
  (4, 'Frontend Application',  'R'),
  (4, 'Core Modules',          'C'),
  -- Omar Malik (Frontend)
  (5, 'UI/UX Design',          'C'),
  (5, 'Frontend Application',  'R'),
  (5, 'API & Backend',         'R'),
  (5, 'Documentation',         'R'),
  -- Ayesha Siddiqui (DB)
  (6, 'Database Schema',       'R'),
  (6, 'Core Modules',          'R'),
  (6, 'Data Migration',        'R'),
  -- Bilal Ahmed (QA)
  (7, 'Testing',               'R'),
  (7, 'Quality Assurance',     'R'),
  (7, 'Core Modules',          'C'),
  (7, 'Deployment',            'C');

-- ==================== DEFECTS ====================
INSERT INTO defects (id, code, title, description, activity_id, wbs_item_id, severity, assignee_id, status, reported_date, resolved_date) VALUES
  (1,  'DEF-001', 'Double Booking in Appointment Scheduling',
   'System allows two patients to book the same time slot with the same doctor. No conflict detection implemented.',
   7, 11, 'Critical', 2, 'Open', '2026-10-18', NULL),

  (2,  'DEF-002', 'Patient Records Not Saving',
   'New patient records intermittently fail to save. No error shown to user, data silently lost.',
   12, 16, 'Critical', 6, 'Open', '2026-10-14', NULL),

  (3,  'DEF-003', 'Duplicate Patient Records Created',
   'Rapid form submission creates duplicate patient entries. No idempotency check on the insert endpoint.',
   12, 16, 'High', 6, 'Open', '2026-10-15', NULL),

  (4,  'DEF-004', 'Lab Report PDF Export Failure',
   'PDF generation crashes when report contains special characters (e.g. Urdu names). Encoding issue in template engine.',
   8, 12, 'Medium', 3, 'In Progress', '2026-10-19', NULL),

  (5,  'DEF-005', 'Doctor Schedule Overlap Warning Missing',
   'System does not warn when a doctor is assigned overlapping shifts. Can cause scheduling conflicts.',
   9, 13, 'Medium', 6, 'Open', '2026-10-20', NULL),

  (6,  'DEF-006', 'Consultation Video Call Drops After 15 Min',
   'WebRTC connection drops after approximately 15 minutes. ICE candidate refresh not implemented.',
   10, 14, 'High', 3, 'In Progress', '2026-10-22', NULL),

  (7,  'DEF-007', 'Billing Calculation Rounding Error',
   'Tax calculations lose precision due to floating-point rounding. Discrepancy of PKR 1-2 per invoice.',
   11, 15, 'Medium', 3, 'Resolved', '2026-10-21', '2026-10-26'),

  (8,  'DEF-008', 'Login Session Timeout Too Short',
   'User sessions expire after 5 minutes of inactivity. Should be 30 minutes per hospital policy.',
   15, 20, 'Low', 2, 'Resolved', '2026-10-15', '2026-10-18'),

  (9,  'DEF-009', 'Search Results Not Paginated',
   'Patient search returns all results without pagination. Causes browser lag with large datasets.',
   13, 18, 'Low', 4, 'Open', '2026-10-25', NULL),

  (10, 'DEF-010', 'Dashboard Load Time Exceeds 5 Seconds',
   'Main dashboard queries are not optimized. Aggregation queries take 5-8 seconds on test data.',
   13, 18, 'Medium', 4, 'Open', '2026-10-27', NULL);

-- ==================== QUALITY CHECKLISTS ====================
INSERT INTO quality_checklists (id, name, wbs_item_id) VALUES
  (1, 'Appointment Module Quality Checklist',  11),
  (2, 'Patient Records Quality Checklist',     16),
  (3, 'Lab Reports Quality Checklist',         12),
  (4, 'Security Module Quality Checklist',     20);

INSERT INTO checklist_items (id, checklist_id, description, sort_order) VALUES
  -- Checklist 1: Appointment Module
  (1,  1, 'Patient can book an appointment successfully',              1),
  (2,  1, 'Double booking prevention works correctly',                 2),
  (3,  1, 'Appointment cancellation and rescheduling functional',      3),
  (4,  1, 'Calendar view displays appointments correctly',             4),
  (5,  1, 'Notification sent on booking confirmation',                 5),
  -- Checklist 2: Patient Records
  (6,  2, 'New patient record can be created',                         1),
  (7,  2, 'Existing patient record can be edited',                     2),
  (8,  2, 'Patient search by name and ID works',                       3),
  (9,  2, 'Patient data validation enforced',                          4),
  (10, 2, 'Patient data export functional',                            5),
  -- Checklist 3: Lab Reports
  (11, 3, 'Lab report generation works correctly',                     1),
  (12, 3, 'PDF export produces valid document',                        2),
  (13, 3, 'Report template renders all fields',                        3),
  (14, 3, 'Data accuracy validated against source',                    4),
  -- Checklist 4: Security
  (15, 4, 'User authentication working correctly',                     1),
  (16, 4, 'Role-based access control enforced',                        2),
  (17, 4, 'Session management and timeout working',                    3),
  (18, 4, 'Data encryption at rest and in transit',                    4),
  (19, 4, 'SQL injection prevention verified',                         5);

-- Inspection results (tested by Bilal, QA Engineer, id=7)
INSERT INTO inspection_results (checklist_item_id, result, tester_id, test_date, remarks) VALUES
  -- Appointment (3 pass, 2 fail)
  (1,  'Fail',       7, '2026-10-22', 'Basic booking works but edge cases fail with concurrent requests'),
  (2,  'Fail',       7, '2026-10-22', 'Double booking occurs — related to DEF-001'),
  (3,  'Pass',       7, '2026-10-22', 'Cancellation and reschedule working correctly'),
  (4,  'Pass',       7, '2026-10-22', 'Calendar displays correctly across all views'),
  (5,  'Not Tested', 7, '2026-10-22', 'Notification system not yet integrated'),
  -- Patient Records (2 pass, 2 fail, 1 not tested)
  (6,  'Fail',       7, '2026-10-18', 'Record creation intermittently fails — DEF-002'),
  (7,  'Pass',       7, '2026-10-18', 'Edit functionality working as expected'),
  (8,  'Pass',       7, '2026-10-18', 'Search by name and hospital ID functional'),
  (9,  'Fail',       7, '2026-10-18', 'Validation bypassed on rapid submission — DEF-003'),
  (10, 'Not Tested', 7, '2026-10-18', 'Export feature not yet implemented'),
  -- Lab Reports (3 pass, 1 fail)
  (11, 'Pass',       7, '2026-10-20', 'Report generated correctly for standard cases'),
  (12, 'Fail',       7, '2026-10-20', 'PDF crashes with Urdu characters — DEF-004'),
  (13, 'Pass',       7, '2026-10-20', 'All template fields render properly'),
  (14, 'Pass',       7, '2026-10-20', 'Data matches source laboratory system'),
  -- Security (all pass)
  (15, 'Pass',       7, '2026-10-24', 'Login with MFA working correctly'),
  (16, 'Pass',       7, '2026-10-24', 'RBAC prevents unauthorized access'),
  (17, 'Pass',       7, '2026-10-24', 'Session timeout updated to 30 min after DEF-008 fix'),
  (18, 'Pass',       7, '2026-10-24', 'TLS 1.3 verified, AES-256 at rest'),
  (19, 'Pass',       7, '2026-10-24', 'Parameterized queries verified across all endpoints');

-- ==================== RISKS ====================
INSERT INTO risks (id, code, title, description, category, likelihood, impact, score, status, owner_id, mitigation_plan, contingency_plan) VALUES
  (1,  'RSK-001', 'Scope Creep from Hospital Management',
   'Hospital management may continue requesting new features beyond the approved scope, extending timeline and budget.',
   'Scope', 4, 5, 20, 'Open', 1,
   'Implement formal change control process. All new requests go through CR workflow.',
   'Negotiate scope reduction or additional funding.'),

  (2,  'RSK-002', 'Key Developer Resignation',
   'Loss of a senior developer could severely impact project timeline, especially during critical development phase.',
   'Resource', 2, 5, 10, 'Open', 1,
   'Cross-train team members. Document all code and architecture decisions.',
   'Engage contract developer. Redistribute workload among remaining team.'),

  (3,  'RSK-003', 'System Integration Failures',
   'Integration between independently developed modules may fail, requiring significant rework.',
   'Technical', 3, 4, 12, 'Open', 2,
   'Define clear API contracts early. Conduct incremental integration testing.',
   'Allocate additional integration sprint. Simplify integration points.'),

  (4,  'RSK-004', 'Patient Data Privacy Breach',
   'Unauthorized access to patient health records could violate regulations and damage hospital reputation.',
   'Security', 2, 5, 10, 'Open', 2,
   'Implement encryption, RBAC, audit logging. Regular security audits.',
   'Immediate incident response. Notify affected parties per regulations.'),

  (5,  'RSK-005', 'Budget Overrun',
   'Current spending trend (CPI 0.85) indicates project will exceed approved budget by ~18%.',
   'Cost', 4, 4, 16, 'Open', 1,
   'Weekly cost reviews. Identify and cut non-essential activities. Negotiate scope.',
   'Request additional budget approval from sponsor.'),

  (6,  'RSK-006', 'Schedule Delay',
   'Critical path activities are delayed. Appointment scheduling and patient records modules behind schedule.',
   'Schedule', 4, 4, 16, 'Open', 1,
   'Fast-track parallel activities. Add overtime for critical path tasks.',
   'Request deadline extension. Reduce testing scope for non-critical modules.'),

  (7,  'RSK-007', 'Third-Party API Changes',
   'External payment gateway or video calling API may introduce breaking changes during development.',
   'Technical', 3, 3, 9, 'Open', 2,
   'Pin API versions. Implement adapter pattern for external dependencies.',
   'Switch to alternative API provider. Implement fallback mechanisms.'),

  (8,  'RSK-008', 'Server Downtime During Deployment',
   'Production server issues during deployment could cause extended system unavailability for hospitals.',
   'Technical', 2, 4, 8, 'Mitigated', 3,
   'Plan blue-green deployment. Prepare rollback scripts. Schedule off-peak deployment.',
   'Immediate rollback to previous version. Parallel legacy system operation.'),

  (9,  'RSK-009', 'Incomplete or Ambiguous Requirements',
   'Some requirements may be discovered to be incomplete during development, causing rework.',
   'Scope', 3, 4, 12, 'Open', 1,
   'Regular requirements review sessions with stakeholders. Maintain RTM.',
   'Prioritize core requirements. Defer ambiguous features to Phase 2.'),

  (10, 'RSK-010', 'Testing Resource Shortage',
   'Single QA engineer may be insufficient for thorough testing of all modules within timeline.',
   'Resource', 3, 3, 9, 'Open', 7,
   'Implement developer unit testing. Use automated testing frameworks.',
   'Engage external QA consultant. Extend testing phase.');

-- ==================== PDPC ITEMS ====================
-- Tree structure: Objective → Activity → Potential Problem → Preventive → Corrective

-- PDPC 1: Appointment System Reliability
INSERT INTO pdpc_items (id, parent_id, node_type, title, description, risk_id, color) VALUES
  (1,  NULL, 'objective',  'Reliable Appointment System',       'Ensure appointment scheduling works without errors for all 5 hospitals', NULL,  '#0ea5e9'),
  (2,  1,    'activity',   'Develop Scheduling Module',          'Build appointment booking, rescheduling, and cancellation features',     NULL,  '#8b5cf6'),
  (3,  2,    'problem',    'Double Booking Occurs',              'Two patients booked for the same slot with the same doctor',             1,     '#ef4444'),
  (4,  3,    'preventive', 'Implement Database-Level Locks',     'Use SELECT FOR UPDATE or advisory locks on time slots',                  NULL,  '#22c55e'),
  (5,  3,    'corrective', 'Add Conflict Resolution UI',         'Show conflict dialog and suggest alternative slots',                     NULL,  '#f59e0b'),
  (6,  2,    'problem',    'System Overload During Peak Hours',  'High concurrent bookings crash the scheduling engine',                   NULL,  '#ef4444'),
  (7,  6,    'preventive', 'Implement Rate Limiting',            'Throttle booking requests per user and per time window',                 NULL,  '#22c55e'),
  (8,  6,    'corrective', 'Queue-Based Booking System',         'Move to async queue processing for appointment requests',                NULL,  '#f59e0b');

-- PDPC 2: Patient Data Integrity
INSERT INTO pdpc_items (id, parent_id, node_type, title, description, risk_id, color) VALUES
  (9,  NULL, 'objective',  'Accurate Patient Data Management',  'Ensure patient records are always accurate and consistent',               NULL,  '#0ea5e9'),
  (10, 9,    'activity',   'Build Patient Record System',        'Develop CRUD operations for electronic health records',                   NULL,  '#8b5cf6'),
  (11, 10,   'problem',    'Records Fail to Save',               'New records intermittently lost due to transaction failures',              4,     '#ef4444'),
  (12, 11,   'preventive', 'Add Transaction Logging',            'Log all write operations with rollback capability',                       NULL,  '#22c55e'),
  (13, 11,   'corrective', 'Implement Auto-Save Mechanism',      'Periodically auto-save draft records to prevent data loss',               NULL,  '#f59e0b'),
  (14, 10,   'problem',    'Duplicate Records Created',          'Rapid submission creates multiple identical patient entries',              NULL,  '#ef4444'),
  (15, 14,   'preventive', 'Unique Constraint on Patient ID',    'Enforce unique index on national ID + hospital combination',              NULL,  '#22c55e'),
  (16, 14,   'corrective', 'Build Record Merge Tool',            'Tool to identify and merge duplicate patient records',                    NULL,  '#f59e0b');

-- PDPC 3: Smooth Deployment
INSERT INTO pdpc_items (id, parent_id, node_type, title, description, risk_id, color) VALUES
  (17, NULL, 'objective',  'Smooth System Deployment',          'Deploy system to all 5 hospitals without disruption',                     NULL,  '#0ea5e9'),
  (18, 17,   'activity',   'Deploy to Production',               'Configure servers, migrate data, and go live',                            NULL,  '#8b5cf6'),
  (19, 18,   'problem',    'Server Downtime During Deployment', 'Extended unavailability during migration causes hospital disruption',     8,     '#ef4444'),
  (20, 19,   'preventive', 'Blue-Green Deployment Strategy',    'Maintain parallel environments for zero-downtime cutover',                NULL,  '#22c55e'),
  (21, 19,   'corrective', 'Immediate Rollback Plan',           'Scripted rollback to restore previous version within 15 minutes',        NULL,  '#f59e0b'),
  (22, 18,   'problem',    'Data Loss During Migration',        'Patient or billing data corrupted or lost during database migration',     NULL,  '#ef4444'),
  (23, 22,   'preventive', 'Full Backup Before Migration',      'Complete database backup with verification before any migration step',   NULL,  '#22c55e'),
  (24, 22,   'corrective', 'Point-in-Time Recovery',            'Restore from backup to exact pre-migration state',                       NULL,  '#f59e0b');

-- ==================== EVM SNAPSHOTS ====================
-- Historical snapshots showing the trend (CPI/SPI declining over time)
INSERT INTO evm_snapshots (snapshot_date, bac, pv, ev, ac, cv, sv, cpi, spi, eac, etc_val, vac, tcpi) VALUES
  ('2026-09-20', 5000000,  360000,  360000,  391000,  -31000,  0,       0.921, 1.000, 5429968, 5038968, -429968, 1.007),
  ('2026-10-04', 5000000,  990000,  960000,  1079000, -119000, -30000,  0.890, 0.970, 5618000, 4539000, -618000, 1.030),
  ('2026-10-18', 5000000,  2600000, 2366000, 2719000, -353000, -234000, 0.870, 0.910, 5747126, 3028126, -747126, 1.155),
  ('2026-11-01', 5000000,  4056667, 3572400, 4203000, -630600, -484267, 0.850, 0.881, 5882353, 1679353, -882353, 1.791);

-- ==================== PROJECT CLOSURE (draft) ====================
INSERT INTO project_closure (id, charter_id, status) VALUES (1, 1, 'Draft');

-- ==================== AUDIT LOG (initial entries) ====================
INSERT INTO audit_log (entity_type, entity_id, action, details, user_name, created_at) VALUES
  ('project_charter', 1, 'CREATED',  '{"title":"Smart Healthcare Management System"}', 'Ahmad Khan', '2026-09-07 09:00:00'),
  ('project_charter', 1, 'APPROVED', '{"approval_status":"Approved"}', 'Hospital Board', '2026-09-07 10:00:00'),
  ('requirement', 1,  'APPROVED', '{"code":"REQ-001","status":"Approved"}', 'Ahmad Khan', '2026-09-15 10:00:00'),
  ('requirement', 2,  'APPROVED', '{"code":"REQ-002","status":"Approved"}', 'Ahmad Khan', '2026-09-15 10:05:00'),
  ('requirement', 7,  'APPROVED', '{"code":"REQ-007","status":"Approved"}', 'Ahmad Khan', '2026-09-15 10:10:00'),
  ('requirement', 12, 'APPROVED', '{"code":"REQ-012","status":"Approved"}', 'Ahmad Khan', '2026-09-15 10:15:00'),
  ('change_request', 1, 'CREATED', '{"code":"CR-001","title":"AI-Based Preliminary Diagnosis Module","cost_impact":500000}', 'Hospital Board', '2026-10-20 14:00:00'),
  ('change_request', 2, 'CREATED', '{"code":"CR-002","title":"Mobile Application Development","cost_impact":300000}', 'Hospital Board', '2026-10-22 11:00:00'),
  ('milestone', 1, 'COMPLETED', '{"name":"Project Kickoff","actual_date":"2026-09-11"}', 'Ahmad Khan', '2026-09-11 17:00:00'),
  ('milestone', 2, 'COMPLETED', '{"name":"Design Phase Complete","actual_date":"2026-10-05"}', 'Ahmad Khan', '2026-10-05 17:00:00'),
  ('defect', 1, 'CREATED', '{"code":"DEF-001","severity":"Critical","title":"Double Booking"}', 'Bilal Ahmed', '2026-10-18 14:30:00'),
  ('defect', 2, 'CREATED', '{"code":"DEF-002","severity":"Critical","title":"Records Not Saving"}', 'Bilal Ahmed', '2026-10-14 11:00:00'),
  ('database', NULL, 'SEEDED', '{"message":"Database seeded with demo data"}', 'System', datetime('now'));
