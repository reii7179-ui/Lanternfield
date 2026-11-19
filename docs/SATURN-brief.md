PROJECT MASTER PROMPT — SATURN: CORPORATE RTS

1. Project Overview

I want to develop a browser-based corporate management and operations simulation game called SATURN: Corporate RTS.

The game should simulate the operation of a realistic company, where the player controls the entire organisation, from the Board of Directors down to individual employees.

This is NOT a conventional business tycoon game.

It should combine:

- Real-time strategy (RTS) gameplay.
- Corporate management.
- Organisational hierarchy.
- Realistic employee responsibilities.
- Department management.
- Engineering and industrial operations.
- Administrative procedures.
- Document management.
- Approval and countersignature workflows.
- Finance and procurement.
- Maintenance and asset management.
- Employee delegation and AI behaviour.

The player is effectively running the entire company and can switch between different positions and responsibilities whenever necessary.

2. Technology Requirements

The game must be developed using ONLY:

- HTML5
- CSS3
- Vanilla JavaScript
- IndexedDB for persistent local data
- HTML Canvas or CSS for 2D visualisation where appropriate

STRICT RESTRICTIONS:

- No React.
- No Vue.
- No Angular.
- No Node.js backend.
- No Python backend.
- No Unity.
- No Godot.
- No external game engines.
- No mandatory cloud services.
- No paid APIs.
- No mandatory internet connection.

The game should run locally in a modern desktop browser.

Use modular JavaScript files and a clean, maintainable architecture.

3. Core Gameplay Philosophy

The player controls the entire company.

The player can:

- Act as Managing Director.
- Switch to Finance Manager.
- Act as Procurement Officer.
- Manage Engineering.
- Assign technicians.
- Perform technical inspections.
- Review maintenance records.
- Process paperwork.
- Approve documents when authorised.
- Manage employees.
- Conduct meetings.
- Handle customer enquiries.
- Manage company assets.

The player must be able to switch between positions without restarting the game.

However, switching positions must NOT bypass organisational authority.

For example:

- A technician cannot approve a purchase order.
- A Finance Officer cannot approve engineering test results.
- A supervisor cannot approve matters beyond their delegated authority.
- A document requiring independent countersignature cannot be approved by its preparer where segregation of duties applies.

The game should enforce realistic company procedures.

4. Simulation Time System

Implement a real-time simulation with:

- Pause.
- 1× speed.
- 2× speed.
- 4× speed.

When paused, the player can freely navigate the company, review documents, assign employees and make decisions.

When time advances:

- Employees execute assigned tasks.
- Work orders progress.
- Deadlines approach.
- Equipment operates.
- Maintenance becomes due.
- Customers respond.
- Suppliers process orders.
- Employees attend work or take leave.
- Financial transactions occur.
- Unexpected events can happen.

The simulation must be deterministic where practical and support saving and loading.

Do not make the simulation dependent on the real-world clock.

5. Organisational Structure

Create a realistic company hierarchy.

Initial structure:

BOARD OF DIRECTORS

- Managing Director

Under the Managing Director:

- Operations Director
- Technical Director
- Finance Director
- Human Resources Manager
- Procurement Manager
- Quality Assurance Manager
- HSE Manager

Each department should contain appropriate subordinate positions.

Example:

Technical Director

- Engineering Manager
- Engineering Supervisor
- Senior Engineer
- Engineers
- Senior Technicians
- Technicians
- Junior Technicians

Every employee must have:

- Unique employee ID.
- Name.
- Job title.
- Department.
- Reporting manager.
- Salary.
- Qualifications.
- Technical skills.
- Experience.
- Workload.
- Attendance.
- Morale.
- Performance rating.
- Current assignment.
- Employment status.

Implement reporting relationships and authority permissions.

6. Departments

The initial company should contain:

1. Management
2. Operations
3. Engineering
4. Maintenance
5. Procurement
6. Finance
7. Human Resources
8. Quality Assurance
9. Health, Safety and Environment
10. Administration
11. Sales and Commercial
12. Warehouse and Inventory

Every department must have:

- Its own dashboard.
- Employees.
- Responsibilities.
- Tasks.
- Incoming requests.
- Outgoing reports.
- Pending approvals.
- Department-specific documentation.

Departments must interact with each other.

For example, Engineering may require replacement parts from Procurement, which requires Finance budget verification before a purchase order can be approved.

7. Employee AI and Delegation

This is one of the most important systems.

Implement two control modes:

Direct Control

The player can take over an employee's role and perform their work.

For example:

- Inspect equipment.
- Complete inspection checklists.
- Prepare reports.
- Process invoices.
- Create purchase requisitions.
- Review technical findings.
- Perform maintenance procedures.

AI Delegation

The player can assign tasks to employees.

Example:

"Assign Senior Technician Daniel to inspect hydraulic pump HP-014 and submit an inspection report before 3 PM."

The employee should:

