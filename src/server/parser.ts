import { basename } from 'node:path';
import type {
  CodexTokenUsage,
  GraphEdge,
  GraphNode,
  ParsedMessage,
  ParsedReasoning,
  ParsedTokenPoint,
  ParsedToolCall,
  ParsedTurn,
  ParseWarning,
  RawEntry,
  SessionDetail,
  SessionSummary,
  TurnGraph
} from '../lib/types';
import { excerpt, sumTokens } from '../lib/format';
import { calcCost } from './pricing';

type CallDraft = {
  entryIndex: number;
  timestamp: string;
  turnId: string | null;
  callId: string;
  name: string;
  kind: 'function' | 'custom';
  rawArguments: string;
  arguments: unknown;
};

type OutputDraft = {
  timestamp: string;
  output: string;
};

export async function parseSessionFileUncached(filePath: string, detail: true): Promise<SessionDetail>;
export async function parseSessionFileUncached(filePath: string, detail?: false): Promise<SessionSummary>;
export async function parseSessionFileUncached(filePath: string, detail = false) {
  const text = await Bun.file(filePath).text();
  const warnings: ParseWarning[] = [];
  const entries: RawEntry[] = [];

  text.split(/\n/).forEach((line, index) => {
    if (!line.trim()) return;
    try {
      const entry = JSON.parse(line) as RawEntry;
      entries.push(entry);
    } catch (err) {
      warnings.push({ line: index + 1, message: `JSON parse failed: ${(err as Error).message}` });
    }
  });

  const parsed = parseEntries(filePath, entries, warnings);
  if (detail) return parsed;
  const { entries: _entries, messages: _messages, reasoning: _reasoning, turns: _turns, toolCalls: _toolCalls, tokenPoints: _tokenPoints, graph: _graph, parseWarnings: _parseWarnings, ...summary } = parsed;
  return summary;
}

