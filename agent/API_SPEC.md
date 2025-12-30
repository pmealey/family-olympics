# Family Olympics - API Specification

## Overview

RESTful API served via AWS API Gateway + Lambda. All endpoints return JSON.

**Base URL:** `https://api.{domain}/` or `https://{api-gateway-id}.execute-api.{region}.amazonaws.com/prod/`

---

## Authentication

- **All operations:** No authentication required (authentication will be added in Phase 7)
- **Judge operations:** Judge name passed in request body (stored client-side)

---

## Common Response Format

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

---

## Endpoints

### Olympics Configuration

#### GET /olympics/current
Get the current year's configuration.

**Response:**
```json
{
  "success": true,
  "data": {
    "year": 2025,
    "placementPoints": {
      "1": 4,
      "2": 3,
      "3": 2,
      "4": 1
    }
  }
}
```

#### GET /olympics/:year
Get a specific year's configuration.

**Response:** Same as above.

#### GET /olympics
List all years.

**Response:**
```json
{
  "success": true,
  "data": {
    "years": [
      { "year": 2025, "currentYear": true },
      { "year": 2023, "currentYear": false }
    ]
  }
}
```

#### POST /olympics
Create a new year.

**Request:**
```json
{
  "year": 2025,
  "placementPoints": {
    "1": 4,
    "2": 3,
    "3": 2,
    "4": 1
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "year": 2025,
    "placementPoints": { ... }
  }
}
```

#### PUT /olympics/:year
Update a year's configuration.

**Request:**
```json
{
  "placementPoints": {
    "1": 5,
    "2": 3,
    "3": 2,
    "4": 1
  },
  "currentYear": true
}
```

---

### Teams

#### GET /olympics/:year/teams
Get all teams for a year.

**Response:**
```json
{
  "success": true,
  "data": {
    "teams": [
      {
        "teamId": "team-abc123",
        "name": "Pink Flamingos",
        "color": "pink",
        "members": ["Alice", "Bob", "Charlie"],
        "bonusPoints": 0
      },
      ...
    ]
  }
}
```

#### GET /olympics/:year/teams/:teamId
Get a specific team.

**Response:**
```json
{
  "success": true,
  "data": {
    "teamId": "team-abc123",
    "name": "Pink Flamingos",
    "color": "pink",
    "members": ["Alice", "Bob", "Charlie"],
    "bonusPoints": 0
  }
}
```

#### POST /olympics/:year/teams
Create a new team.

**Request:**
```json
{
  "name": "Pink Flamingos",
  "color": "pink",
  "members": ["Alice", "Bob", "Charlie"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "teamId": "team-abc123",
    "name": "Pink Flamingos",
    "color": "pink",
    "members": ["Alice", "Bob", "Charlie"],
    "bonusPoints": 0
  }
}
```

#### PUT /olympics/:year/teams/:teamId
Update a team.

**Request:**
```json
{
  "name": "Pink Flamingos",
  "members": ["Alice", "Bob", "Charlie", "Diana"],
  "bonusPoints": 1
}
```

#### DELETE /olympics/:year/teams/:teamId
Delete a team.

**Response:**
```json
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

---

### Events

#### GET /olympics/:year/events
Get all events for a year.

**Query Parameters:**
- `day` (optional): Filter by day (1 or 2)
- `status` (optional): Filter by status (upcoming, in-progress, completed)

**Response:**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "eventId": "event-xyz789",
        "name": "Snowball Toss",
        "location": "Backyard",
        "rulesUrl": "https://docs.google.com/...",
        "scoringType": "placement",
        "scheduledDay": 1,
        "scheduledTime": "2025-02-15T10:00:00Z",
        "status": "upcoming"
      },
      {
        "eventId": "event-def456",
        "name": "Snow Sculpture",
        "location": "Front Yard",
        "rulesUrl": "https://docs.google.com/...",
        "scoringType": "judged",
        "judgedCategories": ["Creativity", "Execution", "Style"],
        "scheduledDay": 2,
        "scheduledTime": "2025-02-16T14:00:00Z",
        "status": "upcoming"
      }
    ]
  }
}
```

#### GET /olympics/:year/events/:eventId
Get a specific event.

**Response:**
```json
{
  "success": true,
  "data": {
    "eventId": "event-xyz789",
    "name": "Snowball Toss",
    "location": "Backyard",
    "rulesUrl": "https://docs.google.com/...",
    "scoringType": "placement",
    "scheduledDay": 1,
    "scheduledTime": "2025-02-15T10:00:00Z",
    "status": "upcoming"
  }
}
```

