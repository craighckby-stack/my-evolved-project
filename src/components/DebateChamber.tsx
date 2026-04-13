'use client';

import type { DebateAgent, AgentVote } from '@/lib/types';
import { COLORS } from '@/lib/constants';
import { Users } from 'lucide-react';

interface DebateChamberProps {
  agents: DebateAgent[];
  currentTopic: string;
  isActive: boolean;
  votes?: AgentVote[];
  consensus?: string;
}

export default function DebateChamber({ agents, currentTopic, isActive, votes, consensus }: DebateChamberProps) {
  // Merge agent definitions with vote results
  const agentsWithVotes = agents.map(agent => {
    const vote = votes?.find(v => v.agentId === agent.id);
    return { ...agent, vote };
  });

  return (
    <div className="dalek-panel rounded-lg p-4 space-y-3">
      <div className="dalek-panel-header py-2 px-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={14} style={{ color: COLORS.purple }} />
          <span style={{ fontSize: '11px' }}>DEBATE CHAMBER</span>
        </div>
        <div className="flex items-center gap-2">
          {consensus && (
            <span
              style={{
                fontSize: '8px',
                fontFamily: 'var(--font-orbitron), sans-serif',
                letterSpacing: '0.08em',
                color: consensus === 'APPROVE' ? COLORS.green : consensus === 'REJECT' ? COLORS.dalekRed : COLORS.gold,
                fontWeight: 700,
              }}
            >
              {consensus}
            </span>
          )}
          <div className="flex items-center gap-1.5">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: isActive ? COLORS.purple : '#333',
                boxShadow: isActive ? `0 0 4px ${COLORS.purple}` : 'none',
              }}
            />
            <span style={{ fontSize: '9px', color: isActive ? COLORS.purple : COLORS.textMuted, fontFamily: 'var(--font-orbitron), sans-serif', letterSpacing: '0.08em' }}>
              {isActive ? 'ACTIVE' : 'STANDBY'}
            </span>
          </div>
        </div>
      </div>

      {/* Agent grid with votes */}
      <div className="grid grid-cols-1 gap-2">
        {agentsWithVotes.map((agent) => {
          const voteColor = agent.vote?.vote === 'approve' ? COLORS.green : agent.vote?.vote === 'reject' ? COLORS.dalekRed : COLORS.gold;
          const voteIcon = agent.vote?.vote === 'approve' ? '\u2713' : agent.vote?.vote === 'reject' ? '\u2717' : '\u25CB';
          const voteLabel = agent.vote?.vote === 'approve' ? 'APPROVE' : agent.vote?.vote === 'reject' ? 'REJECT' : 'ABSTAIN';

          return (
            <div
              key={agent.id}
              className="px-3 py-2 rounded"
              style={{
                background: '#080808',
                border: `1px solid ${agent.vote ? `${voteColor}20` : COLORS.panelBorder}`,
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="text-xs flex-shrink-0"
                  style={{ color: agent.status === 'active' ? agent.color : '#333' }}
                >
                  {agent.status === 'active' ? '\u25CF' : '\u25CB'}
                </span>
                <span
                  style={{
                    fontSize: '9px',
                    fontFamily: 'var(--font-orbitron), sans-serif',
                    letterSpacing: '0.05em',
                    color: agent.status === 'active' ? '#ccc' : '#444',
                    fontWeight: agent.status === 'active' ? 600 : 400,
                  }}
                >
                  {agent.name}
                </span>
                {agent.vote && (
                  <>
                    <span
                      className="ml-auto"
                      style={{
                        fontSize: '8px',
                        color: voteColor,
                        fontFamily: 'var(--font-orbitron), sans-serif',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                      }}
                    >
                      {voteIcon} {voteLabel}
                    </span>
                    <span
                      style={{
                        fontSize: '8px',
                        color: COLORS.textMuted,
                        fontFamily: 'var(--font-orbitron), sans-serif',
                      }}
                    >
                      {agent.vote.confidence}%
                    </span>
                  </>
                )}
                {agent.vote && (
                  <span
                    style={{
                      fontSize: '7px',
                      color: '#444',
                      fontFamily: 'var(--font-share-tech-mono), monospace',
                    }}
                  >
                    via {agent.vote.provider}
                  </span>
                )}
              </div>
              {agent.vote?.reasoning && (
                <p
                  style={{
                    fontSize: '9px',
                    color: COLORS.textDim,
                    fontFamily: 'var(--font-share-tech-mono), monospace',
                    marginTop: '4px',
                    paddingLeft: '18px',
                    lineHeight: 1.4,
                  }}
                >
                  &quot;{agent.vote.reasoning}&quot;
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Current debate topic */}
      {currentTopic && (
        <div
          className="debate-topic px-3 py-2 rounded text-center"
          style={{
            background: 'rgba(204, 0, 255, 0.03)',
            border: '1px solid rgba(204, 0, 255, 0.08)',
          }}
        >
          <span style={{ fontSize: '8px', color: COLORS.textMuted, fontFamily: 'var(--font-orbitron), sans-serif', letterSpacing: '0.1em', display: 'block', marginBottom: '4px' }}>
            CURRENT TOPIC
          </span>
          <p style={{ fontSize: '10px', color: COLORS.purple, fontFamily: 'var(--font-share-tech-mono), monospace', lineHeight: 1.4 }}>
            {currentTopic}
          </p>
        </div>
      )}

      {!currentTopic && (
        <div
          className="px-3 py-2 rounded text-center"
          style={{ background: '#060606' }}
        >
          <p style={{ fontSize: '10px', color: COLORS.textMuted }}>
            No active debate. Initiate analysis to convene the chamber.
          </p>
        </div>
      )}
    </div>
  );
}
