'use client';

import StatusBar from './StatusBar';
import SaturationMetricsPanel from './SaturationMetrics';
import EvolutionLog from './EvolutionLog';
import DebateChamber from './DebateChamber';
import MutationHistoryPanel from './MutationHistoryPanel';
import type { SystemState, EvolutionLogEntry, DebateAgent, AgentVote } from '@/lib/types';

interface DashboardPanelProps {
  systemState: SystemState;
  logEntries: EvolutionLogEntry[];
  overallHealth: 'healthy' | 'warning' | 'critical';
  debateAgents: DebateAgent[];
  debateTopic: string;
  debateActive: boolean;
  debateVotes?: AgentVote[];
  debateConsensus?: string;
  rejectionCount?: number;
  brainSessionId?: string;
  historyRefreshTrigger?: number;
}

export default function DashboardPanel({
  systemState,
  logEntries,
  overallHealth,
  debateAgents,
  debateTopic,
  debateActive,
  debateVotes,
  debateConsensus,
  rejectionCount,
  brainSessionId,
  historyRefreshTrigger,
}: DashboardPanelProps) {
  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto dalek-scrollbar p-1 custom-scrollbar">
      <StatusBar
        connectionStatus={systemState.connectionStatus}
        repoConfig={systemState.repoConfig}
        evolutionCycle={systemState.evolutionCycle}
        overallHealth={overallHealth}
        sessionStart={systemState.sessionStart}
      />
      <SaturationMetricsPanel metrics={systemState.saturation} />
      <EvolutionLog entries={logEntries} />
      <DebateChamber
        agents={debateAgents}
        currentTopic={debateTopic}
        isActive={debateActive}
        votes={debateVotes}
        consensus={debateConsensus}
      />
      {brainSessionId && <MutationHistoryPanel sessionId={brainSessionId} refreshTrigger={historyRefreshTrigger} />}
    </div>
  );
}
