/**
 * Sentinel Grid Frontend - Custom Hooks
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { wsService } from '../services/websocket';
import type {
  Node,
  SystemState,
  Prediction,
  Pattern,
  Alert,
  WeatherData,
  CascadeEvent,
  NodeStatus,
} from '../types';

// ============================================================================
// Status Mapping - Backend uses different status names than frontend
// ============================================================================

/**
 * Maps backend node status to frontend status
 * Backend: 'online' | 'degraded' | 'critical' | 'offline'
 * Frontend: 'healthy' | 'warning' | 'critical' | 'failed' | 'offline'
 */
function mapBackendStatusToUi(status: string): NodeStatus {
  switch (status) {
    case 'online':
      return 'healthy';
    case 'degraded':
      return 'warning';
    case 'critical':
      return 'critical';
    case 'offline':
      return 'offline';
    case 'failed':
      return 'failed';
    // Already frontend format
    case 'healthy':
      return 'healthy';
    case 'warning':
      return 'warning';
    default:
      return 'healthy';
  }
}

/**
 * Maps a node from backend format to frontend format
 */
function mapNode(node: any): Node {
  return {
    ...node,
    status: mapBackendStatusToUi(node.status),
  };
}

// ============================================================================
// useWebSocket - WebSocket connection management
// ============================================================================

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    wsService.connect();

    const unsubConnect = wsService.onConnect(() => {
      setIsConnected(true);
    });

    const unsubDisconnect = wsService.onDisconnect(() => {
      setIsConnected(false);
    });

    // Set initial state
    setIsConnected(wsService.isConnected);

    return () => {
      unsubConnect();
      unsubDisconnect();
    };
  }, []);

  return { isConnected, wsService };
}

// ============================================================================
// useSimulation - Main simulation state hook
// ============================================================================

interface SimulationState {
  systemState: SystemState | null;
  weather: WeatherData | null;
  nodes: Record<string, Node>;
  predictions: Prediction[];
  patterns: Pattern[];
  alerts: Alert[];
  cascades: CascadeEvent[];
  isRunning: boolean;
  tickCount: number;
  isLoading: boolean;
  error: string | null;
}

