PRAMĀṆA

Automated KYC Document Verification System

Detailed Project Specification • MVP Scope • Architecture • Workflow • Technology Stack

Cloud Computing Mini Project

AWS-based • FastAPI • Next.js • PostgreSQL • Human-in-the-loop KYC


# 1. Project Overview

Pramāṇa is a cloud-based KYC document verification platform designed to automate the collection, extraction, comparison, and review of customer identity documents. The system accepts KYC documents such as Aadhaar and Voter ID, stores them securely in Amazon S3, extracts information using Amazon Textract, compares the extracted values against existing customer/company records, and routes mismatches to an administrator for human review.

The core design is human-in-the-loop: automation performs the repetitive extraction and matching work, while an authorized admin/auditor makes the final decision when a mismatch requires manual intervention. Any admin change to customer information is recorded in an immutable-style application audit history containing the old value, new value, admin identity, reason/action, customer ID, and timestamp.


# 2. Problem Statement

Traditional KYC processing can involve manually reading documents, entering data, comparing it with customer records, and communicating the final status. This is time-consuming and creates opportunities for transcription errors and inconsistent review. Pramāṇa aims to reduce this manual workload while preserving human oversight and traceability.


# 3. Objectives

- Allow customers to securely submit KYC documents.

- Store uploaded documents in cloud object storage.

- Automatically extract relevant information from submitted documents.

- Normalize and compare extracted fields with existing customer/company data.

- Automatically identify matching and mismatching fields.

- Route exceptions to an admin for manual review.

- Allow authorized admins to process, update, or reject a KYC request.

- Maintain a detailed audit trail for administrative data changes.

- Notify customers when KYC processing is completed.

- Deploy the complete working application on AWS using a custom VPC and cloud-managed services.

- Demonstrate secure cloud architecture, least-privilege IAM, monitoring, and cost control.


# 4. MVP Definition



| MVP Area | Included |

| --- | --- |

| Roles | Customer and Admin/Auditor |

| Documents | Aadhaar and Voter ID |

| Storage | Amazon S3 |

| Extraction | Amazon Textract |

| Database | PostgreSQL on Amazon RDS |

| Backend | FastAPI running on EC2 |

| Frontend | Next.js |

| Verification | Application-built field matching engine |

| Review | Admin dashboard with match/mismatch details |

| Actions | Process, Update & Process, Reject |

| Audit | Admin changes recorded with before/after values and reason |

| Notification | Email notification through Amazon SES |

| Secrets | AWS Systems Manager Parameter Store |

| Security | IAM least privilege, Security Groups, private RDS |

| Monitoring | Amazon CloudWatch |

| Cost | AWS Budgets |

The MVP is intentionally focused on one complete, demonstrable KYC journey rather than trying to implement every possible banking KYC capability.


# 5. Users and Roles



| Role | Responsibilities | Main Features |

| --- | --- | --- |

| Customer | Submits and tracks KYC | Login, profile, upload documents, submit KYC, view status, receive completion notification |

| Admin / Auditor | Reviews and processes KYC | Login, pending queue, review extracted data, compare fields, process, update, reject, view audit history |


# 6. End-to-End Workflow

Primary MVP flow:

1. Customer logs in.

2. Customer opens the KYC section.

3. Customer uploads Aadhaar and Voter ID.

4. FastAPI validates the request and stores document files in Amazon S3.

5. Backend invokes Amazon Textract for document text/data extraction.

6. Extracted fields are normalized by the application.

7. Verification engine compares extracted values against the customer's existing record in RDS.

8. Each field receives a match/mismatch result.

9. Overall KYC request becomes automatically verified/ready-to-process or is routed to manual review.

10. Admin opens the pending KYC request.

11. Admin sees existing customer data, extracted document data, and comparison results.

12. If information is correct, admin processes the request without changing customer data.

13. If the document is valid but customer data is outdated/wrong, admin updates the required field and processes the request.

