/**
 * ControlPanel - Operator's Action Panel
 * Clean, focused control area for night shift operators
 */

import { useState, useEffect } from 'react';
import { Activity, Shield, AlertTriangle, Zap, Clock, RefreshCw } from 'lucide-react';
import type { Node, WeatherData } from '../types';

interface ControlPanelProps {
  isRunning: boolean;
  criticalNodes: Node[];
  warningNodes: Node[];
  weather: WeatherData | null;
  onTriggerCascade: (nodeId: string, severity?: number) => Promise<unknown>;
  onDeployThreat: (type: string, severity: number, target?: string) => Promise<void>;
  onClearThreat: () => Promise<void>;
  onMitigateAll: () => Promise<unknown>;
}

// Incident Scenarios Presets - must match backend ThreatType
const incidentScenarios = [
  {
    id: 'weather',
    name: 'Weather Stress Test',
    description: 'Simulate extreme weather impact on grid',
    type: 'weather_stress',
    severity: 0.7,
  },
  {
    id: 'cyber',
    name: 'Cyber Attack',
    description: 'Simulated attack on control systems',
    type: 'cyber_attack',
    severity: 0.8,
  },
  {
    id: 'overload',
    name: 'System Overload',
    description: 'Peak demand exceeds capacity',
    type: 'overload',
    severity: 0.75,
  },
  {
    id: 'equipment',
    name: 'Equipment Failure',
    description: 'Major component malfunction',
    type: 'equipment_failure',
    severity: 0.6,
  },
  {
    id: 'intrusion',
    name: 'Physical Intrusion',
    description: 'Unauthorized facility access',
    type: 'physical_intrusion',
    severity: 0.5,
  },
];

