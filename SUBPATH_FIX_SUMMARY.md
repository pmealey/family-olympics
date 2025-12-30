# Subpath Configuration Fix Summary

## Problem
The application was configured to work with the `/family-olympics` base path, but assets were still being referenced as `/assets/` instead of `/family-olympics/assets/`, causing:
- JavaScript files returning HTML instead of JS
- CSS files working but JS files failing
- Assets not loading through the nginx proxy

## Root Cause
After adding `base: '/family-olympics/'` to `vite.config.ts`, there was a compiled `vite.config.js` file that didn't include this configuration. Vite was using the old compiled version instead of the updated TypeScript config.

## Solution Applied

### 1. Deleted Compiled Config Files
Removed:
- `ui/vite.config.js`
- `ui/vite.config.d.ts`

### 2. Rebuilt the UI
```bash
cd ui
npm run build
```

### 3. Verified the Build
Checked `ui/dist/index.html` to confirm assets now reference:
- `/family-olympics/assets/index-Pf6w7JK6.js` ✅
- `/family-olympics/assets/index-CCjZPqaX.css` ✅
- `/family-olympics/vite.svg` ✅

### 4. Built CDK
```bash
cd ..
npm run build
```

## Next Steps

### Deploy to AWS
```bash
cdk deploy
```

This will:
1. Upload the corrected files to S3 under `family-olympics/` prefix
2. Update CloudFront configuration
3. Invalidate the CloudFront cache

### Verify Deployment

After deployment, test these URLs:

**Direct CloudFront Access:**
- ✅ `https://d35ibl7f7j79bh.cloudfront.net/family-olympics/`
- ✅ `https://d35ibl7f7j79bh.cloudfront.net/family-olympics/assets/index-Pf6w7JK6.js` (should return JavaScript)
- ✅ `https://d35ibl7f7j79bh.cloudfront.net/family-olympics/assets/index-CCjZPqaX.css` (should return CSS)

**Via Nginx Proxy:**
- ✅ `https://www.aureliansystems.io/family-olympics/`
- ✅ All assets should load correctly
- ✅ All routes should work (schedule, events, judge, admin)

## Configuration Summary

### Files Modified

1. **`ui/vite.config.ts`**
   ```typescript
   export default defineConfig({
     plugins: [react()],
     base: '/family-olympics/',  // ← Added this
   })
   ```

2. **`ui/src/App.tsx`**
   ```typescript
   <Router basename="/family-olympics">  {/* ← Added basename */}
     <Routes>
       {/* routes */}
     </Routes>
   </Router>
   ```

3. **`lib/family-olympics-stack.ts`**
   - Added `destinationKeyPrefix: 'family-olympics/'` to S3 deployment
   - Changed `defaultRootObject: 'family-olympics/index.html'`
   - Updated error response paths to `/family-olympics/index.html`

## Local Development

To test locally:
```bash
cd ui
npm run dev
```

Access at: `http://localhost:5173/family-olympics/`

**Note:** Must include the `/family-olympics/` path - the root URL will show a blank page.

## Important Notes

### For Future Builds
Always ensure compiled `.js` and `.d.ts` files are deleted after modifying TypeScript config files, or add them to `.gitignore`:

```gitignore
# Add to ui/.gitignore
vite.config.js
vite.config.d.ts
```

### Path Format Reference
- **Vite base:** `/family-olympics/` (leading and trailing slash)
- **React Router basename:** `/family-olympics` (leading slash, no trailing slash)
- **CloudFront paths:** `/family-olympics/index.html` (leading slash)
- **S3 key prefix:** `family-olympics/` (trailing slash, no leading slash)

## Troubleshooting

If assets still don't load after deployment:

1. **Check the built index.html:**
   ```bash
   cat ui/dist/index.html
   ```
   Verify script/link tags have `/family-olympics/assets/` prefix

2. **Clear CloudFront cache:**
   ```bash
   aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
   ```

3. **Check S3 bucket structure:**
   Files should be at:
   - `family-olympics/index.html`
   - `family-olympics/assets/index-xxx.js`
   - `family-olympics/assets/index-xxx.css`

4. **Verify nginx proxy config:**
   ```nginx
   location /family-olympics/ {
       proxy_pass https://d35ibl7f7j79bh.cloudfront.net/family-olympics/;
       # ... headers
   }
   ```

## Documentation
See `SUBPATH_DEPLOYMENT.md` for complete documentation on the subpath configuration.

