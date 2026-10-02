# Mini-MOJO
This the Mini-MOJO project 
# Mini-MOJO

**Mini-MOJO** is a programmatic recruitment budget optimizer inspired by Joveo MOJO.

It provides a small recruitment campaign management application where recruiters can:

* Create and manage jobs
* Create recruitment campaigns
* Allocate budgets across recruitment platforms
* Simulate campaign performance
* Track applications and qualified applicants
* Calculate cost per applicant and cost per qualified applicant
* Rebalance campaign budgets using performance data
* View recommended budget allocations
* View campaign and overall analytics
* Manage platforms and users through an admin account

The application uses simulated platform performance data rather than connecting to real job-board APIs.

---

## Tech Stack

* Node.js
* Express.js
* MongoDB
* Mongoose
* EJS
* JWT authentication
* HTTP-only cookies
* bcryptjs
* Express Validator
* Chart.js
* Nodemon for development

---

## Project Structure

```text
minimojo/
│
├── config/
│   └── db.js
│
├── controllers/
│   ├── authController.js
│   ├── jobController.js
│   ├── campaignController.js
│   ├── platformController.js
│   ├── applicationController.js
│   ├── dashboardController.js
│   └── adminController.js
│
├── middleware/
│   ├── auth.js
│   └── validators.js
│
├── models/
│   ├── user.js
│   ├── job.js
│   ├── platform.js
│   ├── application.js
│   └── campaign.js
│
├── routes/
│   ├── auth.js
│   ├── jobs.js
│   ├── campaigns.js
│   ├── platforms.js
│   ├── applications.js
│   ├── pages.js
│   └── api.js
│
├── services/
│   ├── optimizer.js
│   ├── seed.js
│   ├── applications.js
│   └── analytics.js
│
├── utils/
│   ├── AppError.js
│   ├── catchAsync.js
│   ├── validate.js
│   ├── safeJson.js
│   └── ownership.js
│
├── views/
│   ├── partials/
│   ├── auth/
│   ├── jobs/
│   ├── campaigns/
│   ├── platforms/
│   ├── applications/
│   ├── dashboard/
│   ├── analytics/
│   ├── dashboard.ejs
│   └── error.ejs
│
├── public/
│   ├── css/
│   │   ├── style.css
│   │   └── app.css
│   │
│   └── js/
│       └── dashboard.js
│
├── app.js
├── package.json
├── .env
└── .env.example
```

---

## Requirements

You need:

* Node.js
* MongoDB

The default MongoDB connection in the example environment file is:

```text
mongodb://127.0.0.1:27017/minimojo
```

---

## Installation

Clone or place the project in your desired directory and enter the project folder:

```bash
cd minimojo
```

Install the dependencies:

```bash
npm install
```

The project dependencies include:

```text
bcryptjs
cookie-parser
dotenv
ejs
express
express-validator
jsonwebtoken
mongoose
```

Nodemon is included as a development dependency.

---

## Environment Variables

Create a `.env` file in the project root.

You can use `.env.example` as the starting point.

```env
PORT=5000
NODE_ENV=development

MONGO_URI=mongodb://127.0.0.1:27017/minimojo

JWT_SECRET=change-this-to-a-long-random-string
JWT_EXPIRES_IN=7d

ADMIN_NAME=Admin
ADMIN_EMAIL=admin@minimojo.com
ADMIN_PASSWORD=Admin@123
```

### Important

`JWT_SECRET` must be present.

The application checks for it when starting. If it is missing, the server exits and asks you to configure it.

---

## Running the Application

### Development

```bash
npm run dev
```

This uses Nodemon.

### Normal start

```bash
npm start
```

The default port is:

```text
5000
```

So the application runs at:

```text
http://localhost:5000
```

---

# Authentication

Mini-MOJO uses JWT authentication stored in an HTTP-only cookie.

The cookie is named:

```text
token
```

The browser-side JavaScript cannot directly read the authentication cookie because it is configured as:

```text
httpOnly: true
```

New registrations create **recruiter** accounts.

Admin accounts are created from the environment variables during application startup if no admin account already exists.

---

## Default Admin

The seed configuration uses:

```env
ADMIN_NAME=Admin
ADMIN_EMAIL=admin@minimojo.com
ADMIN_PASSWORD=Admin@123
```

If no admin exists, the application creates the admin account using these values.

Change the credentials in `.env` before using the application in a real environment.

---

# User Roles

There are two roles:

```text
recruiter
admin
```

### Recruiter

A recruiter can work with their own:

* Jobs
* Campaigns
* Applications
* Analytics

### Admin

An admin can additionally:

