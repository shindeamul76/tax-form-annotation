import type { DraftFieldAnnotation } from './annotation-draft'
import type { FieldAnnotation, NormalizedBox } from './annotation-types'

export interface AutomaticFieldMapping {
  draftId: string
  profileField: FieldAnnotation
  overlapScore: number
}

interface MappingCandidate {
  draftField: DraftFieldAnnotation
  profileField: FieldAnnotation
  overlapScore: number
}

// A high overlap prevents a nearby tax-form box from receiving a plausible but
// incorrect semantic mapping when a verified profile is applied. A profile box
// may still differ from its widget rect, because an AcroForm rectangle can be
// larger than the printed area it sits in.
export const MINIMUM_PROFILE_BOX_OVERLAP = 0.8

export function findAutomaticFieldMappings(
  draftFields: DraftFieldAnnotation[],
  profileFields: FieldAnnotation[],
): AutomaticFieldMapping[] {
  const reservedFieldIds = new Set(
    draftFields.flatMap((field) =>
      isNonBlank(field.id) ? [field.id] : [],
    ),
  )
  const candidates = createMappingCandidates(
    draftFields.filter(isAutomaticMappingCandidate),
    profileFields.filter((field) => !reservedFieldIds.has(field.id)),
  ).sort((left, right) => right.overlapScore - left.overlapScore)
  const usedDraftIds = new Set<string>()
  const usedProfileFieldIds = new Set<string>()
  const mappings: AutomaticFieldMapping[] = []

  for (const candidate of candidates) {
    if (
      usedDraftIds.has(candidate.draftField.draftId) ||
      usedProfileFieldIds.has(candidate.profileField.id)
    ) {
      continue
    }

    usedDraftIds.add(candidate.draftField.draftId)
    usedProfileFieldIds.add(candidate.profileField.id)
    mappings.push({
      draftId: candidate.draftField.draftId,
      profileField: candidate.profileField,
      overlapScore: candidate.overlapScore,
    })
  }

  return mappings
}

function createMappingCandidates(
  draftFields: DraftFieldAnnotation[],
  profileFields: FieldAnnotation[],
): MappingCandidate[] {
  const candidates: MappingCandidate[] = []

  for (const profileField of profileFields) {
    for (const draftField of draftFields) {
      if (
        draftField.page !== profileField.page ||
        !isCompatibleFieldKind(draftField, profileField)
      ) {
        continue
      }

      const overlapScore = calculateBoxIntersectionOverUnion(
        draftField.box,
        profileField.box,
      )

      if (overlapScore >= MINIMUM_PROFILE_BOX_OVERLAP) {
        candidates.push({ draftField, profileField, overlapScore })
      }
    }
  }

  return candidates
}

function isAutomaticMappingCandidate(field: DraftFieldAnnotation): boolean {
  return field.origin === 'acroform' && field.mappingStatus === 'unmapped'
}

function isCompatibleFieldKind(
  draftField: DraftFieldAnnotation,
  profileField: FieldAnnotation,
): boolean {
  if (profileField.format.type === 'checkbox') {
    return (
      draftField.sourceFieldKind === 'checkbox' ||
      draftField.sourceFieldKind === 'radio'
    )
  }

  return (
    draftField.sourceFieldKind === 'text' ||
    draftField.sourceFieldKind === 'choice' ||
    draftField.sourceFieldKind === 'unknown'
  )
}

function calculateBoxIntersectionOverUnion(
  left: NormalizedBox,
  right: NormalizedBox,
): number {
  const intersectionWidth = Math.max(
    0,
    Math.min(left.x + left.width, right.x + right.width) -
      Math.max(left.x, right.x),
  )
  const intersectionHeight = Math.max(
    0,
    Math.min(left.y + left.height, right.y + right.height) -
      Math.max(left.y, right.y),
  )
  const intersectionArea = intersectionWidth * intersectionHeight

  if (intersectionArea === 0) {
    return 0
  }

  const unionArea =
    left.width * left.height +
    right.width * right.height -
    intersectionArea

  return intersectionArea / unionArea
}

function isNonBlank(value: string | undefined): value is string {
  return value !== undefined && value.trim().length > 0
}
