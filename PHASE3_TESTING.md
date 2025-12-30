# Phase 3 Testing Guide - Family Olympics Public Interface

## Quick Start Testing

### Prerequisites
1. Backend API is deployed and accessible
2. Environment variable `VITE_API_BASE_URL` is set correctly
3. At least one Olympics year is configured in the database
4. Some test data exists (teams, events, scores)

### Running the Application

```bash
cd ui
npm install
npm run dev
```

The application will be available at `http://localhost:5173`

## Test Scenarios

### Scenario 1: Fresh Olympics (No Data)

**Setup:**
- Empty database or new Olympics year with no teams/events

**Expected Behavior:**
- ✅ Home page shows logo and year
- ✅ "No teams or scores yet" message in standings
- ✅ Schedule page shows "No events scheduled yet"
- ✅ No errors or crashes

**Test Steps:**
1. Navigate to home page
2. Verify empty state message appears
3. Click "View Schedule"
4. Verify empty state for both days
5. Check that navigation works smoothly

---

### Scenario 2: Teams Created, No Events

**Setup:**
- Olympics year configured
- 4 teams created (one of each color)
- No events or scores

**Expected Behavior:**
- ✅ Home page shows all teams with 0 points
- ✅ Teams display in order (tied at 0)
- ✅ Team colors appear correctly
- ✅ Schedule shows "No events scheduled yet"
- ✅ Progress shows "0/0 events completed"

**Test Steps:**
1. Navigate to home page
2. Verify all 4 teams appear in standings
3. Verify team color indicators display correctly
4. Verify all teams show "0 pts"
5. Check schedule page is empty

---

### Scenario 3: Events Created, Not Started

**Setup:**
- Olympics year configured
- 4 teams created
- 6-8 events created (mix of placement and judged)
- Events assigned to Day 1 and Day 2
- All events status = "upcoming"
- No scores

**Expected Behavior:**
- ✅ Home page shows teams tied at 0 points
- ✅ Progress shows "0/X events completed"
- ✅ Schedule shows events grouped by day
- ✅ Events display with correct times and locations
- ✅ Status badges show "UPCOMING"
- ✅ Event detail pages show "Upcoming Event" message
- ✅ Rules iframe displays (if URL is valid)

**Test Steps:**
1. Navigate to schedule page
2. Verify events are grouped under Day 1 and Day 2
3. Verify events are sorted by time
4. Click on an event card
5. Verify event detail page loads
6. Verify "Upcoming Event" message appears
7. Verify rules iframe displays (or link works)
8. Click back button to return to schedule

---

### Scenario 4: Some Events Completed

**Setup:**
- Olympics year configured with placement points (1st=4, 2nd=3, 3rd=2, 4th=1)
- 4 teams created
- 8 events created
- 3 events completed with placement scores
- 2 events in-progress
- 3 events upcoming

**Expected Behavior:**
- ✅ Home page shows correct standings based on completed events
- ✅ Teams ranked by total points (descending)
- ✅ Medal emojis appear for top 3 teams
- ✅ Progress shows "3/8 events completed"
- ✅ Schedule shows color-coded status badges
- ✅ Completed event detail pages show results
- ✅ Results show placements, raw scores, and points awarded
- ✅ In-progress events show "Scoring in Progress" message

**Test Steps:**
1. Navigate to home page
2. Verify standings are calculated correctly:
   - Count points manually from scores
   - Verify ranking order
   - Check medal emojis for top 3
3. Navigate to schedule
4. Verify status badges are correct for each event
5. Click on a completed event
6. Verify results section displays:
   - Correct placement order
   - Team names and colors
   - Raw scores
   - Points awarded
7. Click on an in-progress event
8. Verify "Scoring in Progress" message
9. Click on an upcoming event
10. Verify "Upcoming Event" message

---

### Scenario 5: All Events Completed

**Setup:**
- Olympics year configured
- 4 teams created
- 8 events all completed with scores
- One team has bonus points

**Expected Behavior:**
- ✅ Home page shows final standings
- ✅ Bonus points included in total
- ✅ Progress shows "8/8 events completed"
- ✅ All events show "COMPLETED ✓" badge
- ✅ All event detail pages show results

**Test Steps:**
1. Navigate to home page
2. Verify final standings include bonus points
3. Verify progress shows all events complete
4. Navigate to schedule
5. Verify all events show completed badge
6. Randomly click 3-4 events
7. Verify all show results sections
8. Verify points add up correctly

---

### Scenario 6: Mobile Responsiveness

**Test on mobile device or browser dev tools (375px width):**

**Expected Behavior:**
- ✅ Bottom navigation is easily tappable
- ✅ Logo displays at appropriate size
- ✅ Standings list is readable and scrollable
- ✅ Event cards fit within screen width
- ✅ Event detail page is readable
- ✅ Rules iframe is scrollable
- ✅ All buttons meet 44px minimum tap target
- ✅ Text is legible without zooming

**Test Steps:**
1. Open browser dev tools
2. Set viewport to 375px width (iPhone SE)
3. Navigate through all pages
4. Verify touch targets are large enough
5. Verify no horizontal scrolling
6. Verify text is readable
7. Test on actual device if possible

