/** Ossature commune : navigation, identité de travail, état du stockage. */
import { type ReactNode, useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

import { api } from "@/lib/api";
import { USERS, useIdentity } from "@/lib/session";

export default function Shell({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useIdentity();
  const [health, setHealth] = useState<{ durable: boolean } | null>(null);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth(null));
  }, []);

  const link = ({ isActive }: { isActive: boolean }) => ({
    padding: "6px 12px",
    borderRadius: 7,
    fontSize: 13,
    fontWeight: 550,
    color: isActive ? "var(--accent)" : "var(--txt2)",
    background: isActive ? "var(--accent-soft)" : "transparent",
  });

  return (
    <div style={{ minHeight: "100%", background: "var(--bg)" }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "var(--panel)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: "10px 24px",
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          <NavLink to="/" style={{ fontWeight: 700, fontSize: 15, letterSpacing: -0.3 }}>
            Review<span style={{ color: "var(--accent)" }}>.AI</span>
          </NavLink>
          <nav style={{ display: "flex", gap: 3 }}>
            <NavLink to="/clients" style={link}>
              Portefeuille
            </NavLink>
            <NavLink to="/dossiers" style={link}>
              Balances
            </NavLink>
            <NavLink to="/intake" style={link}>
              Déposer
            </NavLink>
          </nav>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            {health && !health.durable && (
              <span
                title="Aucune base configurée : les imports et validations seront perdus au redémarrage."
                style={{ fontSize: 11.5, color: "var(--amber)", fontWeight: 600 }}
              >
                Stockage volatil
              </span>
            )}
            <select
              value={identity.id}
              onChange={(e) =>
                setIdentity(USERS.find((user) => user.id === e.target.value) ?? USERS[0])
              }
              title="Identité de travail — la revue exige deux personnes distinctes."
              style={{
                border: "1px solid var(--line-strong)",
                borderRadius: 7,
                padding: "5px 9px",
                fontSize: 12.5,
                background: "var(--panel)",
              }}
            >
              {USERS.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} · {user.role}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1180, margin: "0 auto", padding: "26px 24px 60px" }}>
        {children}
      </main>
    </div>
  );
}