14. Every admin data change creates an audit record containing customer ID, field, old value, new value, admin identity, reason/action, and timestamp.

15. KYC status becomes VERIFIED or REJECTED.

16. Customer receives an email notification through SES.


# 7. Workflow Decision Logic



| Condition | System Result | Admin Action |

| --- | --- | --- |

| All required fields match | Ready / automatic match | Process and confirm KYC |

| One or more fields mismatch | Manual Review | Inspect document and existing data |

| Mismatch is legitimate because company data is outdated | Update required | Update & Process |

| Document/data appears invalid or unacceptable | Rejected | Reject with reason |


# 8. Verification Engine

The verification engine is application logic written by the project team. AWS Textract does not perform identity verification; it extracts information from the document. Pramāṇa decides whether extracted values agree with the application's trusted customer record.

- Field extraction: name, date of birth/age, address, document number and other supported fields.

- Normalization: trim whitespace, normalize case, remove unnecessary punctuation, normalize date formats.

- Exact matching for fields where exact equality is appropriate.

- Fuzzy/normalized matching for fields such as names and addresses where formatting can differ.

- Per-field result: MATCH, MISMATCH, or UNAVAILABLE/UNCERTAIN.

- Overall result based on configurable business rules.

- Store the extracted data and verification result so the admin can inspect why the system reached its decision.


## 9. Example Verification

Illustrative thresholds such as 3/3 fields matching = verified and partial matching = manual review can be configured during implementation. The exact production KYC decision policy should not be presented as a real regulatory rule; it is a project demonstration rule.


# 10. Customer Features — MVP

- Customer login/logout.

- Customer dashboard.

- View basic customer profile and existing KYC status.

- Upload Aadhaar.

- Upload Voter ID.

- Submit KYC verification request.

- View document submission state.

- View KYC status: NOT VERIFIED, UNDER REVIEW, VERIFIED, or REJECTED.

- Receive email after final processing.

- Display basic verification outcome and, where appropriate, a reason/status message.


# 11. Admin Features — MVP

- Admin login/logout.

- Pending KYC request dashboard.

- Search/filter KYC requests.

- Open a customer's verification details.

- View existing customer/company data.

- View extracted document data.

- View field-by-field match/mismatch results.

- Process a valid KYC request.

- Update customer data when a verified document establishes that existing data is outdated or incorrect.

- Update & Process KYC in one controlled workflow.

- Reject a request with a reason.

- View audit history for administrative changes.

- View the admin identity associated with an action.


# 12. Document Management

- Actual uploaded files are stored in Amazon S3, not directly inside PostgreSQL.

- RDS stores document metadata such as customer ID, document type, S3 object key, status, and timestamps.

- MVP supports Aadhaar and Voter ID.

- Backend validates file type/size before accepting uploads.

- Object naming should avoid collisions and should not expose sensitive information in public URLs.

- S3 access should be private; the backend accesses objects using its IAM role.

- The application should not make KYC documents publicly readable.


# 13. Customer Data and Baseline Records

For the MVP, the application contains an existing customer/company dataset that acts as the baseline for comparison. This is essential because verification requires a reference record.

- Example fields: customer ID, name, date of birth/age, address, phone/email, KYC status.

- A customer may already exist in the company's database before submitting documents.

- The submitted document is compared with this existing record.

- Optional future extension: new customer onboarding where a new applicant creates an initial profile before KYC.


# 14. Admin Audit Trail



| Audit Field | Purpose |

| --- | --- |

| Customer ID | Identifies whose record changed |

| Admin ID / Identity | Identifies who performed the action |

| Field Changed | Identifies the modified field |

| Old Value | Preserves the value before the change |

| New Value | Preserves the value after the change |

| Action / Reason | Explains why the change was made |

| Timestamp | Records when the action occurred |

Auditability is a major feature of Pramāṇa. Whenever an admin changes customer data as part of manual KYC resolution, the application records the change.