function parseEntries(filePath: string, entries: RawEntry[], warnings: ParseWarning[]): SessionDetail {
  let currentTurnId: string | null = null;
  let sessionId = idFromFile(filePath);
  let cwd = '';
  let cliVersion: string | null = null;
  let gitBranch: string | null = null;
  let model: string | null = null;
  let startedAt = entries[0]?.timestamp || new Date().toISOString();
  let endedAt = entries.at(-1)?.timestamp || startedAt;
  const messages: ParsedMessage[] = [];
  const reasoning: ParsedReasoning[] = [];
  const tokenPoints: ParsedTokenPoint[] = [];
  const calls = new Map<string, CallDraft>();
  const outputs = new Map<string, OutputDraft>();
  const patchChanges = new Map<string, unknown>();
  const turns = new Map<string, ParsedTurn>();
  const seenTimelineText = new Set<string>();
  let lastTotalUsage: CodexTokenUsage = {};

  entries.forEach((entry, entryIndex) => {
    const timestamp = entry.timestamp || startedAt;
    const payload = asRecord(entry.payload);

    if (entry.type === 'session_meta') {
      const session = payload;
      sessionId = stringValue(session.id) || sessionId;
      startedAt = stringValue(session.timestamp) || timestamp || startedAt;
      cwd = stringValue(session.cwd) || cwd;
      cliVersion = stringValue(session.cli_version) || cliVersion;
      gitBranch = stringValue(asRecord(entry.git).branch) || gitBranch;
    }

    if (entry.type === 'turn_context') {
      const turnId = stringValue(payload.turn_id) || `turn-${entryIndex}`;
      currentTurnId = turnId;
      cwd = stringValue(payload.cwd) || cwd;
      model = stringValue(payload.model) || model;
      ensureTurn(turns, turnId, {
        id: turnId,
        startedAt: timestamp,
        cwd: stringValue(payload.cwd),
        model: stringValue(payload.model),
        effort: stringValue(payload.effort),
        entryStart: entryIndex,
        entryEnd: entryIndex,
        title: 'Untitled turn'
      });
    }

    if (entry.type === 'event_msg') {
      const eventType = stringValue(payload.type);
      const turnId = stringValue(payload.turn_id);
      if (eventType === 'task_started' && turnId) {
        currentTurnId = turnId;
        ensureTurn(turns, turnId, {
          id: turnId,
          startedAt: timestamp,
          cwd,
          model,
          effort: null,
          entryStart: entryIndex,
          entryEnd: entryIndex,
          title: 'Untitled turn'
        });
      }

      if (eventType === 'user_message') {
        addMessage(messages, seenTimelineText, {
          id: `msg-${entryIndex}`,
          entryIndex,
          timestamp,
          turnId: currentTurnId,
          role: 'user',
          phase: null,
          text: stringValue(payload.message),
          source: 'event_msg',
          collapsedByDefault: false
        });
      }

      if (eventType === 'agent_message') {
        addMessage(messages, seenTimelineText, {
          id: `msg-${entryIndex}`,
          entryIndex,
          timestamp,
          turnId: currentTurnId,
          role: 'assistant',
          phase: stringValue(payload.phase),
          text: stringValue(payload.message),
          source: 'event_msg',
          collapsedByDefault: false
        });
      }

      if (eventType === 'token_count') {
        const info = asRecord(payload.info);
        const total = usageValue(info.total_token_usage) || lastTotalUsage;
        const last = usageValue(info.last_token_usage) || {};
        lastTotalUsage = total;
        tokenPoints.push({
          id: `tok-${entryIndex}`,
          entryIndex,
          timestamp,
          turnId: currentTurnId,
          total,
          last,
          contextWindow: numberValue(info.model_context_window),
          rateLimits: rateLimitsValue(payload.rate_limits)
        });
      }

      if (eventType === 'patch_apply_end') {
        const callId = stringValue(payload.call_id);
        if (callId) patchChanges.set(callId, payload.changes);
      }
    }

    if (entry.type === 'response_item') {
      const item = payload;
      const itemType = stringValue(item.type);
      if (itemType === 'message') {
        const role = stringValue(item.role);
        const text = contentText(item.content);
        addMessage(messages, seenTimelineText, {
          id: `msg-${entryIndex}`,
          entryIndex,
          timestamp,
          turnId: currentTurnId,
          role,
          phase: stringValue(item.phase),
          text,
          source: 'response_item',
          collapsedByDefault: role === 'system' || role === 'developer'
        });
      }

      if (itemType === 'reasoning') {
        reasoning.push({
          id: `reason-${entryIndex}`,
          entryIndex,
          timestamp,
          turnId: currentTurnId,
          hasEncryptedContent: typeof item.encrypted_content === 'string',
          summaryText: contentText(item.summary)
        });
      }

      if (itemType === 'function_call' || itemType === 'custom_tool_call') {
        const callId = stringValue(item.call_id) || `call-${entryIndex}`;
        const rawArguments = itemType === 'function_call'
          ? stringValue(item.arguments)
          : stringValue(item.input);
        calls.set(callId, {
          entryIndex,
          timestamp,
          turnId: currentTurnId,
          callId,
          name: stringValue(item.name) || 'unknown',
          kind: itemType === 'function_call' ? 'function' : 'custom',
          rawArguments,
          arguments: parseMaybeJson(rawArguments)
        });
      }

      if (itemType === 'function_call_output' || itemType === 'custom_tool_call_output') {
        const callId = stringValue(item.call_id);
        if (callId) {
          outputs.set(callId, {
            timestamp,
            output: stringValue(item.output)
          });
        }
      }
    }

    if (currentTurnId && turns.has(currentTurnId)) {
      turns.get(currentTurnId)!.entryEnd = entryIndex;
    }
  });

  for (const message of messages) {
    if (message.role === 'user' && !isBootstrapUserMessage(message.text) && message.turnId) {
      const turn = turns.get(message.turnId);
      if (turn && turn.title === 'Untitled turn') turn.title = firstQuestionLine(message.text);
    }
  }

  const toolCalls = [...calls.values()].map<ParsedToolCall>((call) => {
    const output = outputs.get(call.callId);
    const durationMs = output ? Math.max(0, new Date(output.timestamp).getTime() - new Date(call.timestamp).getTime()) : null;
    const outputText = output?.output ?? null;
    return {
      id: `tool-${call.entryIndex}`,
      callId: call.callId,
      turnId: call.turnId,
      name: call.name,
      kind: call.kind,
      timestamp: call.timestamp,
      outputTimestamp: output?.timestamp ?? null,
      durationMs,
      arguments: call.arguments,
      rawArguments: call.rawArguments,
      output: outputText,
      status: outputText == null ? 'unknown' : isErrorOutput(outputText) ? 'error' : 'success',
      patchChanges: patchChanges.get(call.callId),
      parentCallId: parentCallId(call.arguments)
    };
  });

  const title = messages.find((message) => message.role === 'user' && !isBootstrapUserMessage(message.text))?.text;
  const totalTokens = tokenPoints.at(-1)?.total ?? {};
  const currentWindowTokens = tokenPoints.at(-1)?.last ?? {};
  const contextWindow = tokenPoints.at(-1)?.contextWindow ?? null;
  const remainingTokens = contextWindow == null ? null : Math.max(0, contextWindow - sumTokens(currentWindowTokens));
  const rateLimits = latestUsableRateLimits(tokenPoints);
  const graph = buildGraph([...turns.values()], messages, toolCalls);
  const estimatedCostUsd = calcCost(model, totalTokens);
  const summary: SessionSummary = {
    id: sessionId,
    filePath,
    cwd: cwd || 'unknown',
    title: title ? firstQuestionLine(title) : basename(filePath),
    startedAt,
    endedAt,
    messageCount: messages.length,
    toolCallCount: toolCalls.length,
    turnCount: turns.size,
    totalTokens,
    contextWindow,
    remainingTokens,
    rateLimits,
    estimatedCostUsd,
    model,
    cliVersion,
    gitBranch,
    hasPatch: toolCalls.some((call) => call.name === 'apply_patch' || call.rawArguments.includes('*** Begin Patch')),
    hasErrors: toolCalls.some((call) => call.status === 'error') || warnings.length > 0
  };

  return {
    ...summary,
    entries,
    messages,
    reasoning,
    turns: [...turns.values()],
    toolCalls,
    tokenPoints,
    graph,
    parseWarnings: warnings
  };
}

