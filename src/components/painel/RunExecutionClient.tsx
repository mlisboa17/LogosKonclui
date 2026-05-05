"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getEvidenceStampTime, setRunStatus, upsertItemResponse } from "@/actions/runs";
import { watermarkEvidenceImage } from "@/lib/evidence-photo-stamp";
import { EVIDENCE_BUCKET } from "@/lib/evidence-storage";
import { isItemSatisfied } from "@/lib/run-item-validation";

type Item = {
  id: string;
  title: string;
  is_critical: boolean;
  item_type: string;
  requires_photo?: boolean;
};

export type RunResponseRow = {
  checklist_item_id: string;
  completed: boolean;
  numeric_value?: number | string | null;
  text_value?: string | null;
  photo_path?: string | null;
  photo_uploaded_at?: string | null;
  photo_uploaded_by_display?: string | null;
  photo_evidence_caption?: string | null;
};

type RowState = {
  completed: boolean;
  numeric_value: number | null;
  text_value: string;
  photo_path: string | null;
  photo_uploaded_at: string | null;
  photo_uploaded_by_display: string | null;
  photo_evidence_caption: string | null;
};

const emptyRow = (): RowState => ({
  completed: false,
  numeric_value: null,
  text_value: "",
  photo_path: null,
  photo_uploaded_at: null,
  photo_uploaded_by_display: null,
  photo_evidence_caption: null,
});

function buildState(items: Item[], responses: RunResponseRow[]): Record<string, RowState> {
  const m = new Map(responses.map((r) => [r.checklist_item_id, r]));
  const o: Record<string, RowState> = {};
  for (const it of items) {
    const r = m.get(it.id);
    const n = r?.numeric_value;
    let numParsed: number | null = null;
    if (n !== null && n !== undefined) {
      const v = typeof n === "string" ? Number(String(n).trim()) : Number(n);
      numParsed = Number.isNaN(v) ? null : v;
    }
    o[it.id] = {
      completed: r?.completed ?? false,
      numeric_value: numParsed,
      text_value: r?.text_value ?? "",
      photo_path: r?.photo_path ?? null,
      photo_uploaded_at: r?.photo_uploaded_at ?? null,
      photo_uploaded_by_display: r?.photo_uploaded_by_display ?? null,
      photo_evidence_caption: r?.photo_evidence_caption ?? null,
    };
  }
  return o;
}

function toValidationRow(itemId: string, st: RowState): Parameters<typeof isItemSatisfied>[1] {
  return {
    checklist_item_id: itemId,
    completed: st.completed,
    numeric_value: st.numeric_value,
    text_value: st.text_value,
    photo_path: st.photo_path,
  };
}

function EvidenceImage({
  photoPath,
  usePhotoStorage,
}: {
  photoPath: string | null;
  usePhotoStorage: boolean;
}) {
  const [src, setSrc] = useState<string | null>(null);

  /* Props da evidência → estado + signed URL (Workbox/React Compiler: setState no effect é intencional). */
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!photoPath) {
      setSrc(null);
      return;
    }
    if (photoPath.startsWith("http://") || photoPath.startsWith("https://") || photoPath.startsWith("data:")) {
      setSrc(photoPath);
      return;
    }
    if (!usePhotoStorage) {
      setSrc(null);
      return;
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from(EVIDENCE_BUCKET)
        .createSignedUrl(photoPath, 60 * 30);
      if (!cancelled) setSrc(error ? null : data.signedUrl);
    })();
    return () => {
      cancelled = true;
    };
  }, [photoPath, usePhotoStorage]);

  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="Evidência" className="mt-2 max-h-48 max-w-full rounded-lg border border-zinc-200 object-contain dark:border-zinc-700" />
  );
}