Example: Customer C10231 → Field: Name → Old: 'Armaan Syed' → New: 'Armaan Sayed' → Admin: admin01 → Reason: 'Verified against submitted identity document' → Timestamp recorded.


# 15. Technology Stack



| Layer | Technology | Purpose |

| --- | --- | --- |

| Frontend | Next.js | Customer and admin web interfaces |

| Backend | Python + FastAPI | REST API, business logic, authentication, workflow orchestration |

| Database | PostgreSQL | Users, customers, documents metadata, verification records, audit logs |

| ORM / DB layer | SQLAlchemy or equivalent | Database models and queries |

| Containerization | Docker | Package backend/frontend services for repeatable deployment |

| Reverse Proxy | Nginx | Route web traffic to frontend/backend and provide a single entry point |

| Cloud Compute | Amazon EC2 | Runs the application containers |

| Object Storage | Amazon S3 | Stores uploaded KYC documents |

| Document Extraction | Amazon Textract | Extracts text/data from submitted documents |

| Managed Database | Amazon RDS for PostgreSQL | Cloud-hosted relational database |

| Email | Amazon SES | KYC completion notifications |

| Identity/Permissions | AWS IAM | Least-privilege access between AWS services |

| Secrets/Config | AWS Systems Manager Parameter Store | Sensitive configuration and application parameters |

| Networking | Amazon VPC | Custom isolated cloud network |

| Network Security | Security Groups | Control traffic between EC2/RDS and internet |

| Monitoring | Amazon CloudWatch | Logs, metrics, alarms |

| Cost Management | AWS Budgets | Monitor cloud spending/credits |

| Version Control | Git + GitHub | Source code and team collaboration |


# 16. AWS Architecture

The backend is fully cloud-hosted. FastAPI runs on EC2; the database is Amazon RDS; KYC documents are stored in S3; Textract performs managed extraction; SES sends notifications; and the surrounding AWS services provide networking, permissions, configuration, monitoring, and cost control.

High-level architecture:

Internet

↓

Nginx on EC2

├──→ Next.js frontend

└──→ FastAPI backend

├──→ Amazon RDS PostgreSQL

├──→ Amazon S3

├──→ Amazon Textract

├──→ Amazon SES

└──→ AWS Systems Manager Parameter Store

EC2 uses an IAM Role for AWS API access.

CloudWatch receives application/system logs and metrics.

AWS Budgets monitors project spending.

RDS remains private and accepts PostgreSQL traffic only from the EC2 security group.


# 17. AWS Services — What AWS Provides vs What We Build



| AWS Service | AWS Provides | Pramāṇa Must Build |

| --- | --- | --- |

| EC2 | Cloud VM/compute | Run and configure FastAPI/Next.js/Docker/Nginx |

| RDS | Managed PostgreSQL database | Schema, models, queries, KYC workflow data |

| S3 | Object storage | Upload flow, object naming, metadata and access logic |

| Textract | Document text/data extraction | Call API, interpret extracted fields, matching logic |

| SES | Email delivery service | Email templates and notification triggers |

| IAM | Identity/access control | Correct role/policy design and service permissions |

| SSM Parameter Store | Parameter/secret storage | Read parameters and integrate them into application config |

| CloudWatch | Logs, metrics, alarms | Application logging and useful alert configuration |

| Budgets | Cost monitoring | Set project budget/alerts |

| VPC/Security Groups | Networking controls | Design secure subnets and traffic rules |


# 18. Network and Security Design

- Create a custom VPC for the project.

- Deploy EC2 and RDS within the VPC according to the project architecture.

- RDS should not be exposed directly to the public internet.

- Allow PostgreSQL traffic to RDS only from the EC2 security group.

- Expose only required web ports through the EC2 security group.

- Use IAM roles rather than storing long-lived AWS access keys on EC2.

- Use SSM Parameter Store for sensitive application configuration instead of hardcoding secrets.

- Keep S3 objects private and grant the application only the required S3 permissions.

- Grant Textract/SES permissions only as needed.

