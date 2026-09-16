/** Client HTTP vers l'API Review.AI (contrats SPEC §99-105, §124.5). */

const BASE = import.meta.env.VITE_API_URL ?? "/api";

export type DossierResolution = "AUTO_DISPATCHED" | "BLOCKED_REVIEW_REQUIRED";

export interface DossierStatus {
  entity_id: string | null;
  entity_name_guess: string | null;
  files_matched: number;
  confidence: number;
  resolution: DossierResolution;
  engagement_id: string | null;
  blocking_reason: string | null;
}

export interface BatchStatus {
  batch_id: string;
  status: "PROCESSING" | "COMPLETED" | "PARTIALLY_BLOCKED";
  dossiers: DossierStatus[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`${res.status} ${res.statusText} — ${detail}`);
  }
  return (await res.json()) as T;
}

export const api = {
  health: () => request<{ status: string }>("/health"),

  /** Dépôt en masse — lot hétérogène, plusieurs entités mélangées (§124.5). */
  uploadBatch: (files: File[]) => {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    return request<{ batch_id: string; total_files: number; status: string }>("/uploads/batch", {
      method: "POST",
      body: form,
    });
  },

  batchStatus: (batchId: string) => request<BatchStatus>(`/uploads/batch/${batchId}/status`),

  /** Résolution humaine d'un fichier ambigu (§7, §125.1). */
  resolveAmbiguous: (
    batchId: string,
    body: { source_document_id: string; entity_id: string; actor_id: string },
  ) =>
    request<{ entity_resolution_status: string; dossier_dispatched: boolean }>(
      `/uploads/batch/${batchId}/resolve-ambiguous`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    ),
};