* View all recruiters
* View all campaigns
* View overall application data
* Create platforms
* Edit platforms
* Delete platforms
* Change user roles
* Delete users and their associated data

The application uses ownership checks so recruiters cannot access another recruiter's records.

---

# Main Pages

## Home

```text
GET /
```

The home page redirects:

* Logged-out users → `/login`
* Recruiters → `/dashboard`
* Admins → `/admin`

---

## Authentication

```text
GET  /register
POST /register

GET  /login
POST /login

POST /logout
```

---

# Jobs

Jobs are the positions for which recruitment campaigns are created.

```text
GET  /jobs
GET  /jobs/new
POST /jobs

GET  /jobs/:id
GET  /jobs/:id/edit
POST /jobs/:id/edit
POST /jobs/:id/delete
```

A job contains information such as:

* Title
* Company
* Location
* Description
* Status

Job status can be:

```text
Open
Closed
```

---

# Campaigns

Campaigns contain the recruitment budget and publisher allocations.

```text
GET  /campaigns
GET  /campaigns/new
POST /campaigns

GET  /campaigns/:id
GET  /campaigns/:id/edit
POST /campaigns/:id/edit
POST /campaigns/:id/delete

GET  /campaigns/:id/recommendation
POST /campaigns/:id/recommendation/apply
```

A new campaign contains:

* Campaign title
* Job
* Total budget
* Selected recruitment platforms

The initial budget is split evenly between the selected platforms.

---

# Campaign Dashboard

Opening:

```text
/campaigns/:id
```

shows the campaign dashboard.

The dashboard displays:

* Total budget
* Budget split
* Amount spent
* Applicants
* Qualified applicants
* Cost per applicant
* Cost per qualified applicant
* Channel allocations
* Cost-per-applicant chart
* Optimizer history

The dashboard also provides:

```text
Simulate a day
Rebalance budget
Recommended split
Load sample data
Edit campaign
```

---

# Platforms

The seeded platforms are:

| Platform     | Cost Model | Simulated CPA | Quality Rate |
| ------------ | ---------- | ------------: | -----------: |
| LinkedIn     | CPC        |           $50 |          45% |
| Indeed       | CPC        |           $10 |          25% |
| ZipRecruiter | CPA        |           $20 |          40% |
| Glassdoor    | Flat       |           $45 |          20% |

These values are used by the simulation.

Platform routes:

```text
GET  /platforms

GET  /platforms/new
POST /platforms

GET  /platforms/:id/edit
POST /platforms/:id/edit

POST /platforms/:id/delete
```

Viewing platforms is available to authenticated users.

Creating, editing, and deleting platforms is restricted to admins.

---

# Applications

Applications can be viewed, created, edited, and deleted.

```text
GET  /applications
GET  /applications/new
POST /applications

GET  /applications/:id/edit
POST /applications/:id/edit

POST /applications/:id/delete
```

Application statuses are:

```text
New
Screened
Qualified
Rejected
Hired
```

Applications are associated with:

* Job
* Campaign
* Recruiter/owner
* Publisher
* Candidate name
* Email
* Status
* Notes

---

# Analytics

The recruiter analytics page is:

```text
GET /analytics
```

It provides:

* Overall campaign totals
* Platform-level performance
* Application funnel

The application funnel tracks:

```text
New
Screened
Qualified
Rejected
Hired
```

---

# Budget Optimization

The optimizer works using the campaign's publisher performance data.

For each publisher, the application tracks:

```text
allocated
spent
apps
qualifiedApps
cpa
```

The optimizer calculates:

```text
CPA = spent / applicants
```

and:

```text
Qualified CPA = spent / qualified applicants
```

---

## Rebalancing

The optimizer uses existing campaign performance data.

It:

1. Calculates CPA for publishers with application data.
2. Identifies the better-performing and weaker-performing channels.
3. Takes a portion of the **unspent** budget from weaker channels.
4. Moves that budget toward better-performing channels.
5. Uses inverse CPA weighting when distributing the moved budget.
6. Records the move in campaign history.
7. Changes the campaign status to `Optimized`.

The optimizer requires enough performance data.

If there is not enough data, the application asks the user to simulate a day first.

---

# Daily Simulation

The campaign dashboard can simulate one day of advertising.

The simulation:

* Uses 10% of each publisher's current allocation, subject to remaining budget.
* Generates applicants based on the platform's simulated CPA.
* Adds random variation to the simulated CPA.
* Generates qualified applicants using the platform's quality rate.
* Updates publisher spending.
* Updates applicant counts.
* Updates qualified applicant counts.
* Updates CPA.
* Creates corresponding simulated Application records.

This is simulated data and is not connected to real job-board advertising systems.

