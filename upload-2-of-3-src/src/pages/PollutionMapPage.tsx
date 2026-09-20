import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { Info, MapPin, Loader2 } from 'lucide-react';
import { useAppLocation } from '../context/LocationContext';
import { useLanguage } from '../context/LanguageContext';
import { useEnvironmentData } from '../context/EnvironmentDataContext';
import { usePreferences } from '../context/PreferencesContext';
import { Card, CardHeader } from '../components/common/Card';
import { DataStatusBadge } from '../components/common/DataStatusBadge';
import { EmptyState } from '../components/common/States';
import { AQI_COLORS, classifyUsAqi } from '../utils/aqi';

// Fix default marker icons for bundlers (Leaflet's default asset paths break under Vite).
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const FlyToLocation: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], map.getZoom() < 9 ? 11 : map.getZoom(), { duration: 1.1 });
  }, [lat, lng, map]);
  return null;
};

const LEGEND = [
  { label: 'Good', color: AQI_COLORS.Good },
  { label: 'Moderate', color: AQI_COLORS.Moderate },
  { label: 'Unhealthy (Sensitive)', color: AQI_COLORS['Unhealthy for Sensitive Groups'] },
  { label: 'Unhealthy', color: AQI_COLORS.Unhealthy },
  { label: 'Very Unhealthy', color: AQI_COLORS['Very Unhealthy'] },
  { label: 'Hazardous', color: AQI_COLORS.Hazardous },
];

const PollutionMapPage: React.FC = () => {
  const { location } = useAppLocation();
  const { stations, status } = useEnvironmentData();
  const { t } = useLanguage();
  const { preferences } = usePreferences();

  const [legendOpen, setLegendOpen] = useState(false);
  const center = useMemo<[number, number]>(() => [location.latitude, location.longitude], [location.latitude, location.longitude]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-lg font-bold text-[var(--color-text-primary)]">Pollution Map</h1>
        <DataStatusBadge state={status} />
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="h-[60vh] min-h-[400px] w-full relative">
          <MapContainer center={center} zoom={11} scrollWheelZoom style={{ height: '100%', width: '100%' }} aria-label="Pollution map">
            <TileLayer
              className="map-tiles-dark"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FlyToLocation lat={location.latitude} lng={location.longitude} />

            <Marker position={center}>
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold flex items-center gap-1"><MapPin size={12} /> {location.displayName}</p>
                  <p className="text-xs mt-1 opacity-70">Selected location</p>
                </div>
              </Popup>
            </Marker>

            {stations.map((s) => {
              const category = classifyUsAqi(s.aqi);
              const color = AQI_COLORS[category];
              return (
                <CircleMarker
                  key={s.id}
                  center={[s.lat, s.lng]}
                  radius={12}
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.55, weight: 2 }}
                >
                  <Popup>
                    <div className="text-sm space-y-1 min-w-[160px]">
                      <p className="font-semibold">{s.name}</p>
                      <p className="text-xs opacity-70">{s.isDemo ? 'Demo station (sample data)' : 'Live modeled grid point — not a physical sensor'}</p>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1 text-xs">
                        <span>AQI: <strong>{s.aqi ?? '—'}</strong></span>
                        <span>PM2.5: <strong>{s.pm25 ?? '—'}</strong></span>
                        <span>PM10: <strong>{s.pm10 ?? '—'}</strong></span>
                        <span>Temp: <strong>{s.temp ?? '—'}°</strong></span>
                        <span>Humidity: <strong>{s.humidity ?? '—'}%</strong></span>
                      </div>
                      <p className="text-xs opacity-60 pt-1">Updated {s.lastUpdated}</p>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>

          <div className="absolute bottom-3 left-3 z-[1000] rounded-lg border border-[var(--color-panel-border)] bg-[var(--color-panel)]/95 backdrop-blur px-3 py-2 shadow-lg">
            <button type="button" onClick={() => setLegendOpen((v) => !v)} aria-expanded={legendOpen} className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide sm:mb-1.5 h-8 sm:h-auto">Severity Legend <span className="sm:hidden">{legendOpen ? '▾' : '▸'}</span></button>
            <div className={`${legendOpen ? 'grid' : 'hidden sm:grid'} grid-cols-2 gap-x-3 gap-y-1`}>
              {LEGEND.map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ backgroundColor: l.color }} />
                  <span className="text-sm text-[var(--color-text-secondary)]">{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title={t('pages.pollutionMap.monitoringPoints')} subtitle={preferences.dataMode === 'demo' ? 'Demo sample stations' : 'Live modeled grid points around your location'} />
        <div className="flex items-start gap-2 text-sm text-[var(--color-text-muted)] mb-3">
          <Info size={13} className="mt-0.5 shrink-0" />
          {preferences.dataMode === 'demo' ? (
            <span>These are clearly-labeled sample stations for demonstration — not real sensors.</span>
          ) : (
            <span>
              These points use live atmospheric model data (Open-Meteo / CAMS) at nearby coordinates to visualize
              spatial variation. They represent modeled grid values, not physical ground-sensor stations.
            </span>
          )}
        </div>
        {stations.length === 0 ? (
          status === 'LIVE' || status === 'LOADING' ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-[var(--color-text-muted)]">
              <Loader2 size={15} className="animate-spin" /> Loading nearby grid points…
            </div>
          ) : (
            <EmptyState
              title={t('pages.pollutionMap.noPoints')}
              message="We couldn't load nearby grid readings for this location. This is a supplementary layer — the main weather and AQI data above are unaffected."
            />
          )
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {stations.map((s) => {
              const category = classifyUsAqi(s.aqi);
              return (
                <div key={s.id} className="rounded-xl border border-[var(--color-panel-border)] p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-[var(--color-text-primary)]">{s.name}</span>
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: AQI_COLORS[category] }} />
                  </div>
                  <p className="text-lg font-bold text-[var(--color-text-primary)] tabular-nums">{s.aqi ?? '—'}</p>
                  <p className="text-sm text-[var(--color-text-muted)]">{category} · Updated {s.lastUpdated}</p>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default PollutionMapPage;
