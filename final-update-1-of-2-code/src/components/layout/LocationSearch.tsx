import { tr } from '../../i18n/dynamic';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Search, X, Crosshair, Loader2, MapPin, Clock, AlertCircle } from 'lucide-react';
import { geocodingService } from '../../services/geocodingService';
import { useAppLocation } from '../../context/LocationContext';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import type { GeoLocation } from '../../types';

const geoMessage = (state: string): string | undefined =>
  ({
    denied: tr('Location permission denied. Enable it in your phone or browser settings, or search for a city instead.', 'लोकेशन की अनुमति नहीं मिली। फ़ोन या ब्राउज़र की सेटिंग में इसे चालू करें, या किसी शहर को खोजें।'),
    unavailable: tr('Could not get your location. Turn on Location (GPS) in your phone settings and try again.', 'आपका स्थान नहीं मिल सका। फ़ोन की सेटिंग में लोकेशन (GPS) चालू करके फिर कोशिश करें।'),
    unsupported: tr('Geolocation is not supported here.', 'यहाँ लोकेशन सुविधा समर्थित नहीं है।'),
    timeout: tr('Locating you took too long. Try again near a window, or search for a city.', 'आपका स्थान ढूँढने में बहुत समय लगा। खिड़की के पास फिर कोशिश करें, या शहर खोजें।'),
    error: tr('Found your coordinates, but could not resolve a place name.', 'आपके निर्देशांक मिल गए, पर स्थान का नाम नहीं मिल सका।'),
  } as Record<string, string>)[state];

let instanceCounter = 0;

export const LocationSearch: React.FC<{ onNavigated?: () => void; instanceId?: string }> = ({ onNavigated, instanceId }) => {
  const { location, recentLocations, setLocation, useMyLocation: locateMe, geoState } = useAppLocation();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<GeoLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Two instances of this component can be mounted at once (desktop +
  // mobile header, toggled by CSS breakpoints rather than conditional
  // rendering), so ids must be unique per instance to keep the DOM valid
  // and label/aria-controls associations correct for assistive tech.
  const uniqueId = useRef(instanceId ?? `loc-search-${++instanceCounter}`).current;
  const inputId = `location-search-${uniqueId}`;
  const listboxId = `location-search-listbox-${uniqueId}`;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    if (geoState === 'idle' || geoState === 'locating') return;
    const message = geoMessage(geoState);
    if (message) showToast(message, geoState === 'error' ? 'info' : 'error');
  }, [geoState, showToast]);

  // Cancel any pending debounce/search request when this instance unmounts
  // (e.g. a mobile/desktop breakpoint swap or route change) so a stale
  // response can't call setState after the component is gone.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const runSearch = useCallback((value: string) => {
    abortRef.current?.abort();
    if (value.trim().length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    geocodingService
      .search(value, controller.signal)
      .then((res) => {
        setResults(res);
        setLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : tr('Search failed', 'खोज विफल रही'));
        setLoading(false);
      });
  }, []);

  const onChange = (value: string) => {
    setQuery(value);
    setActiveIndex(-1);
    setIsOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(value), 300);
  };

  const choose = (loc: GeoLocation) => {
    setLocation(loc);
    setQuery('');
    setResults([]);
    setIsOpen(false);
    showToast(`Location set to ${loc.displayName}`, 'success');
    onNavigated?.();
  };

  const showingList = query.trim().length >= 2 ? results : recentLocations;
  const listLabel = query.trim().length >= 2 ? 'Search results' : 'Recent locations';

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, showingList.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && showingList[activeIndex]) choose(showingList[activeIndex]);
      else if (showingList[0]) choose(showingList[0]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <label htmlFor={inputId} className="sr-only">
        {tr('Search for a city or place', 'शहर या स्थान खोजें')}
      </label>
      <div className="flex items-center gap-2 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-secondary)] px-3 py-2 focus-within:border-[var(--color-accent-teal)]/60 transition-colors">
        <Search size={16} className="text-[var(--color-text-muted)] shrink-0" />
        <input
          id={inputId}
          type="text"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={t('topbar.searchPlaceholder')}
          className="w-full bg-transparent text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          autoComplete="off"
        />
        {loading && <Loader2 size={14} className="animate-spin text-[var(--color-text-muted)]" />}
        {query && !loading && (
          <button aria-label={tr('Clear search', 'खोज साफ़ करें')} onClick={() => onChange('')} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
            <X size={14} />
          </button>
        )}
        <button
          onClick={() => locateMe()}
          aria-label={tr('Use my current location', 'मेरा वर्तमान स्थान उपयोग करें')}
          title={tr('Use my location', 'मेरा स्थान')}
          className="shrink-0 text-[var(--color-accent-teal)] hover:text-[var(--color-accent)] transition-colors"
        >
          {geoState === 'locating' ? <Loader2 size={16} className="animate-spin" /> : <Crosshair size={16} />}
        </button>
      </div>

      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          className="animate-slide-up absolute z-50 mt-2 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] shadow-xl overflow-hidden"
        >
          <div className="px-3 py-2 text-sm uppercase tracking-wide text-[var(--color-text-muted)] border-b border-[var(--color-panel-border)] flex items-center justify-between">
            <span>{listLabel}</span>
            {query.trim().length < 2 && recentLocations.length === 0 && <span>{tr('Try “Delhi” or “London”', '“दिल्ली” या “लंदन” आज़माएँ')}</span>}
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-3 text-sm text-[var(--color-critical)]">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {!error && loading && (
            <div className="px-3 py-3 text-sm text-[var(--color-text-muted)]">{tr('Searching…', 'खोज रहे हैं…')}</div>
          )}

          {!error && !loading && query.trim().length >= 2 && results.length === 0 && (
            <div className="px-3 py-3 text-sm text-[var(--color-text-muted)]">{tr('No matching places found.', 'कोई मिलता-जुलता स्थान नहीं मिला।')}</div>
          )}

          {!error &&
            !loading &&
            showingList.map((loc, i) => (
              <button
                key={`${loc.displayName}-${loc.latitude}-${loc.longitude}`}
                role="option"
                aria-selected={activeIndex === i}
                onClick={() => choose(loc)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors ${
                  activeIndex === i ? 'bg-[var(--color-panel-hover)]' : 'hover:bg-[var(--color-panel-hover)]'
                }`}
              >
                {query.trim().length >= 2 ? (
                  <MapPin size={14} className="text-[var(--color-accent-teal)] shrink-0" />
                ) : (
                  <Clock size={14} className="text-[var(--color-text-muted)] shrink-0" />
                )}
                <span className="flex-1 truncate">
                  <span className="text-[var(--color-text-primary)]">{loc.city}</span>
                  <span className="text-[var(--color-text-muted)]">
                    {loc.state ? `, ${loc.state}` : ''}{loc.country ? `, ${loc.country}` : ''}
                  </span>
                </span>
              </button>
            ))}

          {!error && !loading && query.trim().length < 2 && recentLocations.length === 0 && (
            <div className="px-3 py-3 text-sm text-[var(--color-text-muted)]">{tr('No recent locations yet.', 'अभी कोई हाल का स्थान नहीं।')}</div>
          )}
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {tr('Current location', 'वर्तमान स्थान')}: {location.displayName}
      </p>
    </div>
  );
};