- Check task requirements.
- Consider their qualifications.
- Consider their workload.
- Execute the assigned work.
- Produce appropriate documentation.
- Report problems.
- Request assistance when necessary.

Employees should not be perfect.

They can:

- Make mistakes.
- Miss deadlines.
- Request clarification.
- Report unsafe conditions.
- Become overloaded.
- Require supervision.
- Take leave.
- Perform differently depending on their experience and qualifications.

Managers should monitor subordinate performance and escalate problems.

The player must be able to intervene and take over an employee's task.

8. Operations and Workflow System

Implement a comprehensive job management system.

Use a marine engineering and hydraulic repair company as the initial business.

Example repair workflow:

1. Customer enquiry.
2. Job registration.
3. Equipment receiving.
4. Job Order creation.
5. Initial inspection.
6. Technical assessment.
7. Inspection report.
8. Repair quotation.
9. Customer approval.
10. Purchase requisition.
11. Procurement.
12. Repair execution.
13. Quality inspection.
14. Performance testing.
15. Final technical approval.
16. Delivery Order.
17. Customer invoicing.
18. Job closure.
19. Record archiving.

Each stage must have prerequisites.

Do not allow employees to skip mandatory steps.

Support multiple simultaneous jobs.

Each job must have:

- Job number.
- Customer.
- Equipment.
- Description.
- Assigned employees.
- Department.
- Priority.
- Status.
- Deadline.
- Estimated cost.
- Actual cost.
- Documents.
- Approval history.

9. Document Management System

Paperwork must be a major gameplay mechanic.

Documents should be actual interactive forms.

Initial document library:

Operations

- Job Order.
- Work Order.
- Job Completion Report.
- Daily Operations Report.

Engineering

- Inspection Report.
- Technical Assessment.
- Test Report.
- Repair Report.
- Technical Recommendation.

Procurement

- Purchase Requisition.
- Request for Quotation.
- Supplier Quotation.
- Quotation Comparison Sheet.
- Purchase Order.
- Goods Received Note.

Finance

- Supplier Invoice.
- Customer Invoice.
- Payment Voucher.
- Expense Claim.
- Budget Report.
- Financial Statement.

HR

- Leave Application.
- Employment Application.
- Employee Appraisal.
- Warning Letter.
- Training Record.

Quality Assurance

- Inspection Checklist.
- Non-Conformance Report.
- Corrective Action Report.
- Quality Audit Report.

HSE

- Risk Assessment.
- Permit to Work.
- Incident Report.
- Safety Inspection Checklist.

Administration

- Internal Memorandum.
- Official Correspondence.
- Meeting Minutes.
- Document Transmittal.

Every document must have:

- Unique reference number.
- Revision number.
- Date.
- Originating department.
- Prepared by.
- Checked by.
- Approved by.
- Authorised by, where applicable.
- Attachments.
- Status.
- Revision history.
- Audit trail.

Documents must support:

- Draft.
- Submitted.
- Under Review.
- Returned for Correction.
- Approved.
- Rejected.
- Superseded.
- Archived.

10. Signatures and Countersignatures

Implement a proper approval engine.

Possible approval stages:

- Prepared by.
- Checked by.
- Reviewed by.
- Recommended by.
- Approved by.
- Authorised for release.

Approval requirements must depend on document type and company policy.

The system must:

- Verify employee authority.
- Prevent unauthorised approval.
- Enforce approval sequences.
- Support rejection with reasons.
- Support returned documents.
- Record timestamps.
- Record the identity and position of the signatory.
- Maintain a permanent approval history.
- Prevent unauthorised editing after final approval.

Where independent verification is required, the preparer cannot countersign their own work.

11. Finance System

Implement realistic company financial management.

Include:

- Company cash balance.
- Revenue.
- Expenses.
- Payroll.
- Accounts payable.
- Accounts receivable.
- Department budgets.
- Procurement expenditure.
- Operating expenses.
- Equipment purchases.
- Profit and loss.
- Cash flow.
- Financial reports.

Financial transactions must be linked to their originating documents.

For example, a supplier payment should link to an approved Purchase Order, Goods Received Note and supplier invoice where required by company policy.

Do not allow unlimited spending.

Implement configurable approval thresholds.

12. Procurement and Warehouse

Procurement workflow:

1. Purchase Requisition.
2. Budget verification.
3. Supplier selection.
4. Request for Quotation.
5. Quotation comparison.
6. Approval.
7. Purchase Order.
8. Supplier confirmation.
9. Delivery.
10. Goods inspection.
11. Goods Received Note.
12. Inventory update.
13. Invoice verification.

Warehouse features:

- Stock register.
- Item codes.
- Quantity.
- Minimum stock levels.
- Stock movements.
- Goods receiving.
- Goods issuing.
- Reservations for jobs.
- Stock shortages.
- Reorder notifications.

13. Asset and Maintenance System

Every company asset must have an asset register.

Example:

- Hydraulic test bench.
- Air compressor.
- Forklift.
- Overhead crane.
- Company vehicles.
- Workshop equipment.
- Office equipment.