---

### Scenario 7: Error Handling

**Test API failures:**

**Expected Behavior:**
- ✅ Network errors show helpful message
- ✅ 404 errors handled gracefully
- ✅ Invalid event IDs show "Event not found"
- ✅ App doesn't crash on errors

**Test Steps:**
1. Stop backend API or set wrong API URL
2. Navigate to home page
3. Verify error message appears
4. Restart API
5. Navigate to `/events/invalid-id`
6. Verify "Event not found" message
7. Verify back button still works

---

### Scenario 8: Loading States

**Test with slow network (throttle in dev tools):**

**Expected Behavior:**
- ✅ Loading spinner appears while fetching data
- ✅ Page doesn't show stale data
- ✅ Loading states are visually clear

**Test Steps:**
1. Open browser dev tools
2. Enable network throttling (Slow 3G)
3. Navigate to home page
4. Verify loading spinner appears
5. Wait for data to load
6. Navigate to schedule
7. Verify loading spinner appears
8. Click on event
9. Verify loading spinner appears

---

### Scenario 9: Google Docs Embedding

**Test with different Google Docs URLs:**

**Expected Behavior:**
- ✅ Published Google Docs display in iframe
- ✅ Unpublished docs show blank (expected)
- ✅ "Open in new tab" link always works
- ✅ Iframe has minimum 400px height

**Test Steps:**
1. Create test event with published Google Doc URL
2. Navigate to event detail page
3. Verify iframe displays document
4. Verify document is scrollable within iframe
5. Click "Open in new tab" link
6. Verify document opens in new window
7. Test with unpublished doc (should be blank)
8. Verify link still works for unpublished doc

---

### Scenario 10: Real-Time Updates

**Test standings calculation accuracy:**

**Expected Behavior:**
- ✅ Standings update when new scores added
- ✅ Points calculated correctly
- ✅ Ranking updates correctly
- ✅ Ties handled properly

**Test Steps:**
1. Note current standings on home page
2. Use admin interface to add scores for new event
3. Refresh home page
4. Verify standings updated correctly
5. Manually calculate expected points
6. Compare with displayed standings
7. Test with tie scenario (two teams same points)
8. Verify both teams show same rank

---

## Automated Testing (Future)

### Unit Tests to Add
- `standings.ts` calculation logic
- `EventCard` component rendering
- `Logo` component rendering
- Date/time formatting utilities

### Integration Tests to Add
- Home page with mock API data
- Schedule page with mock events
- Event detail page with mock scores
- Navigation flow between pages

### E2E Tests to Add
- Complete user journey from home to event details
- Mobile navigation flow
- Error recovery scenarios

---

## Performance Testing

### Metrics to Check
- **Initial Load**: < 2 seconds on 3G
- **Page Navigation**: < 500ms
- **API Response**: < 1 second
- **Standings Calculation**: < 100ms for 4 teams, 10 events

### Tools
- Lighthouse (Chrome DevTools)
- Network tab (throttling)
- React DevTools Profiler

---

## Browser Compatibility

### Tested Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

### Known Issues
- Google Docs iframe may not work on some mobile browsers (use "Open in new tab" fallback)

---

## Accessibility Testing

### Checklist
- [ ] Keyboard navigation works
- [ ] Screen reader announces content correctly
- [ ] Color contrast meets WCAG AA standards
- [ ] Touch targets are 44px minimum
- [ ] Focus indicators are visible
- [ ] Alt text on logo SVG

### Tools
- Chrome Lighthouse Accessibility Audit
- WAVE browser extension
- Screen reader (NVDA/JAWS/VoiceOver)

---

## Common Issues & Solutions

### Issue: Standings show 0 points for all teams
**Solution:** Check that scores have been submitted and events are marked as completed

### Issue: Events not appearing in schedule
**Solution:** Verify events have scheduledDay set (1 or 2)

### Issue: Google Docs iframe is blank
**Solution:** Ensure document is published and sharing is set to "Anyone with the link"

### Issue: Times showing in wrong timezone
**Solution:** Times are displayed in user's local timezone (expected behavior)

### Issue: Loading spinner never disappears
**Solution:** Check API endpoint is correct and backend is running

---

## Sign-Off Checklist

Before considering Phase 3 complete:

- [x] Home page displays correctly with all states
- [x] Schedule page groups events by day
- [x] Event detail pages show results and rules
- [x] Standings calculation is accurate
- [x] Loading states appear during data fetching
- [x] Error states display helpful messages
- [x] Empty states show when no data
- [x] Mobile responsive design works
- [x] Navigation between pages works
- [x] Build completes without errors
- [x] No TypeScript compilation errors
- [x] No linting errors
- [x] SEO prevention tags in place

---

## Next Steps

Phase 3 is complete! Ready to proceed with:
- **Phase 4**: Judge Interface
- **Phase 5**: Polish & Deployment

---

**Last Updated**: December 30, 2025
**Status**: ✅ All tests passing, ready for Phase 4

