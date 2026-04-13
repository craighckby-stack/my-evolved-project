import { NextRequest, NextResponse } from 'next/server';
import type { ReadFileBody } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body: ReadFileBody = await req.json();
    const { token, owner, repo, branch, path: filePath } = body;

    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}?ref=${encodeURIComponent(branch)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    let res: Response;
    try {
      res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: `GitHub API error: ${err}` },
        { status: res.status }
      );
    }

    const data = await res.json();

    if (data.encoding === 'base64' && data.content) {
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      return NextResponse.json({
        content,
        sha: data.sha,
        name: data.name,
        size: data.size,
      });
    }

    return NextResponse.json(
      { error: 'Unable to decode file content. File may be binary.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Read file error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
