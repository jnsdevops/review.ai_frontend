/** Revue fiscale — TVA collectée.
 *
 * Trois travaux, dans l'ordre où un fiscaliste les mène :
 *
 *   Déclarations   ce que l'entreprise a déposé, mois par mois. Les montants
 *                  saisis sont ceux du formulaire, jamais ceux qu'on aurait
 *                  calculés : c'est leur écart avec la comptabilité qu'on
 *                  cherche.
 *   Régimes        les comptes dont le fait générateur ne se lit pas dans le
 *                  numéro. Chaque arbitrage est justifié et daté.
 *   Revue          la confrontation, les risques chiffrés, et le classeur.
 *
 * L'écran n'arbitre rien de lui-même. Quand deux signaux se contredisent, il
 * les montre tous les deux.
 */
import { useCallback, useEffect, useState } from "react";

import FiscalSheet from "@/panels/FiscalSheet";
import {
  type BalanceVersion,
  type FindingStatus,
  type Regime,
  type Traitement,
  type VatDeclaration,
  type VatFinding,
  type VatRegimeDecision,
  type VatReview as VatReviewPayload,
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
  Stat,
  VatSeverityChip,
  formatAmount,
} from "@/components/ui";

const MOIS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

type Section = "environnement" | "declarations" | "regimes" | "review";

interface Draft {
  base_taxable: string;
  base_export: string;
  base_exoneree: string;
  tva_collectee: string;
}

const EMPTY: Draft = {
  base_taxable: "",
  base_export: "",
  base_exoneree: "",
  tva_collectee: "",
};

/** Un montant saisi devient une valeur pour l'API : vide vaut zéro. */
function amount(value: string): string {
  const cleaned = value
    // Espaces de groupement, y compris insécables : un montant recopié depuis
    // l'écran en porte.
    .replace(/[\s\u00a0\u202f]/g, "")
    // Le signe moins typographique que l'affichage utilise n'est pas le moins
    // d'un nombre. Le convertir, jamais le supprimer : un montant recollé
    // depuis l'écran changerait de sens sans que personne ne le voie.
    .replace(/\u2212/g, "-")
    .replace(",", ".");
  return cleaned === "" ? "0" : cleaned;
}

/** Ce que le serveur a enregistré, sous la forme qu'on édite. */
function toDraft(declaration: VatDeclaration): Draft {
  return {
    base_taxable: declaration.base_taxable,
    base_export: declaration.base_export,
    base_exoneree: declaration.base_exoneree,
    tva_collectee: declaration.tva_collectee,
  };
}

function sameDraft(a: Draft, b: Draft): boolean {
  return (
    amount(a.base_taxable) === amount(b.base_taxable) &&
    amount(a.base_export) === amount(b.base_export) &&
    amount(a.base_exoneree) === amount(b.base_exoneree) &&
    amount(a.tva_collectee) === amount(b.tva_collectee)
  );
}

/* ─── Déclarations ─────────────────────────────────────────────────────── */

