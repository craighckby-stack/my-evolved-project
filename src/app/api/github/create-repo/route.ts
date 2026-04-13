import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, repoName, description } = body;

    if (!token || !repoName) {
      return NextResponse.json({ error: 'token and repoName are required' }, { status: 400 });
    }

    // Step 1: Check if repo already exists
    const userRes = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' },
    });
    if (!userRes.ok) {
      return NextResponse.json({ error: 'GitHub authentication failed' }, { status: 401 });
    }
    const userData = await userRes.json();
    const owner = userData.login;

    // Check if repo exists
    const existingRepo = await fetch(`https://api.github.com/repos/${owner}/${encodeURIComponent(repoName)}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' },
    });
    let repoCreated = existingRepo.ok;
    let defaultBranch = 'main';

    if (!repoCreated) {
      // Create the repo
      const createRes = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' },
        body: JSON.stringify({
          name: repoName,
          description: description || 'DARLEK CANN v3.0 — Code Evolution Engine',
          auto_init: true,
          private: false,
        }),
      });

      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        return NextResponse.json({ error: `Failed to create repo: ${errData.message || createRes.statusText}` }, { status: createRes.status });
      }
      repoCreated = true;
    } else {
      const repoData = await existingRepo.json();
      defaultBranch = repoData.default_branch || 'main';
    }

    // Step 2: Get SHAs of existing files before pushing
    const treeRes = await fetch(`https://api.github.com/repos/${owner}/${encodeURIComponent(repoName)}/git/trees/${defaultBranch}?recursive=1`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' },
    });
    const existingShas: Record<string, string> = {};
    if (treeRes.ok) {
      const treeData = await treeRes.json();
      for (const item of (treeData.tree || [])) {
        if (item.type === 'blob') {
          existingShas[item.path] = item.sha;
        }
      }
    }

    // Step 3: Collect source files to push
    const projectRoot = process.cwd();
    const extensionsToInclude = ['.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.html', '.prisma'];
    const excludeDirs = ['node_modules', '.next', '.git', 'download', 'work', 'upload', '.darleK-backups'];
    const excludeFiles = ['db/custom.db'];

    const filesToPush: Array<{ path: string; content: string }> = [];
    const configFiles = ['package.json', 'next.config.ts', 'next.config.js', 'next.config.mjs', 'tsconfig.json', 'tailwind.config.ts', 'tailwind.config.js', 'postcss.config.js', 'postcss.config.mjs', '.eslintrc.json', '.eslintrc.js', 'eslint.config.mjs', 'README.md', '.gitignore', '.env.example'];

    // Collect files
    async function collectFiles(dir: string, base: string = '') {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = base ? `${base}/${entry.name}` : entry.name;

        if (excludeDirs.includes(entry.name)) continue;
        if (entry.name.startsWith('.') && !configFiles.some(f => relativePath === f)) continue;

        if (entry.isFile()) {
          const ext = '.' + entry.name.split('.').pop()?.toLowerCase();
          const isConfig = configFiles.some(f => relativePath === f || relativePath.startsWith(f + '.'));
          if (extensionsToInclude.includes(ext) || isConfig) {
            if (excludeFiles.includes(relativePath)) continue;
            try {
              const content = await fs.readFile(fullPath, 'utf-8');
              filesToPush.push({ path: relativePath, content });
            } catch {
              // Skip unreadable files
            }
          }
        } else if (entry.isDirectory()) {
          await collectFiles(fullPath, relativePath);
        }
      }
    }

    await collectFiles(projectRoot);

    // Step 4: Push files to GitHub
    const pushed: Array<{ file: string; isNew: boolean; success: boolean; error?: string }> = [];
    const rateDelay = 300;

    for (let i = 0; i < filesToPush.length; i++) {
      const file = filesToPush[i];
      if (i > 0) await new Promise(r => setTimeout(r, rateDelay));

      try {
        const contentBase64 = Buffer.from(file.content).toString('base64');
        const existingSha = existingShas[file.path];
        const isNew = !existingSha;
        const shaChanged = existingSha && existingSha !== ''; // We'll push regardless

        const putBody: Record<string, unknown> = {
          message: `[DARLEK CANN] Deploy ${isNew ? 'new' : 'update'}: ${file.path}`,
          content: contentBase64,
          branch: defaultBranch,
        };

        // For existing files, include SHA to avoid conflicts
        if (existingSha) {
          putBody.sha = existingSha;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const putRes = await fetch(`https://api.github.com/repos/${owner}/${encodeURIComponent(repoName)}/contents/${encodeURIComponent(file.path)}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' },
          body: JSON.stringify(putBody),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (putRes.ok) {
          pushed.push({ file: file.path, isNew, success: true });
        } else {
          const errData = await putRes.json().catch(() => ({}));
          pushed.push({ file: file.path, isNew, success: false, error: errData.message || `HTTP ${putRes.status}` });
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        pushed.push({ file: file.path, isNew: false, success: false, error: errMsg });
      }
    }

    const successCount = pushed.filter(p => p.success).length;
    const failCount = pushed.filter(p => !p.success).length;

    return NextResponse.json({
      success: true,
      message: `Deploy complete to ${owner}/${repoName}. ${successCount} files pushed, ${failCount} failed.`,
      repoUrl: `https://github.com/${owner}/${repoName}`,
      results: pushed,
      total: filesToPush.length,
      pushed: successCount,
      failed: failCount,
    });
  } catch (error) {
    console.error('Create repo error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