---

# Recommended Allocation

The campaign also has a recommendation system:

```text
GET /api/campaigns/:id/recommendation
```

and a page:

```text
GET /campaigns/:id/recommendation
```

The recommendation considers the cost of obtaining qualified applicants.

If a publisher has no qualified applicants yet, the optimizer estimates qualified-applicant cost using a 30% qualification assumption.

The recommendation distributes the **unspent budget** while maintaining a small allocation floor for each channel.

The recommended allocation can be applied using:

```text
POST /campaigns/:id/recommendation/apply
```

or the corresponding API endpoint.

---

# Sample Data

The application includes sample campaign performance data.

The sample values are based on a $2,000 campaign:

| Platform     | Allocated | Spent | Applicants | Qualified |
| ------------ | --------: | ----: | ---------: | --------: |
| LinkedIn     |      $600 |  $500 |         10 |         4 |
| Indeed       |      $500 |  $450 |         45 |        12 |
| ZipRecruiter |      $500 |  $300 |         15 |         8 |
| Glassdoor    |      $400 |  $200 |          4 |         1 |

The sample data is scaled to the campaign's actual budget.

The campaign dashboard provides:

```text
Load sample data
```

which resets the campaign publisher performance to the sample values.

---

# API

All `/api` routes require authentication.

## Get Campaign

```text
GET /api/campaigns/:id
```

Returns the campaign and its summary.

---

## Optimize Campaign

```text
POST /api/campaigns/:id/optimize
```

Runs the budget optimizer.

The response contains:

* Campaign
* Summary
* Optimizer message
* Budget moves

---

## Simulate a Day

```text
POST /api/campaigns/:id/simulate
```

Simulates one day of campaign performance.

It returns the updated campaign and summary.

---

## Reset Sample Data

```text
POST /api/campaigns/:id/reset
```

Loads the sample performance data.

---

## Get Recommendation

```text
GET /api/campaigns/:id/recommendation
```

Returns a recommended budget allocation.

---

## Apply Recommendation

```text
POST /api/campaigns/:id/recommendation/apply
```

Applies the recommended allocation to the campaign.

---

## Campaign Analytics

```text
GET /api/campaigns/:id/analytics
```

Returns campaign-level analytics.

---

## Overall Analytics

```text
GET /api/analytics
```

Returns analytics across the authenticated user's campaigns.

For an admin, the ownership filter allows the admin to see data across campaigns.

---

# Ownership and Access Control

The application uses an ownership helper for protected resources.

Recruiters normally query documents where:

```text
owner = logged-in user
```

Admins can access all records.

When a recruiter tries to access another user's record, the application returns a `404` rather than revealing that another user's record exists.

---

# Error Handling

The application has a central error handler.

It handles common cases including:

* Application errors with HTTP status codes
* Mongoose validation errors
* Invalid MongoDB IDs
* Duplicate-key errors
* API errors
* Unknown routes

API errors are returned as JSON.

Normal page errors are rendered using:

```text
views/error.ejs
```

---

# Validation

The project uses `express-validator`.

Validation is provided for:

* Registration
* Login
* Jobs
* Platforms
* Campaign creation
* Campaign editing
* Applications

Examples include:

```text
Email must be valid
Password must be at least 6 characters
Campaign budget must be greater than 0
A campaign must contain at least one platform
Platform quality rate must be between 0 and 1
```

---

# Database

MongoDB is accessed using Mongoose.

The database URI is configured through:

```env
MONGO_URI
```

The default example database is:

```text
minimojo
```

The project seeds:

* An initial admin account when no admin exists
* Default recruitment platforms when no platforms exist

---

# NPM Scripts

The project defines two scripts.

### Start

```bash
npm start
```

Runs:

```text
node app.js
```

### Development

```bash
npm run dev
```

Runs:

```text
nodemon app.js
```

---

# Application Flow

A typical workflow is:

```text
Register / Login
      ↓
Create Job
      ↓
Create Campaign
      ↓
Select Platforms
      ↓
Set Campaign Budget
      ↓
Simulate a Day
      ↓
Collect Simulated Applications
      ↓
Review CPA / Qualified CPA
      ↓
Rebalance Budget
      ↓
Run Another Simulation
      ↓
Review Analytics
```

The recommendation page can also be used to inspect and apply a proposed budget split.

---

# Important Note About Simulation

Mini-MOJO currently uses simulated recruitment data.

The platform configuration contains simulated:

```text
CPA
Quality Rate
```

The application does not connect to live LinkedIn, Indeed, ZipRecruiter, Glassdoor, or other recruitment advertising APIs in this project version.

---

# License

No license is specified in the supplied project files.

