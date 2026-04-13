'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, GitBranch, RefreshCw } from 'lucide-react';
import type { Message, SystemState, BranchInfo } from '@/lib/types';
import { SETUP_STEPS, COLORS } from '@/lib/constants';
import ChatMessage from './ChatMessage';

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  isLoading: boolean;
  systemState: SystemState;
  onTestConnection: (provider: string, key: string) => void;
  onUpdateKey: (key: string, value: string) => void;
  onUpdateRepoConfig: (field: 'owner' | 'repo' | 'branch', value: string) => void;
  branches: BranchInfo[];
  branchesLoading: boolean;
  onFetchBranches: () => void;
}

export default function ChatPanel({
  messages,
  onSendMessage,
  isLoading,
  systemState,
  onTestConnection,
  onUpdateKey,
  onUpdateRepoConfig,
  branches,
  branchesLoading,
  onFetchBranches,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = useCallback(() => {
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  }, [input, isLoading, onSendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const currentStep = systemState.currentStep;
  const setupStep = currentStep < SETUP_STEPS.length ? SETUP_STEPS[currentStep] : null;

  const getStatusText = (status: string): string => {
    if (status === 'testing') return 'TESTING...';
    if (status === 'connected') return 'ONLINE';
    if (status === 'error') return 'FAILED';
    return 'IDLE';
  };

  const handleBranchSelect = (branchName: string) => {
    onUpdateRepoConfig('branch', branchName);
    onSendMessage(`branch: ${branchName}`);
  };

  const renderSetupInput = () => {
    if (!setupStep || systemState.setupComplete) return null;

    const stepId = setupStep.id;

    if (stepId === 'repo') {
      return (
        <div className="space-y-3 p-4" style={{ borderTop: `1px solid ${COLORS.panelBorder}` }}>
          <input
            type="text"
            placeholder={setupStep.placeholder}
            defaultValue="craighckby-stack/Test-1-"
            className="dalek-input w-full px-4 py-3 text-sm"
            onChange={(e) => {
              const val = e.target.value;
              const parts = val.split('/');
              onUpdateRepoConfig('owner', parts[0] || '');
              onUpdateRepoConfig('repo', parts.slice(1).join('/') || '');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && systemState.repoConfig.owner && systemState.repoConfig.repo) {
                onSendMessage(`repo: ${systemState.repoConfig.owner}/${systemState.repoConfig.repo}`);
              }
            }}
          />
          <button
            onClick={() => {
              if (systemState.repoConfig.owner && systemState.repoConfig.repo) {
                onSendMessage(`repo: ${systemState.repoConfig.owner}/${systemState.repoConfig.repo}`);
              }
            }}
            disabled={!systemState.repoConfig.owner || !systemState.repoConfig.repo}
            className="dalek-btn dalek-btn-primary px-6 py-2 text-xs w-full"
          >
            SET TARGET REPOSITORY
          </button>
        </div>
      );
    }

    if (stepId === 'branch') {
      return (
        <div className="space-y-3 p-4" style={{ borderTop: `1px solid ${COLORS.panelBorder}` }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch size={14} style={{ color: COLORS.gold }} />
              <span
                style={{
                  fontFamily: 'var(--font-orbitron), sans-serif',
                  fontSize: '10px',
                  letterSpacing: '0.1em',
                  color: COLORS.gold,
                }}
              >
                SELECT BRANCH
              </span>
            </div>
            <button
              onClick={onFetchBranches}
              disabled={branchesLoading}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-all"
              style={{
                color: COLORS.cyan,
                background: 'rgba(0, 255, 204, 0.05)',
                border: '1px solid rgba(0, 255, 204, 0.15)',
                cursor: branchesLoading ? 'not-allowed' : 'pointer',
                opacity: branchesLoading ? 0.5 : 1,
              }}
              title="Refresh branch list"
            >
              <RefreshCw size={11} className={branchesLoading ? 'animate-spin' : ''} />
              REFRESH
            </button>
          </div>

          {branchesLoading ? (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 size={14} className="animate-spin" style={{ color: COLORS.dalekRed }} />
              <span style={{ color: COLORS.textMuted, fontSize: '11px', fontFamily: 'var(--font-share-tech-mono), monospace' }}>
                Scanning branches...
              </span>
            </div>
          ) : branches.length > 0 ? (
            <div className="space-y-1.5 max-h-40 overflow-y-auto dalek-scrollbar pr-1">
              {branches.map((branch) => (
                <button
                  key={branch.name}
                  onClick={() => handleBranchSelect(branch.name)}
                  className="w-full text-left px-3 py-2.5 rounded flex items-center justify-between group transition-all"
                  style={{
                    background: systemState.repoConfig.branch === branch.name
                      ? 'rgba(185, 28, 28, 0.15)'
                      : 'rgba(20, 10, 10, 0.6)',
                    border: `1px solid ${systemState.repoConfig.branch === branch.name ? 'rgba(185, 28, 28, 0.4)' : 'rgba(185, 28, 28, 0.1)'}`,
                    cursor: 'pointer',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <GitBranch
                      size={12}
                      style={{
                        color: branch.default ? COLORS.gold : systemState.repoConfig.branch === branch.name ? COLORS.dalekRed : COLORS.textMuted,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: 'var(--font-share-tech-mono), monospace',
                        fontSize: '12px',
                        color: '#ffffff',
                      }}
                    >
                      {branch.name}
                    </span>
                  </div>
                  {branch.default && (
                    <span
                      style={{
                        fontFamily: 'var(--font-orbitron), sans-serif',
                        fontSize: '8px',
                        letterSpacing: '0.08em',
                        color: COLORS.gold,
                        background: 'rgba(212, 160, 23, 0.1)',
                        border: '1px solid rgba(212, 160, 23, 0.2)',
                        padding: '1px 6px',
                        borderRadius: '2px',
                      }}
                    >
                      DEFAULT
                    </span>
                  )}
                  {systemState.repoConfig.branch === branch.name && !branch.default && (
                    <span
                      style={{
                        fontFamily: 'var(--font-orbitron), sans-serif',
                        fontSize: '8px',
                        letterSpacing: '0.08em',
                        color: COLORS.dalekRed,
                        background: 'rgba(185, 28, 28, 0.1)',
                        border: '1px solid rgba(185, 28, 28, 0.2)',
                        padding: '1px 6px',
                        borderRadius: '2px',
                      }}
                    >
                      SELECTED
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-3">
              <span style={{ color: COLORS.textMuted, fontSize: '11px', fontFamily: 'var(--font-share-tech-mono), monospace' }}>
                No branches found. Check repository access.
              </span>
            </div>
          )}

          <div
            className="pt-2"
            style={{ borderTop: `1px solid ${COLORS.panelBorder}` }}
          >
            <span style={{ color: COLORS.textMuted, fontSize: '9px', fontFamily: 'var(--font-orbitron), sans-serif', letterSpacing: '0.1em' }}>
              OR ENTER CUSTOM BRANCH:
            </span>
            <div className="flex items-center gap-2 mt-1.5">
              <input
                type="text"
                placeholder="branch name..."
                defaultValue="enhanced-by-brain"
                className="dalek-input flex-1 px-3 py-2 text-xs"
                onChange={(e) => onUpdateRepoConfig('branch', e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onSendMessage(`branch: ${e.target.value || 'enhanced-by-brain'}`);
                  }
                }}
              />
              <button
                onClick={() => onSendMessage(`branch: ${systemState.repoConfig.branch || 'enhanced-by-brain'}`)}
                className="dalek-btn dalek-btn-primary px-3 py-2 text-xs"
              >
                SET
              </button>
            </div>
          </div>
        </div>
      );
    }

    // GitHub token step
    if (stepId === 'github') {
      const currentValue = systemState.apiKeys.github;
      const status = systemState.connectionStatus.github;

      return (
        <div className="space-y-3 p-4" style={{ borderTop: `1px solid ${COLORS.panelBorder}` }}>
          <div
            className="px-3 py-2 rounded text-xs mb-2"
            style={{
              color: COLORS.cyan,
              background: 'rgba(0, 255, 204, 0.03)',
              border: '1px solid rgba(0, 255, 204, 0.1)',
            }}
          >
            Dalek Brain Engine: ONLINE (built-in) | No external APIs
          </div>
          <div className="flex items-center gap-2">
            <input
              type="password"
              placeholder={setupStep.placeholder}
              className="dalek-input flex-1 px-4 py-3 text-sm"
              value={currentValue}
              onChange={(e) => onUpdateKey('github', e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && currentValue.trim()) {
                  onTestConnection('github', currentValue);
                }
              }}
            />
            <button
              onClick={() => onTestConnection('github', currentValue)}
              disabled={!currentValue.trim() || status === 'testing'}
              className="dalek-btn dalek-btn-primary px-4 py-3 text-xs whitespace-nowrap"
            >
              {status === 'testing' ? (
                <span className="flex items-center gap-1">
                  <Loader2 size={12} className="animate-spin" />
                  TESTING
                </span>
              ) : (
                <span>CONNECT</span>
              )}
            </button>
          </div>
          {status !== 'idle' && (
            <div
              className="px-3 py-2 rounded text-xs"
              style={{
                color: status === 'connected' ? COLORS.cyan : COLORS.dalekRed,
                background: status === 'connected' ? 'rgba(0, 255, 204, 0.05)' : 'rgba(255, 32, 32, 0.05)',
                border: `1px solid ${status === 'connected' ? 'rgba(0, 255, 204, 0.1)' : 'rgba(255, 32, 32, 0.1)'}`,
              }}
            >
              {getStatusText(status)} — GitHub {status === 'connected' ? 'connected successfully.' : 'connection failed. Try again, OPERATOR.'}
            </div>
          )}
          {status === 'connected' && (
            <button
              onClick={() => onSendMessage('github: configured')}
              className="dalek-btn dalek-btn-secondary px-4 py-2 text-xs w-full"
            >
              CONTINUE
            </button>
          )}
        </div>
      );
    }

    // LLM provider keys step
    if (stepId === 'llm-keys') {
      const providers = [
        { id: 'grok', label: 'Grok (xAI)', color: '#ff6b6b', placeholder: 'xai-...' },
        { id: 'cerebras', label: 'Cerebras', color: '#00ccff', placeholder: 'csk-...' },
        { id: 'claude', label: 'Anthropic Claude', color: '#d4a017', placeholder: 'sk-ant-...' },
        { id: 'gemini', label: 'Google Gemini', color: '#4285f4', placeholder: 'AIza...' },
      ] as const;

      const connectedCount = providers.filter(p => systemState.connectionStatus[p.id] === 'connected').length;

      return (
        <div className="space-y-3 p-4" style={{ borderTop: `1px solid ${COLORS.panelBorder}` }}>
          <div
            className="px-3 py-2 rounded text-xs mb-2"
            style={{
              color: COLORS.gold,
              background: 'rgba(212, 160, 23, 0.05)',
              border: '1px solid rgba(212, 160, 23, 0.1)',
            }}
          >
            {connectedCount > 0
              ? `${connectedCount} provider${connectedCount !== 1 ? 's' : ''} connected. All keys are optional.`
              : 'No providers connected yet. Dalek Brain will be used for analysis.'}
          </div>

          {providers.map((provider) => {
            const status = systemState.connectionStatus[provider.id];
            const keyValue = systemState.apiKeys[provider.id] || '';

            return (
              <div key={provider.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span
                    style={{
                      fontFamily: 'var(--font-orbitron), sans-serif',
                      fontSize: '9px',
                      letterSpacing: '0.1em',
                      color: provider.color,
                    }}
                  >
                    {provider.label.toUpperCase()}
                  </span>
                  {status === 'connected' && (
                    <span
                      style={{
                        fontSize: '8px',
                        color: COLORS.green,
                        fontFamily: 'var(--font-share-tech-mono), monospace',
                      }}
                    >
                      ONLINE
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    placeholder={provider.placeholder}
                    className="dalek-input flex-1 px-3 py-2 text-xs"
                    value={keyValue}
                    onChange={(e) => onUpdateKey(provider.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        onTestConnection(provider.id, e.currentTarget.value);
                      }
                    }}
                    style={{
                      borderColor: status === 'connected'
                        ? `${COLORS.green}30`
                        : status === 'error'
                          ? `${COLORS.dalekRed}30`
                          : undefined,
                    }}
                  />
                  <button
                    onClick={() => onTestConnection(provider.id, keyValue)}
                    disabled={!keyValue.trim() || status === 'testing'}
                    className="px-3 py-2 text-xs transition-all whitespace-nowrap"
                    style={{
                      color: provider.color,
                      background: `${provider.color}08`,
                      border: `1px solid ${provider.color}25`,
                      cursor: keyValue.trim() && status !== 'testing' ? 'pointer' : 'not-allowed',
                      opacity: keyValue.trim() && status !== 'testing' ? 1 : 0.4,
                      fontFamily: 'var(--font-orbitron), sans-serif',
                      fontSize: '8px',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {status === 'testing' ? (
                      <span className="flex items-center gap-1">
                        <Loader2 size={10} className="animate-spin" />
                        TEST
                      </span>
                    ) : status === 'connected' ? (
                      'RE-TEST'
                    ) : (
                      'TEST'
                    )}
                  </button>
                </div>
                {status === 'error' && (
                  <div
                    className="px-2 py-1 rounded text-xs"
                    style={{
                      color: COLORS.dalekRed,
                      fontSize: '9px',
                    }}
                  >
                    Connection failed. Check your key, OPERATOR.
                  </div>
                )}
              </div>
            );
          })}

          <button
            onClick={() => onSendMessage('skip')}
            className="dalek-btn dalek-btn-secondary px-6 py-2 text-xs w-full mt-2"
          >
            SKIP — USE DALEK BRAIN ONLY
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div
      className="flex flex-col h-full min-h-[50vh] lg:min-h-0"
      style={{
        background: `linear-gradient(180deg, rgba(5,0,0,0.98) 0%, rgba(0,0,0,0.98) 100%)`,
      }}
    >
      {/* Chat header */}
      <div
        className="px-4 py-3 flex items-center justify-between flex-shrink-0"
        style={{
          borderBottom: `1px solid rgba(255, 32, 32, 0.15)`,
          background: 'linear-gradient(180deg, rgba(17, 0, 0, 0.6) 0%, transparent 100%)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full dalek-eye flex-shrink-0"
            style={{ background: COLORS.dalekRed }}
          />
          <span
            style={{
              fontFamily: 'var(--font-orbitron), sans-serif',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.15em',
              color: COLORS.dalekRed,
            }}
          >
            COMMUNICATION CHANNEL
          </span>
        </div>
        <span
          style={{
            fontFamily: 'var(--font-orbitron), sans-serif',
            fontSize: '10px',
            color: COLORS.textMuted,
          }}
        >
          {messages.length} MSGS
        </span>
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto dalek-scrollbar p-4 space-y-3 min-h-0">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {isLoading && (
          <div className="message-animate flex justify-start">
            <div className="chat-caan rounded-lg p-3 mr-12">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0 pulse-red"
                  style={{ background: COLORS.dalekRed }}
                />
                <span
                  style={{
                    fontFamily: 'var(--font-orbitron), sans-serif',
                    fontSize: '9px',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    color: COLORS.dalekRed,
                  }}
                >
                  DARLEK CANN
                </span>
              </div>
              <div className="flex items-center gap-1.5 py-1">
                <div className="typing-dot w-2 h-2 rounded-full" style={{ background: COLORS.dalekRed }} />
                <div className="typing-dot w-2 h-2 rounded-full" style={{ background: COLORS.dalekRed }} />
                <div className="typing-dot w-2 h-2 rounded-full" style={{ background: COLORS.dalekRed }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Setup input area */}
      {!systemState.setupComplete && renderSetupInput()}

      {/* Free text input (after setup) */}
      {systemState.setupComplete && (
        <div className="p-3 flex-shrink-0" style={{ borderTop: `1px solid ${COLORS.panelBorder}` }}>
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Speak, OPERATOR..."
              rows={1}
              className="dalek-input flex-1 px-4 py-3 text-sm resize-none"
              style={{ minHeight: '42px', maxHeight: '120px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="dalek-btn dalek-btn-primary px-4 py-3"
              style={{ minWidth: '42px' }}
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
