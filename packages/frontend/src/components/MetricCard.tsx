/**
 * MetricCard - Enterprise command center metric display
 * Robust handling of any value type
 */

type MetricStatus = 'normal' | 'elevated' | 'critical' | 'offline';

interface MetricCardProps {
  label: string;
  value: unknown;
  context?: string;
  status?: MetricStatus;
  onViewDetails?: () => void;
  loading?: boolean;
  'aria-label'?: string;
}

const statusConfig: Record<MetricStatus, { pill: string; card: string; text: string }> = {
  normal: {
    pill: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    card: '',
    text: 'Normal',
  },
  elevated: {
    pill: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    card: 'border-amber-500/30 bg-amber-950/10',
    text: 'Elevated',
  },
  critical: {
    pill: 'bg-red-500/10 text-red-400 border-red-500/20',
    card: 'border-red-500/40 bg-red-950/20',
    text: 'Critical',
  },
  offline: {
    pill: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    card: '',
    text: 'Offline',
  },
};

/**
 * Safely format any value to a displayable string
 */
function formatValue(value: unknown): string {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return 'N/A';
  }

  // Handle NaN
  if (typeof value === 'number' && isNaN(value)) {
    return 'N/A';
  }

  // Handle arrays - return length, not contents
  if (Array.isArray(value)) {
    return String(value.length);
  }

  // Handle objects - return 'N/A' or count of keys
  if (typeof value === 'object') {
    return String(Object.keys(value).length);
  }

  // Handle strings and numbers
  return String(value);
}

export function MetricCard({
  label,
  value,
  context,
  status,
  onViewDetails,
  loading = false,
  'aria-label': ariaLabel,
}: MetricCardProps) {
  const config = status ? statusConfig[status] : null;
  const cardClass = config?.card || '';
  const displayValue = formatValue(value);

  if (loading) {
    return (
      <div className={`metric-card min-h-metric ${cardClass}`} aria-busy="true">
        <div className="skeleton h-3 w-20 mb-3" />
        <div className="skeleton h-8 w-16 mb-2" />
        <div className="skeleton h-2 w-24" />
      </div>
    );
  }

  return (
    <div
      className={`metric-card min-h-metric ${cardClass}`}
      role="region"
      aria-label={ariaLabel || label}
    >
      {/* Label Row */}
      <div className="flex items-center justify-between mb-1 gap-2">
        <span className="text-metric-label truncate">{label}</span>
        {config && (
          <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded border flex-shrink-0 ${config.pill}`}>
            {config.text}
          </span>
        )}
      </div>

      {/* Value */}
      <div className="text-metric-value mb-1 truncate">
        {displayValue}
      </div>

      {/* Context & Actions */}
      <div className="flex items-center justify-between gap-2">
        {context && (
          <span className="text-metric-context truncate">{context}</span>
        )}
        {onViewDetails && Number(displayValue) > 0 && (
          <button
            onClick={onViewDetails}
            className="text-[10px] text-blue-400 hover:text-blue-300 font-medium transition-colors flex-shrink-0"
            aria-label={`View details for ${label}`}
          >
            View details →
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * MetricCardSkeleton - Loading placeholder
 */
export function MetricCardSkeleton() {
  return (
    <div className="metric-card min-h-metric" aria-busy="true">
      <div className="skeleton h-3 w-20 mb-3" />
      <div className="skeleton h-8 w-16 mb-2" />
      <div className="skeleton h-2 w-24" />
    </div>
  );
}

export default MetricCard;
