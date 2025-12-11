/**
 * Sentinel Grid Backend - Database Layer
 * In-memory store for demo (easily swap to SQLite/Postgres in production)
 */

// ============================================================================
// In-Memory Storage
// ============================================================================

interface StorageTable<T> {
  data: Map<string, T>;
  insert: (item: T & { id: string }) => void;
  getAll: () => T[];
  getById: (id: string) => T | undefined;
  update: (id: string, updates: Partial<T>) => boolean;
  delete: (id: string) => boolean;
  query: (predicate: (item: T) => boolean) => T[];
}

function createTable<T>(): StorageTable<T> {
  const data = new Map<string, T>();
  
  return {
    data,
    insert: (item: T & { id: string }) => {
      data.set(item.id, item);
    },
    getAll: () => Array.from(data.values()),
    getById: (id: string) => data.get(id),
    update: (id: string, updates: Partial<T>) => {
      const existing = data.get(id);
      if (!existing) return false;
      data.set(id, { ...existing, ...updates });
      return true;
    },
    delete: (id: string) => data.delete(id),
    query: (predicate: (item: T) => boolean) => 
      Array.from(data.values()).filter(predicate),
  };
}

// ============================================================================
// Types
// ============================================================================

export interface PredictionRecord {
  id: string;
  nodeId: string;
  nodeName: string;
  type: string;
  probability: number;
  confidence: number;
  hoursToEvent: number;
  predictedTime: string;
  severity: string;
  reasoning: string;
  contributingFactors: string;
  suggestedActions: string;
  status: string;
  createdAt: string;
  resolvedAt?: string;
  wasAccurate?: boolean;
}

export interface AuditRecord {
  id: string;
  timestamp: string;
  type: string;
  hash: string;
  actor?: string;
  dataSummary?: string;
  createdAt: string;
}

export interface AnchorRecord {
  id: string;
  payloadHash: string;
  ipfsCid?: string;
  chain: string;
  txHash?: string;
  status: string;
  metadata?: string;
  createdAt: string;
  confirmedAt?: string;
}

export interface CascadeRecord {
  id: string;
  originNode: string;
  affectedNodes: string;
  impactScore: number;
  totalDamage: number;
  propagationPath?: string;
  startTime: string;
  endTime?: string;
  createdAt: string;
}

export interface MitigationRecord {
  id: string;
  nodeId: string;
  nodeName: string;
  actions: string;
  riskBefore: number;
  riskAfter: number;
  riskReduction: number;
  success: boolean;
  triggeredBy: string;
  createdAt: string;
}

export interface SnapshotRecord {
  id: string;
  timestamp: string;
  maxRisk: number;
  avgHealth: number;
  loadRatio: number;
  criticalCount: number;
  warningCount: number;
  totalNodes: number;
  nodeStates?: string;
  createdAt: string;
}

// ============================================================================
// Tables
// ============================================================================

const predictions = createTable<PredictionRecord>();
const auditLog = createTable<AuditRecord>();
const anchors = createTable<AnchorRecord>();
const cascades = createTable<CascadeRecord>();
const mitigations = createTable<MitigationRecord>();
const snapshots = createTable<SnapshotRecord>();

// ============================================================================
// Repository Functions
// ============================================================================

export const predictionsRepo = {
  insert: {
    run: (data: {
      id: string;
      nodeId: string;
      nodeName: string;
      type: string;
      probability: number;
      confidence: number;
      hoursToEvent: number;
      predictedTime: string;
      severity: string;
      reasoning: string;
      contributingFactors: string;
      suggestedActions: string;
      status: string;
      createdAt: string;
    }) => {
      predictions.insert({ ...data, resolvedAt: undefined, wasAccurate: undefined });
    },
  },
  
  getAll: {
    all: () => predictions.getAll()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 100),
  },
  
  getActive: {
    all: () => predictions.query((p) => p.status === 'active')
      .sort((a, b) => b.probability - a.probability),
  },
  
  getById: {
    get: (id: string) => predictions.getById(id),
  },
  
  updateStatus: {
    run: (status: string, resolvedAt: string, wasAccurate: number, id: string) => {
      predictions.update(id, { status, resolvedAt, wasAccurate: wasAccurate === 1 });
    },
  },
  
  deleteOld: {
    run: () => {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      predictions.query((p) => p.createdAt < cutoff && p.status !== 'active')
        .forEach((p) => predictions.delete(p.id));
    },
  },
};

