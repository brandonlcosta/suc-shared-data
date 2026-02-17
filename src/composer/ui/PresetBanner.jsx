import React from 'react';

function resolvePresetLabel(presetId, presetOptions) {
  const match = (Array.isArray(presetOptions) ? presetOptions : []).find((option) => option?.value === presetId);
  return String(match?.label || presetId || 'Preset').trim();
}

function resolveDateModeLabel(mode) {
  const normalized = String(mode || '').trim().toLowerCase();
  if (normalized === 'range') return 'Custom Range';
  if (normalized === 'until_event') return 'Until Event';
  if (normalized === 'season') return 'Season';
  return 'This Week';
}

export function PresetBanner({
  presetId,
  presetOptions = [],
  dateSelection,
  selectedWeeks = [],
  hasDrift = false
}) {
  const presetLabel = resolvePresetLabel(presetId, presetOptions);
  const modeLabel = resolveDateModeLabel(dateSelection?.mode);
  const weeks = Array.isArray(selectedWeeks) ? selectedWeeks.filter(Boolean) : [];

  return (
    <div className="preset-banner" role="status" aria-live="polite">
      <div className="preset-banner__title">Preset applied: {presetLabel}</div>
      <div className="preset-banner__meta">
        <span className="preset-banner__chip">Date: {modeLabel}</span>
        {weeks.length > 0 && (
          <span className="preset-banner__chip">Weeks: {weeks.join(', ')}</span>
        )}
        {hasDrift && <span className="preset-banner__chip preset-banner__chip--warn">Modified</span>}
      </div>
    </div>
  );
}
