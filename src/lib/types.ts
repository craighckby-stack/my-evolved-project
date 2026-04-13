export interface Message {
  id: string;
  role: 'caan' | 'operator' | 'system';
  content: string;
  timestamp: Date;
}

export interface ApiKeys {
  github: string;
  grok?: string;
  cerebras?: string;
  claude?: string;
  gemini?: string;
}

export type ConnectionStatusValue = 'idle' | 'testing' | 'connected' | 'error';

export interface ConnectionStatus {
  github: ConnectionStatusValue;
  grok?: ConnectionStatusValue;
  cerebras?: ConnectionStatusValue;
  claude?: ConnectionStatusValue;
  gemini?: ConnectionStatusValue;
}

export interface RepoConfig {
  owner: string;
  repo: string;
  branch: string;
}

export interface SystemState {
  setupComplete: boolean;
  currentStep: number;
  connectionStatus: ConnectionStatus;
  apiKeys: ApiKeys;
  repoConfig: RepoConfig;
  evolutionCycle: number;
  saturation: SaturationMetrics;
  sessionStart: Date;
}

export interface SaturationMetrics {
  structuralChange: number;
  semanticSaturation: number;
  velocity: number;
  identityPreservation: number;
  capabilityAlignment: number;
  crossFileImpact: number;
}

export interface EvolutionLogEntry {
  id: string;
  type: 'SCAN' | 'MUTATE' | 'APPROVE' | 'REJECT' | 'ERROR' | 'HEALTH' | 'SYSTEM' | 'CONNECT';
  description: string;
  timestamp: Date;
  details?: string;
}

export interface GitHubFile {
  path: string;
  size: number;
  type: string;
  sha?: string;
}

export interface MutationProposal {
  analysis: string;
  proposedCode: string;
  riskScore: number;
  affectedFiles: string[];
}

export interface HealthCheckResult {
  metrics: SaturationMetrics;
  overallHealth: 'healthy' | 'warning' | 'critical';
}

export interface ChatRequestBody {
  message: string;
  history: Message[];
  systemState: SystemState;
}

export interface TestConnectionBody {
  provider: 'github' | 'grok' | 'cerebras' | 'claude' | 'gemini';
  key: string;
}

export interface ScanRepoBody {
  token: string;
  owner: string;
  repo: string;
  branch: string;
}

export interface ReadFileBody {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  path: string;
}

export interface ProposeBody {
  fileContent: string;
  filePath: string;
  apiKeys?: ApiKeys;
  rejectionMemory?: Array<{ filePath: string; reason: string; analysis: string; riskScore: number }>;
}

export interface DebateAgent {
  id: string;
  name: string;
  status: 'active' | 'idle';
  color: string;
  icon: string;
}

export interface WriteFileBody {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  path: string;
  content: string;
  sha: string;
  commitMessage?: string;
}

export interface PendingMutation {
  id: string;
  filePath: string;
  fileSha: string;
  originalContent: string;
  proposedCode: string;
  analysis: string;
  riskScore: number;
  affectedFiles: string[];
  status: 'pending' | 'approved' | 'rejected' | 'applied';
  timestamp: Date;
}

export interface CoherenceGateResult {
  passed: boolean;
  reason: string;
  riskScore: number;
  saturationWarning: boolean;
}

export interface DebateState {
  agents: DebateAgent[];
  currentTopic: string;
  isActive: boolean;
}

export interface AgentVote {
  agentId: string;
  agentName: string;
  vote: 'approve' | 'reject' | 'abstain';
  confidence: number;
  reasoning: string;
  provider: string;
}

export interface DebateResult {
  success: boolean;
  votes: AgentVote[];
  consensus: 'APPROVE' | 'REJECT' | 'TIED';
  approvals: number;
  rejections: number;
  abstains: number;
  summary: string;
}

export interface RejectionMemory {
  id: string;
  filePath: string;
  reason: string;
  analysis: string;
  riskScore: number;
  timestamp: Date;
}

export interface BranchInfo {
  name: string;
  default: boolean;
}

export interface ImpactAnalysis {
  staticIssues: Array<{ type: string; severity: string; message: string }>;
  llmAnalysis: string;
  llmProvider: string;
  totalIssues: number;
  highSeverity: number;
  mediumSeverity: number;
  lowSeverity: number;
  overallRisk: string;
  summary: string;
}
