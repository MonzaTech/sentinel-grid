/**
 * BlockchainPanel - Compact Optimism/Blockchain Status Panel
 * Shows connection status, pending anchors, and last transaction
 */

import { useState, useEffect, useCallback } from 'react';
import { Link2, Check, X, RefreshCw, ExternalLink } from 'lucide-react';
import { api } from '../services/api';

interface ContractStatus {
  connected: boolean;
  chain: string;
  contractAddress?: string;
  lastAnchor?: string;
  pendingAnchors: number;
}

export function BlockchainPanel() {
  const [status, setStatus] = useState<ContractStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.contract.status();
      setStatus(res.data);
    } catch (err) {
      // Blockchain might be disabled
      setError('Blockchain disabled');
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleSubmitPending = async () => {
    if (!status?.pendingAnchors) return;
    setIsSubmitting(true);
    try {
      await api.contract.batchSubmit();
      await fetchStatus();
    } catch (err) {
      console.error('Failed to submit anchors:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const truncateAddress = (addr?: string) => {
    if (!addr) return 'N/A';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (error) {
    return (
      <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link2 className="w-3.5 h-3.5" />
          <span>Blockchain: Disabled</span>
        </div>
        <p className="text-[10px] text-slate-600 mt-1">
          Set ENABLE_BLOCKCHAIN=true to enable
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-medium text-slate-300">On-Chain Audit</span>
        </div>
        <button
          onClick={fetchStatus}
          disabled={isLoading}
          className="p-1 hover:bg-slate-700 rounded transition-colors"
          title="Refresh status"
        >
          <RefreshCw className={`w-3 h-3 text-slate-400 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Status */}
      {status && (
        <div className="space-y-2">
          {/* Connection Status */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Status</span>
            <div className="flex items-center gap-1.5">
              {status.connected ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Connected</span>
                </>
              ) : (
                <>
                  <X className="w-3 h-3 text-slate-500" />
                  <span className="text-slate-500">Disconnected</span>
                </>
              )}
            </div>
          </div>

          {/* Chain */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Chain</span>
            <span className="text-slate-300 capitalize">{status.chain || 'Optimism Sepolia'}</span>
          </div>

          {/* Contract Address */}
          {status.contractAddress && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Contract</span>
              <a
                href={`https://sepolia-optimism.etherscan.io/address/${status.contractAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
              >
                {truncateAddress(status.contractAddress)}
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          )}

          {/* Pending Anchors */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Pending Anchors</span>
            <span className={status.pendingAnchors > 0 ? 'text-amber-400' : 'text-slate-400'}>
              {status.pendingAnchors}
            </span>
          </div>

          {/* Submit Button */}
          {status.pendingAnchors > 0 && (
            <button
              onClick={handleSubmitPending}
              disabled={isSubmitting}
              className="w-full mt-2 py-1.5 text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded hover:bg-cyan-500/30 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : `Submit ${status.pendingAnchors} Anchor(s)`}
            </button>
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoading && !status && (
        <div className="flex items-center justify-center py-2">
          <RefreshCw className="w-4 h-4 text-slate-500 animate-spin" />
        </div>
      )}
    </div>
  );
}

export default BlockchainPanel;
