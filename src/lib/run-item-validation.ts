export type RunItemForValidation = {
  id: string;
  title: string;
  item_type: string;
  is_critical: boolean;
};

export type RunResponseForValidation = {
  checklist_item_id: string;
  completed: boolean;
  numeric_value?: number | string | null;
  text_value?: string | null;
  photo_path?: string | null;
};

export function responseRowForItem(
  responses: RunResponseForValidation[],
  itemId: string,
): RunResponseForValidation | undefined {
  return responses.find((r) => r.checklist_item_id === itemId);
}

/** Item considerado cumprido para fechar a execução */
export function isItemSatisfied(
  item: Pick<RunItemForValidation, "item_type" | "is_critical">,
  row: RunResponseForValidation | undefined,
): boolean {
  const r = row ?? { checklist_item_id: "", completed: false };
  switch (item.item_type) {
    case "number": {
      const n = r.numeric_value;
      if (n === null || n === undefined || n === "") return false;
      const v = typeof n === "number" ? n : Number(n);
      return !Number.isNaN(v);
    }
    case "text":
      return Boolean((r.text_value ?? "").trim());
    case "photo":
      /* Crítico: evidência obrigatória. Não crítico: basta marcar concluído (foto opcional). */
      if (item.is_critical) {
        return Boolean((r.photo_path ?? "").trim());
      }
      return r.completed === true;
    default:
      return r.completed === true;
  }
}

export function firstUnsatisfiedItemTitle(
  items: RunItemForValidation[],
  responses: RunResponseForValidation[],
): string | null {
  for (const it of items) {
    if (!isItemSatisfied(it, responseRowForItem(responses, it.id))) return it.title;
  }
  return null;
}