export function RunExecutionClient({
  runId,
  organizationId,
  status,
  items,
  responses,
  usePhotoStorage,
  submitterDisplayName,
}: {
  runId: string;
  organizationId: string;
  status: string;
  items: Item[];
  responses: RunResponseRow[];
  usePhotoStorage: boolean;
  /** Nome para marca d’água e registo; em Supabase o utilizador também fica gravado na base ao enviar. */
  submitterDisplayName: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [byItem, setByItem] = useState(() => buildState(items, responses));
  const byItemRef = useRef(byItem);
  const [numDraft, setNumDraft] = useState<Record<string, string>>({});
  const textDebounceByItem = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    byItemRef.current = byItem;
  }, [byItem]);

  const responsesKey = useMemo(
    () =>
      responses
        .map(
          (r) =>
            `${r.checklist_item_id}:${r.completed}:${r.numeric_value ?? ""}:${r.text_value ?? ""}:${r.photo_path ?? ""}:${r.photo_uploaded_at ?? ""}:${r.photo_uploaded_by_display ?? ""}:${r.photo_evidence_caption ?? ""}`,
        )
        .join("|"),
    [responses],
  );

  useEffect(() => {
    /* Repor estado local quando o servidor devolve novas respostas (ex.: refresh). */
    /* eslint-disable react-hooks/set-state-in-effect */
    setByItem(buildState(items, responses));
    setNumDraft(
      Object.fromEntries(
        items.map((i) => {
          const r = responses.find((x) => x.checklist_item_id === i.id);
          const n = r?.numeric_value;
          const s =
            n === null || n === undefined || n === ""
              ? ""
              : String(r?.numeric_value);
          return [i.id, s] as const;
        }),
      ),
    );
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [items, responsesKey, responses]);

  useEffect(() => {
    const mapRef = textDebounceByItem.current;
    return () => {
      for (const t of mapRef.values()) clearTimeout(t);
      mapRef.clear();
    };
  }, []);

  async function persistRow(
    itemId: string,
    next: RowState,
    opts?: { photoEvidenceCaption?: string | null },
  ) {
    const payload = {
      runId,
      checklistItemId: itemId,
      completed: next.completed,
      numeric_value: next.numeric_value,
      text_value: next.text_value.trim() ? next.text_value : null,
      photo_path: next.photo_path,
      ...(opts?.photoEvidenceCaption !== undefined
        ? { photo_evidence_caption: opts.photoEvidenceCaption }
        : {}),
    };
    const r = await upsertItemResponse(payload);
    if ("error" in r && r.error) {
      alert(r.error);
      return;
    }
    router.refresh();
  }

  const doneCount = items.filter((i) => {
    const st = byItem[i.id] ?? emptyRow();
    return isItemSatisfied(i, toValidationRow(i.id, st));
  }).length;
  const total = items.length;
  const allDone = total > 0 && doneCount === total;

  function scheduleTextSave(itemId: string, text: string) {
    const prevT = textDebounceByItem.current.get(itemId);
    if (prevT) clearTimeout(prevT);
    setByItem((p) => {
      const base = p[itemId] ?? emptyRow();
      return { ...p, [itemId]: { ...base, text_value: text } };
    });
    const t = setTimeout(() => {
      textDebounceByItem.current.delete(itemId);
      start(() => {
        const base = byItemRef.current[itemId] ?? emptyRow();
        const next = { ...base, text_value: text };
        return persistRow(itemId, next);
      });
    }, 500);
    textDebounceByItem.current.set(itemId, t);
  }

  async function uploadPhoto(itemId: string, file: File, base: RowState) {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    if (!["jpg", "jpeg", "png", "webp", "heic", "heif"].includes(ext)) {
      alert("Use JPEG, PNG ou WebP.");
      return;
    }
    const stamp = await getEvidenceStampTime();
    const iso = stamp.iso;
    const who = submitterDisplayName.trim() || "Colaborador";
    const whenLine = new Date(iso).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "medium",
    });
    const stamped = await watermarkEvidenceImage(file, who, whenLine);
    if ("error" in stamped) {
      alert(`${stamped.error} Pode tirar foto nova em JPEG pela câmara.`);
      return;
    }
    const uploadName = `${crypto.randomUUID()}.jpg`;
    const path = `${organizationId}/${runId}/${uploadName}`;
    const supabase = createClient();
    const { error } = await supabase.storage.from(EVIDENCE_BUCKET).upload(path, stamped.blob, {
      contentType: "image/jpeg",
      upsert: false,
    });
    if (error) {
      alert(error.message);
      return;
    }
    const next = {
      ...base,
      photo_path: path,
      completed: true,
      photo_uploaded_at: null,
      photo_uploaded_by_display: null,
      photo_evidence_caption: null,
    };
    setByItem((prev) => ({ ...prev, [itemId]: next }));
    start(() => persistRow(itemId, next));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {doneCount}/{total} itens cumpridos
        </p>
        <div className="flex flex-wrap gap-2">
          {status === "scheduled" && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await setRunStatus(runId, "in_progress");
                  if ("error" in r && r.error) alert(r.error);
                  else router.refresh();
                })
              }
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-800"
            >
              Iniciar
            </button>
          )}
          {allDone && status !== "completed" && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await setRunStatus(runId, "completed");
                  if ("error" in r && r.error) alert(r.error);
                  else router.refresh();
                })
              }
              className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
            >
              Concluir execução
            </button>
          )}
        </div>
      </div>
      <ul className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
        {items.map((it) => {
          const st = byItem[it.id] ?? emptyRow();
          const satisfied = isItemSatisfied(it, toValidationRow(it.id, st));
          const showCheckbox =
            it.item_type === "boolean" || (it.item_type === "photo" && !it.is_critical);
          const needsPhotoEvidence = it.item_type === "photo" || it.requires_photo === true;

          return (
            <li key={it.id} className="px-4 py-4">
              <div className="flex flex-wrap items-start gap-3">
                {showCheckbox && (
                  <input
                    type="checkbox"
                    className="mt-1 size-4 accent-emerald-700"
                    checked={st.completed}
                    onChange={(e) => {
                      const v = e.target.checked;
                      const next = { ...st, completed: v };
                      setByItem((p) => ({ ...p, [it.id]: next }));
                      start(() => persistRow(it.id, next));
                    }}
                    disabled={pending || status === "completed"}
                  />
                )}
                {!showCheckbox && (
                  <span
                    className={`mt-1 flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      satisfied ? "bg-emerald-600 text-white" : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                    }`}
                    aria-hidden
                  >
                    {satisfied ? "✓" : "·"}
                  </span>
                )}
                <div className="min-w-0 flex-1 space-y-2">
                  <div>
                    <p className="font-medium">{it.title}</p>
                    <p className="text-xs text-zinc-500">
                      {it.item_type === "boolean" && "Sim / Não"}
                      {it.item_type === "number" && "Valor numérico"}
                      {it.item_type === "text" && "Texto livre"}
                      {it.item_type === "photo" &&
                        (it.is_critical
                          ? usePhotoStorage
                            ? "Foto obrigatória (tipo foto / crítico)"
                            : "URL da imagem obrigatória (crítico)"
                          : usePhotoStorage
                            ? "Foto opcional — pode marcar concluído sem foto"
                            : "URL opcional — pode marcar concluído")}
                      {it.item_type === "photo" && it.is_critical ? " · crítico" : ""}
                      {it.item_type !== "photo" &&
                        it.requires_photo &&
                        ` · foto obrigatória${usePhotoStorage ? "" : " (URL)"}`}
                    </p>
                  </div>

                  {it.item_type === "number" && status !== "completed" && (
                    <input
                      type="number"
                      step="any"
                      className="w-full max-w-xs rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                      value={numDraft[it.id] ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setNumDraft((d) => ({ ...d, [it.id]: raw }));
                      }}
                      onBlur={() => {
                        const raw = numDraft[it.id] ?? "";
                        const n = raw === "" ? null : Number(raw);
                        if (raw !== "" && Number.isNaN(n)) {
                          alert("Número inválido.");
                          return;
                        }
                        const next = { ...st, numeric_value: n };
                        setByItem((p) => ({ ...p, [it.id]: next }));
                        start(() => persistRow(it.id, next));
                      }}
                      disabled={pending}
                    />
                  )}

                  {it.item_type === "number" && status === "completed" && (
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">{st.numeric_value ?? "—"}</p>
                  )}

                  {it.item_type === "text" && status !== "completed" && (
                    <textarea
                      className="min-h-[88px] w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                      value={st.text_value}
                      onChange={(e) => scheduleTextSave(it.id, e.target.value)}
                      disabled={pending}
                    />
                  )}

                  {it.item_type === "text" && status === "completed" && (
                    <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">{st.text_value || "—"}</p>
                  )}

                  {needsPhotoEvidence && (
                    <div className="space-y-2">
                      {status !== "completed" && (
                        <>
                          {usePhotoStorage ? (
                            <div className="space-y-1">
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                                className="max-w-full text-sm"
                                disabled={pending}
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  e.target.value = "";
                                  if (f) start(() => uploadPhoto(it.id, f, st));
                                }}
                              />
                              <p className="text-xs text-zinc-500">
                                A imagem é gravada com o seu nome e a hora no rodapé, e na base de dados ficam registados
                                o envio e o utilizador ligado à sessão.
                              </p>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() =>
                                start(async () => {
                                  const url = prompt("Cole o URL da imagem (https://…):");
                                  if (!url?.trim()) return;
                                  const stamp = await getEvidenceStampTime();
                                  const who = submitterDisplayName.trim() || "Colaborador";
                                  const caption = `${who} · ${new Date(stamp.iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" })} (ao submeter URL)`;
                                  const next = {
                                    ...st,
                                    photo_path: url.trim(),
                                    completed: true,
                                    photo_evidence_caption: caption,
                                  };
                                  setByItem((p) => ({ ...p, [it.id]: next }));
                                  await persistRow(it.id, next, { photoEvidenceCaption: caption });
                                })
                              }
                              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600"
                            >
                              Definir URL da foto
                            </button>
                          )}
                        </>
                      )}
                      <EvidenceImage photoPath={st.photo_path} usePhotoStorage={usePhotoStorage} />
                      {st.photo_path ? (
                        <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                          {usePhotoStorage && st.photo_uploaded_at && st.photo_uploaded_by_display ? (
                            <>
                              <span className="font-medium text-zinc-700 dark:text-zinc-300">Registo no servidor:</span>{" "}
                              {st.photo_uploaded_by_display} ·{" "}
                              {new Date(st.photo_uploaded_at).toLocaleString("pt-BR", {
                                dateStyle: "short",
                                timeStyle: "medium",
                              })}
                            </>
                          ) : !usePhotoStorage && st.photo_evidence_caption ? (
                            <>
                              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                Referência ao submeter:
                              </span>{" "}
                              {st.photo_evidence_caption}
                            </>
                          ) : usePhotoStorage ? (
                            <>
                              Ao confirmar o envio, este bloco mostra o nome e a hora registados na base de dados pela
                              sua sessão (após atualizar a página).
                            </>
                          ) : null}
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
