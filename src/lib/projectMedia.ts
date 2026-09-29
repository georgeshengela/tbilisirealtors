/** Image sizing and amenity icons for the project detail page. */

import {
  Baby, Bike, Brush, Bus, Cctv, CircleCheck, ConciergeBell, DoorOpen, Dumbbell, FerrisWheel, Flame,
  KeyRound, Laptop, Lightbulb, Pill, ShoppingCart, Sparkles, Sprout, Trees, Trophy, Zap, type LucideIcon,
} from 'lucide-react';

const CLOUDINARY_UPLOAD = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/i;

/** Width-limited Cloudinary rendition; other hosts pass through untouched. */
export function sizedImage(url: string, width: number): string {
  const match = url?.match(CLOUDINARY_UPLOAD);
  if (!match) return url;
  return `${match[1]}c_limit,w_${Math.round(width)},f_auto,q_auto/${match[2]}`;
}

export const FEATURE_ICONS: Record<string, LucideIcon> = {
  pharmacy: Pill,
  kindergarten: Baby,
  busStop: Bus,
  supermarket: ShoppingCart,
  bikeLane: Bike,
  sportsField: Dumbbell,
  coworking: Laptop,
  playground: FerrisWheel,
  stadium: Trophy,
  square: Trees,
  lobby: DoorOpen,
  concierge: ConciergeBell,
  videoControl: Cctv,
  lighting: Lightbulb,
  landscaping: Sprout,
  yardCleaning: Brush,
  stairCleaning: Sparkles,
  accessControl: KeyRound,
  generator: Zap,
  fireSystem: Flame,
};

export function featureIcon(key: string): LucideIcon {
  return FEATURE_ICONS[key] ?? CircleCheck;
}
