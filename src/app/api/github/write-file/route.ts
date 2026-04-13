import { NextRequest, NextResponse } from 'next/server';
import type { WriteFileBody } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body: WriteFileBody = await req.json();
    const { token, owner, repo, branch, path: filePath, content, sha, commitMessage } = body;

    if (!token || !owner || !repo || !branch || !filePath || !content || !sha) {
      return NextResponse.json(
        { error: 'All fields are required: token, owner, repo, branch, path, content, sha.' },
        { status: 400 }
      );
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}`;

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: commitMessage || `[DARLEK CANN] Mutate ${filePath}`,
        content: Buffer.from(content, 'utf-8').toString('base64'),
        sha,
        branch,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: `GitHub API error: ${err}` },
        { status: res.status }
      );
    }

    const data = await res.json();

    return NextResponse.json({
      success: true,
      commitSha: data.commit?.sha,
      contentSha: data.content?.sha,
      commitUrl: data.commit?.html_url,
    });
  } catch (error) {
    console.error('Write file error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
