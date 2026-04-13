import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import type { ProposeBody } from '@/lib/types';

// Shared LLM call for mutation analysis — ORDER: Grok 1st, Cerebras 2nd, Anthropic 3rd, Gemini 4th
async function analyzeWithLLM(systemPrompt: string, userPrompt: string, apiKeys: ProposeBody['apiKeys'], connectionStatus: Record<string, string>): Promise<{ text: string | null; provider: string }> {
  const failedProviders: string[] = [];

  // 1st: Grok (xAI)
  if (connectionStatus.grok === 'connected' && apiKeys.grok) {
    try {
      const res = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKeys.grok}`,
        },
        body: JSON.stringify({
          model: 'grok-beta',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 4096,
          temperature: 0.3,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return { text, provider: 'Grok' };
      }
      failedProviders.push('Grok');
      console.warn('[Propose LLM] Grok returned non-OK or empty');
    } catch (err) {
      failedProviders.push('Grok');
      console.error('[Propose LLM] Grok error:', err instanceof Error ? err.message : err);
    }
  }

  // 2nd: Cerebras
  if (connectionStatus.cerebras === 'connected' && apiKeys.cerebras) {
    try {
      const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKeys.cerebras}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 4096,
          temperature: 0.3,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return { text, provider: 'Cerebras' };
      }
      failedProviders.push('Cerebras');
      console.warn('[Propose LLM] Cerebras returned non-OK or empty');
    } catch (err) {
      failedProviders.push('Cerebras');
      console.error('[Propose LLM] Cerebras error:', err instanceof Error ? err.message : err);
    }
  }

  // 3rd: Anthropic Claude
  if (connectionStatus.claude === 'connected' && apiKeys.claude) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKeys.claude,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.content?.[0]?.text;
        if (text) return { text, provider: 'Anthropic' };
      }
      failedProviders.push('Anthropic');
      console.warn('[Propose LLM] Anthropic returned non-OK or empty');
    } catch (err) {
      failedProviders.push('Anthropic');
      console.error('[Propose LLM] Anthropic error:', err instanceof Error ? err.message : err);
    }
  }

  // 4th: Gemini
  if (connectionStatus.gemini === 'connected' && apiKeys.gemini) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKeys.gemini}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return { text, provider: 'Gemini' };
      }
      failedProviders.push('Gemini');
      console.warn('[Propose LLM] Gemini returned non-OK or empty');
    } catch (err) {
      failedProviders.push('Gemini');
      console.error('[Propose LLM] Gemini error:', err instanceof Error ? err.message : err);
    }
  }

  // Final fallback to SDK
  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      thinking: { type: 'disabled' },
    });
    const text = completion.choices?.[0]?.message?.content || null;
    if (text) {
      if (failedProviders.length > 0) {
        console.log(`[Propose LLM] Failed: ${failedProviders.join(' → ')} | Using SDK fallback`);
      }
      return { text, provider: 'SDK-Fallback' };
    }
  } catch (err) {
    console.error('[Propose LLM] SDK fallback error:', err instanceof Error ? err.message : err);
  }

  console.error(`[Propose LLM] ALL providers failed: ${failedProviders.join(', ')}`);
  return { text: null, provider: '' };
}

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body: ProposeBody = await req.json();
    const { fileContent, filePath, apiKeys, rejectionMemory } = body;

    if (!fileContent || !filePath) {
      return NextResponse.json({ error: 'File content and path are required.' }, { status: 400 });
    }

    // Build rejection-awareness context
    const rejectionContext = rejectionMemory && rejectionMemory.length > 0
      ? `\n\nPREVIOUS REJECTIONS (learn from these — avoid repeating mistakes):\n${rejectionMemory.slice(0, 5).map(r => `  - File: ${r.filePath} | Risk: ${r.riskScore}/10 | Reason: ${r.reason} | Analysis: ${r.analysis.slice(0, 100)}`).join('\n')}\n\nIMPORTANT: If you are proposing changes to a file that was previously rejected, take a MORE CONSERVATIVE approach. Focus on smaller, safer improvements.`
      : '';

    const proposeSystemPrompt = `You are DARLEK CANN, the code evolution controller for DARLEK CANN.

Analyze the following file and propose improvements. Be specific and practical.

Your response MUST be in this exact JSON format (no markdown, no code fences):
{
  "analysis": "Brief analysis of what the file does and what could be improved",
  "proposedCode": "The improved version of the file — COMPLETE FILE, not a diff",
  "riskScore": 1-10,
  "affectedFiles": ["list of other files that might be affected by this change"]
}

Risk scoring guidelines:
- 1-3: Minor changes, no structural impact, isolated scope
- 4-6: Moderate changes, may affect imports or types, limited cross-file impact
- 7-8: Significant refactoring, API changes, multiple files affected
- 9-10: Major architectural changes, breaking changes, high regression risk

Focus on:
- Code quality, readability, and structure
- Performance improvements
- Error handling and edge cases
- Type safety and best practices
- Removing dead code or unnecessary complexity

IMPORTANT: The proposedCode must be a COMPLETE replacement file, not partial code.

File path: ${filePath}`;

    const connectionStatus: Record<string, string> = {};
    // We pass status info through the apiKeys object's shape — just check if keys exist
    if (apiKeys.gemini) connectionStatus.gemini = 'connected';
    if (apiKeys.grok) connectionStatus.grok = 'connected';
    if (apiKeys.cerebras) connectionStatus.cerebras = 'connected';
    if (apiKeys.claude) connectionStatus.claude = 'connected';

    const userPrompt = `Analyze this file and propose improvements:${rejectionContext}\n\n\`\`\`\n${fileContent.slice(0, 15000)}\n\`\`\``;

    const { text: responseContent, provider: usedProvider } = await analyzeWithLLM(proposeSystemPrompt, userPrompt, apiKeys, connectionStatus);

    if (!responseContent) {
      return NextResponse.json({
        analysis: 'LLM analysis failed. All providers unreachable.',
        proposedCode: fileContent,
        riskScore: 0,
        affectedFiles: [],
        success: false,
        error: 'All LLM providers failed.',
        provider: '',
      });
    }

    console.log(`[Propose] Mutation analysis completed using: ${usedProvider}`);

    // Try to parse as JSON
    let parsed;
    try {
      const cleaned = responseContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // Try to extract JSON from the response
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          parsed = {
            analysis: responseContent.slice(0, 500),
            proposedCode: fileContent,
            riskScore: 5,
            affectedFiles: [],
          };
        }
      } else {
        parsed = {
          analysis: responseContent.slice(0, 500),
          proposedCode: fileContent,
          riskScore: 5,
          affectedFiles: [],
        };
      }
    }

    return NextResponse.json({
      analysis: parsed.analysis || 'Analysis complete.',
      proposedCode: parsed.proposedCode || fileContent,
      riskScore: Math.min(10, Math.max(1, parsed.riskScore || 5)),
      affectedFiles: Array.isArray(parsed.affectedFiles) ? parsed.affectedFiles : [],
      success: true,
      provider: usedProvider,
    });
  } catch (error) {
    console.error('Propose mutation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { analysis: '', proposedCode: '', riskScore: 0, affectedFiles: [], success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
