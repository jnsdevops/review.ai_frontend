import { useState } from "react";

import { api, type BatchResult, type Dossier } from "@/lib/api";

/**
 * Dépôt en masse (SPEC §124) — plusieurs entreprises mélangées dans un lot.
 * Review.AI trie, renomme, classe et signale ce qui nécessite un arbitrage.
 */
export default function Intake() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BatchResult | null>(null);

  async function onFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await api.uploadBatch(Array.from(fileList)));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const dispatched = result?.dossiers.filter((d) => d.resolution === "AUTO_DISPATCHED") ?? [];
  const blocked = result?.dossiers.filter((d) => d.resolution === "BLOCKED_REVIEW_REQUIRED") ?? [];

  return (
    <div style={{ padding: "28px 34px", maxWidth: 1240, margin: "0 auto" }}>
      <h1 style={{ fontSize: 25, fontWeight: 700, letterSpacing: -0.6 }}>Déposer des documents</h1>
      <p style={{ color: "var(--txt2)", marginTop: 6, maxWidth: 720, lineHeight: 1.7 }}>
        Déposez les balances et grands livres de vos clients — dans n&apos;importe quel ordre, sans
        les renommer, sans les trier. Review.AI identifie les entreprises, reconstitue les dossiers
        et lance les traitements.
      </p>

      <label
        style={{
          display: "block",
          marginTop: 24,
          border: "1.5px dashed var(--line-strong)",
          borderRadius: 18,
          padding: "40px 30px",
          textAlign: "center",
          background: "var(--panel)",
          cursor: busy ? "wait" : "pointer",
        }}
      >
        <input
          type="file"
          multiple
          hidden
          accept=".xlsx,.xlsm,.xls"
          disabled={busy}
          onChange={(e) => onFiles(e.target.files)}
        />
        <div style={{ fontSize: 34, marginBottom: 12 }}>⇪</div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>
          {busy ? "Traitement en cours…" : "Glissez vos fichiers ici"}
        </div>
        <div style={{ fontSize: 12.5, color: "var(--txt2)", marginTop: 7, lineHeight: 1.7 }}>
          Balances N et N-1, grands livres, PV d&apos;AG, déclarations fiscales…
          <br />
          Plusieurs entreprises peuvent être mélangées dans le même dépôt.
        </div>
      </label>

      {error && (
        <div style={{ marginTop: 16, color: "var(--red)", fontSize: 12.5 }}>Erreur : {error}</div>
      )}

      {result && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 13,
              margin: "26px 0 22px",
            }}
          >
            <Kpi label="Fichiers déposés" value={result.total_files} />
            <Kpi label="Dossiers lancés" value={result.dispatched} tone="ok" />
            <Kpi label="À arbitrer" value={result.blocked} tone="warn" />
            <Kpi label="Doublons ignorés" value={result.duplicates} />
          </div>

          {dispatched.length > 0 && (
            <Section title="✓ Constitués et lancés automatiquement">
              {dispatched.map((d) => (
                <DossierCard key={d.entity_name + d.exercise_year} dossier={d} />
              ))}
            </Section>
          )}

          {blocked.length > 0 && (
            <Section title="⚠ Nécessitent votre intervention" tone="warn">
              {blocked.map((d) => (
                <DossierCard key={d.entity_name + d.exercise_year} dossier={d} />
              ))}
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone?: "ok" | "warn" }) {
  const palette = {
    ok: { bg: "var(--green-soft)", border: "#b7e4d0", color: "var(--green)" },
    warn: { bg: "var(--amber-soft)", border: "#f0d9a8", color: "var(--amber)" },
  };
  const style = tone ? palette[tone] : { bg: "transparent", border: "var(--line)", color: "var(--txt)" };

  return (
    <div
      style={{
        border: `1px solid ${style.border}`,
        borderRadius: 13,
        padding: "15px 17px",
        background: style.bg,
      }}
    >
      <div style={{ fontSize: 11.5, color: "var(--txt2)" }}>{label}</div>
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: 25,
          fontWeight: 700,
          marginTop: 3,
          color: style.color,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Section({
  title,
  tone,
  children,
}: {
  title: string;
  tone?: "warn";
  children: React.ReactNode;
}) {
  return (
    <>
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          margin: "22px 0 12px",
          color: tone === "warn" ? "var(--amber)" : "var(--txt)",
        }}
      >
        {title}
      </div>
      {children}
    </>
  );
}

function DossierCard({ dossier }: { dossier: Dossier }) {
  const blocked = dossier.resolution === "BLOCKED_REVIEW_REQUIRED";

  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: 13,
        background: "var(--panel)",
        padding: "14px 17px",
        marginBottom: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13.5, fontWeight: 600 }}>{dossier.entity_name}</span>
        <span
          style={{
            fontSize: 10.5,
            padding: "3px 10px",
            borderRadius: 20,
            fontWeight: 600,
            background: blocked ? "var(--amber-soft)" : "var(--green-soft)",
            color: blocked ? "var(--amber)" : "var(--green)",
          }}
        >
          {blocked ? dossier.blocking_reason : "Lancé"}
        </span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--txt3)" }}>
          confiance {(dossier.confidence * 100).toFixed(0)}%
        </span>
      </div>

      <div style={{ fontSize: 11.5, color: "var(--txt3)", marginTop: 4 }}>
        {dossier.exercise_year ? `Exercice ${dossier.exercise_year} · ` : ""}
        {dossier.files_matched} fichier{dossier.files_matched > 1 ? "s" : ""}
      </div>

      {dossier.blocking_detail && (
        <div style={{ fontSize: 11.5, color: "var(--txt2)", marginTop: 7, lineHeight: 1.6 }}>
          {dossier.blocking_detail}
        </div>
      )}

      {dossier.files.length > 0 && (
        <div
          style={{
            fontSize: 11,
            color: "var(--txt3)",
            fontFamily: "var(--mono)",
            marginTop: 8,
            lineHeight: 1.8,
          }}
        >
          {dossier.files.map((f) => (
            <div key={f.original_name}>
              {f.original_name}
              {f.proposed_name && (
                <span style={{ opacity: 0.6 }}> → {f.proposed_name}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
