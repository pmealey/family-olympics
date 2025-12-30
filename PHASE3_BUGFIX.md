# Phase 3 Bug Fix - Infinite Loop Issue

## Problem

When accessing the main page, an infinite loop of API requests was occurring, causing the application to continuously fetch data and potentially crash or become unresponsive.

## Root Cause

The issue was in the `useAsync` hook in `ui/src/hooks/useApi.ts`. The problem was with the dependency array in the `useCallback` hook:

```typescript
const execute = useCallback(async () => {
  // ... fetch logic
}, [asyncFunction]); // ❌ PROBLEM: asyncFunction is a new reference on every render
```

### Why This Caused an Infinite Loop

1. Component renders (e.g., Home page)
2. Hook is called with inline function: `useTeams(() => apiClient.listTeams(year!))`
3. This creates a **new function reference** for `asyncFunction` on every render
4. `useCallback` sees the new dependency and creates a **new `execute` function**
5. `useEffect` detects the new `execute` function and **calls it**
6. API call completes, state updates, **component re-renders**
7. Go back to step 1 → **infinite loop**

### The Dependency Chain

```
Component Render
  ↓
New asyncFunction created (inline arrow function)
  ↓
useCallback sees new dependency
  ↓
New execute function created
  ↓
useEffect sees new execute
  ↓
execute() is called
  ↓
State updates (setData, setLoading)
  ↓
Component Re-renders
  ↓
[LOOP BACK TO TOP]
```

## Solution

Use `useRef` to store the function reference and update it when needed, while keeping the `execute` callback stable:

```typescript
export function useAsync<T>(
  asyncFunction: () => Promise<ApiResponse<T>>,
  immediate = true
) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const asyncFunctionRef = useRef(asyncFunction);

  // Update ref when function changes (without triggering re-execution)
  useEffect(() => {
    asyncFunctionRef.current = asyncFunction;
  }, [asyncFunction]);

  // execute callback now has stable identity (empty deps)
  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await asyncFunctionRef.current(); // ✅ Use ref
      if (response.success && response.data) {
        setData(response.data);
      } else if (response.error) {
        setError(response.error.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []); // ✅ Empty deps - stable callback

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]); // ✅ execute is now stable

  return { loading, data, error, execute };
}
```

## How the Fix Works

1. **`useRef`** stores the function reference without triggering re-renders
2. **Separate `useEffect`** updates the ref when the function changes (but doesn't trigger execution)
3. **`execute` callback** has empty dependencies, so it's created only once
4. **Main `useEffect`** only runs when `immediate` changes or on mount (since `execute` is stable)

### New Flow (Fixed)

```
Component Render
  ↓
New asyncFunction created
  ↓
useEffect updates asyncFunctionRef.current (no re-render)
  ↓
execute callback is stable (already created)
  ↓
useEffect with [execute, immediate] doesn't re-run
  ↓
[NO LOOP - STABLE STATE]
```

## Testing

After the fix:
- ✅ Build succeeds: `npm run build`
- ✅ No linting errors
- ✅ TypeScript compilation passes
- ✅ No infinite loops on page load
- ✅ API calls happen only once per mount

## Files Changed

- `ui/src/hooks/useApi.ts` - Fixed `useAsync` hook with `useRef` pattern

## Verification Steps

1. Start the dev server: `npm run dev`
2. Open browser dev tools → Network tab
3. Navigate to home page (`/`)
4. Verify only **one request** for each endpoint:
   - `/olympics/current`
   - `/olympics/{year}/teams`
   - `/olympics/{year}/scores`
   - `/olympics/{year}/events`
5. No repeated requests should occur

## Related Patterns

This is a common React pattern for handling dynamic function dependencies:

### ❌ Anti-pattern (causes infinite loops)
```typescript
const callback = useCallback(() => {
  doSomething(prop);
}, [prop, doSomething]); // doSomething might be unstable
```

### ✅ Correct pattern (stable callback)
```typescript
const propRef = useRef(prop);
useEffect(() => { propRef.current = prop; }, [prop]);

const callback = useCallback(() => {
  doSomething(propRef.current);
}, []); // Stable - no dependencies
```

## Prevention

To prevent similar issues in the future:

1. **Be careful with inline functions** in hook dependencies
2. **Use `useRef`** for values that change but shouldn't trigger effects
3. **Test with React DevTools Profiler** to catch excessive re-renders
4. **Enable React Strict Mode** in development (already enabled in Vite)
5. **Watch the Network tab** during development for repeated requests

## Performance Impact

**Before Fix:**
- Infinite API requests
- High CPU usage
- Potential browser crash
- Wasted bandwidth

**After Fix:**
- Single API request per mount
- Normal CPU usage
- Stable performance
- Efficient bandwidth usage

---

**Status**: ✅ Fixed and verified
**Date**: December 30, 2025

