import React from 'react';
import { getWeatherIcon } from '../../utils/weatherCodes';

export const WeatherIcon: React.FC<{ code: number; isDay?: boolean; size?: number; className?: string }> = ({
  code,
  isDay = true,
  size = 20,
  className = '',
}) => {
  const Icon = getWeatherIcon(code, isDay);
  return <Icon size={size} className={className} aria-hidden="true" />;
};
