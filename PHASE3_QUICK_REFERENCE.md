# Phase 3 Quick Reference - Public Interface

## 📄 Files Modified/Created

### New Components
```
ui/src/components/
├── Logo.tsx              # Custom SVG logo with winter theme
└── EventCard.tsx         # Reusable event display card
```

### New Utilities
```
ui/src/lib/
└── standings.ts          # Standings calculation logic
```

### Updated Pages
```
ui/src/pages/
├── Home.tsx              # Landing page with live standings
├── Schedule.tsx          # Event schedule grouped by day
└── EventDetail.tsx       # Individual event with rules & results
```

### Documentation
```
PHASE3_SUMMARY.md         # Complete implementation summary
PHASE3_TESTING.md         # Comprehensive testing guide
PHASE3_QUICK_REFERENCE.md # This file
```

---

## 🎯 Key Features Implemented

### Home Page (`/`)
- Custom SVG logo
- Live standings calculation
- Medal emojis for top 3
- Team color indicators
- Event completion progress
- "View Schedule" CTA button

### Schedule Page (`/schedule`)
- Events grouped by Day 1 and Day 2
- Sorted by time within each day
- Status badges (Upcoming, In Progress, Completed)
- Clickable event cards
- Smart emoji icons

### Event Detail Page (`/events/:eventId`)
- Event header with status
- Results for completed events
- Google Docs iframe for rules
- Status-specific messaging
- Back navigation

---

## 🔧 Core Functions

### Standings Calculation
```typescript
// Calculate standings from Olympics config, teams, and scores
calculateStandings(olympics, teams, scores): TeamStanding[]

// Get medal emoji for rank (1-3)
getMedalEmoji(rank: number): string

// Format points with proper singular/plural
formatPoints(points: number): string

// Count completed events from scores
getCompletedEventsCount(scores: Score[]): number
```

### Usage Example
```typescript
import { calculateStandings } from '../lib/standings';

const standings = calculateStandings(olympics, teams, scores);
// Returns sorted array with team, totalPoints, rank, etc.
```

---

## 🎨 Components API

### Logo Component
```typescript
<Logo 
  size="sm" | "md" | "lg" | "xl"  // Default: "lg"
  className="custom-classes"       // Optional
/>
```

### EventCard Component
```typescript
<EventCard 
  event={eventObject}              // Required: Event object
  showDay={true}                   // Optional: Show day number
  className="custom-classes"       // Optional
/>
```

---

## 📊 Data Flow

### Home Page
```
useCurrentOlympics() → Olympics config
useTeams() → Teams list
useScores() → All scores
useEvents() → Events list
↓
calculateStandings() → Sorted standings
↓
Display with medals and colors
```

### Schedule Page
```
useCurrentOlympics() → Olympics config
useEvents() → Events list
↓
Group by scheduledDay
Sort by scheduledTime
↓
Render EventCard for each event
```

### Event Detail Page
```
useCurrentOlympics() → Olympics config
useEvent() → Event details
useEventScores() → Event scores
useTeams() → Teams list
↓
Filter placement scores
Sort by place
Calculate points
↓
Display results with medals
```

---

## 🎨 Design Tokens

### Colors
```css
/* Winter Theme */
--ice-blue: #f0f7ff
--winter-dark: #1a2b3c
--winter-gray: #5a6b7c
--winter-accent: #3b82f6

/* Team Colors */
--team-green: #22c55e
--team-pink: #ec4899
--team-yellow: #eab308
--team-orange: #f97316
```

### Typography
```css
/* Fonts */
font-display: 'Outfit', sans-serif     /* Headers */
font-body: 'Inter', sans-serif         /* Body text */
font-mono: 'JetBrains Mono', monospace /* Scores */
```

---

## 🔄 State Management

### Loading States
All pages implement loading states:
```typescript
if (isLoading) {
  return <Loading />;
}
```

### Error States
All pages implement error handling:
```typescript
if (error) {
  return <ErrorMessage error={error} />;
}
```

### Empty States
All pages implement empty states:
```typescript
if (data.length === 0) {
  return <EmptyState message="No data yet" />;
}
```

---

## 🧪 Testing Quick Commands

### Build
```bash
cd ui
npm run build
```

### Development Server
```bash
cd ui
npm run dev
```