- Use HTTPS/TLS in the deployed application when certificates/domain setup is available.

- Log security-relevant application actions and admin actions.


# 19. Database Design



| Entity | Important Fields | Purpose |

| --- | --- | --- |

| User | id, name, email, password_hash, role, created_at | Authentication and authorization |

| Customer | id, user_id, name, DOB, address, contact, kyc_status | Baseline customer/company record |

| Document | id, customer_id, type, s3_key, status, uploaded_at | KYC document metadata |

| Verification | id, customer_id, extracted_data, match_result, score, status, timestamps | Verification attempt/result |

| AuditLog | id, customer_id, admin_id, field, old_value, new_value, reason, timestamp | Administrative change history |

The exact schema can be refined during implementation, but the separation between customer data, document metadata, verification records, and audit records should be preserved.


# 20. API Responsibilities



| API Group | Example Responsibility |

| --- | --- |

| Auth | Customer/admin login, logout, session/token validation |

| Customers | Read customer profile and KYC status |

| Documents | Upload documents, create document metadata, retrieve document status |

| Verification | Submit KYC, start extraction, retrieve verification results |

| Admin | List pending requests, review request, process/update/reject |

| Audit | Retrieve relevant audit history for admins |


# 21. Suggested Backend Structure

backend/
├── app/
│   ├── main.py
│   ├── config/
│   │   ├── settings.py
│   │   └── security.py
│   ├── database/
│   │   ├── connection.py
│   │   └── session.py
│   ├── models/
│   │   ├── user.py
│   │   ├── customer.py
│   │   ├── document.py
│   │   ├── verification.py
│   │   └── audit.py
│   ├── schemas/
│   │   ├── user.py
│   │   ├── customer.py
│   │   ├── document.py
│   │   ├── verification.py
│   │   └── audit.py
│   ├── routes/
│   │   ├── auth.py
│   │   ├── customers.py
│   │   ├── documents.py
│   │   ├── verification.py
│   │   ├── admin.py
│   │   └── audit.py
│   ├── services/
│   │   ├── auth_service.py
│   │   ├── customer_service.py
│   │   ├── document_service.py
│   │   ├── textract_service.py
│   │   ├── verification_service.py
│   │   └── audit_service.py
│   └── utils/
│       ├── matching.py
│       └── validators.py
├── requirements.txt
├── Dockerfile
└── .dockerignore


# 22. Frontend Screens



| Screen | Key Content |

| --- | --- |

| Login | Email/username, password, role-aware login |

| Customer Dashboard | KYC status, required documents, submission status |

| Document Upload | Aadhaar/Voter ID upload, validation, submission |

| Customer Status | Verification state and completion message |

| Admin Dashboard | Pending requests, status, mismatch indicators, search/filter |

| Verification Detail | Existing data vs extracted data, field-level results |

| Admin Action | Process, Update & Process, Reject, reason |

| Audit History | Previous administrative changes and timestamps |


# 23. Development Split for Three People



| Person | Primary Ownership | Major Work |

| --- | --- | --- |

| Person 1 | Backend + Verification Engine | FastAPI, DB models, APIs, authentication/authorization, matching engine, KYC state machine, admin actions, audit APIs |

| Person 2 | Frontend + UX | Next.js, customer flow, admin dashboard, upload UI, comparison UI, status pages, API integration |

| Person 3 | AWS + Integrations + Deployment | VPC, EC2, RDS, S3, IAM, SSM, CloudWatch, Budgets, Textract integration, SES, Docker, Nginx, deployment |

Shared responsibilities: define API contracts, agree on database schema, use Git branches/PRs, test integrated flows, review security, and prepare the final demonstration.


# 24. Development Strategy

- Phase 1 — Foundation: create repository, project structure, FastAPI, Next.js, PostgreSQL schema, authentication skeleton.

- Phase 2 — First vertical slice: customer login → document upload → S3 → extraction → DB → result.

