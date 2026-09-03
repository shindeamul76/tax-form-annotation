import type { DraftFieldAnnotation } from '../domain/annotation-draft'
import type { NormalizedBox } from '../domain/annotation-types'

export interface CreateManualDraftInput {
  page: number
  box: NormalizedBox
}

type DraftIdFactory = () => string

export function createManualDraft(
  { page, box }: CreateManualDraftInput,
  createDraftId: DraftIdFactory = createRandomDraftId,
): DraftFieldAnnotation {
  return {
    draftId: createDraftId(),
    origin: 'manual',
    mappingStatus: 'unmapped',
    page,
    box: { ...box },
  }
}

function createRandomDraftId(): string {
  return `manual:${globalThis.crypto.randomUUID()}`
}
