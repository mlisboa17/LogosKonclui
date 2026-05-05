import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";
import type { AppState } from "./types";

const FILE = path.join(process.cwd(), "data", "prototype-state.json");

let writeChain: Promise<void> = Promise.resolve();

function emptyState(): AppState {
  const orgId = crypto.randomUUID();
  const now = new Date().toISOString();
  return {
    organizations: [{ id: orgId, name: "Grupo Protótipo (JSON)", createdAt: now }],
    units: [],
    checklistTemplates: [],
    checklistTemplateItems: [],
    checklists: [],
    checklistItems: [],
    checklistSchedules: [],
    checklistRuns: [],
    checklistRunResponses: [],
    alerts: [],
  };
}

function normalizeState(raw: AppState): AppState {
  return {
    ...raw,
    checklistSchedules: raw.checklistSchedules ?? [],
    alerts: raw.alerts ?? [],
    checklistRuns: (raw.checklistRuns ?? []).map((r) => ({
      ...r,
      lateAlertSentAt: r.lateAlertSentAt ?? null,
    })),
  };
}

export async function readAppState(): Promise<AppState> {
  try {
    const raw = JSON.parse(await readFile(FILE, "utf-8")) as AppState;
    if (!raw.organizations) return emptyState();
    return normalizeState(raw);
  } catch {
    return emptyState();
  }
}

export async function writeAppState(next: AppState): Promise<void> {
  await mkdir(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  const payload = JSON.stringify(normalizeState(next), null, 2);
  await writeFile(tmp, payload, "utf-8");
  await rename(tmp, FILE);
}

/** Evita corridas entre várias server actions em paralelo. */
export function withAppStateLock<T>(
  fn: (state: AppState) => Promise<{ next: AppState; result: T }>,
): Promise<T> {
  const run = writeChain.then(async () => {
    const state = await readAppState();
    const { next, result } = await fn(structuredClone(state));
    await writeAppState(next);
    return result;
  });
  writeChain = run.then(() => undefined).catch(() => undefined);
  return run;
}
