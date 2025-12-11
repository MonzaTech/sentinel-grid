/**
 * Sentinel Grid Frontend - API Service
 * REST API client for backend communication
 */

import type {
  Node,
  SystemState,
  Prediction,
  Pattern,
  CascadeEvent,
  MitigationResult,
  AccuracyMetrics,
  ApiResponse,
  PaginatedResponse,
} from '../types';

const API_BASE = '/api';

// ============================================================================
// Helper Functions
// ============================================================================

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API Error: ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// System Endpoints
// ============================================================================

export const system = {
  getState: () =>
    fetchApi<ApiResponse<{
      systemState: SystemState;
      weather: unknown;
      isRunning: boolean;
      tickCount: number;
      activeThreat: unknown;
    }>>('/system/state'),

  getHealth: () =>
    fetchApi<ApiResponse<{ status: string; uptime: number }>>('/system/health'),

  getMetrics: () =>
    fetchApi<string>('/system/metrics'),

  start: () =>
    fetchApi<ApiResponse<{ message: string }>>('/system/start', { method: 'POST' }),

  stop: () =>
    fetchApi<ApiResponse<{ message: string }>>('/system/stop', { method: 'POST' }),

  reset: (seed?: number) =>
    fetchApi<ApiResponse<{ message: string }>>('/system/reset', {
      method: 'POST',
      body: JSON.stringify({ seed }),
    }),
};

// ============================================================================
// Node Endpoints
// ============================================================================

export const nodes = {
  list: (params?: {
    status?: string;
    type?: string;
    region?: string;
    minRisk?: number;
    limit?: number;
    offset?: number;
  }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.set(key, String(value));
      });
    }
    return fetchApi<PaginatedResponse<Node>>(`/nodes?${query}`);
  },

  getById: (id: string) =>
    fetchApi<ApiResponse<Node>>(`/nodes/${id}`),

  getSummary: () =>
    fetchApi<ApiResponse<{
      total: number;
      byStatus: Record<string, number>;
      byType: Record<string, number>;
      byRegion: Record<string, number>;
      avgRisk: number;
      avgHealth: number;
    }>>('/nodes/summary'),

  getCritical: () =>
    fetchApi<PaginatedResponse<Node>>('/nodes/critical'),

  getConnections: (id: string) =>
    fetchApi<ApiResponse<{ node: Node; connections: Node[] }>>(`/nodes/${id}/connections`),
};

// ============================================================================
// Prediction Endpoints
// ============================================================================

export const predictions = {
  list: (params?: {
    type?: string;
    minProbability?: number;
    maxHours?: number;
  }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.set(key, String(value));
      });
    }
    return fetchApi<PaginatedResponse<Prediction>>(`/predictions?${query}`);
  },

  getPatterns: () =>
    fetchApi<PaginatedResponse<Pattern>>('/predictions/patterns'),

  getAccuracy: () =>
    fetchApi<ApiResponse<AccuracyMetrics>>('/predictions/accuracy'),

  getHistory: (limit?: number) =>
    fetchApi<PaginatedResponse<Prediction>>(`/predictions/history?limit=${limit || 50}`),
};

// ============================================================================
// Simulation Endpoints
// ============================================================================

export const simulate = {
  triggerCascade: (originId: string, severity?: number) =>
    fetchApi<ApiResponse<CascadeEvent>>('/simulate/cascade', {
      method: 'POST',
      body: JSON.stringify({ originId, severity }),
    }),

  getCascades: () =>
    fetchApi<PaginatedResponse<CascadeEvent>>('/simulate/cascades'),

  deployThreat: (type: string, severity: number, target?: string) =>
    fetchApi<ApiResponse<{ message: string }>>('/simulate/threat', {
      method: 'POST',
      body: JSON.stringify({ type, severity, target }),
    }),

  clearThreat: () =>
    fetchApi<ApiResponse<{ message: string }>>('/simulate/threat', {
      method: 'DELETE',
    }),

  runScenario: (scenario: string, params?: Record<string, unknown>) =>
    fetchApi<ApiResponse<{ results: unknown[] }>>('/simulate/scenario', {
      method: 'POST',
      body: JSON.stringify({ scenario, params }),
    }),
};

