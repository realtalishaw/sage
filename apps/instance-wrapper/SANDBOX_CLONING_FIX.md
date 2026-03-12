# Sandbox Cloning Fix

## Problem Summary

The `create-sandbox` Supabase Edge Function was failing to properly clone apps from S3 git repositories.

### Root Cause

**The original code (lines 162-163):**
```typescript
aws s3 sync "s3://${bucket}/${prefix}" "${tempGitDir}" --quiet
```

This was downloading the raw S3 files:
- `HEAD` (15 bytes)
- `refs/heads/main/ab854c70...f4.bundle` (git bundle file)

**Why this failed:**
1. `aws s3 sync` downloads the literal files from S3
2. git-remote-s3 stores repos in a **custom bundle format**, not as a standard bare repo
3. The code expected either:
   - A bare git repo with `objects/` directory
   - A working directory with `package.json`
4. But got neither - just `HEAD` and a bundle file in a subdirectory
5. Result: Error thrown "S3 repo appears incomplete"

## The Solution

### Change 1: Use `git clone` with git-remote-s3

**New approach (lines 189-191):**
```typescript
git clone "s3://bucket/prefix/" "${targetDir}"
```

**Why this works:**
- Installs `git-remote-s3` in the sandbox (lines 169-183)
- Uses `git clone` directly on the S3 URL
- git-remote-s3 understands the bundle format and extracts all files
- Results in a proper working directory with all source code

### Change 2: Handle `web-app/` subdirectory structure

Apps created with the create-app skill have this structure:
```
/code/
  ├── web-app/          ← The actual Vite frontend
  │   ├── package.json
  │   ├── src/
  │   └── ...
  ├── scripts/          ← Python scripts for agents
  └── README.md
```

**Original code problem:**
- Cloned to `/code`
- Tried to run `npm install` in `/code` ← No package.json here!
- Tried to start Vite in `/code` ← Wrong directory!

**Fixed code (lines 554-568):**
```typescript
// Check if app has web-app/ subdirectory
const hasWebAppDir = await runCommandWithSdk(
  e2bApiKey,
  sandboxId,
  `test -d ${APP_DIR}/web-app && echo "has_web_app"`,
  5000,
  '/'
);

if (hasWebAppDir.stdout.includes('has_web_app')) {
  console.log('[create-sandbox] Detected web-app/ subdirectory structure');
  viteAppDir = `${APP_DIR}/web-app`;  // Use /code/web-app
} else {
  console.log('[create-sandbox] Using root directory for Vite app');
  viteAppDir = APP_DIR;  // Use /code
}
```

Then uses `viteAppDir` for:
- `npm install` (line 572)
- Vite config (line 594)
- Starting dev server (line 597)

## What Changed in the Code

### Modified Function: `cloneFromS3GitRepo` (lines 127-265)

**Before:**
1. Used `aws s3 sync` to download files
2. Checked if downloaded files formed a bare repo or working directory
3. Failed because git-remote-s3 format doesn't match either

**After:**
1. Installs `git-remote-s3` via pip
2. Uses `git clone s3://...` directly
3. git-remote-s3 handles extracting from bundle format
4. Results in proper working directory with all source files

### Modified Logic: App structure detection (lines 549-591)

**Before:**
- Always assumed app root has `package.json`
- Ran `npm install` in `/code`

**After:**
- Detects if app has `web-app/` subdirectory
- Runs `npm install` in correct location (`/code/web-app` or `/code`)
- Starts Vite server in correct location

## Testing the Fix

### 1. Deploy the Edge Function

```bash
cd blank-canvas-app
supabase functions deploy create-sandbox
```

### 2. Test with an app from S3

Open blank-canvas-app in browser and try to open an app that was created with create-app skill (like ugc-creator-crm).

### Expected Behavior

The logs should show:
```
[create-sandbox] Cloning git repo from S3: s3://gia-artifacts/.../ugc-creator-crm/
[create-sandbox] Installing git and git-remote-s3...
[create-sandbox] git-remote-s3 installed successfully
[create-sandbox] Cloning from S3 using git-remote-s3...
[create-sandbox] Clone successful, listing cloned files...
[create-sandbox] Found package.json in: web-app
[create-sandbox] Detected web-app/ subdirectory structure
[create-sandbox] Installing dependencies in /code/web-app...
[create-sandbox] Starting Vite dev server on port 5173...
[create-sandbox] Server is ready!
```

### 3. Verify the app loads

The app should load in the iframe with all files present.

## Summary of Changes

| File | Lines | Change |
|------|-------|--------|
| `supabase/functions/create-sandbox/index.ts` | 127-265 | Rewrote `cloneFromS3GitRepo` to use `git clone` with git-remote-s3 |
| `supabase/functions/create-sandbox/index.ts` | 546-597 | Added detection for `web-app/` subdirectory and use correct path for npm/vite |

## Key Takeaways

1. ✅ **git-remote-s3 uses a custom bundle format** - use `git clone s3://...` not `aws s3 sync`
2. ✅ **The bundle file IS your code** - git extracts it automatically when cloning
3. ✅ **Apps have different structures** - check for `web-app/` subdirectory and adjust paths
4. ✅ **Install git-remote-s3 in sandbox** - required for `git clone s3://` to work

## Related Documentation

- `agents/core-agent/main/skills/create-app/reference/GIT_S3_CLONING_GUIDE.md` - Complete guide on git-remote-s3
- `agents/core-agent/main/scripts/clone-app-from-s3.py` - Helper script for cloning apps locally
