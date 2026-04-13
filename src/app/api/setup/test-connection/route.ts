import { NextRequest, NextResponse } from 'next/server';
import type { TestConnectionBody } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body: TestConnectionBody = await req.json();
    const { provider, key } = body;

    if (!key || key.trim() === '') {
      return NextResponse.json({
        success: false,
        message: 'No API key provided.',
      });
    }

    switch (provider) {
      case 'gemini': {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Say "connected" in exactly one word.' }] }],
          }),
        });
        if (res.ok) {
          return NextResponse.json({ success: true, message: 'Gemini connection established.' });
        }
        const err = await res.text();
        return NextResponse.json({ success: false, message: `Gemini error: ${err.slice(0, 200)}` });
      }

      case 'grok': {
        const res = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: 'grok-beta',
            messages: [{ role: 'user', content: 'Say "connected" in exactly one word.' }],
            max_tokens: 10,
          }),
        });
        if (res.ok) {
          return NextResponse.json({ success: true, message: 'Grok connection established.' });
        }
        const err = await res.text();
        return NextResponse.json({ success: false, message: `Grok error: ${err.slice(0, 200)}` });
      }

      case 'cerebras': {
        const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b',
            messages: [{ role: 'user', content: 'Say "connected" in exactly one word.' }],
            max_tokens: 10,
          }),
        });
        if (res.ok) {
          return NextResponse.json({ success: true, message: 'Cerebras connection established.' });
        }
        const err = await res.text();
        return NextResponse.json({ success: false, message: `Cerebras error: ${err.slice(0, 200)}` });
      }

      case 'claude': {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Say "connected" in exactly one word.' }],
          }),
        });
        if (res.ok) {
          return NextResponse.json({ success: true, message: 'Claude connection established.' });
        }
        const err = await res.text();
        return NextResponse.json({ success: false, message: `Claude error: ${err.slice(0, 200)}` });
      }

      case 'github': {
        const res = await fetch('https://api.github.com/user', {
          headers: {
            'Authorization': `Bearer ${key}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        });
        if (res.ok) {
          const data = await res.json();
          return NextResponse.json({
            success: true,
            message: `GitHub connected as @${data.login}.`,
          });
        }
        const err = await res.text();
        return NextResponse.json({ success: false, message: `GitHub error: ${err.slice(0, 200)}` });
      }

      default:
        return NextResponse.json({ success: false, message: `Unknown provider: ${provider}` });
    }
  } catch (error) {
    console.error('Test connection error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, message: `Connection test failed: ${errorMessage}` });
  }
}
