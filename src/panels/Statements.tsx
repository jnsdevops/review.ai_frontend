/** États financiers — et l'arbitrage des comptes que SYSCOHADA ne prévoit pas.
 *
 * Deux choses doivent sauter aux yeux : l'équilibre du bilan, et les comptes
 * non rattachés. Un montant qui disparaîtrait discrètement est le pire défaut
 * possible pour un outil comptable — ici, il est chiffré et en tête d'écran.
 */
import { useState } from "react";

import {
  type MappingRequest,
  type StatementLine,
  type Statements as StatementsPayload,
  type UnmappedAccount,
  api,
} from "@/lib/api";
import type { Identity } from "@/lib/session";
import { Amount, Banner, Button, Card, Empty, Stat } from "@/components/ui";

function LinesTable({ lines }: { lines: StatementLine[] }) {
  if (!lines.length) return <Empty>Aucun poste alimenté.</Empty>;
  let rubrique = "";
  return (
    <table>
      <thead>
        <tr>
          <th style={{ width: 52 }}>Réf.</th>
          <th>Poste</th>
          <th style={{ textAlign: "right", width: 160 }}>Montant</th>
          <th style={{ width: 210 }}>Comptes</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((line, index) => {
          const header = line.rubrique !== rubrique ? line.rubrique : null;
          rubrique = line.rubrique;
          return (
            <>
              {header && (
                <tr key={`${index}-r`}>
                  <td
                    colSpan={4}
                    style={{
                      background: "var(--panel2)",
                      fontSize: 10.5,
                      fontWeight: 650,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "var(--txt3)",
                      padding: "6px 12px",
                    }}
                  >
                    {header}
                  </td>
                </tr>
              )}
              <tr key={index}>
                <td className="num" style={{ textAlign: "left", color: "var(--txt3)" }}>
                  {line.code}
                </td>
                <td style={{ fontSize: 12.5 }}>{line.label}</td>
                <td>
                  <Amount value={line.amount} />
                </td>
                <td style={{ fontSize: 11, color: "var(--txt3)", fontFamily: "var(--mono)" }}>
                  {line.accounts.slice(0, 4).join(" · ")}
                  {line.accounts.length > 4 && ` +${line.accounts.length - 4}`}
                </td>
              </tr>
            </>
          );
        })}
      </tbody>
    </table>
  );
}

