# Family Olympics - Data Models

## Overview

All data is stored in DynamoDB. The data model supports multi-year usage with a `year` field on all records.

---

## Tables

### 1. Olympics Table

Stores per-year configuration including placement points.

**Table Name:** `FamilyOlympics-Olympics`

**Schema:**
```
PK: year (Number) - e.g., 2025

Attributes:
- year: Number (PK)
- placementPoints: Map
    {
      "1": 4,
      "2": 3,
      "3": 2,
      "4": 1
    }
- currentYear: Boolean (only one record should have this as true)
- createdAt: String (ISO timestamp)
- updatedAt: String (ISO timestamp)
```

**Example Record:**
```json
{
  "year": 2025,
  "placementPoints": {
    "1": 4,
    "2": 3,
    "3": 2,
    "4": 1
  },
  "currentYear": true,
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-01-15T10:00:00Z"
}
```

---

### 2. Teams Table

Stores team definitions per year.

**Table Name:** `FamilyOlympics-Teams`

**Schema:**
```
PK: year (Number)
SK: teamId (String) - UUID

Attributes:
- year: Number (PK)
- teamId: String (SK)
- name: String - e.g., "Pink Flamingos"
- color: String - e.g., "pink" (one of: green, pink, yellow, orange)
- members: List<String> - ["Alice", "Bob", "Charlie"]
- bonusPoints: Number - default 0, used for tiebreakers
- createdAt: String (ISO timestamp)
- updatedAt: String (ISO timestamp)
```

**Example Record:**
```json
{
  "year": 2025,
  "teamId": "team-abc123",
  "name": "Pink Flamingos",
  "color": "pink",
  "members": ["Alice", "Bob", "Charlie", "Diana"],
  "bonusPoints": 0,
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-01-15T10:00:00Z"
}
```

**Access Patterns:**
- Get all teams for a year: Query by `year`
- Get specific team: Query by `year` + `teamId`

---

### 3. Events Table

Stores event definitions per year.

**Table Name:** `FamilyOlympics-Events`

**Schema:**
```
PK: year (Number)
SK: eventId (String) - UUID

Attributes:
- year: Number (PK)
- eventId: String (SK)
- name: String - e.g., "Snowball Toss"
- sponsor: String - optional sponsor name (e.g., "Acme Co.")
- location: String - e.g., "Backyard"
- rulesUrl: String - Google Doc URL
- scoringType: String - "placement" | "judged"
- judgedCategories: List<String> - only if scoringType is "judged"
    e.g., ["Creativity", "Execution", "Style"]
- scheduledDay: Number - 1 or 2
- scheduledTime: String - ISO timestamp or time string (used for sorting)
- status: String - "upcoming" | "in-progress" | "completed"
- createdAt: String (ISO timestamp)
- updatedAt: String (ISO timestamp)
```

**Example Record (Placement Event):**
```json
{
  "year": 2025,
  "eventId": "event-xyz789",
  "name": "Snowball Toss",
  "location": "Backyard",
  "rulesUrl": "https://docs.google.com/document/d/abc123",
  "scoringType": "placement",
  "scheduledDay": 1,
  "scheduledTime": "2025-02-15T10:00:00Z",
  "status": "upcoming",
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-01-15T10:00:00Z"
}
```

**Example Record (Judged Event):**
```json
{
  "year": 2025,
  "eventId": "event-def456",
  "name": "Snow Sculpture",
  "location": "Front Yard",
  "rulesUrl": "https://docs.google.com/document/d/def456",
  "scoringType": "judged",
  "judgedCategories": ["Creativity", "Execution", "Style"],
  "scheduledDay": 2,
  "scheduledTime": "2025-02-16T14:00:00Z",
  "status": "upcoming",
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-01-15T10:00:00Z"
}
```

**Access Patterns:**
- Get all events for a year: Query by `year`
- Get specific event: Query by `year` + `eventId`
- Get events by day: Query by `year`, filter by `scheduledDay`

---

### 4. Scores Table

Stores scores for events. Structure varies by event type.

**Table Name:** `FamilyOlympics-Scores`

**Schema:**
```
PK: eventId (String)
SK: scoreId (String) - format varies:
    - Placement: "placement#{teamId}"
    - Judged: "judge#{judgeName}#{teamId}"

Common Attributes:
- eventId: String (PK)
- scoreId: String (SK)
- year: Number (for querying all scores by year via GSI)
- teamId: String
- createdAt: String (ISO timestamp)
- updatedAt: String (ISO timestamp)

Placement-specific Attributes:
- place: Number - 1, 2, 3, or 4
- rawScore: String - the actual score (time, distance, etc.)

Judged-specific Attributes:
- judgeName: String
- categoryScores: Map - { "Creativity": 8, "Execution": 9, "Style": 7 }
```

