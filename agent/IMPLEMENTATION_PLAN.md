# Family Olympics Website - Implementation Plan

## Overview

A mobile-first website for the Family Olympics, a bi-yearly winter event in Vermont where family members split into teams and compete in various winter-themed events.

### Key Features

- **Public Interface:** View schedule, event rules (via Google Docs), results, and standings
- **Admin Interface:** Manage teams, events, schedule, and scoring (password-protected)
- **Judge Interface:** Enter scores for judged events (name tracked via local storage)
- **Reusable:** Year-based data organization for bi-yearly reuse

### Tech Stack

- **Frontend:** React + Vite + React Router
- **Backend:** AWS CDK (API Gateway, Lambda, DynamoDB)
- **Design:** Mobile-first, winter theme with team color accents

---

## Phase 1: Project Foundation

### Step 1.1: Backend Infrastructure (CDK)

**Goal:** Set up DynamoDB tables, Lambda functions, and API Gateway.

**Tasks:**
- [ ] Define DynamoDB tables (see DATA_MODELS.md):
  - `Olympics` table (year-based configuration)
  - `Teams` table
  - `Events` table
  - `Scores` table
- [ ] Create Lambda handlers for CRUD operations
- [ ] Set up API Gateway with REST endpoints (see API_SPEC.md)
- [ ] Configure CORS for local development
- [ ] Add robots.txt via CloudFront or S3 static hosting

**Deliverables:**
- Deployed DynamoDB tables
- Working API endpoints
- Local development CORS configuration

### Step 1.2: Frontend Routing & Layout

**Goal:** Establish route structure and mobile-first layout shell.

**Tasks:**
- [ ] Install React Router
- [ ] Create route structure:
  - `/` - Main page (logo, standings, calendar link)
  - `/schedule` - Full schedule/calendar view
  - `/events/:eventId` - Event details page
  - `/judge` - Judge interface
  - `/admin` - Admin interface
- [ ] Create mobile-first layout component with navigation
- [ ] Add meta robots noindex tag

**Deliverables:**
- Working navigation between all routes
- Responsive layout shell

### Step 1.3: Design System

**Goal:** Establish visual design and reusable components.

**Tasks:**
- [ ] Define CSS variables for winter theme:
  - Base: Snow/ice blues and whites
  - Accents: Team colors (green, pink, yellow, orange)
- [ ] Create component library:
  - Button, Card, Input, Select
  - Navigation (bottom nav for mobile)
  - Team color indicators
  - Loading states
- [ ] Set up responsive breakpoints (mobile-first)

**Deliverables:**
- CSS variable definitions
- Reusable component library
- Consistent styling across app

---

## Phase 2: Admin Interface

### Step 2.1: Admin Access

**Goal:** Simple admin interface (password protection moved to Phase 7 - Optional).

**Tasks:**
- [ ] Admin layout with navigation tabs
- [ ] Direct access to admin dashboard

**Deliverables:**
- Admin interface layout
- Navigation structure

### Step 2.2: Olympics Configuration

**Goal:** Configure year and global settings.

**Tasks:**
- [ ] Create/select olympics year
- [ ] Configure global placement points (e.g., 1st=4, 2nd=3, 3rd=2, 4th=1)
- [ ] Set current active year

**Deliverables:**
- Year management UI
- Global placement configuration

### Step 2.3: Team Management

**Goal:** Full CRUD for teams.

**Tasks:**
- [ ] List all teams for current year
- [ ] Create team: name, color, members list
- [ ] Edit team details
- [ ] Delete team
- [ ] Add/remove bonus points (tiebreaker)

**Deliverables:**
- Team management UI
- API integration for team CRUD

### Step 2.4: Event Definition

**Goal:** Full CRUD for events.

**Tasks:**
- [ ] List all events for current year
- [ ] Create event:
  - Name
  - Location (simple text field)
  - Rules link (Google Doc URL)
  - Scoring type: "placement" or "judged"
  - If judged: define category names (dynamic list)