export const auditRepo = {
  insert: {
    run: (data: {
      id: string;
      timestamp: string;
      type: string;
      hash: string;
      actor?: string;
      dataSummary?: string;
    }) => {
      auditLog.insert({ ...data, createdAt: new Date().toISOString() });
    },
  },
  
  getAll: {
    all: () => auditLog.getAll()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 200),
  },
  
  getByType: {
    all: (type: string) => auditLog.query((e) => e.type === type)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50),
  },
  
  getRecent: {
    all: (limit: number) => auditLog.getAll()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit),
  },
};

export const anchorsRepo = {
  insert: {
    run: (data: {
      id: string;
      payloadHash: string;
      ipfsCid?: string;
      chain: string;
      txHash?: string;
      status: string;
      metadata?: string;
    }) => {
      anchors.insert({ ...data, createdAt: new Date().toISOString() });
    },
  },
  
  getAll: {
    all: () => anchors.getAll()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 100),
  },
  
  getPending: {
    all: () => anchors.query((a) => a.status === 'pending')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
  },
  
  getById: {
    get: (id: string) => anchors.getById(id),
  },
  
  updateStatus: {
    run: (status: string, txHash: string, confirmedAt: string, id: string) => {
      anchors.update(id, { status, txHash, confirmedAt });
    },
  },
};

export const cascadeRepo = {
  insert: {
    run: (data: {
      id: string;
      originNode: string;
      affectedNodes: string;
      impactScore: number;
      totalDamage: number;
      propagationPath?: string;
      startTime: string;
      endTime?: string;
    }) => {
      cascades.insert({ ...data, createdAt: new Date().toISOString() });
    },
  },
  
  getAll: {
    all: () => cascades.getAll()
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, 50),
  },
  
  getById: {
    get: (id: string) => cascades.getById(id),
  },
};

export const mitigationsRepo = {
  insert: {
    run: (data: {
      id: string;
      nodeId: string;
      nodeName: string;
      actions: string;
      riskBefore: number;
      riskAfter: number;
      riskReduction: number;
      success: number;
      triggeredBy: string;
    }) => {
      mitigations.insert({ 
        ...data, 
        success: data.success === 1,
        createdAt: new Date().toISOString(),
      });
    },
  },
  
  getAll: {
    all: () => mitigations.getAll()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 100),
  },
  
  getByNode: {
    all: (nodeId: string) => mitigations.query((m) => m.nodeId === nodeId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20),
  },
};

export const snapshotsRepo = {
  insert: {
    run: (data: {
      id: string;
      timestamp: string;
      maxRisk: number;
      avgHealth: number;
      loadRatio: number;
      criticalCount: number;
      warningCount: number;
      totalNodes: number;
      nodeStates?: string;
    }) => {
      snapshots.insert({ ...data, createdAt: new Date().toISOString() });
    },
  },
  
  getLatest: {
    get: () => snapshots.getAll()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0],
  },
  
  getRecent: {
    all: (limit: number) => snapshots.getAll()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit),
  },
};

// ============================================================================
// Initialization
// ============================================================================

export function initializeSchema(): void {
  console.log('✓ In-memory database initialized');
}

export function closeDatabase(): void {
  // Clear all data
  predictions.data.clear();
  auditLog.data.clear();
  anchors.data.clear();
  cascades.data.clear();
  mitigations.data.clear();
  snapshots.data.clear();
  console.log('✓ Database cleared');
}

// For compatibility - dummy db object
export const db = {
  pragma: () => {},
  exec: () => {},
  prepare: () => ({
    run: () => {},
    get: () => null,
    all: () => [],
  }),
  close: closeDatabase,
};
