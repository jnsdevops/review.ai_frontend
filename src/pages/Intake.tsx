import { useState } from "react";

import { api } from "@/lib/api";

/**
 * Dépôt en masse (SPEC §124) — plusieurs entreprises mélangées dans un même lot.
 * Review.AI trie, renomme, classe et lance les traitements.
 */
export default function Intake() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);

  async function onFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.uploadBatch(Array.from(fileList));
      setBatchId(res.batch_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

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
          border: "1.5px dashed rgba(34,211,238,.4)",
          borderRadius: 18,
          padding: "40px 30px",
          textAlign: "center",
          background: "linear-gradient(160deg, rgba(34,211,238,.06), rgba(99,102,241,.04))",
          cursor: busy ? "wait" : "pointer",
        }}
      >
        <input type="file" multiple hidden disabled={busy} onChange={(e) => onFiles(e.target.files)} />
        <div style={{ fontSize: 34, marginBottom: 12 }}>⇪</div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>
          {busy ? "Traitement en cours…" : "Glissez vos fichiers ici"}
        </div>
        <div style={{ fontSize: 12.5, color: "var(--txt2)", marginTop: 7, lineHeight: 1.7 }}>
          Balances N et N-1, grands livres, PV d&apos;AG, déclarations fiscales, justificatifs…
          <br />
          Plusieurs entreprises peuvent être mélangées dans le même dépôt.
        </div>
      </label>

      {error && <div style={{ marginTop: 16, color: "#FCA5A5", fontSize: 12.5 }}>Erreur : {error}</div>}
      {batchId && (
        <div style={{ marginTop: 16, color: "#6EE7B7", fontSize: 12.5, fontFamily: "var(--mono)" }}>
          Lot créé : {batchId}
        </div>
      )}
    </div>
  );
}
