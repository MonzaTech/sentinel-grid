/**
 * Sentinel Grid Backend - API Integration Tests
 */

import request from 'supertest';
import { createApp } from '../src/app.js';
import { initializeSchema } from '../src/db/index.js';
import { Express } from 'express';

describe('Sentinel Grid API', () => {
  let app: Express;

  beforeAll(() => {
    initializeSchema();
    app = createApp();
  });

  describe('Health Check', () => {
    it('GET /health returns ok', async () => {
      const res = await request(app).get('/health');
      
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('API Root', () => {
    it('GET /api returns endpoint list', async () => {
      const res = await request(app).get('/api');
      
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Sentinel Grid API');
      expect(res.body.endpoints).toBeInstanceOf(Array);
    });
  });

  describe('System Endpoints', () => {
    it('GET /api/system/state returns system state', async () => {
      const res = await request(app).get('/api/system/state');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.maxRisk).toBeDefined();
      expect(res.body.data.avgHealth).toBeDefined();
      expect(res.body.data.totalNodes).toBeGreaterThan(0);
    });

    it('GET /api/system/health returns health check', async () => {
      const res = await request(app).get('/api/system/health');
      
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.simulation).toBeDefined();
    });

    it('GET /api/system/metrics returns Prometheus metrics', async () => {
      const res = await request(app).get('/api/system/metrics');
      
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/plain');
      expect(res.text).toContain('sentinel_system_health_score');
      expect(res.text).toContain('sentinel_nodes_total');
    });

    it('POST /api/system/start starts simulation', async () => {
      const res = await request(app).post('/api/system/start');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.isRunning).toBe(true);
    });

    it('POST /api/system/stop stops simulation', async () => {
      const res = await request(app).post('/api/system/stop');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.isRunning).toBe(false);
    });
  });

  describe('Nodes Endpoints', () => {
    it('GET /api/nodes returns node list', async () => {
      const res = await request(app).get('/api/nodes');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.count).toBeGreaterThan(0);
    });

    it('GET /api/nodes with filters works', async () => {
      const res = await request(app)
        .get('/api/nodes')
        .query({ minRisk: 0.3, limit: 10 });
      
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(10);
    });

    it('GET /api/nodes/summary returns statistics', async () => {
      const res = await request(app).get('/api/nodes/summary');
      
      expect(res.status).toBe(200);
      expect(res.body.data.total).toBeGreaterThan(0);
      expect(res.body.data.byStatus).toBeDefined();
      expect(res.body.data.byRegion).toBeDefined();
    });

    it('GET /api/nodes/:id returns single node', async () => {
      // First get a node ID
      const listRes = await request(app).get('/api/nodes?limit=1');
      const nodeId = listRes.body.data[0].id;
      
      const res = await request(app).get(`/api/nodes/${nodeId}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(nodeId);
    });

    it('GET /api/nodes/:id returns 404 for invalid ID', async () => {
      const res = await request(app).get('/api/nodes/invalid_id');
      
      expect(res.status).toBe(404);
    });
  });

  describe('Predictions Endpoints', () => {
    it('GET /api/predictions returns predictions', async () => {
      const res = await request(app).get('/api/predictions');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('GET /api/predictions/patterns returns patterns', async () => {
      const res = await request(app).get('/api/predictions/patterns');
      
      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('GET /api/predictions/accuracy returns metrics', async () => {
      const res = await request(app).get('/api/predictions/accuracy');
      
      expect(res.status).toBe(200);
      expect(res.body.data.accuracy).toBeDefined();
      expect(res.body.data.precision).toBeDefined();
    });
  });

  describe('Simulation Endpoints', () => {
    it('POST /api/simulate/cascade triggers cascade', async () => {
      // Get a node ID first
      const listRes = await request(app).get('/api/nodes?limit=1');
      const nodeId = listRes.body.data[0].id;
      
      const res = await request(app)
        .post('/api/simulate/cascade')
        .send({ originId: nodeId, severity: 0.5 });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.affectedNodes).toBeGreaterThan(0);
    });

    it('POST /api/simulate/threat deploys threat', async () => {
      const res = await request(app)
        .post('/api/simulate/threat')
        .send({ type: 'cyber_attack', severity: 0.6 });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.type).toBe('cyber_attack');
    });

    it('DELETE /api/simulate/threat clears threat', async () => {
      const res = await request(app).delete('/api/simulate/threat');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('POST /api/simulate/scenario runs scenario', async () => {
      const res = await request(app)
        .post('/api/simulate/scenario')
        .send({ scenario: 'demo' });
      
      expect(res.status).toBe(200);
      expect(res.body.scenario).toBe('demo');
    });
  });

  describe('Actions Endpoints', () => {
    it('POST /api/actions/mitigate applies mitigation', async () => {
      // Get a node ID
      const listRes = await request(app).get('/api/nodes/critical');
      const nodes = listRes.body.data;
      
      if (nodes.length === 0) {
        // No critical nodes, skip test
        return;
      }
      
      const res = await request(app)
        .post('/api/actions/mitigate')
        .send({ nodeId: nodes[0].id });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('GET /api/actions/history returns mitigation history', async () => {
      const res = await request(app).get('/api/actions/history');
      
      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });
  });

  describe('Audit Endpoints', () => {
    it('GET /api/audit returns audit log', async () => {
      const res = await request(app).get('/api/audit');
      
      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('GET /api/audit/types returns event types', async () => {
      const res = await request(app).get('/api/audit/types');
      
      expect(res.status).toBe(200);
      expect(res.body.data).toContain('cascade_event');
    });
  });

  describe('Anchor Endpoints', () => {
    it('POST /api/anchor creates anchor', async () => {
      const res = await request(app)
        .post('/api/anchor')
        .send({ 
          payloadHash: 'abc123def456',
          chain: 'base',
        });
      
      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.status).toBe('pending');
    });

    it('GET /api/anchors returns anchors', async () => {
      const res = await request(app).get('/api/anchors');
      
      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('POST /api/pin pins data and returns CID', async () => {
      const res = await request(app)
        .post('/api/pin')
        .send({ 
          payload: { test: 'data', timestamp: Date.now() },
        });
      
      expect(res.status).toBe(200);
      expect(res.body.data.cid).toBeDefined();
      expect(res.body.data.sha256).toBeDefined();
      expect(res.body.data.signature).toBeDefined();
    });

    it('POST /api/verify verifies signature', async () => {
      // First pin something
      const pinRes = await request(app)
        .post('/api/pin')
        .send({ payload: { test: 'verify' } });
      
      const { sha256, signature } = pinRes.body.data;
      
      const res = await request(app)
        .post('/api/verify')
        .send({ hash: sha256, signature });
      
      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('Returns 404 for unknown routes', async () => {
      const res = await request(app).get('/api/unknown/route');
      
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Not Found');
    });

    it('Handles validation errors', async () => {
      const res = await request(app)
        .post('/api/simulate/cascade')
        .send({}); // Missing required fields
      
      expect(res.status).toBe(400);
    });
  });
});
