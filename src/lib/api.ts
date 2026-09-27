/** Client HTTP vers l'API Review.AI (contrats SPEC §99-105, §124.5). */

const BASE = import.meta.env.VITE_API_URL ?? "/api";

export type Resolution = "AUTO_DISPATCHED" | "BLOCKED_REVIEW_REQUIRED";

export interface FilePlacement {
  original_name: string;
  proposed_name: string | null;
  file_type: string;
  exercise_year: number | null;
}

export interface Dossier {
  entity_id: string | null;
  entity_name: string;
  exercise_year: number | null;
  files_matched: number;
  confidence: number;
  resolution: Resolution;
  blocking_reason: string | null;
  blocking_detail: string | null;
  files: FilePlacement[];
}

export interface BatchResult {
  batch_id: string;
  total_files: number;
  status: "COMPLETED" | "PARTIALLY_BLOCKED" | "PROCESSING";
  dispatched: number;
  blocked: number;
  duplicates: number;
  dossiers: Dossier[];
}

export interface EntityRegistration {
  entity_id: string;
  legal_name: string;
  niu?: string;
  rccm?: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // réponse non JSON : on garde le statut
    }
    throw new Error(detail);
  }
  return (await res.json()) as T;
}

export const api = {
  health: () => request<{ status: string }>("/health"),

  /** Déclare les entités du cabinet, référence de la résolution (§7). */
  registerEntities: (entities: EntityRegistration[]) =>
    request<{ registered: number }>("/uploads/entities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entities),
    }),

  /** Dépôt en masse — plusieurs entités mélangées dans un même lot (§124). */
  uploadBatch: (files: File[]) => {
    const form = new FormData();
    files.forEach((file) => form.append("files", file));
    return request<BatchResult>("/uploads/batch", { method: "POST", body: form });
  },

  batchStatus: (batchId: string) => request<BatchResult>(`/uploads/batch/${batchId}`),
};