- [ ] Edit event details
- [ ] Delete event

**Deliverables:**
- Event management UI
- Support for both scoring types

### Step 2.5: Schedule Management

**Goal:** Assign times and manage event status.

**Tasks:**
- [ ] Assign date/time to events
- [ ] Assign to Day 1 or Day 2
- [ ] Set event status: upcoming, in-progress, completed
- [ ] Reorder events within a day

**Deliverables:**
- Schedule management UI
- Day-based event grouping

### Step 2.6: Placement Event Scoring (Admin)

**Goal:** Record results for placement-based events.

**Tasks:**
- [ ] Select event to score
- [ ] For each team: enter place (1st, 2nd, etc.) and raw score (time, number, etc.)
- [ ] Save results
- [ ] Mark event as completed

**Deliverables:**
- Placement scoring UI
- Results saved to Scores table

### Step 2.7: Judged Event Results (Admin)

**Goal:** View aggregated judge scores and finalize results.

**Tasks:**
- [ ] View all judge submissions for an event
- [ ] Auto-calculate standings based on aggregate scores
- [ ] Confirm/finalize placements
- [ ] Override placements if needed
- [ ] Mark event as completed

**Deliverables:**
- Judge score aggregation view
- Finalize results UI

---

## Phase 3: Public Interface

### Step 3.1: Main Page

**Goal:** Landing page with logo, standings, and navigation.

**Tasks:**
- [ ] Logo display (placeholder, user adds image later)
- [ ] Current standings display (calculated client-side)
- [ ] Prominent link to schedule/calendar
- [ ] Link to individual event pages

**Deliverables:**
- Polished main page
- Real-time standings calculation

### Step 3.2: Schedule Page

**Goal:** Full schedule view grouped by day.

**Tasks:**
- [ ] Display events grouped by Day 1 / Day 2
- [ ] Each event shows: time, name, location, status badge
- [ ] Tap event → navigate to event detail page
- [ ] Visual distinction for completed vs upcoming events

**Deliverables:**
- Schedule page with day grouping
- Event status indicators

### Step 3.3: Event Detail Pages

**Goal:** Individual pages for each event with rules and results.

**Tasks:**
- [ ] Event name and location header
- [ ] Embedded or linked Google Doc for rules
- [ ] If completed: show results (placements and scores)
- [ ] If in-progress: show "Scoring in progress" message
- [ ] If upcoming: show scheduled time

**Deliverables:**
- Event detail pages with routing
- Google Doc integration
- Conditional results display

### Step 3.4: Standings Calculation

**Goal:** Client-side standings calculation from scores data.

**Tasks:**
- [ ] Fetch all scores for current year
- [ ] Calculate points per event based on global placement config
- [ ] Sum points per team
- [ ] Add bonus points
- [ ] Sort descending, handle ties
- [ ] Display on main page

**Deliverables:**
- Client-side standings calculation logic
- Standings display component

---

## Phase 4: Judge Interface

### Step 4.1: Judge Identification

**Goal:** Track judge identity via local storage.

**Tasks:**
- [ ] First visit: prompt for judge name
- [ ] Store name in local storage
- [ ] Allow changing name
- [ ] Display which events judge has already scored

**Deliverables:**
- Judge name capture
- Score history per judge

### Step 4.2: Judged Event Scoring

**Goal:** Easy score entry for judged events.

**Tasks:**
- [ ] List events available for judging (in-progress, judged type)
- [ ] Select event → display teams to score
- [ ] For each team: score each category (1-10)
- [ ] Submit scores
- [ ] Mark team as scored, show next team

**Deliverables:**
- Mobile-friendly scoring UI
- Score submission to API

### Step 4.3: Score Display

**Goal:** Show submitted scores and aggregates.

**Tasks:**
- [ ] Judge can view their submitted scores
- [ ] Show aggregate scores per team (read-only)
- [ ] Auto-highlight current leader