function MappingForm({
  account,
  entityId,
  identity,
  onDone,
}: {
  account: UnmappedAccount;
  entityId: string;
  identity: Identity;
  onDone: () => void;
}) {
  const [form, setForm] = useState<MappingRequest>({
    account_number: account.account_number,
    account_label: account.account_label,
    statement: "BILAN",
    side: "ACTIF",
    code: "",
    rubrique: "",
    line: "",
    nature: "DEBIT",
    justification: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof MappingRequest>(key: K, value: MappingRequest[K]) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api.decideMapping(entityId, { ...form, decided_by: identity.id });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const field: React.CSSProperties = {
    border: "1px solid var(--line-strong)",
    borderRadius: "var(--r-sm)",
    padding: "6px 9px",
    fontSize: 12.5,
    width: "100%",
  };

  return (
    <div style={{ display: "grid", gap: 8, maxWidth: 680, marginTop: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        <select
          style={field}
          value={form.statement}
          onChange={(e) => set("statement", e.target.value as "BILAN" | "RESULTAT")}
        >
          <option value="BILAN">Bilan</option>
          <option value="RESULTAT">Compte de résultat</option>
        </select>
        {form.statement === "BILAN" && (
          <select
            style={field}
            value={form.side ?? "ACTIF"}
            onChange={(e) => set("side", e.target.value as "ACTIF" | "PASSIF")}
          >
            <option value="ACTIF">Actif</option>
            <option value="PASSIF">Passif</option>
          </select>
        )}
        <select
          style={field}
          value={form.nature}
          onChange={(e) => set("nature", e.target.value as "DEBIT" | "CREDIT")}
        >
          <option value="DEBIT">Nature débit</option>
          <option value="CREDIT">Nature crédit</option>
        </select>
        <input
          style={field}
          placeholder="Réf. (ex. BI)"
          value={form.code}
          onChange={(e) => set("code", e.target.value.toUpperCase())}
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <input
          style={field}
          placeholder="Rubrique (ex. Actif circulant)"
          value={form.rubrique}
          onChange={(e) => set("rubrique", e.target.value)}
        />
        <input
          style={field}
          placeholder="Libellé du poste"
          value={form.line}
          onChange={(e) => set("line", e.target.value)}
        />
      </div>
      <textarea
        style={{ ...field, resize: "vertical" }}
        rows={2}
        placeholder="Justification — pourquoi ce compte relève de ce poste. Obligatoire, et conservée."
        value={form.justification}
        onChange={(e) => set("justification", e.target.value)}
      />
      {error && <div style={{ color: "var(--red)", fontSize: 12 }}>{error}</div>}
      <div>
        <Button
          variant="primary"
          onClick={submit}
          disabled={
            busy || !form.code.trim() || !form.line.trim() || !form.justification.trim()
          }
        >
          Rattacher ce compte
        </Button>
      </div>
    </div>
  );
}

export default function Statements({
  statements,
  identity,
  onChanged,
}: {
  statements: StatementsPayload;
  identity: Identity;
  onChanged: () => void;
}) {
  const [tab, setTab] = useState<"actif" | "passif" | "resultat">("actif");
  const [arbitrating, setArbitrating] = useState<string | null>(null);

  const ecart = statements.cross_checks.find((c) => c.name.includes("Actif"));

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <Stat label="Total actif" value={<Amount value={statements.total_actif} />} />
        <Stat label="Total passif" value={<Amount value={statements.total_passif} />} />
        <Stat
          label="Résultat net"
          value={<Amount value={statements.resultat_net} />}
          tone={statements.resultat_net.startsWith("-") ? "bad" : "good"}
        />
        <Stat
          label="Certifiable"
          value={statements.is_certifiable ? "Oui" : "Non"}
          tone={statements.is_certifiable ? "good" : "warn"}
          hint={
            statements.is_certifiable
              ? undefined
              : `${statements.unmapped_accounts.length} compte(s) à rattacher`
          }
        />
      </div>

      {!statements.movements_reliable && (
        <Banner tone="warn">
          Les mouvements de l&apos;exercice ne sont pas connus pour cette balance : le bilan et
          le compte de résultat sont calculés sur les soldes de clôture, mais le tableau de flux
          de trésorerie et les notes de mouvements devront être alimentés par le grand livre.
        </Banner>
      )}

      {statements.unmapped_accounts.length > 0 && (
        <Card
          title={`${statements.unmapped_accounts.length} compte(s) non rattaché(s)`}
          subtitle="Ces montants ne figurent dans aucun poste. Ils ne sont pas perdus — ils attendent une décision."
          right={<Amount value={statements.unmapped_total} bold />}
        >
          <table>
            <thead>
              <tr>
                <th style={{ width: 110 }}>Compte</th>
                <th>Intitulé</th>
                <th style={{ textAlign: "right", width: 160 }}>Solde</th>
                <th style={{ width: 130 }} />
              </tr>
            </thead>
            <tbody>
              {statements.unmapped_accounts.map((account) => (
                <tr key={account.account_number}>
                  <td className="num" style={{ textAlign: "left" }}>
                    {account.account_number}
                  </td>
                  <td style={{ fontSize: 12.5 }}>
                    {account.account_label}
                    {arbitrating === account.account_number && (
                      <MappingForm
                        account={account}
                        entityId={statements.entity_id}
                        identity={identity}
                        onDone={() => {
                          setArbitrating(null);
                          onChanged();
                        }}
                      />
                    )}
                  </td>
                  <td>
                    <Amount value={account.closing_balance} />
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {arbitrating === account.account_number ? (
                      <Button onClick={() => setArbitrating(null)}>Annuler</Button>
                    ) : (
                      <Button onClick={() => setArbitrating(account.account_number)}>
                        Rattacher
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {ecart && !ecart.passed && (
        <Banner tone="bad">
          Le bilan n&apos;est pas équilibré : écart de{" "}
          <strong>{statements.total_actif}</strong> à l&apos;actif contre{" "}
          <strong>{statements.total_passif}</strong> au passif. Cet écart correspond exactement
          aux comptes non rattachés ci-dessus.
        </Banner>
      )}

      <Card
        title="États financiers SYSCOHADA"
        right={
          <div style={{ display: "flex", gap: 6 }}>
            {(
              [
                ["actif", "Bilan actif"],
                ["passif", "Bilan passif"],
                ["resultat", "Compte de résultat"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 550,
                  border: "1px solid",
                  borderColor: tab === key ? "var(--accent)" : "transparent",
                  background: tab === key ? "var(--accent-soft)" : "transparent",
                  color: tab === key ? "var(--accent)" : "var(--txt2)",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        }
      >
        <LinesTable
          lines={
            tab === "actif"
              ? statements.bilan_actif
              : tab === "passif"
                ? statements.bilan_passif
                : statements.compte_resultat
          }
        />
      </Card>

      <Card title="Contrôles croisés" subtitle="Chaque chiffre confirmé par une seconde voie.">
        <table>
          <thead>
            <tr>
              <th>Contrôle</th>
              <th style={{ textAlign: "right", width: 150 }}>Valeur A</th>
              <th style={{ textAlign: "right", width: 150 }}>Valeur B</th>
              <th style={{ width: 90, textAlign: "right" }}>Résultat</th>
            </tr>
          </thead>
          <tbody>
            {statements.cross_checks.map((check) => (
              <tr key={check.name}>
                <td style={{ fontSize: 12.5 }}>
                  {check.name}
                  <div style={{ color: "var(--txt3)", fontSize: 11.5 }}>{check.detail}</div>
                </td>
                <td>
                  <Amount value={check.left} />
                </td>
                <td>
                  <Amount value={check.right} />
                </td>
                <td style={{ textAlign: "right" }}>
                  <span
                    style={{
                      color: check.passed ? "var(--green)" : "var(--red)",
                      fontWeight: 600,
                      fontSize: 12,
                    }}
                  >
                    {check.passed ? "Conforme" : "Écart"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
