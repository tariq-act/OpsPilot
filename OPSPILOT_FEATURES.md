# OpsPilot — Product Features & User Flow

> **OpsPilot** is an operations management platform for small field-service businesses that turns customer requests into completed jobs, invoices, payments, and follow-ups — while using automation and AI to reduce administrative work.

---

## 1. Product Overview

### The Problem

Small field-service businesses such as:

- HVAC repair
- Appliance repair
- Electrical services
- Plumbing
- AC servicing
- Home maintenance
- Cleaning services
- Equipment repair

often manage their operations using a combination of:

- WhatsApp
- Phone calls
- Paper notes
- Excel/Google Sheets
- Calendars
- Accounting software
- Manual invoices
- Manual customer follow-ups

This creates operational problems:

- Customer requests get lost.
- Technicians don't always have the latest job information.
- Scheduling is difficult.
- Managers spend time coordinating technicians.
- Customers don't know when technicians will arrive.
- Invoices are delayed.
- Payments are forgotten.
- Follow-ups are inconsistent.
- Business owners don't have a clear view of operations.
- Administrative work consumes time that could be spent serving customers.

---

# 2. OpsPilot's Goal

The core goal is:

> **Turn a customer request into a completed, paid, and followed-up job with as little manual administration as possible.**

The complete operational lifecycle is:

```text
Customer
   ↓
Request
   ↓
Job
   ↓
Schedule
   ↓
Technician
   ↓
Work
   ↓
Completion
   ↓
Invoice
   ↓
Payment
   ↓
Follow-up
```

OpsPilot should make this lifecycle visible, trackable, and increasingly automated.

---

# 3. Target Users

## Business Owner

Needs to:

- Understand business performance.
- See today's jobs.
- Monitor revenue.
- Monitor unpaid invoices.
- Understand technician workload.
- Identify operational bottlenecks.
- Manage customers.
- Configure business settings.

---

## Operations Manager / Dispatcher

Needs to:

- Receive customer requests.
- Convert requests into jobs.
- Schedule technicians.
- Reassign jobs.
- Handle emergencies.
- Monitor today's operations.
- Communicate with technicians.
- Track job status.

---

## Technician

Needs to:

- See assigned jobs.
- View customer information.
- View job details.
- Navigate to customer location.
- Update job status.
- Record work performed.
- Add parts/materials.
- Upload photos.
- Capture notes.
- Mark jobs complete.

---

## Office / Admin Staff

Needs to:

- Manage customers.
- Create requests.
- Create jobs.
- Manage invoices.
- Track payments.
- Send communications.
- Maintain records.

---

# 4. Core Product Modules

OpsPilot consists of the following major modules:

```text
Dashboard
Customers
Requests
Jobs
Schedule
Dispatch
Technicians
Invoices
Payments
Communications
Automation
AI Assistant
Reports
Settings
```

---

# 5. Authentication & Organization

## Features

### Sign Up

Business owner can create an OpsPilot account.

Information:

- Name
- Email
- Password
- Business name
- Business type
- Phone number

---

### Login

Users can authenticate using:

- Email/password
- Supported OAuth providers

---

### Organization

Each business operates inside its own organization.

Example:

```text
Organization
 ├── Users
 ├── Customers
 ├── Requests
 ├── Jobs
 ├── Technicians
 ├── Invoices
 └── Payments
```

---

### Role-Based Access Control

Roles:

```text
Owner
Admin
Dispatcher
Technician
Accountant
```

Each role receives different permissions.

Example:

| Feature   | Owner | Admin | Dispatcher |    Technician |
| --------- | ----: | ----: | ---------: | ------------: |
| Dashboard |     ✓ |     ✓ |          ✓ |       Limited |
| Customers |     ✓ |     ✓ |          ✓ | Assigned only |
| Requests  |     ✓ |     ✓ |          ✓ |          View |
| Jobs      |     ✓ |     ✓ |          ✓ | Assigned only |
| Schedule  |     ✓ |     ✓ |          ✓ |      Personal |
| Invoices  |     ✓ |     ✓ |          ✓ |          View |
| Payments  |     ✓ |     ✓ |    Limited |            No |
| Settings  |     ✓ |     ✓ |         No |            No |

