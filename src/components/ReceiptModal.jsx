import { useState, useEffect } from "react";
import { Printer, X, Maximize2, Minimize2, Receipt as ReceiptIcon, UtensilsCrossed, ShoppingBag } from "lucide-react";

export default function ReceiptModal({ receipt, brand, theme, onClose }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fermeture par touche Échap
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!receipt) return null;

  const totalQty = (receipt.items || []).reduce((acc, item) => acc + (item.qty || 0), 0);
  const formattedDate = receipt.closedAt
    ? new Date(receipt.closedAt).toLocaleString("fr-FR", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : new Date().toLocaleString("fr-FR");

  const receiptRef =
    receipt.sessionNumber
      ? `REC-${String(receipt.sessionNumber).padStart(4, "0")}`
      : `REC-${Date.now().toString().slice(-6)}`;

  return (
    <div
      className="receipt-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.72)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: isFullscreen ? "stretch" : "center",
        justifyContent: "center",
        zIndex: 100,
        padding: isFullscreen ? "0" : "16px",
        overflowY: "auto",
      }}
    >
      <div
        className="receipt-printable-card"
        style={{
          background: "#ffffff",
          color: "#0f172a",
          borderRadius: isFullscreen ? "0" : "20px",
          width: "100%",
          maxWidth: isFullscreen ? "100%" : "680px",
          minHeight: isFullscreen ? "100vh" : "auto",
          boxShadow: isFullscreen ? "none" : "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          margin: isFullscreen ? "0" : "auto",
          transition: "max-width 0.2s ease, border-radius 0.2s ease",
        }}
      >
        {/* BARRE D'ACTIONS SUPÉRIEURE (Écran uniquement) */}
        <div
          className="no-print"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            borderBottom: "1px solid #f1f5f9",
            background: "#f8fafc",
            borderTopLeftRadius: isFullscreen ? "0" : "20px",
            borderTopRightRadius: isFullscreen ? "0" : "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "#e2e8f0",
                color: "#334155",
                fontSize: "0.78rem",
                fontWeight: "600",
                padding: "4px 10px",
                borderRadius: "999px",
                letterSpacing: "0.03em",
                textTransform: "uppercase",
              }}
            >
              <ReceiptIcon size={14} /> Reçu de caisse
            </span>
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
              {receipt.tableNumber ? `Table ${receipt.tableNumber}` : "Vente"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "Réduire la fenêtre" : "Occuper toute la page (Plein écran)"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: isFullscreen ? "#e0e7ff" : "#ffffff",
                color: isFullscreen ? "#3730a3" : "#475569",
                border: "1px solid #cbd5e1",
                borderRadius: "10px",
                padding: "7px 12px",
                fontSize: "0.8rem",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              <span className="hidden sm:inline">
                {isFullscreen ? "Format carte" : "Plein écran"}
              </span>
            </button>

            <button
              onClick={onClose}
              title="Fermer (Échap)"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#ffffff",
                color: "#64748b",
                border: "1px solid #cbd5e1",
                borderRadius: "10px",
                width: "34px",
                height: "34px",
                cursor: "pointer",
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* CORPS DU REÇU (Imprimable et responsive) */}
        <div
          className="receipt-body"
          style={{
            padding: isFullscreen ? "36px 48px" : "28px 32px",
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* EN-TÊTE ÉTABLISSEMENT */}
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            {brand?.logo_url && (
              <img
                src={brand.logo_url}
                alt={brand.name || "Logo"}
                style={{
                  maxHeight: "56px",
                  maxWidth: "180px",
                  objectFit: "contain",
                  margin: "0 auto 10px auto",
                  display: "block",
                }}
              />
            )}
            <h2
              style={{
                margin: "0 0 6px 0",
                fontSize: isFullscreen ? "1.75rem" : "1.45rem",
                fontWeight: "700",
                fontFamily: "Georgia, serif",
                color: "#0f172a",
                letterSpacing: "-0.01em",
              }}
            >
              {brand?.name || "Restaurant"}
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: "0.85rem",
                color: "#64748b",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontWeight: "500",
              }}
            >
              Ticket d'encaissement & Note de frais
            </p>
          </div>

          {/* DÉTAILS DE LA SESSION / COMMANDE */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "14px",
              padding: "14px 18px",
              marginBottom: "24px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: "12px",
              fontSize: "0.85rem",
            }}
          >
            <div>
              <span style={{ color: "#64748b", display: "block", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Emplacement
              </span>
              <strong style={{ color: "#0f172a", fontSize: "0.95rem" }}>
                {receipt.tableNumber ? `Table ${receipt.tableNumber}` : "Comptoir / Emporter"}
              </strong>
            </div>

            <div>
              <span style={{ color: "#64748b", display: "block", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Référence
              </span>
              <strong style={{ color: "#0f172a", fontFamily: "monospace", fontSize: "0.95rem" }}>
                {receiptRef}
              </strong>
            </div>

            <div>
              <span style={{ color: "#64748b", display: "block", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Date & Heure
              </span>
              <strong style={{ color: "#0f172a", fontSize: "0.88rem" }}>
                {formattedDate}
              </strong>
            </div>

            {receipt.sessionNumber && (
              <div>
                <span style={{ color: "#64748b", display: "block", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Session
                </span>
                <strong style={{ color: "#0f172a", fontSize: "0.95rem" }}>
                  #{receipt.sessionNumber}
                </strong>
              </div>
            )}
          </div>

          {/* TABLEAU DES ARTICLES */}
          <div style={{ flex: 1, marginBottom: "24px", overflowX: "auto" }}>
            <table
              className="receipt-table"
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.95rem",
                minWidth: "320px",
              }}
            >
              <thead>
                <tr style={{ borderBottom: "2px solid #0f172a", textAlign: "left" }}>
                  <th style={{ padding: "10px 8px", fontWeight: "700", color: "#0f172a" }}>Désignation</th>
                  <th style={{ padding: "10px 6px", textAlign: "center", fontWeight: "700", color: "#0f172a", width: "55px" }}>Qté</th>
                  <th style={{ padding: "10px 8px", textAlign: "right", fontWeight: "700", color: "#0f172a", width: "100px" }}>P.U</th>
                  <th style={{ padding: "10px 8px", textAlign: "right", fontWeight: "700", color: "#0f172a", width: "115px" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {(receipt.items || []).map((item, index) => {
                  const lineTotal = (item.price || 0) * (item.qty || 1);
                  return (
                    <tr
                      key={index}
                      style={{
                        borderBottom: "1px dashed #cbd5e1",
                      }}
                    >
                      <td style={{ padding: "12px 8px", color: "#1e293b", fontWeight: "500" }}>
                        {item.name}
                      </td>
                      <td style={{ padding: "12px 8px", textAlign: "center", color: "#334155", fontWeight: "600" }}>
                        {item.qty}
                      </td>
                      <td style={{ padding: "12px 8px", textAlign: "right", color: "#64748b", fontFamily: "monospace" }}>
                        {(item.price || 0).toLocaleString("fr-FR")}
                      </td>
                      <td style={{ padding: "12px 8px", textAlign: "right", color: "#0f172a", fontWeight: "700", fontFamily: "monospace" }}>
                        {lineTotal.toLocaleString("fr-FR")} F
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* TOTAUX & RÉCAPITULATIF */}
          <div
            style={{
              borderTop: "2px solid #0f172a",
              paddingTop: "16px",
              marginBottom: "28px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                color: "#64748b",
                fontSize: "0.9rem",
                marginBottom: "8px",
              }}
            >
              <span>Nombre total d'articles</span>
              <strong style={{ color: "#334155" }}>{totalQty} article{totalQty > 1 ? "s" : ""}</strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                padding: "12px 16px",
                background: "#f8fafc",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                marginTop: "10px",
              }}
            >
              <span
                style={{
                  fontSize: isFullscreen ? "1.2rem" : "1.05rem",
                  fontWeight: "800",
                  color: "#0f172a",
                  letterSpacing: "0.02em",
                }}
              >
                TOTAL ENCAISSÉ
              </span>
              <span
                style={{
                  fontSize: isFullscreen ? "1.75rem" : "1.45rem",
                  fontWeight: "900",
                  color: brand?.primary_color || "#0f172a",
                  fontFamily: "monospace",
                }}
              >
                {(receipt.total || 0).toLocaleString("fr-FR")} FCFA
              </span>
            </div>
          </div>

          {/* MESSAGE DE PIED DE PAGE */}
          <div style={{ textAlign: "center", marginTop: "auto", paddingTop: "12px", borderTop: "1px dashed #e2e8f0" }}>
            <p style={{ margin: "0 0 4px 0", fontSize: "0.85rem", fontWeight: "600", color: "#334155" }}>
              Merci de votre visite et à très bientôt !
            </p>
            <p style={{ margin: 0, fontSize: "0.72rem", color: "#94a3b8" }}>
              Ticket de caisse édité par {brand?.name || "Jésus-Net Restaurant"}
            </p>
          </div>
        </div>

        {/* BARRE D'ACTIONS INFÉRIEURE (Écran uniquement) */}
        <div
          className="no-print"
          style={{
            display: "flex",
            gap: "12px",
            padding: "18px 28px",
            borderTop: "1px solid #f1f5f9",
            background: "#f8fafc",
            borderBottomLeftRadius: isFullscreen ? "0" : "20px",
            borderBottomRightRadius: isFullscreen ? "0" : "20px",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => window.print()}
            style={{
              flex: "2 1 200px",
              background: brand?.primary_color || theme?.primary || "#0f172a",
              color: "#ffffff",
              border: "none",
              borderRadius: "12px",
              padding: "14px 20px",
              fontWeight: "700",
              fontSize: "0.95rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.12)",
              transition: "transform 0.1s ease, filter 0.15s ease",
            }}
          >
            <Printer size={18} /> Imprimer le reçu
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            style={{
              flex: "1 1 140px",
              background: "#ffffff",
              color: "#334155",
              border: "1px solid #cbd5e1",
              borderRadius: "12px",
              padding: "14px 16px",
              fontWeight: "600",
              fontSize: "0.9rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "7px",
            }}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            {isFullscreen ? "Format normal" : "Plein écran"}
          </button>

          <button
            onClick={onClose}
            style={{
              flex: "1 1 110px",
              background: "transparent",
              color: "#64748b",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "14px 16px",
              fontWeight: "600",
              fontSize: "0.9rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            <X size={16} /> Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
