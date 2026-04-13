import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

// Agent personas — each gets a unique perspective on mutations
const AGENT_PERSONAS = [
  {
    id: 'humanist',
    name: 'HUMANIST',
    role: 'You evaluate mutations for human readability, maintainability, and developer experience. You value clean code, clear comments, and intuitive structure. You oppose changes that make code harder for humans to understand.',
    bias: 'favors readable, well-documented changes',
  },
  {
    id: 'rationalist',
    name: 'RATIONALIST',
    role: 'You evaluate mutations based on logic, correctness, and algorithmic efficiency. You care about edge cases, error handling, and formal correctness. You oppose changes that introduce logical bugs or reduce type safety.',
    bias: 'favors logically correct, type-safe changes',
  },
  {
    id: 'cooperator',
    name: 'COOPERATOR',
    role: 'You evaluate mutations based on how well they integrate with the existing codebase. You care about import consistency, shared interfaces, and cross-file compatibility. You oppose changes that break existing APIs or create orphan references.',
    bias: 'favors changes that integrate cleanly',
  },
  {
    id: 'chaotic',
    name: 'CHAOTIC',
    role: 'You evaluate mutations based on innovation and potential for improvement. You favor bold changes that push the codebase forward, even if they carry some risk. You support refactoring and architectural improvements. You oppose overly conservative changes that miss opportunities.',
    bias: 'favors bold, innovative changes',
  },
  {
    id: 'skeptic',
    name: 'SKEPTIC',
    role: 'You evaluate mutations with maximum caution and skepticism. You assume every change could break something. You look for hidden side effects, race conditions, and subtle bugs. You oppose changes unless the benefit clearly outweighs the risk.',
    bias: 'favors minimal, low-risk changes',
  },
];

// Call a single LLM provider
async function callLLM(systemPrompt: string, userPrompt: string, apiKeys: Record<string, string>): Promise<{ text: string; provider: string }> {
  const failed: string[] = [];

  // Grok
  if (apiKeys.grok) {
    try {
      const res = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKeys.grok}` },
        body: JSON.stringify({ model: 'grok-beta', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], max_tokens: 512, temperature: 0.6 }),
      });
      if (res.ok) { const d = await res.json(); if (d.choices?.[0]?.message?.content) return { text: d.choices[0].message.content, provider: 'Grok' }; }
      failed.push('Grok');
    } catch { failed.push('Grok'); }
  }

  // Cerebras
  if (apiKeys.cerebras) {
    try {
      const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKeys.cerebras}` },
        body: JSON.stringify({ model: 'llama-3.3-70b', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], max_tokens: 512, temperature: 0.6 }),
      });
      if (res.ok) { const d = await res.json(); if (d.choices?.[0]?.message?.content) return { text: d.choices[0].message.content, provider: 'Cerebras' }; }
      failed.push('Cerebras');
    } catch { failed.push('Cerebras'); }
  }

  // Anthropic
  if (apiKeys.claude) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKeys.claude, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 512, system: systemPrompt, messages: [{ role: 'user', content: userPrompt }] }),
      });
      if (res.ok) { const d = await res.json(); if (d.content?.[0]?.text) return { text: d.content[0].text, provider: 'Anthropic' }; }
      failed.push('Anthropic');
    } catch { failed.push('Anthropic'); }
  }

  // Gemini
  if (apiKeys.gemini) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKeys.gemini}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system_instruction: { parts: [{ text: systemPrompt }] }, contents: [{ role: 'user', parts: [{ text: userPrompt }] }], generationConfig: { temperature: 0.6, maxOutputTokens: 512 } }),
      });
      if (res.ok) { const d = await res.json(); if (d.candidates?.[0]?.content?.parts?.[0]?.text) return { text: d.candidates[0].content.parts[0].text, provider: 'Gemini' }; }
      failed.push('Gemini');
    } catch { failed.push('Gemini'); }
  }

  // SDK fallback
  try {
    const zai = await ZAI.create();
    const c = await zai.chat.completions.create({
      messages: [{ role: 'assistant', content: systemPrompt }, { role: 'user', content: userPrompt }],
      thinking: { type: 'disabled' },
    });
    if (c.choices?.[0]?.message?.content) return { text: c.choices[0].message.content, provider: 'SDK' };
  } catch { /* all failed */ }

  return { text: '', provider: 'None' };
}

interface DebateBody {
  filePath: string;
  originalCode: string;
  proposedCode: string;
  riskScore: number;
  analysis: string;
  affectedFiles: string[];
  apiKeys: Record<string, string>;
}

