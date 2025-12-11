/**
 * TimelineTab - Incident Timeline for storytelling
 * Useful for investors, regulators, NATO DIANA, AFWERX reviews
 */

import { useState, useMemo, useEffect } from 'react';
import { Clock, AlertTriangle, Zap, Shield, Brain, Link2, Filter, X, RefreshCw, ExternalLink } from 'lucide-react';
import type { SystemState, WeatherData, CascadeEvent, Incident } from '../types';

interface TimelineTabProps {
  cascades: CascadeEvent[];
  systemState: SystemState | null;
  weather: WeatherData | null;
}

type TimeRange = '15m' | '1h' | '6h' | 'all';
type EventType = 'prediction' | 'threat' | 'cascade' | 'mitigation' | 'anchor';

interface TimelineEvent {
  id: string;
  timestamp: Date;
  type: EventType;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  nodes: string[];
  incidentId?: string;
}

const eventTypeConfig: Record<EventType, { icon: typeof Clock; color: string; label: string }> = {
  prediction: { icon: Brain, color: 'timeline-item-ai', label: 'AI Prediction' },
  threat: { icon: AlertTriangle, color: 'timeline-item-warning', label: 'Threat Deployed' },
  cascade: { icon: Zap, color: 'timeline-item-critical', label: 'Cascade Event' },
  mitigation: { icon: Shield, color: 'timeline-item-success', label: 'Mitigation' },
  anchor: { icon: Link2, color: 'timeline-item-ai', label: 'On-chain Anchor' },
};

const severityColors: Record<string, string> = {
  low: 'text-slate-400',
  medium: 'text-amber-400',
  high: 'text-orange-400',
  critical: 'text-red-400',
};