- Phase 3 — Verification engine: normalization, field comparison, result/status logic.

- Phase 4 — Admin workflow: pending queue, detail view, process/update/reject.

- Phase 5 — Audit: record all admin changes and display history.

- Phase 6 — Notifications: SES email after final processing.

- Phase 7 — Cloud deployment: Docker, EC2, RDS, S3, VPC, IAM, SSM, Nginx.

- Phase 8 — Observability and cost: CloudWatch logs/alarms and AWS Budgets.

- Phase 9 — Integration testing and final demonstration.


# 25. KYC Status Model



| Status | Meaning |

| --- | --- |

| NOT_VERIFIED | Customer has not completed a successful KYC submission |

| SUBMITTED | Documents have been submitted and are being processed |

| UNDER_REVIEW | Automated checks found a mismatch/uncertainty requiring admin review |

| VERIFIED | KYC has been successfully processed |

| REJECTED | KYC request was rejected by an authorized admin |


# 26. Error and Edge Cases

- Unsupported file type → reject upload with a clear message.

- Oversized document → reject before storage or processing.

- Missing required document → prevent KYC submission.

- Textract extraction failure → mark verification as failed/needs review and notify admin.

- Some fields unavailable → do not silently assume a match; show unavailable/uncertain.

- Name formatting difference → normalization/fuzzy comparison.

- Date formatting difference → normalize before comparison.

- Address formatting difference → normalize and send uncertain cases to review.

- Duplicate submission → identify active/latest request according to the chosen business rule.

- AWS service/API failure → log error, preserve request state, and allow retry.

- Admin update without reason → prevent submission of the change.

- Unauthorized admin endpoint access → return authorization error and log security-relevant event.


# 27. Security Considerations

- Passwords must never be stored in plaintext; store strong password hashes.

- Use authenticated and role-authorized API endpoints.

- Do not expose S3 objects publicly.

- Do not put AWS access keys or database passwords in source code.

- Use SSM Parameter Store for application secrets/configuration.

- Use an EC2 IAM role for AWS service access.

- Restrict RDS to application traffic only.

- Validate uploaded documents and requests.

- Avoid exposing unnecessary personal data in application logs.

- Protect admin endpoints with explicit authorization checks.

- Record sensitive administrative changes in the audit trail.

- Use HTTPS for production-style deployment.


# 28. Monitoring and Cost Control

- CloudWatch: collect EC2/system and application logs.

- CloudWatch: monitor CPU/instance health and create useful alarms.

- CloudWatch: log important backend failures and KYC processing errors.

- AWS Budgets: create a project budget aligned with the available AWS credits.

- Monitor Textract, SES, S3, RDS and EC2 usage because some services incur usage-based charges.

- Avoid leaving unnecessary resources running when they are not required for the project demonstration.


# 29. What Is Inside the MVP vs Future Extensions



| MVP | Future / Optional |

| --- | --- |

| Customer + Admin roles | More organizational roles and permissions |

| Aadhaar + Voter ID | PAN, Passport, Driving Licence and other documents |

| OCR/extraction | Specialized document classification pipelines |

| Rule/fuzzy matching | Advanced ML-based identity matching |

| Manual admin review | Risk scoring and automated fraud detection |

| Basic audit trail | Advanced tamper-evident audit architecture |

| SES email | SMS/WhatsApp notifications |

| Existing customer records | Full new-customer onboarding |

| Single EC2 deployment | Auto Scaling / load balancing |

| Basic CloudWatch monitoring | Full observability dashboards and tracing |


# 30. Future Features

- Support PAN, Passport, Driving Licence and additional Indian KYC documents.

- Document classification before extraction.

- Face matching/selfie verification.

- Liveness detection.

- Fraud/tampering detection.

- Advanced risk scoring.

- OCR confidence-aware verification.

- Automated duplicate-document detection.

- Customer onboarding workflow.

- More granular RBAC for auditor, reviewer, supervisor and compliance officer.

