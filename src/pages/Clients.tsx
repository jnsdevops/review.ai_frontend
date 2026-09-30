/** Le portefeuille — tous les clients du cabinet, sur un écran.
 *
 * Un cabinet ne travaille pas sur un dossier, il en travaille cinquante. Cet
 * écran répond à une seule question : par quel client commencer ce matin ?
 * L'ordre vient du serveur — bloqués d'abord, risque fiscal ouvert ensuite —
 * et n'est pas retrié ici : un classement qui change d'un écran à l'autre ne
 * se lit plus.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { type ClientSummary, api } from "@/lib/api";
import { Amount, Badge, Banner, Card, Empty, Stat } from "@/components/ui";

/** Le risque fiscal ouvert d'un client, tous exercices confondus. */
function openRisk(client: ClientSummary): number {
  return client.vat.reduce((total, item) => total + item.open_risks, 0);
}

export default function Clients() {
  const [clients, setClients] = useState<ClientSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .clients()
      .then(setClients)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (error) return <Banner tone="bad">{error}</Banner>;
  if (!clients) return <Empty>Chargement…</Empty>;

  const blocked = clients.filter((c) => c.blocked).length;
  const atRisk = clients.filter((c) => openRisk(c)).length;
  const awaiting = clients.reduce((total, c) => total + c.awaiting, 0);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <header>
        <h1 style={{ fontSize: 21, fontWeight: 650, letterSpacing: -0.3 }}>Portefeuille</h1>
        <p style={{ color: "var(--txt2)", marginTop: 4, fontSize: 13 }}>
          Par quel client commencer : ce qui bloque, puis ce qui porte un risque.
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <Stat label="Clients" value={clients.length} />
        <Stat label="Bloqués" value={blocked} tone={blocked ? "bad" : "neutral"} />
        <Stat
          label="Risque fiscal ouvert"
          value={atRisk}
          tone={atRisk ? "warn" : "neutral"}
          hint={atRisk ? "constats de risque non traités" : undefined}
        />
        <Stat label="Balances à contrôler" value={awaiting} />
      </div>

      <Card title="Clients" subtitle={`${clients.length} au portefeuille`}>
        {clients.length === 0 ? (
          <Empty>
            Aucun client. Déclarez vos entités ou déposez des documents : un
            client apparaît dès qu&apos;un document lui est rattaché.
          </Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th style={{ width: 120 }}>Exercices</th>
                <th style={{ textAlign: "right", width: 90 }}>Balances</th>
                <th style={{ width: 150 }}>État</th>
                <th style={{ textAlign: "right", width: 160 }}>Risque TVA</th>
                <th style={{ width: 80 }} />
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => {
                const risks = openRisk(client);
                const reviewed = client.vat.filter((item) => item.review_id);
                const total = reviewed.reduce(
                  (sum, item) => sum + Number(item.risque_total ?? 0),
                  0,
                );
                return (
                  <tr key={client.entity_id}>
                    <td style={{ fontSize: 12.5 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Link
                          to={`/clients/${encodeURIComponent(client.entity_id)}`}
                          style={{ fontWeight: 550 }}
                        >
                          {client.legal_name}
                        </Link>
                        {!client.is_registered && (
                          <Badge tone="warn">Non déclaré</Badge>
                        )}
                      </div>
                      {client.niu && (
                        <div style={{ color: "var(--txt3)", fontSize: 11.5, marginTop: 2 }}>
                          NIU {client.niu}
                        </div>
                      )}
                    </td>
                    <td className="num" style={{ textAlign: "left", fontSize: 12 }}>
                      {client.exercises.length ? client.exercises.join(", ") : "—"}
                    </td>
                    <td className="num">{client.balances}</td>
                    <td>
                      {/* `display: flex` sur un <td> lui retire son
                          comportement de cellule : la colonne se désaligne et
                          la bordure de ligne saute. Le conteneur va dedans. */}
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {client.blocked > 0 && <Badge tone="bad">{client.blocked} bloquée</Badge>}
                        {client.awaiting > 0 && (
                          <Badge tone="info">{client.awaiting} à contrôler</Badge>
                        )}
                        {client.validated > 0 && (
                          <Badge tone="good">{client.validated} validée</Badge>
                        )}
                        {client.balances === 0 && <Badge>Rien reçu</Badge>}
                      </div>
                    </td>
                    <td>
                      {reviewed.length === 0 ? (
                        <span style={{ color: "var(--txt3)", fontSize: 12 }}>
                          {client.vat.length ? "revue à lancer" : "—"}
                        </span>
                      ) : (
                        <>
                          <Amount value={total} />
                          {risks > 0 && (
                            <div style={{ textAlign: "right", marginTop: 2 }}>
                              <Badge tone="warn">{risks} ouvert</Badge>
                            </div>
                          )}
                        </>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Link
                        to={`/clients/${encodeURIComponent(client.entity_id)}`}
                        style={{ color: "var(--accent)", fontSize: 12.5, fontWeight: 550 }}
                      >
                        Ouvrir
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