function Declarations({
  entityId,
  year,
  declarations,
  identity,
  onSaved,
}: {
  entityId: string;
  year: number;
  declarations: VatDeclaration[];
  identity: Identity;
  onSaved: () => void;
}) {
  const stored: Record<number, Draft> = {};
  declarations.forEach((item) => {
    stored[item.month] = toDraft(item);
  });

  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Une cellule en cours de saisie montre le nombre brut ; les autres le
  // montrent groupé. Douze lignes de montants à neuf chiffres collés ne se
  // comparent pas à l'œil, et c'est le seul usage de ce tableau.
  const [focused, setFocused] = useState<string | null>(null);

  const current = (month: number): Draft =>
    drafts[month] ?? stored[month] ?? EMPTY;

  const dirty = Object.keys(drafts)
    .map(Number)
    .filter((month) => !sameDraft(current(month), stored[month] ?? EMPTY));

  function edit(month: number, field: keyof Draft, value: string) {
    setDrafts((previous) => ({
      ...previous,
      [month]: { ...current(month), [field]: value },
    }));
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      for (const month of dirty) {
        const draft = current(month);
        await api.saveVatDeclaration(entityId, year, {
          month,
          base_taxable: amount(draft.base_taxable),
          base_export: amount(draft.base_export),
          base_exoneree: amount(draft.base_exoneree),
          tva_collectee: amount(draft.tva_collectee),
          created_by: identity.id,
        });
      }
      setDrafts({});
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const cell: React.CSSProperties = {
    width: "100%",
    border: "1px solid var(--line)",
    borderRadius: 5,
    padding: "4px 7px",
    fontFamily: "var(--mono)",
    fontVariantNumeric: "tabular-nums",
    textAlign: "right",
    fontSize: 12,
    background: "var(--panel)",
  };

  return (
    <Card
      title="Déclarations déposées"
      subtitle="Les montants du formulaire, pas ceux qu'on aurait calculés."
      right={
        <Button variant="primary" onClick={save} disabled={busy || dirty.length === 0}>
          {dirty.length ? `Enregistrer ${dirty.length} mois` : "Rien à enregistrer"}
        </Button>
      }
    >
      {error && (
        <div style={{ padding: "10px 16px" }}>
          <Banner tone="bad">{error}</Banner>
        </div>
      )}
      <table>
        <thead>
          <tr>
            <th style={{ width: 100 }}>Mois</th>
            <th style={{ textAlign: "right" }}>Base taxable</th>
            <th style={{ textAlign: "right" }}>Exportations</th>
            <th style={{ textAlign: "right" }}>CA exonéré</th>
            <th style={{ textAlign: "right" }}>TVA collectée</th>
            <th style={{ textAlign: "right", width: 150 }}>Écart interne</th>
          </tr>
        </thead>
        <tbody>
          {MOIS.map((label, index) => {
            const month = index + 1;
            const draft = current(month);
            const declaration = declarations.find((item) => item.month === month);
            const gap = declaration?.ecart_interne ?? null;
            const off = gap !== null && Number(gap) !== 0;
            const changed = drafts[month] && !sameDraft(draft, stored[month] ?? EMPTY);
            return (
              <tr key={month} style={changed ? { background: "var(--accent-soft)" } : undefined}>
                <td style={{ fontSize: 12.5 }}>{label}</td>
                {(
                  ["base_taxable", "base_export", "base_exoneree", "tva_collectee"] as const
                ).map((field) => {
                  const key = `${month}-${field}`;
                  return (
                    <td key={field}>
                      <input
                        value={
                          focused === key
                            ? draft[field]
                            : draft[field] === ""
                              ? ""
                              : formatAmount(draft[field])
                        }
                        onChange={(e) => edit(month, field, e.target.value)}
                        onFocus={() => setFocused(key)}
                        onBlur={() => setFocused(null)}
                        inputMode="decimal"
                        placeholder="0"
                        style={cell}
                      />
                    </td>
                  );
                })}
                <td title="TVA déclarée moins base déclarée × 19,25 %">
                  {gap === null ? (
                    <span style={{ color: "var(--txt3)", fontSize: 12 }}>—</span>
                  ) : off ? (
                    <Amount value={gap} bold />
                  ) : (
                    <span style={{ color: "var(--green)", fontSize: 12, display: "block", textAlign: "right" }}>
                      cohérente
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

/* ─── Régimes arbitrés ─────────────────────────────────────────────────── */

function Regimes({
  entityId,
  decisions,
  identity,
  onDecided,
}: {
  entityId: string;
  decisions: VatRegimeDecision[];
  identity: Identity;
  onDecided: () => void;
}) {
  const [account, setAccount] = useState("");
  const [regime, setRegime] = useState<Regime>("LIVRAISON");
  const [traitement, setTraitement] = useState<Traitement>("EXONERE");
  const [justification, setJustification] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api.decideVatRegime(entityId, {
        account_number: account.trim(),
        regime,
        traitement,
        justification,
        decided_by: identity.id,
      });
      setAccount("");
      setJustification("");
      onDecided();
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
    background: "var(--panel)",
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Banner tone="info">
        Le fait générateur ne se lit pas toujours dans le numéro de compte : une
        entreprise peut loger des ventes exonérées dans une subdivision d&apos;un
        compte taxable. Un arbitrage vaut pour ce client et pour les exercices
        suivants — il l&apos;emporte sur la règle générale.
      </Banner>

      <Card title="Régimes arbitrés" subtitle={`${decisions.length} décision(s) active(s)`}>
        {decisions.length === 0 ? (
          <Empty>
            Aucun arbitrage. Les comptes suivent la règle générale du référentiel.
          </Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: 110 }}>Compte</th>
                <th style={{ width: 120 }}>Fait générateur</th>
                <th style={{ width: 110 }}>Traitement</th>
                <th>Justification</th>
              </tr>
            </thead>
            <tbody>
              {decisions.map((item) => (
                <tr key={item.decision_id}>
                  <td className="num" style={{ textAlign: "left" }}>
                    {item.account_number}
                  </td>
                  <td>
                    <Badge tone={item.regime === "LIVRAISON" ? "info" : "neutral"}>
                      {item.regime === "LIVRAISON" ? "Livraison" : "Encaissement"}
                    </Badge>
                  </td>
                  <td>
                    <Badge
                      tone={
                        item.traitement === "TAXABLE"
                          ? "warn"
                          : item.traitement === "EXPORT"
                            ? "info"
                            : "good"
                      }
                    >
                      {item.traitement}
                    </Badge>
                  </td>
                  <td style={{ fontSize: 12.5, color: "var(--txt2)" }}>{item.justification}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card title="Arbitrer un compte">
        <div style={{ padding: 16, display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder="Numéro de compte — 7011800"
              style={{ ...field, width: 210, fontFamily: "var(--mono)" }}
            />
            <select
              value={regime}
              onChange={(e) => setRegime(e.target.value as Regime)}
              title="Le fait générateur : à la livraison pour les biens, à l'encaissement pour les services."
              style={field}
            >
              <option value="LIVRAISON">Exigible à la livraison (biens)</option>
              <option value="PRESTATION">Exigible à l&apos;encaissement (services)</option>
            </select>
            <select
              value={traitement}
              onChange={(e) => setTraitement(e.target.value as Traitement)}
              style={field}
            >
              <option value="TAXABLE">Taxable</option>
              <option value="EXPORT">Export — taux zéro</option>
              <option value="EXONERE">Exonéré</option>
            </select>
          </div>
          <textarea
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            rows={2}
            placeholder="Justification — agrément, texte applicable, nature réelle des opérations. Obligatoire."
            style={{ ...field, resize: "vertical" }}
          />
          {error && <Banner tone="bad">{error}</Banner>}
          <div>
            <Button
              variant="primary"
              onClick={submit}
              disabled={busy || !account.trim() || !justification.trim()}
            >
              Enregistrer l&apos;arbitrage
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ─── Constats ─────────────────────────────────────────────────────────── */

const TREATMENTS: { value: FindingStatus; label: string; help: string }[] = [
  {
    value: "JUSTIFIED",
    label: "Justifié",
    help: "Décalage d'exigibilité, exonération tracée, pièce à l'appui.",
  },
  { value: "CORRECTED", label: "Corrigé", help: "La déclaration ou l'écriture a été rectifiée." },
  {
    value: "ACCEPTED",
    label: "Accepté en l'état",
    help: "Le risque est assumé et documenté.",
  },
];

function FindingRow({
  finding,
  identity,
  onResolved,
}: {
  finding: VatFinding;
  identity: Identity;
  onResolved: (review: VatReviewPayload) => void;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<FindingStatus>("JUSTIFIED");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      onResolved(
        await api.resolveVatFinding(finding.finding_id, status, reason, identity.id),
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
    <tr>
      <td style={{ width: 120 }}>
        <VatSeverityChip severity={finding.severity} />
      </td>
      <td>
        <div style={{ fontWeight: 550, fontSize: 12.5 }}>{finding.test}</div>
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
              placeholder="Justification — obligatoire. Un risque accepté sans explication n'a aucune valeur en due diligence."
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
      <td style={{ width: 150 }}>{finding.amount !== null && <Amount value={finding.amount} />}</td>
      <td style={{ width: 120, textAlign: "right" }}>
        {finding.status !== "OPEN" ? (
          <Badge tone="good">Traité</Badge>
        ) : !open ? (
          <Button onClick={() => setOpen(true)}>Traiter</Button>
        ) : null}
      </td>
    </tr>
  );
}

/* ─── Le panneau ───────────────────────────────────────────────────────── */

export default function VatReview({
  entityId,
  year,
  versions,
  identity,
  defaults,
  onChanged,
}: {
  entityId: string;
  year: number;
  versions: BalanceVersion[];
  identity: Identity;
  defaults?: { denomination?: string | null; niu?: string | null; rccm?: string | null };
  onChanged: () => void;
}) {
  // L'environnement fiscal vient en premier : il commande le calcul des
  // deux autres onglets.
  const [section, setSection] = useState<Section>("environnement");
  const [declarations, setDeclarations] = useState<VatDeclaration[]>([]);
  const [regimes, setRegimes] = useState<VatRegimeDecision[]>([]);
  const [review, setReview] = useState<VatReviewPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exported, setExported] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(false);

  const load = useCallback(async () => {
    setDeclarations(await api.vatDeclarations(entityId, year).catch(() => []));
    setRegimes(await api.vatRegimes(entityId).catch(() => []));
    setReview(await api.vatReview(entityId, year).catch(() => null));
  }, [entityId, year]);

  useEffect(() => {
    void load();
  }, [load]);

  // La revue se chiffre sur une balance validée : sur des chiffres non
  // contrôlés, elle chiffrerait un risque sur du sable.
  const usable = versions.find((version) => version.is_consumable);

  async function run() {
    if (!usable) return;
    setBusy(true);
    setError(null);
    setExported(null);
    setDownloaded(false);
    try {
      setReview(await api.runVatReview(usable.version_id, identity.id));
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const file = await api.exportVatReview(entityId, year);
      const url = URL.createObjectURL(file.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.filename;
      anchor.click();
      URL.revokeObjectURL(url);
      const report = file.report;
      setExported(
        report === null
          ? null
          : [
              `${report.months} mois déclarés`,
              `${report.accounts} lignes de base reconstituées`,
              `${report.templateFixes} contrôles du modèle rétablis`,
              report.monthsMissing ? `${report.monthsMissing} mois sans déclaration` : null,
              report.notFilled ? `${report.notFilled} cellule(s) laissée(s) en blanc` : null,
            ]
              .filter(Boolean)
              .join(" · "),
      );
      setDownloaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const sections: { key: Section; label: string; count?: number }[] = [
    { key: "environnement", label: "Environnement fiscal" },
    { key: "declarations", label: "Déclarations", count: declarations.length },
    { key: "regimes", label: "Régimes", count: regimes.length },
    {
      key: "review",
      label: "Revue et constats",
      count: review?.findings.filter((item) => item.status === "OPEN").length,
    },
  ];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <nav style={{ display: "flex", gap: 2, borderBottom: "1px solid var(--line)" }}>
        {sections.map((item) => (
          <button
            key={item.key}
            onClick={() => setSection(item.key)}
            style={{
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 550,
              color: section === item.key ? "var(--accent)" : "var(--txt2)",
              borderBottom: `2px solid ${section === item.key ? "var(--accent)" : "transparent"}`,
              marginBottom: -1,
            }}
          >
            {item.label}
            {item.count ? (
              <span style={{ color: "var(--txt3)", marginLeft: 6, fontSize: 11.5 }}>
                {item.count}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      {section === "environnement" && (
        <FiscalSheet
          entityId={entityId}
          year={year}
          identity={identity}
          defaults={defaults}
          onSaved={() => {
            void load();
            onChanged();
          }}
        />
      )}

      {section === "declarations" && (
        <Declarations
          entityId={entityId}
          year={year}
          declarations={declarations}
          identity={identity}
          onSaved={() => {
            void load();
            onChanged();
          }}
        />
      )}

      {section === "regimes" && (
        <Regimes
          entityId={entityId}
          decisions={regimes}
          identity={identity}
          onDecided={() => void load()}
        />
      )}

      {section === "review" && (
        <div style={{ display: "grid", gap: 16 }}>
          {review && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              <Stat
                label="TVA reperformée"
                value={<Amount value={review.tva_livraison} />}
                hint="régime de livraison, depuis les comptes 70"
              />
              <Stat label="TVA déclarée" value={<Amount value={review.tva_declaree} />} />
              <Stat
                label="Risque latent (A)"
                value={<Amount value={review.risque_livraison} />}
                tone={Number(review.risque_livraison) > 0 ? "bad" : "good"}
                hint="livraison de biens"
              />
              <Stat
                label="Risque latent (B)"
                value={<Amount value={review.risque_prestation} />}
                tone={Number(review.risque_prestation) > 0 ? "bad" : "neutral"}
                hint="prestations, à l'encaissement"
              />
            </div>
          )}

          {error && <Banner tone="bad">{error}</Banner>}
          {downloaded && (
            <Banner tone="good">
              {exported
                ? `Classeur téléchargé — ${exported}.`
                : "Classeur téléchargé. Le détail de ce qu'il contient n'a pas pu être lu : les en-têtes de la réponse n'ont pas traversé. Ouvrez le fichier pour le vérifier."}
            </Banner>
          )}

          {!usable && (
            <Banner tone="warn">
              Aucune balance validée pour l&apos;exercice {year}. Reconstituer une
              base taxable depuis des chiffres non contrôlés chiffrerait un
              risque sur du sable : contrôlez et validez d&apos;abord la balance.
            </Banner>
          )}

          {review && !review.reconstruction_complete && (
            <Banner tone="warn">
              La reconstitution est partielle : des comptes de produits n&apos;ont
              pas de régime de TVA établi. Les écarts ci-dessous le sont aussi.
              Arbitrez ces comptes dans l&apos;onglet Régimes, puis relancez.
            </Banner>
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button variant="primary" onClick={run} disabled={busy || !usable}>
              {review ? "Relancer la revue" : "Lancer la revue"}
            </Button>
            <Button onClick={download} disabled={busy || !review}>
              Télécharger le classeur
            </Button>
          </div>

          <Card
            title="Constats"
            subtitle={
              review
                ? `Jeu de règles ${review.rule_version} — taux ${(Number(review.taux) * 100).toFixed(2)} %. Le moteur chiffre un risque, il ne conclut pas à un redressement.`
                : undefined
            }
          >
            {!review ? (
              <Empty>
                Aucune revue exécutée pour l&apos;exercice {year}.
              </Empty>
            ) : review.findings.length === 0 ? (
              <Empty>Aucun constat : la comptabilité et les déclarations concordent.</Empty>
            ) : (
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
                  {review.findings.map((finding) => (
                    <FindingRow
                      key={finding.finding_id}
                      finding={finding}
                      identity={identity}
                      onResolved={(next) => {
                        setReview(next);
                        onChanged();
                      }}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
