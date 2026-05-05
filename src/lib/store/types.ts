export type UnitType = "convenience" | "gas_station" | "restaurant" | "other";
export type ItemType = "boolean" | "number" | "text" | "photo";
export type RunStatus = "scheduled" | "in_progress" | "completed" | "late" | "missed";

export type Organization = { id: string; name: string; createdAt: string };
export type Unit = {
  id: string;
  organizationId: string;
  name: string;
  unitType: UnitType;
  city?: string | null;
};
export type ChecklistTemplate = {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  sector?: string | null;
};
export type ChecklistTemplateItem = {
  id: string;
  templateId: string;
  title: string;
  sortOrder: number;
  itemType: ItemType;
  isCritical: boolean;
  weight: number;
  requiresPhoto?: boolean;
};
export type Checklist = {
  id: string;
  organizationId: string;
  unitId: string | null;
  templateId: string | null;
  name: string;
  isActive: boolean;
};
export type ChecklistItem = {
  id: string;
  checklistId: string;
  title: string;
  sortOrder: number;
  itemType: ItemType;
  isCritical: boolean;
  weight: number;
  requiresPhoto?: boolean;
};
export type ChecklistRun = {
  id: string;
  organizationId: string;
  unitId: string;
  checklistId: string;
  dueAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  status: RunStatus;
  lateAlertSentAt?: string | null;
};

export type ChecklistSchedule = {
  id: string;
  checklistId: string;
  /** "HH:mm" ou "HH:mm:ss" */
  timeLocal: string;
  daysOfWeek: number[];
  isActive: boolean;
  createdAt: string;
};

export type AlertRow = {
  id: string;
  organizationId: string;
  runId: string | null;
  message: string;
  severity: string;
  createdAt: string;
};

export type ChecklistRunResponse = {
  id: string;
  runId: string;
  checklistItemId: string;
  completed: boolean;
  note?: string | null;
  numericValue?: number | null;
  textValue?: string | null;
  /** URL (modo JSON) ou caminho no bucket `checklist-evidence` (Supabase) */
  photoPath?: string | null;
  /** Modo arquivo local: texto exibido como registo da evidência fotográfica */
  photoEvidenceCaption?: string | null;
};

export type AppState = {
  organizations: Organization[];
  units: Unit[];
  checklistTemplates: ChecklistTemplate[];
  checklistTemplateItems: ChecklistTemplateItem[];
  checklists: Checklist[];
  checklistItems: ChecklistItem[];
  checklistSchedules: ChecklistSchedule[];
  checklistRuns: ChecklistRun[];
  checklistRunResponses: ChecklistRunResponse[];
  alerts: AlertRow[];
};
