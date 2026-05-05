/**
 * Protótipo sem banco: `NEXT_PUBLIC_DATA_MODE=json` em `.env.local`.
 * Os dados ficam em `data/prototype-state.json` (somente no servidor local).
 */
export function isJsonStoreMode(): boolean {
  return process.env.NEXT_PUBLIC_DATA_MODE === "json";
}