### Type Check
```bash
cd ui
npm run type-check
```

### Lint
```bash
cd ui
npm run lint
```

---

## 🐛 Common Issues

### Standings Not Updating
- Check that scores exist in database
- Verify events are marked as "completed"
- Ensure placement scores (not judge scores) exist

### Events Not Showing
- Verify scheduledDay is set (1 or 2)
- Check that events belong to current Olympics year
- Ensure API endpoint is correct

### Google Docs Not Displaying
- Document must be published
- Sharing must be set to "Anyone with the link"
- Use "Open in new tab" as fallback

### Times in Wrong Timezone
- This is expected behavior
- Times display in user's local timezone
- Backend stores ISO timestamps

---

## 📱 Responsive Breakpoints

```css
/* Mobile-first approach */
Default: < 640px   (Mobile)
sm: 640px+         (Tablet)
lg: 1024px+        (Desktop)
```

---

## 🎯 TypeScript Tips

### Type Guards
```typescript
// Check if score is placement score
function isPlacementScore(score: Score): score is PlacementScore {
  return 'place' in score && 'rawScore' in score;
}
```

### Memoization
```typescript
// Expensive calculations should be memoized
const standings = useMemo(() => {
  return calculateStandings(olympics, teams, scores);
}, [olympics, teams, scores]);
```

---

## 🚀 Performance Tips

1. **Use useMemo** for expensive calculations
2. **Use useCallback** for event handlers in lists
3. **Conditional hooks** prevent unnecessary API calls
4. **Loading states** improve perceived performance
5. **Optimistic updates** for better UX (future enhancement)

---

## 🔐 Security Notes

- No authentication on public pages (by design)
- SEO prevention via meta robots tag
- No sensitive data exposed in public interface
- API calls use environment variable for base URL

---

## 📝 Code Style

### Component Structure
```typescript
// 1. Imports
import React from 'react';
import { useHook } from '../hooks';

// 2. Types/Interfaces
interface Props {
  // ...
}

// 3. Component
export const Component: React.FC<Props> = ({ prop }) => {
  // 4. Hooks
  const { data, loading } = useHook();
  
  // 5. Computed values
  const computed = useMemo(() => {}, []);
  
  // 6. Event handlers
  const handleClick = () => {};
  
  // 7. Early returns (loading, error)
  if (loading) return <Loading />;
  
  // 8. Main render
  return <div>...</div>;
};
```

### Naming Conventions
- Components: PascalCase (e.g., `EventCard`)
- Hooks: camelCase with 'use' prefix (e.g., `useEvents`)
- Utilities: camelCase (e.g., `calculateStandings`)
- Constants: UPPER_SNAKE_CASE (e.g., `API_BASE_URL`)

---

## 🎓 Key Learnings

### React Patterns Used
- Custom hooks for data fetching
- Memoization for performance
- Conditional rendering for states
- Component composition
- Props drilling (minimal, could use Context in future)

### TypeScript Patterns Used
- Type guards for union types
- Strict null checks
- Proper React.FC typing
- Interface composition
- Type imports from shared API

### CSS Patterns Used
- Tailwind utility classes
- Mobile-first responsive design
- CSS custom properties for theming
- Flexbox for layouts
- Grid for complex layouts (future)

---

## 📚 Related Documentation

- [API Spec](agent/API_SPEC.md)
- [Data Models](agent/DATA_MODELS.md)
- [UI Spec](agent/UI_SPEC.md)
- [Implementation Plan](agent/IMPLEMENTATION_PLAN.md)
- [Phase 1 Summary](PHASE1_SUMMARY.md)
- [Phase 2 Summary](PHASE2_SUMMARY.md)

---

## ✅ Phase 3 Checklist

- [x] Logo component created
- [x] Standings calculation implemented
- [x] Home page with live standings
- [x] Schedule page with day grouping
- [x] Event detail page with results
- [x] EventCard component for reusability
- [x] Loading states on all pages
- [x] Error states on all pages
- [x] Empty states on all pages
- [x] Mobile responsive design
- [x] TypeScript compilation passes
- [x] Build succeeds
- [x] No linting errors
- [x] Documentation complete

---

**Status**: ✅ Phase 3 Complete
**Next**: Phase 4 - Judge Interface

