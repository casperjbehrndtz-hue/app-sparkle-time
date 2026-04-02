import {
  Tv, Music, Clapperboard, Play, Package, Sparkles, Car, Wifi, Zap, Flame,
  Smartphone, Radio, ShoppingCart, Home, Shield, Banknote, CreditCard, Fuel,
  Utensils, Ticket, Shirt, HeartPulse, Dumbbell, PawPrint, Bus, Stethoscope,
  Building, Receipt, type LucideProps,
} from "lucide-react";
import type { ComponentType } from "react";

const ICON_MAP: Record<string, ComponentType<LucideProps>> = {
  tv: Tv,
  music: Music,
  clapperboard: Clapperboard,
  play: Play,
  package: Package,
  sparkles: Sparkles,
  car: Car,
  wifi: Wifi,
  zap: Zap,
  flame: Flame,
  smartphone: Smartphone,
  radio: Radio,
  "shopping-cart": ShoppingCart,
  home: Home,
  shield: Shield,
  banknote: Banknote,
  "credit-card": CreditCard,
  fuel: Fuel,
  utensils: Utensils,
  ticket: Ticket,
  shirt: Shirt,
  "heart-pulse": HeartPulse,
  dumbbell: Dumbbell,
  "paw-print": PawPrint,
  bus: Bus,
  stethoscope: Stethoscope,
  building: Building,
  receipt: Receipt,
};

/** Renders a Lucide icon by name, or falls back to raw text (for emojis in BigChoice). */
export function CategoryIcon({ name, className = "w-4 h-4" }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name];
  if (Icon) return <Icon className={className} />;
  // Fallback: render as text (emoji or unknown string)
  return <span>{name}</span>;
}
