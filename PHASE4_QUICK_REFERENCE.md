# Phase 4: Judge Interface - Quick Reference

## Routes

| Route | Purpose | Auth Required |
|-------|---------|---------------|
| `/judge` | Judge name entry | No |
| `/judge/events` | List of events to judge | Judge name in localStorage |
| `/judge/events/:eventId/score` | Score entry for event | Judge name in localStorage |

## Components

### ScoreInput
```tsx
<ScoreInput
  label="Creativity"
  value={score}
  onChange={(score) => handleScoreChange(score)}
  disabled={false}
/>
```

**Props:**
- `label: string` - Category name
- `value: number | null` - Current score (1-10)
- `onChange: (score: number) => void` - Handler
- `disabled?: boolean` - Disable input

## Context

### JudgeContext
```tsx
import { useJudge } from './contexts';

const { judgeName, setJudgeName, clearJudgeName } = useJudge();
```

**API:**
- `judgeName: string | null` - Current judge name
- `setJudgeName(name: string)` - Save name to localStorage
- `clearJudgeName()` - Remove name from localStorage

**Storage Key:** `familyOlympics_judgeName`

## API Integration

### Submit Judge Score
```typescript
await apiClient.submitJudgeScore(year, eventId, {
  judgeName: "Uncle Bob",
  teamId: "team-123",
  categoryScores: {
    "Creativity": 8,
    "Execution": 9,
    "Style": 7
  }
});
```

### Fetch Event Scores
```typescript
const { data } = useEventScores(year, eventId);
// data.scores contains all scores for the event
```

## Data Flow

### Judge Score Submission
```
1. Judge enters scores (1-10) for each category
2. Click "Submit Scores"
3. POST /olympics/:year/events/:eventId/scores/judge
4. Score saved with scoreId: "judge#{judgeName}#{teamId}"
5. Refresh scores from API
6. Advance to next team or show aggregates
```

### Aggregate Calculation
```typescript
// Group scores by team
const teamScores = {};
judgeScores.forEach(score => {
  if (!teamScores[score.teamId]) {
    teamScores[score.teamId] = {
      totalScore: 0,
      judgeCount: 0
    };
  }
  teamScores[score.teamId].judgeCount++;
  Object.values(score.categoryScores).forEach(value => {
    teamScores[score.teamId].totalScore += value;
  });
});

// Sort by total score descending
const standings = Object.values(teamScores)
  .sort((a, b) => b.totalScore - a.totalScore);
```

## Key Features

### Judge Name Management
- Stored in browser localStorage
- Persists across sessions
- Can be changed via "Edit" button
- Auto-redirects if already set

### Scoring Progress Tracking
- ✓ = Team scored by this judge
- ○ = Team not yet scored
- Shows progress: "2 of 4 teams scored"

### Score Entry Flow
1. Select event from list
2. Score first team (all categories)
3. Submit → auto-advance to next team
4. Repeat until all teams scored
5. View aggregate standings

### Aggregate View
- Shows judge's personal scores
- Shows overall standings (all judges)
- Leader highlighted with 👑 and yellow ring
- Displays judge count per team

## Styling Classes

### Team Colors
- `bg-team-green` - Green team
- `bg-team-pink` - Pink team
- `bg-team-yellow` - Yellow team
- `bg-team-orange` - Orange team

### Winter Theme
- `text-winter-dark` - Dark navy text
- `text-winter-gray` - Muted gray text
- `bg-winter-accent` - Blue accent
- `text-winter-accent` - Blue accent text

### Status Badges
- `status="upcoming"` - Gray badge
- `status="in-progress"` - Blue badge with pulse
- `status="completed"` - Green badge

## Common Patterns

### Check if Team is Scored
```typescript
const judgeScores = scores.filter(
  (score): score is JudgeScore =>
    'judgeName' in score && score.judgeName === judgeName
);

const scoredTeamIds = new Set(judgeScores.map(s => s.teamId));
const isScored = scoredTeamIds.has(teamId);
```

### Calculate Total Score
```typescript
const total = Object.values(categoryScores).reduce(
  (sum, score) => sum + score,
  0
);
```

### Filter Judged Events
```typescript
const judgedEvents = events.filter(
  event => event.scoringType === 'judged' && 
           event.status === 'in-progress'
);
```

## Debugging

### Check Local Storage
```javascript
// In browser console
localStorage.getItem('familyOlympics_judgeName')
```

### Clear Judge Name
```javascript
// In browser console
localStorage.removeItem('familyOlympics_judgeName')
```

### View All Scores
```javascript
// In React DevTools, find useEventScores hook
// Or check Network tab for API responses
```

## Mobile Considerations

- Touch targets: 44px minimum
- Score buttons: Large and tappable
- Responsive grid: 10 columns for scores
- No horizontal scroll
- Stack cards vertically

## Accessibility

- ARIA labels on score buttons
- Focus indicators on all interactive elements
- Keyboard navigation support
- Screen reader friendly
- Semantic HTML structure

## Error Handling

### Network Errors
- Display error message in red box
- Retry button available
- Loading state during retry

### Validation Errors
- Name too short: "Name must be at least 2 characters"
- Empty name: "Please enter your name"
- API errors: Display server error message

### Empty States
- No events: "No events are currently available for judging"
- No Olympics: "No active Olympics found"
- No scores: "You haven't scored any teams yet"

## Performance Tips

- Use `useMemo` for expensive calculations
- Use `useCallback` for stable function references
- Minimize re-renders with proper dependencies
- Fetch data only when needed

## Security Notes

- No authentication required (as per Phase 7 plan)
- Judge name is client-side only
- No sensitive data stored
- CORS configured for API access

## Future Enhancements (Not in Phase 4)

- Edit submitted scores
- Delete submitted scores
- View other judges' individual scores
- Real-time score updates (WebSocket)
- Offline support with sync
- Photo uploads per team
- Comments/notes per score