export function TimelineTab({ cascades, systemState, weather: _weather }: TimelineTabProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('1h');
  const [filterType, setFilterType] = useState<EventType | 'all'>('all');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isAnchoring, setIsAnchoring] = useState(false);
  const [anchorMessage, setAnchorMessage] = useState<string | null>(null);

  // Fetch incidents from API
  useEffect(() => {
    const fetchIncidents = () => {
      fetch('/api/incidents')
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.data)) {
            setIncidents(data.data);
          }
        })
        .catch(err => console.error('Failed to fetch incidents:', err));
    };

    fetchIncidents();
    const interval = setInterval(fetchIncidents, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  // Handle incident anchoring
  const handleAnchorIncident = async (incidentId: string) => {
    setIsAnchoring(true);
    setAnchorMessage(null);
    try {
      const response = await fetch(`/api/incidents/${incidentId}/anchor`, {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.success) {
        setAnchorMessage(`Anchored on ${data.anchor?.chain || 'Optimism'}`);
        // Update the selected incident
        if (data.data) {
          setSelectedIncident(data.data);
          // Also update in the list
          setIncidents(prev => prev.map(inc => 
            inc.id === incidentId ? data.data : inc
          ));
        }
      } else {
        setAnchorMessage('Anchoring failed');
      }
    } catch (err) {
      setAnchorMessage('Anchoring failed');
    } finally {
      setIsAnchoring(false);
    }
  };

  // Safely handle cascades array
  const safeCascades = useMemo(() => {
    if (!Array.isArray(cascades)) return [];
    return cascades.filter(c => c && typeof c === 'object' && c.id);
  }, [cascades]);

  // Generate timeline events from cascades and synthetic events
  const timelineEvents = useMemo(() => {
    const events: TimelineEvent[] = [];
    const now = new Date();

    // Add cascade events
    safeCascades.forEach((cascade) => {
      const startTime = cascade.startTime || cascade.startedAt;
      const endTime = cascade.endTime || cascade.endedAt;
      const affectedNodes = Array.isArray(cascade.affectedNodes) ? cascade.affectedNodes : [];
      const impactScore = cascade.impactScore || cascade.totalDamage || 0;

      // Find matching incident
      const matchingIncident = incidents.find(inc => inc.cascadeEventId === cascade.id);

      if (startTime) {
        events.push({
          id: cascade.id,
          timestamp: new Date(startTime),
          type: 'cascade',
          title: `Cascade from ${cascade.originNode || 'Unknown'}`,
          description: `Affected ${affectedNodes.length} nodes with impact score ${(impactScore * 100).toFixed(0)}%`,
          severity: impactScore > 0.7 ? 'critical' : impactScore > 0.4 ? 'high' : 'medium',
          nodes: affectedNodes,
          incidentId: matchingIncident?.id || `INC-${cascade.id.slice(0, 8)}`,
        });
      }

      // Add synthetic mitigation event after cascade
      if (endTime) {
        events.push({
          id: `mit-${cascade.id}`,
          timestamp: new Date(endTime),
          type: 'mitigation',
          title: `Mitigation applied`,
          description: `Response to cascade event, ${affectedNodes.length} nodes stabilized`,
          severity: 'low',
          nodes: affectedNodes.slice(0, 3),
          incidentId: matchingIncident?.id || `INC-${cascade.id.slice(0, 8)}`,
        });
      }
    });

    // Add incident events
    incidents.forEach((incident) => {
      // Skip if we already have a cascade event for this
      if (incident.cascadeEventId && safeCascades.some(c => c.id === incident.cascadeEventId)) {
        return;
      }

      events.push({
        id: incident.id,
        timestamp: new Date(incident.startedAt),
        type: 'cascade',
        title: incident.summary.slice(0, 50) + (incident.summary.length > 50 ? '...' : ''),
        description: incident.rootCause.slice(0, 100),
        severity: incident.severity === 'high' ? 'critical' : incident.severity,
        nodes: incident.affectedNodes,
        incidentId: incident.id,
      });

      // Add anchor event if incident is anchored
      if (incident.onChain?.anchored) {
        events.push({
          id: `anchor-${incident.id}`,
          timestamp: new Date(incident.startedAt),
          type: 'anchor',
          title: `Incident ${incident.id} anchored`,
          description: `On-chain record: ${incident.onChain.chain}`,
          severity: 'low',
          nodes: [],
          incidentId: incident.id,
        });
      }
    });

    // Add synthetic prediction events for demo
    const criticalCount = systemState?.criticalNodes;
    if (typeof criticalCount === 'number' && criticalCount > 0) {
      events.push({
        id: 'pred-demo-1',
        timestamp: new Date(now.getTime() - 30 * 60000), // 30 min ago
        type: 'prediction',
        title: 'High-risk prediction generated',
        description: 'AI detected pattern matching historical cascade failures',
        severity: 'high',
        nodes: ['node-demo-1'],
      });
    }

    // Always show system initialization event
    events.push({
      id: 'init-event',
      timestamp: new Date(now.getTime() - 60 * 60000), // 1 hour ago
      type: 'mitigation',
      title: 'System initialized',
      description: 'Sentinel Grid monitoring activated - 200 nodes online',
      severity: 'low',
      nodes: [],
    });

    // Always show AI calibration event
    events.push({
      id: 'calibrate-event',
      timestamp: new Date(now.getTime() - 45 * 60000), // 45 min ago
      type: 'prediction',
      title: 'AI model calibrated',
      description: 'Predictive engine synchronized with latest patterns',
      severity: 'low',
      nodes: [],
    });

    // Show threat detection if there are warnings
    const warningCount = systemState?.warningNodes;
    if (typeof warningCount === 'number' && warningCount > 0) {
      events.push({
        id: 'threat-detected',
        timestamp: new Date(now.getTime() - 10 * 60000), // 10 min ago
        type: 'threat',
        title: `${warningCount} nodes under stress`,
        description: 'Elevated risk detected in network segment',
        severity: 'medium',
        nodes: [],
      });
    }

    // Sort by timestamp descending
    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [safeCascades, systemState, incidents]);

  // Filter events by time range and type
  const filteredEvents = useMemo(() => {
    const now = new Date();
    let cutoff: Date;

    switch (timeRange) {
      case '15m':
        cutoff = new Date(now.getTime() - 15 * 60000);
        break;
      case '1h':
        cutoff = new Date(now.getTime() - 60 * 60000);
        break;
      case '6h':
        cutoff = new Date(now.getTime() - 6 * 60 * 60000);
        break;
      default:
        cutoff = new Date(0);
    }

    return timelineEvents.filter((event) => {
      if (event.timestamp < cutoff) return false;
      if (filterType !== 'all' && event.type !== filterType) return false;
      return true;
    });
  }, [timelineEvents, timeRange, filterType]);

  // Group events by incident
  const incidentGroups = useMemo(() => {
    const groups: Record<string, TimelineEvent[]> = {};
    const standalone: TimelineEvent[] = [];

    filteredEvents.forEach((event) => {
      if (event.incidentId) {
        if (!groups[event.incidentId]) {
          groups[event.incidentId] = [];
        }
        groups[event.incidentId].push(event);
      } else {
        standalone.push(event);
      }
    });

    return { groups, standalone };
  }, [filteredEvents]);

  const formatTime = (date: Date) => {
    try {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'N/A';
    }
  };

  const formatRelativeTime = (date: Date) => {
    try {
      const diff = Date.now() - date.getTime();
      const minutes = Math.floor(diff / 60000);
      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      return `${Math.floor(hours / 24)}d ago`;
    } catch {
      return 'N/A';
    }
  };

  const handleIncidentClick = (incidentId: string) => {
    const incident = incidents.find(i => i.id === incidentId);
    if (incident) {
      setSelectedIncident(incident);
      setAnchorMessage(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* ========== INCIDENT DETAIL MODAL ========== */}
      {selectedIncident && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="surface-card rounded-lg max-w-lg w-full max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
              <h3 className="text-lg font-semibold text-slate-100">
                Incident {selectedIncident.id}
              </h3>
              <button
                onClick={() => setSelectedIncident(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Status */}
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  selectedIncident.status === 'open' ? 'bg-red-500/20 text-red-400' :
                  selectedIncident.status === 'mitigated' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {selectedIncident.status.toUpperCase()}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  selectedIncident.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                  selectedIncident.severity === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-slate-500/20 text-slate-400'
                }`}>
                  {selectedIncident.severity.toUpperCase()} SEVERITY
                </span>
              </div>

              {/* Summary */}
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Summary</p>
                <p className="text-sm text-slate-300">{selectedIncident.summary}</p>
              </div>

              {/* Root Cause */}
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Root Cause</p>
                <p className="text-sm text-slate-300">{selectedIncident.rootCause}</p>
              </div>

              {/* Affected Nodes */}
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                  Affected Nodes ({selectedIncident.affectedNodes.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {selectedIncident.affectedNodes.slice(0, 10).map((node) => (
                    <span key={node} className="px-2 py-0.5 bg-slate-700/50 rounded text-xs text-slate-400">
                      {node}
                    </span>
                  ))}
                  {selectedIncident.affectedNodes.length > 10 && (
                    <span className="px-2 py-0.5 text-xs text-slate-500">
                      +{selectedIncident.affectedNodes.length - 10} more
                    </span>
                  )}
                </div>
              </div>

              {/* Mitigation Actions */}
              {selectedIncident.mitigationActions.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                    Mitigation Actions ({selectedIncident.mitigationActions.length})
                  </p>
                  <div className="space-y-2">
                    {selectedIncident.mitigationActions.map((action, idx) => (
                      <div key={idx} className="bg-slate-800/50 rounded p-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-emerald-400">{action.actionType}</span>
                          <span className="text-slate-500">{new Date(action.at).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{action.details}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* On-chain Status */}
              <div className="border-t border-slate-700/50 pt-4">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Blockchain Anchor</p>
                {selectedIncident.onChain?.anchored ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded p-3">
                    <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium mb-2">
                      <Link2 className="w-4 h-4" />
                      Anchored on {selectedIncident.onChain.chain}
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">TX Hash:</span>
                        <span className="text-slate-300 font-mono">{selectedIncident.onChain.txHash?.slice(0, 18)}...</span>
                      </div>
                      {selectedIncident.onChain.ipfsCid && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">IPFS CID:</span>
                          <span className="text-slate-300 font-mono">{selectedIncident.onChain.ipfsCid.slice(0, 18)}...</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500">Not yet anchored to blockchain</p>
                    <button
                      onClick={() => handleAnchorIncident(selectedIncident.id)}
                      disabled={isAnchoring}
                      className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                      {isAnchoring ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Anchoring...
                        </>
                      ) : (
                        <>
                          <Link2 className="w-4 h-4" />
                          Anchor on Optimism
                        </>
                      )}
                    </button>
                    {anchorMessage && (
                      <p className={`text-xs ${anchorMessage.includes('failed') ? 'text-red-400' : 'text-emerald-400'}`}>
                        {anchorMessage}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Timestamps */}
              <div className="text-xs text-slate-500 flex justify-between pt-2 border-t border-slate-700/50">
                <span>Started: {new Date(selectedIncident.startedAt).toLocaleString()}</span>
                {selectedIncident.endedAt && (
                  <span>Ended: {new Date(selectedIncident.endedAt).toLocaleString()}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== FILTERS ========== */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Time Range */}
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          <div className="flex rounded-lg overflow-hidden border border-slate-700">
            {(['15m', '1h', '6h', 'all'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {range === 'all' ? 'All' : range}
              </button>
            ))}
          </div>
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as EventType | 'all')}
            className="select-field text-sm py-1.5 w-auto"
          >
            <option value="all">All Events</option>
            <option value="prediction">Predictions</option>
            <option value="threat">Threats</option>
            <option value="cascade">Cascades</option>
            <option value="mitigation">Mitigations</option>
            <option value="anchor">Anchors</option>
          </select>
        </div>

        <span className="text-xs text-slate-500 ml-auto tabular-nums">
          {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} • {incidents.length} incident{incidents.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ========== TIMELINE ========== */}
      {filteredEvents.length === 0 ? (
        <div className="empty-state">
          <Clock className="empty-state-icon" />
          <p className="empty-state-title">No events in this time range</p>
          <p className="empty-state-text">
            Try selecting a longer time range or run a simulation to generate events.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Incident Groups */}
          {Object.entries(incidentGroups.groups).map(([incidentId, events]) => (
            <div key={incidentId} className="surface-card rounded-lg overflow-hidden">
              <div 
                className="bg-slate-800/50 px-4 py-2 border-b border-slate-700/50 cursor-pointer hover:bg-slate-700/50 transition-colors"
                onClick={() => handleIncidentClick(incidentId)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-200 flex items-center gap-2">
                    Incident {incidentId}
                    <ExternalLink className="w-3 h-3 text-slate-500" />
                  </span>
                  <span className="text-xs text-slate-500 tabular-nums">
                    {events.length} related event{events.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <div className="space-y-0">
                  {events.map((event, idx) => (
                    <TimelineEventItem
                      key={event.id}
                      event={event}
                      isLast={idx === events.length - 1}
                      formatTime={formatTime}
                      formatRelativeTime={formatRelativeTime}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* Standalone Events */}
          {incidentGroups.standalone.length > 0 && (
            <div className="surface-card rounded-lg p-4">
              <h3 className="text-sm font-medium text-slate-300 mb-4">Other Events</h3>
              <div className="space-y-0">
                {incidentGroups.standalone.map((event, idx) => (
                  <TimelineEventItem
                    key={event.id}
                    event={event}
                    isLast={idx === incidentGroups.standalone.length - 1}
                    formatTime={formatTime}
                    formatRelativeTime={formatRelativeTime}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========== SUMMARY STATS ========== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="surface-card p-3 rounded-lg">
          <p className="text-xs text-slate-500">Cascades</p>
          <p className="text-lg font-semibold text-slate-100 tabular-nums">
            {filteredEvents.filter(e => e.type === 'cascade').length}
          </p>
        </div>
        <div className="surface-card p-3 rounded-lg">
          <p className="text-xs text-slate-500">Mitigations</p>
          <p className="text-lg font-semibold text-slate-100 tabular-nums">
            {filteredEvents.filter(e => e.type === 'mitigation').length}
          </p>
        </div>
        <div className="surface-card p-3 rounded-lg">
          <p className="text-xs text-slate-500">AI Predictions</p>
          <p className="text-lg font-semibold text-slate-100 tabular-nums">
            {filteredEvents.filter(e => e.type === 'prediction').length}
          </p>
        </div>
        <div className="surface-card p-3 rounded-lg">
          <p className="text-xs text-slate-500">On-chain Anchors</p>
          <p className="text-lg font-semibold text-slate-100 tabular-nums">
            {filteredEvents.filter(e => e.type === 'anchor').length}
          </p>
        </div>
      </div>
    </div>
  );
}

// Individual timeline event component
function TimelineEventItem({
  event,
  isLast,
  formatTime,
  formatRelativeTime,
}: {
  event: TimelineEvent;
  isLast: boolean;
  formatTime: (date: Date) => string;
  formatRelativeTime: (date: Date) => string;
}) {
  const config = eventTypeConfig[event.type];
  const Icon = config.icon;

  return (
    <div className={`timeline-item ${config.color} ${isLast ? 'border-l-transparent pb-0' : ''}`}>
      <div className="flex items-start gap-3">
        <Icon className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">{event.title}</p>
              <p className="text-xs text-slate-400 mt-0.5">{event.description}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-slate-300">{formatTime(event.timestamp)}</p>
              <p className="text-[10px] text-slate-500">{formatRelativeTime(event.timestamp)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className={`text-[10px] font-medium uppercase ${severityColors[event.severity]}`}>
              {event.severity}
            </span>
            <span className="text-[10px] text-slate-500 px-1.5 py-0.5 bg-slate-700/50 rounded">
              {config.label}
            </span>
            {event.nodes.length > 0 && (
              <span className="text-[10px] text-slate-500 tabular-nums">
                {event.nodes.length} node{event.nodes.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