#### POST /olympics/:year/events
Create a new event.

**Request (Placement Event):**
```json
{
  "name": "Snowball Toss",
  "location": "Backyard",
  "rulesUrl": "https://docs.google.com/...",
  "scoringType": "placement",
  "scheduledDay": 1,
  "scheduledTime": "2025-02-15T10:00:00Z"
}
```

**Request (Judged Event):**
```json
{
  "name": "Snow Sculpture",
  "location": "Front Yard",
  "rulesUrl": "https://docs.google.com/...",
  "scoringType": "judged",
  "judgedCategories": ["Creativity", "Execution", "Style"],
  "scheduledDay": 2,
  "scheduledTime": "2025-02-16T14:00:00Z"
}
```

#### PUT /olympics/:year/events/:eventId
Update an event.

**Request:**
```json
{
  "status": "in-progress"
}
```

#### DELETE /olympics/:year/events/:eventId
Delete an event.

---

### Scores

#### GET /olympics/:year/scores
Get all scores for a year (for standings calculation).

**Response:**
```json
{
  "success": true,
  "data": {
    "scores": [
      {
        "eventId": "event-xyz789",
        "scoreId": "placement#team-abc123",
        "teamId": "team-abc123",
        "place": 1,
        "rawScore": "2:34"
      },
      {
        "eventId": "event-def456",
        "scoreId": "judge#Uncle Bob#team-abc123",
        "teamId": "team-abc123",
        "judgeName": "Uncle Bob",
        "categoryScores": {
          "Creativity": 8,
          "Execution": 9,
          "Style": 7
        }
      }
    ]
  }
}
```

#### GET /olympics/:year/events/:eventId/scores
Get all scores for an event.

**Response:** Same format as above, filtered to event.

#### POST /olympics/:year/events/:eventId/scores/placement
Submit placement scores.

**Request:**
```json
{
  "placements": [
    {
      "teamId": "team-abc123",
      "place": 1,
      "rawScore": "2:34"
    },
    {
      "teamId": "team-def456",
      "place": 2,
      "rawScore": "2:45"
    }
  ]
}
```

#### POST /olympics/:year/events/:eventId/scores/judge
Submit judge scores.

**Request:**
```json
{
  "judgeName": "Uncle Bob",
  "teamId": "team-abc123",
  "categoryScores": {
    "Creativity": 8,
    "Execution": 9,
    "Style": 7
  }
}
```

#### PUT /olympics/:year/events/:eventId/scores/judge
Update judge scores (same judge, same team).

**Request:** Same as POST.

#### DELETE /olympics/:year/events/:eventId/scores/:scoreId
Delete a score.

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `UNAUTHORIZED` | 401 | Invalid or missing admin token |
| `CONFLICT` | 409 | Resource already exists |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limiting

No rate limiting for this hobby project. If needed, can be added via API Gateway.

---

## CORS Configuration

Allow all origins for local development:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

---

## Lambda Function Structure

```
/lib/lambda/
├── olympics/
│   ├── get.ts          # GET /olympics, GET /olympics/:year
│   ├── create.ts       # POST /olympics
│   ├── update.ts       # PUT /olympics/:year
│   └── delete.ts       # DELETE /olympics/:year
├── teams/
│   ├── list.ts         # GET /olympics/:year/teams
│   ├── get.ts          # GET /olympics/:year/teams/:teamId
│   ├── create.ts       # POST /olympics/:year/teams
│   ├── update.ts       # PUT /olympics/:year/teams/:teamId
│   └── delete.ts       # DELETE /olympics/:year/teams/:teamId
├── events/
│   ├── list.ts         # GET /olympics/:year/events
│   ├── get.ts          # GET /olympics/:year/events/:eventId
│   ├── create.ts       # POST /olympics/:year/events
│   ├── update.ts       # PUT /olympics/:year/events/:eventId
│   └── delete.ts       # DELETE /olympics/:year/events/:eventId
├── scores/
│   ├── list.ts         # GET /olympics/:year/scores
│   ├── listByEvent.ts  # GET /olympics/:year/events/:eventId/scores
│   ├── placement.ts    # POST placement scores
│   ├── judge.ts        # POST/PUT judge scores
│   └── delete.ts       # DELETE score
└── shared/
    ├── db.ts           # DynamoDB client and helpers
    └── response.ts     # Response formatting
```

