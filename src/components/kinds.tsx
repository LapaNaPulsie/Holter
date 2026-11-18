import { Footprints, Moon, Pill, Sunrise, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { ItemKind } from '../core/report';
import type { EntryKind } from '../core/types';

interface KindStyle {
  Icon: LucideIcon;
  /** Tło ikony i etykiety */
  badge: string;
  /** Lewy pasek karty wpisu */
  bar: string;
}

export const KIND_STYLE: Record<ItemKind, KindStyle> = {
  activity: { Icon: Footprints, badge: 'bg-caramel/25 text-navy', bar: 'border-l-caramel' },
  sleep: { Icon: Moon, badge: 'bg-navy text-offwhite', bar: 'border-l-navy' },
  wake: { Icon: Sunrise, badge: 'bg-navy/10 text-navy', bar: 'border-l-navy/40' },
  medication: { Icon: Pill, badge: 'bg-powder text-navy', bar: 'border-l-navy-soft' },
  symptom: { Icon: TriangleAlert, badge: 'bg-burgundy text-white', bar: 'border-l-burgundy' },
};

export const ADD_BUTTONS: { kind: EntryKind; label: string }[] = [
  { kind: 'activity', label: 'Dodaj aktywność' },
  { kind: 'sleep', label: 'Dodaj sen' },
  { kind: 'symptom', label: 'Dodaj objaw / zdarzenie' },
  { kind: 'medication', label: 'Dodaj podanie leku' },
];
