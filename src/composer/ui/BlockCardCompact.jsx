import React from 'react';
import { BlockConfigControls } from './BlockConfigControls.jsx';
import { EntitySelectorPanel } from './EntitySelectorPanel.jsx';

function normalizeOverrideFilters(blockOverride) {
  const filters = blockOverride?.filters && typeof blockOverride.filters === 'object'
    ? blockOverride.filters
    : {};
  return {
    includeIds: Array.isArray(filters.includeIds) ? filters.includeIds : [],
    excludeIds: Array.isArray(filters.excludeIds) ? filters.excludeIds : [],
    useSUCWeeks: Boolean(filters.useSUCWeeks),
    maxCount: Number.isFinite(Number(filters.maxCount)) ? Number(filters.maxCount) : '',
    sortBy: typeof filters.sortBy === 'string' && filters.sortBy ? filters.sortBy : 'date',
    sortOrder: typeof filters.sortOrder === 'string' && filters.sortOrder ? filters.sortOrder : 'asc',
    tags: Array.isArray(filters.tags) ? filters.tags : []
  };
}

function normalizeDisplay(blockOverride) {
  return blockOverride?.display && typeof blockOverride.display === 'object'
    ? blockOverride.display
    : {};
}

function getSelectedEntityCount(includeIds, excludeIds, totalCount) {
  if (includeIds.length > 0) return includeIds.length;
  if (Number.isFinite(totalCount)) return Math.max(0, totalCount - excludeIds.length);
  return 0;
}

function getBlockLabel(block) {
  return String(block?.label || block?.sectionType || block?.type || 'Unknown')
    .replace(/_/g, ' ')
    .toUpperCase();
}

function getSummaryParts(block, filters, entityOptions, presetBlock) {
  const parts = [];
  const weeksPart = filters.useSUCWeeks ? 'Weeks: SUC' : '';
  if (weeksPart) parts.push(weeksPart);
  const selectedCount = getSelectedEntityCount(filters.includeIds, filters.excludeIds, entityOptions.length);
  parts.push(`Entities: ${selectedCount} selected`);
  if (filters.maxCount) parts.push(`Limit: ${filters.maxCount}`);
  if (filters.sortBy) parts.push(`Sort: ${filters.sortBy}/${filters.sortOrder}`);
  const presetFilters = presetBlock?.filters && typeof presetBlock.filters === 'object'
    ? Object.keys(presetBlock.filters)
    : [];
  if (presetFilters.length > 0) {
    parts.push(`Preset filters: ${presetFilters.join(', ')}`);
  }
  return parts;
}