export function useSimulation() {
  const [state, setState] = useState<SimulationState>({
    systemState: null,
    weather: null,
    nodes: {},
    predictions: [],
    patterns: [],
    alerts: [],
    cascades: [],
    isRunning: false,
    tickCount: 0,
    isLoading: true,
    error: null,
  });

  // Load initial state
  useEffect(() => {
    async function loadInitialState() {
      try {
        const [stateRes, nodesRes, predictionsRes, patternsRes] = await Promise.all([
          api.system.getState(),
          api.nodes.list({ limit: 500 }),
          api.predictions.list(),
          api.predictions.getPatterns(),
        ]);

        const nodesMap: Record<string, Node> = {};
        nodesRes.data.forEach((node) => {
          nodesMap[node.id] = mapNode(node);
        });

        setState((prev) => ({
          ...prev,
          systemState: stateRes.data.systemState,
          weather: stateRes.data.weather as WeatherData,
          isRunning: stateRes.data.isRunning,
          tickCount: stateRes.data.tickCount,
          nodes: nodesMap,
          predictions: predictionsRes.data,
          patterns: patternsRes.data,
          isLoading: false,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to load state',
        }));
      }
    }

    loadInitialState();
  }, []);

  // Subscribe to WebSocket updates
  useEffect(() => {
    const unsubTick = wsService.on('tick', (data) => {
      const tick = data as {
        systemState: SystemState;
        weather: WeatherData;
        isRunning: boolean;
        tickCount: number;
        nodes?: Record<string, Node>;
      };
      
      // If nodes are included in tick, update them with status mapping
      let updatedNodes: Record<string, Node> | undefined;
      if (tick.nodes) {
        updatedNodes = {};
        Object.values(tick.nodes).forEach((node) => {
          updatedNodes![node.id] = mapNode(node);
        });
      }
      
      setState((prev) => ({
        ...prev,
        systemState: tick.systemState,
        weather: tick.weather,
        isRunning: tick.isRunning,
        tickCount: tick.tickCount,
        ...(updatedNodes && { nodes: updatedNodes }),
      }));
    });

    const unsubPredictions = wsService.on('predictions', (data) => {
      const { predictions } = data as { predictions: Prediction[] };
      setState((prev) => ({
        ...prev,
        predictions,
      }));
    });

    const unsubAlert = wsService.on('alert', (data) => {
      const alert = data as Alert;
      setState((prev) => ({
        ...prev,
        alerts: [alert, ...prev.alerts].slice(0, 50),
      }));
    });

    const unsubCascade = wsService.on('cascade', (data) => {
      const cascade = data as CascadeEvent;
      setState((prev) => ({
        ...prev,
        cascades: [cascade, ...prev.cascades].slice(0, 20),
      }));
    });

    const unsubStateChange = wsService.on('stateChange', (data) => {
      const { isRunning, tickCount } = data as { isRunning: boolean; tickCount: number };
      setState((prev) => ({
        ...prev,
        isRunning,
        tickCount,
      }));
    });

    return () => {
      unsubTick();
      unsubPredictions();
      unsubAlert();
      unsubCascade();
      unsubStateChange();
    };
  }, []);

  // Actions
  const start = useCallback(async () => {
    try {
      await api.system.start();
    } catch (error) {
      console.error('Failed to start simulation:', error);
    }
  }, []);

  const stop = useCallback(async () => {
    try {
      await api.system.stop();
    } catch (error) {
      console.error('Failed to stop simulation:', error);
    }
  }, []);

  const reset = useCallback(async (seed?: number) => {
    try {
      await api.system.reset(seed);
      // Reload full state after reset
      const [stateRes, nodesRes] = await Promise.all([
        api.system.getState(),
        api.nodes.list({ limit: 500 }),
      ]);
      
      const nodesMap: Record<string, Node> = {};
      nodesRes.data.forEach((node) => {
        nodesMap[node.id] = mapNode(node);
      });
      
      setState((prev) => ({
        ...prev,
        systemState: stateRes.data.systemState,
        weather: stateRes.data.weather as WeatherData,
        isRunning: stateRes.data.isRunning,
        tickCount: stateRes.data.tickCount,
        nodes: nodesMap,
        predictions: [],
        alerts: [],
        cascades: [],
      }));
    } catch (error) {
      console.error('Failed to reset simulation:', error);
    }
  }, []);

  const triggerCascade = useCallback(async (nodeId: string, severity?: number) => {
    try {
      const result = await api.simulate.triggerCascade(nodeId, severity);
      return result.data;
    } catch (error) {
      console.error('Failed to trigger cascade:', error);
      throw error;
    }
  }, []);

  const deployThreat = useCallback(async (type: string, severity: number, target?: string) => {
    try {
      await api.simulate.deployThreat(type, severity, target);
    } catch (error) {
      console.error('Failed to deploy threat:', error);
      throw error;
    }
  }, []);

  const clearThreat = useCallback(async () => {
    try {
      await api.simulate.clearThreat();
    } catch (error) {
      console.error('Failed to clear threat:', error);
    }
  }, []);

  const mitigate = useCallback(async (nodeId: string) => {
    try {
      const result = await api.actions.mitigate(nodeId);
      // Immediately refresh nodes to show the effect
      const nodesRes = await api.nodes.list({ limit: 500 });
      const nodesMap: Record<string, Node> = {};
      nodesRes.data.forEach((node) => {
        nodesMap[node.id] = mapNode(node);
      });
      setState((prev) => ({ ...prev, nodes: nodesMap }));
      return result.data;
    } catch (error) {
      console.error('Failed to mitigate:', error);
      throw error;
    }
  }, []);

  const mitigateAll = useCallback(async () => {
    try {
      const result = await api.actions.mitigateCritical();
      // Immediately refresh nodes to show the effect
      const nodesRes = await api.nodes.list({ limit: 500 });
      const nodesMap: Record<string, Node> = {};
      nodesRes.data.forEach((node) => {
        nodesMap[node.id] = mapNode(node);
      });
      setState((prev) => ({ ...prev, nodes: nodesMap }));
      return result.data;
    } catch (error) {
      console.error('Failed to mitigate all:', error);
      throw error;
    }
  }, []);

  const refreshNodes = useCallback(async () => {
    const nodesRes = await api.nodes.list({ limit: 500 });
    const nodesMap: Record<string, Node> = {};
    nodesRes.data.forEach((node) => {
      nodesMap[node.id] = node;
    });
    setState((prev) => ({ ...prev, nodes: nodesMap }));
  }, []);

  const refreshPredictions = useCallback(async () => {
    const [predictionsRes, patternsRes] = await Promise.all([
      api.predictions.list(),
      api.predictions.getPatterns(),
    ]);
    setState((prev) => ({
      ...prev,
      predictions: predictionsRes.data,
      patterns: patternsRes.data,
    }));
  }, []);

  return {
    ...state,
    actions: {
      start,
      stop,
      reset,
      triggerCascade,
      deployThreat,
      clearThreat,
      mitigate,
      mitigateAll,
      refreshNodes,
      refreshPredictions,
    },
  };
}

