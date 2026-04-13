import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

// Static analysis — detect common breakage patterns without needing an LLM
function detectStaticIssues(originalCode: string, proposedCode: string, filePath: string): Array<{ type: string; severity: 'high' | 'medium' | 'low'; message: string }> {
  const issues: Array<{ type: string; severity: 'high' | 'medium' | 'low'; message: string }> = [];

  // Check for removed exports
  const originalExports = [...originalCode.matchAll(/export\s+(?:default\s+)?(?:function|class|const|let|var|type|interface|enum)\s+(\w+)/g)].map(m => m[1]);
  const proposedExports = [...proposedCode.matchAll(/export\s+(?:default\s+)?(?:function|class|const|let|var|type|interface|enum)\s+(\w+)/g)].map(m => m[1]);
  const removedExports = originalExports.filter(e => !proposedExports.includes(e));
  if (removedExports.length > 0) {
    issues.push({ type: 'REMOVED_EXPORT', severity: 'high', message: `Export(s) removed: ${removedExports.join(', ')}. Other files may import these.` });
  }

  // Check for removed function/class definitions that are not exports
  const originalFuncs = [...originalCode.matchAll(/(?:function|class)\s+(\w+)/g)].map(m => m[1]);
  const proposedFuncs = [...proposedCode.matchAll(/(?:function|class)\s+(\w+)/g)].map(m => m[1]);
  const removedFuncs = originalFuncs.filter(f => !proposedFuncs.includes(f) && !removedExports.includes(f));
  if (removedFuncs.length > 0) {
    issues.push({ type: 'REMOVED_DEFINITION', severity: 'medium', message: `Function/class removed: ${removedFuncs.join(', ')}. May be referenced internally.` });
  }

  // Check for import changes
  const originalImports = [...originalCode.matchAll(/import\s+.*?from\s+['"](.+?)['"]/g)].map(m => m[1]);
  const proposedImports = [...proposedCode.matchAll(/import\s+.*?from\s+['"](.+?)['"]/g)].map(m => m[1]);
  const newImports = proposedImports.filter(i => !originalImports.includes(i));
  const removedImports = originalImports.filter(i => !proposedImports.includes(i));
  if (removedImports.length > 0) {
    issues.push({ type: 'REMOVED_IMPORT', severity: 'medium', message: `Import(s) removed: ${removedImports.join(', ')}. Code may use these modules.` });
  }
  if (newImports.length > 0) {
    issues.push({ type: 'NEW_IMPORT', severity: 'low', message: `New import(s): ${newImports.join(', ')}. Ensure these packages are available.` });
  }

  // Check for significant size changes (>50% increase or decrease)
  const sizeChange = (proposedCode.length - originalCode.length) / Math.max(1, originalCode.length);
  if (Math.abs(sizeChange) > 0.5) {
    const direction = sizeChange > 0 ? 'increased' : 'decreased';
    issues.push({ type: 'SIZE_CHANGE', severity: 'low', message: `File size ${direction} by ${Math.abs(Math.round(sizeChange * 100))}%. ${sizeChange < 0 ? 'May indicate removed functionality.' : 'May indicate added complexity.'}` });
  }

  // Check for TODO/FIXME/HACK comments
  const newTodos = [...proposedCode.matchAll(/\/\/\s*(TODO|FIXME|HACK|XXX|BUG)[^\n]*/gi)].map(m => m[0]);
  if (newTodos.length > 0) {
    issues.push({ type: 'NEW_TODO', severity: 'low', message: `${newTodos.length} TODO/FIXME comment(s) found in proposed code.` });
  }

  // Check for console.log statements (potential debug leftover)
  const newConsoleLogs = [...proposedCode.matchAll(/console\.(log|debug|info)\s*\(/g)].length;
  const origConsoleLogs = [...originalCode.matchAll(/console\.(log|debug|info)\s*\(/g)].length;
  if (newConsoleLogs > origConsoleLogs) {
    issues.push({ type: 'DEBUG_CODE', severity: 'low', message: `${newConsoleLogs - origConsoleLogs} new console.log/debug call(s) added. May be debug leftovers.` });
  }

  // Check for 'any' type usage increase (TypeScript)
  const newAny = [...proposedCode.matchAll(/:\s*any\b/g)].length;
  const origAny = [...originalCode.matchAll(/:\s*any\b/g)].length;
  if (newAny > origAny) {
    issues.push({ type: 'TYPE_SAFETY', severity: 'medium', message: `${newAny - origAny} new 'any' type usage(s). Type safety reduced.` });
  }

  // Check for try/catch removal
  const origTryCatch = [...originalCode.matchAll(/try\s*\{/g)].length;
  const propTryCatch = [...proposedCode.matchAll(/try\s*\{/g)].length;
  if (propTryCatch < origTryCatch) {
    issues.push({ type: 'ERROR_HANDLING', severity: 'high', message: `${origTryCatch - propTryCatch} try/catch block(s) removed. Error handling weakened.` });
  }

  return issues;
}

interface AnalyzeImpactBody {
  originalCode: string;
  proposedCode: string;
  filePath: string;
  riskScore: number;
  apiKeys: Record<string, string>;
}

export async function POST(req: NextRequest) {
  try {
    const body: AnalyzeImpactBody = await req.json();
    const { originalCode, proposedCode, filePath, riskScore, apiKeys } = body;

    if (!originalCode || !proposedCode || !filePath) {
      return NextResponse.json({ error: 'originalCode, proposedCode, and filePath required.' }, { status: 400 });
    }

    // Phase 1: Static analysis (no LLM needed, always runs)
    const staticIssues = detectStaticIssues(originalCode, proposedCode, filePath);

    // Phase 2: LLM-powered deep analysis (if an LLM is available)
    let llmAnalysis = '';
    let llmProvider = '';
    const maxCodeLen = 8000;
    const truncatedOriginal = originalCode.length > maxCodeLen ? originalCode.slice(0, maxCodeLen) + '\n// ... [truncated]' : originalCode;
    const truncatedProposed = proposedCode.length > maxCodeLen ? proposedCode.slice(0, maxCodeLen) + '\n// ... [truncated]' : proposedCode;

    const systemPrompt = `You are an automated code review agent for DARLEK CANN. Analyze the diff between original and proposed code.

Focus ONLY on things that could BREAK:
- Missing dependencies or imports
- Removed exports that other files rely on
- Changed function signatures (parameter count, types, return type)
- Removed error handling
- Broken type references
- Race conditions or state management issues
- Missing null/undefined checks
- Incorrect API usage

If nothing would break, say "No breakage detected." Keep your response under 200 words.`;

    const userPrompt = `File: ${filePath}\nRisk: ${riskScore}/10\n\nORIGINAL:\n\`\`\`\n${truncatedOriginal}\n\`\`\`\n\nPROPOSED:\n\`\`\`\n${truncatedProposed}\n\`\`\`\n\nWhat could break?`;

    // Try LLM with fallback chain
    const failed: string[] = [];

    if (apiKeys.grok) {
      try {
        const res = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKeys.grok}` },
          body: JSON.stringify({ model: 'grok-beta', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], max_tokens: 512, temperature: 0.2 }),
        });
        if (res.ok) { const d = await res.json(); llmAnalysis = d.choices?.[0]?.message?.content || ''; llmProvider = 'Grok'; }
        if (llmAnalysis) return buildResponse(staticIssues, llmAnalysis, llmProvider);
        failed.push('Grok');
      } catch { failed.push('Grok'); }
    }

    if (apiKeys.cerebras) {
      try {
        const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKeys.cerebras}` },
          body: JSON.stringify({ model: 'llama-3.3-70b', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], max_tokens: 512, temperature: 0.2 }),
        });
        if (res.ok) { const d = await res.json(); llmAnalysis = d.choices?.[0]?.message?.content || ''; llmProvider = 'Cerebras'; }
        if (llmAnalysis) return buildResponse(staticIssues, llmAnalysis, llmProvider);
        failed.push('Cerebras');
      } catch { failed.push('Cerebras'); }
    }

    if (apiKeys.claude) {
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKeys.claude, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
          body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 512, system: systemPrompt, messages: [{ role: 'user', content: userPrompt }] }),
        });
        if (res.ok) { const d = await res.json(); llmAnalysis = d.content?.[0]?.text || ''; llmProvider = 'Anthropic'; }
        if (llmAnalysis) return buildResponse(staticIssues, llmAnalysis, llmProvider);
        failed.push('Anthropic');
      } catch { failed.push('Anthropic'); }
    }

    if (apiKeys.gemini) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKeys.gemini}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ system_instruction: { parts: [{ text: systemPrompt }] }, contents: [{ role: 'user', parts: [{ text: userPrompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 512 } }),
        });
        if (res.ok) { const d = await res.json(); llmAnalysis = d.candidates?.[0]?.content?.parts?.[0]?.text || ''; llmProvider = 'Gemini'; }
        if (llmAnalysis) return buildResponse(staticIssues, llmAnalysis, llmProvider);
        failed.push('Gemini');
      } catch { failed.push('Gemini'); }
    }

    // SDK fallback
    try {
      const zai = await ZAI.create();
      const c = await zai.chat.completions.create({ messages: [{ role: 'assistant', content: systemPrompt }, { role: 'user', content: userPrompt }], thinking: { type: 'disabled' } });
      llmAnalysis = c.choices?.[0]?.message?.content || '';
      llmProvider = 'SDK';
      return buildResponse(staticIssues, llmAnalysis, llmProvider);
    } catch { /* all failed */ }

    // Static analysis only
    return buildResponse(staticIssues, '', '');

  } catch (error) {
    console.error('Analyze impact error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

function buildResponse(staticIssues: Array<{ type: string; severity: string; message: string }>, llmAnalysis: string, llmProvider: string) {
  const highCount = staticIssues.filter(i => i.severity === 'high').length;
  const mediumCount = staticIssues.filter(i => i.severity === 'medium').length;
  const lowCount = staticIssues.filter(i => i.severity === 'low').length;

  return NextResponse.json({
    success: true,
    staticIssues,
    llmAnalysis,
    llmProvider,
    totalIssues: staticIssues.length,
    highSeverity: highCount,
    mediumSeverity: mediumCount,
    lowSeverity: lowCount,
    overallRisk: highCount > 0 ? 'HIGH' : mediumCount > 2 ? 'MEDIUM' : 'LOW',
    summary: `Static analysis: ${staticIssues.length} issues (${highCount} high, ${mediumCount} medium, ${lowCount} low).${llmAnalysis ? ` LLM review: ${llmProvider}.` : ' No LLM available — static analysis only.'}`,
  });
}
