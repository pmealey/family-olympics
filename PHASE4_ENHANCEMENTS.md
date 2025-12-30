# Phase 4: Judge Interface - Enhancements

## Overview

Additional features added to the judge interface to improve usability and handle error correction.

## Enhancements Implemented

### 1. Edit Button Fix (JudgeEvents.tsx)

**Issue:** Edit button cleared judge name but didn't provide a way to enter a new name.

**Solution:**
- Edit button now clears judge name AND navigates back to `/judge`
- Judge can enter new name on the name entry page
- After entering new name, redirects back to events list

**Code:**
```typescript
const handleEditName = () => {
  clearJudgeName();
  navigate('/judge');
};
```

### 2. Multiple Team Scoring Fix (JudgeScoreEntry.tsx)

**Issue:** After scoring first team, showed "Unknown Team" and "Team 2 of 1"

**Root Cause:**
- After refreshing scores, `teamsToScore` array was recalculated
- Scored team was removed from array
- But `currentTeamIndex` was incremented, pointing to invalid index

**Solution:**
- Always keep `currentTeamIndex` at 0
- After scoring, reset index to 0
- `teamsToScore` automatically updates to remove scored team
- Index 0 always points to next unscored team

**Code:**
```typescript
setCurrentTeamIndex(0); // Always show first unscored team
```

**Also Fixed:**
- Team counter shows correct progress: "Team X of Y"
- "Next team" preview shows correct team (index 1)

### 3. Score Input Behavior (JudgeScoreEntry.tsx)

**Issue:** Scores defaulted to 5 and persisted between teams

**Solution:**
- Scores start unselected (no default value)
- Scores reset to unselected for each new team
- Submit button disabled until all categories scored
- Validation message: "Please score all categories before submitting"

**Code:**
```typescript
// Reset scores when team changes
useEffect(() => {
  setCategoryScores({});
}, [currentTeam?.teamId]);

// Validate all categories scored
const { totalScore, allCategoriesScored } = useMemo(() => {
  const categoriesCount = event?.judgedCategories?.length || 0;
  const scoredCount = Object.keys(categoryScores).length;
  return {
    totalScore: Object.values(categoryScores).reduce((sum, score) => sum + score, 0),
    allCategoriesScored: scoredCount === categoriesCount && categoriesCount > 0,
  };
}, [categoryScores, event?.judgedCategories]);
```

### 4. Edit and Delete Scores (JudgeScoreEntry.tsx)

**Feature:** Judges can now edit and delete their submitted scores

**Implementation:**

#### Edit Functionality
- Click "Edit" button on any submitted score
- Score card expands to show `ScoreInput` components for each category
- Pre-filled with existing scores
- Can modify any category
- "Save" button updates the score via API
- "Cancel" button discards changes
- Save button disabled until all categories have values

#### Delete Functionality
- Click "Delete" button on any submitted score
- Confirmation dialog: "Delete your score for [Team Name]?"
- If confirmed, deletes score via API
- Scores refresh automatically after deletion

#### UI Features
- **Category Breakdown:** Shows individual category scores in a grid
- **Inline Editing:** Edit mode shows score inputs directly in the card
- **Loading States:** Buttons show loading state during API calls
- **Real-time Total:** Total updates as scores are edited
- **Action Buttons:** Edit/Delete or Save/Cancel depending on mode

**Code Structure:**
```typescript
const [editingScoreId, setEditingScoreId] = useState<string | null>(null);
const [editScores, setEditScores] = useState<Record<string, number>>({});

const { mutate: updateScore, loading: updating } = useMutation(
  (year: number, eventId: string, data: any) =>
    apiClient.updateJudgeScore(year, eventId, data)
);

const { mutate: deleteScore, loading: deleting } = useMutation(
  (year: number, eventId: string, scoreId: string) =>
    apiClient.deleteScore(year, eventId, scoreId)
);
```

## User Experience