Each asset should have:

- Asset ID.
- Description.
- Purchase date.
- Purchase cost.
- Location.
- Operating condition.
- Maintenance schedule.
- Service history.
- Breakdown history.
- Inspection records.
- Operating costs.
- Assigned maintenance personnel.

Implement:

- Preventive maintenance.
- Corrective maintenance.
- Breakdown maintenance.
- Inspection schedules.
- Maintenance work orders.
- Equipment downtime.
- Spare parts consumption.

Equipment failures should affect company operations.

14. Quality and HSE

Implement realistic quality and safety procedures.

Quality:

- Inspection planning.
- Inspection records.
- Non-conformance reports.
- Corrective actions.
- Final verification.
- Internal audits.

HSE:

- Risk assessments.
- Safety inspections.
- Incident reporting.
- Permit-to-work workflows.
- Corrective safety actions.
- Employee safety training.

Do not allow mandatory safety requirements to be bypassed simply to speed up operations.

15. Commercial and Customer Management

Implement:

- Customer database.
- Customer enquiries.
- Quotations.
- Service contracts.
- Purchase orders from customers.
- Customer correspondence.
- Delivery orders.
- Customer complaints.
- Customer payment records.
- Contract deadlines.

Customer satisfaction and company reputation should respond to actual performance.

16. Main User Interface

Create a professional industrial corporate command interface.

Main navigation:

1. Command Centre.
2. Organisation.
3. Personnel.
4. Operations.
5. Engineering.
6. Maintenance.
7. Procurement.
8. Finance.
9. Warehouse.
10. QA & HSE.
11. Commercial.
12. Administration.
13. Documents.
14. Reports.

The Command Centre should display:

- Current simulation date and time.
- Time controls.
- Company financial status.
- Active jobs.
- Pending approvals.
- Employee attendance.
- Maintenance alerts.
- Procurement requests.
- Urgent notifications.
- Department performance.

Use a professional industrial ERP-inspired design.

Avoid cartoonish visuals and excessive decorative elements.

The interface should be information-rich but easy to navigate.

17. Initial Company Scenario

Create an initial playable company:

Company Name: SATURN MARINE ENGINEERING

Business: Marine engineering, hydraulic repair and industrial maintenance.

Starting conditions:

- 25 employees.
- 8 core departments initially active.
- One engineering workshop.
- One warehouse.
- 12 registered assets.
- S$500,000 starting cash.
- Two active customer contracts.
- No starting debt.
- Moderate company reputation.

Create fictional employees with different qualifications, experience, salaries and personalities.

The player starts as Managing Director but can switch to any position.

The first day should contain several realistic operational situations:

- A customer requests a hydraulic pump overhaul.
- A technician requests replacement parts.
- Maintenance reports an overdue compressor inspection.
- Finance has supplier invoices pending.
- HR receives new job applications.
- Operations requests approval for the next work schedule.

The player can handle these matters directly or delegate them.

18. Save and Persistence System

Use IndexedDB.

The game must support:

- Multiple save slots.
- Manual saves.
- Automatic saves.
- Save timestamps.
- Load game.
- New company.
- Company state persistence.
- Employee state persistence.
- Document persistence.
- Financial transaction persistence.
- Simulation time persistence.

Never rely only on temporary JavaScript variables for important game data.

19. Development Standards

Follow these principles:

1. Modular architecture.
2. Separation of interface and simulation logic.
3. Centralised state management.
4. Reusable document templates.
5. Reusable approval workflows.
6. Consistent unique IDs.
7. Data validation.
8. Error handling.
9. Local persistence.
10. Maintainable code.

Avoid placing the entire game in one enormous JavaScript file.

Do not create fake functionality or decorative buttons that do nothing.

Every implemented button must perform its intended action.

20. Development Approach

Do not attempt to build the entire game in one response.

Work in small, testable development phases.

For every phase:

1. Explain what will be implemented.
2. Identify the files that will be created or modified.
3. Implement the functionality.
4. Provide complete replacement files where appropriate.
5. Explain how to run the game.
6. Provide a testing checklist.
7. Wait for my confirmation before proceeding to the next major phase.

Do not silently remove previously working features.

Do not rewrite working modules unnecessarily.

Maintain a project development log and an architecture document.

Prioritise functional gameplay over visual decoration.

21. First Task

Before writing code:

1. Analyse the entire game concept.
2. Propose the complete software architecture.
3. Design the data models.
4. Define the simulation engine.
5. Define the employee AI and delegation system.
6. Define the document and approval engine.
7. Establish the development phases.
8. Identify technical risks and dependencies.

Then present the proposed architecture for my review.

DO NOT START CODING UNTIL I APPROVE THE ARCHITECTURE.

The ultimate objective is to create a deeply realistic, locally running corporate RTS simulation where I can operate an entire company, control every position, delegate work to employees, process real business paperwork, approve documents, manage finances and maintain industrial operations.

Remember: I am playing the entire company, not just its Managing Director.