/** Client HTTP vers l'API Review.AI.
 *
 * Les types reproduisent exactement les contrats du backend. Toute divergence
 * se voit à la compilation plutôt qu'à l'exécution.
 *
 * Les montants arrivent en chaînes : ce sont des Decimal côté serveur, et les
 * convertir en `number` ferait perdre de la précision sur des balances à onze
 * chiffres. Ils restent des chaînes jusqu'à l'affichage.
 */

const BASE = import.meta.env.VITE_API_URL ?? "/api";

/* ─── Intake ───────────────────────────────────────────────────────────── */

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

/* ─── Versions de balance ──────────────────────────────────────────────── */

export type VersionState = "RAW" | "IN_REVIEW" | "VALIDATED" | "BLOCKED";

export interface BalanceVersion {
  version_id: string;
  entity_id: string;
  kind: "ACCOUNTING" | "FISCAL";
  state: VersionState;
  exercise_year: number | null;
  label: string | null;
  line_count: number;
  total_debit: string;
  total_credit: string;
  imbalance: string;
  is_consumable: boolean;
  superseded_by: string | null;
}

export interface Observation {
  severity: Severity;
  code: string;
  message: string;
  affected_rows: number;
  amount: string | null;
}

export interface ImportedVersion extends BalanceVersion {
  period_columns: string;
  opening_columns: string;
  movements_are_reliable: boolean;
  observations: Observation[];
}

export interface BalanceLine {
  account_number: string;
  account_label: string | null;
  opening_balance: string;
  debit_movement: string;
  credit_movement: string;
  closing_balance: string;
  source_row: number | null;
}

/* ─── Audit Gate ───────────────────────────────────────────────────────── */

export type Severity = "BLOCKING" | "REVIEW_REQUIRED" | "WARNING" | "INFORMATION";
export type FindingStatus = "OPEN" | "JUSTIFIED" | "ACCEPTED" | "CORRECTED";

export interface Finding {
  finding_id: string | null;
  code: string;
  severity: Severity;
  control: string;
  message: string;
  account_number: string | null;
  account_label: string | null;
  source_row: number | null;
  amount: string | null;
  affected_rows: number;
  rule_id: string;
  rule_version: string;
  status: FindingStatus;
  resolution: string | null;
}

export interface AuditRun {
  run_id: string;
  version_id: string;
  rule_version: string;
  line_count: number;
  outcome: "IN_REVIEW" | "BLOCKED";
  can_be_validated: boolean;
  summary: Record<string, number>;
  findings: Finding[];
}

/* ─── États financiers ─────────────────────────────────────────────────── */

export interface StatementLine {
  code: string;
  label: string;
  rubrique: string;
  amount: string;
  side: string | null;
  accounts: string[];
}

export interface CrossCheck {
  name: string;
  left: string;
  right: string;
  passed: boolean;
  detail: string;
}

export interface UnmappedAccount {
  account_number: string;
  account_label: string;
  closing_balance: string;
}

export interface Statements {
  version_id: string;
  entity_id: string;
  exercise_year: number | null;
  is_certifiable: boolean;
  total_actif: string;
  total_passif: string;
  resultat_net: string;
  bilan_actif: StatementLine[];
  bilan_passif: StatementLine[];
  compte_resultat: StatementLine[];
  sig: Record<string, string>;
  cross_checks: CrossCheck[];
  unmapped_accounts: UnmappedAccount[];
  unmapped_total: string;
  movements_reliable: boolean;
  notes_available: boolean;
}

export interface MappingRequest {
  account_number: string;
  statement: "BILAN" | "RESULTAT";
  code: string;
  rubrique: string;
  line: string;
  nature: "DEBIT" | "CREDIT";
  justification: string;
  account_label?: string | null;
  side?: "ACTIF" | "PASSIF" | null;
  contra?: boolean;
  expense?: boolean;
  decided_by?: string | null;
}

export interface MappingDecision extends MappingRequest {
  decision_id: string;
  entity_id: string;
}

/* ─── Notes annexes ────────────────────────────────────────────────────── */

export type CommentStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "APPROVED_PRINTABLE"
  | "REJECTED"
  | "MODIFIED_AFTER_APPROVAL";

export interface NoteComment {
  comment_id: string;
  version_no: number;
  text: string;
  status: CommentStatus;
  result_level: string;
  basis: string[];
  author_id: string | null;
  reviewer_id: string | null;
  review_reason: string | null;
}

export interface NoteLine {
  label: string;
  role: string;
  amount_n: string;
  amount_n1: string;
  variation: string;
  accounts: string[];
}

