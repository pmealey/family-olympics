# Phase 2 Testing Guide

## Quick Start

The development server is now running at: **http://localhost:5173/**

## Testing the Admin Interface

### 1. Access Admin Interface
Navigate to: **http://localhost:5173/admin**

### 2. Olympics Configuration Tab

#### Test: Create a New Year
1. Click "Create New Year" button
2. Enter year: `2025`
3. Enter admin password: `test123` (or any password you prefer)
4. Click "Create Year"
5. ✅ **Expected:** Year created, placement points displayed

#### Test: Edit Placement Points
1. Click "Edit" button
2. Change point values (e.g., 1st=5, 2nd=4, 3rd=3, 4th=2)
3. Click "Save Changes"
4. ✅ **Expected:** Points updated successfully

### 3. Teams Tab

#### Test: Create a Team
1. Click "+ Add Team"
2. Enter team name: `Pink Flamingos`
3. Select color: `Pink`
4. Add members:
   - Type first member name: `Alice`
   - Click "+ Add Member"
   - Type second member: `Bob`
   - Add more as needed
5. Click "Create Team"
6. ✅ **Expected:** Team card appears with color indicator

#### Test: Edit a Team
1. Click "Edit" on any team
2. Modify name or members
3. Click "Update Team"
4. ✅ **Expected:** Team updated

#### Test: Add Bonus Points
1. Click "+1 Bonus" on any team
2. ✅ **Expected:** Bonus points increase by 1

#### Test: Create Multiple Teams
Create 3-4 teams with different colors to test event scoring later.

### 4. Events Tab

#### Test: Create Placement Event
1. Click "+ Add Event"
2. Enter event details:
   - Name: `Snowball Toss`
   - Location: `Backyard`
   - Rules URL: `https://docs.google.com/document/d/example`
   - Scoring Type: `Placement (Timed/Scored)`
   - Day: `Day 1`
   - Time: `10:00`
   - Status: `Upcoming`
3. Click "Create Event"
4. ✅ **Expected:** Event appears under Day 1

#### Test: Create Judged Event
1. Click "+ Add Event"
2. Enter event details:
   - Name: `Snow Sculpture`
   - Location: `Front Yard`
   - Rules URL: `https://docs.google.com/document/d/example2`
   - Scoring Type: `Judged (Categories)`
   - Add categories:
     - `Creativity`
     - `Execution`
     - `Style`
   - Day: `Day 2`
   - Time: `14:00`
   - Status: `Upcoming`
3. Click "Create Event"
4. ✅ **Expected:** Event appears under Day 2 with category count

#### Test: Change Event Status
1. Click "Start" on the Snowball Toss event
2. ✅ **Expected:** Status badge changes to "IN PROGRESS"
3. Click "Complete"
4. ✅ **Expected:** Status badge changes to "COMPLETED"

### 5. Scores Tab

#### Test: Score Placement Event
1. Select "Snowball Toss" from dropdown
2. For each team, enter:
   - Place: 1st, 2nd, 3rd, 4th
   - Score: e.g., `2:34` (time format)
   - Type: `Time`
3. Click "Save & Complete Event"
4. ✅ **Expected:** Scores saved, results displayed with medals (🥇🥈🥉🏅)

#### Test: View Already-Scored Event
1. Try to select the same event again
2. ✅ **Expected:** Shows "This event has already been scored" with results

#### Test: Judged Event Results (After Judge Scoring)
**Note:** You'll need to use the Judge interface (Phase 4) to submit scores first. For now:
1. Select the judged event from dropdown
2. ✅ **Expected:** Shows "No judge scores submitted yet"

### 6. Tab Navigation

#### Test: Tab Switching
1. Click through all tabs: Olympics → Teams → Events → Scores
2. ✅ **Expected:** Smooth transitions, active tab highlighted
3. Data persists when switching back to tabs

### 7. Error Handling

#### Test: Create Team Without Name
1. Click "+ Add Team"
2. Leave name empty
3. Select color
4. Click "Create Team"
5. ✅ **Expected:** Alert message "Please provide a team name and at least one member"

#### Test: Create Event Without Required Fields
1. Click "+ Add Event"
2. Leave name empty
3. Click "Create Event"
4. ✅ **Expected:** Alert message about missing required fields

### 8. Mobile Responsiveness

#### Test: Resize Browser
1. Resize browser window to mobile width (< 640px)
2. ✅ **Expected:**
   - Tabs scroll horizontally if needed
   - Forms stack vertically
   - Buttons remain touch-friendly (44px minimum)
   - All features remain accessible

## Common Issues & Solutions

### Issue: "Please configure an Olympics year first"
**Solution:** Go to Olympics tab and create a new year first.

### Issue: API errors (500, 404, etc.)
**Solutions:**
1. Check that `.env` file exists in `ui/` folder
2. Verify API URL: `https://xjmmn7qc8b.execute-api.us-east-1.amazonaws.com/prod`
3. Check CloudWatch logs for backend errors
4. Verify DynamoDB tables exist

### Issue: Changes not saving
**Solutions:**
1. Check browser console for errors
2. Verify network requests in DevTools
3. Ensure you're online
4. Check that API is deployed

### Issue: "Cannot find admin token"
**Solution:** Admin token is stored in localStorage. If testing password protection, you'll need to implement the password gate (Phase 7 optional).

## API Endpoints Being Used

### Olympics
- `GET /olympics/current` - Load current year on mount
- `GET /olympics` - List all years
- `POST /olympics` - Create new year
- `PUT /olympics/:year` - Update placement points

### Teams
- `GET /olympics/:year/teams` - Load teams
- `POST /olympics/:year/teams` - Create team
- `PUT /olympics/:year/teams/:teamId` - Update team
- `DELETE /olympics/:year/teams/:teamId` - Delete team

### Events
- `GET /olympics/:year/events` - Load events
- `POST /olympics/:year/events` - Create event
- `PUT /olympics/:year/events/:eventId` - Update event
- `DELETE /olympics/:year/events/:eventId` - Delete event

### Scores
- `GET /olympics/:year/events/:eventId/scores` - Load event scores
- `POST /olympics/:year/events/:eventId/scores/placement` - Submit placement scores

## Next Steps After Testing

Once Phase 2 is verified:
1. Test with real data for your family olympics
2. Proceed to Phase 3 (Public Interface)
3. Implement Judge interface (Phase 4)
4. Add password protection (Phase 7 optional)
5. Deploy frontend to CloudFront

## Dev Server Commands

```bash
# Start dev server (already running)
cd ui && npm run dev

# Build for production
cd ui && npm run build

# Run tests
cd ui && npm test

# Lint code
cd ui && npm run lint
```

---

Happy Testing! 🎉

