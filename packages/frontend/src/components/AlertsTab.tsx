/**
 * AlertsTab - Alert Management with proper error handling
 * Shows status, severity, source, and linked incidents
 */

import { useState, useMemo } from 'react';
import { Bell, CheckCircle, Clock, AlertTriangle, Filter, Brain, User, Link2, Download } from 'lucide-react';
import type { Alert } from '../types';

interface AlertsTabProps {
  alerts: Alert[];
}

type AlertStatusFilter = 'all' | 'active' | 'acknowledged' | 'resolved';
type AlertSeverityFilter = 'all' | 'critical' | 'warning' | 'info';

const severityConfig: Record<string, { label: string; color: string; textColor: string }> = {
  critical: { label: 'Critical', color: 'status-critical', textColor: 'text-red-400' },
  emergency: { label: 'Emergency', color: 'status-critical', textColor: 'text-red-400' },
  warning: { label: 'Warning', color: 'status-warning', textColor: 'text-amber-400' },
  info: { label: 'Info', color: 'status-ai', textColor: 'text-cyan-400' },
};

const statusIcons: Record<string, { icon: typeof AlertTriangle; color: string }> = {
  active: { icon: AlertTriangle, color: 'text-red-400' },
  acknowledged: { icon: Clock, color: 'text-amber-400' },
  resolved: { icon: CheckCircle, color: 'text-emerald-400' },
};

const sourceIcons: Record<string, { label: string; icon: typeof Brain }> = {
  ai: { label: 'AI', icon: Brain },
  manual: { label: 'Manual', icon: User },
  external: { label: 'External', icon: Link2 },
};

export function AlertsTab({ alerts }: AlertsTabProps) {
  const [statusFilter, setStatusFilter] = useState<AlertStatusFilter>('all');
  const [severityFilter, setSeverityFilter] = useState<AlertSeverityFilter>('all');
  const [isExporting, setIsExporting] = useState(false);

  // Handle export
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/logs/export?format=json');
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sentinel-grid-logs-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Safely handle alerts array
  const safeAlerts = useMemo(() => {
    if (!Array.isArray(alerts)) return [];
    return alerts.filter(alert => alert && typeof alert === 'object');
  }, [alerts]);

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    return safeAlerts.filter((alert) => {
      if (statusFilter !== 'all' && alert.status !== statusFilter) return false;
      if (severityFilter !== 'all' && alert.severity !== severityFilter) return false;
      return true;
    });
  }, [safeAlerts, statusFilter, severityFilter]);

  // Count by status
  const statusCounts = useMemo(() => {
    return safeAlerts.reduce(
      (acc, alert) => {
        const status = alert.status;
        if (status && acc[status] !== undefined) {
          acc[status]++;
        }
        return acc;
      },
      { active: 0, acknowledged: 0, resolved: 0 }
    );
  }, [safeAlerts]);

  const formatTime = (timestamp: string | Date | undefined | null) => {
    if (!timestamp) return 'N/A';
    try {
      const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'N/A';
    }
  };

  const formatDate = (timestamp: string | Date | undefined | null) => {
    if (!timestamp) return '';
    try {
      const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* ========== SUMMARY BAR ========== */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-red-400 font-medium tabular-nums">{statusCounts.active}</span>
            <span className="text-slate-500">Active</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-medium tabular-nums">{statusCounts.acknowledged}</span>
            <span className="text-slate-500">Acknowledged</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-medium tabular-nums">{statusCounts.resolved}</span>
            <span className="text-slate-500">Resolved</span>
          </div>
        </div>
        
        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center gap-2 px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          {isExporting ? 'Exporting...' : 'Export Logs'}
        </button>
      </div>

      {/* ========== FILTERS ========== */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" aria-hidden="true" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AlertStatusFilter)}
            className="select-field text-sm py-1.5 w-auto"
            aria-label="Filter by status"
          >
            <option value="all">All Status</option>
            <option value="active">Active ({statusCounts.active})</option>
            <option value="acknowledged">Acknowledged ({statusCounts.acknowledged})</option>
            <option value="resolved">Resolved ({statusCounts.resolved})</option>
          </select>
        </div>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as AlertSeverityFilter)}
          className="select-field text-sm py-1.5 w-auto"
          aria-label="Filter by severity"
        >
          <option value="all">All Severity</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>

        <span className="text-xs text-slate-500 ml-auto tabular-nums">
          {filteredAlerts.length} alert{filteredAlerts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ========== ALERTS LIST ========== */}
      {filteredAlerts.length === 0 ? (
        <div className="empty-state" role="status" aria-live="polite">
          <Bell className="empty-state-icon" aria-hidden="true" />
          <p className="empty-state-title">
            {safeAlerts.length === 0 ? 'No alerts' : 'No matching alerts'}
          </p>
          <p className="empty-state-text">
            {safeAlerts.length === 0
              ? 'The system is operating normally. Alerts will appear here when anomalies are detected.'
              : 'Try adjusting your filter criteria to see more alerts.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredAlerts.map((alert) => {
            const severity = severityConfig[alert.severity] || severityConfig.info;
            const statusIcon = statusIcons[alert.status] || statusIcons.active;
            const StatusIcon = statusIcon.icon;
            const source = sourceIcons[alert.source || 'ai'];
            const SourceIcon = source.icon;

            return (
              <div 
                key={alert.id} 
                className="surface-card p-4 rounded-lg"
              >
                <div className="flex items-start gap-4">
                  {/* Status Icon */}
                  <div className={`mt-0.5 ${statusIcon.color}`}>
                    <StatusIcon className="w-5 h-5" aria-hidden="true" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-200">
                          {alert.title || alert.message || 'Alert'}
                        </p>
                        {alert.message && alert.title && (
                          <p className="text-xs text-slate-400 mt-1 truncate">
                            {alert.message}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-slate-300">{formatTime(alert.timestamp || alert.triggeredAt)}</p>
                        <p className="text-[10px] text-slate-500">{formatDate(alert.timestamp || alert.triggeredAt)}</p>
                      </div>
                    </div>

                    {/* Meta Row */}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {/* Severity */}
                      <span className={severity.color}>{severity.label}</span>
                      
                      {/* Status */}
                      <span className="text-xs text-slate-400 capitalize">{alert.status}</span>
                      
                      {/* Source */}
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <SourceIcon className="w-3 h-3" aria-hidden="true" />
                        <span>{source.label}</span>
                      </div>

                      {/* Node ID */}
                      {alert.nodeId && (
                        <span className="text-xs text-slate-500">
                          Node: {alert.nodeId}
                        </span>
                      )}

                      {/* Linked Incident */}
                      {alert.incidentId && (
                        <span className="text-xs text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                          {alert.incidentId}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========== ACCESSIBILITY NOTE ========== */}
      <div className="sr-only" role="status" aria-live="polite">
        {filteredAlerts.length} alerts displayed. {statusCounts.active} active, {statusCounts.acknowledged} acknowledged, {statusCounts.resolved} resolved.
      </div>
    </div>
  );
}
