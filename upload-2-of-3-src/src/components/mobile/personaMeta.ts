import { Heart, Activity, Plane, Users, Sprout, Waves, Car, PartyPopper, User } from 'lucide-react';
import type React from 'react';
import type { Persona } from '../../types';

export const PERSONA_ICONS: Record<Persona, React.ElementType> = {
  health: Heart,
  fitness: Activity,
  travel: Plane,
  family: Users,
  agriculture: Sprout,
  marine: Waves,
  commuter: Car,
  eventPlanner: PartyPopper,
};

export const GENERAL_ICON = User;

/** Display order — matches the design: General first, then the eight personas. */
export const ALL_PERSONAS: Persona[] = ['health', 'fitness', 'travel', 'family', 'agriculture', 'commuter', 'marine', 'eventPlanner'];
