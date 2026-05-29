export type RawEntry = {
  timestamp?: string;
  type: string;
  payload?: unknown;
  git?: SessionGit;
  [key: string]: unknown;
};

export type SessionGit = {
  commit_hash?: string;
  branch?: string;
  repository_url?: string;
};

export type ContentBlock =
  | { type: 'input_text'; text: string }
  | { type: 'output_text'; text: string }
  | { type: string; [key: string]: unknown };

export type CodexTokenUsage = {
  input_tokens?: number;
  cached_input_tokens?: number;
  output_tokens?: number;
  reasoning_output_tokens?: number;
  total_tokens?: number;
};

export type TokenCountInfo = {
  total_token_usage?: CodexTokenUsage;
  last_token_usage?: CodexTokenUsage;
  model_context_window?: number;
};

export type ParsedMessage = {
  id: string;
  entryIndex: number;
  timestamp: string;
  turnId: string | null;
  role: string;
  phase: string | null;
  text: string;
  source: 'response_item' | 'event_msg';
  collapsedByDefault: boolean;
};

export type ParsedReasoning = {
  id: string;
  entryIndex: number;
  timestamp: string;
  turnId: string | null;
  hasEncryptedContent: boolean;
  summaryText: string;
};

export type ParsedToolCall = {
  id: string;
  callId: string;
  turnId: string | null;
  name: string;
  kind: 'function' | 'custom';
  timestamp: string;
  outputTimestamp: string | null;
  durationMs: number | null;
  arguments: unknown;
  rawArguments: string;
  output: string | null;
  status: 'success' | 'error' | 'unknown';
  patchChanges?: unknown;
  parentCallId?: string | null;
};

export type ParsedTokenPoint = {
  id: string;
  entryIndex: number;
  timestamp: string;
  turnId: string | null;
  total: CodexTokenUsage;
  last: CodexTokenUsage;
  contextWindow: number | null;
  rateLimits: CodexRateLimits | null;
};

export type CodexRateLimitWindow = {
  used_percent?: number;
  window_minutes?: number;
  resets_at?: string | null;
};

export type CodexRateLimits = {
  limit_id?: string;
  limit_name?: string | null;
  primary?: CodexRateLimitWindow;
  secondary?: CodexRateLimitWindow;
  credits?: unknown;
  plan_type?: string | null;
  rate_limit_reached_type?: string | null;
};

export type ParsedTurn = {
  id: string;
  startedAt: string;
  cwd: string | null;
  model: string | null;
  effort: string | null;
  entryStart: number;
  entryEnd: number;
  title: string;
};

export type ParseWarning = {
  line?: number;
  entryIndex?: number;
  message: string;
};

export type GraphNode = {
  id: string;
  type: 'turn' | 'message' | 'tool' | 'output' | 'patch';
  label: string;
  timestamp: string;
  refId?: string;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
};

export type TurnGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export type SessionSummary = {
  id: string;
  filePath: string;
  cwd: string;
  title: string;
  startedAt: string;
  endedAt: string;
  messageCount: number;
  toolCallCount: number;
  turnCount: number;
  totalTokens: CodexTokenUsage;
  contextWindow: number | null;
  remainingTokens: number | null;
  rateLimits: CodexRateLimits | null;
  estimatedCostUsd: number | null;
  model: string | null;
  cliVersion: string | null;
  gitBranch: string | null;
  hasPatch: boolean;
  hasErrors: boolean;
};

export type SessionDetail = SessionSummary & {
  entries: RawEntry[];
  messages: ParsedMessage[];
  reasoning: ParsedReasoning[];
  turns: ParsedTurn[];
  toolCalls: ParsedToolCall[];
  tokenPoints: ParsedTokenPoint[];
  graph: TurnGraph;
  parseWarnings: ParseWarning[];
};

export type ProjectSummary = {
  id: string;
  cwd: string;
  sessionCount: number;
  totalTokens: number;
  lastActiveAt: string;
};

export type SearchResult = {
  sessionId: string;
  filePath: string;
  cwd: string;
  title: string;
  startedAt: string;
  matches: Array<{
    type: 'message' | 'tool';
    timestamp: string;
    excerpt: string;
  }>;
};
