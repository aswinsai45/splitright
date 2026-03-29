import { useState } from "react";
import api from "../lib/api";

export default function NLPInput({ groupMembers, onParsed }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleParse() {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const { data } = await api.post("/nlp/parse-expense", { text });

      const payer = groupMembers.find(
        (m) =>
          m.profiles?.display_name?.toLowerCase() ===
          data.payer_name.toLowerCase(),
      );

      onParsed({
        paid_by: payer?.user_id || "",
        amount: data.amount,
        description: data.description,
        split_type: data.split_type,
        participant_count: data.participant_count,
        payer_name: data.payer_name,
      });

      setText("");
    } catch (err) {
      setError("Could not parse that. Try rephrasing or fill manually.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">✨</span>
        <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
          Natural language input
        </p>
      </div>
      <p className="text-xs text-indigo-600 dark:text-indigo-400">
        Try: "Rahul paid 800 for dinner split 4 ways"
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleParse()}
          placeholder="Describe the expense..."
          className="flex-1 px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={handleParse}
          disabled={loading || !text.trim()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50"
        >
          {loading ? "..." : "Parse"}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