export interface Note {
  note_pk: string;
  note_id: string;
  title: string;
  lines: NoteLine[];
  comment: NoteComment | null;
  is_printable: boolean;
  is_stale: boolean;
}

export interface NotesSummary {
  version_id: string;
  notes: Note[];
  total: number;
  printable: number;
  awaiting_review: number;
  stale: number;
}

/* ─── Portefeuille du cabinet ──────────────────────────────────────────── */

export interface VatSummary {
  exercise_year: number;
  declarations: number;
  review_id: string | null;
  risque_total: string | null;
  open_risks: number;
  findings: number;
  reconstruction_complete: boolean | null;
}

export interface ClientSummary {
  entity_id: string;
  legal_name: string;
  niu: string | null;
  rccm: string | null;
  /** Déclaré au référentiel, ou seulement déduit des documents importés. */
  is_registered: boolean;
  balances: number;
  blocked: number;
  awaiting: number;
  validated: number;
  exercises: number[];
  last_exercise: number | null;
  vat: VatSummary[];
}

export interface ClientDetail extends ClientSummary {
  versions: BalanceVersion[];
}

/* ─── Revue fiscale — TVA collectée ────────────────────────────────────── */

export interface VatDeclarationRequest {
  month: number;
  base_taxable?: string | number;
  base_export?: string | number;
  base_exoneree?: string | number;
  tva_collectee?: string | number;
  chiffre_affaires_global?: string | number | null;
  source?: string;
  reference?: string | null;
  created_by?: string | null;
}

export interface VatDeclaration {
  declaration_id: string;
  entity_id: string;
  exercise_year: number;
  month: number;
  base_taxable: string;
  base_export: string;
  base_exoneree: string;
  tva_collectee: string;
  chiffre_affaires_global: string | null;
  source: string;
  reference: string | null;
  /** TVA déclarée − base déclarée × taux : une déclaration doit d'abord
   *  être cohérente avec elle-même. */
  ecart_interne: string;
  ecart_chiffre_affaires: string | null;
}

/** Les six faits générateurs du cahier des charges. */
export type Regime =
  | "LIVRAISON"
  | "PRESTATION"
  | "ENCAISSEMENT"
  | "IMMOBILIER"
  | "LOCATION"
  | "LASM";
export type Traitement = "TAXABLE" | "EXPORT" | "EXONERE";
export type TauxCategorie = "NORMAL" | "REDUIT" | "ZERO";

export interface VatRegimeRequest {
  account_number: string;
  regime: Regime;
  traitement: Traitement;
  justification: string;
  taux_categorie?: TauxCategorie;
  account_label?: string | null;
  decided_by?: string | null;
}

/** La fiche d'environnement fiscal — quatorze mentions, CDC §1.1. */
export interface FiscalEnvironment {
  denomination: string | null;
  activites: string | null;
  devise: string;
  juridiction: string | null;
  /** null = non renseigné, ce qui n'est pas « non ». */
  option_debits: boolean | null;
  rccm: string | null;
  niu: string | null;
  regime_imposition: string | null;
  centre_rattachement: string | null;
  derogation_date: string | null;
  derogation_duree: string | null;
  derogation_regime_fiscal: string | null;
  derogation_regime_douanier: string | null;
  natures_operations: string[];
  activites_taxables: string[];
  activites_exonerees: string[];
  particularites: string | null;
  is_declared: boolean;
  updated_by?: string | null;
}

export interface FiscalEnvironmentPayload extends FiscalEnvironment {
  entity_id: string;
  missing_mentions: string[];
}

export interface VatRegimeDecision extends VatRegimeRequest {
  decision_id: string;
  entity_id: string;
  taux_categorie: TauxCategorie;
}

export type VatSeverity = "RISQUE" | "A_JUSTIFIER" | "INFORMATION";

export interface VatFinding {
  finding_id: string;
  code: string;
  severity: VatSeverity;
  test: string;
  message: string;
  amount: string | null;
  accounts: string[];
  status: FindingStatus;
  resolution: string | null;
}

export interface VatReview {
  review_id: string;
  entity_id: string;
  exercise_year: number;
  rule_version: string;
  taux: string;
  base_livraison: string;
  tva_livraison: string;
  base_prestation: string;
  tva_prestation: string;
  base_declaree: string;
  tva_declaree: string;
  risque_livraison: string;
  risque_prestation: string;
  risque_total: string;
  reconstruction_complete: boolean;
  findings: VatFinding[];
}

