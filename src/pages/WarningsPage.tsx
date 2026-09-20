import { tr, ph, alertStatus } from '../i18n/dynamic';
import { severity, alertCategory } from '../i18n/dynamic';
import React, { useState } from 'react';
import { ShieldAlert, X, Filter, CheckCircle2 } from 'lucide-react';
import { useEnvironmentData } from '../context/EnvironmentDataContext';
import { useLanguage } from '../context/LanguageContext';
import { usePreferences } from '../context/PreferencesContext';
import { sortAlertsForPersonas } from '../services/alertService';
import { Card, CardHeader } from '../components/common/Card';
import { EmptyState, ErrorState, CardSkeleton } from '../components/common/States';
import type { AlertSeverity, AlertStatus, EnvAlert } from '../types';

const SEVERITY_COLOR: Record<AlertSeverity, string> = {
  Low: 'var(--color-accent-blue)',
  Medium: 'var(--color-warning)',
  High: 'var(--color-warning)',
  Critical: 'var(--color-critical)',
};

const STATUS_OPTIONS: (AlertStatus | 'All')[] = ['All', 'Active', 'Acknowledged', 'Resolved'];

const WarningsPage: React.FC = () => {
  const { alerts: liveAlerts, weather, airQuality, status, errorMessage, refresh } = useEnvironmentData();
  const { preferences } = usePreferences();
  const { t } = useLanguage();
  const [localOverrides, setLocalOverrides] = useState<Record<string, AlertStatus>>({});
  const [statusFilter, setStatusFilter] = useState<AlertStatus | 'All'>('All');
  const [selected, setSelected] = useState<EnvAlert | null>(null);

  const alerts = liveAlerts.map((a) => ({ ...a, status: localOverrides[a.id] ?? a.status }));
  const filtered = sortAlertsForPersonas(
    statusFilter === 'All' ? alerts : alerts.filter((a) => a.status === statusFilter),
    preferences.personas
  );

  const setStatus = (id: string, alertStatus: AlertStatus) => {
    setLocalOverrides((prev) => ({ ...prev, [id]: alertStatus }));
    setSelected((prev) => (prev && prev.id === id ? { ...prev, status: alertStatus } : prev));
  };

  const isInitialLoading = status === 'LOADING' && !weather && !airQuality;
  const isHardError = status === 'ERROR' && !weather && !airQuality;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-lg font-bold text-[var(--color-text-primary)]">{tr('Early Warning System', 'पूर्व चेतावनी प्रणाली')}</h1>
        <div className="flex items-center gap-1 rounded-lg bg-[var(--color-bg-secondary)] p-1">
          <Filter size={12} className="text-[var(--color-text-muted)] ml-1.5" />
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-md text-sm font-medium transition-colors ${
                statusFilter === s ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {ph(s)}
            </button>
          ))}
        </div>
      </div>

      {isInitialLoading && <CardSkeleton lines={5} />}

      {!isInitialLoading && isHardError && (
        <Card>
          <ErrorState message={errorMessage ?? tr('Unable to evaluate alert thresholds right now.', 'अभी चेतावनी सीमाओं का मूल्यांकन नहीं हो सका।')} onRetry={refresh} />
        </Card>
      )}

      {!isInitialLoading && !isHardError && (
      <Card>
        <CardHeader
          title={t('pages.warnings.derivedTitle')}
          subtitle={t('pages.warnings.derivedSubtitle')}
          icon={ShieldAlert}
        />
        {filtered.length === 0 ? (
          <EmptyState title={t('pages.warnings.noAlerts')} message={tr('Nothing has crossed a configured threshold right now. Check back later or adjust thresholds in Settings.', 'अभी कोई भी रीडिंग तय सीमा पार नहीं कर पाई है। बाद में देखें या सेटिंग्स में सीमाएँ बदलें।')} icon={CheckCircle2} />
        ) : (
          <ul className="space-y-2.5">
            {filtered.map((a) => (
              <li key={a.id}>
                <button
                  onClick={() => setSelected(a)}
                  className="w-full text-left rounded-xl border border-[var(--color-panel-border)] p-3.5 hover:bg-[var(--color-panel-hover)] transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="size-2.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: SEVERITY_COLOR[a.severity] }} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--color-text-primary)]">{a.type}</p>
                        <p className="text-sm text-[var(--color-text-muted)] truncate">{a.description}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-xs font-bold uppercase" style={{ color: SEVERITY_COLOR[a.severity] }}>{severity(a.severity)}</span>
                      <span className="text-sm text-[var(--color-text-muted)]">{alertStatus(a.status)}</span>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <button className="absolute inset-0 bg-black/60 animate-fade-in" aria-label={tr('Close alert details', 'चेतावनी विवरण बंद करें')} onClick={() => setSelected(null)} />
          <div className="animate-slide-up relative w-full sm:max-w-md bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="text-xs font-bold uppercase" style={{ color: SEVERITY_COLOR[selected.severity] }}>{severity(selected.severity)} · {alertCategory(selected.category)}</span>
                <h2 className="text-base font-bold text-[var(--color-text-primary)] mt-0.5">{selected.type}</h2>
              </div>
              <button onClick={() => setSelected(null)} aria-label={tr('Close', 'बंद करें')} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
                <X size={18} />
              </button>
            </div>

            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs uppercase text-[var(--color-text-muted)] mb-0.5">{tr('Description', 'विवरण')}</dt>
                <dd className="text-[var(--color-text-secondary)]">{selected.description}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-[var(--color-text-muted)] mb-0.5">{tr('Cause', 'कारण')}</dt>
                <dd className="text-[var(--color-text-secondary)]">{selected.cause}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-[var(--color-text-muted)] mb-0.5">{tr('Recommended Action', 'सुझाई गई कार्रवाई')}</dt>
                <dd className="text-[var(--color-text-secondary)]">{selected.action}</dd>
              </div>
              <div className="flex gap-6 flex-wrap">
                <div>
                  <dt className="text-xs uppercase text-[var(--color-text-muted)] mb-0.5">{tr('Location', 'स्थान')}</dt>
                  <dd className="text-[var(--color-text-secondary)]">{selected.location}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-[var(--color-text-muted)] mb-0.5">{tr('Time', 'समय')}</dt>
                  <dd className="text-[var(--color-text-secondary)]">{new Date(selected.timestamp).toLocaleTimeString()}</dd>
                </div>
                {selected.measurement && (
                  <div>
                    <dt className="text-xs uppercase text-[var(--color-text-muted)] mb-0.5">{tr('Measurement', 'माप')}</dt>
                    <dd className="text-[var(--color-text-secondary)]">{selected.measurement}</dd>
                  </div>
                )}
              </div>
            </dl>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setStatus(selected.id, 'Acknowledged')}
                className="flex-1 rounded-lg border border-[var(--color-panel-border)] py-2 text-xs font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-panel-hover)] transition-colors"
              >
                {tr('Acknowledge', 'स्वीकार करें')}
              </button>
              <button
                onClick={() => setStatus(selected.id, 'Resolved')}
                className="flex-1 rounded-lg bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30 py-2 text-xs font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent)]/25 transition-colors"
              >
                {tr('Mark Resolved', 'हल हुआ चिह्नित करें')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarningsPage;
