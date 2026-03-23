export interface EntityDraft {
  id: number;
  entityType: string;
  rawPayloadJson: string;
  originalEntityId: number;
  createdAt: string;
  updatedAt: string;
}