export function ControlPanel({
  isRunning,
  criticalNodes,
  warningNodes,
  weather,
  onTriggerCascade,
  onDeployThreat,
  onClearThreat,
  onMitigateAll,
}: ControlPanelProps) {
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [selectedSeverity, setSelectedSeverity] = useState<'low' | 'medium' | 'high'>('medium');
  const [isDeploying, setIsDeploying] = useState(false);
  const [isMitigating, setIsMitigating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Update timestamp periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Clear messages after 3 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const handleMitigateAll = async () => {
    if (criticalNodes.length === 0) {
      setError('No critical nodes to mitigate');
      return;
    }

    setIsMitigating(true);
    setError(null);
    try {
      await onMitigateAll();
      setSuccess(`Mitigated ${criticalNodes.length} critical nodes`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mitigation failed');
    } finally {
      setIsMitigating(false);
    }
  };

  const handleDeployScenario = async () => {
    if (!selectedScenario) {
      setError('Please select a scenario first');
      return;
    }

    const scenario = incidentScenarios.find(s => s.id === selectedScenario);
    if (!scenario) {
      setError('Invalid scenario selected');
      return;
    }

    // Adjust severity based on selection
    const severityMultiplier = selectedSeverity === 'low' ? 0.6 : selectedSeverity === 'high' ? 1.3 : 1.0;
    const adjustedSeverity = Math.min(1, scenario.severity * severityMultiplier);

    setIsDeploying(true);
    setError(null);
    try {
      await onDeployThreat(scenario.type, adjustedSeverity);
      setSuccess(`Deployed: ${scenario.name}`);
      setSelectedScenario(''); // Reset selection
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scenario deployment failed');
    } finally {
      setIsDeploying(false);
    }
  };

  const handleClearThreat = async () => {
    setIsClearing(true);
    setError(null);
    try {
      await onClearThreat();
      setSuccess('Active threat cleared');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear threat');
    } finally {
      setIsClearing(false);
    }
  };

  const handleTriggerCascade = async () => {
    if (criticalNodes.length === 0) {
      setError('No critical nodes for cascade');
      return;
    }

    const origin = criticalNodes[0];
    setError(null);
    try {
      await onTriggerCascade(origin.id, 0.7);
      setSuccess(`Cascade triggered from ${origin.name || origin.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cascade trigger failed');
    }
  };

  const getSelectedScenario = () => {
    return incidentScenarios.find(s => s.id === selectedScenario);
  };

  return (
    <div className="space-y-4">
      {/* ========== SYSTEM STATUS ========== */}
      <div className="surface-card p-4 rounded-lg">
        <h3 className="text-section-title flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-blue-400" />
          System Status
        </h3>

        <div className="space-y-3">
          {/* Simulation Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Simulation</span>
            <span className={isRunning ? 'status-healthy' : 'status-offline'}>
              {isRunning ? 'Running' : 'Stopped'}
            </span>
          </div>

          {/* Critical Nodes */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Critical Nodes</span>
            <span className={`text-sm font-medium tabular-nums ${
              criticalNodes.length > 0 ? 'text-red-400' : 'text-emerald-400'
            }`}>
              {criticalNodes.length}
            </span>
          </div>

          {/* Warning Nodes */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Warning Nodes</span>
            <span className={`text-sm font-medium tabular-nums ${
              warningNodes.length > 0 ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {warningNodes.length}
            </span>
          </div>

          {/* Weather */}
          {weather && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Weather</span>
              <span className="text-sm text-slate-300 capitalize">
                {weather.condition?.replace(/_/g, ' ') || 'Unknown'}
              </span>
            </div>
          )}

          {/* Last Updated */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Last updated
            </span>
            <span className="text-xs text-slate-500 tabular-nums">
              {lastUpdated.toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>

      {/* ========== STATUS MESSAGES ========== */}
      {error && (
        <div className="surface-card p-3 border-red-500/40 bg-red-950/20 rounded-lg animate-fade-in">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="surface-card p-3 border-emerald-500/40 bg-emerald-950/20 rounded-lg animate-fade-in">
          <p className="text-sm text-emerald-400">{success}</p>
        </div>
      )}

      {/* ========== QUICK ACTIONS ========== */}
      <div className="surface-card p-4 rounded-lg">
        <h3 className="text-section-title flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-blue-400" />
          Quick Actions
        </h3>

        <div className="space-y-2">
          {/* Mitigate All Critical */}
          <button
            onClick={handleMitigateAll}
            disabled={isMitigating || criticalNodes.length === 0}
            className="btn-primary w-full flex items-center justify-center gap-2"
            aria-label={`Mitigate all ${criticalNodes.length} critical nodes`}
          >
            {isMitigating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Mitigating...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4" />
                Mitigate All Critical ({criticalNodes.length})
              </>
            )}
          </button>

          {/* Clear Active Threat */}
          <button
            onClick={handleClearThreat}
            disabled={isClearing}
            className="btn-secondary w-full flex items-center justify-center gap-2"
          >
            {isClearing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Clearing...
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4" />
                Clear Active Threat
              </>
            )}
          </button>

          {/* Trigger Cascade (for testing) */}
          <button
            onClick={handleTriggerCascade}
            disabled={criticalNodes.length === 0}
            className="btn-ghost w-full flex items-center justify-center gap-2 text-amber-400 hover:text-amber-300"
            title="Triggers cascade from highest risk critical node"
          >
            <Zap className="w-4 h-4" />
            Trigger Test Cascade
          </button>
        </div>
      </div>

      {/* ========== INCIDENT SCENARIOS ========== */}
      <div className="surface-card p-4 rounded-lg">
        <h3 className="text-section-title flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          Incident Scenarios
        </h3>

        <p className="text-xs text-slate-500 mb-3">
          Select a preset scenario to test system resilience.
        </p>

        {/* Scenario Selector */}
        <div className="mb-3">
          <select
            value={selectedScenario}
            onChange={(e) => setSelectedScenario(e.target.value)}
            className="select-field text-sm"
            aria-label="Select incident scenario"
          >
            <option value="">Select scenario...</option>
            {incidentScenarios.map((scenario) => (
              <option key={scenario.id} value={scenario.id}>
                {scenario.name}
              </option>
            ))}
          </select>
        </div>

        {/* Severity Selector */}
        <div className="mb-3">
          <label className="block text-xs text-slate-500 mb-1">Severity Level</label>
          <div className="flex gap-2">
            {(['low', 'medium', 'high'] as const).map((level) => (
              <button
                key={level}
                onClick={() => setSelectedSeverity(level)}
                className={`flex-1 py-1.5 px-3 text-xs rounded transition-colors ${
                  selectedSeverity === level
                    ? level === 'high' 
                      ? 'bg-red-500/20 text-red-400 border border-red-500/50' 
                      : level === 'medium'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                        : 'bg-slate-600/20 text-slate-400 border border-slate-500/50'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 hover:bg-slate-700'
                }`}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Scenario Info */}
        {selectedScenario && getSelectedScenario() && (
          <div className="bg-slate-800/50 rounded-lg p-3 mb-3">
            <p className="text-sm text-slate-200 font-medium">
              {getSelectedScenario()?.name}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {getSelectedScenario()?.description}
            </p>
            <div className="flex items-center gap-4 mt-2 text-xs">
              <span className="text-slate-400">
                Type: <span className="text-slate-300">{getSelectedScenario()?.type.replace(/_/g, ' ')}</span>
              </span>
              <span className="text-slate-400">
                Severity: <span className="text-amber-400">{((getSelectedScenario()?.severity || 0) * 100).toFixed(0)}%</span>
              </span>
            </div>
          </div>
        )}

        {/* Deploy Button */}
        <button
          onClick={handleDeployScenario}
          disabled={!selectedScenario || isDeploying}
          className="btn-danger w-full flex items-center justify-center gap-2"
        >
          {isDeploying ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Deploying...
            </>
          ) : (
            'Deploy Scenario'
          )}
        </button>
      </div>

      {/* ========== TIPS ========== */}
      <div className="text-xs text-slate-500 px-1">
        <p className="font-medium text-slate-400 mb-1">Operator Tips:</p>
        <ul className="space-y-1">
          <li>• Monitor Critical nodes closely during peak hours</li>
          <li>• Use scenarios to test incident response</li>
          <li>• All actions are logged for audit compliance</li>
        </ul>
      </div>
    </div>
  );
}