// ============================================================================
// Action Endpoints
// ============================================================================

export const actions = {
  mitigate: (nodeId: string, strategy?: string) =>
    fetchApi<ApiResponse<MitigationResult>>('/actions/mitigate', {
      method: 'POST',
      body: JSON.stringify({ nodeId, strategy }),
    }),

  mitigateBatch: (nodeIds: string[]) =>
    fetchApi<ApiResponse<MitigationResult[]>>('/actions/mitigate/batch', {
      method: 'POST',
      body: JSON.stringify({ nodeIds }),
    }),

  mitigateCritical: () =>
    fetchApi<ApiResponse<{ mitigated: number; results: MitigationResult[] }>>('/actions/mitigate/critical', {
      method: 'POST',
    }),

  setAutoMitigation: (enabled: boolean) =>
    fetchApi<ApiResponse<{ enabled: boolean }>>('/actions/auto-mitigation', {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    }),

  getHistory: (limit?: number) =>
    fetchApi<PaginatedResponse<MitigationResult & { timestamp: string }>>(`/actions/history?limit=${limit || 50}`),
};

// ============================================================================
// Audit Endpoints
// ============================================================================

export const audit = {
  list: (params?: { type?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.set(key, String(value));
      });
    }
    return fetchApi<PaginatedResponse<{
      id: string;
      timestamp: string;
      type: string;
      hash: string;
      actor: string;
      dataSummary: string;
    }>>(`/audit?${query}`);
  },

  getTypes: () =>
    fetchApi<ApiResponse<string[]>>('/audit/types'),
};

// ============================================================================
// Anchor Endpoints
// ============================================================================

export const anchor = {
  create: (payloadHash: string, ipfsCid?: string, chain?: string) =>
    fetchApi<ApiResponse<{
      id: string;
      payloadHash: string;
      status: string;
    }>>('/anchor', {
      method: 'POST',
      body: JSON.stringify({ payloadHash, ipfsCid, chain }),
    }),

  list: (status?: string) =>
    fetchApi<PaginatedResponse<{
      id: string;
      payloadHash: string;
      ipfsCid?: string;
      chain: string;
      txHash?: string;
      status: string;
    }>>(`/anchors${status ? `?status=${status}` : ''}`),

  pin: (payload: Record<string, unknown>, encrypt?: boolean) =>
    fetchApi<ApiResponse<{
      cid: string;
      sha256: string;
      signature: string;
      size: number;
    }>>('/pin', {
      method: 'POST',
      body: JSON.stringify({ payload, encrypt }),
    }),

  verify: (hash: string, signature: string) =>
    fetchApi<ApiResponse<{ valid: boolean }>>('/verify', {
      method: 'POST',
      body: JSON.stringify({ hash, signature }),
    }),
};

// ============================================================================
// Contract/Blockchain Endpoints
// ============================================================================

export const contract = {
  connect: (chain: string = 'optimism') =>
    fetchApi<ApiResponse<{ connected: boolean; chain: string }>>('/contract/connect', {
      method: 'POST',
      body: JSON.stringify({ chain }),
    }),

  status: () =>
    fetchApi<ApiResponse<{
      connected: boolean;
      chain: string;
      contractAddress?: string;
      lastAnchor?: string;
      pendingAnchors: number;
    }>>('/contract/status'),

  batchSubmit: () =>
    fetchApi<ApiResponse<{ submitted: number; results: unknown[] }>>('/contract/anchor/submit-pending', {
      method: 'POST',
    }),
};

// ============================================================================
// Export All
// ============================================================================

export const api = {
  system,
  nodes,
  predictions,
  simulate,
  actions,
  audit,
  anchor,
  contract,
};

export default api;
