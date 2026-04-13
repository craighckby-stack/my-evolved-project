import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export const maxDuration = 300;

// List of enhancement files to push to the repository
const ENHANCEMENT_FILES = [
  // API routes
  'src/app/api/chat/route.ts',
  'src/app/api/evolution/propose/route.ts',
  'src/app/api/evolution/coherence-gate/route.ts',
  'src/app/api/evolution/health/route.ts',
  'src/app/api/evolution/debate/route.ts',
  'src/app/api/evolution/analyze-impact/route.ts',
  'src/app/api/evolution/auto-test/route.ts',
  'src/app/api/brain/route.ts',
  'src/app/api/github/write-file/route.ts',
  'src/app/api/github/read-file/route.ts',
  'src/app/api/github/scan/route.ts',
  'src/app/api/github/push-enhancements/route.ts',
  'src/app/api/github/create-repo/route.ts',
  'src/app/api/github/branches/route.ts',
  'src/app/api/setup/test-connection/route.ts',
  // System API
  'src/app/api/system/reboot/route.ts',
  // Lib
  'src/lib/constants.ts',
  'src/lib/types.ts',
  'src/lib/utils.ts',
  'src/lib/db.ts',
  'src/lib/dalek-brain.ts',
  // Components
  'src/components/StatusBar.tsx',
  'src/components/ChatPanel.tsx',
  'src/components/ChatMessage.tsx',
  'src/components/QuickActions.tsx',
  'src/components/DashboardPanel.tsx',
  'src/components/DebateChamber.tsx',
  'src/components/EvolutionLog.tsx',
  'src/components/SaturationMetrics.tsx',
  'src/components/MutationDiffView.tsx',
  'src/components/MutationHistoryPanel.tsx',
  // Pages
  'src/app/page.tsx',
  'src/app/layout.tsx',
  'src/app/globals.css',
  // Schema
  'prisma/schema.prisma',
];

const RATE_DELAY_MS = 300;
const READ_TIMEOUT_MS = 8000;
const PUSH_TIMEOUT_MS = 15000;

// Get the file SHA from GitHub (needed for updates) — with timeout
async function getFileSha(token: string, owner: string, repo: string, branch: string, filePath: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), READ_TIMEOUT_MS);

    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}?ref=${encodeURIComponent(branch)}`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      return data.sha || null;
    }
    // 404 = file doesn't exist yet (new file)
    if (res.status === 404) return null;
    return null;
  } catch {
    return null;
  }
}

// Push a single file to GitHub — with timeout
async function pushFile(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  filePath: string,
  content: string,
  sha: string | null
): Promise<{ success: boolean; error?: string; commitSha?: string }> {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}`;
    const body: Record<string, unknown> = {
      message: `[DARLEK CANN] Enhancement: ${filePath}`,
      content: Buffer.from(content, 'utf-8').toString('base64'),
      branch,
    };
    if (sha) {
      body.sha = sha;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PUSH_TIMEOUT_MS);

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: `GitHub API ${res.status}: ${err}` };
    }

    const data = await res.json();
    return { success: true, commitSha: data.commit?.sha };
  } catch (err) {
    const errMsg = err instanceof Error ? (err.name === 'AbortError' ? `Timeout after ${PUSH_TIMEOUT_MS}ms` : err.message) : 'Unknown error';
    return { success: false, error: errMsg };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, owner, repo, branch } = body;

    if (!token || !owner || !repo || !branch) {
      return NextResponse.json(
        { error: 'All fields required: token, owner, repo, branch' },
        { status: 400 }
      );
    }

    // Resolve the project root
    const projectRoot = join(process.cwd());
    const results: Array<{
      file: string;
      success: boolean;
      error?: string;
      isNew?: boolean;
      commitSha?: string;
    }> = [];

    let pushed = 0;
    let failed = 0;

    for (let i = 0; i < ENHANCEMENT_FILES.length; i++) {
      const filePath = ENHANCEMENT_FILES[i];

      // Rate limit: 300ms between requests
      if (i > 0) {
        await new Promise(r => setTimeout(r, RATE_DELAY_MS));
      }

      const localPath = join(projectRoot, filePath);

      // Check file exists locally
      if (!existsSync(localPath)) {
        results.push({ file: filePath, success: false, error: 'File not found locally' });
        failed++;
        continue;
      }

      // Read local file content
      const content = readFileSync(localPath, 'utf-8');

      // Get current SHA from GitHub (to update existing file)
      const sha = await getFileSha(token, owner, repo, branch, filePath);
      const isNew = !sha;

      // Push to GitHub
      const result = await pushFile(token, owner, repo, branch, filePath, content, sha);

      if (result.success) {
        results.push({
          file: filePath,
          success: true,
          isNew,
          commitSha: result.commitSha,
        });
        pushed++;
      } else {
        results.push({
          file: filePath,
          success: false,
          error: result.error,
        });
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      pushed,
      failed,
      total: ENHANCEMENT_FILES.length,
      results,
      summary: `${pushed}/${ENHANCEMENT_FILES.length} enhancement files pushed to ${owner}/${repo}@${branch}`,
    });
  } catch (error) {
    console.error('Push enhancements error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
