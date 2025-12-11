/**
 * Sentinel Grid Backend - Database Layer
 * In-memory store for demo (easily swap to SQLite/Postgres in production)
 */
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
export declare const predictionsRepo: {
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
        }) => void;
    };
    getAll: {
        all: () => PredictionRecord[];
    };
    getActive: {
        all: () => PredictionRecord[];
    };
    getById: {
        get: (id: string) => PredictionRecord | undefined;
    };
    updateStatus: {
        run: (status: string, resolvedAt: string, wasAccurate: number, id: string) => void;
    };
    deleteOld: {
        run: () => void;
    };
};
export declare const auditRepo: {
    insert: {
        run: (data: {
            id: string;
            timestamp: string;
            type: string;
            hash: string;
            actor?: string;
            dataSummary?: string;
        }) => void;
    };
    getAll: {
        all: () => AuditRecord[];
    };
    getByType: {
        all: (type: string) => AuditRecord[];
    };
    getRecent: {
        all: (limit: number) => AuditRecord[];
    };
};
export declare const anchorsRepo: {
    insert: {
        run: (data: {
            id: string;
            payloadHash: string;
            ipfsCid?: string;
            chain: string;
            txHash?: string;
            status: string;
            metadata?: string;
        }) => void;
    };
    getAll: {
        all: () => AnchorRecord[];
    };
    getPending: {
        all: () => AnchorRecord[];
    };
    getById: {
        get: (id: string) => AnchorRecord | undefined;
    };
    updateStatus: {
        run: (status: string, txHash: string, confirmedAt: string, id: string) => void;
    };
};
export declare const cascadeRepo: {
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
        }) => void;
    };
    getAll: {
        all: () => CascadeRecord[];
    };
    getById: {
        get: (id: string) => CascadeRecord | undefined;
    };
};
export declare const mitigationsRepo: {
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
        }) => void;
    };
    getAll: {
        all: () => MitigationRecord[];
    };
    getByNode: {
        all: (nodeId: string) => MitigationRecord[];
    };
};
export declare const snapshotsRepo: {
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
        }) => void;
    };
    getLatest: {
        get: () => SnapshotRecord;
    };
    getRecent: {
        all: (limit: number) => SnapshotRecord[];
    };
};
export declare function initializeSchema(): void;
export declare function closeDatabase(): void;
export declare const db: {
    pragma: () => void;
    exec: () => void;
    prepare: () => {
        run: () => void;
        get: () => null;
        all: () => never[];
    };
    close: typeof closeDatabase;
};
