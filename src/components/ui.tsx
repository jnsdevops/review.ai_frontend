/** Éléments d'interface partagés.
 *
 * Rien de décoratif ici : chaque composant existe parce qu'une information
 * comptable a besoin d'être lue vite et sans ambiguïté.
 */
import type { CSSProperties, ReactNode } from "react";

import type { CommentStatus, Severity, VatSeverity, VersionState } from "@/lib/api";

/* ─── Montants ─────────────────────────────────────────────────────────── */

/** Formate un montant : espaces comme séparateur de milliers, pas de décimale.
 *
 * Les montants arrivent en chaînes (Decimal côté serveur). On ne les convertit
 * pas en nombre JavaScript — au-delà de 2^53, une balance à onze chiffres
 * perdrait des unités en silence.
 */
export function formatAmount(value: string | number): string {
  const text = String(value).trim();
  const negative = text.startsWith("-");
  const digits = (negative ? text.slice(1) : text).split(".")[0].replace(/^0+(?=\d)/, "");
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return negative ? `−${grouped}` : grouped;
}

export function isNegative(value: string | number): boolean {
  return String(value).trim().startsWith("-");
}

export function Amount({
  value,
  bold,
  inline,
}: {
  value: string | number;
  bold?: boolean;
  inline?: boolean;
}) {
  return (
    <span
      className={`num${isNegative(value) ? " neg" : ""}`}
      // `display: block` est nécessaire : sur un élément en ligne,
      // `text-align: right` n'a aucun effet et les montants ne s'alignent
      // pas colonne par colonne — ce qui ruine la comparaison visuelle.
      style={{
        display: inline ? "inline" : "block",
        ...(bold ? { fontWeight: 600 } : {}),
      }}
    >
      {formatAmount(value)}
    </span>
  );
}

/** Intitulé lisible d'un contrôle, pour les constats sans compte rattaché. */
const CONTROLS: Record<string, string> = {
  equilibre: "Équilibre de la balance",
  coherence_par_compte: "Cohérence par compte",
  comptes_en_double: "Comptes en double",
  format_de_compte: "Format des numéros de compte",
  libelle_manquant: "Intitulés manquants",
  continuite_n1: "Continuité avec l'exercice précédent",
  soldes_atypiques: "Soldes de sens inhabituel",
  referentiel_comptable: "Référentiel comptable applicable",
};

export function controlLabel(control: string): string {
  return CONTROLS[control] ?? control;
}

/* ─── Blocs ────────────────────────────────────────────────────────────── */

