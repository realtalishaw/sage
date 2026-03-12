# Deploying create-sandbox Edge Function

The `create-sandbox` edge function has been fixed and pushed to GitHub. However, Docker is required for CLI deployment.

## Option 1: Deploy via Supabase Dashboard (Recommended)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/wqeopjtdfpxifvrygcqt/functions)

2. Click on **Edge Functions** in the left sidebar

3. Find **create-sandbox** function

4. Click **Deploy new version**

5. The function will automatically pull the latest code from your GitHub repo

## Option 2: Deploy via CLI (Requires Docker)

If you have Docker installed:

```bash
# Start Docker Desktop first
open -a Docker

# Wait for Docker to start, then:
cd blank-canvas-app
supabase functions deploy create-sandbox --project-ref wqeopjtdfpxifvrygcqt
```

## Option 3: Install Docker and Deploy

1. Install Docker Desktop: https://www.docker.com/products/docker-desktop/

2. Start Docker Desktop

3. Run deployment:
```bash
cd blank-canvas-app
supabase functions deploy create-sandbox
```

## Verification

After deployment, test by:

1. Opening blank-canvas-app in browser
2. Selecting an app created with create-app skill (like ugc-creator-crm)
3. Checking browser console and Supabase logs for:
   - "Cloning from S3 using git-remote-s3..."
   - "Clone successful, listing cloned files..."
   - "Detected web-app/ subdirectory structure"
   - "Server is ready!"

## What Was Fixed

- Changed from `aws s3 sync` to `git clone s3://...` with git-remote-s3
- Added git-remote-s3 installation in sandbox
- Added web-app/ subdirectory detection
- Runs npm install and Vite in correct directory

## Current Status

✅ Code pushed to GitHub: https://github.com/realtalishaw/blank-canvas-app/commit/f1c99ff
✅ Parent repo updated with submodule reference
❌ Edge function deployment: **Needs Docker or manual dashboard deployment**

Deploy via dashboard and you're good to go!
