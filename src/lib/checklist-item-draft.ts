export type ChecklistItemType = "boolean" | "number" | "text" | "photo";

export type ChecklistItemDraftInput = {
  title: string;
  item_type: ChecklistItemType;
  is_critical: boolean;
  weight?: number;
  requires_photo: boolean;
};