function DisplayToggleRow({ options, displayValues, onToggle }) {
  if (!Array.isArray(options) || options.length === 0) return null;
  return (
    <div className="compact-toggle-row">
      {options.map((option) => {
        const key = String(option?.key || '').trim();
        const label = String(option?.label || key).trim();
        if (!key) return null;
        const active = Boolean(displayValues[key]);
        return (
          <button
            key={key}
            type="button"
            className={`compact-toggle-chip${active ? ' compact-toggle-chip--active' : ''}`}
            onClick={onToggle(key)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function BlockCardCompact({
  block,
  index,
  isSelected,
  onSelectBlock,
  onToggleBlock,
  onDeleteBlock,
  onConfigChange,
  blockOverride = {},
  presetDrift,
  onBlockOverrideChange,
  onResetToPreset,
  entityOptions = [],
  presetBlock = null,
  onDragStart,
  onDragEnd
}) {
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const isCustom = block?.type === 'custom_block';
  const enabled = Boolean(block?.enabled);
  const filters = normalizeOverrideFilters(blockOverride);
  const displayValues = normalizeDisplay(blockOverride);
  const blockLabel = getBlockLabel(block);
  const summaryParts = getSummaryParts(block, filters, entityOptions, presetBlock);
  const modified = Boolean(blockOverride?.presetModified || presetDrift?.isModified);
  const affectedByPreset = Boolean(presetBlock && typeof presetBlock === 'object' && Object.keys(presetBlock).length > 0);
  const isEvents = block?.sectionType === 'events';
  const isWorkouts = block?.sectionType === 'workouts';
  const isTrainingTips = block?.sectionType === 'training_tips';

  const displayToggleOptions = isEvents
    ? [
      { key: 'showPois', label: 'Show POIs' },
      { key: 'showRouteDistances', label: 'Show Route Distances' },
      { key: 'showElevation', label: 'Show Elevation' },
      { key: 'showNotes', label: 'Show Notes' }
    ]
    : isWorkouts
      ? [
        { key: 'showDescription', label: 'Show Description' },
        { key: 'showCoachNotes', label: 'Show Coach Notes' }
      ]
      : [];

  const classNames = [
    'block-card',
    'block-card--compact',
    isSelected ? 'block-card--active' : '',
    !enabled ? 'block-card--disabled' : '',
    affectedByPreset ? 'block-card--preset' : ''
  ].filter(Boolean).join(' ');

  function patchFilters(patch) {
    onBlockOverrideChange?.(index, {
      filters: {
        ...filters,
        ...(patch && typeof patch === 'object' ? patch : {})
      }
    });
  }

  function patchDisplay(patch) {
    onBlockOverrideChange?.(index, {
      display: {
        ...displayValues,
        ...(patch && typeof patch === 'object' ? patch : {})
      }
    });
  }

  return (
    <div className={classNames} onClick={() => onSelectBlock(index)}>
      <div className="block-card__header block-card__header--compact">
        <div className="block-card__title">
          <span
            className="block-card__drag-handle drag-handle"
            draggable
            onDragStart={(event) => {
              event.stopPropagation();
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData('text/plain', index.toString());
              onDragStart(index);
            }}
            onDragEnd={(event) => {
              event.stopPropagation();
              onDragEnd();
            }}
            onClick={(event) => event.stopPropagation()}
            title="Drag to reorder"
            role="button"
            tabIndex={0}
          >
            &#9776;
          </span>
          <span>{blockLabel}</span>
        </div>
        <div className="toc-item-badges">
          <button
            type="button"
            className={`badge badge-small ${enabled ? 'badge-enabled' : 'badge-disabled'}`}
            onClick={(event) => {
              event.stopPropagation();
              onToggleBlock(index);
            }}
          >
            {enabled ? 'ON' : 'OFF'}
          </button>
          {modified && <span className="badge badge-small badge-custom">Preset Modified</span>}
        </div>
      </div>

      <div className="block-card__summary block-card__summary--compact">
        {summaryParts.join(' | ')}
      </div>

      <div className="block-card__advanced-toggle">
        <button
          type="button"
          className="button-secondary button-small"
          onClick={(event) => {
            event.stopPropagation();
            setAdvancedOpen((prev) => !prev);
          }}
        >
          {advancedOpen ? '▼ Advanced' : '▶ Advanced'}
        </button>
      </div>

      {advancedOpen && (
        <div className="block-card__advanced" onClick={(event) => event.stopPropagation()}>
          {!isCustom && (
            <>
              <DisplayToggleRow
                options={displayToggleOptions}
                displayValues={displayValues}
                onToggle={(key) => () => patchDisplay({ [key]: !Boolean(displayValues[key]) })}
              />
              <div className="compact-toggle-row compact-toggle-row--controls">
                <label className="section-editor-toggle-inline">
                  <input
                    type="checkbox"
                    checked={filters.useSUCWeeks}
                    onChange={(event) => patchFilters({ useSUCWeeks: event.target.checked })}
                  />
                  Use SUC Weeks
                </label>
                <label className="section-editor-toggle-inline">
                  Limit
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={filters.maxCount || 10}
                    onChange={(event) => patchFilters({ maxCount: Number(event.target.value) })}
                  />
                  <span>{filters.maxCount || 10}</span>
                </label>
                <label className="section-editor-toggle-inline">
                  Sort
                  <select value={filters.sortBy} onChange={(event) => patchFilters({ sortBy: event.target.value })}>
                    <option value="date">Date</option>
                    <option value="title">Title</option>
                    <option value="id">ID</option>
                  </select>
                </label>
              </div>
            </>
          )}

          {!isCustom && (
            <EntitySelectorPanel
              title={isEvents ? 'Events' : isWorkouts ? 'Workouts' : isTrainingTips ? 'Training Tips' : 'Entities'}
              options={entityOptions}
              includeIds={filters.includeIds}
              excludeIds={filters.excludeIds}
              onChange={(next) => patchFilters(next)}
            />
          )}

          {isTrainingTips && (
            <label className="section-editor-toggle-inline">
              Tags
              <input
                type="text"
                value={filters.tags.join(', ')}
                placeholder="heat, recovery"
                onChange={(event) => {
                  const tags = String(event.target.value || '')
                    .split(',')
                    .map((tag) => tag.trim())
                    .filter(Boolean);
                  patchFilters({ tags });
                }}
              />
            </label>
          )}

          {isCustom && (
            <BlockConfigControls
              block={block}
              index={index}
              onConfigChange={onConfigChange}
              blockOverride={blockOverride}
              onBlockOverrideChange={onBlockOverrideChange}
              entityOptions={entityOptions}
            />
          )}

          <div className="block-card__actions">
            {modified && (
              <button
                type="button"
                className="button-secondary button-small"
                onClick={() => onResetToPreset?.(index)}
              >
                Reset to Preset
              </button>
            )}
            <button
              type="button"
              className="button-danger button-small"
              onClick={() => onDeleteBlock(index)}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