---

# 6. Dashboard

The dashboard is the operational command center.

## Today's Overview

Show:

- Jobs today
- Jobs in progress
- Completed jobs
- Upcoming jobs
- Unassigned jobs
- Overdue jobs
- Pending payments
- Revenue
- New customer requests

Example:

```text
Today's Operations

12 Jobs
 ├── 3 Scheduled
 ├── 4 In Progress
 ├── 4 Completed
 └── 1 Delayed
```

---

## KPI Cards

Possible KPIs:

- Today's revenue
- Weekly revenue
- Monthly revenue
- Completed jobs
- Average job value
- Outstanding invoices
- Payment collection rate
- New customers
- Repeat customers

---

## Operational Alerts

Examples:

```text
⚠ 2 jobs are unassigned

⚠ 3 invoices are overdue

⚠ Technician Mike has 7 jobs today

⚠ Job #1042 has been delayed by 45 minutes
```

---

## Activity Feed

Track:

- New requests
- Job status changes
- Payments
- Invoice creation
- Customer updates
- Technician updates

---

# 7. Customer Management

Customers represent the people/businesses receiving services.

## Customer Profile

Store:

- Name
- Phone
- Email
- Address
- Notes
- Customer type
- Service history
- Total spent
- Outstanding balance
- Last service
- Next scheduled service

---

## Customer Timeline

Example:

```text
Customer Timeline

Sep 18
✓ AC Repair completed
₹2,500 paid

Sep 10
Invoice created

Aug 22
Service request created
```

---

## Service History

Display every job associated with the customer.

---

## Customer Search

Search by:

- Name
- Phone
- Email
- Address
- Customer ID

---

## Customer Tags

Examples:

```text
VIP
Residential
Commercial
Repeat Customer
High Value
Requires Follow-up
```

---

# 8. Request Management

A request represents a customer's initial need.

Example:

> "My AC is not cooling."

## Request Creation

Requests can come from:

- Phone
- WhatsApp
- Website
- Email
- Manual entry
- AI-assisted intake

---

## Request Information

Store:

- Customer
- Problem description
- Service type
- Priority
- Location
- Preferred time
- Contact information
- Attachments
- Notes

---

## Request Status

```text
New
 ↓
Contacted
 ↓
Qualified
 ↓
Converted to Job
```

Alternative:

```text
New
 ↓
Rejected / Cancelled
```

---

# 9. AI Request Intake

AI can help convert unstructured customer messages into structured information.

Example customer message:

> "Hi, my LG washing machine is making a strange noise and stopping after 10 minutes. Can someone come tomorrow?"

OpsPilot extracts:

```text
Service:
Appliance Repair

Brand:
LG

Problem:
Machine stops after ~10 minutes

Issue:
Strange noise

Preferred Date:
Tomorrow

Priority:
Normal
```

The operator can review and approve the extracted information.

---

# 10. Job Management

A Job is the actual work that needs to be performed.

## Create Job

A job can be created from:

```text
Request → Job
```

or manually.

---

## Job Information

- Job ID
- Customer
- Service type
- Description
- Location
- Priority
- Technician
- Scheduled date
- Scheduled time
- Estimated duration
- Status
- Notes
- Attachments
- Parts
- Labor
- Pricing

---

## Job Status

```text
Draft
 ↓
Scheduled
 ↓
Assigned
 ↓
En Route
 ↓
Arrived
 ↓
In Progress
 ↓
Completed
 ↓
Invoiced
 ↓
Paid
```

Alternative states:

```text
Cancelled
On Hold
Rescheduled
Failed
```

---

# 11. Job Details Page

The job page is one of the most important screens.

It should show:

### Header

```text
Job #JOB-1042

AC Repair
Scheduled Today · 2:30 PM
```

