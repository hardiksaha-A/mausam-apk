import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ChevronRight, Cloud, Cpu, LineChart, ListChecks, Pencil, Settings as SettingsIcon, ShieldAlert, Sparkles, Check } from 'lucide-react';
import { usePreferences } from '../../context/PreferencesContext';
import { useToast } from '../../context/ToastContext';
import { getPermission, notifyNow, requestPermission } from '../../native/notifications';
import { tr } from '../../i18n/dynamic';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme, type ThemePreference } from '../../context/ThemeContext';
import { LANGUAGE_NAMES, type Language } from '../../i18n/translations';
import { DemoSheet } from '../../components/mobile/DemoSheet';
import { PersonaChips } from '../../components/mobile/PersonaChips';
import { GlassCard } from '../../components/mobile/ui';
import type { NotificationPrefs } from '../../types';

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex p-1 rounded-2xl bg-[var(--color-bg-primary)] border border-[var(--color-panel-border)]">
      {options.map((o) => (
        <button
          key={o.id}
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={`flex-1 h-11 rounded-xl text-[15px] font-semibold transition-colors ${value === o.id ? 'bg-[var(--color-brand)] text-white shadow-sm' : 'text-[var(--color-text-secondary)]'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const Toggle: React.FC<{ on: boolean; onChange: (v: boolean) => void; label: string }> = ({ on, onChange, label }) => (
  <button
    role="switch"
    aria-checked={on}
    aria-label={label}
    onClick={() => onChange(!on)}
    className={`relative shrink-0 w-14 h-8 rounded-full transition-colors ${on ? 'bg-[var(--color-brand)]' : 'bg-[var(--color-panel-border)]'}`}
  >
    <span className={`absolute top-1 size-6 rounded-full bg-white shadow transition-all ${on ? 'left-7' : 'left-1'}`} />
  </button>
);

const ProfilePage: React.FC = () => {
  const { preferences, setProfile, setUnits, setNotificationPref } = usePreferences();
  const { language, setLanguage, t } = useLanguage();
  const { themePreference, setThemePreference } = useTheme();
  const { showToast } = useToast();
  const [demoOpen, setDemoOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const p = preferences.profile;
  const [draft, setDraft] = useState(p);
  const L = (en: string, hi: string) => (language === 'hi' ? hi : en);

  const notifLabels: Record<keyof NotificationPrefs, string> = {
    severeAqi: L('Severe air quality', 'गंभीर वायु गुणवत्ता'),
    weatherAlerts: L('Weather alerts', 'मौसम चेतावनियाँ'),
    pollutionSpikes: L('Pollution spikes', 'प्रदूषण में उछाल'),
    dailySummary: L('Daily summary', 'दैनिक सारांश'),
  };

  const toggleNotif = async (k: keyof NotificationPrefs, v: boolean) => {
    setNotificationPref(k, v);
    if (v && (await requestPermission()) !== 'granted') showToast(t('m.profile.notifDenied'), 'error');
  };
  const sendTest = async () => {
    let p = await getPermission();
    if (p !== 'granted') p = await requestPermission();
    if (p !== 'granted') {
      showToast(t('m.profile.notifDenied'), 'error');
      return;
    }
    const ok = await notifyNow(tr('Mausam test notification', 'मौसम टेस्ट सूचना'), tr('Notifications are working on this device.', 'इस डिवाइस पर सूचनाएँ काम कर रही हैं।'), 'alerts', `test-${Date.now()}`);
    showToast(ok ? t('m.profile.notifTestSent') : t('m.profile.notifDenied'), ok ? 'success' : 'error');
  };

  const explore = [
    { to: '/air-quality', icon: Cloud, label: t('m.profile.airQuality') },
    { to: '/warnings', icon: ShieldAlert, label: t('m.profile.alerts') },
    { to: '/ai-predictions', icon: Cpu, label: t('m.profile.outlook') },
    { to: '/analytics', icon: LineChart, label: t('m.profile.analytics') },
    { to: '/actions', icon: ListChecks, label: t('m.profile.actions') },
  ];

  const inputCls = 'w-full h-12 rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 text-base text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]';
  const sectionTitle = 'text-lg font-bold text-[var(--color-text-primary)] mb-2 px-1';

  return (
    <div className="space-y-5">
      <h1 className="text-[26px] font-bold text-[var(--color-text-primary)]">{t('m.profile.title')}</h1>

      <GlassCard tint="blue">
        {editing ? (
          <div className="space-y-2.5">
            <input className={inputCls} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder={L('Name', 'नाम')} maxLength={40} />
            <div className="grid grid-cols-2 gap-2.5">
              <input className={inputCls} inputMode="numeric" value={draft.age ?? ''} onChange={(e) => setDraft({ ...draft, age: e.target.value ? Math.max(0, Math.min(120, Number(e.target.value.replace(/\D/g, '')))) : null })} placeholder={L('Age', 'आयु')} />
              <input className={inputCls} value={draft.profession} onChange={(e) => setDraft({ ...draft, profession: e.target.value })} placeholder={L('Profession', 'पेशा')} maxLength={30} />
            </div>
            <button onClick={() => { setProfile(draft); setEditing(false); }} className="w-full h-12 rounded-2xl bg-[var(--color-brand)] text-white font-semibold inline-flex items-center justify-center gap-2"><Check size={18} /> OK</button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <span className="grid place-items-center size-16 rounded-full bg-[var(--color-brand)] text-white text-2xl font-bold shrink-0">{(p.name.trim()[0] ?? 'M').toUpperCase()}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xl font-bold text-[var(--color-text-primary)] truncate">{p.name.trim() || t('m.profile.guest')}</p>
              <p className="text-sm text-[var(--color-text-muted)] truncate">{[p.profession, p.age ? `${p.age}` : ''].filter(Boolean).join(' · ') || ' '}</p>
            </div>
            <button onClick={() => { setDraft(p); setEditing(true); }} aria-label="Edit profile" className="grid place-items-center size-11 rounded-full bg-[var(--color-panel)] text-[var(--color-brand)] border border-[var(--color-panel-border)]"><Pencil size={18} /></button>
          </div>
        )}
      </GlassCard>

      <section>
        <h2 className={sectionTitle}>{t('m.profile.personas')}</h2>
        <p className="text-sm text-[var(--color-text-muted)] mb-2 px-1">{t('m.profile.personasHint')}</p>
        <div className="-mx-4"><PersonaChips /></div>
        <button onClick={() => setDemoOpen(true)} className="mt-3 w-full flex items-center gap-3 rounded-3xl bg-[var(--color-brand)] text-white p-4 text-left active:scale-[0.99] shadow-md">
          <Sparkles size={24} className="shrink-0" />
          <span className="flex-1 min-w-0">
            <span className="block font-bold text-base">{t('m.demo.open')}</span>
            <span className="block text-sm text-white/85">{t('m.demo.openHint')}</span>
          </span>
          <ChevronRight size={22} />
        </button>
      </section>

      <section>
        <h2 className={sectionTitle}>{t('m.profile.preferences')}</h2>
        <GlassCard className="space-y-4">
          <div>
            <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">{t('m.profile.language')}</p>
            <Segmented<Language> label={t('m.profile.language')} value={language} onChange={setLanguage} options={[{ id: 'en', label: LANGUAGE_NAMES.en }, { id: 'hi', label: LANGUAGE_NAMES.hi }]} />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">{t('m.profile.theme')}</p>
            <Segmented<ThemePreference> label={t('m.profile.theme')} value={themePreference} onChange={setThemePreference} options={[{ id: 'light', label: t('m.profile.light') }, { id: 'dark', label: t('m.profile.dark') }, { id: 'system', label: t('m.profile.system') }]} />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">{t('m.profile.units')}</p>
            <Segmented<'metric' | 'imperial'> label={t('m.profile.units')} value={preferences.units} onChange={setUnits} options={[{ id: 'metric', label: `${t('m.profile.metric')} · °C` }, { id: 'imperial', label: `${t('m.profile.imperial')} · °F` }]} />
          </div>
        </GlassCard>
      </section>

      <section>
        <h2 className={sectionTitle}>{t('m.profile.notifications')}</h2>
        <GlassCard>
          <ul className="divide-y divide-[var(--color-panel-border)]">
            {(Object.keys(notifLabels) as (keyof NotificationPrefs)[]).map((k) => (
              <li key={k} className="flex items-center gap-3 py-3 first:pt-0">
                <Bell size={18} className="text-[var(--color-text-muted)] shrink-0" />
                <span className="flex-1 text-base text-[var(--color-text-primary)]">{notifLabels[k]}</span>
                <Toggle on={preferences.notifications[k]} onChange={(v) => void toggleNotif(k, v)} label={notifLabels[k]} />
              </li>
            ))}
          </ul>
          <button onClick={() => void sendTest()} className="mt-3 w-full h-12 rounded-2xl bg-[var(--color-brand-soft)] text-[var(--color-brand)] font-semibold inline-flex items-center justify-center gap-2 active:scale-[0.99]">
            <Bell size={18} /> {t('m.profile.notifTest')}
          </button>
          <p className="text-xs text-[var(--color-text-muted)] mt-3 leading-snug">{t('m.profile.notifNote')}</p>
        </GlassCard>
      </section>

      <section>
        <h2 className={sectionTitle}>{t('m.profile.explore')}</h2>
        <GlassCard className="!p-0 overflow-hidden">
          <ul className="divide-y divide-[var(--color-panel-border)]">
            {explore.map(({ to, icon: Icon, label }) => (
              <li key={to}>
                <Link to={to} className="flex items-center gap-3 px-4 min-h-[56px] active:bg-[var(--color-panel-hover)]">
                  <Icon size={20} className="text-[var(--color-brand)]" />
                  <span className="flex-1 text-base font-medium text-[var(--color-text-primary)]">{label}</span>
                  <ChevronRight size={20} className="text-[var(--color-text-muted)]" />
                </Link>
              </li>
            ))}
            <li>
              <Link to="/settings" className="flex items-center gap-3 px-4 min-h-[56px] active:bg-[var(--color-panel-hover)]">
                <SettingsIcon size={20} className="text-[var(--color-brand)]" />
                <span className="flex-1 text-base font-medium text-[var(--color-text-primary)]">{t('m.profile.allSettings')}</span>
                <ChevronRight size={20} className="text-[var(--color-text-muted)]" />
              </Link>
            </li>
          </ul>
        </GlassCard>
      </section>

      <p className="text-sm text-[var(--color-text-muted)] leading-relaxed px-1">{t('m.profile.about')}</p>
      <p className="text-xs text-[var(--color-text-muted)] text-center">Mausam 1.0.0 · SIH26076</p>

      <DemoSheet open={demoOpen} onClose={() => setDemoOpen(false)} />
    </div>
  );
};

export default ProfilePage;
