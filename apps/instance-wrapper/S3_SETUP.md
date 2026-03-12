# S3 Code Fetching Setup

## Overview
The `create-sandbox` edge function now fetches app code from S3 and sets it up in the e2b sandbox.

## Environment Variables Required in Supabase

Add these secrets to your Supabase project for the `create-sandbox` edge function:

1. **E2B_API_KEY** - Your E2B API key for creating sandboxes
2. **AWS_ACCESS_KEY_ID** - Your AWS access key ID
3. **AWS_SECRET_ACCESS_KEY** - Your AWS secret access key
4. **AWS_REGION** - AWS region (defaults to `us-east-1` if not set)

### How to Add Secrets in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Edge Functions** → **Secrets**
3. Add each secret with the name and value

## S3 Location Format

The `s3_repo_location` field in the apps table should be in one of these formats:

- `bucket-name/path/to/code` (recommended)
- `s3://bucket-name/path/to/code`

Examples:
- `my-apps-bucket/apps/my-vite-app`
- `s3://my-apps-bucket/apps/my-vite-app`

## How It Works

1. The edge function parses the `s3_repo_location` to extract bucket and prefix
2. Lists all objects in that S3 path
3. Downloads each file and copies it to `/app` directory in the sandbox
4. Verifies `package.json` exists
5. Runs `npm install` in `/app`
6. Starts `npm run dev` on the configured port (default: 5173)
7. Returns the public URL for the running app

## Requirements

- The S3 path must contain a valid Vite app with a `package.json` file
- The AWS credentials must have read access to the S3 bucket
- The code structure should be flat or properly nested (the function preserves directory structure)

## Testing

After setting up the environment variables, test by:
1. Creating an app with a valid `s3_repo_location`
2. Navigating to the app detail page
3. The sandbox should automatically fetch code from S3 and start the dev server
