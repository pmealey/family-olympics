# Score Reset Feature

## Overview
Added the ability for admins to reset scores for events in case of mistakes or the need to re-enter data.

## Changes Made

### UI Changes (`ui/src/pages/admin/AdminScores.tsx`)

#### 1. Added Delete Score Mutation Hook
```typescript
const { mutate: deleteScore, loading: deleteLoading } = useMutation(
  (year: number, eventId: string, scoreId: string) =>
    apiClient.deleteScore(year, eventId, scoreId)
);
```

#### 2. Added `handleResetScores` Function
- Confirms with the user before proceeding (shows count of scores to be deleted)
- Deletes all scores for the selected event
- Resets event status back to 'in-progress'
- Refreshes the scores display
- Shows success/error messages

#### 3. Added Reset Buttons to UI

**For Placement Events:**
- Shows "Reset Scores" button after scores have been entered
- Uses secondary variant for visual distinction from primary actions

**For Judged Events:**
- Shows "Reset Judge Scores" button before finalization (if judge scores exist)
- Shows "Reset All Scores" button after finalization
- Allows resetting both judge scores and finalized placement results

## User Flow

### Resetting Placement Event Scores
1. Admin navigates to the Scores tab
2. Selects a completed placement event
3. Views the existing results
4. Clicks "Reset Scores" button
5. Confirms the action in the dialog
6. Scores are deleted and event status returns to 'in-progress'
7. Admin can now re-enter scores

### Resetting Judged Event Scores
1. Admin navigates to the Scores tab
2. Selects a judged event with scores

**Before Finalization:**
- Can reset judge scores if mistakes were made during judging
- Event remains in current state, judges can re-submit

**After Finalization:**
- Can reset all scores (both judge scores and placement results)
- Event status returns to 'in-progress'
- Judges can re-submit scores and admin can re-finalize

## Safety Features
- Loading states prevent multiple simultaneous deletions
- Try-finally block ensures loading state is properly reset
- Direct API calls for reliable deletion
- Automatic refresh of scores after deletion

## API Endpoints Used
- `DELETE /olympics/{year}/events/{eventId}/scores/{scoreId}` - Delete individual scores
- `PUT /olympics/{year}/events/{eventId}` - Update event status

## Benefits
- Allows correction of data entry mistakes
- Provides flexibility during the event
- Maintains data integrity by properly cleaning up all related scores
- Clear user feedback throughout the process