**Example Record (Placement):**
```json
{
  "eventId": "event-xyz789",
  "scoreId": "placement#team-abc123",
  "year": 2025,
  "teamId": "team-abc123",
  "place": 1,
  "rawScore": "2:34",
  "createdAt": "2025-02-15T11:00:00Z",
  "updatedAt": "2025-02-15T11:00:00Z"
}
```

**Example Record (Judged):**
```json
{
  "eventId": "event-def456",
  "scoreId": "judge#Uncle Bob#team-abc123",
  "year": 2025,
  "teamId": "team-abc123",
  "judgeName": "Uncle Bob",
  "categoryScores": {
    "Creativity": 8,
    "Execution": 9,
    "Style": 7
  },
  "createdAt": "2025-02-16T15:00:00Z",
  "updatedAt": "2025-02-16T15:00:00Z"
}
```

**Global Secondary Index (GSI):**
- **Name:** `YearIndex`
- **PK:** `year`
- **SK:** `eventId`
- **Purpose:** Query all scores for a given year

**Access Patterns:**
- Get all scores for an event: Query by `eventId`
- Get placement for a team: Query by `eventId` + `scoreId` prefix "placement#"
- Get all judge scores for a team: Query by `eventId` + `scoreId` prefix "judge#"
- Get all scores by a judge: Scan with filter (infrequent operation)
- Get all scores for a year: Query GSI by `year`

---

## Client-Side Calculations

### Standings Calculation

The client calculates standings using:

1. Fetch Olympics config (placementPoints)
2. Fetch all teams for the year
3. Fetch all scores for the year

**Algorithm:**
```javascript
function calculateStandings(olympics, teams, scores) {
  const placementPoints = olympics.placementPoints;
  
  // Initialize team points
  const teamPoints = {};
  teams.forEach(team => {
    teamPoints[team.teamId] = {
      team: team,
      eventPoints: {},
      totalPoints: team.bonusPoints || 0
    };
  });
  
  // Group scores by event
  const scoresByEvent = groupBy(scores, 'eventId');
  
  // For each event, calculate placements and points
  for (const [eventId, eventScores] of Object.entries(scoresByEvent)) {
    // Get placement scores (not judge scores)
    const placements = eventScores.filter(s => s.scoreId.startsWith('placement#'));
    
    placements.forEach(score => {
      const points = placementPoints[score.place] || 0;
      teamPoints[score.teamId].eventPoints[eventId] = points;
      teamPoints[score.teamId].totalPoints += points;
    });
  }
  
  // Sort by total points descending
  return Object.values(teamPoints)
    .sort((a, b) => b.totalPoints - a.totalPoints);
}
```

### Judged Event Auto-Suggest

**Algorithm:**
```javascript
function calculateJudgedResults(event, judgeScores) {
  // Group by team
  const teamScores = {};
  
  judgeScores.forEach(score => {
    if (!teamScores[score.teamId]) {
      teamScores[score.teamId] = {
        teamId: score.teamId,
        totalScore: 0,
        categoryTotals: {},
        judgeCount: 0
      };
    }
    
    const team = teamScores[score.teamId];
    team.judgeCount++;
    
    // Sum category scores
    for (const [category, value] of Object.entries(score.categoryScores)) {
      team.categoryTotals[category] = (team.categoryTotals[category] || 0) + value;
      team.totalScore += value;
    }
  });
  
  // Sort by total score descending
  const ranked = Object.values(teamScores)
    .sort((a, b) => b.totalScore - a.totalScore);
  
  // Assign suggested places
  return ranked.map((team, index) => ({
    ...team,
    suggestedPlace: index + 1
  }));
}
```

---

## Data Relationships

```
Olympics (1)
    │
    ├── Teams (many)
    │
    └── Events (many)
            │
            └── Scores (many)
                 ├── Placement scores (one per team per event)
                 └── Judge scores (one per judge per team per event)
```

---

## Notes

1. **Year as Number:** Using year as a number (e.g., 2025) for easy sorting and querying.

2. **No cascade deletes:** DynamoDB doesn't support cascading deletes. If deleting a year's data, need to delete from all tables.

3. **Score ID format:** Using composite score IDs allows efficient querying:
   - `placement#teamId` - unique per team per event
   - `judge#judgeName#teamId` - unique per judge per team per event

4. **Denormalization:** Year is stored on scores for the GSI, even though it could be derived from the event.

5. **Eventual consistency:** Client-side calculation means standings update immediately without server round-trips.