- Advanced audit reporting and export.

- Dashboard analytics for verification volume, mismatch rate, rejection rate and processing time.

- Queue prioritization based on risk.

- Multi-language document support.

- High-availability deployment with load balancing and auto scaling.


# 31. Demo Scenario

A strong final demonstration should show both the successful automated path and the human-in-the-loop path.

- Demo A — Matching case: login as customer → upload documents → extraction → all fields match → admin processes → KYC becomes VERIFIED → email is sent.

- Demo B — Mismatch case: use a document whose name/address differs from the stored customer record → verification flags mismatch → admin opens request → reviews side-by-side data → updates the valid field → Update & Process → audit record appears → customer receives completion email.

- Show the AWS console evidence: EC2 application, RDS database, S3 document object, IAM role, SSM parameters, CloudWatch logs, and Budget configuration.


# 32. Project Success Criteria

- A customer can complete the MVP KYC submission from the web interface.

- Documents are stored in S3.

- Textract extraction works on supported documents.

- The application compares extracted data against RDS customer data.

- The admin can inspect match/mismatch results.

- The admin can process or update/reject a KYC request.

- Every manual customer-data change creates a complete audit record.

- The final KYC status is persisted in RDS.

- The customer receives a completion notification.

- The backend is running on EC2/container rather than serverless.

- The project uses a custom VPC, RDS, S3, IAM, SSM Parameter Store, CloudWatch, AWS Budgets and at least five AWS services.

- RDS is not publicly exposed and service permissions follow least privilege.

- The team can demonstrate the complete workflow end-to-end.


# 33. Final Architecture Summary

Pramāṇa combines cloud infrastructure, document intelligence, backend business logic, and human review into one end-to-end KYC workflow. AWS provides the infrastructure and managed building blocks, while the project team builds the actual KYC application, verification rules, workflow, user interfaces, database schema, and audit logic.

The key architectural principle is: AWS extracts and hosts; Pramāṇa verifies and decides; the admin resolves exceptions; and the audit trail records what changed and why.


# Detailed 3-Person Work Division

The project is divided into three major workstreams so that all three members can work in parallel. Each person has primary ownership, while integration points are shared.


## Person 1 — Backend + Verification Engine

Owns the FastAPI backend, database logic, authentication/authorization, KYC workflow, verification engine, and audit backend.

- Set up the FastAPI application structure and configuration.

- Design PostgreSQL models for User, Customer, Document, Verification, and AuditLog.

- Implement database connections, sessions, queries, and migrations.

- Implement customer and admin authentication.

- Implement role-based authorization and protected admin endpoints.

- Build customer profile and KYC-status APIs.

- Build document metadata and KYC-submission APIs.

- Implement the verification service that compares extracted document data against RDS customer data.

- Build normalization for names, dates, addresses, document numbers, etc.

- Implement exact/fuzzy matching where appropriate.

- Generate field-level MATCH, MISMATCH, and UNCERTAIN results.

- Implement overall KYC decision/status logic.

- Implement admin Process, Update & Process, and Reject operations.

- Validate admin updates and require a reason/action for changes.

- Implement the audit-log service recording customer ID, admin identity, field, old value, new value, reason/action, and timestamp.

- Expose audit-history APIs.

- Implement backend validation, error handling, and application logging.

- Write unit/integration tests for the core verification workflow.

Main deliverable: A complete REST API that supports the entire KYC workflow and contains the core verification 'brain' of Pramāṇa.


## Person 2 — Frontend + UX

Owns the Next.js application for both customers and admins, including all screens, forms, dashboards, API integration, and user feedback.

- Set up the Next.js project and reusable UI components.

- Build customer login and authenticated customer layout.

- Build the customer dashboard with profile and KYC status.

- Build Aadhaar and Voter ID upload screens.

- Validate upload input and display useful errors.

- Build KYC submission and processing-status UI.

- Display NOT VERIFIED, SUBMITTED, UNDER REVIEW, VERIFIED, and REJECTED states.

