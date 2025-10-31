"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/useUser"; // ton hook custom utilisateur
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function SuggestionsPage() {
  const { user } = useUser();
  const [suggestion, setSuggestion] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!suggestion.trim()) {
      toast.error("Merci de décrire ta proposition !");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("feature_suggestions").insert([
      {
        user_id: user?.id,
        name: `${user?.first_name} ${user?.last_name}`,
        suggestion,
      },
    ]);
    setLoading(false);

    if (error) toast.error("Erreur lors de l’envoi 😕");
    else {
      toast.success("Merci pour ta proposition 💡");
      setSuggestion("");
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10">
      <Card className="shadow-lg border p-6">
        <h1 className="text-2xl font-semibold mb-4 text-center text-red-600">
          💬 Proposer une nouvelle fonctionnalité
        </h1>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Utilisateur
              </label>
              <input
                type="text"
                value={`${user?.first_name} ${user?.last_name}`}
                readOnly
                className="w-full border-gray-300 rounded-md bg-gray-100 px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ta proposition
              </label>
              <Textarea
                placeholder="Décris ici la fonctionnalité que tu aimerais voir dans Synergies..."
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
                className="min-h-[120px]"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Envoi..." : "Envoyer ma proposition"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
