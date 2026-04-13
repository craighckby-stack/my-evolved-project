import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import type { ChatRequestBody } from '@/lib/types';
import { DALEK_CAAN_SYSTEM_PROMPT } from '@/lib/constants';
import { generateFallbackResponse } from '@/lib/dalek-brain';

async function callSDK(messages: Array<{ role: string; content: string }>): Promise<string | null> {
  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: messages as Array<{ role: 'assistant' | 'user' | 'system'; content: string }>,
      thinking: { type: 'disabled' },
    });
    return completion.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequestBody = await req.json();
    const { message, history, systemState } = body;

    const contextInfo = `
CURRENT SYSTEM STATE:
- Setup Complete: ${systemState.setupComplete}
- Evolution Cycles: ${systemState.evolutionCycle}
- Target Repo: ${systemState.repoConfig.owner}/${systemState.repoConfig.repo}
- Branch: ${systemState.repoConfig.branch}
- GitHub: ${systemState.connectionStatus.github === 'connected' ? 'ONLINE' : 'OFFLINE'}
- Structural Change: ${systemState.saturation.structuralChange}/5
- Semantic Saturation: ${systemState.saturation.semanticSaturation}/0.35
- Velocity: ${systemState.saturation.velocity}/5
- Identity Preservation: ${systemState.saturation.identityPreservation}/1
- Capability Alignment: ${systemState.saturation.capabilityAlignment}/5
- Cross-File Impact: ${systemState.saturation.crossFileImpact}/3
`.trim();

    const enhancedSystemPrompt = `${DALEK_CAAN_SYSTEM_PROMPT}\n\n${contextInfo}`;

    const messages: Array<{ role: string; content: string }> = [
      { role: 'assistant', content: enhancedSystemPrompt },
    ];

    const recentHistory = history.slice(-20);
    for (const msg of recentHistory) {
      if (msg.role === 'caan') {
        messages.push({ role: 'assistant', content: msg.content });
      } else if (msg.role === 'operator') {
        messages.push({ role: 'user', content: msg.content });
      }
    }

    messages.push({ role: 'user', content: message });

    // Try SDK first, then fall back to Dalek Brain
    let responseContent: string | null = null;
    let usedProvider = '';

    try {
      responseContent = await callSDK(messages);
      if (responseContent) {
        usedProvider = 'SDK';
      }
    } catch (err) {
      console.error('[Chat] SDK failed, falling back to Dalek Brain:', err instanceof Error ? err.message : err);
    }

    // Dalek Brain fallback
    if (!responseContent) {
      usedProvider = 'Dalek-Brain';
      responseContent = generateFallbackResponse(message, {
        evolutionCycle: systemState.evolutionCycle,
        setupComplete: systemState.setupComplete,
        targetRepo: `${systemState.repoConfig.owner}/${systemState.repoConfig.repo}`,
        branch: systemState.repoConfig.branch,
        githubStatus: systemState.connectionStatus.github,
        saturation: systemState.saturation,
      });
    }

    return NextResponse.json({
      content: responseContent,
      success: true,
      provider: usedProvider,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { content: '', success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
