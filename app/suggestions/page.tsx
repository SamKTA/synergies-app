"use client";

import { useEffect, useState } from "react";
// Chemin RELATIF car ton projet n'a pas d'alias "@/"
// (app/suggestions/page.tsx -> ../../lib/supabase)
import { supabase } from "../../lib/supabase";

export default function SuggestionsPage() {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<null | { type: "ok" | "err"; text: string }>(null);

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user ?? null;
      setUserId(user?.id ?? null);

      // Essaie de récupérer prénom/nom depuis user_metadata si disponibles
      const first = (user?.user_metadata as any)?.first_name ?? "";
      const last = (user?.user_metadata as any)?.last_name ?? "";
      const nameFromMeta = [first, last].filter(Boolean).join(" ").trim();

      setDisplayName(nameFromMeta || user?.email || "Utilisateur");
    };
    loadUser();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!userId) {
      setMessage({ type: "err", text: "Tu dois être connecté pour proposer une fonctionnalité." });
      return;
    }
    if (!suggestion.trim()) {
      setMessage({ type: "err", text: "Merci de décrire ta proposition." });
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("feature_suggestions").insert([
      {
        user_id: userId,
        name: displayName,
        suggestion: suggestion.trim(),
      },
    ]);
    setLoading(false);

    if (error) {
      setMessage({ type: "err", text: "Erreur lors de l’envoi. Réessaie plus tard." });
      console.error(error);
    } else {
      setMessage({ type: "ok", text: "Merci pour ta proposition 💡" });
      setSuggestion("");
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: "32px auto", padding: "0 16px" }}>
      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 24, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, color: "#b91c1c", textAlign: "center" }}>
          💬 Proposer une nouvelle fonctionnalité
        </h1>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
              Utilisateur
            </label>
            <input
              type="text"
              value={displayName}
              readOnly
              style={{
                width: "100%",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                background: "#f3f4f6",
                padding: "10px 12px",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
              Ta proposition
            </label>
            <textarea
              placeholder="Décris ici la fonctionnalité que tu aimerais voir dans Synergies..."
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              rows={6}
              style={{
                width: "100%",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                padding: "10px 12px",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              background: "#b91c1c",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "10px 12px",
              fontWeight: 700,
              opacity: loading ? 0.8 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Envoi..." : "Envoyer ma proposition"}
          </button>

          {message && (
            <div
              style={{
                marginTop: 4,
                background: message.type === "ok" ? "#ecfdf5" : "#fef2f2",
                color: message.type === "ok" ? "#065f46" : "#991b1b",
                border: `1px solid ${message.type === "ok" ? "#a7f3d0" : "#fecaca"}`,
                borderRadius: 8,
                padding: "10px 12px",
              }}
            >
              {message.text}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