/* ─── Transport ────────────────────────────────────────────────────────── */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
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
    throw new ApiError(detail, res.status);
  }
  return (await res.json()) as T;
}

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const api = {
  health: () =>
    request<{ status: string; storage: string; durable: boolean }>("/health"),

  registerEntities: (entities: EntityRegistration[]) =>
    request<{ registered: number }>("/uploads/entities", json(entities)),

  /** Dépôt en masse — plusieurs entités mélangées dans un même lot. */
  uploadBatch: (files: File[]) => {
    const form = new FormData();
    files.forEach((file) => form.append("files", file));
    return request<BatchResult>("/uploads/batch", { method: "POST", body: form });
  },

  batchStatus: (batchId: string) => request<BatchResult>(`/uploads/batch/${batchId}`),
  batches: () => request<BatchResult[]>("/uploads/batches"),

  /* Versions de balance */
  importBalance: (file: File, entityId: string, exerciseYear?: number) => {
    const form = new FormData();
    form.append("file", file);
    form.append("entity_id", entityId);
    if (exerciseYear) form.append("exercise_year", String(exerciseYear));
    return request<ImportedVersion>("/balances", { method: "POST", body: form });
  },
  versions: (entityId?: string) =>
    request<BalanceVersion[]>(
      `/balances${entityId ? `?entity_id=${encodeURIComponent(entityId)}` : ""}`,
    ),
  version: (id: string) => request<BalanceVersion>(`/balances/${id}`),
  lines: (id: string, limit = 500, offset = 0) =>
    request<BalanceLine[]>(`/balances/${id}/lines?limit=${limit}&offset=${offset}`),

  /* Audit Gate */
  runAudit: (id: string, compareTo?: string) =>
    request<AuditRun>(
      `/balances/${id}/audit${compareTo ? `?compare_to=${compareTo}` : ""}`,
      { method: "POST" },
    ),
  audit: (id: string) => request<AuditRun>(`/balances/${id}/audit`),
  resolveFinding: (
    findingId: string,
    status: FindingStatus,
    resolution: string,
    actorId?: string,
  ) =>
    request<AuditRun>(
      `/balances/findings/${findingId}`,
      json({ status, resolution, actor_id: actorId ?? null }),
    ),
  validate: (id: string, actorId?: string) =>
    request<BalanceVersion>(
      `/balances/${id}/validate`,
      json({ actor_id: actorId ?? null }),
    ),

  /* États financiers */
  statements: (id: string) => request<Statements>(`/balances/${id}/financials`),
  mappings: (entityId: string) =>
    request<MappingDecision[]>(`/entities/${entityId}/mappings`),
  decideMapping: (entityId: string, body: MappingRequest) =>
    request<MappingDecision>(`/entities/${entityId}/mappings`, json(body)),

  /* Notes annexes */
  generateNotes: (id: string, compareTo?: string) =>
    request<NotesSummary>(
      `/balances/${id}/notes${compareTo ? `?compare_to=${compareTo}` : ""}`,
      { method: "POST" },
    ),
  notes: (id: string) => request<NotesSummary>(`/balances/${id}/notes`),
  editComment: (notePk: string, text: string, authorId?: string) =>
    request<Note>(`/notes/${notePk}/comment`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, author_id: authorId ?? null }),
    }),
  submitComment: (notePk: string, authorId?: string) =>
    request<Note>(`/notes/${notePk}/submit`, json({ author_id: authorId ?? null })),
  reviewComment: (
    notePk: string,
    approved: boolean,
    reviewerId?: string,
    reason = "",
  ) =>
    request<Note>(
      `/notes/${notePk}/review`,
      json({ approved, reviewer_id: reviewerId ?? null, reason }),
    ),
  commentHistory: (notePk: string) =>
    request<NoteComment[]>(`/notes/${notePk}/history`),

  /* Portefeuille */
  clients: () => request<ClientSummary[]>("/clients"),
  client: (entityId: string) =>
    request<ClientDetail>(`/clients/${encodeURIComponent(entityId)}`),

  /* Environnement fiscal */
  fiscalEnvironment: (entityId: string) =>
    request<FiscalEnvironmentPayload>(
      `/tax/entities/${encodeURIComponent(entityId)}/fiscal-environment`,
    ),
  saveFiscalEnvironment: (entityId: string, body: Partial<FiscalEnvironment>) =>
    request<FiscalEnvironmentPayload>(
      `/tax/entities/${encodeURIComponent(entityId)}/fiscal-environment`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    ),

  /** Télécharge la fiche au format Word — livrable du cahier des charges. */
  exportFiscalEnvironment: async (entityId: string, year?: number) => {
    const res = await fetch(
      `${BASE}/tax/entities/${encodeURIComponent(entityId)}/fiscal-environment/export` +
        (year ? `?exercise_year=${year}` : ""),
    );
    if (!res.ok) {
      let detail = res.statusText;
      try {
        detail = (await res.json()).detail ?? detail;
      } catch {
        // réponse non JSON : on garde le statut
      }
      throw new ApiError(detail, res.status);
    }
    const header = (name: string) => res.headers.get(`x-review-fiche-${name}`);
    const blob = await res.blob();
    const filename = "Fiche_environnement_fiscal.docx";
    if (header("mentions") === null) return { blob, filename, report: null };
    return {
      blob,
      filename,
      report: {
        complete: header("complete") === "true",
        mentions: Number(header("mentions")),
        filled: Number(header("filled") ?? 0),
        missing: Number(header("missing") ?? 0),
        // Mentions absentes qui changent la base taxable, et non la seule
        // complétude formelle du document.
        blindSpots: Number(header("blind-spots") ?? 0),
      },
    };
  },

  /* Revue fiscale — TVA */
  vatDeclarations: (entityId: string, year: number) =>
    request<VatDeclaration[]>(
      `/tax/entities/${encodeURIComponent(entityId)}/vat/${year}/declarations`,
    ),
  saveVatDeclaration: (
    entityId: string,
    year: number,
    body: VatDeclarationRequest,
  ) =>
    request<VatDeclaration>(
      `/tax/entities/${encodeURIComponent(entityId)}/vat/${year}/declarations`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    ),
  vatRegimes: (entityId: string) =>
    request<VatRegimeDecision[]>(
      `/tax/entities/${encodeURIComponent(entityId)}/vat/regimes`,
    ),
  decideVatRegime: (entityId: string, body: VatRegimeRequest) =>
    request<VatRegimeDecision>(
      `/tax/entities/${encodeURIComponent(entityId)}/vat/regimes`,
      json(body),
    ),
  runVatReview: (versionId: string, actorId?: string) =>
    request<VatReview>(
      `/tax/balances/${versionId}/vat-review${actorId ? `?actor_id=${actorId}` : ""}`,
      { method: "POST" },
    ),
  vatReview: (entityId: string, year: number) =>
    request<VatReview>(
      `/tax/entities/${encodeURIComponent(entityId)}/vat/${year}/review`,
    ),
  resolveVatFinding: (
    findingId: string,
    status: FindingStatus,
    resolution: string,
    actorId?: string,
  ) =>
    request<VatReview>(
      `/tax/vat/findings/${findingId}`,
      json({ status, resolution, actor_id: actorId ?? null }),
    ),

  /** Télécharge le classeur du cabinet.
   *
   * Pas de `request()` ici : la réponse est un fichier, pas du JSON. Les
   * en-têtes `X-Review-Export-*` disent ce que le classeur contient et ce
   * qu'il ne contient pas — ils sont remontés pour être affichés, plutôt que
   * de laisser l'utilisateur ouvrir le fichier pour le découvrir.
   */
  exportVatReview: async (entityId: string, year: number) => {
    const res = await fetch(
      `${BASE}/tax/entities/${encodeURIComponent(entityId)}/vat/${year}/export`,
    );
    if (!res.ok) {
      let detail = res.statusText;
      try {
        detail = (await res.json()).detail ?? detail;
      } catch {
        // réponse non JSON : on garde le statut
      }
      throw new ApiError(detail, res.status);
    }
    const header = (name: string) => res.headers.get(`x-review-export-${name}`);
    const blob = await res.blob();
    const filename = `Revue_fiscale_TVA_${year}.xlsx`;

    // Un intermédiaire — proxy, passerelle, CORS mal configuré — peut retirer
    // les en-têtes personnalisés. Les lire comme des zéros annoncerait
    // « 0 mois déclarés » sur un classeur qui en porte douze : un chiffre faux
    // est pire qu'une absence de chiffre. En leur absence, pas de rapport.
    if (header("months") === null) return { blob, filename, report: null };

    return {
      blob,
      filename,
      report: {
        complete: header("complete") === "true",
        months: Number(header("months")),
        monthsMissing: Number(header("months-missing") ?? 0),
        accounts: Number(header("accounts") ?? 0),
        templateFixes: Number(header("template-fixes") ?? 0),
        notFilled: Number(header("not-filled") ?? 0),
        sheetsRemoved: Number(header("sheets-removed") ?? 0),
      },
    };
  },
};
