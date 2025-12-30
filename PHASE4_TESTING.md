# Phase 4: Judge Interface - Testing Guide

## Prerequisites

Before testing, ensure:
1. Backend is deployed and running
2. Current Olympics year is configured
3. Teams are created
4. At least one judged event is created with status "in-progress"
5. Frontend is running (`npm run dev` in ui folder)

## Test Scenario 1: First-Time Judge Flow

### Setup
- Clear browser local storage
- Navigate to `http://localhost:5173/judge`

### Steps

1. **Name Entry**
   - Should see judge portal with name entry form
   - Try submitting empty name → Should show error
   - Try submitting "A" → Should show error (too short)
   - Enter "Uncle Bob" → Click Continue
   - Should redirect to `/judge/events`

2. **Event List**
   - Should see greeting "👋 Hi, Uncle Bob!"
   - Should see "Edit" button in header
   - Should see list of in-progress judged events
   - Each event should show:
     - Event name and location
     - Status badge
     - List of teams with ○ (unscored)
     - "Start Scoring" button

3. **Score First Team**
   - Click "Start Scoring" on an event
   - Should see event name and first team name
   - Should see "Team 1 of X" progress indicator
   - Should see team color indicator
   - Should see score buttons (1-10) for each category
   - Click different scores for each category
   - Should see selected scores highlighted in blue
   - Should see total score update (e.g., "24 / 30")
   - Click "Submit Scores"
   - Should see loading state
   - Should advance to next team

4. **Score Remaining Teams**
   - Repeat scoring for all teams
   - After last team, should see aggregate view

5. **Aggregate View**
   - Should see "Your Scores" section with all scored teams
   - Should see "Current Standings" section
   - Leader should have crown emoji (👑) and yellow ring
   - Should show total points and judge count
   - Click "Back to Events"

6. **Return to Event List**
   - Previously scored event should show:
     - ✓ for scored teams
     - "All teams scored" message
     - "View Scores" button

## Test Scenario 2: Returning Judge

### Setup
- Keep local storage from Scenario 1
- Navigate to `http://localhost:5173/judge`

### Steps

1. **Auto-Redirect**
   - Should immediately redirect to `/judge/events`
   - Should NOT show name entry form
   - Should see greeting with stored name

2. **Change Name**
   - Click "Edit" button
   - Should clear name and return to name entry
   - Enter new name
   - Should redirect back to events list

## Test Scenario 3: Multiple Judges

### Setup
- Open two different browsers (or incognito + regular)
- Browser 1: Judge "Uncle Bob"
- Browser 2: Judge "Aunt Sue"

### Steps

1. **Browser 1 (Uncle Bob)**
   - Score all teams for an event
   - View aggregate scores
   - Note the standings

2. **Browser 2 (Aunt Sue)**
   - Navigate to same event
   - Score all teams (with different scores)
   - View aggregate scores
   - Should see:
     - Both judges' scores aggregated
     - Judge count showing "2 judges"
     - Different standings based on combined scores

3. **Browser 1 (Uncle Bob)**
   - Refresh the aggregate view
   - Should see updated standings with both judges

## Test Scenario 4: Partial Scoring

### Setup
- Clear local storage
- Create judge "Grandma"

### Steps

1. **Start Scoring**
   - Score 2 out of 4 teams
   - Click "Back to Events" (don't finish)

2. **Return to Event**
   - Event card should show:
     - ✓ for 2 scored teams
     - ○ for 2 unscored teams
     - "Continue Scoring" button
   - Click "Continue Scoring"
   - Should start with first unscored team

3. **View Scores Mid-Way**
   - Click "View Scores" in header
   - Should see partial scores
   - Click "Continue Scoring"
   - Should return to scoring flow

## Test Scenario 5: Edge Cases

### No Events Available

1. Set all events to "upcoming" or "completed" status
2. Navigate to `/judge/events`
3. Should see empty state message

### No Olympics Configured

1. Delete current Olympics year
2. Navigate to `/judge/events`
3. Should see "No active Olympics found" message

### Network Error

1. Stop backend server
2. Try to submit scores
3. Should see error message
4. Restart server
5. Try again → should work

### Page Refresh During Scoring

1. Start scoring an event
2. Score 1 team
3. Refresh browser
4. Navigate back to event
5. Should show team as scored (✓)
6. Continue scoring should work

## Test Scenario 6: Mobile Testing

### Setup
- Open browser dev tools
- Set device to iPhone 12 (or similar)
- Navigate to judge interface

### Steps

1. **Touch Targets**
   - All buttons should be easy to tap
   - Score buttons (1-10) should be at least 44px
   - No accidental taps

2. **Layout**
   - No horizontal scrolling
   - Text is readable
   - Cards stack vertically
   - Score buttons wrap appropriately

3. **Interactions**
   - Tap to select scores works smoothly
   - Submit button is easy to reach
   - Navigation works well

## Test Scenario 7: Accessibility

### Keyboard Navigation

1. Navigate to judge interface
2. Use Tab key to navigate
3. All interactive elements should be reachable
4. Focus indicators should be visible
5. Enter key should submit forms

### Screen Reader

1. Enable screen reader (VoiceOver, NVDA, etc.)
2. Navigate through judge interface
3. All elements should be announced properly
4. Score buttons should announce their value
5. Team colors should be announced

## Expected Results Summary

### Judge Name Entry
- ✅ Name validation works
- ✅ Name persists in local storage
- ✅ Auto-redirect when name exists
- ✅ Can change name via Edit button

### Event List
- ✅ Shows only in-progress judged events
- ✅ Displays scoring progress correctly
- ✅ Updates after scoring
- ✅ Empty state when no events

### Score Entry
- ✅ Score buttons are large and tappable
- ✅ Selected state is clear
- ✅ Total calculates correctly
- ✅ Submit advances to next team
- ✅ Loading state during submission
- ✅ Error messages display

### Aggregate View
- ✅ Shows judge's personal scores
- ✅ Calculates standings correctly
- ✅ Leader highlighted with crown
- ✅ Judge count accurate
- ✅ Can navigate back

### Mobile
- ✅ Touch targets adequate
- ✅ No horizontal scroll
- ✅ Layout responsive
- ✅ Text readable

### Accessibility
- ✅ Keyboard navigable
- ✅ Screen reader friendly
- ✅ Focus indicators visible
- ✅ ARIA labels present

## Common Issues & Solutions

### Issue: Name not persisting
**Solution:** Check browser local storage settings, ensure cookies/storage not blocked

### Issue: Events not showing
**Solution:** Verify events have status "in-progress" and scoringType "judged"

### Issue: Scores not submitting
**Solution:** Check network tab for API errors, verify backend is running

### Issue: Aggregate scores incorrect
**Solution:** Check that all judge scores are being fetched, verify calculation logic

### Issue: Auto-redirect not working
**Solution:** Clear local storage and try again, check browser console for errors

## Performance Testing

### Load Time
- Initial page load should be < 2 seconds
- Navigation between pages should be instant
- Score submission should complete < 1 second

### Data Fetching
- Events list should load quickly
- Scores should refresh after submission
- No unnecessary re-fetches

### Memory Usage
- No memory leaks during extended use
- Local storage size should be minimal

## Browser Compatibility

Test in:
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile Safari (iOS)
- ✅ Chrome Mobile (Android)

## Reporting Issues

When reporting issues, include:
1. Browser and version
2. Device (if mobile)
3. Steps to reproduce
4. Expected vs actual behavior
5. Console errors (if any)
6. Network tab errors (if any)

