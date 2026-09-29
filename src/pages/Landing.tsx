import { useNavigate } from "react-router-dom";

/**
 * Page d'accueil — main humaine / main IA qui se rejoignent.
 * La maquette complète et animée est dans docs/mockup.html : la porter
 * composant par composant plutôt que de repartir de zéro.
 */
export default function Landing() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(ellipse at 50% 40%, #ffffff 0%, var(--bg2) 70%)",
        textAlign: "center",
        padding: 24,
      }}
    >
      <h1 style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1.6, maxWidth: 940 }}>
        L&apos;intelligence qui comprend
        <br />
        <span
          style={{
            background: "linear-gradient(100deg, #0f172a, var(--accent) 60%, #4338ca)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          vos chiffres, vos règles, vos risques.
        </span>
      </h1>

      <p
        style={{
          color: "var(--txt2)",
          maxWidth: 620,
          marginTop: 20,
          lineHeight: 1.75,
          fontSize: 15,
        }}
      >
        Déposez vos balances et grands livres en vrac. Review.AI identifie les entreprises,
        reconstitue les dossiers, produit les états financiers SYSCOHADA, la DSF et la revue fiscale
        — et explique chaque montant jusqu&apos;à l&apos;écriture d&apos;origine.
      </p>

      <button
        onClick={() => navigate("/intake")}
        style={{
          marginTop: 36,
          padding: "14px 34px",
          border: "none",
          borderRadius: 11,
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "var(--sans)",
          background: "var(--accent)",
          color: "#ffffff",
          boxShadow: "0 6px 20px rgba(29,78,216,.22)",
        }}
      >
        Entrer dans Review.AI →
      </button>
    </div>
  );
}
