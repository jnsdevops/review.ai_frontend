/** Audit Gate — les contrôles, leur traitement, et la validation.
 *
 * L'écran rend visible ce que le backend impose : on ne valide pas une
 * balance qu'on n'a pas contrôlée, et un constat bloquant se traite avant.
 */
import { useState } from "react";

import {
  type AuditRun,
  type BalanceVersion,
  type Finding,
  type FindingStatus,
  api,
} from "@/lib/api";
import type { Identity } from "@/lib/session";
import {
  Amount,
  Badge,
  Banner,
  Button,
  Card,
  Empty,
  SeverityChip,
  Stat,
  controlLabel,
} from "@/components/ui";

const TREATMENTS: { value: FindingStatus; label: string; help: string }[] = [
  { value: "JUSTIFIED", label: "Justifié", help: "Le constat est expliqué par une pièce ou une écriture." },
  { value: "CORRECTED", label: "Corrigé", help: "L'anomalie a été corrigée à la source." },
  { value: "ACCEPTED", label: "Accepté en l'état", help: "Le constat est assumé et documenté." },
];

function FindingRow({
  finding,
  identity,
  onResolved,
}: {
  finding: Finding;
  identity: Identity;
  onResolved: (run: AuditRun) => void;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<FindingStatus>("JUSTIFIED");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const treatable = finding.status === "OPEN" && finding.severity !== "INFORMATION";

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      onResolved(
        await api.resolveFinding(finding.finding_id!, status, reason, identity.id),
      );
      setOpen(false);
      setReason("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <tr>
        <td style={{ width: 110 }}>
          <SeverityChip severity={finding.severity} />
        </td>
        <td>
          <div style={{ fontWeight: 550, fontSize: 12.5 }}>
            {finding.account_number
              ? `Compte ${finding.account_number}`
              : controlLabel(finding.control)}
          </div>
          <div style={{ color: "var(--txt2)", fontSize: 12.5, marginTop: 2, maxWidth: 760 }}>
            {finding.message}
          </div>
          {finding.resolution && (
            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                color: "var(--green)",
                borderLeft: "2px solid var(--green)",
                paddingLeft: 8,
              }}
            >
              {finding.resolution}
            </div>
          )}
          {open && (
            <div style={{ marginTop: 10, display: "grid", gap: 8, maxWidth: 620 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {TREATMENTS.map((item) => (
                  <button
                    key={item.value}
                    title={item.help}
                    onClick={() => setStatus(item.value)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 6,
                      fontSize: 12,
                      border: "1px solid",
                      borderColor: status === item.value ? "var(--accent)" : "var(--line-strong)",
                      background: status === item.value ? "var(--accent-soft)" : "var(--panel)",
                      color: status === item.value ? "var(--accent)" : "var(--txt2)",
                      fontWeight: 550,
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Justification — pièce, écriture, décision. Obligatoire."
                style={{
                  border: "1px solid var(--line-strong)",
                  borderRadius: "var(--r-sm)",
                  padding: "8px 10px",
                  fontSize: 12.5,
                  resize: "vertical",
                }}
              />
              {error && <div style={{ color: "var(--red)", fontSize: 12 }}>{error}</div>}
              <div style={{ display: "flex", gap: 8 }}>
                <Button variant="primary" onClick={submit} disabled={busy || !reason.trim()}>
                  Enregistrer
                </Button>
                <Button onClick={() => setOpen(false)}>Annuler</Button>
              </div>
            </div>
          )}
        </td>
        <td style={{ width: 150 }}>
          {finding.amount !== null && <Amount value={finding.amount} />}
        </td>
        <td style={{ width: 130, textAlign: "right" }}>
          {finding.status !== "OPEN" ? (
            <Badge tone="good">Traité</Badge>
          ) : treatable && !open ? (
            <Button onClick={() => setOpen(true)}>Traiter</Button>
          ) : null}
        </td>
      </tr>
    </>
  );
}

export default function Controls({
  version,
  run,
  identity,
  onRun,
  onVersion,
}: {
  version: BalanceVersion;
  run: AuditRun | null;
  identity: Identity;
  onRun: (run: AuditRun) => void;
  onVersion: (version: BalanceVersion) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function execute() {
    setBusy(true);
    setError(null);
    try {
      onRun(await api.runAudit(version.version_id));
      onVersion(await api.version(version.version_id));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function validate() {
    setBusy(true);
    setError(null);
    try {
      onVersion(await api.validate(version.version_id, identity.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const openBlocking =
    run?.findings.filter((f) => f.severity === "BLOCKING" && f.status === "OPEN") ?? [];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {run && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          <Stat label="Lignes contrôlées" value={run.line_count} />
          <Stat
            label="Bloquants ouverts"
            value={openBlocking.length}
            tone={openBlocking.length ? "bad" : "good"}
          />
          <Stat
            label="À traiter"
            value={run.summary.REVIEW_REQUIRED ?? 0}
            tone={(run.summary.REVIEW_REQUIRED ?? 0) > 0 ? "warn" : "neutral"}
          />
          <Stat label="Jeu de règles" value={run.rule_version} hint={run.findings[0]?.rule_id} />
        </div>
      )}

      {error && <Banner tone="bad">{error}</Banner>}

      {!run && (
        <Banner tone="info">
          Aucun contrôle n&apos;a encore été exécuté sur cette balance. Tant qu&apos;ils
          n&apos;ont pas tourné, elle ne peut alimenter ni les états financiers ni la DSF.
        </Banner>
      )}

      {run && version.state !== "VALIDATED" && (
        <Banner tone={run.can_be_validated ? "good" : "bad"}>
          {run.can_be_validated
            ? "Aucune anomalie bloquante ouverte : cette balance peut être validée. La validation est un acte professionnel — elle sera enregistrée à votre nom."
            : `${openBlocking.length} anomalie(s) bloquante(s) à traiter avant toute validation.`}
        </Banner>
      )}

      {version.state === "VALIDATED" && (
        <Banner tone="good">
          Balance validée. Elle alimente désormais les états financiers et les notes annexes.
        </Banner>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <Button variant="primary" onClick={execute} disabled={busy}>
          {run ? "Relancer les contrôles" : "Lancer les contrôles"}
        </Button>
        <Button
          onClick={validate}
          disabled={busy || !run || !run.can_be_validated || version.state === "VALIDATED"}
        >
          Valider la balance
        </Button>
      </div>

      <Card
        title="Constats"
        subtitle={
          run
            ? "Review.AI contrôle, chiffre et explique. La décision reste humaine."
            : undefined
        }
      >
        {run ? (
          <table>
            <thead>
              <tr>
                <th>Gravité</th>
                <th>Constat</th>
                <th style={{ textAlign: "right" }}>Montant</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {run.findings.map((finding, index) => (
                <FindingRow
                  key={finding.finding_id ?? index}
                  finding={finding}
                  identity={identity}
                  onResolved={onRun}
                />
              ))}
            </tbody>
          </table>
        ) : (
          <Empty>Lancez les contrôles pour voir ce qu&apos;ils trouvent.</Empty>
        )}
      </Card>
    </div>
  );
}
