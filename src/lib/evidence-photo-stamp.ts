/**
 * Sobrepõe nome + hora na imagem no browser antes do upload.
 * Serve como reforço visual; o registo em base de dados (photo_uploaded_at / photo_uploaded_by)
 * é a prova operacional de quem submeteu em que instante.
 */
export async function watermarkEvidenceImage(
  file: File,
  line1: string,
  line2: string,
): Promise<{ blob: Blob; fileName: string } | { error: string }> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { error: "Não foi possível ler a imagem (tente JPEG ou PNG guardados pela câmara)." };
  }

  const maxW = 1920;
  const maxH = 1920;
  let w = bitmap.width;
  let h = bitmap.height;
  const scale = Math.min(1, maxW / w, maxH / h);
  w = Math.round(w * scale);
  h = Math.round(h * scale);

  const pad = Math.max(12, Math.round(Math.min(w, h) * 0.02));
  const barH = Math.max(56, Math.round(Math.min(w, h) * 0.12));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h + barH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { error: "Canvas indisponível neste dispositivo." };

  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  ctx.fillStyle = "rgba(0,0,0,0.72)";
  ctx.fillRect(0, h, w, barH);

  const fontPx = Math.max(16, Math.round(Math.min(w, h) * 0.035));
  ctx.fillStyle = "#ffffff";
  ctx.font = `600 ${fontPx}px system-ui, Segoe UI, sans-serif`;
  ctx.textBaseline = "top";
  const t1 = line1.trim() || "Colaborador";
  const t2 = line2.trim();
  const x = pad;
  const y1 = h + pad;
  const y2 = y1 + fontPx + 6;
  ctx.fillText(t1, x, y1);
  ctx.font = `500 ${Math.max(14, fontPx - 2)}px system-ui, Segoe UI, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fillText(t2, x, y2);

  const base = (file.name.replace(/\.[^.]+$/, "") || "evidencia").replace(/[^\w\-]+/g, "_");
  const fileName = `${base}-marcada.jpg`;

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.88),
  );
  if (!blob) return { error: "Falha ao gerar imagem com marca d'água." };

  return { blob, fileName };
}
