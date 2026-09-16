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
        background: "radial-gradient(ellipse at 50% 45%, #0D1A2E 0%, #070C14 60%)",
        textAlign: "center",
        padding: 24,
      }}
    >
      <h1 style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1.6, maxWidth: 940 }}>
        L&apos;intelligence qui comprend
        <br />
        <span
          style={{
            background: "linear-gradient(100deg, var(--cyan), var(--blue) 45%, var(--violet))",
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
          background: "linear-gradient(135deg, var(--cyan), var(--indigo))",
          color: "#05101A",
          boxShadow: "0 8px 30px rgba(34,211,238,.32)",
        }}
      >
        Entrer dans Review.AI →
      </button>
    </div>
  );
}
