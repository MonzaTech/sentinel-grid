/**
 * Sentinel Grid - Enterprise Infrastructure Defense System
 * Main Application Layout
 */

import { useState, useCallback, useMemo } from 'react';
import {
  AlertTriangle,
  Network,
  BarChart3,
  Clock,
  Wifi,
  WifiOff,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  X,
} from 'lucide-react';
import { useSimulation, useWebSocket, useAccuracy } from './hooks';
import { NetworkTab } from './components/NetworkTab';
import { PredictionsTab } from './components/PredictionsTab';
import { TimelineTab } from './components/TimelineTab';
import { AlertsTab } from './components/AlertsTab';
import { ControlPanel } from './components/ControlPanel';
import { MetricCard } from './components/MetricCard';
import { BlockchainPanel } from './components/BlockchainPanel';

type TabId = 'network' | 'predictions' | 'timeline' | 'alerts';

const tabs: { id: TabId; label: string; icon: typeof Network }[] = [
  { id: 'network', label: 'Network', icon: Network },
  { id: 'predictions', label: 'Predictions', icon: BarChart3 },
  { id: 'timeline', label: 'Timeline', icon: Clock },
  { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
];

// Demo Mode Steps
const demoSteps = [
  {
    id: 1,
    title: 'Normal Operation',
    description: 'System monitoring 200 infrastructure nodes in real-time.',
    tab: 'network' as TabId,
  },
  {
    id: 2,
    title: 'AI Prediction',
    description: 'AI detected high-risk pattern. Click "Why this prediction" to see reasoning.',
    tab: 'predictions' as TabId,
  },
  {
    id: 3,
    title: 'Cascade Simulation',
    description: 'Simulating failure cascade. Watch affected nodes in red.',
    tab: 'network' as TabId,
  },
  {
    id: 4,
    title: 'Mitigation & Audit',
    description: 'Applying mitigation. Audit snapshot anchored on-chain for compliance.',
    tab: 'timeline' as TabId,
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('network');
  const [demoMode, setDemoMode] = useState(false);
  const [demoStep, setDemoStep] = useState(1);
  const { isConnected } = useWebSocket();
  const { metrics: accuracy } = useAccuracy();
  const {
    systemState,
    weather,
    nodes,
    predictions,
    patterns,
    alerts,
    cascades,
    isRunning,
    tickCount,
    isLoading,
    error,
    actions,
  } = useSimulation();

  // Convert nodes object to array
  const nodesList = useMemo(() => Object.values(nodes), [nodes]);

  // Calculate counts from actual nodes array (not from systemState which may have wrong format)
  const statusCounts = useMemo(() => {
    const counts = { healthy: 0, warning: 0, critical: 0, offline: 0, failed: 0 };
    nodesList.forEach((node) => {
      const status = node.status as keyof typeof counts;
      if (counts[status] !== undefined) {
        counts[status]++;
      }
    });
    return counts;
  }, [nodesList]);

  const totalNodes = nodesList.length;
  const healthyCount = statusCounts.healthy;
  const warningCount = statusCounts.warning;
  const criticalCount = statusCounts.critical + statusCounts.failed;

  // Demo mode handlers
  const startDemo = useCallback(() => {
    setDemoMode(true);
    setDemoStep(1);
    setActiveTab('network');
    if (!isRunning) {
      actions.start();
    }
  }, [isRunning, actions]);

  const nextDemoStep = useCallback(() => {
    if (demoStep < 4) {
      const nextStep = demoStep + 1;
      setDemoStep(nextStep);
      setActiveTab(demoSteps[nextStep - 1].tab);
      
      // Trigger demo actions
      if (nextStep === 3) {
        // Trigger cascade on a high-risk node
        const criticalNode = nodesList.find(n => n.status === 'critical');
        if (criticalNode) {
          actions.triggerCascade(criticalNode.id, 0.6);
        }
      }
    } else {
      setDemoMode(false);
    }
  }, [demoStep, nodesList, actions]);

  const exitDemo = useCallback(() => {
    setDemoMode(false);
    setDemoStep(1);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <img 
            src="/logo.png" 
            alt="Sentinel Grid" 
            className="h-12 w-auto mx-auto mb-4 animate-pulse"
          />
          <p className="text-sm text-slate-400">Initializing system...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="surface-card p-8 text-center max-w-lg">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-lg font-semibold text-slate-200 mb-2">Connection Error</h1>
          <p className="text-sm text-slate-400 mb-4">{error}</p>
          <div className="text-xs text-slate-500 mb-6 text-left bg-slate-900/50 p-4 rounded-lg font-mono">
            <p className="mb-2">Quick troubleshooting:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Ensure backend is running: <code className="text-cyan-400">npm run dev:backend</code></li>
              <li>Check backend is on port 4000</li>
              <li>Verify no firewall blocking localhost</li>
            </ol>
          </div>
          <button onClick={() => window.location.reload()} className="btn-primary">
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Determine metric status
  const getCriticalStatus = () => {
    if (criticalCount > 5) return 'critical';
    if (criticalCount > 0) return 'elevated';
    return 'normal';
  };

  const getWarningStatus = () => {
    if (warningCount > 20) return 'elevated';
    return 'normal';
  };

  const formatAccuracy = () => {
    if (!accuracy?.accuracy || isNaN(accuracy.accuracy)) return 'N/A';
    return `${(accuracy.accuracy * 100).toFixed(0)}%`;
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* ========== HEADER ========== */}
      <header className="surface-header sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div className="flex items-center">
              <img 
                src="/logo.png" 
                alt="Sentinel Grid - AI Resilience for a Connected World" 
                className="h-10 w-auto"
              />
            </div>

            {/* Center: Demo Mode Stepper */}
            {demoMode && (
              <div className="demo-stepper">
                {demoSteps.map((step) => (
                  <div
                    key={step.id}
                    className={`demo-step ${
                      demoStep === step.id ? 'demo-step-active' : 
                      demoStep > step.id ? 'demo-step-complete' : ''
                    }`}
                  >
                    {demoStep > step.id ? '✓' : step.id}
                  </div>
                ))}
                <span className="text-xs text-cyan-400 ml-2">
                  Step {demoStep}: {demoSteps[demoStep - 1].title}
                </span>
                <button onClick={exitDemo} className="ml-2 p-1 hover:bg-slate-700 rounded" aria-label="Exit demo">
                  <X className="w-3 h-3 text-slate-400" />
                </button>
              </div>
            )}

            {/* Right: Controls */}
            <div className="flex items-center gap-4">
              {/* Connection Status */}
              <div className="flex items-center gap-1.5 text-xs" role="status" aria-live="polite">
                {isConnected ? (
                  <>
                    <Wifi className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                    <span className="text-emerald-400">Connected</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-red-400" aria-hidden="true" />
                    <span className="text-red-400">Disconnected</span>
                  </>
                )}
              </div>

              {/* Simulation Controls */}
              <div className="flex items-center gap-1 border-l border-slate-700 pl-4">
                {isRunning ? (
                  <button
                    onClick={actions.stop}
                    className="btn-ghost btn-small flex items-center gap-1.5"
                    aria-label="Pause simulation"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause</span>
                  </button>
                ) : (
                  <button
                    onClick={actions.start}
                    className="btn-primary btn-small flex items-center gap-1.5"
                    aria-label="Start simulation"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Start</span>
                  </button>
                )}
                <button
                  onClick={() => actions.reset()}
                  className="btn-ghost btn-small"
                  aria-label="Reset simulation"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Demo Mode Toggle */}
              {!demoMode && (
                <button
                  onClick={startDemo}
                  className="btn-secondary btn-small"
                  aria-label="Start demo mode"
                >
                  Demo Mode
                </button>
              )}

              {/* Tick Counter */}
              <div className="text-xs text-slate-500 tabular-nums border-l border-slate-700 pl-4">
                Tick #{tickCount}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ========== DEMO MODE BANNER ========== */}
      {demoMode && (
        <div className="bg-cyan-950/30 border-b border-cyan-500/20 px-4 lg:px-6 py-3">
          <div className="max-w-[1920px] mx-auto flex items-center justify-between">
            <div>
              <p className="text-sm text-cyan-300 font-medium">
                {demoSteps[demoStep - 1].title}
              </p>
              <p className="text-xs text-cyan-400/70">
                {demoSteps[demoStep - 1].description}
              </p>
            </div>
            <button onClick={nextDemoStep} className="btn-primary btn-small flex items-center gap-1">
              {demoStep < 4 ? 'Next Step' : 'Finish Demo'}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ========== METRICS STRIP (Command Center) ========== */}
      <div className="surface-base border-b border-slate-700/50 px-4 lg:px-6 py-4">
        <div className="max-w-[1920px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <MetricCard
              label="Total Nodes"
              value={totalNodes}
              context="Infrastructure assets"
              aria-label="Total monitored nodes"
            />
            <MetricCard
              label="Healthy"
              value={healthyCount}
              context="Operating normally"
              status="normal"
            />
            <MetricCard
              label="Warning"
              value={warningCount}
              context="Requires attention"
              status={getWarningStatus()}
              onViewDetails={() => setActiveTab('network')}
            />
            <MetricCard
              label="Critical"
              value={criticalCount}
              context="Immediate action needed"
              status={getCriticalStatus()}
              onViewDetails={() => setActiveTab('network')}
            />
            <MetricCard
              label="Predictions"
              value={predictions.length}
              context="Next 24 hours"
              status={predictions.length > 5 ? 'elevated' : 'normal'}
              onViewDetails={() => setActiveTab('predictions')}
            />
            <MetricCard
              label="AI Accuracy"
              value={formatAccuracy()}
              context="Last 7 days"
              status="normal"
            />
          </div>
        </div>
      </div>

      {/* ========== MAIN CONTENT ========== */}
      <main className="flex-1 max-w-[1920px] mx-auto w-full px-4 lg:px-6 py-4">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 h-full">
          {/* Main Panel (3 columns) */}
          <div className="xl:col-span-3 surface-card rounded-lg overflow-hidden flex flex-col">
            {/* Tabs */}
            <div className="border-b border-slate-700/50 px-4" role="tablist">
              <div className="flex gap-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  const alertCount = tab.id === 'alerts' ? alerts.length : 0;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`tab-button flex items-center gap-2 ${isActive ? 'tab-button-active' : ''}`}
                      role="tab"
                      aria-selected={isActive}
                      aria-controls={`panel-${tab.id}`}
                    >
                      <Icon className="w-4 h-4" aria-hidden="true" />
                      <span>{tab.label}</span>
                      {alertCount > 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] bg-red-500/80 text-white rounded-full">
                          {alertCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 p-4 overflow-auto" role="tabpanel" id={`panel-${activeTab}`}>
              {activeTab === 'network' && (
                <NetworkTab
                  nodes={nodesList}
                  patterns={patterns}
                  onMitigate={actions.mitigate}
                />
              )}
              {activeTab === 'predictions' && (
                <PredictionsTab
                  predictions={predictions}
                  patterns={patterns}
                  accuracy={accuracy}
                />
              )}
              {activeTab === 'timeline' && (
                <TimelineTab
                  cascades={cascades}
                  systemState={systemState}
                  weather={weather}
                />
              )}
              {activeTab === 'alerts' && (
                <AlertsTab alerts={alerts} />
              )}
            </div>
          </div>

          {/* Sidebar - Operator Action Panel (1 column) */}
          <div className="xl:col-span-1 space-y-4">
            <ControlPanel
              isRunning={isRunning}
              criticalNodes={nodesList.filter(n => n.status === 'critical' || n.status === 'failed')}
              warningNodes={nodesList.filter(n => n.status === 'warning')}
              weather={weather}
              onTriggerCascade={actions.triggerCascade}
              onDeployThreat={actions.deployThreat}
              onClearThreat={actions.clearThreat}
              onMitigateAll={actions.mitigateAll}
            />
            
            {/* Blockchain Status Panel */}
            <BlockchainPanel />
          </div>
        </div>
      </main>

      {/* ========== FOOTER ========== */}
      <footer className="border-t border-slate-800 px-4 py-3">
        <div className="max-w-[1920px] mx-auto flex items-center justify-between text-xs text-slate-500">
          <span>Sentinel Grid v1.0.0 • Monza Tech LLC</span>
          <span>
            Last updated: {new Date().toLocaleTimeString()}
          </span>
        </div>
      </footer>
    </div>
  );
}
