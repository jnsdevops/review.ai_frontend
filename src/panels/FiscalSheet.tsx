/** Fiche descriptive de l'environnement fiscal — CDC §1.1.
 *
 * Quatorze mentions, et deux d'entre elles commandent le calcul de la base
 * taxable. L'écran le dit à l'endroit où on les saisit, pas en bas de page :
 * une option cochée par habitude déplace des millions d'une base à l'autre.
 *
 * L'option sur les débits a **trois** états — oui, non, et pas encore établi.
 * Une case à cocher n'en aurait que deux, et « non coché » se lirait comme
 * « non ». Le moteur calcule sur cette réponse ; elle se déclare.
 */
import { useCallback, useEffect, useState } from "react";

import {
  ApiError,
  type FiscalEnvironment,
  type FiscalEnvironmentPayload,
  api,
} from "@/lib/api";
import type { Identity } from "@/lib/session";
import { Badge, Banner, Button, Card, Empty } from "@/components/ui";

const ACTIVITES: { code: string; label: string; effet: string }[] = [
  {
    code: "PROFESSIONNEL_IMMOBILIER",
    label: "Professionnel de l'immobilier",
    effet:
      "Rend taxables les locations de terrains non aménagés et de locaux nus, exonérées chez tout autre assujetti.",
  },
  {
    code: "PROMOTEUR_IMMOBILIER",
    label: "Promoteur immobilier",
    effet:
      "Les opérations immobilières sont exigibles à la mutation ou au transfert de propriété.",
  },
];

const CHAMPS: { key: keyof FiscalEnvironment; label: string; source: string }[] = [
  { key: "denomination", label: "Dénomination sociale", source: "RCCM ou ACF" },
  { key: "activites", label: "Description des activités", source: "RCCM" },
  { key: "juridiction", label: "Juridiction / pays", source: "Auditeur" },
  { key: "rccm", label: "Numéro RCCM", source: "RCCM" },
  { key: "niu", label: "Numéro Identifiant Unique", source: "ACF ou déclarations" },
  { key: "regime_imposition", label: "Régime d'imposition", source: "ACF ou déclarations" },
  {
    key: "centre_rattachement",
    label: "Centre de rattachement",
    source: "ACF ou déclarations",
  },
  { key: "particularites", label: "Particularités", source: "Auditeur" },
];

const VIDE: FiscalEnvironment = {
  denomination: null,
  activites: null,
  devise: "XAF",
  juridiction: null,
  option_debits: null,
  rccm: null,
  niu: null,
  regime_imposition: null,
  centre_rattachement: null,
  derogation_date: null,
  derogation_duree: null,
  derogation_regime_fiscal: null,
  derogation_regime_douanier: null,
  natures_operations: [],
  activites_taxables: [],
  activites_exonerees: [],
  particularites: null,
  is_declared: false,
};

const field: React.CSSProperties = {
  border: "1px solid var(--line-strong)",
  borderRadius: "var(--r-sm)",
  padding: "6px 9px",
  fontSize: 12.5,
  background: "var(--panel)",
  width: "100%",
};

