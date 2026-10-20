import { useEffect, useState } from 'react';
import { HealthCheckData } from '@structured-qa/shared';
import { fetchHealth } from '../services/api';
import { Activity, Database, Server, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export default function HomePage() {
  const [health, setHealth] = useState<HealthCheckData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = async () => {
    setLoading(true);
    setError(null);
    const response = await fetchHealth();
    if (response.success) {
      setHealth(response.data);
    } else {
      setError(response.error.message);
      setHealth(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    checkStatus();
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">
          Platform Foundation &amp; Scaffolding
        </h2>
        <p className="mt-1 text-sm text-slate-600 max-w-3xl">
          Phase 1 establishes the monorepo architecture with npm workspaces, PostgreSQL
          development environment, Kysely query layer, migration infrastructure, and shared
          TypeScript types.
        </p>
      </div>

      {/* Health Status Dashboard */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-primary-600" />
            <h3 className="text-base font-semibold text-slate-900">System Health Monitor</h3>
          </div>
          <button
            onClick={checkStatus}
            disabled={loading}
            data-testid="button-health-refresh"
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin text-primary-600 mb-2" />
            <p className="text-sm">Connecting to backend health check...</p>
          </div>
        ) : error ? (
          <div className="py-8">
            <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-rose-800">Backend Unreachable</h4>
                <p className="text-xs text-rose-700 mt-1">{error}</p>
                <p className="text-xs text-slate-500 mt-2">
                  Ensure the server is running on port 5000 (`npm run dev:server`).
                </p>
              </div>
            </div>
          </div>
        ) : health ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">API Status</span>
                <Server className="w-4 h-4 text-slate-400" />
              </div>
              <div className="mt-2 flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span className="text-lg font-bold text-slate-900 capitalize">
                  {health.status}
                </span>
              </div>
              <span className="text-xs text-slate-500 mt-1 block">
                Uptime: {health.uptimeSeconds}s
              </span>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Database</span>
                <Database className="w-4 h-4 text-slate-400" />
              </div>
              <div className="mt-2 flex items-center space-x-2">
                {health.database.connected ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="text-lg font-bold text-slate-900">Connected</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    <span className="text-lg font-bold text-slate-900">Degraded</span>
                  </>
                )}
              </div>
              <span className="text-xs text-slate-500 mt-1 block">
                {health.database.connected
                  ? `Latency: ${health.database.latencyMs}ms`
                  : 'PostgreSQL not started'}
              </span>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Environment</span>
                <span className="text-xs font-mono text-slate-400 uppercase">
                  {health.environment}
                </span>
              </div>
              <div className="mt-2">
                <span className="text-lg font-bold text-slate-900">Node.js LTS</span>
              </div>
              <span className="text-xs text-slate-500 mt-1 block">
                Port 5000 / Proxy 3000
              </span>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Last Verified</span>
                <span className="text-xs text-slate-400 font-mono">UTC</span>
              </div>
              <div className="mt-2">
                <span className="text-sm font-semibold text-slate-900">
                  {new Date(health.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <span className="text-xs text-slate-500 mt-1 block">
                {new Date(health.timestamp).toLocaleDateString()}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Architecture Stack Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h4 className="text-sm font-semibold text-slate-900">Frontend Architecture</h4>
          <ul className="mt-3 space-y-2 text-xs text-slate-600">
            <li>• React 18 + Vite + TypeScript</li>
            <li>• Tailwind CSS for responsive styling</li>
            <li>• Centralized API client</li>
          </ul>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h4 className="text-sm font-semibold text-slate-900">Backend Architecture</h4>
          <ul className="mt-3 space-y-2 text-xs text-slate-600">
            <li>• Express 4.x + TypeScript</li>
            <li>• Controller → Service → Repository (QA-01)</li>
            <li>• Structured error &amp; logging pipeline</li>
          </ul>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h4 className="text-sm font-semibold text-slate-900">Data Architecture</h4>
          <ul className="mt-3 space-y-2 text-xs text-slate-600">
            <li>• PostgreSQL 16 via docker-compose</li>
            <li>• Kysely type-safe query builder</li>
            <li>• Transactional SQL migrations runner</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
