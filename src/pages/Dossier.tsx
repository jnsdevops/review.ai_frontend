/** Un dossier : une balance, ses contrôles, ses états, ses notes.
 *
 * L'ordre des onglets n'est pas cosmétique : il reproduit l'ordre imposé par
 * le backend. Contrôler, valider, puis produire. Les onglets en aval restent
 * visibles mais disent pourquoi ils sont fermés — une fonction cachée laisse
 * croire qu'elle n'existe pas.
 */
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import Controls from "@/panels/Controls";
import Notes from "@/panels/Notes";
import Statements from "@/panels/Statements";
import {
  ApiError,
  type AuditRun,
  type BalanceVersion,
  type NotesSummary,
  type Statements as StatementsPayload,
  api,
} from "@/lib/api";
import { useIdentity } from "@/lib/session";
import { Amount, Badge, Banner, Empty, StateChip } from "@/components/ui";

type Tab = "controls" | "statements" | "notes";

export default function Dossier() {
  const { versionId = "" } = useParams();
  const [identity] = useIdentity();

  const [version, setVersion] = useState<BalanceVersion | null>(null);
  const [run, setRun] = useState<AuditRun | null>(null);
  const [statements, setStatements] = useState<StatementsPayload | null>(null);
  const [notes, setNotes] = useState<NotesSummary | null>(null);
  const [tab, setTab] = useState<Tab>("controls");
  const [error, setError] = useState<string | null>(null);

  /** Recharge ce qui est accessible — l'API refuse le reste, et c'est normal. */
  const refresh = useCallback(async () => {
    try {
      const current = await api.version(versionId);
      setVersion(current);
      setError(null);

      setRun(await api.audit(versionId).catch(() => null));
      if (current.is_consumable) {
        setStatements(await api.statements(versionId).catch(() => null));
        setNotes(await api.notes(versionId).catch(() => null));
      } else {
        setStatements(null);
        setNotes(null);
      }
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 404
          ? "Cette balance n'existe pas ou a été supprimée."
          : e instanceof Error
            ? e.message
            : String(e),
      );
    }
  }, [versionId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (error) return <Banner tone="bad">{error}</Banner>;
  if (!version) return <Empty>Chargement…</Empty>;

  const locked = !version.is_consumable;
  const tabs: { key: Tab; label: string; disabled: boolean }[] = [
    { key: "controls", label: "Contrôles", disabled: false },
    { key: "statements", label: "États financiers", disabled: locked },
    { key: "notes", label: "Notes annexes", disabled: locked },
  ];

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <header>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h1 style={{ fontSize: 21, fontWeight: 650, letterSpacing: -0.3 }}>
            {version.label ?? "Balance générale"}
          </h1>
          <StateChip state={version.state} />
          {version.kind === "FISCAL" && <Badge tone="info">Retraitée fiscalement</Badge>}
          {version.superseded_by && <Badge tone="warn">Remplacée</Badge>}
        </div>
        <div
          style={{
            display: "flex",
            gap: 20,
            marginTop: 7,
            fontSize: 12.5,
            color: "var(--txt2)",
            flexWrap: "wrap",
          }}
        >
          <span>Exercice {version.exercise_year ?? "—"}</span>
          <span>{version.line_count} comptes</span>
          <span>
            Écart&nbsp;: <Amount value={version.imbalance} inline />
          </span>
        </div>
      </header>

      <nav style={{ display: "flex", gap: 2, borderBottom: "1px solid var(--line)" }}>
        {tabs.map((item) => (
          <button
            key={item.key}
            onClick={() => !item.disabled && setTab(item.key)}
            disabled={item.disabled}
            title={
              item.disabled
                ? "Disponible une fois la balance validée"
                : undefined
            }
            style={{
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 550,
              color: tab === item.key ? "var(--accent)" : "var(--txt2)",
              borderBottom: `2px solid ${tab === item.key ? "var(--accent)" : "transparent"}`,
              marginBottom: -1,
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === "controls" && (
        <Controls
          version={version}
          run={run}
          identity={identity}
          onRun={setRun}
          onVersion={(next) => {
            setVersion(next);
            void refresh();
          }}
        />
      )}

      {tab === "statements" &&
        (statements ? (
          <Statements
            statements={statements}
            identity={identity}
            onChanged={() => void refresh()}
          />
        ) : (
          <Banner tone="info">
            Les états financiers se construisent sur une balance validée. Passez d&apos;abord
            par l&apos;onglet Contrôles.
          </Banner>
        ))}

      {tab === "notes" && (
        <Notes
          summary={notes}
          identity={identity}
          onSummary={setNotes}
          onGenerate={async () => {
            setNotes(await api.generateNotes(versionId));
          }}
        />
      )}
    </div>
  );
}
