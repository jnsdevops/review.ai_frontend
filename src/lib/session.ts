/** Identité de travail — indispensable à la séparation maker/checker.
 *
 * Le backend refuse qu'un commentaire soit approuvé par son auteur. Sans une
 * identité côté interface, cette règle serait invisible et toutes les actions
 * sembleraient venir de la même personne. En attendant l'authentification, on
 * choisit son identité dans l'en-tête.
 */
import { useEffect, useState } from "react";

export interface Identity {
  id: string;
  name: string;
  role: string;
}

export const USERS: Identity[] = [
  { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", name: "Jean Noël", role: "Senior" },
  { id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", name: "Marie Atangana", role: "Réviseur" },
];

const KEY = "review-ai.identity";
const EVENT = "review-ai:identity";

function read(): Identity {
  try {
    const raw = localStorage.getItem(KEY);
    const found = USERS.find((user) => user.id === raw);
    if (found) return found;
  } catch {
    // stockage indisponible : on retombe sur le premier utilisateur
  }
  return USERS[0];
}

export function useIdentity(): [Identity, (next: Identity) => void] {
  const [identity, setIdentity] = useState<Identity>(read);

  useEffect(() => {
    const onChange = () => setIdentity(read());
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  const change = (next: Identity) => {
    try {
      localStorage.setItem(KEY, next.id);
    } catch {
      // sans stockage, le choix ne vaut que pour cet onglet
    }
    window.dispatchEvent(new Event(EVENT));
    setIdentity(next);
  };

  return [identity, change];
}
