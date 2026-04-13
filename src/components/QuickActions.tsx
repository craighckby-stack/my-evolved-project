'use client';

import { Search, FileCode, Dna, Heart, Eye, Users, Upload, Rocket, ListChecks, CheckCircle2, RotateCcw } from 'lucide-react';
import { COLORS } from '@/lib/constants';

interface QuickActionsProps {
  onAction: (action: string) => void;
  disabled: boolean;
  pushStatus?: 'idle' | 'pushing' | 'success' | 'error';
  deployStatus?: 'idle' | 'deploying' | 'success' | 'error';
  rebootStatus?: 'idle' | 'rebooting' | 'success' | 'error';
  batchMode?: boolean;
  autoApprove?: boolean;
  onToggleAutoApprove?: () => void;
}

const actions = [
  { id: 'scan', label: 'SCAN REPOSITORY', icon: Search, color: COLORS.cyan },
  { id: 'analyze', label: 'ANALYZE FILE', icon: FileCode, color: COLORS.gold },
  { id: 'propose', label: 'PROPOSE MUTATION', icon: Dna, color: COLORS.purple },
  { id: 'propose-all', label: 'SELECT ALL', icon: ListChecks, color: '#00ccff' },
  { id: 'health', label: 'HEALTH CHECK', icon: Heart, color: COLORS.dalekRed },
  { id: 'saturation', label: 'VIEW SATURATION', icon: Eye, color: COLORS.electricBlue },
  { id: 'debate', label: 'DEBATE CHAMBER', icon: Users, color: COLORS.purple },
  { id: 'push-enhancements', label: 'PUSH FILES', icon: Upload, color: COLORS.green },
  { id: 'deploy-new-repo', label: 'DEPLOY NEW REPO', icon: Rocket, color: '#ff6600' },
  { id: 'reboot-system', label: 'REBOOT SYSTEM', icon: RotateCcw, color: '#ff00ff' },
];

export default function QuickActions({ onAction, disabled, pushStatus, deployStatus, rebootStatus, batchMode, autoApprove, onToggleAutoApprove }: QuickActionsProps) {
  return (
    <div className="px-3 py-3 flex-shrink-0" style={{ borderTop: `1px solid ${COLORS.panelBorder}` }}>
      <div className="flex items-center justify-between mb-2">
        <div
          className="flex items-center gap-2"
          style={{
            fontFamily: 'var(--font-orbitron), sans-serif',
            fontSize: '8px',
            letterSpacing: '0.15em',
            color: COLORS.textMuted,
          }}
        >
          <span>&#9673;</span>
          <span>QUICK ACTIONS</span>
        </div>
        <div className="flex items-center gap-2">
          {autoApprove !== undefined && onToggleAutoApprove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleAutoApprove();
              }}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm transition-all duration-200 cursor-pointer"
              style={{
                fontFamily: 'var(--font-orbitron), sans-serif',
                fontSize: '7px',
                letterSpacing: '0.1em',
                color: autoApprove ? '#00ff88' : COLORS.textMuted,
                background: autoApprove ? 'rgba(0, 255, 136, 0.1)' : 'transparent',
                border: `1px solid ${autoApprove ? 'rgba(0, 255, 136, 0.4)' : 'rgba(255,255,255,0.1)'}`,
              }}
              title={autoApprove ? 'Auto-approve ON — all mutations applied automatically' : 'Auto-approve OFF — you approve each mutation manually'}
            >
              <CheckCircle2 size={9} style={{ opacity: autoApprove ? 1 : 0.4 }} />
              <span>AUTO APPROVE</span>
              <div
                className="relative w-5 h-2.5 rounded-full transition-colors duration-200"
                style={{
                  background: autoApprove ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255,255,255,0.1)',
                }}
              >
                <div
                  className="absolute top-0.5 w-1.5 h-1.5 rounded-full transition-all duration-200"
                  style={{
                    left: autoApprove ? '10px' : '2px',
                    background: autoApprove ? '#00ff88' : '#555',
                    boxShadow: autoApprove ? '0 0 6px rgba(0, 255, 136, 0.5)' : 'none',
                  }}
                />
              </div>
            </button>
          )}
          {batchMode && (
            <div
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm"
              style={{
                fontFamily: 'var(--font-orbitron), sans-serif',
                fontSize: '7px',
                letterSpacing: '0.1em',
                color: '#00ccff',
                background: 'rgba(0, 204, 255, 0.1)',
                border: '1px solid rgba(0, 204, 255, 0.25)',
              }}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00ccff' }} />
              BATCH MODE
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {actions.map(({ id, label, icon: Icon, color }) => {
          const isPushing = id === 'push-enhancements' && pushStatus === 'pushing';
          const isDeploying = id === 'deploy-new-repo' && deployStatus === 'deploying';
          const isRebooting = id === 'reboot-system' && rebootStatus === 'rebooting';
          const isBusy = isPushing || isDeploying || isRebooting;
          const isActionDisabled = disabled || isBusy;

          let statusColor = color;
          if (id === 'push-enhancements' && pushStatus === 'success') statusColor = COLORS.green;
          if (id === 'push-enhancements' && pushStatus === 'error') statusColor = COLORS.dalekRed;
          if (id === 'deploy-new-repo' && deployStatus === 'success') statusColor = COLORS.green;
          if (id === 'deploy-new-repo' && deployStatus === 'error') statusColor = COLORS.dalekRed;
          if (id === 'reboot-system' && rebootStatus === 'success') statusColor = COLORS.green;
          if (id === 'reboot-system' && rebootStatus === 'error') statusColor = COLORS.dalekRed;
          if (id === 'propose-all' && batchMode) statusColor = '#00ccff';

          return (
            <button
              key={id}
              onClick={() => onAction(id)}
              disabled={isActionDisabled}
              className="flex items-center gap-1.5 px-3 py-2 rounded-sm text-[10px] transition-all duration-200"
              style={{
                fontFamily: 'var(--font-orbitron), sans-serif',
                fontWeight: 500,
                letterSpacing: '0.05em',
                background: isActionDisabled ? '#1a1a1a' : `${color}06`,
                color: isActionDisabled ? '#333' : statusColor,
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: id === 'propose-all' && batchMode ? 'rgba(0, 204, 255, 0.4)' : (isActionDisabled ? '#1a1a1a' : `${color}25`),
                cursor: isActionDisabled ? 'not-allowed' : 'pointer',
                ...(id === 'propose-all' && batchMode ? {
                  boxShadow: '0 0 12px rgba(0, 204, 255, 0.2)',
                } : {}),
              }}
              onMouseEnter={(e) => {
                if (!isActionDisabled) {
                  e.currentTarget.style.background = `${color}15`;
                  e.currentTarget.style.boxShadow = `0 0 10px ${color}20, inset 0 0 20px ${color}05`;
                  e.currentTarget.style.borderColor = `${color}50`;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActionDisabled) {
                  e.currentTarget.style.background = `${color}06`;
                  e.currentTarget.style.boxShadow = id === 'propose-all' && batchMode ? '0 0 12px rgba(0, 204, 255, 0.2)' : 'none';
                  e.currentTarget.style.borderColor = id === 'propose-all' && batchMode ? 'rgba(0, 204, 255, 0.4)' : `${color}25`;
                }
              }}
            >
              <Icon size={11} className={isBusy ? 'animate-spin' : ''} />
              <span>&#9673;</span>
              {isPushing ? 'PUSHING...' : isDeploying ? 'DEPLOYING...' : isRebooting ? 'REBOOTING...' : label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