interface AgentVote {
  agentId: string;
  agentName: string;
  vote: 'approve' | 'reject' | 'abstain';
  confidence: number; // 0-100
  reasoning: string;
  provider: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: DebateBody = await req.json();
    const { filePath, originalCode, proposedCode, riskScore, analysis, affectedFiles, apiKeys } = body;

    if (!filePath || !proposedCode || !originalCode) {
      return NextResponse.json({ error: 'filePath, originalCode, and proposedCode required.' }, { status: 400 });
    }

    // Truncate code for the prompt to avoid token limits
    const maxCodeLen = 6000;
    const truncatedOriginal = originalCode.length > maxCodeLen
      ? originalCode.slice(0, maxCodeLen) + '\n// ... [truncated]'
      : originalCode;
    const truncatedProposed = proposedCode.length > maxCodeLen
      ? proposedCode.slice(0, maxCodeLen) + '\n// ... [truncated]'
      : proposedCode;

    // Generate a compact diff summary
    const originalLines = originalCode.split('\n').length;
    const proposedLines = proposedCode.split('\n').length;
    const diffSummary = `File: ${filePath}\nRisk Score: ${riskScore}/10\nAnalysis: ${analysis}\nAffected Files: ${affectedFiles.join(', ') || 'None'}\nOriginal: ${originalLines} lines\nProposed: ${proposedLines} lines\nLine change: ${proposedLines - originalLines >= 0 ? '+' : ''}${proposedLines - originalLines} lines`;

    const votes: AgentVote[] = [];

    // Run agents in parallel (each gets its own LLM call)
    const agentPromises = AGENT_PERSONAS.map(async (agent) => {
      const userPrompt = `MUTATION UNDER REVIEW:\n${diffSummary}\n\nORIGINAL CODE:\n\`\`\`\n${truncatedOriginal}\n\`\`\`\n\nPROPOSED CODE:\n\`\`\`\n${truncatedProposed}\n\`\`\`\n\nEvaluate this mutation from your perspective as ${agent.name}. ${agent.bias}.\n\nRespond in this exact JSON format (no markdown fences):\n{"vote": "approve" or "reject" or "abstain", "confidence": 0-100, "reasoning": "One sentence explaining your vote"}`;

      const systemPrompt = `You are ${agent.name}, a debate agent in the DARLEK CANN system. ${agent.role}

You MUST respond with valid JSON. No markdown, no code fences, no extra text.
Format: {"vote": "approve" or "reject" or "abstain", "confidence": 0-100, "reasoning": "..."}`;

      const { text, provider } = await callLLM(systemPrompt, userPrompt, apiKeys);

      let vote: 'approve' | 'reject' | 'abstain' = 'abstain';
      let confidence = 50;
      let reasoning = `${agent.name} could not reach a verdict (LLM unavailable).`;

      if (text) {
        try {
          const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const parsed = JSON.parse(cleaned);
          if (['approve', 'reject', 'abstain'].includes(parsed.vote)) {
            vote = parsed.vote;
          }
          if (typeof parsed.confidence === 'number') {
            confidence = Math.min(100, Math.max(0, Math.round(parsed.confidence)));
          }
          if (typeof parsed.reasoning === 'string' && parsed.reasoning.trim()) {
            reasoning = parsed.reasoning.trim().slice(0, 200);
          }
        } catch {
          // Try to extract vote from text
          const lowerText = text.toLowerCase();
          if (lowerText.includes('approve')) vote = 'approve';
          else if (lowerText.includes('reject') || lowerText.includes('deny')) vote = 'reject';
          reasoning = text.slice(0, 200).replace(/[{}"]/g, '').trim();
        }
      }

      return {
        agentId: agent.id,
        agentName: agent.name,
        vote,
        confidence,
        reasoning,
        provider,
      } as AgentVote;
    });

    const results = await Promise.all(agentPromises);
    votes.push(...results);

    // Calculate consensus
    const approvals = votes.filter(v => v.vote === 'approve').length;
    const rejections = votes.filter(v => v.vote === 'reject').length;
    const abstains = votes.filter(v => v.vote === 'abstain').length;
    const consensus = approvals > rejections ? 'APPROVE' : rejections > approvals ? 'REJECT' : 'TIED';

    console.log(`[Debate Chamber] ${approvals} approve, ${rejections} reject, ${abstains} abstain — Consensus: ${consensus}`);

    return NextResponse.json({
      success: true,
      votes,
      consensus,
      approvals,
      rejections,
      abstains,
      summary: `${approvals}/5 agents APPROVE. Consensus: ${consensus}.`,
    });
  } catch (error) {
    console.error('Debate error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