// ============================================================================
// useNodes - Node list with filtering
// ============================================================================

interface NodesFilter {
  status?: string;
  type?: string;
  region?: string;
  minRisk?: number;
}

export function useNodes(filter?: NodesFilter) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNodes = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await api.nodes.list({ ...filter, limit: 500 });
      setNodes(result.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load nodes');
    } finally {
      setIsLoading(false);
    }
  }, [filter?.status, filter?.type, filter?.region, filter?.minRisk]);

  useEffect(() => {
    fetchNodes();
  }, [fetchNodes]);

  return { nodes, isLoading, error, refresh: fetchNodes };
}

// ============================================================================
// useAccuracy - Model accuracy metrics
// ============================================================================

interface SimpleAccuracyMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
}

export function useAccuracy() {
  const [metrics, setMetrics] = useState<SimpleAccuracyMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      try {
        const result = await api.predictions.getAccuracy();
        // Extract only the metrics we need
        const { accuracy, precision, recall, f1Score } = result.data;
        setMetrics({ accuracy, precision, recall, f1Score });
      } catch (error) {
        console.error('Failed to load accuracy:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadMetrics();
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  return { metrics, isLoading };
}

// ============================================================================
// useWallet - MetaMask wallet connection
// ============================================================================

interface WalletState {
  connected: boolean;
  address: string | null;
  chainId: number | null;
  isConnecting: boolean;
  error: string | null;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    connected: false,
    address: null,
    chainId: null,
    isConnecting: false,
    error: null,
  });

  const checkConnection = useCallback(async () => {
    if (typeof window.ethereum === 'undefined') {
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' }) as string[];
      const chainId = await window.ethereum.request({ method: 'eth_chainId' }) as string;

      if (accounts.length > 0) {
        setState({
          connected: true,
          address: accounts[0],
          chainId: parseInt(chainId, 16),
          isConnecting: false,
          error: null,
        });
      }
    } catch (error) {
      console.error('Failed to check wallet:', error);
    }
  }, []);

  useEffect(() => {
    checkConnection();

    if (typeof window.ethereum !== 'undefined') {
      const handleAccountsChanged = (...args: unknown[]) => {
        const accounts = args[0] as string[];
        if (accounts.length === 0) {
          setState((prev) => ({ ...prev, connected: false, address: null }));
        } else {
          setState((prev) => ({ ...prev, connected: true, address: accounts[0] }));
        }
      };

      const handleChainChanged = (...args: unknown[]) => {
        const chainId = args[0] as string;
        setState((prev) => ({ ...prev, chainId: parseInt(chainId, 16) }));
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }
  }, [checkConnection]);

  const connect = useCallback(async () => {
    if (typeof window.ethereum === 'undefined') {
      setState((prev) => ({
        ...prev,
        error: 'MetaMask not installed',
      }));
      return;
    }

    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      }) as string[];
      const chainId = await window.ethereum.request({ method: 'eth_chainId' }) as string;

      setState({
        connected: true,
        address: accounts[0],
        chainId: parseInt(chainId, 16),
        isConnecting: false,
        error: null,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Failed to connect',
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({
      connected: false,
      address: null,
      chainId: null,
      isConnecting: false,
      error: null,
    });
  }, []);

  return { ...state, connect, disconnect };
}

// Add ethereum type to window
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}