export default function FiscalSheet({
  entityId,
  year,
  identity,
  defaults,
  onSaved,
}: {
  entityId: string;
  year?: number;
  identity: Identity;
  /** Ce que le référentiel du cabinet sait déjà de ce client.
   *
   *  Faire retaper une dénomination et un NIU déjà enregistrés, c'est
   *  fabriquer deux valeurs divergentes pour un même fait — et la fiche est
   *  précisément le document qui les affirme. */
  defaults?: Partial<Pick<FiscalEnvironment, "denomination" | "niu" | "rccm">>;
  onSaved?: () => void;
}) {
  const [sheet, setSheet] = useState<FiscalEnvironment>(VIDE);
  const [missing, setMissing] = useState<string[]>([]);
  const [exists, setExists] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [downloaded, setDownloaded] = useState<string | null>(null);

  /** Les valeurs du référentiel ne comblent que les champs restés vides :
   *  une correction saisie sur la fiche l'emporte toujours. */
  const seed = useCallback(
    (current: FiscalEnvironment): FiscalEnvironment => {
      const patch: Partial<FiscalEnvironment> = {};
      for (const key of ["denomination", "niu", "rccm"] as const) {
        const known = defaults?.[key];
        if (known && !current[key]) patch[key] = known;
      }
      return { ...current, ...patch };
    },
    [defaults],
  );

  const apply = useCallback(
    (payload: FiscalEnvironmentPayload) => {
      const { entity_id: _id, missing_mentions: manquantes, ...rest } = payload;
      setSheet(seed(rest));
      setMissing(manquantes);
      setExists(true);
    },
    [seed],
  );

  const load = useCallback(async () => {
    try {
      apply(await api.fiscalEnvironment(entityId));
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        // Pas encore de fiche : le formulaire s'ouvre sur ce que le
        // référentiel sait déjà, plutôt que vide.
        setExists(false);
        setSheet(seed(VIDE));
        return;
      }
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [entityId, apply, seed]);

  useEffect(() => {
    void load();
  }, [load]);

  function edit<K extends keyof FiscalEnvironment>(key: K, value: FiscalEnvironment[K]) {
    setSheet((previous) => ({ ...previous, [key]: value }));
    setSaved(false);
  }

  function toggleActivite(code: string) {
    const current = sheet.activites_taxables;
    edit(
      "activites_taxables",
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code],
    );
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      apply(
        await api.saveFiscalEnvironment(entityId, { ...sheet, updated_by: identity.id }),
      );
      setSaved(true);
      onSaved?.();
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
      const file = await api.exportFiscalEnvironment(entityId, year);
      const url = URL.createObjectURL(file.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.filename;
      anchor.click();
      URL.revokeObjectURL(url);
      setDownloaded(
        file.report
          ? `${file.report.filled} mentions sur ${file.report.mentions}` +
              (file.report.blindSpots
                ? ` · ${file.report.blindSpots} mention(s) manquante(s) qui changent le calcul`
                : "")
          : "",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {!exists && (
        <Banner tone="info">
          Aucune fiche n&apos;a encore été établie pour ce client. Deux de ses
          mentions commandent le calcul de la base taxable : tant qu&apos;elles
          sont vides, la revue travaille sur des hypothèses qu&apos;elle signale
          au lieu de les poser.
        </Banner>
      )}
      {error && <Banner tone="bad">{error}</Banner>}
      {saved && <Banner tone="good">Fiche enregistrée.</Banner>}
      {downloaded !== null && (
        <Banner tone="good">
          Fiche téléchargée{downloaded ? ` — ${downloaded}.` : "."}
        </Banner>
      )}

      <Card
        title="Ce qui commande le calcul"
        subtitle="Ces deux mentions ne sont pas administratives."
      >
        <div style={{ padding: 16, display: "grid", gap: 16 }}>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>
              Option « TVA d&apos;après les débits »
            </div>
            <div style={{ fontSize: 12.5, color: "var(--txt2)", marginBottom: 8 }}>
              Si la société a opté, ses prestations de services relèvent du
              régime de livraison : leur base cesse d&apos;être
              l&apos;encaissement pour redevenir le produit facturé.
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {[
                { value: null, label: "Non renseignée" },
                { value: true, label: "Oui — option exercée" },
                { value: false, label: "Non" },
              ].map((choix) => (
                <button
                  key={String(choix.value)}
                  onClick={() => edit("option_debits", choix.value)}
                  style={{
                    padding: "5px 11px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 550,
                    border: "1px solid",
                    borderColor:
                      sheet.option_debits === choix.value
                        ? "var(--accent)"
                        : "var(--line-strong)",
                    background:
                      sheet.option_debits === choix.value
                        ? "var(--accent-soft)"
                        : "var(--panel)",
                    color:
                      sheet.option_debits === choix.value ? "var(--accent)" : "var(--txt2)",
                  }}
                >
                  {choix.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
              Activités exercées
            </div>
            <div style={{ display: "grid", gap: 7 }}>
              {ACTIVITES.map((activite) => (
                <label
                  key={activite.code}
                  style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 12.5 }}
                >
                  <input
                    type="checkbox"
                    checked={sheet.activites_taxables.includes(activite.code)}
                    onChange={() => toggleActivite(activite.code)}
                    style={{ marginTop: 3 }}
                  />
                  <span>
                    <span style={{ fontWeight: 550 }}>{activite.label}</span>
                    <span style={{ color: "var(--txt2)" }}> — {activite.effet}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card
        title="Mentions obligatoires"
        subtitle="Chaque mention porte la source dont elle est tirée."
        right={
          missing.length ? (
            <Badge tone="warn">{missing.length} à compléter</Badge>
          ) : exists ? (
            <Badge tone="good">Complète</Badge>
          ) : undefined
        }
      >
        <div
          style={{
            padding: 16,
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 12,
          }}
        >
          {CHAMPS.map((champ) => (
            <label key={champ.key} style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 550 }}>
                {champ.label}
                <span style={{ color: "var(--txt3)", fontWeight: 400 }}> · {champ.source}</span>
              </span>
              <input
                value={(sheet[champ.key] as string | null) ?? ""}
                onChange={(e) => edit(champ.key, e.target.value as never)}
                style={field}
              />
            </label>
          ))}
        </div>
        <div
          style={{
            padding: "0 16px 16px",
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <label style={{ display: "flex", gap: 7, fontSize: 12.5, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={sheet.is_declared}
              onChange={(e) => edit("is_declared", e.target.checked)}
            />
            Fiche établie — le moteur cesse de poser ces questions
          </label>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <Button variant="primary" onClick={save} disabled={busy}>
              Enregistrer la fiche
            </Button>
            <Button onClick={download} disabled={busy || !exists}>
              Télécharger (Word)
            </Button>
          </div>
        </div>
      </Card>

      {missing.length > 0 && (
        <Card title="Mentions à compléter">
          <div style={{ padding: "12px 16px", display: "grid", gap: 5 }}>
            {missing.map((item) => (
              <div key={item} style={{ fontSize: 12.5, color: "var(--txt2)" }}>
                {item}
              </div>
            ))}
          </div>
        </Card>
      )}
      {exists && missing.length === 0 && (
        <Empty>Toutes les mentions obligatoires sont renseignées.</Empty>
      )}
    </div>
  );
}
