/** Notes annexes — rédaction, revue, approbation.
 *
 * L'écran matérialise la séparation maker/checker : le bouton d'approbation
 * disparaît pour l'auteur du commentaire. Ce n'est pas une contrainte de
 * l'interface, c'est la règle du backend rendue visible.
 */
import { useState } from "react";

import { type Note, type NoteComment, type NotesSummary, api } from "@/lib/api";
import type { Identity } from "@/lib/session";
import {
  Amount,
  Badge,
  Banner,
  Button,
  Card,
  CommentChip,
  Empty,
  Stat,
} from "@/components/ui";

function NoteBlock({
  note,
  identity,
  onChanged,
}: {
  note: Note;
  identity: Identity;
  onChanged: (note: Note) => void;
}) {
  const [text, setText] = useState(note.comment?.text ?? "");
  const [reason, setReason] = useState("");
  const [history, setHistory] = useState<NoteComment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const status = note.comment?.status;
  const isAuthor = note.comment?.author_id === identity.id;

  async function run(action: () => Promise<Note>) {
    setBusy(true);
    setError(null);
    try {
      const updated = await action();
      setText(updated.comment?.text ?? "");
      onChanged(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const detail = note.lines.filter((line) => line.amount_n !== "0" || line.amount_n1 !== "0");

  return (
    <Card
      title={`Note ${note.note_id} — ${note.title}`}
      right={
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {note.is_stale && <Badge tone="warn">Chiffres modifiés</Badge>}
          {note.is_printable && <Badge tone="good">Imprimable</Badge>}
          {status && <CommentChip status={status} />}
        </div>
      }
    >
      {detail.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Rubrique</th>
              <th style={{ textAlign: "right", width: 150 }}>Exercice N</th>
              <th style={{ textAlign: "right", width: 150 }}>Exercice N-1</th>
              <th style={{ textAlign: "right", width: 150 }}>Variation</th>
            </tr>
          </thead>
          <tbody>
            {detail.map((line, index) => (
              <tr key={index}>
                <td style={{ fontSize: 12.5, fontWeight: line.role !== "DETAIL" ? 600 : 400 }}>
                  {line.label}
                </td>
                <td>
                  <Amount value={line.amount_n} bold={line.role !== "DETAIL"} />
                </td>
                <td>
                  <Amount value={line.amount_n1} />
                </td>
                <td>
                  <Amount value={line.variation} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <Empty>Aucun montant sur cette note pour cet exercice.</Empty>
      )}

      <div style={{ padding: "13px 16px", borderTop: "1px solid var(--line)", display: "grid", gap: 9 }}>
        {note.is_stale && (
          <Banner tone="warn">
            Ce commentaire a été approuvé au regard de montants différents de ceux affichés
            ci-dessus. Il reste consultable, mais il doit être revu avant impression.
          </Banner>
        )}

        {note.comment?.basis && note.comment.basis.length > 0 && (
          <div style={{ fontSize: 11.5, color: "var(--txt3)" }}>
            Fondé sur : {note.comment.basis.join(" · ")}
          </div>
        )}

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          disabled={status === "PENDING_REVIEW"}
          style={{
            border: "1px solid var(--line-strong)",
            borderRadius: "var(--r-sm)",
            padding: "9px 11px",
            fontSize: 12.5,
            lineHeight: 1.65,
            resize: "vertical",
            background: status === "PENDING_REVIEW" ? "var(--panel2)" : "var(--panel)",
          }}
        />

        {status === "REJECTED" && note.comment?.review_reason && (
          <Banner tone="bad">Rejeté : {note.comment.review_reason}</Banner>
        )}

        {status === "PENDING_REVIEW" && (
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motif — obligatoire en cas de rejet"
            style={{
              border: "1px solid var(--line-strong)",
              borderRadius: "var(--r-sm)",
              padding: "7px 10px",
              fontSize: 12.5,
            }}
          />
        )}

        {error && <div style={{ color: "var(--red)", fontSize: 12 }}>{error}</div>}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <Button
            onClick={() => run(() => api.editComment(note.note_pk, text, identity.id))}
            disabled={busy || !text.trim() || status === "PENDING_REVIEW"}
          >
            Enregistrer
          </Button>
          <Button
            variant="primary"
            onClick={() => run(() => api.submitComment(note.note_pk, identity.id))}
            disabled={busy || status === "PENDING_REVIEW" || status === "APPROVED_PRINTABLE"}
          >
            Soumettre à revue
          </Button>

          {status === "PENDING_REVIEW" &&
            (isAuthor ? (
              <span style={{ fontSize: 12, color: "var(--txt3)" }}>
                Vous avez rédigé ce commentaire : sa revue revient à quelqu&apos;un d&apos;autre.
              </span>
            ) : (
              <>
                <Button
                  onClick={() =>
                    run(() => api.reviewComment(note.note_pk, true, identity.id, reason))
                  }
                  disabled={busy}
                >
                  Approuver
                </Button>
                <Button
                  variant="danger"
                  onClick={() =>
                    run(() => api.reviewComment(note.note_pk, false, identity.id, reason))
                  }
                  disabled={busy || !reason.trim()}
                >
                  Rejeter
                </Button>
              </>
            ))}

          <button
            onClick={async () =>
              setHistory(history ? null : await api.commentHistory(note.note_pk))
            }
            style={{ fontSize: 12, color: "var(--accent)", marginLeft: "auto" }}
          >
            {history ? "Masquer l'historique" : "Historique"}
          </button>
        </div>

        {history && (
          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 9, display: "grid", gap: 7 }}>
            {history.map((entry) => (
              <div key={entry.comment_id} style={{ fontSize: 12 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontFamily: "var(--mono)", color: "var(--txt3)" }}>
                    v{entry.version_no}
                  </span>
                  <CommentChip status={entry.status} />
                </div>
                <div style={{ color: "var(--txt2)", marginTop: 2 }}>{entry.text}</div>
                {entry.review_reason && (
                  <div style={{ color: "var(--txt3)", fontStyle: "italic" }}>
                    {entry.review_reason}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

export default function Notes({
  summary,
  identity,
  onSummary,
  onGenerate,
}: {
  summary: NotesSummary | null;
  identity: Identity;
  onSummary: (summary: NotesSummary) => void;
  onGenerate: () => void;
}) {
  if (!summary || summary.total === 0) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <Banner tone="info">
          Les notes annexes se construisent sur une balance validée. Les chiffres sont
          calculés ; les commentaires sont rédigés, relus et approuvés.
        </Banner>
        <div>
          <Button variant="primary" onClick={onGenerate}>
            Générer les notes
          </Button>
        </div>
      </div>
    );
  }

  const replace = (note: Note) =>
    onSummary({
      ...summary,
      notes: summary.notes.map((item) => (item.note_pk === note.note_pk ? note : item)),
      printable: summary.notes.filter((item) =>
        item.note_pk === note.note_pk ? note.is_printable : item.is_printable,
      ).length,
    });

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <Stat label="Notes" value={summary.total} />
        <Stat label="Approuvées" value={summary.printable} tone="good" />
        <Stat
          label="En attente de revue"
          value={summary.awaiting_review}
          tone={summary.awaiting_review ? "warn" : "neutral"}
        />
        <Stat
          label="Chiffres modifiés"
          value={summary.stale}
          tone={summary.stale ? "warn" : "neutral"}
        />
      </div>

      <div>
        <Button onClick={onGenerate}>Recalculer les chiffres</Button>
        <span style={{ fontSize: 12, color: "var(--txt3)", marginLeft: 10 }}>
          Les commentaires déjà rédigés ne sont pas écrasés.
        </span>
      </div>

      {summary.notes.map((note) => (
        <NoteBlock key={note.note_pk} note={note} identity={identity} onChanged={replace} />
      ))}
    </div>
  );
}
