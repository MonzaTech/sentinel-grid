"use strict";
/**
 * Sentinel Grid Backend - Database Layer
 * In-memory store for demo (easily swap to SQLite/Postgres in production)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.snapshotsRepo = exports.mitigationsRepo = exports.cascadeRepo = exports.anchorsRepo = exports.auditRepo = exports.predictionsRepo = void 0;
exports.initializeSchema = initializeSchema;
exports.closeDatabase = closeDatabase;
function createTable() {
    const data = new Map();
    return {
        data,
        insert: (item) => {
            data.set(item.id, item);
        },
        getAll: () => Array.from(data.values()),
        getById: (id) => data.get(id),
        update: (id, updates) => {
            const existing = data.get(id);
            if (!existing)
                return false;
            data.set(id, { ...existing, ...updates });
            return true;
        },
        delete: (id) => data.delete(id),
        query: (predicate) => Array.from(data.values()).filter(predicate),
    };
}
// ============================================================================
// Tables
// ============================================================================
const predictions = createTable();
const auditLog = createTable();
const anchors = createTable();
const cascades = createTable();
const mitigations = createTable();
const snapshots = createTable();
// ============================================================================
// Repository Functions
// ============================================================================
exports.predictionsRepo = {
    insert: {
        run: (data) => {
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
        get: (id) => predictions.getById(id),
    },
    updateStatus: {
        run: (status, resolvedAt, wasAccurate, id) => {
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
exports.auditRepo = {
    insert: {
        run: (data) => {
            auditLog.insert({ ...data, createdAt: new Date().toISOString() });
        },
    },
    getAll: {
        all: () => auditLog.getAll()
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 200),
    },
    getByType: {
        all: (type) => auditLog.query((e) => e.type === type)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 50),
    },
    getRecent: {
        all: (limit) => auditLog.getAll()
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, limit),
    },
};
exports.anchorsRepo = {
    insert: {
        run: (data) => {
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
        get: (id) => anchors.getById(id),
    },
    updateStatus: {
        run: (status, txHash, confirmedAt, id) => {
            anchors.update(id, { status, txHash, confirmedAt });
        },
    },
};
exports.cascadeRepo = {
    insert: {
        run: (data) => {
            cascades.insert({ ...data, createdAt: new Date().toISOString() });
        },
    },
    getAll: {
        all: () => cascades.getAll()
            .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
            .slice(0, 50),
    },
    getById: {
        get: (id) => cascades.getById(id),
    },
};
exports.mitigationsRepo = {
    insert: {
        run: (data) => {
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
        all: (nodeId) => mitigations.query((m) => m.nodeId === nodeId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 20),
    },
};
exports.snapshotsRepo = {
    insert: {
        run: (data) => {
            snapshots.insert({ ...data, createdAt: new Date().toISOString() });
        },
    },
    getLatest: {
        get: () => snapshots.getAll()
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0],
    },
    getRecent: {
        all: (limit) => snapshots.getAll()
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, limit),
    },
};
// ============================================================================
// Initialization
// ============================================================================
function initializeSchema() {
    console.log('✓ In-memory database initialized');
}
function closeDatabase() {
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
exports.db = {
    pragma: () => { },
    exec: () => { },
    prepare: () => ({
        run: () => { },
        get: () => null,
        all: () => [],
    }),
    close: closeDatabase,
};
//# sourceMappingURL=index.js.map