export function Card({
  title,
  subtitle,
  right,
  children,
  style,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <section
      style={{
        background: "var(--panel)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r)",
        boxShadow: "var(--shadow)",
        overflow: "hidden",
        ...style,
      }}
    >
      {(title || right) && (
        <header
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 16,
            padding: "13px 16px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div>
            <h2 style={{ fontSize: 13.5, fontWeight: 650, letterSpacing: -0.1 }}>{title}</h2>
            {subtitle && (
              <div style={{ fontSize: 12, color: "var(--txt2)", marginTop: 2 }}>{subtitle}</div>
            )}
          </div>
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  const color =
    tone === "good"
      ? "var(--green)"
      : tone === "warn"
        ? "var(--amber)"
        : tone === "bad"
          ? "var(--red)"
          : "var(--txt)";
  return (
    <div
      style={{
        background: "var(--panel)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r)",
        padding: "13px 15px",
      }}
    >
      <div
        style={{
          fontSize: 10.5,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          color: "var(--txt3)",
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 21,
          fontWeight: 600,
          marginTop: 5,
          color,
          fontFamily: "var(--mono)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
      {hint && <div style={{ fontSize: 11.5, color: "var(--txt2)", marginTop: 3 }}>{hint}</div>}
    </div>
  );
}

/* ─── Signalétique ─────────────────────────────────────────────────────── */

type Tone = "neutral" | "info" | "good" | "warn" | "bad";

const TONES: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: "var(--slate-soft)", fg: "var(--txt2)" },
  info: { bg: "var(--accent-soft)", fg: "var(--accent)" },
  good: { bg: "var(--green-soft)", fg: "var(--green)" },
  warn: { bg: "var(--amber-soft)", fg: "var(--amber)" },
  bad: { bg: "var(--red-soft)", fg: "var(--red)" },
};

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  const { bg, fg } = TONES[tone];
  return (
    <span
      style={{
        display: "inline-block",
        background: bg,
        color: fg,
        fontSize: 10.5,
        fontWeight: 650,
        letterSpacing: "0.04em",
        padding: "2.5px 7px",
        borderRadius: 5,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

/** Étiquette d'état d'une version, avec le vocabulaire du métier. */
const VERSION_STATES: Record<VersionState, { label: string; tone: Tone }> = {
  RAW: { label: "Importée", tone: "neutral" },
  IN_REVIEW: { label: "En revue", tone: "info" },
  VALIDATED: { label: "Validée", tone: "good" },
  BLOCKED: { label: "Bloquée", tone: "bad" },
};

export function StateChip({ state }: { state: VersionState }) {
  const { label, tone } = VERSION_STATES[state];
  return <Badge tone={tone}>{label}</Badge>;
}

const SEVERITIES: Record<Severity, { label: string; tone: Tone }> = {
  BLOCKING: { label: "Bloquant", tone: "bad" },
  REVIEW_REQUIRED: { label: "À traiter", tone: "warn" },
  WARNING: { label: "Avertissement", tone: "warn" },
  INFORMATION: { label: "Information", tone: "neutral" },
};

export function SeverityChip({ severity }: { severity: Severity }) {
  const { label, tone } = SEVERITIES[severity];
  return <Badge tone={tone}>{label}</Badge>;
}

/** Gravité d'un constat de revue fiscale.
 *
 * Le vocabulaire diffère de celui de l'Audit Gate, et ce n'est pas une
 * inconséquence : un contrôle de balance bloque une production, un constat
 * fiscal chiffre un risque. Aucun d'eux ne conclut à un redressement.
 */
const VAT_SEVERITIES: Record<VatSeverity, { label: string; tone: Tone }> = {
  RISQUE: { label: "Risque latent", tone: "bad" },
  A_JUSTIFIER: { label: "À justifier", tone: "warn" },
  INFORMATION: { label: "Information", tone: "neutral" },
};

export function VatSeverityChip({ severity }: { severity: VatSeverity }) {
  const { label, tone } = VAT_SEVERITIES[severity];
  return <Badge tone={tone}>{label}</Badge>;
}

const COMMENT_STATES: Record<CommentStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: "Brouillon", tone: "neutral" },
  PENDING_REVIEW: { label: "À relire", tone: "info" },
  APPROVED_PRINTABLE: { label: "Approuvé", tone: "good" },
  REJECTED: { label: "Rejeté", tone: "bad" },
  MODIFIED_AFTER_APPROVAL: { label: "Modifié", tone: "warn" },
};

export function CommentChip({ status }: { status: CommentStatus }) {
  const { label, tone } = COMMENT_STATES[status];
  return <Badge tone={tone}>{label}</Badge>;
}

/* ─── Actions ──────────────────────────────────────────────────────────── */

export function Button({
  children,
  onClick,
  variant = "secondary",
  disabled,
  type,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const styles: Record<string, CSSProperties> = {
    primary: { background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" },
    secondary: {
      background: "var(--panel)",
      color: "var(--txt)",
      border: "1px solid var(--line-strong)",
    },
    danger: { background: "var(--panel)", color: "var(--red)", border: "1px solid #f2c3c3" },
  };
  return (
    <button
      type={type ?? "button"}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...styles[variant],
        padding: "6px 13px",
        borderRadius: "var(--r-sm)",
        fontSize: 12.5,
        fontWeight: 550,
      }}
    >
      {children}
    </button>
  );
}

export function Banner({
  tone = "info",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  const { bg, fg } = TONES[tone];
  return (
    <div
      style={{
        background: bg,
        color: fg,
        border: `1px solid ${fg}22`,
        borderRadius: "var(--r-sm)",
        padding: "10px 13px",
        fontSize: 12.5,
        lineHeight: 1.6,
      }}
    >
      {children}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div style={{ padding: "26px 16px", textAlign: "center", color: "var(--txt3)", fontSize: 12.5 }}>
      {children}
    </div>
  );
}