function addMessage(messages: ParsedMessage[], seen: Set<string>, message: ParsedMessage) {
  if (!message.text) return;
  const key = `${message.role}:${message.phase || ''}:${message.text}`;
  if (seen.has(key)) return;
  seen.add(key);
  messages.push(message);
}

function ensureTurn(turns: Map<string, ParsedTurn>, id: string, turn: ParsedTurn) {
  if (!turns.has(id)) turns.set(id, turn);
}

function buildGraph(turns: ParsedTurn[], messages: ParsedMessage[], toolCalls: ParsedToolCall[]): TurnGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  for (const turn of turns) {
    nodes.push({ id: turn.id, type: 'turn', label: turn.title, timestamp: turn.startedAt, refId: turn.id });
  }
  for (const message of messages.filter((item) => item.role === 'assistant')) {
    const id = `g-${message.id}`;
    nodes.push({ id, type: 'message', label: excerpt(message.text, 50), timestamp: message.timestamp, refId: message.id });
    if (message.turnId) edges.push({ id: `${message.turnId}-${id}`, source: message.turnId, target: id });
  }
  for (const call of toolCalls) {
    const nodeId = `g-${call.id}`;
    const outputId = `g-out-${call.id}`;
    nodes.push({
      id: nodeId,
      type: call.name === 'apply_patch' ? 'patch' : 'tool',
      label: `${call.name} (${call.status})`,
      timestamp: call.timestamp,
      refId: call.callId
    });
    nodes.push({
      id: outputId,
      type: 'output',
      label: excerpt(call.output || 'No output', 50),
      timestamp: call.outputTimestamp || call.timestamp,
      refId: call.callId
    });
    if (call.turnId) edges.push({ id: `${call.turnId}-${nodeId}`, source: call.turnId, target: nodeId });
    edges.push({ id: `${nodeId}-${outputId}`, source: nodeId, target: outputId });
  }
  return { nodes, edges };
}