- Build customer result/completion page.

- Build admin login and protected admin layout.

- Build the admin dashboard with pending KYC requests.

- Add search/filter/sorting for requests.

- Build verification detail page showing existing customer data versus extracted document data.

- Create field-by-field MATCH/MISMATCH/UNCERTAIN indicators.

- Build Process, Update & Process, and Reject actions.

- Build the admin form for changing customer data.

- Require an action/reason before an administrative update can be submitted.

- Build the audit-history interface.

- Integrate all screens with Person 1's FastAPI APIs.

- Handle loading, error, empty, success, and authentication-expiry states.

- Test complete customer and admin journeys.

Main deliverable: A complete web application through which a customer can submit KYC and an admin can review and process it.


## Person 3 — AWS + Document Processing + Deployment

Owns the AWS infrastructure, managed-service integrations, deployment, monitoring, security configuration, and cloud evidence.

- Design and create the custom Amazon VPC.

- Configure subnets, route tables, internet access, and network architecture.

- Create and configure the EC2 instance that hosts the application.

- Configure EC2 Security Groups.

- Create the Amazon RDS PostgreSQL instance.

- Configure RDS so PostgreSQL is reachable only from the application/EC2 security group.

- Create the private S3 bucket for KYC documents.

- Configure S3 permissions for the application.

- Create the EC2 IAM role with least-privilege permissions.

- Configure Systems Manager Parameter Store for database configuration and sensitive application parameters.

- Integrate Amazon Textract with the FastAPI backend.

- Implement the AWS document-processing path: S3 object → Textract → extracted response.

- Integrate Amazon SES for KYC completion emails.

- Dockerize and deploy FastAPI and Next.js on EC2.

- Configure Nginx as the reverse proxy.

- Configure application startup/restart behaviour.

- Configure CloudWatch logs, metrics, and useful alarms.

- Create an AWS Budget and cost alerts.

- Document the deployed AWS architecture and service configuration.

- Troubleshoot AWS networking, IAM, S3, Textract, SES, RDS, and deployment issues.

Main deliverable: A fully deployed and secured AWS environment in which the application runs on EC2 and communicates with RDS, S3, Textract, SES, SSM, CloudWatch, and other required services.


## Shared Responsibilities — All 3 Members

- Use one GitHub repository with clear branches and pull requests.

- Agree on the database schema before dependent development begins.

- Agree on API request/response formats before frontend integration.

- Never hardcode passwords, AWS keys, or other secrets.

- Review each other's code for correctness and security.

- Perform end-to-end integration testing.

- Prepare architecture diagrams, screenshots, and cloud evidence for the final submission.

- Understand the complete project workflow for the final viva/demo, not only the individually assigned module.

- Coordinate whenever an API, database model, AWS resource, or frontend requirement changes.


## Integration Boundaries

- Person 1 → Person 2: API documentation, request/response schemas, authentication flow, KYC status values, and error formats.

- Person 1 → Person 3: AWS integration requirements, S3/Textract/SES operations, IAM permissions, SSM parameters, and database connectivity.

- Person 2 → Person 3: frontend build/deployment requirements, Nginx routing, ports, and production configuration.

- All three → Final integration: Customer upload → S3 → Textract → verification engine → admin review → database update/audit → SES notification.


## Recommended Ownership Rule

Ownership does not mean isolation. For example, Person 3 owns the Textract/AWS integration, Person 1 owns how extracted data is interpreted and verified, and Person 2 owns how the resulting information is presented. All three must test the complete workflow together.


| Field | Existing Customer Data | Extracted Document Data | Result |

| --- | --- | --- | --- |

| Name | Armaan Syed | ARMAAN SYED | MATCH after normalization |

| Date of Birth | 15/02/2007 | 15-02-2007 | MATCH after date normalization |

| Address | Mumbai | Mumbai | MATCH |

| Document Number | Stored reference | Extracted reference | MATCH / MISMATCH |
