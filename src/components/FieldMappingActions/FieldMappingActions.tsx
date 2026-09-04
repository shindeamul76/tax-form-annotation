import './FieldMappingActions.css'

interface FieldMappingActionsProps {
  mappedFieldCount: number
  unmappedFieldCount: number
  invalidFieldCount: number
  automaticMappingCount: number
  hasKnownTemplateProfile: boolean
  hasDataset: boolean
  isDatasetCompatible: boolean
  onAutoMap: () => void
  onExcludeUnmapped: () => void
}

export function FieldMappingActions({
  mappedFieldCount,
  unmappedFieldCount,
  invalidFieldCount,
  automaticMappingCount,
  hasKnownTemplateProfile,
  hasDataset,
  isDatasetCompatible,
  onAutoMap,
  onExcludeUnmapped,
}: FieldMappingActionsProps) {
  const canAutoMap =
    automaticMappingCount > 0 && hasDataset && isDatasetCompatible

  const handleExcludeUnmapped = () => {
    const availableMappingWarning =
      automaticMappingCount === 0
        ? ''
        : ` ${automaticMappingCount} supported fields can still be auto-mapped and will also be excluded.`
    const confirmed = window.confirm(
      `Exclude all ${unmappedFieldCount} unmapped fields from this annotation? Mapped and partially edited fields will be kept.${availableMappingWarning}`,
    )

    if (confirmed) {
      onExcludeUnmapped()
    }
  }

  return (
    <div className="field-mapping-actions">
      <dl className="field-mapping-counts" aria-label="Field mapping counts">
        <div>
          <dt>Mapped</dt>
          <dd>{mappedFieldCount}</dd>
        </div>
        <div>
          <dt>Unmapped</dt>
          <dd>{unmappedFieldCount}</dd>
        </div>
        <div>
          <dt>Invalid</dt>
          <dd>{invalidFieldCount}</dd>
        </div>
      </dl>

      <p className="field-mapping-guidance">
        {getAutomaticMappingGuidance({
          automaticMappingCount,
          hasKnownTemplateProfile,
          hasDataset,
          isDatasetCompatible,
        })}
      </p>

      <div className="field-mapping-buttons">
        <button
          className="button button--primary"
          type="button"
          disabled={!canAutoMap}
          onClick={onAutoMap}
        >
          Auto-map {automaticMappingCount} sample fields
        </button>
        <button
          className="button button--secondary"
          type="button"
          disabled={unmappedFieldCount === 0}
          onClick={handleExcludeUnmapped}
        >
          Exclude {unmappedFieldCount} unmapped fields
        </button>
      </div>
    </div>
  )
}

interface AutomaticMappingGuidanceInput {
  automaticMappingCount: number
  hasKnownTemplateProfile: boolean
  hasDataset: boolean
  isDatasetCompatible: boolean
}

function getAutomaticMappingGuidance({
  automaticMappingCount,
  hasKnownTemplateProfile,
  hasDataset,
  isDatasetCompatible,
}: AutomaticMappingGuidanceInput): string {
  if (!hasKnownTemplateProfile) {
    return 'No verified automatic mapping profile is available for this PDF.'
  }

  if (automaticMappingCount === 0) {
    return 'All available sample-profile fields are already mapped or no longer present.'
  }

  if (!hasDataset) {
    return 'Load the sample JSON to enable its verified Form 1040 mappings.'
  }

  if (!isDatasetCompatible) {
    return 'The loaded dataset contract does not match the Form 1040 mapping profile.'
  }

  return `${automaticMappingCount} fields can be mapped from the verified Form 1040 profile. You can edit every result.`
}
