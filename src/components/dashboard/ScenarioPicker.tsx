'use client';

import type { ScenarioId } from '@/types';

interface ScenarioOption {
  id: ScenarioId;
  label: string;
  description: string;
}

export function ScenarioPicker({
  options,
  activeId,
  onSelect,
  disabled,
}: {
  options: ScenarioOption[];
  activeId: ScenarioId;
  onSelect: (id: ScenarioId) => void;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label="Operational scenario" className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {options.map((option) => {
        const active = option.id === activeId;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onSelect(option.id)}
            className={`rounded-lg border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              active
                ? 'border-pitch bg-pitch/10'
                : 'border-console-border bg-console-panelAlt hover:border-pitch/50'
            }`}
          >
            <p className="font-display text-sm font-semibold text-console-text">{option.label}</p>
            <p className="mt-1 text-xs text-console-muted">{option.description}</p>
          </button>
        );
      })}
    </div>
  );
}