function contentText(value: unknown): string {
  if (!Array.isArray(value)) return '';
  return value.map((block) => {
    const item = asRecord(block);
    if (typeof item.text === 'string') return item.text;
    if (typeof item.content === 'string') return item.content;
    return '';
  }).filter(Boolean).join('\n');
}

function parseMaybeJson(value: string): unknown {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function parentCallId(value: unknown): string | null {
  const record = asRecord(value);
  if (Array.isArray(record.tool_uses)) return null;
  return stringValue(record.call_id) || null;
}

function isErrorOutput(output: string) {
  return /Process exited with code [1-9]|error|stderr/i.test(output);
}

function usageValue(value: unknown): CodexTokenUsage | null {
  const record = asRecord(value);
  if (!Object.keys(record).length) return null;
  return {
    input_tokens: numberValue(record.input_tokens) ?? undefined,
    cached_input_tokens: numberValue(record.cached_input_tokens) ?? undefined,
    output_tokens: numberValue(record.output_tokens) ?? undefined,
    reasoning_output_tokens: numberValue(record.reasoning_output_tokens) ?? undefined,
    total_tokens: numberValue(record.total_tokens) ?? sumTokens(record as CodexTokenUsage)
  };
}

function rateLimitsValue(value: unknown) {
  const record = asRecord(value);
  if (!Object.keys(record).length) return null;
  const primary = asRecord(record.primary);
  const secondary = asRecord(record.secondary);
  return {
    limit_id: stringValue(record.limit_id) || undefined,
    limit_name: stringValue(record.limit_name) || null,
    primary: {
      used_percent: numberValue(primary.used_percent) ?? undefined,
      window_minutes: numberValue(primary.window_minutes) ?? undefined,
      resets_at: stringValue(primary.resets_at) || null
    },
    secondary: {
      used_percent: numberValue(secondary.used_percent) ?? undefined,
      window_minutes: numberValue(secondary.window_minutes) ?? undefined,
      resets_at: stringValue(secondary.resets_at) || null
    },
    credits: record.credits,
    plan_type: stringValue(record.plan_type) || null,
    rate_limit_reached_type: stringValue(record.rate_limit_reached_type) || null
  };
}

function latestUsableRateLimits(points: ParsedTokenPoint[]) {
  return [...points].reverse().find((point) => {
    const primary = point.rateLimits?.primary?.used_percent;
    const secondary = point.rateLimits?.secondary?.used_percent;
    return typeof primary === 'number' || typeof secondary === 'number';
  })?.rateLimits ?? null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function idFromFile(filePath: string) {
  const name = basename(filePath, '.jsonl');
  return name.replace(/^rollout-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-/, '');
}

function isBootstrapUserMessage(text: string) {
  const trimmed = text.trimStart();
  return trimmed.startsWith('# AGENTS.md instructions')
    || trimmed.startsWith('<environment_context>')
    || trimmed.includes('<environment_context>');
}

function firstQuestionLine(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter((item) => item && !item.startsWith('<') && !item.startsWith('# AGENTS.md instructions'));
  const first = lines[0] || text;
  if (isWorkflowCommand(first)) {
    const detail = lines.slice(1).find((item) => !isListNoise(item));
    return excerpt(detail ? `${first} ${stripListMarker(detail)}` : first, 100);
  }
  return excerpt(first, 100);
}

function isWorkflowCommand(line: string) {
  return /^(ds-start|ds-run|ds-done)(\s|$)/.test(line);
}

function isListNoise(line: string) {
  return /^[-*]\s*$/.test(line);
}

function stripListMarker(line: string) {
  return line.replace(/^[-*]\s*/, '');
}