### Customer

- Name
- Phone
- Address
- Previous jobs

### Technician

- Technician name
- Contact
- Current status

### Work Details

- Problem
- Diagnosis
- Work performed
- Parts used
- Labor
- Notes

### Timeline

```text
2:05 PM
Technician assigned

2:20 PM
Technician en route

2:35 PM
Technician arrived

2:40 PM
Work started

3:25 PM
Job completed
```

---

# 12. Scheduling

Scheduling helps dispatchers organize jobs and technician availability.

## Calendar Views

Support:

- Day
- Week
- Month

---

## Schedule

Show:

```text
Technician A
09:00 ─ Job 101
11:00 ─ Job 104
14:00 ─ Job 109

Technician B
10:00 ─ Job 102
13:00 ─ Job 106
16:00 ─ Job 110
```

---

## Scheduling Features

- Drag and drop jobs
- Assign technician
- Reschedule
- Change duration
- Detect conflicts
- Technician availability
- Time-off management
- Emergency job insertion

---

# 13. Dispatch

Dispatch is responsible for assigning the right technician to the right job.

## Dispatch Board

Example:

```text
UNASSIGNED
────────────
Job #1042
Job #1047

TECHNICIAN A
────────────
Job #1039
Job #1041

TECHNICIAN B
────────────
Job #1040

TECHNICIAN C
────────────
Job #1045
```

---

## Assignment

Dispatcher can:

```text
Select Job
 ↓
View Available Technicians
 ↓
Compare:
  • Skills
  • Availability
  • Distance
  • Current workload
 ↓
Assign Technician
```

---

## Conflict Detection

OpsPilot should detect:

- Double booking
- Technician unavailable
- Overlapping jobs
- Excessive workload
- Travel-time conflicts

---

# 14. Technician Management

Technician profile:

- Name
- Phone
- Email
- Skills
- Certifications
- Service areas
- Availability
- Current jobs
- Completed jobs
- Performance metrics

---

## Technician Skills

Example:

```text
AC Repair
Refrigerator Repair
Washing Machine
Electrical
HVAC
```

Skills can help with technician assignment.

---

# 15. Technician Mobile Workflow

Technicians should have a mobile-friendly experience.

## Technician Flow

```text
Login
 ↓
Today's Jobs
 ↓
Select Job
 ↓
View Customer
 ↓
Navigate
 ↓
Mark "En Route"
 ↓
Mark "Arrived"
 ↓
Start Work
 ↓
Diagnose Problem
 ↓
Add Parts
 ↓
Add Labor
 ↓
Add Notes
 ↓
Upload Photos
 ↓
Customer Approval
 ↓
Complete Job
```

---

# 16. Technician Job Actions

Technician can:

- Call customer
- View address
- Open navigation
- Update status
- Add notes
- Add photos
- Add parts
- Add labor
- Record diagnosis
- Record resolution
- Capture customer signature
- Mark job complete

---

# 17. Parts & Materials

Track parts used during jobs.

Example:

```text
Part
────────────
Capacitor
Quantity: 1
Price: ₹450
```

---

## Part Features

- Part name
- SKU
- Quantity
- Cost
- Customer price
- Inventory quantity

---

# 18. Inventory

Optional operational module.

Track:

- Parts
- Stock levels
- Low-stock items
- Used parts
- Purchase cost
- Supplier

---

## Low Stock Alert

Example:

```text
⚠ Capacitor stock is low

Current: 4
Minimum: 10
```

---

# 19. Invoice Management

Invoices are generated after work is completed.

## Invoice Flow

```text
Completed Job
 ↓
Generate Invoice
 ↓
Review
 ↓
Send Customer
 ↓
Payment
 ↓
Paid
```

---

## Invoice Details

- Invoice number
- Customer
- Job
- Labor
- Parts
- Taxes
- Discounts
- Total
- Due date
- Payment status

---

# 20. Invoice Status

