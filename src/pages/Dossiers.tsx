/** Command Center — l'état de tous les dossiers en cours.
 *
 * La première question d'un responsable de cabinet n'est pas « que contient ce
 * dossier ? » mais « où en sommes-nous, et qu'est-ce qui me bloque ? ». Les
 * balances bloquées et celles en attente remontent donc en tête.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { type BalanceVersion, api } from "@/lib/api";
import { Amount, Banner, Card, Empty, StateChip, Stat } from "@/components/ui";

const ORDER: Record<string, number> = {
  BLOCKED: 0,
  IN_REVIEW: 1,
  RAW: 2,
  VALIDATED: 3,
};

export default function Dossiers() {
  const [versions, setVersions] = useState<BalanceVersion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .versions()
      .then((list) =>
        setVersions(
          [...list].sort(
            (a, b) => (ORDER[a.state] ?? 9) - (ORDER[b.state] ?? 9),
          ),
        ),
      )
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (error) return <Banner tone="bad">{error}</Banner>;
  if (!versions) return <Empty>Chargement…</Empty>;

  const count = (state: string) => versions.filter((v) => v.state === state).length;

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <header>
        <h1 style={{ fontSize: 21, fontWeight: 650, letterSpacing: -0.3 }}>Dossiers</h1>
        <p style={{ color: "var(--txt2)", marginTop: 4, fontSize: 13 }}>
          Ce qui bloque d&apos;abord, ce qui attend ensuite.
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <Stat label="Bloquées" value={count("BLOCKED")} tone={count("BLOCKED") ? "bad" : "neutral"} />
        <Stat label="En revue" value={count("IN_REVIEW")} tone={count("IN_REVIEW") ? "warn" : "neutral"} />
        <Stat label="À contrôler" value={count("RAW")} />
        <Stat label="Validées" value={count("VALIDATED")} tone="good" />
      </div>

      <Card title="Balances">
        {versions.length === 0 ? (
          <Empty>
            Aucune balance importée. Commencez par déposer des documents.
          </Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Balance</th>
                <th style={{ width: 90 }}>Exercice</th>
                <th style={{ width: 110 }}>État</th>
                <th style={{ textAlign: "right", width: 100 }}>Comptes</th>
                <th style={{ textAlign: "right", width: 150 }}>Écart</th>
                <th style={{ width: 90 }} />
              </tr>
            </thead>
            <tbody>
              {versions.map((version) => (
                <tr key={version.version_id}>
                  <td style={{ fontSize: 12.5 }}>
                    {version.label ?? "Balance générale"}
                    {version.superseded_by && (
                      <span style={{ color: "var(--amber)", marginLeft: 8, fontSize: 11.5 }}>
                        remplacée
                      </span>
                    )}
                  </td>
                  <td className="num" style={{ textAlign: "left" }}>
                    {version.exercise_year ?? "—"}
                  </td>
                  <td>
                    <StateChip state={version.state} />
                  </td>
                  <td className="num">{version.line_count}</td>
                  <td>
                    <Amount value={version.imbalance} />
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Link
                      to={`/dossiers/${version.version_id}`}
                      style={{ color: "var(--accent)", fontSize: 12.5, fontWeight: 550 }}
                    >
                      Ouvrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
