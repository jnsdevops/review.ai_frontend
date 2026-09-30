/** La fiche d'un client : ses balances, et sa revue fiscale.
 *
 * Deux travaux distincts cohabitent ici, et c'est voulu : les états financiers
 * s'arrêtent une fois l'an sur une balance validée, la revue fiscale se lance
 * tous les mois sur le même dossier. Les séparer en deux écrans obligerait à
 * jongler entre deux listes de clients.
 */
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import VatReview from "@/panels/VatReview";
import { ApiError, type ClientDetail, api } from "@/lib/api";
import { useIdentity } from "@/lib/session";
import { Amount, Badge, Banner, Card, Empty, StateChip } from "@/components/ui";

export default function Client() {
  const { entityId = "" } = useParams();
  const [identity] = useIdentity();

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const detail = await api.client(entityId);
      setClient(detail);
      setError(null);
      setYear((current) => current ?? detail.last_exercise);
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 404
          ? "Ce client n'existe pas."
          : e instanceof Error
            ? e.message
            : String(e),
      );
    }
  }, [entityId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (error) return <Banner tone="bad">{error}</Banner>;
  if (!client) return <Empty>Chargement…</Empty>;

  const exercises = client.exercises;
  const selected = year ?? client.last_exercise;

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <header>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <Link to="/clients" style={{ color: "var(--txt3)", fontSize: 12.5 }}>
            Portefeuille
          </Link>
          <span style={{ color: "var(--txt3)" }}>/</span>
          <h1 style={{ fontSize: 21, fontWeight: 650, letterSpacing: -0.3 }}>
            {client.legal_name}
          </h1>
          {!client.is_registered && <Badge tone="warn">Non déclaré au référentiel</Badge>}
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
          {client.niu && <span>NIU {client.niu}</span>}
          {client.rccm && <span>RCCM {client.rccm}</span>}
          <span>{client.balances} balance(s)</span>
          <span>
            Exercices&nbsp;: {exercises.length ? exercises.join(", ") : "aucun"}
          </span>
        </div>
      </header>

      {!client.is_registered && (
        <Banner tone="warn">
          Ce client a été déduit des documents importés : ni NIU ni RCCM ne sont
          connus. Ils sont exigés sur les déclarations légales — déclarez
          l&apos;entité avant de produire une DSF.
        </Banner>
      )}

      <Card title="Balances" subtitle="Contrôler, valider, puis produire les états">
        {client.versions.length === 0 ? (
          <Empty>Aucune balance reçue pour ce client.</Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Balance</th>
                <th style={{ width: 90 }}>Exercice</th>
                <th style={{ width: 110 }}>État</th>
                <th style={{ textAlign: "right", width: 100 }}>Comptes</th>
                <th style={{ textAlign: "right", width: 150 }}>Écart</th>
                <th style={{ width: 80 }} />
              </tr>
            </thead>
            <tbody>
              {client.versions.map((version) => (
                <tr key={version.version_id}>
                  <td style={{ fontSize: 12.5 }}>
                    {version.label ?? "Balance générale"}
                    {version.kind === "FISCAL" && (
                      <Badge tone="info">Retraitée fiscalement</Badge>
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

      <div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 12,
            marginBottom: 10,
            flexWrap: "wrap",
          }}
        >
          <h2 style={{ fontSize: 15, fontWeight: 650, letterSpacing: -0.2 }}>
            Revue fiscale — TVA collectée
          </h2>
          <span style={{ fontSize: 12, color: "var(--txt2)" }}>
            Indépendante des états financiers : elle se lance tous les mois.
          </span>
          {exercises.length > 1 && (
            <select
              value={selected ?? ""}
              onChange={(e) => setYear(Number(e.target.value))}
              style={{
                marginLeft: "auto",
                border: "1px solid var(--line-strong)",
                borderRadius: 7,
                padding: "5px 9px",
                fontSize: 12.5,
                background: "var(--panel)",
              }}
            >
              {exercises.map((item) => (
                <option key={item} value={item}>
                  Exercice {item}
                </option>
              ))}
            </select>
          )}
        </div>

        {selected == null ? (
          <Banner tone="info">
            La revue fiscale se rattache à un exercice. Importez d&apos;abord une
            balance pour ce client.
          </Banner>
        ) : (
          <VatReview
            entityId={client.entity_id}
            year={selected}
            versions={client.versions.filter((v) => v.exercise_year === selected)}
            identity={identity}
            defaults={{
              denomination: client.legal_name,
              niu: client.niu,
              rccm: client.rccm,
            }}
            onChanged={() => void refresh()}
          />
        )}
      </div>
    </div>
  );
}
