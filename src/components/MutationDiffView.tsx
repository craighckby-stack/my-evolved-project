'use client';

import { useState } from 'react';
import type { PendingMutation } from '@/lib/types';
import { COLORS } from '@/lib/constants';
import { FileCode, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface MutationDiffViewProps {
  mutation: PendingMutation;
  onApprove: () => void;
  onReject: () => void;
  disabled: boolean;
}

export default function MutationDiffView({ mutation, onApprove, onReject, disabled }: MutationDiffViewProps) {
  const [showOriginal, setShowOriginal] = useState(false);
  const [showProposed, setShowProposed] = useState(false);

  const riskLabel = mutation.riskScore <= 3 ? 'LOW' : mutation.riskScore <= 6 ? 'MEDIUM' : mutation.riskScore <= 8 ? 'HIGH' : 'CRITICAL';
  const riskColor = mutation.riskScore <= 3 ? COLORS.cyan : mutation.riskScore <= 6 ? COLORS.gold : COLORS.dalekRed;

  const truncate = (code: string, maxLines: number = 20) => {
    const lines = code.split('\n');
    if (lines.length <= maxLines) return code;
    return lines.slice(0, maxLines).join('\n') + `\n\n... (${lines.length - maxLines} more lines)`;
  };

  const originalSize = (mutation.originalContent.length / 1024).toFixed(1);
  const proposedSize = (mutation.proposedCode.length / 1024).toFixed(1);
  const sizeDiff = ((mutation.proposedCode.length - mutation.originalContent.length) / mutation.originalContent.length * 100).toFixed(0);
  const sizeDiffSign = mutation.proposedCode.length > mutation.originalContent.length ? '+' : '';

  return (
    <div
      className="space-y-3 p-4 mx-3 mb-3 rounded-lg"
      style={{
        background: 'linear-gradient(135deg, rgba(185, 28, 28, 0.05) 0%, rgba(212, 160, 23, 0.03) 100%)',
        border: `1px solid ${riskColor}25`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} style={{ color: riskColor }} />
          <span
            style={{
              fontFamily: 'var(--font-orbitron), sans-serif',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: riskColor,
            }}
          >
            MUTATION PROPOSAL [{riskLabel}]
          </span>
        </div>
        <span
          style={{
            fontSize: '8px',
            color: COLORS.textMuted,
            fontFamily: 'var(--font-share-tech-mono), monospace',
          }}
        >
          Risk: {mutation.riskScore}/10
        </span>
      </div>

      {/* File info */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-sm" style={{ background: '#080808' }}>
        <FileCode size={11} style={{ color: COLORS.gold }} />
        <span style={{ fontSize: '10px', color: COLORS.gold, fontFamily: 'var(--font-share-tech-mono), monospace' }}>
          {mutation.filePath}
        </span>
        <span className="ml-auto" style={{ fontSize: '9px', color: COLORS.textMuted }}>
          {originalSize}KB → {proposedSize}KB ({sizeDiffSign}{sizeDiff}%)
        </span>
      </div>

      {/* Analysis */}
      <div className="px-3 py-2 rounded-sm" style={{ background: '#060606' }}>
        <span
          style={{
            display: 'block',
            fontSize: '8px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            fontFamily: 'var(--font-orbitron), sans-serif',
            color: COLORS.textMuted,
            marginBottom: '6px',
          }}
        >
          ANALYSIS
        </span>
        <p style={{ fontSize: '11px', color: COLORS.textDim, lineHeight: 1.5, fontFamily: 'var(--font-share-tech-mono), monospace' }}>
          {mutation.analysis}
        </p>
      </div>

      {/* Affected files */}
      {mutation.affectedFiles.length > 0 && (
        <div className="px-3 py-2 rounded-sm" style={{ background: '#060606' }}>
          <span
            style={{
              display: 'block',
              fontSize: '8px',
              fontWeight: 700,
              letterSpacing: '0.1em',
              fontFamily: 'var(--font-orbitron), sans-serif',
              color: COLORS.gold,
              marginBottom: '4px',
            }}
          >
            AFFECTED FILES ({mutation.affectedFiles.length})
          </span>
          {mutation.affectedFiles.map((f) => (
            <div key={f} style={{ fontSize: '10px', color: COLORS.textDim, fontFamily: 'var(--font-share-tech-mono), monospace' }}>
              • {f}
            </div>
          ))}
        </div>
      )}

      {/* Original code toggle */}
      <div>
        <button
          onClick={() => setShowOriginal(!showOriginal)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-sm"
          style={{
            background: '#080808',
            border: '1px solid rgba(255, 32, 32, 0.08)',
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: '9px', color: COLORS.dalekRed, fontFamily: 'var(--font-orbitron), sans-serif', letterSpacing: '0.08em' }}>
            ORIGINAL CODE
          </span>
          {showOriginal ? <ChevronUp size={12} style={{ color: COLORS.textMuted }} /> : <ChevronDown size={12} style={{ color: COLORS.textMuted }} />}
        </button>
        {showOriginal && (
          <pre
            className="px-3 py-2 mt-1 rounded-sm overflow-x-auto dalek-scrollbar"
            style={{
              fontSize: '10px',
              color: COLORS.textDim,
              background: '#050505',
              fontFamily: 'var(--font-share-tech-mono), monospace',
              lineHeight: 1.4,
              maxHeight: '300px',
              overflow: 'auto',
              border: '1px solid rgba(255, 32, 32, 0.06)',
            }}
          >
            {truncate(mutation.originalContent, 50)}
          </pre>
        )}
      </div>

      {/* Proposed code toggle */}
      <div>
        <button
          onClick={() => setShowProposed(!showProposed)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-sm"
          style={{
            background: '#080808',
            border: '1px solid rgba(0, 255, 204, 0.08)',
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: '9px', color: COLORS.cyan, fontFamily: 'var(--font-orbitron), sans-serif', letterSpacing: '0.08em' }}>
            PROPOSED CODE
          </span>
          {showProposed ? <ChevronUp size={12} style={{ color: COLORS.textMuted }} /> : <ChevronDown size={12} style={{ color: COLORS.textMuted }} />}
        </button>
        {showProposed && (
          <pre
            className="px-3 py-2 mt-1 rounded-sm overflow-x-auto dalek-scrollbar"
            style={{
              fontSize: '10px',
              color: '#e0e0e0',
              background: '#050505',
              fontFamily: 'var(--font-share-tech-mono), monospace',
              lineHeight: 1.4,
              maxHeight: '300px',
              overflow: 'auto',
              border: '1px solid rgba(0, 255, 204, 0.06)',
            }}
          >
            {truncate(mutation.proposedCode, 50)}
          </pre>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={onReject}
          disabled={disabled}
          className="dalek-btn dalek-btn-red flex-1 px-4 py-2.5 text-xs flex items-center justify-center gap-2"
        >
          <XCircle size={13} />
          REJECT
        </button>
        <button
          onClick={onApprove}
          disabled={disabled}
          className="dalek-btn dalek-btn-green flex-1 px-4 py-2.5 text-xs flex items-center justify-center gap-2"
        >
          <CheckCircle size={13} />
          APPROVE
        </button>
      </div>
    </div>
  );
}
