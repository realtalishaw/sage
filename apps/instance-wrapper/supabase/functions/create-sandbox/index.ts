// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Sandbox } from 'https://esm.sh/@e2b/code-interpreter@1.0.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

// Vite app template ID - this should have Vite pre-installed
const VITE_TEMPLATE_ID = 'o8032cmozknl23ikqad2';

// Sandbox timeout in seconds (1 hour)
const SANDBOX_TIMEOUT_S = 60 * 60;

const DEFAULT_PORT = 5173;
const APP_DIR = '/code';

const E2B_API_BASE = 'https://api.e2b.dev';

// -------------------- E2B REST API helpers --------------------

interface SandboxInfo {
  sandboxId: string;
  clientId: string;
  templateId: string;
}

async function createSandboxViaApi(apiKey: string, templateId: string, timeoutS: number): Promise<SandboxInfo> {
  const res = await fetch(`${E2B_API_BASE}/sandboxes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify({
      templateID: templateId,
      timeout: timeoutS,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`E2B create sandbox failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return {
    sandboxId: data.sandboxID,
    clientId: data.clientID,
    templateId: data.templateID,
  };
}

async function killSandboxApi(apiKey: string, sandboxId: string): Promise<void> {
  try {
    await fetch(`${E2B_API_BASE}/sandboxes/${sandboxId}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': apiKey },
    });
  } catch {
    // Ignore kill errors
  }
}

function getSandboxHost(sandboxId: string, clientId: string, port: number): string {
  return `${port}-${sandboxId}-${clientId}.e2b.app`;
}

// -------------------- SDK-based command execution --------------------

async function runCommandWithSdk(
  apiKey: string,
  sandboxId: string,
  command: string,
  timeoutMs = 60000,
  cwd = '/code'
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const sandbox = await Sandbox.connect(sandboxId, { apiKey });
    const result = await sandbox.commands.run(command, { 
      cwd,
      timeoutMs 
    });
    return {
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      exitCode: result.exitCode ?? 0,
    };
  } catch (e: any) {
    console.error(`[create-sandbox] SDK command error for "${command}":`, e?.message);
    return { stdout: '', stderr: e?.message || String(e), exitCode: 1 };
  }
}

async function runBackgroundCommandWithSdk(
  apiKey: string,
  sandboxId: string,
  command: string,
  cwd = '/code'
): Promise<void> {
  try {
    const sandbox = await Sandbox.connect(sandboxId, { apiKey });
    // Start command in background - don't wait for it
    sandbox.commands.run(command, { cwd, background: true }).catch(() => {});
  } catch (e: any) {
    console.error(`[create-sandbox] SDK background command error:`, e?.message);
  }
}

// -------------------- S3 Git Repo helpers --------------------

interface S3Location {
  bucket: string;
  prefix: string;
}

function parseS3Url(s3Url: string): S3Location | null {
  // Format: s3://bucket-name/path/to/folder/
  const match = s3Url.match(/^s3:\/\/([^/]+)\/(.*)$/);
  if (!match) return null;
  return {
    bucket: match[1],
    prefix: match[2].replace(/\/$/, ''), // Remove trailing slash
  };
}

async function cloneFromS3GitRepo(
  e2bApiKey: string,
  sandboxId: string,
  s3Location: S3Location,
  targetDir: string,
  awsAccessKeyId: string,
  awsSecretAccessKey: string,
  awsRegion: string,
  commitSha?: string
): Promise<void> {
  console.log(`[create-sandbox] Cloning git repo from S3: s3://${s3Location.bucket}/${s3Location.prefix} -> ${targetDir}`);

  // Clean target directory
  await runCommandWithSdk(e2bApiKey, sandboxId, `rm -rf ${targetDir} && mkdir -p ${targetDir}`, 30000, '/');

  const configureAws = `
export AWS_ACCESS_KEY_ID="${awsAccessKeyId}"
export AWS_SECRET_ACCESS_KEY="${awsSecretAccessKey}"
export AWS_DEFAULT_REGION="${awsRegion}"
`;

  // Install git, git-remote-s3, and dependencies
  const checkTools = await runCommandWithSdk(
    e2bApiKey,
    sandboxId,
    'which git && which git-remote-s3 || echo "missing"',
    10000,
    '/'
  );

  if (checkTools.stdout.includes('missing') || checkTools.exitCode !== 0) {
    console.log('[create-sandbox] Installing git and git-remote-s3...');

    // Install git first
    await runCommandWithSdk(
      e2bApiKey,
      sandboxId,
      'apt-get update -qq && apt-get install -y -qq git 2>/dev/null || echo "git already installed"',
      3 * 60 * 1000,
      '/'
    );

    // Install git-remote-s3 via pip
    const installGitRemoteS3 = await runCommandWithSdk(
      e2bApiKey,
      sandboxId,
      'pip install git-remote-s3 --quiet || pip3 install git-remote-s3 --quiet',
      3 * 60 * 1000,
      '/'
    );

    if (installGitRemoteS3.exitCode !== 0) {
      throw new Error(`Failed to install git-remote-s3: ${installGitRemoteS3.stderr}`);
    }

    console.log('[create-sandbox] git-remote-s3 installed successfully');
  }

  // Construct S3 URL for git clone (add trailing slash if not present)
  const s3Prefix = s3Location.prefix.endsWith('/') ? s3Location.prefix : `${s3Location.prefix}/`;
  const s3Url = `s3://${s3Location.bucket}/${s3Prefix}`;

  // Clone directly from S3 using git-remote-s3
  const cloneCmd = `${configureAws}
git clone "${s3Url}" "${targetDir}"`;

  console.log(`[create-sandbox] Cloning from S3 using git-remote-s3...`);
  console.log(`[create-sandbox] Clone command: git clone ${s3Url} ${targetDir}`);

  const cloneResult = await runCommandWithSdk(
    e2bApiKey,
    sandboxId,
    cloneCmd,
    5 * 60 * 1000,
    '/'
  );

  if (cloneResult.exitCode !== 0) {
    console.error('[create-sandbox] Git clone failed:', cloneResult.stderr);

    // Try to get more debugging info
    const lsS3 = await runCommandWithSdk(
      e2bApiKey,
      sandboxId,
      `${configureAws} aws s3 ls "s3://${s3Location.bucket}/${s3Prefix}" --recursive 2>&1 || echo "ls failed"`,
      30000,
      '/'
    );

    throw new Error(
      `Failed to clone git repo from S3.\n` +
      `S3 URL: ${s3Url}\n` +
      `Clone error: ${cloneResult.stderr}\n` +
      `S3 contents:\n${lsS3.stdout}`
    );
  }

  console.log('[create-sandbox] Clone successful, listing cloned files...');
  const lsResult = await runCommandWithSdk(e2bApiKey, sandboxId, `ls -la ${targetDir}`, 10000, '/');
  console.log(`[create-sandbox] Cloned contents:\n${lsResult.stdout}`);

  // Checkout specific commit if provided
  if (commitSha) {
    console.log(`[create-sandbox] Checking out specific commit: ${commitSha}`);
    const checkoutResult = await runCommandWithSdk(
      e2bApiKey,
      sandboxId,
      `git checkout ${commitSha}`,
      60000,
      targetDir
    );

    if (checkoutResult.exitCode !== 0) {
      console.warn(`[create-sandbox] Checkout warning: ${checkoutResult.stderr}`);
      // Don't fail on checkout errors - we'll use whatever HEAD is
    }
  }

  // Verify package.json exists in web-app directory or root
  const verifyPkg = await runCommandWithSdk(
    e2bApiKey,
    sandboxId,
    `test -f ${targetDir}/web-app/package.json && echo "web-app" || test -f ${targetDir}/package.json && echo "root" || echo "none"`,
    5000,
    '/'
  );

  const pkgLocation = verifyPkg.stdout.trim();

  if (pkgLocation === 'none') {
    const lsFinal = await runCommandWithSdk(e2bApiKey, sandboxId, `find ${targetDir} -name package.json 2>/dev/null || ls -la ${targetDir}`, 15000, '/');
    console.warn(`[create-sandbox] Warning: No package.json in expected locations. Directory contents:\n${lsFinal.stdout}`);
    // Don't throw - might be a scripts-only app
  } else {
    console.log(`[create-sandbox] Found package.json in: ${pkgLocation}`);
  }

  console.log('[create-sandbox] Git repo cloned successfully from S3');
}

// -------------------- Vite setup helpers --------------------

async function checkPackageJson(apiKey: string, sandboxId: string, dir: string): Promise<boolean> {
  const result = await runCommandWithSdk(apiKey, sandboxId, `test -f ${dir}/package.json && echo "exists"`, 10000, '/');
  return result.stdout.includes('exists');
}

async function createViteApp(apiKey: string, sandboxId: string, dir: string): Promise<void> {
  console.log(`[create-sandbox] Creating Vite app in ${dir}...`);

  // Create directory
  let result = await runCommandWithSdk(apiKey, sandboxId, `mkdir -p ${dir}`, 10000, '/');
  if (result.exitCode !== 0) {
    console.error(`[create-sandbox] mkdir failed:`, result.stderr);
    throw new Error(`Failed to create directory: ${result.stderr}`);
  }

  // Create Vite app
  console.log(`[create-sandbox] Running npm create vite...`);
  result = await runCommandWithSdk(apiKey, sandboxId, `npm create vite@latest . -- --template react-ts --yes`, 3 * 60 * 1000, dir);
  if (result.exitCode !== 0) {
    console.error(`[create-sandbox] npm create vite failed:`, result.stderr);
    throw new Error(`Failed to create Vite app: ${result.stderr}`);
  }

  // Install dependencies
  console.log(`[create-sandbox] Running npm install...`);
  result = await runCommandWithSdk(apiKey, sandboxId, `npm install`, 5 * 60 * 1000, dir);
  if (result.exitCode !== 0) {
    console.error(`[create-sandbox] npm install failed:`, result.stderr);
    throw new Error(`Failed to install dependencies: ${result.stderr}`);
  }

  console.log('[create-sandbox] Vite app created successfully');
}

async function configureViteConfig(apiKey: string, sandboxId: string, dir: string, port: number): Promise<void> {
  console.log(`[create-sandbox] Configuring Vite config in ${dir}`);

  // Check if vite.config already exists
  const existingConfig = await runCommandWithSdk(apiKey, sandboxId, `test -f ${dir}/vite.config.ts -o -f ${dir}/vite.config.js && echo "exists"`, 5000, '/');
  
  const viteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: ${port},
    strictPort: true,
    allowedHosts: 'all',
  },
})
`;

  // Always overwrite to ensure correct server config
  await runCommandWithSdk(apiKey, sandboxId, `cat > vite.config.ts << 'VITEEOF'
${viteConfig}
VITEEOF`, 10000, dir);

  console.log('[create-sandbox] Vite config updated');
}

async function startViteServer(apiKey: string, sandboxId: string, dir: string, port: number): Promise<void> {
  console.log(`[create-sandbox] Starting Vite dev server on port ${port}...`);

  // Start server in background using nohup
  await runBackgroundCommandWithSdk(
    apiKey,
    sandboxId,
    `nohup npm run dev -- --port ${port} --host 0.0.0.0 > /tmp/vite.log 2>&1 &`,
    dir
  );

  // Wait for server to start
  console.log('[create-sandbox] Waiting for server to start...');
  await new Promise((r) => setTimeout(r, 3000));

  let lastLocal = '';

  for (let i = 0; i < 25; i++) {
    const local = await runCommandWithSdk(
      apiKey,
      sandboxId,
      `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:${port} 2>/dev/null || echo "failed"`,
      5000,
      '/'
    );
    lastLocal = (local.stdout || '').trim();

    const listening = await runCommandWithSdk(
      apiKey,
      sandboxId,
      `ss -ltnp 2>/dev/null | grep ":${port} " || true`,
      5000,
      '/'
    );

    if (lastLocal === '200' || lastLocal === '304') {
      console.log('[create-sandbox] Server is ready (local healthcheck ok)!');
      return;
    }

    console.log(
      `[create-sandbox] Waiting for server... attempt ${i + 1}/25, local=${lastLocal}, listening=${listening.stdout ? 'yes' : 'no'}`
    );
    await new Promise((r) => setTimeout(r, 2000));
  }

  const logTail = await runCommandWithSdk(apiKey, sandboxId, 'tail -80 /tmp/vite.log 2>/dev/null || true', 8000, '/');
  const ps = await runCommandWithSdk(apiKey, sandboxId, 'ps aux | grep -E "vite|node" | grep -v grep | head -20 || true', 8000, '/');
  const ss = await runCommandWithSdk(apiKey, sandboxId, `ss -ltnp 2>/dev/null | grep ":${port} " || true`, 8000, '/');

  throw new Error(
    `Vite server not reachable on localhost:${port}. lastLocal=${lastLocal}\n` +
      `ss=\n${ss.stdout}\n` +
      `ps=\n${ps.stdout}\n` +
      `vite.log=\n${logTail.stdout}`
  );
}

async function verifySandboxAlive(apiKey: string, sandboxId: string): Promise<boolean> {
  try {
    const result = await runCommandWithSdk(apiKey, sandboxId, 'echo "alive"', 10000, '/');
    return result.stdout.includes('alive');
  } catch {
    return false;
  }
}

// -------------------- Main handler --------------------

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const e2bApiKey = Deno.env.get('E2B_API_KEY');
    const awsAccessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
    const awsSecretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
    const awsRegion = Deno.env.get('AWS_REGION') || 'us-east-1';

    if (!e2bApiKey) {
      return new Response(JSON.stringify({ error: 'E2B_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const appId = url.searchParams.get('appId');
    const forceRefresh = url.searchParams.get('refresh') === 'true';

    if (!appId) {
      return new Response(JSON.stringify({ error: 'Missing appId parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: app, error: appError } = await supabase
      .from('apps')
      .select('id, sandbox_id, sandbox_url, sandbox_port, user_id, s3_repo_location, git_commit_sha')
      .eq('id', appId)
      .eq('user_id', user.id)
      .single();

    if (appError || !app) {
      return new Response(JSON.stringify({ error: 'App not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const port = app.sandbox_port || DEFAULT_PORT;
    const s3Location = app.s3_repo_location ? parseS3Url(app.s3_repo_location) : null;

    // Helper to extract clientId from stored sandbox_url
    function extractClientIdFromUrl(sandboxUrl: string, sandboxId: string): string | null {
      try {
        const hostname = new URL(sandboxUrl).hostname;
        const match = hostname.match(new RegExp(`^\\d+-${sandboxId}-([^.]+)\\.e2b\\.app$`));
        return match ? match[1] : null;
      } catch {
        return null;
      }
    }

    // Kill old sandbox if force refresh
    if (forceRefresh && app.sandbox_id) {
      console.log(`[create-sandbox] Refresh requested; killing old sandbox ${app.sandbox_id}`);
      await killSandboxApi(e2bApiKey, app.sandbox_id);
    }

    // Try to reuse existing sandbox (only if not force refresh)
    if (!forceRefresh && app.sandbox_id && app.sandbox_url) {
      console.log(`[create-sandbox] Checking if existing sandbox ${app.sandbox_id} is still alive...`);
      const alive = await verifySandboxAlive(e2bApiKey, app.sandbox_id);
      if (alive) {
        const clientId = extractClientIdFromUrl(app.sandbox_url, app.sandbox_id);
        if (clientId) {
          const host = getSandboxHost(app.sandbox_id, clientId, port);
          const publicUrl = `https://${host}`;
          
          // Verify public URL is actually reachable
          try {
            const res = await fetch(publicUrl, { 
              method: 'GET', 
              redirect: 'follow',
              signal: AbortSignal.timeout(10_000) 
            });
            if (res.ok) {
              console.log(`[create-sandbox] Reusing sandbox at ${publicUrl}`);
              return new Response(
                JSON.stringify({ url: publicUrl, sandboxId: app.sandbox_id, port, reused: true }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          } catch {
            console.log('[create-sandbox] Existing sandbox public URL not reachable');
          }
        }
      }
      console.log('[create-sandbox] Existing sandbox not reusable, killing...');
      await killSandboxApi(e2bApiKey, app.sandbox_id);
    }

    // Create new sandbox via REST API
    console.log(`[create-sandbox] Creating new sandbox for app ${appId} using template ${VITE_TEMPLATE_ID}`);

    let sandboxInfo: SandboxInfo;
    try {
      sandboxInfo = await createSandboxViaApi(e2bApiKey, VITE_TEMPLATE_ID, SANDBOX_TIMEOUT_S);
      console.log(`[create-sandbox] Sandbox created: ${sandboxInfo.sandboxId} (client: ${sandboxInfo.clientId})`);
    } catch (error: any) {
      console.error('[create-sandbox] Error creating sandbox:', error);
      return new Response(JSON.stringify({ error: 'Failed to create sandbox', details: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { sandboxId, clientId } = sandboxInfo;

    try {
      // Wait for sandbox to fully initialize
      console.log('[create-sandbox] Waiting for sandbox to initialize...');
      await new Promise((r) => setTimeout(r, 5000));

      // Determine source: S3 git repo or create new Vite app
      let viteAppDir = APP_DIR;

      if (s3Location && awsAccessKeyId && awsSecretAccessKey) {
        // Clone from S3 git repo
        console.log(`[create-sandbox] S3 location found: ${app.s3_repo_location}`);
        await cloneFromS3GitRepo(e2bApiKey, sandboxId, s3Location, APP_DIR, awsAccessKeyId, awsSecretAccessKey, awsRegion, app.git_commit_sha);

        // Check if app has web-app/ subdirectory (create-app structure)
        const hasWebAppDir = await runCommandWithSdk(
          e2bApiKey,
          sandboxId,
          `test -d ${APP_DIR}/web-app && echo "has_web_app"`,
          5000,
          '/'
        );

        if (hasWebAppDir.stdout.includes('has_web_app')) {
          console.log('[create-sandbox] Detected web-app/ subdirectory structure');
          viteAppDir = `${APP_DIR}/web-app`;
        } else {
          console.log('[create-sandbox] Using root directory for Vite app');
        }

        // Install dependencies in the correct directory
        console.log(`[create-sandbox] Installing dependencies in ${viteAppDir}...`);
        const installResult = await runCommandWithSdk(e2bApiKey, sandboxId, `npm install`, 5 * 60 * 1000, viteAppDir);
        if (installResult.exitCode !== 0) {
          console.warn('[create-sandbox] npm install warning:', installResult.stderr);
        }
      } else {
        // No S3 location - check template or create new app
        const hasPackageJson = await checkPackageJson(e2bApiKey, sandboxId, APP_DIR);
        console.log(`[create-sandbox] Has package.json: ${hasPackageJson}`);

        if (!hasPackageJson) {
          console.log('[create-sandbox] No S3 location and no package.json - creating new Vite app');
          await createViteApp(e2bApiKey, sandboxId, APP_DIR);
        } else {
          console.log('[create-sandbox] Existing Vite app found, installing dependencies...');
          const installResult = await runCommandWithSdk(e2bApiKey, sandboxId, `npm install`, 5 * 60 * 1000, APP_DIR);
          if (installResult.exitCode !== 0) {
            console.warn('[create-sandbox] npm install warning:', installResult.stderr);
          }
        }
      }

      // Configure Vite for E2B network access
      await configureViteConfig(e2bApiKey, sandboxId, viteAppDir, port);

      // Start dev server
      await startViteServer(e2bApiKey, sandboxId, viteAppDir, port);

      const host = getSandboxHost(sandboxId, clientId, port);
      const publicUrl = `https://${host}`;

      // Verify it is reachable from the public internet (E2B proxy)
      try {
        const res = await fetch(publicUrl, {
          method: 'GET',
          redirect: 'follow',
          signal: AbortSignal.timeout(12_000),
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
      } catch (e: any) {
        throw new Error(`Sandbox public URL not reachable (${publicUrl}): ${e?.message ?? e}`);
      }

      console.log(`[create-sandbox] Sandbox ready at: ${publicUrl}`);

      // Update database
      const { error: updateError } = await supabase
        .from('apps')
        .update({
          sandbox_id: sandboxId,
          sandbox_url: publicUrl,
          sandbox_port: port,
        })
        .eq('id', appId);

      if (updateError) {
        console.error('[create-sandbox] Error updating app:', updateError);
      }

      return new Response(
        JSON.stringify({ 
          url: publicUrl, 
          sandboxId, 
          port, 
          reused: false,
          syncedFromS3: !!s3Location 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error: any) {
      console.error('[create-sandbox] Error setting up sandbox:', error);

      // Try cleanup
      await killSandboxApi(e2bApiKey, sandboxId);

      return new Response(JSON.stringify({ error: 'Failed to set up sandbox', details: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error: any) {
    console.error('[create-sandbox] Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
