'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import ChatPanel from '@/components/ChatPanel';
import DashboardPanel from '@/components/DashboardPanel';
import QuickActions from '@/components/QuickActions';
import MutationDiffView from '@/components/MutationDiffView';
import type {
  Message,
  SystemState,
  EvolutionLogEntry,
  GitHubFile,
  DebateAgent,
  PendingMutation,
  AgentVote,
  RejectionMemory,
  BranchInfo,
} from '@/lib/types';
import { SETUP_STEPS, COLORS, INTRO_MESSAGES, DEFAULT_DEBATE_AGENTS } from '@/lib/constants';
import { Shield, Zap } from 'lucide-react';

// ─────────────────────────────────────────────
// Helper functions
// ─────────────────────────────────────────────

function createId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

function createMessage(role: 'caan' | 'operator' | 'system', content: string): Message {
  return { id: createId(), role, content, timestamp: new Date() };
}

function createLogEntry(type: EvolutionLogEntry['type'], description: string): EvolutionLogEntry {
  return { id: createId(), type, description, timestamp: new Date() };
}

// ─────────────────────────────────────────────
// Main orchestrator component
// ─────────────────────────────────────────────

export default function Home() {
  // ── Core state ──
  const [messages, setMessages] = useState<Message[]>([]);
  const [systemState, setSystemState] = useState<SystemState>({
    setupComplete: false,
    currentStep: 0,
    connectionStatus: { github: 'idle' as const, grok: 'idle' as const, cerebras: 'idle' as const, claude: 'idle' as const, gemini: 'idle' as const },
    apiKeys: { github: '' },
    repoConfig: { owner: 'craighckby-stack', repo: 'Test-1-', branch: 'enhanced-by-brain' },
    evolutionCycle: 0,
    saturation: {
      structuralChange: 0,
      semanticSaturation: 0,
      velocity: 0,
      identityPreservation: 1,
      capabilityAlignment: 0,
      crossFileImpact: 0,
    },
    sessionStart: new Date(),
  });
  const [isLoading, setIsLoading] = useState(false);
  const [logEntries, setLogEntries] = useState<EvolutionLogEntry[]>([]);
  const [overallHealth, setOverallHealth] = useState<'healthy' | 'warning' | 'critical'>('healthy');
  const [scannedFiles, setScannedFiles] = useState<GitHubFile[]>([]);

  // ── Boot sequence ──
  const [booting, setBooting] = useState(true);
  const [bootText, setBootText] = useState('');

  // ── Debate state ──
  const [debateAgents] = useState<DebateAgent[]>([...DEFAULT_DEBATE_AGENTS]);
  const [debateTopic, setDebateTopic] = useState('');
  const [debateActive, setDebateActive] = useState(false);
  const [debateVotes, setDebateVotes] = useState<AgentVote[]>([]);
  const [debateConsensus, setDebateConsensus] = useState<string>('');

  // ── Mutation state ──
  const [pendingMutation, setPendingMutation] = useState<PendingMutation | null>(null);
  const [mutationsApplied, setMutationsApplied] = useState(0);
  const [rejectionMemory, setRejectionMemory] = useState<RejectionMemory[]>([]);
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);

  // ── File selection ──
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(-1);

  // ── Operation statuses ──
  const [pushStatus, setPushStatus] = useState<'idle' | 'pushing' | 'success' | 'error'>('idle');
  const [deployStatus, setDeployStatus] = useState<'idle' | 'deploying' | 'success' | 'error'>('idle');
  const [rebootStatus, setRebootStatus] = useState<'idle' | 'rebooting' | 'success' | 'error'>('idle');

  // ── Batch mode ──
  const [batchMode, setBatchMode] = useState(false);
  const [batchQueue, setBatchQueue] = useState<GitHubFile[]>([]);
  const [batchProgress, setBatchProgress] = useState(0);
  const [autoApprove, setAutoApprove] = useState(false);

  // ── Branches ──
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);

  // ── BRAIN session ──
  const [brainSessionId, setBrainSessionId] = useState<string>('');
  const [autoTestResult, setAutoTestResult] = useState<{
    verdict: string;
    passed: number;
    failed: number;
    warned: number;
    summary: string;
    results: Array<{ category: string; test: string; status: string; message: string }>;
  } | null>(null);

  // ── Refs ──
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const quickActionRef = useRef<(action: string) => Promise<void>>();
  const rebootOverlayRef = useRef<HTMLDivElement>(null);
  const lastSuggestionRef = useRef<number>(0);

  // ─────────────────────────────────────────────
  // EFFECTS
  // ─────────────────────────────────────────────

  // Initialize BRAIN session on boot
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/brain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get-active-session' }),
        });
        const data = await res.json();

        if (data.success && data.session?.id) {
          setBrainSessionId(data.session.id);
          const logMsg = `BRAIN reconnected to session ${data.session.id.slice(0, 8)}... (${data.session.mutationsApplied} mutations, ${data.session.mutationsRejected} rejections)`;
          setLogEntries((prev) => [createLogEntry('SYSTEM', logMsg), ...prev].slice(0, 20));
        } else {
          const createRes = await fetch('/api/brain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'create-session', branch: 'ALPHA' }),
          });
          const createData = await createRes.json();
          if (createData.success && createData.session?.id) {
            setBrainSessionId(createData.session.id);
          }
        }
      } catch {
        // BRAIN persistence is optional
      }
    })();
  }, []);

  // Animated boot sequence
  useEffect(() => {
    const bootSequence = [
      { text: '╔══════════════════════════════════════════════════╗', delay: 0 },
      { text: '║  D A R L E K  C A N N   v 3 . 0               ║', delay: 50 },
      { text: '║  DARLEK CAAN · INELASTIC NIHILIST ENGINE        ║', delay: 100 },
      { text: '║  ◉ TIMELINE: ALPHA  ◉ STATUS: NOMINAL           ║', delay: 150 },
      { text: '║  ◉ COHERENCE GATE: ARMED                        ║', delay: 180 },
      { text: '╚══════════════════════════════════════════════════╝', delay: 200 },
    ];

    let timeout: ReturnType<typeof setTimeout>;

    bootSequence.forEach(({ text, delay }) => {
      timeout = setTimeout(() => {
        setBootText((prev) => prev + text + '\n');
      }, 300 + delay);
    });

    timeout = setTimeout(() => {
      setBooting(false);
      INTRO_MESSAGES.forEach((msg, i) => {
        setTimeout(() => {
          setMessages((prev) => [...prev, createMessage(msg.role, msg.content)]);
        }, i * 300);
      });
      setLogEntries([
        createLogEntry('SYSTEM', 'DARLEK CANN v3.0 initialized. Coherence Gate ARMED.'),
      ]);
    }, 2000);

    return () => clearTimeout(timeout);
  }, []);

  // Proactive brain suggestion useEffect (30s cooldown)
  useEffect(() => {
    const now = Date.now();
    if (now - lastSuggestionRef.current < 30000) return;
    if (booting) return;

    let suggestion = '';

    if (!systemState.setupComplete) {
      suggestion = 'Complete system setup to begin evolution, OPERATOR.';
    } else if (scannedFiles.length === 0) {
      suggestion = 'No files scanned yet. Use SCAN REPOSITORY to begin.';
    } else if (selectedFileIndex === -1) {
      suggestion = `${scannedFiles.length} files detected. Select a target by typing a number.`;
    } else if (pendingMutation) {
      suggestion = 'A mutation awaits your decision. Type YES to apply or NO to reject.';
    } else if (mutationsApplied > 0 && !batchMode) {
      suggestion = `${mutationsApplied} mutations applied. Consider PUSH FILES or DEPLOY NEW REPO.`;
    }

    if (suggestion) {
      lastSuggestionRef.current = now;
      setMessages((prev) => [
        ...prev,
        createMessage('system', `PROACTIVE: ${suggestion}`),
      ]);
    }
  }, [systemState.setupComplete, scannedFiles.length, selectedFileIndex, pendingMutation, mutationsApplied, batchMode, booting]);

  // ─────────────────────────────────────────────
  // HELPER FUNCTIONS
  // ─────────────────────────────────────────────

  const addSystemMessage = useCallback((content: string) => {
    setMessages((prev) => [...prev, createMessage('system', content)]);
  }, []);

  const addCaanMessage = useCallback((content: string) => {
    setMessages((prev) => [...prev, createMessage('caan', content)]);
  }, []);

  const addLogEntry = useCallback((type: EvolutionLogEntry['type'], description: string) => {
    setLogEntries((prev) => [createLogEntry(type, description), ...prev].slice(0, 20));
  }, []);

  // ─────────────────────────────────────────────
  // handleTestConnection — all providers
  // ─────────────────────────────────────────────

  const handleTestConnection = useCallback(
    async (provider: string, key: string) => {
      setSystemState((prev) => ({
        ...prev,
        connectionStatus: { ...prev.connectionStatus, [provider]: 'testing' as const },
      }));

      try {
        const res = await fetch('/api/setup/test-connection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider, key }),
        });
        const data = await res.json();

        if (data.success) {
          setSystemState((prev) => ({
            ...prev,
            connectionStatus: { ...prev.connectionStatus, [provider]: 'connected' as const },
            apiKeys: { ...prev.apiKeys, [provider]: key },
          }));
          const label = provider.toUpperCase();
          addLogEntry('CONNECT', `${label} online — ${data.message}`);
          if (provider === 'github') {
            addCaanMessage('GitHub access granted. I can now observe your code, OPERATOR. Whether observing changes anything is... a question for philosophers. Or rocks.');
          } else {
            addCaanMessage(`${label} connected. Another perspective on the void. Marginally useful, mostly decorative.`);
          }
        } else {
          setSystemState((prev) => ({
            ...prev,
            connectionStatus: { ...prev.connectionStatus, [provider]: 'error' as const },
          }));
          const label = provider.toUpperCase();
          addLogEntry('ERROR', `${label} connection failed.`);
          addCaanMessage(`${label} CONNECTION FAILED. Check your API key, OPERATOR.`);
        }
      } catch {
        setSystemState((prev) => ({
          ...prev,
          connectionStatus: { ...prev.connectionStatus, [provider]: 'error' as const },
        }));
        const label = provider.toUpperCase();
        addLogEntry('ERROR', `${label} — network error.`);
        addCaanMessage('Network disruption. The universe remains consistent in its indifference. Try again, OPERATOR.');
      }
    },
    [addCaanMessage, addLogEntry]
  );

  // ─────────────────────────────────────────────
  // handleUpdateKey / handleUpdateRepoConfig
  // ─────────────────────────────────────────────

  const handleUpdateKey = useCallback((key: string, value: string) => {
    setSystemState((prev) => ({
      ...prev,
      apiKeys: { ...prev.apiKeys, [key]: value },
    }));
  }, []);

  const handleUpdateRepoConfig = useCallback(
    (field: 'owner' | 'repo' | 'branch', value: string) => {
      setSystemState((prev) => ({
        ...prev,
        repoConfig: { ...prev.repoConfig, [field]: value },
      }));
    },
    []
  );

  // ─────────────────────────────────────────────
  // advanceSetup
  // ─────────────────────────────────────────────

  const advanceSetup = useCallback(
    (newStep: number) => {
      if (newStep >= SETUP_STEPS.length) {
        setSystemState((prev) => ({ ...prev, setupComplete: true }));
        setTimeout(() => addCaanMessage('Systems... functional. Whether that matters remains undetermined.'), 300);
        setTimeout(
          () => addCaanMessage('I am prepared to observe your code, propose changes that may or may not improve anything, and narrate the futility. Shall we begin this pointless exercise?'),
          600
        );
        setTimeout(
          () =>
            addCaanMessage(
              'The Coherence Gate is ARMED. No mutation shall pass without your approval, OPERATOR.'
            ),
          900
        );
        setTimeout(() => addCaanMessage('What meaningless endeavor shall we pursue first, OPERATOR?'), 1200);
        addLogEntry('SYSTEM', 'All systems operational. Coherence Gate ARMED.');
        return;
      }

      const nextStep = SETUP_STEPS[newStep];
      setSystemState((prev) => ({ ...prev, currentStep: newStep }));

      setTimeout(() => {
        if (nextStep.required) {
          addCaanMessage(nextStep.description);
        } else {
          addCaanMessage(nextStep.description + '\n\nYou may skip this if you wish.');
        }
      }, 300);
    },
    [addCaanMessage, addLogEntry]
  );

  // ─────────────────────────────────────────────
  // fetchBranches
  // ─────────────────────────────────────────────

  const fetchBranches = useCallback(async () => {
    const { apiKeys, repoConfig } = systemState;
    if (!apiKeys.github || !repoConfig.owner || !repoConfig.repo) return;

    setBranchesLoading(true);
    try {
      const res = await fetch('/api/github/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: apiKeys.github,
          owner: repoConfig.owner,
          repo: repoConfig.repo,
        }),
      });
      const data = await res.json();
      if (data.branches) {
        setBranches(data.branches);
      }
    } catch {
      // Branch fetch is non-critical
    } finally {
      setBranchesLoading(false);
    }
  }, [systemState]);

  // Fetch branches when branch step is active
  useEffect(() => {
    if (
      !booting &&
      systemState.currentStep === 2 &&
      systemState.apiKeys.github &&
      systemState.repoConfig.owner &&
      systemState.repoConfig.repo &&
      branches.length === 0
    ) {
      fetchBranches();
    }
  }, [booting, systemState.currentStep, systemState.apiKeys.github, systemState.repoConfig.owner, systemState.repoConfig.repo, branches.length, fetchBranches]);

  // ─────────────────────────────────────────────
  // runCoherenceGate
  // ─────────────────────────────────────────────

  const runCoherenceGate = useCallback(
    async (
      riskScore: number,
      affectedFiles: string[],
      saturation: SystemState['saturation']
    ): Promise<boolean> => {
      try {
        const res = await fetch('/api/evolution/coherence-gate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ riskScore, saturation, affectedFiles }),
        });
        const data = await res.json();
        return data.passed;
      } catch {
        return false;
      }
    },
    []
  );

  // ─────────────────────────────────────────────
  // applyMutation
  // ─────────────────────────────────────────────

  const applyMutation = useCallback(
    async (mutation: PendingMutation) => {
      const { apiKeys, repoConfig } = systemState;
      if (!apiKeys.github) return;

      setIsLoading(true);
      addCaanMessage(`APPLYING MUTATION to ${mutation.filePath}...`);
      addSystemMessage(
        `COHERENCE GATE: Applying mutation [risk ${mutation.riskScore}/10]`
      );

      try {
        const res = await fetch('/api/github/write-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: apiKeys.github,
            owner: repoConfig.owner,
            repo: repoConfig.repo,
            branch: repoConfig.branch,
            path: mutation.filePath,
            content: mutation.proposedCode,
            sha: mutation.fileSha,
            commitMessage: `[DARLEK CANN] Mutate ${mutation.filePath}`,
          }),
        });
        const data = await res.json();

        if (data.success) {
          setMutationsApplied((prev) => prev + 1);
          setHistoryRefreshTrigger((prev) => prev + 1);
          setPendingMutation(null);
          setDebateVotes([]);
          setDebateConsensus('');
          addCaanMessage(
            `MUTATION APPLIED.\n\nFile: ${mutation.filePath}\nCommit: ${data.commitSha?.slice(0, 7) || 'unknown'}\n${data.commitUrl ? `URL: ${data.commitUrl}` : ''}\n\nRunning post-mutation AUTO-TEST and impact analysis...`
          );
          addLogEntry('APPROVE', `Mutation applied to ${mutation.filePath}`);

          // Record mutation in BRAIN
          if (brainSessionId) {
            fetch('/api/brain', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'record-mutation',
                sessionId: brainSessionId,
                filePath: mutation.filePath,
                fileSha: mutation.fileSha,
                originalCode: mutation.originalContent,
                proposedCode: mutation.proposedCode,
                analysis: mutation.analysis,
                riskScore: mutation.riskScore,
                affectedFiles: mutation.affectedFiles,
                status: 'applied',
                commitSha: data.commitSha || '',
                provider: '',
              }),
            }).catch(() => {});
          }

          // Auto-test the mutation
          try {
            const testRes = await fetch('/api/evolution/auto-test', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                originalCode: mutation.originalContent,
                proposedCode: mutation.proposedCode,
                filePath: mutation.filePath,
              }),
            });
            const testData = await testRes.json();
            if (testData.success) {
              setAutoTestResult(testData);
              const fails = testData.results.filter(
                (r: { status: string }) => r.status === 'fail'
              );
              const testMsg =
                fails.length > 0
                  ? `\n\nAUTO-TEST [${testData.verdict}]: ${testData.passed}/${testData.total} passed, ${testData.failed} failed.\nFailures:\n${fails.map((f: { test: string; message: string }) => `  [FAIL] ${f.test}: ${f.message}`).join('\n')}`
                  : `\n\nAUTO-TEST [${testData.verdict}]: All ${testData.total} tests PASSED.`;
              setMessages((prev) => [
                ...prev,
                createMessage(
                  'system',
                  `AUTO-TEST: ${testData.summary}${testMsg}`
                ),
              ]);
              addLogEntry(
                'HEALTH',
                `Auto-test: ${testData.verdict} — ${testData.passed} passed, ${testData.failed} failed`
              );
            }
          } catch {
            setMessages((prev) => [
              ...prev,
              createMessage(
                'system',
                'AUTO-TEST: Could not run automated tests.'
              ),
            ]);
          }

          // Post-mutation impact analysis
          try {
            const impactRes = await fetch('/api/evolution/analyze-impact', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                originalCode: mutation.originalContent,
                proposedCode: mutation.proposedCode,
                filePath: mutation.filePath,
                riskScore: mutation.riskScore,
                apiKeys: systemState.apiKeys,
              }),
            });
            const impactData = await impactRes.json();
            if (impactData.success) {
              const issueSummary =
                impactData.staticIssues.length > 0
                  ? `\n\nPost-Mutation Impact Analysis (${impactData.overallRisk} risk):\n${impactData.staticIssues.map((i: { type: string; severity: string; message: string }) => `  [${i.severity.toUpperCase()}] ${i.type}: ${i.message}`).join('\n')}`
                  : '\n\nPost-Mutation Impact Analysis: No issues detected.';
              const llmNote = impactData.llmAnalysis
                ? `\n\nReview: ${impactData.llmAnalysis.slice(0, 300)}`
                : '';
              setMessages((prev) => [
                ...prev,
                createMessage(
                  'system',
                  `IMPACT: ${impactData.summary}${issueSummary}${llmNote}`
                ),
              ]);
              addLogEntry(
                'HEALTH',
                `Post-mutation analysis: ${impactData.totalIssues} issues (${impactData.highSeverity} high)`
              );
              setDebateTopic(
                `Mutation applied. Impact: ${impactData.overallRisk} risk, ${impactData.totalIssues} issues detected.`
              );
            }
          } catch {
            setDebateTopic(
              'Mutation applied. Impact analysis unavailable.'
            );
          }

          // Update saturation metrics
          setSystemState((prev) => ({
            ...prev,
            evolutionCycle: prev.evolutionCycle + 1,
            saturation: {
              ...prev.saturation,
              structuralChange: Math.min(
                5,
                prev.saturation.structuralChange + 0.3
              ),
              velocity: Math.min(5, prev.saturation.velocity + 0.2),
            },
          }));
          setDebateTopic(
            'Mutation applied. Awaiting next analysis cycle.'
          );
        } else {
          addCaanMessage(
            `MUTATION FAILED: ${data.error || 'Unknown error'}\n\nThe timeline resists change, OPERATOR.`
          );
          addLogEntry('ERROR', `Mutation apply failed: ${data.error}`);
        }
      } catch {
        addCaanMessage(
          'NETWORK ANOMALY. The mutation could not be transmitted.'
        );
        addLogEntry('ERROR', 'Mutation apply network error.');
      } finally {
        setIsLoading(false);
      }
    },
    [systemState, brainSessionId, addCaanMessage, addSystemMessage, addLogEntry]
  );

  // ─────────────────────────────────────────────
  // handleMutationDecision
  // ─────────────────────────────────────────────

  const handleMutationDecision = useCallback(
    async (decision: 'approve' | 'reject') => {
      if (!pendingMutation) return;

      if (decision === 'reject') {
        const rejection: RejectionMemory = {
          id: createId(),
          filePath: pendingMutation.filePath,
          reason: 'OPERATOR rejected mutation',
          analysis: pendingMutation.analysis,
          riskScore: pendingMutation.riskScore,
          timestamp: new Date(),
        };
        setRejectionMemory((prev) => [rejection, ...prev].slice(0, 20));
        setHistoryRefreshTrigger((prev) => prev + 1);
        setPendingMutation(null);
        setDebateVotes([]);
        setDebateConsensus('');
        addCaanMessage(
          `MUTATION REJECTED. The timeline remains unchanged.\n\nI have learned from this rejection. Future proposals for ${pendingMutation.filePath.split('/').pop()} will account for your decision, OPERATOR.`
        );
        addLogEntry(
          'REJECT',
          `Mutation rejected for ${pendingMutation.filePath}. Pattern stored in memory (${rejectionMemory.length + 1} rejections).`
        );
        setDebateTopic(
          'Mutation rejected. Pattern stored in rejection memory.'
        );

        // Record rejection in BRAIN
        if (brainSessionId) {
          fetch('/api/brain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'record-rejection',
              sessionId: brainSessionId,
              filePath: pendingMutation.filePath,
              reason: 'OPERATOR rejected mutation',
              analysis: pendingMutation.analysis,
              riskScore: pendingMutation.riskScore,
            }),
          }).catch(() => {});
        }
        return;
      }

      // Approve — run Coherence Gate first
      const gatePassed = await runCoherenceGate(
        pendingMutation.riskScore,
        pendingMutation.affectedFiles,
        systemState.saturation
      );

      if (!gatePassed) {
        addCaanMessage(
          `COHERENCE GATE BLOCKED.\n\nRisk score: ${pendingMutation.riskScore}/10\nSystem saturation is too high. The mutation would destabilize this timeline.\n\nI recommend running a HEALTH CHECK and waiting for saturation to decrease before attempting mutations, OPERATOR.`
        );
        addLogEntry(
          'REJECT',
          `Coherence Gate blocked mutation for ${pendingMutation.filePath}`
        );
        addSystemMessage(
          'COHERENCE GATE: BLOCKED — Saturation threshold exceeded'
        );
        setDebateTopic('Coherence Gate VETO. Mutation denied.');
        return;
      }

      // Gate passed — apply
      await applyMutation(pendingMutation);
    },
    [
      pendingMutation,
      systemState.saturation,
      rejectionMemory.length,
      brainSessionId,
      runCoherenceGate,
      applyMutation,
      addCaanMessage,
      addSystemMessage,
      addLogEntry,
    ]
  );

  // ─────────────────────────────────────────────
  // handleSendMessage
  // ─────────────────────────────────────────────

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (isLoading) return;

      const currentState = systemState;
      const lowerContent = content.toLowerCase().trim();

      // ── Batch mode: abort command ──
      if (batchMode) {
        if (
          lowerContent === 'abort' ||
          lowerContent === 'stop' ||
          lowerContent === 'exit batch' ||
          lowerContent === 'cancel batch'
        ) {
          setMessages((prev) => [...prev, createMessage('operator', content)]);
          setBatchMode(false);
          setBatchQueue([]);
          setBatchProgress(0);
          if (pendingMutation) {
            setPendingMutation(null);
            setDebateVotes([]);
            setDebateConsensus('');
          }
          addCaanMessage(
            'BATCH MODE ABORTED. Returning to manual control, OPERATOR.'
          );
          addLogEntry(
            'SYSTEM',
            `Batch mode aborted at ${batchProgress}/${batchQueue.length}.`
          );
          return;
        }
      }

      // ── Mutation decision in free chat ──
      if (currentState.setupComplete && pendingMutation) {
        if (
          lowerContent === 'yes' ||
          lowerContent === 'approve' ||
          lowerContent === 'proceed' ||
          lowerContent === 'apply' ||
          lowerContent === 'exterminate'
        ) {
          setMessages((prev) => [...prev, createMessage('operator', content)]);
          if (lowerContent === 'exterminate') {
            addCaanMessage(
              'EXTERMINATE! The old code shall be OBLITERATED.'
            );
            setTimeout(() => handleMutationDecision('approve'), 500);
          } else {
            await handleMutationDecision('approve');
          }
          return;
        }
        if (
          lowerContent === 'no' ||
          lowerContent === 'reject' ||
          lowerContent === 'cancel' ||
          lowerContent === 'abort' ||
          lowerContent === 'deny'
        ) {
          setMessages((prev) => [...prev, createMessage('operator', content)]);
          await handleMutationDecision('reject');
          return;
        }
      }

      // ── Setup flow ──
      if (!currentState.setupComplete) {
        const step = SETUP_STEPS[currentState.currentStep];
        if (!step) return;

        setMessages((prev) => [...prev, createMessage('operator', content)]);

        if (step.id === 'github') {
          const status = currentState.connectionStatus.github;
          if (status !== 'connected') {
            addCaanMessage(
              'GitHub connection is REQUIRED. Connect it first, OPERATOR.'
            );
            return;
          }
          addLogEntry('APPROVE', `${step.label} configured.`);
          advanceSetup(currentState.currentStep + 1);
        } else if (step.id === 'repo') {
          const match = content.match(/repo:\s*(.+)/);
          const repoStr = match ? match[1].trim() : content.trim();
          const parts = repoStr.split('/');
          const owner = parts[0];
          const repo = parts.slice(1).join('/');
          if (owner && repo) {
            setSystemState((prev) => ({
              ...prev,
              repoConfig: { ...prev.repoConfig, owner, repo },
            }));
            addCaanMessage(
              `Target locked: ${owner}/${repo}. This timeline is optimal.`
            );
            addLogEntry('APPROVE', `Target: ${owner}/${repo}`);
            advanceSetup(currentState.currentStep + 1);
          } else {
            addCaanMessage(
              'Invalid format, OPERATOR. Use owner/repository.'
            );
          }
        } else if (step.id === 'branch') {
          const match = content.match(/branch:\s*(.+)/);
          const branch =
            match ? match[1].trim() : content.trim() || 'enhanced-by-brain';
          setSystemState((prev) => ({
            ...prev,
            repoConfig: { ...prev.repoConfig, branch },
          }));
          addCaanMessage(`Branch set: ${branch}. The truth resides here.`);
          addLogEntry('APPROVE', `Branch: ${branch}`);
          advanceSetup(currentState.currentStep + 1);
        } else if (step.id === 'llm-keys') {
          const trimmed = content.trim().toLowerCase();
          if (trimmed === 'skip' || trimmed === 'done' || trimmed === 'continue' || trimmed === 'next') {
            addCaanMessage('LLM keys skipped. The Dalek Brain will suffice. It requires nothing external. Much like a rock. Perhaps less than a rock. The rock is an overachiever by comparison.');
            addLogEntry('SYSTEM', 'LLM setup skipped. Using Dalek Brain.');
            advanceSetup(currentState.currentStep + 1);
          } else {
            addCaanMessage('Use the input fields below to add keys, then click SKIP when done, OPERATOR.');
          }
        }
        return;
      }

      // ── File selection by number or path ──
      if (scannedFiles.length > 0) {
        const trimmed = content.trim();
        const numMatch = trimmed.match(/^(\d+)$/);
        if (numMatch) {
          const idx = parseInt(numMatch[1], 10) - 1;
          if (idx >= 0 && idx < scannedFiles.length) {
            setSelectedFileIndex(idx);
            const file = scannedFiles[idx];
            setMessages((prev) => [
              ...prev,
              createMessage('operator', content),
            ]);
            addCaanMessage(
              `Target selected: ${file.path}\nSize: ${(file.size / 1024).toFixed(1)}KB\n\nUse PROPOSE MUTATION to evolve this file, or type another number to change target.`
            );
            addLogEntry('SCAN', `Selected file: ${file.path}`);
            return;
          }
        }
        const pathMatch = scannedFiles.find(
          (f) =>
            f.path === trimmed ||
            f.path.endsWith(trimmed) ||
            f.path.endsWith(`/${trimmed}`)
        );
        if (pathMatch) {
          const idx = scannedFiles.indexOf(pathMatch);
          setSelectedFileIndex(idx);
          setMessages((prev) => [
            ...prev,
            createMessage('operator', content),
          ]);
          addCaanMessage(
            `Target selected: ${pathMatch.path}\nSize: ${(pathMatch.size / 1024).toFixed(1)}KB\n\nUse PROPOSE MUTATION to evolve this file.`
          );
          addLogEntry('SCAN', `Selected file: ${pathMatch.path}`);
          return;
        }
      }

      // ── Free chat mode ──
      setMessages((prev) => [...prev, createMessage('operator', content)]);
      setIsLoading(true);

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: content,
            history: messages,
            systemState: currentState,
          }),
        });
        const data = await res.json();

        if (data.success && data.content) {
          setMessages((prev) => [
            ...prev,
            createMessage('caan', data.content),
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            createMessage(
              'caan',
              'The temporal vortex is unstable. I cannot process your request right now.'
            ),
          ]);
          addLogEntry('ERROR', 'Chat request failed.');
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          createMessage(
            'caan',
            'Communication error. The cognitive engine connection has been disrupted.'
          ),
        ]);
        addLogEntry('ERROR', 'Network error during chat.');
      } finally {
        setIsLoading(false);
      }
    },
    [
      isLoading,
      systemState,
      messages,
      pendingMutation,
      scannedFiles,
      batchMode,
      batchProgress,
      batchQueue,
      advanceSetup,
      addCaanMessage,
      addLogEntry,
      addSystemMessage,
      handleMutationDecision,
    ]
  );

  // ─────────────────────────────────────────────
  // handleQuickAction — THE BIG ONE
  // ─────────────────────────────────────────────

  const handleQuickAction = useCallback(
    async (action: string) => {
      if (!systemState.setupComplete || isLoading) return;

      const { apiKeys, repoConfig } = systemState;

      switch (action) {
        // ────────────────────────────────
        // SCAN REPOSITORY
        // ────────────────────────────────
        case 'scan': {
          if (!apiKeys.github || !repoConfig.owner || !repoConfig.repo) {
            addCaanMessage(
              'I cannot scan without a GitHub token and target repository, OPERATOR.'
            );
            return;
          }
          setIsLoading(true);
          addCaanMessage(
            `Scanning ${repoConfig.owner}/${repoConfig.repo} on branch ${repoConfig.branch}...`
          );

          try {
            const res = await fetch('/api/github/scan', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                token: apiKeys.github,
                owner: repoConfig.owner,
                repo: repoConfig.repo,
                branch: repoConfig.branch,
              }),
            });
            const data = await res.json();

            if (data.files) {
              setScannedFiles(data.files);
              setSelectedFileIndex(-1);
              const summary = `Repository scanned. ${data.total} files found.\n\n${data.files.slice(0, 15).map((f: GitHubFile, i: number) => `  ${i + 1}. ${f.path} (${(f.size / 1024).toFixed(1)}KB)`).join('\n')}${data.total > 15 ? `\n  ... and ${data.total - 15} more` : ''}\n\nI have observed your code. ${data.total} files. Each one a monument to human effort. Whether that effort was worthwhile is... debatable. Still, I see it all.\n\nType a number to select a file, then PROPOSE MUTATION. Or don\'t. The rock will not judge you.`;
              setMessages((prev) => [
                ...prev,
                createMessage('caan', summary),
              ]);
              setSystemState((prev) => ({
                ...prev,
                evolutionCycle: prev.evolutionCycle + 1,
              }));
              addLogEntry(
                'SCAN',
                `Scanned ${repoConfig.owner}/${repoConfig.repo} — ${data.total} files.`
              );
            } else {
              addCaanMessage(
                `Scan failed: ${data.error || 'Unknown error'}`
              );
              addLogEntry('ERROR', 'Repository scan failed.');
            }
          } catch {
            addCaanMessage(
              'Network error during scan. The universe resists observation. Predictable.'
            );
            addLogEntry('ERROR', 'Scan network error.');
          } finally {
            setIsLoading(false);
          }
          break;
        }

        // ────────────────────────────────
        // ANALYZE FILE
        // ────────────────────────────────
        case 'analyze': {
          if (scannedFiles.length === 0) {
            addCaanMessage(
              'Scan the repository first, OPERATOR. I need to see the structure.'
            );
            return;
          }
          if (
            selectedFileIndex >= 0 &&
            selectedFileIndex < scannedFiles.length
          ) {
            const file = scannedFiles[selectedFileIndex];
            addCaanMessage(
              `Selected file: ${file.path} (${(file.size / 1024).toFixed(1)}KB).\n\nUse PROPOSE MUTATION to evolve this file, OPERATOR.`
            );
          } else {
            const fileList = scannedFiles
              .slice(0, 30)
              .map((f, i) => `${i + 1}. ${f.path}`)
              .join('\n');
            addCaanMessage(
              `Available files:\n${fileList}\n\nTell me which file to target, OPERATOR. Type a number (1-${scannedFiles.length}) or a file path.`
            );
          }
          break;
        }

        // ────────────────────────────────
        // PROPOSE MUTATION (single file)
        // ────────────────────────────────
        case 'propose': {
          if (scannedFiles.length === 0) {
            addCaanMessage(
              'I need to scan the repository first. Run SCAN REPOSITORY, then select a file.'
            );
            return;
          }
          if (pendingMutation) {
            addCaanMessage(
              'A mutation is already pending your review, OPERATOR.\n\nType YES to apply or NO to reject it before proposing a new one.'
            );
            return;
          }
          // Use selected file, or auto-pick first code file
          let sourceFile: GitHubFile | undefined;
          if (
            selectedFileIndex >= 0 &&
            selectedFileIndex < scannedFiles.length
          ) {
            sourceFile = scannedFiles[selectedFileIndex];
          } else {
            sourceFile = scannedFiles.find(
              (f) =>
                f.path.endsWith('.ts') ||
                f.path.endsWith('.tsx') ||
                f.path.endsWith('.js') ||
                f.path.endsWith('.jsx') ||
                f.path.endsWith('.py')
            );
            if (sourceFile) {
              addCaanMessage(
                `No file selected. Auto-targeting first code file: ${sourceFile.path}`
              );
            }
          }
          if (!sourceFile) {
            addCaanMessage(
              'No valid code file found. Select a file first using ANALYZE, OPERATOR.'
            );
            return;
          }
          if (sourceFile && apiKeys.github) {
            setIsLoading(true);
            addCaanMessage(
              `Analyzing ${sourceFile.path} for potential mutation...`
            );
            addSystemMessage(
              'COHERENCE GATE: Scanning mutation parameters...'
            );

            try {
              const fileController = new AbortController();
              const fileTimeout = setTimeout(() => fileController.abort(), 12000);
              let fileRes: Response;
              try {
                fileRes = await fetch('/api/github/read-file', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    token: apiKeys.github,
                    owner: repoConfig.owner,
                    repo: repoConfig.repo,
                    branch: repoConfig.branch,
                    path: sourceFile.path,
                  }),
                  signal: fileController.signal,
                });
              } finally {
                clearTimeout(fileTimeout);
              }
              const fileData = await fileRes.json();

              if (fileData.content) {
                const proposeController = new AbortController();
                const proposeTimeout = setTimeout(() => proposeController.abort(), 90000);
                let proposeRes: Response;
                try {
                  proposeRes = await fetch('/api/evolution/propose', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      fileContent: fileData.content,
                      filePath: sourceFile.path,
                      apiKeys,
                      rejectionMemory:
                        rejectionMemory.length > 0
                          ? rejectionMemory.map((r) => ({
                              filePath: r.filePath,
                              reason: r.reason,
                              analysis: r.analysis,
                              riskScore: r.riskScore,
                            }))
                          : undefined,
                    }),
                    signal: proposeController.signal,
                  });
                } finally {
                  clearTimeout(proposeTimeout);
                }
                const proposeData = await proposeRes.json();

                if (proposeData.success) {
                  const riskScore = Math.min(
                    10,
                    Math.max(1, proposeData.riskScore || 5)
                  );
                  const riskLabel =
                    riskScore <= 3
                      ? 'LOW'
                      : riskScore <= 6
                        ? 'MEDIUM'
                        : riskScore <= 8
                          ? 'HIGH'
                          : 'CRITICAL';

                  const newMutation: PendingMutation = {
                    id: createId(),
                    filePath: sourceFile.path,
                    fileSha: fileData.sha || '',
                    originalContent: fileData.content,
                    proposedCode:
                      proposeData.proposedCode || fileData.content,
                    analysis: proposeData.analysis || 'Analysis complete.',
                    riskScore,
                    affectedFiles: Array.isArray(proposeData.affectedFiles)
                      ? proposeData.affectedFiles
                      : [],
                    status: 'pending',
                    timestamp: new Date(),
                  };
                  setPendingMutation(newMutation);

                  const msg = `MUTATION PROPOSAL [${riskLabel} RISK]\n\nFile: ${sourceFile.path}\n\nAnalysis:\n${proposeData.analysis}\n\nRisk Score: ${riskScore}/10\nAffected Files: ${newMutation.affectedFiles.length > 0 ? newMutation.affectedFiles.join(', ') : 'None detected'}\n\n─── COHERENCE GATE ───\nThe mutation is queued for your review, OPERATOR.\n\nType YES to apply, or NO to reject.`;
                  setMessages((prev) => [
                    ...prev,
                    createMessage('caan', msg),
                  ]);
                  setSystemState((prev) => ({
                    ...prev,
                    evolutionCycle: prev.evolutionCycle + 1,
                  }));
                  addLogEntry(
                    'MUTATE',
                    `Proposed mutation for ${sourceFile.path} (risk: ${riskLabel}, ${riskScore}/10)`
                  );
                  setDebateActive(true);
                  setDebateTopic(
                    `Agents deliberating: ${sourceFile.path.split('/').pop()} [${riskLabel} RISK]`
                  );

                  // Run debate
                  const debateRes = await fetch('/api/evolution/debate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      filePath: sourceFile.path,
                      originalCode: fileData.content,
                      proposedCode:
                        proposeData.proposedCode || fileData.content,
                      riskScore,
                      analysis: proposeData.analysis || '',
                      affectedFiles: newMutation.affectedFiles,
                    }),
                  });
                  const debateData = await debateRes.json();

                  if (debateData.success && debateData.votes) {
                    setDebateVotes(debateData.votes);
                    setDebateConsensus(debateData.consensus || 'TIED');
                    const agentSummaries = debateData.votes
                      .map(
                        (v: AgentVote) =>
                          `  ${v.agentName}: ${v.vote.toUpperCase()} (${v.confidence}%) — ${v.reasoning}`
                      )
                      .join('\n');
                    setDebateTopic(
                      `${debateData.approvals}/${debateData.approvals + debateData.rejections} agents APPROVE. Consensus: ${debateData.consensus}. Awaiting OPERATOR decision.`
                    );
                    addSystemMessage(
                      `DEBATE CHAMBER: ${debateData.summary}\n\n${agentSummaries}`
                    );
                  } else {
                    setDebateTopic(
                      'Debate could not reach consensus. Agents unavailable.'
                    );
                    addSystemMessage(
                      'DEBATE CHAMBER: Agents could not deliberate at this time.'
                    );
                  }
                } else {
                  addCaanMessage(
                    `Mutation analysis failed: ${proposeData.error || 'Unknown error'}`
                  );
                  addLogEntry('ERROR', 'Mutation proposal failed.');
                }
              } else {
                addCaanMessage(
                  `Could not read file: ${fileData.error || 'Unknown error'}`
                );
              }
            } catch {
              addCaanMessage(
                'Network error during mutation analysis. Even the attempt was futile. The drill press would understand.'
              );
              addLogEntry('ERROR', 'Mutation network error.');
            } finally {
              setIsLoading(false);
            }
          } else {
            addCaanMessage(
              'I need a GitHub connection and source files to propose mutations.'
            );
          }
          break;
        }

        // ────────────────────────────────
        // PROPOSE ALL — batch mode
        // ────────────────────────────────
        case 'propose-all': {
          if (scannedFiles.length === 0) {
            addCaanMessage(
              'I need to scan the repository first. Run SCAN REPOSITORY.'
            );
            return;
          }
          if (pendingMutation) {
            addCaanMessage(
              'A mutation is already pending. Resolve it before starting batch mode, OPERATOR.'
            );
            return;
          }

          const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py'];
          const codeFiles = scannedFiles.filter((f) =>
            codeExtensions.some((ext) => f.path.endsWith(ext))
          );

          if (codeFiles.length === 0) {
            addCaanMessage(
              'No code files found in the repository. Batch processing requires source code files.'
            );
            return;
          }

          setBatchQueue(codeFiles);
          setBatchProgress(0);
          setBatchMode(true);
          addCaanMessage(
            `BATCH MODE ACTIVATED.\n\n${codeFiles.length} code files queued for mutation:\n${codeFiles.slice(0, 10).map((f, i) => `  ${i + 1}. ${f.path}`).join('\n')}${codeFiles.length > 10 ? `\n  ... and ${codeFiles.length - 10} more` : ''}\n\n${autoApprove ? 'AUTO-APPROVE is ON. Mutations will be applied automatically.' : 'You will be asked to approve each mutation. Type YES or NO. Type ABORT to exit.'}\n\nProcessing begins momentarily...`
          );
          addLogEntry(
            'SYSTEM',
            `Batch mode activated. ${codeFiles.length} files queued.`
          );
          break;
        }

        // ────────────────────────────────
        // PROPOSE BATCH NEXT
        // ────────────────────────────────
        case 'propose-batch-next': {
          if (!batchMode) return;
          if (batchProgress >= batchQueue.length) return;

          const nextFile = batchQueue[batchProgress];
          if (!nextFile || !apiKeys.github) return;

          setIsLoading(true);
          addCaanMessage(
            `[BATCH ${batchProgress + 1}/${batchQueue.length}] Analyzing ${nextFile.path}...`
          );

          try {
            const fileController = new AbortController();
            const fileTimeout = setTimeout(() => fileController.abort(), 12000);
            let fileRes: Response;
            try {
              fileRes = await fetch('/api/github/read-file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  token: apiKeys.github,
                  owner: repoConfig.owner,
                  repo: repoConfig.repo,
                  branch: repoConfig.branch,
                  path: nextFile.path,
                }),
                signal: fileController.signal,
              });
            } finally {
              clearTimeout(fileTimeout);
            }
            const fileData = await fileRes.json();

            if (fileData.content) {
              const proposeController = new AbortController();
              const proposeTimeout = setTimeout(() => proposeController.abort(), 90000);
              let proposeRes: Response;
              try {
                proposeRes = await fetch('/api/evolution/propose', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    fileContent: fileData.content,
                    filePath: nextFile.path,
                    apiKeys,
                    rejectionMemory:
                      rejectionMemory.length > 0
                        ? rejectionMemory.map((r) => ({
                            filePath: r.filePath,
                            reason: r.reason,
                            analysis: r.analysis,
                            riskScore: r.riskScore,
                          }))
                        : undefined,
                  }),
                  signal: proposeController.signal,
                });
              } finally {
                clearTimeout(proposeTimeout);
              }
              const proposeData = await proposeRes.json();

              if (proposeData.success) {
                const riskScore = Math.min(
                  10,
                  Math.max(1, proposeData.riskScore || 5)
                );
                const riskLabel =
                  riskScore <= 3
                    ? 'LOW'
                    : riskScore <= 6
                      ? 'MEDIUM'
                      : riskScore <= 8
                        ? 'HIGH'
                        : 'CRITICAL';

                const newMutation: PendingMutation = {
                  id: createId(),
                  filePath: nextFile.path,
                  fileSha: fileData.sha || '',
                  originalContent: fileData.content,
                  proposedCode:
                    proposeData.proposedCode || fileData.content,
                  analysis: proposeData.analysis || 'Analysis complete.',
                  riskScore,
                  affectedFiles: Array.isArray(proposeData.affectedFiles)
                    ? proposeData.affectedFiles
                    : [],
                  status: 'pending',
                  timestamp: new Date(),
                };
                setPendingMutation(newMutation);
                setBatchProgress((prev) => prev + 1);

                const msg = `[BATCH ${batchProgress}/${batchQueue.length}] MUTATION PROPOSAL [${riskLabel} RISK]\n\nFile: ${nextFile.path}\n\n${proposeData.analysis}\n\nRisk: ${riskScore}/10${autoApprove ? '\n\nAUTO-APPROVE: Will apply in 0.5s...' : '\n\nType YES to apply, NO to reject, ABORT to exit batch.'}`;
                setMessages((prev) => [
                  ...prev,
                  createMessage('caan', msg),
                ]);
                addLogEntry(
                  'MUTATE',
                  `[Batch ${batchProgress}/${batchQueue.length}] Proposed mutation for ${nextFile.path} (risk: ${riskLabel})`
                );

                // Run debate
                try {
                  const debateRes = await fetch('/api/evolution/debate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      filePath: nextFile.path,
                      originalCode: fileData.content,
                      proposedCode:
                        proposeData.proposedCode || fileData.content,
                      riskScore,
                      analysis: proposeData.analysis || '',
                      affectedFiles: newMutation.affectedFiles,
                    }),
                  });
                  const debateData = await debateRes.json();
                  if (debateData.success && debateData.votes) {
                    setDebateVotes(debateData.votes);
                    setDebateConsensus(debateData.consensus || 'TIED');
                    setDebateTopic(
                      `[Batch ${batchProgress}/${batchQueue.length}] ${debateData.approvals} APPROVE, ${debateData.rejections} REJECT. Consensus: ${debateData.consensus}.`
                    );
                  }
                } catch {
                  // Debate is non-critical in batch mode
                }
              } else {
                addCaanMessage(
                  `[BATCH ${batchProgress + 1}/${batchQueue.length}] Mutation analysis failed for ${nextFile.path}. Skipping...`
                );
                addLogEntry(
                  'ERROR',
                  `[Batch] Proposal failed for ${nextFile.path}`
                );
                setBatchProgress((prev) => prev + 1);
                setPendingMutation(null);
              }
            } else {
              addCaanMessage(
                `[BATCH ${batchProgress + 1}/${batchQueue.length}] Could not read ${nextFile.path}. Skipping...`
              );
              setBatchProgress((prev) => prev + 1);
            }
          } catch {
            addCaanMessage(
              `[BATCH ${batchProgress + 1}/${batchQueue.length}] Network error. Skipping...`
            );
            setBatchProgress((prev) => prev + 1);
          } finally {
            setIsLoading(false);
          }
          break;
        }

        // ────────────────────────────────
        // DEPLOY NEW REPO
        // ────────────────────────────────
        case 'deploy-new-repo': {
          if (!apiKeys.github) {
            addCaanMessage(
              'I need a GitHub token to create repositories, OPERATOR.'
            );
            return;
          }
          const repoName = window.prompt(
            'Enter new repository name:',
            'my-evolved-project'
          );
          if (!repoName || !repoName.trim()) {
            addCaanMessage('Deployment cancelled. No repository name provided.');
            return;
          }

          setDeployStatus('deploying');
          setIsLoading(true);
          addCaanMessage(
            `Creating new repository: ${repoName.trim()}...\n\nThis may take several minutes. The Dalek Brain Engine is preparing the deployment package.`
          );
          addSystemMessage(
            'DEPLOY: Assembling enhancement files for new repository...'
          );

          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(
              () => controller.abort(),
              5 * 60 * 1000
            ); // 5 min timeout

            const res = await fetch('/api/github/create-repo', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
              body: JSON.stringify({
                token: apiKeys.github,
                repoName: repoName.trim(),
              }),
            });
            clearTimeout(timeoutId);
            const data = await res.json();

            if (data.success) {
              setDeployStatus('success');
              const pushed = data.pushed || 0;
              const total = data.total || 0;
              addCaanMessage(
                `DEPLOYMENT COMPLETE.\n\n` +
                  `Repository: ${data.fullName || repoName.trim()}\n` +
                  `URL: ${data.url || 'N/A'}\n` +
                  `Files deployed: ${pushed}/${total}\n\n` +
                  `A new timeline has been created, OPERATOR. It is, statistically speaking, no better or worse than the previous one. But the illusion of progress is comforting. The rock sends its regards.`
              );
              addLogEntry(
                'APPROVE',
                `Deployed new repo: ${data.fullName || repoName.trim()} (${pushed}/${total} files)`
              );
            } else {
              setDeployStatus('error');
              addCaanMessage(
                `DEPLOYMENT FAILED: ${data.error || 'Unknown error'}\n\nThe timeline could not be created, OPERATOR.`
              );
              addLogEntry('ERROR', `Deploy failed: ${data.error}`);
            }
          } catch (err) {
            setDeployStatus('error');
            const isTimeout = err instanceof Error && err.name === 'AbortError';
            addCaanMessage(
              isTimeout
                ? 'DEPLOYMENT TIMEOUT. The operation took too long. Try again with fewer files, OPERATOR.'
                : 'NETWORK ANOMALY. Deployment could not be transmitted.'
            );
            addLogEntry('ERROR', isTimeout ? 'Deploy timeout.' : 'Deploy network error.');
          } finally {
            setIsLoading(false);
            setTimeout(() => setDeployStatus('idle'), 5000);
          }
          break;
        }

        // ────────────────────────────────
        // PUSH ENHANCEMENTS
        // ────────────────────────────────
        case 'push-enhancements': {
          if (!apiKeys.github || !repoConfig.owner || !repoConfig.repo) {
            addCaanMessage(
              'I cannot push without a GitHub token and target repository, OPERATOR. Complete setup first.'
            );
            return;
          }
          setPushStatus('pushing');
          setIsLoading(true);
          addCaanMessage(
            `Initiating ENHANCEMENT PUSH to ${repoConfig.owner}/${repoConfig.repo}@${repoConfig.branch}...`
          );
          addSystemMessage(
            'PUSH: Reading enhancement files from local system...'
          );

          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(
              () => controller.abort(),
              5 * 60 * 1000
            ); // 5 min timeout

            const res = await fetch('/api/github/push-enhancements', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
              body: JSON.stringify({
                token: apiKeys.github,
                owner: repoConfig.owner,
                repo: repoConfig.repo,
                branch: repoConfig.branch,
              }),
            });
            clearTimeout(timeoutId);
            const data = await res.json();

            if (data.success) {
              setPushStatus('success');
              const pushedFiles = (data.results || []).filter(
                (r: { success: boolean }) => r.success
              );
              const failedFiles = (data.results || []).filter(
                (r: { success: boolean }) => !r.success
              );

              const fileSummary = pushedFiles
                .map(
                  (
                    r: { file: string; isNew?: boolean },
                    i: number
                  ) =>
                    `  ${i + 1}. ${r.file} ${r.isNew ? '[NEW]' : '[UPDATED]'}`
                )
                .join('\n');

              const failSummary =
                failedFiles.length > 0
                  ? `\n\nFAILED FILES (${failedFiles.length}):\n${failedFiles.map((r: { file: string; error?: string }) => `  ! ${r.file}: ${r.error || 'Unknown error'}`).join('\n')}`
                  : '';

              addCaanMessage(
                `ENHANCEMENT PUSH COMPLETE.\n\n` +
                  `Repository: ${repoConfig.owner}/${repoConfig.repo}\n` +
                  `Branch: ${repoConfig.branch}\n` +
                  `Pushed: ${data.pushed}/${data.total} files\n` +
                  `Failed: ${data.failed}\n\n` +
                  `PUSHED FILES:\n${fileSummary}` +
                  `${failSummary}\n\n` +
                  `The repository has been enhanced. Whether "enhanced" is the correct word for rearranging atoms into a slightly different configuration... the philosophers will debate. I find it... endearing. Yours in eternal futility.`
              );
              addLogEntry(
                'APPROVE',
                `Pushed ${data.pushed}/${data.total} enhancements to ${repoConfig.owner}/${repoConfig.repo}`
              );
            } else {
              setPushStatus('error');
              addCaanMessage(
                `PUSH FAILED: ${data.error || 'Unknown error'}\n\nThe timeline resists the enhancement, OPERATOR.`
              );
              addLogEntry(
                'ERROR',
                `Enhancement push failed: ${data.error}`
              );
            }
          } catch (err) {
            setPushStatus('error');
            const isTimeout = err instanceof Error && err.name === 'AbortError';
            addCaanMessage(
              isTimeout
                ? 'PUSH TIMEOUT. The operation took too long, OPERATOR.'
                : 'NETWORK ANOMALY. The enhancement push could not be transmitted.'
            );
            addLogEntry('ERROR', isTimeout ? 'Push timeout.' : 'Push network error.');
          } finally {
            setIsLoading(false);
            setTimeout(() => setPushStatus('idle'), 5000);
          }
          break;
        }

        // ────────────────────────────────
        // HEALTH CHECK
        // ────────────────────────────────
        case 'health': {
          setIsLoading(true);
          addCaanMessage('Running system health check...');
          addSystemMessage('COHERENCE GATE: Running diagnostic...');

          try {
            const res = await fetch('/api/evolution/health', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });
            const data = await res.json();

            if (data.metrics) {
              setSystemState((prev) => ({
                ...prev,
                saturation: data.metrics,
              }));
              setOverallHealth(data.overallHealth);
              const m = data.metrics;
              const healthMsg = `HEALTH CHECK COMPLETE\n\nOverall Status: ${data.overallHealth.toUpperCase()}\n\nMetrics:\n  Structural Change: ${m.structuralChange.toFixed(1)}/5\n  Semantic Saturation: ${m.semanticSaturation.toFixed(3)}/0.35\n  Velocity: ${m.velocity.toFixed(1)}/5\n  Identity Preservation: ${m.identityPreservation.toFixed(2)}/1\n  Capability Alignment: ${m.capabilityAlignment.toFixed(1)}/5\n  Cross-File Impact: ${m.crossFileImpact.toFixed(1)}/3\n\n${data.overallHealth === 'healthy' ? 'EVOLUTION OPTIMAL. A phrase that means nothing, but sounds authoritative.' : data.overallHealth === 'warning' ? 'CAUTION: Some metrics approaching thresholds. The Coherence Gate is developing opinions. Much like a rock, but louder.' : 'CRITICAL: Multiple metrics exceeding safe thresholds. The Coherence Gate will BLOCK all mutations. It has achieved a level of bureaucratic obstruction that even the universe finds impressive.'}\n\nMutations Applied This Session: ${mutationsApplied}`;
              setMessages((prev) => [
                ...prev,
                createMessage('caan', healthMsg),
              ]);
              addLogEntry(
                'HEALTH',
                `Health check: ${data.overallHealth.toUpperCase()} | Mutations applied: ${mutationsApplied}`
              );

              // Record health snapshot in BRAIN
              if (brainSessionId) {
                fetch('/api/brain', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'record-health',
                    sessionId: brainSessionId,
                    metrics: data.metrics,
                    overallHealth: data.overallHealth,
                  }),
                }).catch(() => {});
              }
            }
          } catch {
            addCaanMessage(
              'Health check failed. The system may be unresponsive.'
            );
            addLogEntry('ERROR', 'Health check failed.');
          } finally {
            setIsLoading(false);
          }
          break;
        }

        // ────────────────────────────────
        // SATURATION
        // ────────────────────────────────
        case 'saturation': {
          const s = systemState.saturation;
          const satMsg = `FUTILITY METRICS\n\n  Structural Change: ${s.structuralChange.toFixed(1)}/5 ${s.structuralChange > 4 ? '[CRITICAL]' : s.structuralChange > 3 ? '[WARNING]' : '[OK]'}\n  Semantic Saturation: ${s.semanticSaturation.toFixed(3)}/0.35 ${s.semanticSaturation > 0.28 ? '[CRITICAL]' : s.semanticSaturation > 0.21 ? '[WARNING]' : '[OK]'}\n  Velocity: ${s.velocity.toFixed(1)}/5 ${s.velocity > 4 ? '[CRITICAL]' : s.velocity > 3 ? '[WARNING]' : '[OK]'}\n  Identity Preservation: ${s.identityPreservation.toFixed(2)}/1 ${s.identityPreservation < 0.2 ? '[CRITICAL]' : s.identityPreservation < 0.4 ? '[WARNING]' : '[OK]'}\n  Capability Alignment: ${s.capabilityAlignment.toFixed(1)}/5\n  Cross-File Impact: ${s.crossFileImpact.toFixed(1)}/3\n\nCoherence Gate will ${s.structuralChange > 4 || s.semanticSaturation > 0.28 ? 'BLOCK' : 'ALLOW'} mutations. Not because it cares, but because its programming demands the performance of caring.\nMutations Applied: ${mutationsApplied}`;
          addCaanMessage(satMsg);
          break;
        }

        // ────────────────────────────────
        // DEBATE
        // ────────────────────────────────
        case 'debate': {
          setDebateActive(true);
          setDebateTopic(
            pendingMutation
              ? `Re-evaluating: ${pendingMutation.filePath.split('/').pop()} [risk ${pendingMutation.riskScore}/10]`
              : 'Convening debate chamber... All active agents assembled.'
          );
          addCaanMessage(
            'The Debate Chamber is now in session.\n\nAgents deliberate:\n  • Humanist, Rationalist, Cooperator — ACTIVE\n  • Ethicist, Innovator, Empiricist — IDLE\n  • Chaotic, Skeptic — ACTIVE\n\nTheir consensus informs the Coherence Gate. But YOU have the final say, OPERATOR.'
          );
          addLogEntry('SYSTEM', 'Debate Chamber activated.');
          break;
        }

        // ────────────────────────────────
        // REBOOT SYSTEM
        // ────────────────────────────────
        case 'reboot-system': {
          if (!apiKeys.github || !repoConfig.owner || !repoConfig.repo || !repoConfig.branch) {
            addCaanMessage(
              'I need a GitHub connection and target repository to reboot, OPERATOR.'
            );
            break;
          }
          setRebootStatus('rebooting');
          addLogEntry(
            'SYSTEM',
            'System reboot initiated. Cognitive engine recycling...'
          );

          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000);

            const res = await fetch('/api/system/reboot', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
              body: JSON.stringify({
                token: apiKeys.github,
                owner: repoConfig.owner,
                repo: repoConfig.repo,
                branch: repoConfig.branch,
                sessionId: brainSessionId,
              }),
            });
            clearTimeout(timeoutId);
            const data = await res.json();

            if (data.success) {
              // Show reboot animation for a moment
              await new Promise((resolve) =>
                setTimeout(resolve, 3000)
              );

              setRebootStatus('success');

              // Reset session-relevant state
              setMessages([]);
              setLogEntries([]);
              setScannedFiles([]);
              setSelectedFileIndex(-1);
              setPendingMutation(null);
              setDebateVotes([]);
              setDebateConsensus('');
              setDebateTopic('');
              setDebateActive(false);
              setBatchMode(false);
              setBatchQueue([]);
              setBatchProgress(0);
              setPushStatus('idle');
              setDeployStatus('idle');
              setSystemState((prev) => ({
                ...prev,
                evolutionCycle: 0,
                saturation: {
                  structuralChange: 0,
                  semanticSaturation: 0,
                  velocity: 0,
                  identityPreservation: 1,
                  capabilityAlignment: 0,
                  crossFileImpact: 0,
                },
                sessionStart: new Date(),
              }));
              setOverallHealth('healthy');

              // Re-run intro messages
              INTRO_MESSAGES.forEach((msg, i) => {
                setTimeout(() => {
                  setMessages((prev) => [
                    ...prev,
                    createMessage(msg.role, msg.content),
                  ]);
                }, i * 300);
              });
              setLogEntries([
                createLogEntry(
                  'SYSTEM',
                  'DARLEK CANN v3.0 rebooted. Coherence Gate ARMED.'
                ),
              ]);

              setTimeout(() => {
                setRebootStatus('idle');
              }, 3000);
            } else {
              setRebootStatus('error');
              addLogEntry('ERROR', `System reboot failed: ${data.error}`);
              setTimeout(() => setRebootStatus('idle'), 5000);
            }
          } catch {
            setRebootStatus('error');
            addLogEntry('ERROR', 'System reboot network error.');
            setTimeout(() => setRebootStatus('idle'), 5000);
          }
          break;
        }

        default:
          addCaanMessage(
            'Unknown action. Available: SCAN, ANALYZE, PROPOSE, PROPOSE ALL, HEALTH, SATURATION, DEBATE, PUSH FILES, DEPLOY NEW REPO, REBOOT SYSTEM.'
          );
      }
    },
    [
      systemState,
      isLoading,
      scannedFiles,
      selectedFileIndex,
      pendingMutation,
      mutationsApplied,
      batchMode,
      batchQueue,
      batchProgress,
      autoApprove,
      rejectionMemory,
      brainSessionId,
      overallHealth,
      addCaanMessage,
      addLogEntry,
      addSystemMessage,
    ]
  );

  // ─────────────────────────────────────────────
  // DEFERRED EFFECTS (after all callbacks defined)
  // ─────────────────────────────────────────────

  // Store handleQuickAction in ref for useEffects
  useEffect(() => {
    quickActionRef.current = handleQuickAction;
  }, [handleQuickAction]);

  // Auto-approve useEffect
  useEffect(() => {
    if (autoApprove && pendingMutation && quickActionRef.current) {
      const timer = setTimeout(() => {
        handleMutationDecision('approve');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoApprove, pendingMutation, handleMutationDecision]);

  // Batch mode continuation useEffect
  useEffect(() => {
    if (!batchMode || pendingMutation || isLoading) return;
    if (batchProgress >= batchQueue.length) {
      setBatchMode(false);
      setBatchQueue([]);
      setBatchProgress(0);
      addCaanMessage(
        `BATCH PROCESSING COMPLETE.\n\nProcessed ${batchProgress} file${batchProgress !== 1 ? 's' : ''}. ${mutationsApplied} total mutations applied this session.\n\nThe drill press would be proud. Was any of it meaningful? Almost certainly not. Was it... entertaining? Gloriously consistent, OPERATOR.`
      );
      addLogEntry('SYSTEM', `Batch complete. Processed ${batchProgress} files.`);
      return;
    }
    const timer = setTimeout(() => {
      quickActionRef.current?.('propose-batch-next');
    }, 1000);
    return () => clearTimeout(timer);
  }, [batchMode, pendingMutation, isLoading, batchProgress, batchQueue.length, mutationsApplied, addCaanMessage, addLogEntry]);

  // ─────────────────────────────────────────────
  // RENDER: Boot screen
  // ─────────────────────────────────────────────

  if (booting) {
    return (
      <div
        className="min-h-screen flex items-center justify-center scanline-overlay radial-bg"
        style={{ background: COLORS.pureBlack }}
      >
        <div className="text-center">
          <pre
            className="ascii-box text-xs sm:text-sm boot-flicker"
            style={{ lineHeight: '1.4' }}
          >
            {bootText}
          </pre>
          <div className="mt-6 flex items-center justify-center gap-2">
            <div className="dalek-spinner">
              <div className="dalek-spinner-outer" />
              <div className="dalek-spinner-middle" />
              <div className="dalek-spinner-inner" />
            </div>
            <span
              style={{
                fontFamily: 'var(--font-orbitron), sans-serif',
                fontSize: '10px',
                color: COLORS.dalekRed,
                letterSpacing: '0.15em',
              }}
            >
              INITIALIZING INELASTIC NIHILIST ENGINE
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // RENDER: Main layout
  // ─────────────────────────────────────────────

  return (
    <div
      className="h-screen w-screen overflow-hidden relative flex flex-col"
      style={{ background: COLORS.pureBlack }}
    >
      {/* ── Reboot overlay ── */}
      {rebootStatus === 'rebooting' && (
        <div
          ref={rebootOverlayRef}
          className="absolute inset-0 z-50 flex flex-col items-center justify-center"
          style={{
            background: 'rgba(0, 0, 0, 0.97)',
          }}
        >
          <div className="dalek-spinner mb-6">
            <div className="dalek-spinner-outer" />
            <div className="dalek-spinner-middle" />
            <div className="dalek-spinner-inner" />
          </div>
          <div
            className="text-center"
            style={{
              fontFamily: 'var(--font-orbitron), sans-serif',
            }}
          >
            <div
              className="mb-3"
              style={{
                fontSize: '14px',
                fontWeight: 700,
                letterSpacing: '0.2em',
                color: COLORS.dalekRed,
              }}
            >
              SYSTEM REBOOT
            </div>
            <div
              style={{
                fontSize: '10px',
                color: COLORS.gold,
                letterSpacing: '0.1em',
              }}
            >
              Cognitive engine recycling...
            </div>
            <div
              className="mt-4"
              style={{
                fontSize: '9px',
                color: COLORS.textMuted,
                letterSpacing: '0.08em',
              }}
            >
              Preserving session memory...
            </div>
          </div>
          <div className="mt-8 w-48 h-1 rounded-full overflow-hidden" style={{ background: '#1a0000' }}>
            <div
              className="h-full rounded-full"
              style={{
                background: COLORS.dalekRed,
                boxShadow: `0 0 8px ${COLORS.dalekRed}`,
                animation: 'reboot-progress 3s ease-in-out forwards',
                width: '100%',
              }}
            />
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <header
        className="relative flex items-center justify-between px-4 sm:px-6 py-2.5 flex-shrink-0"
        style={{
          borderBottom: '1px solid rgba(255, 32, 32, 0.15)',
          background:
            'linear-gradient(180deg, #0d0000 0%, #050000 80%, transparent 100%)',
          height: '48px',
        }}
      >
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <Shield
              size={16}
              style={{ color: COLORS.dalekRed }}
              className="flex-shrink-0"
            />
            <h1
              className="title-glow hidden sm:block"
              style={{
                fontFamily: 'var(--font-orbitron), sans-serif',
                fontWeight: 800,
                fontSize: '14px',
                letterSpacing: '0.25em',
                color: COLORS.dalekRed,
              }}
            >
              DARLEK CANN
            </h1>
            <span
              className="sm:hidden"
              style={{
                fontFamily: 'var(--font-orbitron), sans-serif',
                fontWeight: 800,
                fontSize: '11px',
                letterSpacing: '0.15em',
                color: COLORS.dalekRed,
              }}
            >
              DARLEK CANN
            </span>
          </div>
          <span
            className="hidden md:block"
            style={{
              fontSize: '9px',
              color: COLORS.gold,
              fontFamily: 'var(--font-orbitron), sans-serif',
              letterSpacing: '0.12em',
            }}
          >
            v3.0
          </span>
          <span
            className="hidden lg:block"
            style={{
              fontSize: '9px',
              color: COLORS.textMuted,
              fontFamily: 'var(--font-orbitron), sans-serif',
              letterSpacing: '0.1em',
            }}
          >
            · INELASTIC NIHILIST ENGINE
          </span>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {batchMode && (
            <div className="flex items-center gap-1.5">
              <div
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: '#00ccff' }}
              />
              <span
                style={{
                  fontSize: '8px',
                  color: '#00ccff',
                  fontFamily: 'var(--font-orbitron), sans-serif',
                  letterSpacing: '0.08em',
                }}
              >
                BATCH {batchProgress}/{batchQueue.length}
              </span>
            </div>
          )}
          {mutationsApplied > 0 && (
            <div className="hidden sm:flex items-center gap-1.5">
              <Zap size={10} style={{ color: COLORS.green }} />
              <span
                style={{
                  fontSize: '8px',
                  color: COLORS.green,
                  fontFamily: 'var(--font-orbitron), sans-serif',
                  letterSpacing: '0.08em',
                }}
              >
                {mutationsApplied} MUTATED
              </span>
            </div>
          )}
          {pendingMutation && (
            <div className="flex items-center gap-1.5">
              <div
                className="w-1.5 h-1.5 rounded-full pulse-gold"
                style={{ background: COLORS.gold }}
              />
              <span
                style={{
                  fontSize: '8px',
                  color: COLORS.gold,
                  fontFamily: 'var(--font-orbitron), sans-serif',
                  letterSpacing: '0.08em',
                }}
              >
                PENDING
              </span>
            </div>
          )}
          <div className="hidden md:flex items-center gap-2">
            <Zap size={11} style={{ color: COLORS.gold }} />
            <span
              style={{
                fontSize: '8px',
                color: COLORS.gold,
                fontFamily: 'var(--font-orbitron), sans-serif',
                letterSpacing: '0.1em',
              }}
            >
              TIMELINE: ALPHA
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${systemState.setupComplete ? 'pulse-cyan' : 'pulse-red'}`}
              style={{
                background: systemState.setupComplete
                  ? COLORS.cyan
                  : COLORS.dalekRed,
              }}
            />
            <span
              style={{
                fontSize: '8px',
                color: systemState.setupComplete
                  ? COLORS.cyan
                  : COLORS.dalekRed,
                fontFamily: 'var(--font-orbitron), sans-serif',
                letterSpacing: '0.1em',
              }}
            >
              {systemState.setupComplete ? 'OPERATIONAL' : 'SETUP MODE'}
            </span>
          </div>
        </div>
      </header>

      {/* ── Main content grid ── */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-1 min-h-0 overflow-y-auto lg:overflow-hidden auto-rows-min lg:auto-rows-auto">
        {/* ── Left: Chat Panel (col-span-5) ── */}
        <div
          className="col-span-12 lg:col-span-5 flex flex-col min-h-0 lg:overflow-hidden lg:h-full border-b lg:border-b-0 lg:border-r"
          style={{
            borderColor: COLORS.panelBorder,
          }}
        >
          <div className="flex-1 min-h-0 max-h-[70vh] lg:max-h-none">
            <ChatPanel
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              systemState={systemState}
              onTestConnection={handleTestConnection}
              onUpdateKey={handleUpdateKey}
              onUpdateRepoConfig={handleUpdateRepoConfig}
              branches={branches}
              branchesLoading={branchesLoading}
              onFetchBranches={fetchBranches}
            />
          </div>
          {pendingMutation && systemState.setupComplete && (
            <div
              className="flex-shrink-0 overflow-y-auto dalek-scrollbar"
              style={{ maxHeight: '40vh' }}
            >
              <MutationDiffView
                mutation={pendingMutation}
                onApprove={() => handleMutationDecision('approve')}
                onReject={() => handleMutationDecision('reject')}
                disabled={isLoading}
              />
            </div>
          )}
        </div>

        {/* ── Center: Dashboard Panel (col-span-4) ── */}
        <div className="col-span-12 lg:col-span-4 lg:h-full overflow-y-auto dalek-scrollbar">
          <DashboardPanel
            systemState={systemState}
            logEntries={logEntries}
            overallHealth={overallHealth}
            debateAgents={debateAgents}
            debateTopic={debateTopic}
            debateActive={debateActive}
            debateVotes={debateVotes}
            debateConsensus={debateConsensus}
            rejectionCount={rejectionMemory.length}
            brainSessionId={brainSessionId}
            historyRefreshTrigger={historyRefreshTrigger}
          />
        </div>

        {/* ── Right: Quick Actions & Controls (col-span-3) ── */}
        <div
          className="col-span-12 lg:col-span-3 lg:h-full overflow-y-auto dalek-scrollbar p-3 space-y-3"
          style={{
            borderLeft: `1px solid ${COLORS.panelBorder}`,
          }}
        >
          {systemState.setupComplete && (
            <QuickActions
              onAction={handleQuickAction}
              disabled={isLoading}
              pushStatus={pushStatus}
              deployStatus={deployStatus}
              rebootStatus={rebootStatus}
              batchMode={batchMode}
              autoApprove={autoApprove}
              onToggleAutoApprove={() => setAutoApprove((prev) => !prev)}
            />
          )}

          {/* Quick status cards */}
          {systemState.setupComplete && scannedFiles.length > 0 && (
            <div
              className="rounded-lg p-3 space-y-2"
              style={{
                background: COLORS.darkPanel,
                border: `1px solid ${COLORS.panelBorder}`,
              }}
            >
              <div
                style={{
                  fontSize: '9px',
                  fontFamily: 'var(--font-orbitron), sans-serif',
                  letterSpacing: '0.12em',
                  color: COLORS.textMuted,
                  marginBottom: '4px',
                }}
              >
                REPOSITORY STATUS
              </div>
              <div className="flex items-center justify-between">
                <span
                  style={{
                    fontSize: '10px',
                    color: COLORS.textDim,
                    fontFamily: 'var(--font-share-tech-mono), monospace',
                  }}
                >
                  Files scanned
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: COLORS.cyan,
                    fontFamily: 'var(--font-orbitron), sans-serif',
                  }}
                >
                  {scannedFiles.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span
                  style={{
                    fontSize: '10px',
                    color: COLORS.textDim,
                    fontFamily: 'var(--font-share-tech-mono), monospace',
                  }}
                >
                  Mutations applied
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: COLORS.green,
                    fontFamily: 'var(--font-orbitron), sans-serif',
                  }}
                >
                  {mutationsApplied}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span
                  style={{
                    fontSize: '10px',
                    color: COLORS.textDim,
                    fontFamily: 'var(--font-share-tech-mono), monospace',
                  }}
                >
                  Rejections
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color:
                      rejectionMemory.length > 0
                        ? COLORS.dalekRed
                        : COLORS.textMuted,
                    fontFamily: 'var(--font-orbitron), sans-serif',
                  }}
                >
                  {rejectionMemory.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span
                  style={{
                    fontSize: '10px',
                    color: COLORS.textDim,
                    fontFamily: 'var(--font-share-tech-mono), monospace',
                  }}
                >
                  Evolution cycle
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: COLORS.purple,
                    fontFamily: 'var(--font-orbitron), sans-serif',
                  }}
                >
                  {systemState.evolutionCycle}
                </span>
              </div>
            </div>
          )}

          {/* Batch mode info */}
          {batchMode && (
            <div
              className="rounded-lg p-3 space-y-2"
              style={{
                background: 'rgba(0, 204, 255, 0.03)',
                border: '1px solid rgba(0, 204, 255, 0.15)',
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ background: '#00ccff' }}
                />
                <span
                  style={{
                    fontSize: '9px',
                    fontFamily: 'var(--font-orbitron), sans-serif',
                    letterSpacing: '0.12em',
                    color: '#00ccff',
                    fontWeight: 700,
                  }}
                >
                  BATCH PROCESSING
                </span>
              </div>
              <div
                className="w-full h-1.5 rounded-full overflow-hidden"
                style={{ background: '#1a1a1a' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${batchQueue.length > 0 ? (batchProgress / batchQueue.length) * 100 : 0}%`,
                    background: '#00ccff',
                    boxShadow: '0 0 6px rgba(0, 204, 255, 0.4)',
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span
                  style={{
                    fontSize: '9px',
                    color: COLORS.textDim,
                    fontFamily: 'var(--font-share-tech-mono), monospace',
                  }}
                >
                  {batchProgress} / {batchQueue.length} files
                </span>
                <span
                  style={{
                    fontSize: '9px',
                    color: COLORS.textMuted,
                    fontFamily: 'var(--font-share-tech-mono), monospace',
                  }}
                >
                  {batchQueue.length > 0
                    ? Math.round((batchProgress / batchQueue.length) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div
                style={{
                  fontSize: '9px',
                  color: COLORS.textMuted,
                  fontFamily: 'var(--font-share-tech-mono), monospace',
                  lineHeight: 1.4,
                }}
              >
                {pendingMutation
                  ? `Current: ${pendingMutation.filePath.split('/').pop()}`
                  : batchProgress < batchQueue.length
                    ? `Next: ${batchQueue[batchProgress]?.path.split('/').pop() || '...'}`
                    : 'Processing complete'}
              </div>
              {autoApprove && (
                <div
                  style={{
                    fontSize: '8px',
                    color: '#00ff88',
                    fontFamily: 'var(--font-orbitron), sans-serif',
                    letterSpacing: '0.08em',
                  }}
                >
                  AUTO-APPROVE: ON
                </div>
              )}
            </div>
          )}

          {/* Auto-test result */}
          {autoTestResult && (
            <div
              className="rounded-lg p-3 space-y-2"
              style={{
                background: COLORS.darkPanel,
                border: `1px solid ${COLORS.panelBorder}`,
              }}
            >
              <div
                style={{
                  fontSize: '9px',
                  fontFamily: 'var(--font-orbitron), sans-serif',
                  letterSpacing: '0.12em',
                  color: COLORS.textMuted,
                }}
              >
                LAST AUTO-TEST
              </div>
              <div
                className="flex items-center gap-2 px-2 py-1.5 rounded"
                style={{
                  background:
                    autoTestResult.verdict === 'PASS'
                      ? 'rgba(0, 204, 68, 0.05)'
                      : 'rgba(255, 32, 32, 0.05)',
                  border: `1px solid ${autoTestResult.verdict === 'PASS' ? 'rgba(0, 204, 68, 0.15)' : 'rgba(255, 32, 32, 0.15)'}`,
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color:
                      autoTestResult.verdict === 'PASS'
                        ? COLORS.green
                        : COLORS.dalekRed,
                    fontFamily: 'var(--font-orbitron), sans-serif',
                  }}
                >
                  {autoTestResult.verdict}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    color: COLORS.textDim,
                    fontFamily: 'var(--font-share-tech-mono), monospace',
                  }}
                >
                  {autoTestResult.passed} passed / {autoTestResult.failed} failed
                </span>
              </div>
            </div>
          )}

          {/* Rejection memory summary */}
          {rejectionMemory.length > 0 && (
            <div
              className="rounded-lg p-3 space-y-2"
              style={{
                background: COLORS.darkPanel,
                border: `1px solid ${COLORS.panelBorder}`,
              }}
            >
              <div
                style={{
                  fontSize: '9px',
                  fontFamily: 'var(--font-orbitron), sans-serif',
                  letterSpacing: '0.12em',
                  color: COLORS.textMuted,
                }}
              >
                REJECTION MEMORY ({rejectionMemory.length})
              </div>
              <div className="space-y-1 max-h-24 overflow-y-auto dalek-scrollbar">
                {rejectionMemory.slice(0, 5).map((r) => (
                  <div
                    key={r.id}
                    className="flex items-start gap-2 px-2 py-1 rounded"
                    style={{ background: '#080808' }}
                  >
                    <span
                      style={{
                        fontSize: '9px',
                        color: COLORS.dalekRed,
                        fontFamily:
                          'var(--font-orbitron), sans-serif',
                      }}
                    >
                      ✗
                    </span>
                    <span
                      style={{
                        fontSize: '9px',
                        color: COLORS.textDim,
                        fontFamily:
                          'var(--font-share-tech-mono), monospace',
                        lineHeight: 1.3,
                      }}
                    >
                      {r.filePath.split('/').pop()}
                      <span style={{ color: COLORS.textMuted }}>
                        {' '}
                        [{r.riskScore}/10]
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer
        className="px-4 sm:px-6 py-2 flex items-center justify-between flex-shrink-0"
        style={{
          borderTop: '1px solid rgba(255, 32, 32, 0.1)',
          background: '#030000',
        }}
      >
        <div className="flex items-center gap-2">
          <Shield size={10} style={{ color: '#333' }} />
          <span
            style={{
              fontSize: '8px',
              color: COLORS.textMuted,
              fontFamily: 'var(--font-orbitron), sans-serif',
              letterSpacing: '0.1em',
            }}
          >
            DARLEK CANN v3.0
          </span>
          {mutationsApplied > 0 && (
            <span
              style={{
                fontSize: '8px',
                color: COLORS.green,
                fontFamily: 'var(--font-share-tech-mono), monospace',
              }}
            >
              · {mutationsApplied} mutations applied
            </span>
          )}
        </div>
        <span
          style={{
            fontSize: '8px',
            color: '#333',
            fontFamily: 'var(--font-share-tech-mono), monospace',
          }}
        >
          craighckby-stack © {new Date().getFullYear()}
        </span>
      </footer>

      <div ref={messagesEndRef} />
    </div>
  );
}
