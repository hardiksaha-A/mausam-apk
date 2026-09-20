import React, { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { useEnvironmentData } from '../../context/EnvironmentDataContext';
import { usePreferences } from '../../context/PreferencesContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { HALF_WIDTH, useHomeLayout } from '../../hooks/useHomeLayout';
import { HomeHero } from '../../components/mobile/HomeHero';
import { PersonaChips } from '../../components/mobile/PersonaChips';
import { HOME_CARDS } from '../../components/mobile/HomeCards';
import { CustomizeSheet } from '../../components/mobile/CustomizeSheet';
import { DemoSheet } from '../../components/mobile/DemoSheet';
import { GlassCard } from '../../components/mobile/ui';
import { ErrorState } from '../../components/common/States';

const MobileHomePage: React.FC = () => {
  const { preferences, setPersonas } = usePreferences();
  const { weather, status, errorMessage, refresh } = useEnvironmentData();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { order, hidden, save, reset } = useHomeLayout(preferences.personas);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);

  const isLoading = status === 'LOADING' && !weather;
  const isHardError = status === 'ERROR' && !weather;
  const visible = order.filter((id) => !hidden.includes(id));

  return (
    <div>
      <HomeHero />

      <div className="-mt-3 relative">
        <PersonaChips />
      </div>

      <div className="px-5 mt-4">
        {isHardError ? (
          <GlassCard>
            <ErrorState message={errorMessage ?? 'Unable to load environmental data for this location.'} onRetry={refresh} />
          </GlassCard>
        ) : isLoading ? (
          <div className="space-y-3">
            <div className="skeleton h-40 rounded-3xl" />
            <div className="grid grid-cols-2 gap-3">
              <div className="skeleton h-40 rounded-3xl" />
              <div className="skeleton h-40 rounded-3xl" />
            </div>
            <div className="skeleton h-36 rounded-3xl" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 grid-flow-dense">
            {visible.map((id) => {
              const Card = HOME_CARDS[id];
              const half = HALF_WIDTH.has(id);
              return (
                <div key={id} className={half ? 'col-span-1 [&>*]:h-full' : 'col-span-2'}>
                  <Card />
                </div>
              );
            })}
          </div>
        )}

        <button
          onClick={() => setCustomizeOpen(true)}
          className="mt-4 w-full h-12 rounded-2xl border border-dashed border-[var(--color-panel-border)] text-[var(--color-text-secondary)] font-medium inline-flex items-center justify-center gap-2 active:bg-[var(--color-panel-hover)]"
        >
          <SlidersHorizontal size={18} /> {t('m.customize.title')}
        </button>
      </div>

      <CustomizeSheet
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        order={order}
        hidden={hidden}
        onSave={(o, h) => { save(o, h); showToast(t('m.customize.saved'), 'success'); }}
        onChangePersona={() => setDemoOpen(true)}
        onReset={() => { reset(); setPersonas([]); showToast(t('m.customize.wasReset'), 'success'); }}
      />
      <DemoSheet open={demoOpen} onClose={() => setDemoOpen(false)} />
    </div>
  );
};

export default MobileHomePage;
