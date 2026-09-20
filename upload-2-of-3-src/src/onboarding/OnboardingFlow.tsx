import React, { useState } from 'react';
import { Leaf, ArrowRight, ArrowLeft, Heart, Activity, Plane, Users, Sprout, Waves, Check, MapPin, User as UserIcon, Car, PartyPopper } from 'lucide-react';
import { usePreferences } from '../context/PreferencesContext';
import { useAppLocation } from '../context/LocationContext';
import { useLanguage } from '../context/LanguageContext';
import { LocationSearch } from '../components/layout/LocationSearch';
import type { Persona, UserProfile } from '../types';

const PERSONA_ICONS: Record<Persona, React.ElementType> = {
  health: Heart,
  fitness: Activity,
  travel: Plane,
  family: Users,
  agriculture: Sprout,
  marine: Waves,
  commuter: Car,
  eventPlanner: PartyPopper,
};

const ALL_PERSONAS: Persona[] = ['health', 'fitness', 'travel', 'family', 'agriculture', 'marine', 'commuter', 'eventPlanner'];

const PROFESSION_KEYS = [
  'student', 'farmer', 'teacher', 'healthcareWorker', 'officeWorker', 'homemaker', 'retired', 'other',
] as const;

const TOTAL_STEPS = 4;

export const OnboardingFlow: React.FC = () => {
  const { completeOnboarding } = usePreferences();
  const { location, saveLocation } = useAppLocation();
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [profession, setProfession] = useState('');
  const [selectedPersonas, setSelectedPersonas] = useState<Persona[]>([]);
  const [locationConfirmed, setLocationConfirmed] = useState(false);

  const togglePersona = (p: Persona) => {
    setSelectedPersonas((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const finish = () => {
    const profile: UserProfile = {
      name: name.trim(),
      age: age ? Number(age) : null,
      profession: profession.trim(),
    };
    // The location picked/confirmed during onboarding becomes their first
    // saved place — a sensible "Home" default rather than an empty list.
    saveLocation(location, 'Home');
    completeOnboarding(profile, selectedPersonas);
  };

  const canProceed = step === 0 || step === 1 || (step === 2 && (locationConfirmed || true)) || step === 3;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-primary)] p-4">
      <div className="w-full max-w-lg">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-8 bg-[var(--color-accent)]' : i < step ? 'w-1.5 bg-[var(--color-accent)]/50' : 'w-1.5 bg-[var(--color-panel-border)]'
              }`}
            />
          ))}
        </div>

        <div className="rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-6 sm:p-8 animate-fade-in">
          {step === 0 && (
            <div className="text-center py-4">
              <span className="inline-grid place-items-center size-16 rounded-2xl bg-[var(--color-accent)]/10 text-[var(--color-accent)] mb-5">
                <Leaf size={32} />
              </span>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">{t('onboarding.welcomeTitle')}</h1>
              <p className="text-base text-[var(--color-text-secondary)] leading-relaxed max-w-sm mx-auto">
                {t('onboarding.welcomeSubtitle')}
              </p>
            </div>
          )}

          {step === 1 && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <UserIcon size={18} className="text-[var(--color-accent)]" />
                <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{t('onboarding.aboutTitle')}</h2>
              </div>
              <p className="text-sm text-[var(--color-text-muted)] mb-5">{t('onboarding.aboutSubtitle')}</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">{t('onboarding.nameLabel')}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('onboarding.namePlaceholder')}
                    className="w-full rounded-lg border border-[var(--color-panel-border)] bg-[var(--color-bg-secondary)] px-4 py-2.5 text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">{t('onboarding.ageLabel')}</label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder={t('onboarding.agePlaceholder')}
                    className="w-full rounded-lg border border-[var(--color-panel-border)] bg-[var(--color-bg-secondary)] px-4 py-2.5 text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">{t('onboarding.professionLabel')}</label>
                  <div className="flex flex-wrap gap-2">
                    {PROFESSION_KEYS.map((key) => {
                      const label = t(`onboarding.professions.${key}`);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setProfession(label)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                            profession === label
                              ? 'border-[var(--color-accent)]/50 bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                              : 'border-[var(--color-panel-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-panel-hover)]'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <MapPin size={18} className="text-[var(--color-accent)]" />
                <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{t('onboarding.locationTitle')}</h2>
              </div>
              <p className="text-sm text-[var(--color-text-muted)] mb-5">
                {t('onboarding.locationSubtitle')}
              </p>
              <LocationSearch onNavigated={() => setLocationConfirmed(true)} />
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-[var(--color-panel-border)] bg-[var(--color-bg-secondary)] px-4 py-3">
                <MapPin size={16} className="text-[var(--color-accent)] shrink-0" />
                <span className="text-sm text-[var(--color-text-primary)] font-medium">{location.displayName}</span>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">{t('onboarding.interestsTitle')}</h2>
              <p className="text-sm text-[var(--color-text-muted)] mb-5">{t('onboarding.interestsSubtitle')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ALL_PERSONAS.map((p) => {
                  const Icon = PERSONA_ICONS[p];
                  const active = selectedPersonas.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePersona(p)}
                      className={`relative text-left flex items-start gap-3 rounded-xl border p-4 transition-colors ${
                        active
                          ? 'border-[var(--color-accent)]/50 bg-[var(--color-accent)]/10'
                          : 'border-[var(--color-panel-border)] hover:bg-[var(--color-panel-hover)]'
                      }`}
                    >
                      <span className={`grid place-items-center size-10 rounded-lg shrink-0 ${active ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]' : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]'}`}>
                        <Icon size={19} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-[var(--color-text-primary)]">{t(`persona.${p}.name`)}</p>
                        <p className="text-sm text-[var(--color-text-muted)] leading-snug mt-0.5">{t(`persona.${p}.description`)}</p>
                      </div>
                      {active && (
                        <span className="absolute top-3 right-3 text-[var(--color-accent)]"><Check size={16} /></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            {step > 0 ? (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-panel-hover)] transition-colors"
              >
                <ArrowLeft size={16} /> {t('onboarding.back')}
              </button>
            ) : (
              <span />
            )}

            {step < TOTAL_STEPS - 1 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canProceed}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold bg-[var(--color-accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {step === 0 ? t('onboarding.letsGo') : t('onboarding.continue')} <ArrowRight size={16} />
              </button>
            ) : (
              <button
                onClick={finish}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold bg-[var(--color-accent)] text-white hover:opacity-90 transition-opacity"
              >
                {t('onboarding.goToDashboard')} <ArrowRight size={16} />
              </button>
            )}
          </div>

          {step > 0 && step < TOTAL_STEPS - 1 && (
            <button
              onClick={() => setStep(TOTAL_STEPS - 1)}
              className="w-full text-center mt-3 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
            >
              {t('onboarding.skipRest')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