```text
Draft
 ↓
Sent
 ↓
Viewed
 ↓
Partially Paid
 ↓
Paid
```

Alternative:

```text
Overdue
Cancelled
```

---

# 21. Payments

Track:

- Amount
- Payment method
- Payment date
- Transaction ID
- Invoice
- Customer

Payment methods can include:

- Cash
- Card
- Bank transfer
- Online payment

---

## Payment Status

```text
Pending
Partially Paid
Paid
Failed
Refunded
```

---

# 22. Automated Payment Follow-Up

OpsPilot can automatically remind customers about unpaid invoices.

Example:

```text
Invoice #INV-1042
₹3,500
Due: Sep 20

Status:
Pending
```

Automation:

```text
Due date
 ↓
Reminder
 ↓
Second reminder
 ↓
Overdue alert
```

---

# 23. Customer Communication

Centralize communication related to jobs.

Possible channels:

- Email
- SMS
- WhatsApp
- In-app notifications

---

## Automated Messages

### Booking Confirmation

```text
Your service appointment is confirmed for
September 20 at 2:30 PM.
```

### Technician En Route

```text
Your technician is on the way.
Estimated arrival: 20 minutes.
```

### Job Completed

```text
Your service has been completed.
Your invoice is ready.
```

### Payment Reminder

```text
Your invoice is due.
Please complete payment.
```

---

# 24. Notifications

Users can receive notifications for:

- New request
- New job
- Job assignment
- Job rescheduling
- Technician arrival
- Job completion
- New invoice
- Payment received
- Overdue payment
- Low inventory
- Operational alerts

---

# 25. Automation Engine

Automation is a core OpsPilot feature.

Instead of requiring staff to manually perform repetitive actions, events can trigger workflows.

Example:

```text
EVENT
Job Completed

        ↓

ACTION
Generate Invoice

        ↓

ACTION
Send Invoice

        ↓

WAIT
2 Days

        ↓

CONDITION
Invoice Unpaid?

        ↓ YES

ACTION
Send Payment Reminder
```

---

# 26. Automation Examples

## New Request

```text
New Request
 ↓
Create notification
 ↓
Assign dispatcher
```

---

## Job Scheduled

```text
Job Scheduled
 ↓
Notify customer
 ↓
Notify technician
```

---

## Technician En Route

```text
Technician En Route
 ↓
Send customer notification
```

---

## Job Completed

```text
Job Completed
 ↓
Generate invoice
 ↓
Send invoice
 ↓
Request feedback
```

---

## Invoice Overdue

```text
Invoice Overdue
 ↓
Send reminder
 ↓
Notify admin
```

---

# 27. AI Operations Assistant

OpsPilot can provide an AI assistant focused on operations rather than being a generic chatbot.

The assistant should understand business data and operational context.

Example questions:

> "What jobs are scheduled today?"

> "Which invoices are overdue?"

> "Which technicians are overloaded?"

> "Show me today's unassigned jobs."

> "What revenue did we generate this week?"

> "Which customers haven't paid?"

---

# 28. AI-Assisted Scheduling

AI can help operators identify scheduling options.

Example:

```text
Job:
AC Repair

Required Skill:
HVAC

Preferred:
Today, 3 PM

Available technicians:
John
Mike
Ahmed
```

The system can surface relevant candidates based on:

- Skill
- Availability
- Existing workload
- Location
- Schedule conflicts

The final assignment remains controlled by the operator.

---

# 29. AI Job Summary

After a job is completed, AI can summarize technician notes.

Raw notes:

```text
checked outdoor unit
capacitor weak
replaced capacitor
tested cooling
working fine
```

Structured summary:

```text
Diagnosis:
Weak capacitor.

Work performed:
Replaced capacitor and tested cooling.

Result:
Unit operating normally.
```

---

# 30. AI Customer Request Classification

AI can classify incoming requests.

Example:

```text
Customer message
      ↓
AI processing
      ↓
Service type
Priority
Issue
Customer
Preferred time
      ↓
Operator review
      ↓
Create Request
```

