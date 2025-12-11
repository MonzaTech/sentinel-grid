/**
 * NetworkTab - NOC (Network Operations Center) Style Grid
 * Clean, operational view for infrastructure monitoring
 */

import { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, CheckCircle, AlertTriangle, XCircle, MinusCircle } from 'lucide-react';
import type { Node, Pattern } from '../types';

interface NetworkTabProps {
  nodes: Node[];
  patterns: Pattern[];
  onMitigate: (nodeId: string) => Promise<unknown>;
}

type SortKey = 'risk' | 'name' | 'region' | 'type';
type StatusFilter = 'all' | 'healthy' | 'warning' | 'critical' | 'offline';

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  healthy: { label: 'Healthy', color: 'status-healthy', icon: CheckCircle },
  warning: { label: 'Warning', color: 'status-warning', icon: AlertTriangle },
  critical: { label: 'Critical', color: 'status-critical', icon: XCircle },
  failed: { label: 'Failed', color: 'status-critical', icon: XCircle },
  offline: { label: 'Offline', color: 'status-offline', icon: MinusCircle },
};

export function NetworkTab({ nodes, patterns, onMitigate }: NetworkTabProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortKey>('risk');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [mitigatingId, setMitigatingId] = useState<string | null>(null);

  // Safely handle nodes array
  const safeNodes = useMemo(() => {
    if (!Array.isArray(nodes)) return [];
    return nodes.filter(node => node && typeof node === 'object' && node.id);
  }, [nodes]);

  // Status counts - calculated from actual nodes
  const statusCounts = useMemo(() => {
    const counts = { healthy: 0, warning: 0, critical: 0, offline: 0, failed: 0 };
    safeNodes.forEach((node) => {
      const status = node.status as keyof typeof counts;
      if (counts[status] !== undefined) {
        counts[status]++;
      }
    });
    return counts;
  }, [safeNodes]);

  // Filtered and sorted nodes
  const filteredNodes = useMemo(() => {
    let result = safeNodes.filter((node) => {
      // Search filter
      if (search) {
        const q = search.toLowerCase();
        const name = (node.name || '').toLowerCase();
        const region = (node.region || '').toLowerCase();
        if (!name.includes(q) && !region.includes(q)) {
          return false;
        }
      }
      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'critical' && node.status !== 'critical' && node.status !== 'failed') {
          return false;
        } else if (statusFilter !== 'critical' && node.status !== statusFilter) {
          return false;
        }
      }
      return true;
    });

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'risk':
          return (b.riskScore || 0) - (a.riskScore || 0);
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'region':
          return (a.region || '').localeCompare(b.region || '');
        case 'type':
          return (a.type || '').localeCompare(b.type || '');
        default:
          return 0;
      }
    });

    return result;
  }, [safeNodes, search, statusFilter, sortBy]);

  const selectedNode = selectedNodeId ? safeNodes.find(n => n.id === selectedNodeId) : null;

  const handleMitigate = async (nodeId: string) => {
    setMitigatingId(nodeId);
    try {
      await onMitigate(nodeId);
    } catch (error) {
      console.error('Mitigation failed:', error);
    } finally {
      setMitigatingId(null);
    }
  };

  const formatPercent = (value: number | undefined | null) => {
    if (value === undefined || value === null || isNaN(value)) return 'N/A';
    return `${(value * 100).toFixed(0)}%`;
  };

  const safePatterns = Array.isArray(patterns) ? patterns : [];

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Status Summary Bar */}
      <div className="flex items-center gap-4 text-xs flex-wrap">
        <span className="text-slate-400">Status:</span>
        <span className="text-emerald-400 tabular-nums">{statusCounts.healthy} Healthy</span>
        <span className="text-amber-400 tabular-nums">{statusCounts.warning} Warning</span>
        <span className="text-red-400 tabular-nums">{statusCounts.critical + statusCounts.failed} Critical</span>
        <span className="text-slate-400 tabular-nums">{statusCounts.offline} Offline</span>
        <span className="text-slate-500 ml-auto tabular-nums">{filteredNodes.length} of {safeNodes.length} shown</span>
      </div>

      {/* Active Patterns Warning */}
      {safePatterns.length > 0 && (
        <div className="surface-card p-3 border-l-2 border-l-amber-500">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-400">
                {safePatterns.length} Active Pattern{safePatterns.length > 1 ? 's' : ''} Detected
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {safePatterns.map(p => (p.type || 'unknown').replace(/_/g, ' ')).join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9 py-1.5 text-sm"
            aria-label="Search nodes"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-slate-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="select-field py-1.5 text-sm w-auto"
            aria-label="Filter by status"
          >
            <option value="all">All Status</option>
            <option value="healthy">Healthy ({statusCounts.healthy})</option>
            <option value="warning">Warning ({statusCounts.warning})</option>
            <option value="critical">Critical ({statusCounts.critical + statusCounts.failed})</option>
            <option value="offline">Offline ({statusCounts.offline})</option>
          </select>
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          className="select-field py-1.5 text-sm w-auto"
          aria-label="Sort by"
        >
          <option value="risk">Sort: Risk (High→Low)</option>
          <option value="name">Sort: Name (A→Z)</option>
          <option value="region">Sort: Region</option>
          <option value="type">Sort: Type</option>
        </select>
      </div>

      {/* Node Grid & Details */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Node Grid */}
        <div className="flex-1 overflow-auto">
          {filteredNodes.length === 0 ? (
            <div className="empty-state">
              <Search className="empty-state-icon" />
              <p className="empty-state-title">No nodes found</p>
              <p className="empty-state-text">
                {safeNodes.length === 0 
                  ? 'Waiting for node data from the backend...'
                  : 'Try adjusting your search or filter criteria.'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
              {filteredNodes.map((node) => {
                const config = statusConfig[node.status] || statusConfig.offline;
                const isSelected = selectedNodeId === node.id;
                const isCritical = node.status === 'critical' || node.status === 'failed';
                const isWarning = node.status === 'warning';

                return (
                  <button
                    key={node.id}
                    onClick={() => setSelectedNodeId(isSelected ? null : node.id)}
                    className={`
                      node-card text-left
                      ${isSelected ? 'node-card-selected' : ''}
                      ${isCritical ? 'node-card-critical' : ''}
                      ${isWarning && !isCritical ? 'node-card-warning' : ''}
                    `}
                    aria-pressed={isSelected}
                    aria-label={`${node.name || node.id}, ${config.label}, Risk ${formatPercent(node.riskScore)}`}
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-200 truncate">{node.name || node.id}</p>
                        <p className="text-xs text-slate-500 truncate">{node.region || 'Unknown Region'}</p>
                      </div>
                      <span className={`${config.color} flex-shrink-0`}>{config.label}</span>
                    </div>

                    {/* Metrics Row */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-slate-500">Risk</p>
                        <p className={`font-medium tabular-nums ${
                          (node.riskScore || 0) > 0.7 ? 'text-red-400' :
                          (node.riskScore || 0) > 0.5 ? 'text-amber-400' : 'text-slate-300'
                        }`}>
                          {formatPercent(node.riskScore)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Health</p>
                        <p className="font-medium tabular-nums text-slate-300">{formatPercent(node.health)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Load</p>
                        <p className="font-medium tabular-nums text-slate-300">{formatPercent(node.loadRatio)}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Node Details Panel */}
        {selectedNode && (
          <div className="w-72 flex-shrink-0 surface-card p-4 rounded-lg overflow-auto">
            <div className="flex items-start justify-between mb-4">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-slate-200 truncate">{selectedNode.name || selectedNode.id}</h3>
                <p className="text-xs text-slate-500 truncate">
                  {selectedNode.region || 'Unknown'} • {(selectedNode.type || 'unknown').replace(/_/g, ' ')}
                </p>
              </div>
              <button
                onClick={() => setSelectedNodeId(null)}
                className="text-slate-500 hover:text-slate-300 text-lg leading-none ml-2"
                aria-label="Close details"
              >
                ×
              </button>
            </div>

            {/* Status */}
            <div className="mb-4">
              <span className={statusConfig[selectedNode.status]?.color || 'status-offline'}>
                {statusConfig[selectedNode.status]?.label || 'Unknown'}
              </span>
            </div>

            {/* Detailed Metrics */}
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Risk Score</span>
                <span className="font-medium tabular-nums">{formatPercent(selectedNode.riskScore)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Health</span>
                <span className="font-medium tabular-nums">{formatPercent(selectedNode.health)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Load</span>
                <span className="font-medium tabular-nums">{formatPercent(selectedNode.loadRatio)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Temperature</span>
                <span className="font-medium tabular-nums">
                  {selectedNode.temperature != null ? `${selectedNode.temperature.toFixed(1)}°C` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Connections</span>
                <span className="font-medium tabular-nums">
                  {Array.isArray(selectedNode.connections) ? selectedNode.connections.length : 0}
                </span>
              </div>
            </div>

            {/* Actions */}
            {(selectedNode.status === 'critical' || selectedNode.status === 'warning' || selectedNode.status === 'failed') && (
              <div className="mt-4 pt-4 border-t border-slate-700">
                <button
                  onClick={() => handleMitigate(selectedNode.id)}
                  disabled={mitigatingId === selectedNode.id}
                  className="btn-primary w-full"
                >
                  {mitigatingId === selectedNode.id ? 'Applying...' : 'Apply Mitigation'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
