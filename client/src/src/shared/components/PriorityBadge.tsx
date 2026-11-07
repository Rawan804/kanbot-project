import type { SVGProps, ReactElement } from 'react';
import type { TodoPriority } from '../../types/api';
import { ArrowDownIcon, ArrowUpIcon, ZapIcon } from './icons';
import { cn } from '../lib/cn';

type IconComponent = (props: SVGProps<SVGSVGElement> & { title?: string }) => ReactElement | null;

interface PriorityConfig {
  label: string;
  icon: IconComponent;
  badge: string;
  iconClass: string;
}

const priorityConfig: Record<TodoPriority, PriorityConfig> = {
  low: {
    label: 'Low',
    icon: ArrowDownIcon as IconComponent,
    badge: 'kb-tone-sage',
    iconClass: '',
  },
  medium: {
    label: 'Medium',
    icon: ArrowUpIcon as IconComponent,
    badge: 'kb-tone-sky',
    iconClass: '',
  },
  high: {
    label: 'High',
    icon: ArrowUpIcon as IconComponent,
    badge: 'kb-tone-sand',
    iconClass: '',
  },
  urgent: {
    label: 'Urgent',
    icon: ZapIcon as IconComponent,
    badge: 'kb-tone-rose',
    iconClass: '',
  },
};

interface PriorityBadgeProps {
  priority: TodoPriority;
  /** When true just show the icon without the text label (for compact rows). */
  iconOnly?: boolean;
  className?: string;
}

export function PriorityBadge({ priority, iconOnly = false, className }: PriorityBadgeProps) {
  const config = priorityConfig[priority];
  const Icon = config.icon;

  if (iconOnly) {
    return (
      <span
        title={config.label}
        className={cn(
          'inline-flex h-6 w-6 items-center justify-center rounded-full',
          config.badge,
          className,
        )}
      >
        <Icon className={cn('h-3.5 w-3.5', config.iconClass)} title={config.label} />
      </span>
    );
  }

  return (
    <span
      className={cn(
        'kb-pill',
        config.badge,
        className,
      )}
    >
      <Icon className={cn('h-3 w-3 shrink-0', config.iconClass)} aria-hidden="true" />
      {config.label}
    </span>
  );
}