---

# 31. AI Operational Insights

AI can identify patterns such as:

- Increasing overdue invoices
- Repeated service calls
- High-value customers
- Frequently used parts
- Technician workload imbalance
- Increasing job duration
- Frequent cancellations

The system should show the underlying data supporting an insight rather than presenting unsupported conclusions.

---

# 32. Reports & Analytics

## Revenue

Track:

- Daily revenue
- Weekly revenue
- Monthly revenue
- Revenue by service
- Revenue by technician

---

## Jobs

Track:

- Jobs created
- Jobs completed
- Jobs cancelled
- Jobs delayed
- Average completion time

---

## Customers

Track:

- New customers
- Returning customers
- Customer lifetime value
- Average order value

---

## Payments

Track:

- Paid invoices
- Outstanding invoices
- Overdue invoices
- Collection rate

---

# 33. Operational Metrics

Important metrics:

```text
Job Completion Rate
First-Time Fix Rate
Average Job Duration
Average Response Time
Average Travel Time
Technician Utilization
Revenue per Technician
Average Invoice Value
Payment Collection Rate
Customer Repeat Rate
```

---

# 34. Search & Global Command

Provide global search across:

```text
Customers
Jobs
Requests
Invoices
Technicians
Payments
```

Example:

```text
Search: "John"

Customers
Jobs
Invoices
```

---

# 35. Audit Log

Track important business actions.

Example:

```text
Sep 19, 10:30 AM

John changed:
Job #1042

Status:
Scheduled → In Progress
```

Audit events:

- Created
- Updated
- Deleted
- Assigned
- Rescheduled
- Invoiced
- Paid
- Cancelled

---

# 36. Settings

## Business Settings

- Business name
- Logo
- Phone
- Email
- Address
- Working hours
- Service areas

---

## User Settings

- Profile
- Password
- Notifications
- Preferences

---

## Team Settings

- Users
- Roles
- Permissions
- Technicians

---

## Service Settings

Configure:

- Services
- Pricing
- Duration
- Required skills

---

## Invoice Settings

Configure:

- Invoice numbering
- Taxes
- Payment terms
- Due dates
- Payment methods

---

# 37. Complete Business Flow

The complete OpsPilot lifecycle:

```text
                    CUSTOMER
                       │
                       ▼
                Service Request
                       │
                       ▼
                 Request Review
                       │
                       ▼
                  Create Job
                       │
                       ▼
                  Schedule Job
                       │
                       ▼
                Assign Technician
                       │
                       ▼
              Technician En Route
                       │
                       ▼
                 Customer Visit
                       │
                       ▼
                  Start Work
                       │
                       ▼
               Diagnose Problem
                       │
                       ▼
              Perform Service
                       │
                       ├──── Add Parts
                       │
                       ├──── Add Labor
                       │
                       ├──── Add Photos
                       │
                       └──── Add Notes
                       │
                       ▼
                Complete Job
                       │
                       ▼
                 Generate Invoice
                       │
                       ▼
                  Send Invoice
                       │
                       ▼
                     Payment
                       │
                       ▼
                 Payment Received
                       │
                       ▼
                Request Feedback
                       │
                       ▼
                 Follow-up / CRM
```

---

# 38. Example: Real Customer Journey

## Step 1 — Customer Contacts Business

Customer sends:

> "My AC isn't cooling. Can someone come tomorrow?"

OpsPilot creates a request.

```text
Request #REQ-1001

Customer:
Rahul Sharma

Issue:
AC not cooling

Preferred:
Tomorrow

Status:
New
```

---

## Step 2 — Dispatcher Reviews

Dispatcher checks:

- Customer
- Location
- Service type
- Preferred time
- Technician availability

Then converts the request into a job.

---

## Step 3 — Job Created

```text
Job #JOB-1042

AC Repair
Tomorrow
2:30 PM
```

---

## Step 4 — Technician Assigned

OpsPilot identifies available technicians.

Dispatcher assigns:

```text
Technician:
Ahmed

Skill:
HVAC

Status:
Assigned
```

---

## Step 5 — Customer Gets Confirmation

Customer receives:

```text
Your AC service is scheduled.

Date:
Tomorrow

Time:
2:30 PM

Technician:
Ahmed
```

---

## Step 6 — Technician Starts Journey

Technician opens the mobile app.

```text
Today's Jobs
 └── Job #1042
```

Technician selects:

```text
Start Route
```

Then:

```text
En Route
```

---

## Step 7 — Technician Arrives

Technician marks:

```text
Arrived
```

Customer receives an update.

---

## Step 8 — Technician Diagnoses Problem

Technician records:

```text
Problem:
AC not cooling

Diagnosis:
Weak capacitor
```

---

## Step 9 — Technician Performs Work

Technician adds:

```text
Part:
Capacitor

Price:
₹450

Labor:
₹1,500
```

Uploads before/after photos.

---

## Step 10 — Job Completed

Technician records:

```text
Resolution:
Capacitor replaced.

Result:
Cooling restored.
```

Then selects:

```text
Complete Job
```

---

## Step 11 — Invoice Generated

OpsPilot generates:

```text
Invoice #INV-1042

Labor       ₹1,500
Parts         ₹450
Tax           ₹351
------------------
Total       ₹2,301
```

---

## Step 12 — Customer Pays

Customer receives invoice and payment option.

After successful payment:

```text
Invoice:
Paid

Job:
Completed

Payment:
Received
```

---

## Step 13 — Follow-Up

OpsPilot automatically sends:

```text
Thank you for using our service.

How was your experience?

★★★★★
```

---

## Step 14 — Business Dashboard Updates

The dashboard automatically updates:

```text
Completed Jobs: +1
Revenue: +₹2,301
Payments: +₹2,301
Technician Jobs: +1
Customer History: Updated
```

---

# 39. The Core Problem → Solution Mapping

| Business Problem          | OpsPilot Solution              |
| ------------------------- | ------------------------------ |
| Requests lost             | Centralized request management |
| Manual scheduling         | Scheduling + dispatch          |
| Technician confusion      | Mobile job workflow            |
| Missed appointments       | Automated notifications        |
| Slow invoicing            | Automatic invoice generation   |
| Forgotten payments        | Payment tracking + reminders   |
| Manual customer updates   | Automated communication        |
| No operational visibility | Dashboard                      |
| Too much admin work       | Automation                     |
| Unstructured messages     | AI request intake              |
| Difficult scheduling      | AI-assisted scheduling         |
| Difficult reporting       | Analytics                      |
| Repetitive manual work    | Workflow automation            |

---

# 40. Product Philosophy

OpsPilot should not simply be:

> "Another CRM."

It should function as an:

> **Operations Copilot for field-service businesses.**

The important distinction is that the system actively helps move work forward.

Instead of:

```text
Manager checks system
Manager finds problem
Manager decides action
Manager performs action
```

OpsPilot should increasingly support:

```text
System detects event
       ↓
System identifies required action
       ↓
System proposes action
       ↓
Human approves when needed
       ↓
System executes workflow
       ↓
System records result
```

---

# 41. Human-in-the-Loop AI

AI should assist rather than silently make important business decisions.

For example:

```text
AI Recommendation
──────────────────

Job #1042 needs an HVAC technician.

Suggested technician:
Ahmed

Reason:
• HVAC skill
• Available at 2:30 PM
• 3.2 km from previous job
• No schedule conflict

[Assign Technician] [Review]
```

The operator remains in control.

---

# 42. MVP Feature Set

The first production MVP should focus on the operational loop.

### Must Have

```text
Authentication
Organization
Roles & Permissions

Customers
Requests
Jobs
Technicians

Scheduling
Dispatch

Technician Mobile Workflow

Invoices
Payments

Notifications

Dashboard
Basic Reports
```

---

# 43. Phase 2

After the core workflow works:

```text
Automation Engine
AI Request Intake
AI Job Summaries
Advanced Scheduling
WhatsApp Integration
Email/SMS Automation
Inventory
Customer Feedback
Advanced Analytics
```

---

# 44. Phase 3

Advanced platform capabilities:

```text
AI Operations Assistant
Predictive Insights
Smart Dispatch
Route Optimization
Recurring Maintenance
Customer Portal
Technician Performance Analytics
Advanced Workflow Builder
Multi-location Businesses
Advanced Integrations
```

---

# 45. Core Screens

## Public

```text
Landing Page
Pricing
Login
Sign Up
Forgot Password
```

## Onboarding

```text
Business Setup
Business Type
Working Hours
Services
Team Setup
Complete Setup
```

## Main Application

```text
Dashboard
Customers
Customer Details
Requests
Request Details
Jobs
Job Details
Schedule
Dispatch Board
Technicians
Technician Details
Invoices
Invoice Details
Payments
Reports
AI Assistant
Automations
Notifications
Settings
```

## Technician

```text
Technician Dashboard
Today's Jobs
Job Details
Navigation
Work Checklist
Parts
Notes
Photos
Signature
Complete Job
```

## Customer

```text
Customer Portal
Appointment
Technician Status
Job Status
Invoice
Payment
Service History
Feedback
```

---

# 46. Navigation Structure

```text
OpsPilot
│
├── Dashboard
│
├── Operations
│   ├── Requests
│   ├── Jobs
│   ├── Schedule
│   └── Dispatch
│
├── Customers
│
├── Team
│   └── Technicians
│
├── Finance
│   ├── Invoices
│   └── Payments
│
├── Automation
│
├── AI Assistant
│
├── Reports
│
└── Settings
```

---

# 47. Primary User Goal

The most important user goal can be summarized as:

```text
"I want to run my service business
without spending my entire day
coordinating jobs, technicians,
customers, invoices and payments."
```

OpsPilot solves this by connecting the entire operational lifecycle:

```text
Customer Request
       ↓
Operational Planning
       ↓
Technician Execution
       ↓
Financial Completion
       ↓
Customer Follow-up
```

---

# 48. Success Criteria

OpsPilot is successful when a business can:

1. Capture every customer request.
2. Convert requests into jobs.
3. Schedule jobs quickly.
4. Assign the right technician.
5. Keep technicians informed.
6. Track work in real time.
7. Complete jobs digitally.
8. Generate invoices quickly.
9. Collect payments.
10. Automatically follow up with customers.
11. Understand business performance.
12. Reduce repetitive administrative work.

---

# 49. One-Line Product Definition

> **OpsPilot helps small field-service businesses manage the complete journey from customer request to completed job, payment, and follow-up — with automation and AI reducing the administrative workload.**

---

# 50. The Core Product Loop

The entire product should ultimately revolve around one loop:

```text
┌───────────────────────┐
│   CUSTOMER REQUEST    │
└───────────┬───────────┘
            ↓
┌───────────────────────┐
│         JOB           │
└───────────┬───────────┘
            ↓
┌───────────────────────┐
│      SCHEDULE          │
└───────────┬───────────┘
            ↓
┌───────────────────────┐
│      DISPATCH          │
└───────────┬───────────┘
            ↓
┌───────────────────────┐
│     TECHNICIAN         │
└───────────┬───────────┘
            ↓
┌───────────────────────┐
│       SERVICE          │
└───────────┬───────────┘
            ↓
┌───────────────────────┐
│      COMPLETION        │
└───────────┬───────────┘
            ↓
┌───────────────────────┐
│       INVOICE          │
└───────────┬───────────┘
            ↓
┌───────────────────────┐
│       PAYMENT          │
└───────────┬───────────┘
            ↓
┌───────────────────────┐
│      FOLLOW-UP         │
└───────────┬───────────┘
            │
            └──────────────→ REPEAT CUSTOMER
```

**This operational loop is the heart of OpsPilot.**