**Deliverables:**
- Score review UI
- Leader indication

---

## Phase 5: Polish & Deployment

### Step 5.1: Mobile UX Refinement

**Tasks:**
- [ ] Touch-friendly tap targets (44px minimum)
- [ ] Smooth page transitions
- [ ] Pull-to-refresh or refresh button
- [ ] Optimistic UI updates where appropriate

### Step 5.2: Edge Cases & Error Handling

**Tasks:**
- [ ] Empty states (no events, no scores)
- [ ] Loading states
- [ ] Error messages
- [ ] Offline handling (graceful degradation)

### Step 5.3: SEO Prevention

**Tasks:**
- [ ] robots.txt disallowing all crawlers
- [ ] Meta robots noindex, nofollow tags
- [ ] X-Robots-Tag header via CloudFront

### Step 5.4: Deployment

**Tasks:**
- [ ] Deploy CDK stack to AWS
- [ ] Configure custom domain (if desired)
- [ ] Set up CloudFront for frontend hosting
- [ ] Test end-to-end flow

---

## Phase 6: Optional - Photo Uploads

*Only if time permits.*

### Step 6.1: Photo Infrastructure

**Tasks:**
- [ ] S3 bucket for photo storage
- [ ] Lambda for presigned upload URLs
- [ ] API endpoints for photo metadata

### Step 6.2: Photo UI

**Tasks:**
- [ ] Upload button on event pages
- [ ] Photo gallery per event
- [ ] Simple lightbox viewer
- [ ] Photo deletion (admin only)

---

## Phase 7: Optional - Password Protection

*Nice-to-have feature for future enhancement.*

### Step 7.1: Admin Password Implementation

**Tasks:**
- [ ] Add password hashing (bcryptjs or similar)
- [ ] Store password hash in Olympics table
- [ ] Create password entry screen
- [ ] Validate password on login
- [ ] Store auth token in local storage
- [ ] Protect admin routes

**Deliverables:**
- Password-protected admin access
- Secure authentication flow

---

## Implementation Order

| Priority | Phase.Step | Description | Effort | Dependencies |
|----------|------------|-------------|--------|--------------|
| 1 | 1.1 | Backend Infrastructure | High | None |
| 2 | 1.2 | Frontend Routing | Low | None |
| 3 | 1.3 | Design System | Medium | None |
| 4 | 2.1 | Admin Access | Low | 1.2 |
| 5 | 2.2 | Olympics Configuration | Low | 1.1, 2.1 |
| 6 | 2.3 | Team Management | Medium | 2.2 |
| 7 | 2.4 | Event Definition | Medium | 2.2 |
| 8 | 2.5 | Schedule Management | Low | 2.4 |
| 9 | 3.1 | Main Page | Medium | 2.3 |
| 10 | 3.2 | Schedule Page | Medium | 2.5 |
| 11 | 3.3 | Event Detail Pages | Medium | 2.4 |
| 12 | 3.4 | Standings Calculation | Medium | 2.3, 2.6 |
| 13 | 2.6 | Placement Scoring | Medium | 2.4 |
| 14 | 4.1 | Judge Identification | Low | 1.2 |
| 15 | 4.2 | Judged Event Scoring | High | 2.4, 4.1 |
| 16 | 4.3 | Score Display | Medium | 4.2 |
| 17 | 2.7 | Judged Event Results | Medium | 4.2 |
| 18 | 5.x | Polish & Deployment | Medium | All above |
| 19 | 6.x | Photos (Optional) | Medium | 5.x |

---

## Success Criteria

- [ ] Competitors can view schedule and event rules on mobile
- [ ] Competitors can view live standings during the event
- [ ] Admin can manage teams, events, and scores
- [ ] Judges can easily enter scores on mobile
- [ ] Site is reusable for future years
- [ ] Site is not indexed by search engines