### Before Enhancements
- ❌ Edit button didn't work properly
- ❌ Scoring multiple teams showed errors
- ❌ Scores defaulted to 5
- ❌ No way to fix mistakes
- ❌ Scores persisted between teams

### After Enhancements
- ✅ Edit button navigates to name entry
- ✅ Scoring multiple teams works smoothly
- ✅ Scores start unselected
- ✅ Can edit submitted scores
- ✅ Can delete submitted scores
- ✅ Scores reset for each team
- ✅ Validation prevents incomplete submissions
- ✅ Category breakdown visible
- ✅ Confirmation before deletion

## API Integration

### Update Judge Score
```typescript
PUT /olympics/:year/events/:eventId/scores/judge
Body: {
  judgeName: string,
  teamId: string,
  categoryScores: Record<string, number>
}
```

### Delete Score
```typescript
DELETE /olympics/:year/events/:eventId/scores/:scoreId
```

## UI Components

### Score Card (View Mode)
```
┌─────────────────────────────────────┐
│ [Color] Team Name          24 pts   │
│                                     │
│ Creativity:  8    Execution:  9     │
│ Style:       7                      │
│                                     │
│ [Edit]  [Delete]                    │
└─────────────────────────────────────┘
```

### Score Card (Edit Mode)
```
┌─────────────────────────────────────┐
│ [Color] Team Name          24 pts   │
│                                     │
│ CREATIVITY                          │
│ [1][2][3][4][5][6][7][8][9][10]     │
│                                     │
│ EXECUTION                           │
│ [1][2][3][4][5][6][7][8][9][10]     │
│                                     │
│ STYLE                               │
│ [1][2][3][4][5][6][7][8][9][10]     │
│                                     │
│ [Save]  [Cancel]                    │
└─────────────────────────────────────┘
```

## Error Handling

### Edit Validation
- Save button disabled until all categories scored
- Loading state during API call
- Error message if API fails
- Optimistic UI updates

### Delete Confirmation
- Browser confirm dialog before deletion
- Loading state during API call
- Automatic refresh after successful deletion
- Error handling if deletion fails

## Testing Scenarios

### Test Edit Functionality
1. Score a team
2. View aggregate scores
3. Click "Edit" on a score
4. Modify category scores
5. Click "Save"
6. Verify score updated
7. Verify standings recalculated

### Test Delete Functionality
1. Score a team
2. View aggregate scores
3. Click "Delete" on a score
4. Confirm deletion
5. Verify score removed
6. Verify standings recalculated

### Test Edit Validation
1. Click "Edit" on a score
2. Clear one category
3. Try to save
4. Verify save button disabled
5. Fill in all categories
6. Verify save button enabled

### Test Cancel Edit
1. Click "Edit" on a score
2. Modify scores
3. Click "Cancel"
4. Verify original scores unchanged
5. Verify edit mode closed

## Benefits

1. **Error Correction:** Judges can fix mistakes without admin intervention
2. **Flexibility:** Can update scores if rules change or mistakes discovered
3. **Transparency:** Category breakdown shows how total was calculated
4. **User-Friendly:** Inline editing keeps context visible
5. **Safe:** Confirmation prevents accidental deletions
6. **Validated:** Can't save incomplete edits

## Future Enhancements (Not Implemented)

- Edit history/audit log
- Bulk edit multiple teams
- Copy scores from one team to another
- Score templates for similar performances
- Undo/redo functionality
- Real-time sync across judges

## Files Modified

- `ui/src/pages/JudgeEvents.tsx` - Fixed edit button
- `ui/src/pages/JudgeScoreEntry.tsx` - All other enhancements
  - Multiple team scoring fix
  - Score reset behavior
  - Edit functionality
  - Delete functionality
  - Validation improvements

## Build Status

✅ **Build successful** - All TypeScript checks pass
✅ **No linter errors**
✅ **All features tested and working**

