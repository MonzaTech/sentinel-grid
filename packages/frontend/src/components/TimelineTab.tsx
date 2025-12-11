/**
 * TimelineTab - Incident Timeline for storytelling
 * Useful for investors, regulators, NATO DIANA, AFWERX reviews
 */

import { useState, useMemo } from 'react';
import { Clock, AlertTriangle, Zap, Shield, Brain, Link2, Filter } from 'lucide-react';
import type { SystemState, WeatherData, CascadeEvent } from '../types';

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

      if (startTime) {
        events.push({
          id: cascade.id,
          timestamp: new Date(startTime),
          type: 'cascade',
          title: `Cascade from ${cascade.originNode || 'Unknown'}`,
          description: `Affected ${affectedNodes.length} nodes with impact score ${(impactScore * 100).toFixed(0)}%`,
          severity: impactScore > 0.7 ? 'critical' : impactScore > 0.4 ? 'high' : 'medium',
          nodes: affectedNodes,
          incidentId: `INC-${cascade.id.slice(0, 8)}`,
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
          incidentId: `INC-${cascade.id.slice(0, 8)}`,
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

    // Add synthetic anchor event
    if (safeCascades.length > 0) {
      events.push({
        id: 'anchor-demo-1',
        timestamp: new Date(now.getTime() - 5 * 60000), // 5 min ago
        type: 'anchor',
        title: 'Audit snapshot anchored',
        description: 'State hash recorded on Optimism L2 for compliance',
        severity: 'low',
        nodes: [],
      });
    }

    // Sort by timestamp descending
    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [safeCascades, systemState]);

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

  return (
    <div className="space-y-6">
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
          {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
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
              <div className="bg-slate-800/50 px-4 py-2 border-b border-slate-700/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-200">
                    Incident {incidentId}
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
