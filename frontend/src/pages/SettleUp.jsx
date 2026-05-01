import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../lib/api";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabase";
import { IconCheckCircle } from "../components/icons";

export default function SettleUp() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [balances, setBalances] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setCurrentUserId(data.session.user.id);
    });
    fetchBalances();
  }, [id]);

  async function fetchBalances() {
    try {
      const { data } = await api.get(`/balances/${id}`);
      setBalances(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSettle(txn) {
    setSettling(txn.from_id);
    try {
      await api.post(`/groups/${id}/settle`, {
        paid_to: txn.to_id,
        amount: txn.amount,
      });
      await fetchBalances();
    } catch (err) {
      console.error(err);
    } finally {
      setSettling(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      <Navbar />

      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(`/group/${id}`)}
            className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            ←
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Settle up
          </h1>
        </div>

        {!balances || balances.transactions.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-green-600 dark:text-green-400">
              <IconCheckCircle className="w-7 h-7" />
            </div>
            <p className="text-gray-900 dark:text-white font-semibold">
              All settled up!
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              No outstanding debts in this group.
            </p>
            <button
              onClick={() => navigate(`/group/${id}`)}
              className="mt-6 text-indigo-500 text-sm hover:underline"
            >
              Back to group
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {balances.transactions.length} payment
              {balances.transactions.length > 1 ? "s" : ""} needed to settle all
              debts
            </p>
            {balances.transactions.map((txn, i) => {
              const iAmDebtor = currentUserId && txn.from_id === currentUserId;
              const iAmCreditor = currentUserId && txn.to_id === currentUserId;
              const involvesGuest =
                (typeof txn.from_id === "string" &&
                  txn.from_id.startsWith("guest:")) ||
                (typeof txn.to_id === "string" &&
                  txn.to_id.startsWith("guest:"));

              return (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-sm font-semibold ${
                          iAmDebtor
                            ? "text-red-500"
                            : "text-gray-900 dark:text-white"
                        }`}
                      >
                        {txn.from}
                      </span>
                      <span className="text-gray-400 text-sm">pays</span>
                      <span
                        className={`text-sm font-semibold ${
                          iAmCreditor
                            ? "text-green-500"
                            : "text-gray-900 dark:text-white"
                        }`}
                      >
                        {txn.to}
                      </span>
                    </div>
                    <span className="text-lg font-bold text-red-500">
                      ₹{txn.amount}
                    </span>
                  </div>

                  {involvesGuest ? (
                    <div className="w-full py-2 text-center text-sm text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-xl">
                      Assign guests to members to settle this
                    </div>
                  ) : iAmDebtor ? (
                    <button
                      onClick={() => handleSettle(txn)}
                      disabled={settling === txn.from_id}
                      className="w-full py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50"
                    >
                      {settling === txn.from_id
                        ? "Marking..."
                        : "Mark as settled ✓"}
                    </button>
                  ) : iAmCreditor ? (
                    <div className="w-full py-2 text-center text-sm text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-xl">
                      ⏳ Waiting for {txn.from} to mark as settled
                    </div>
                  ) : (
                    <div className="w-full py-2 text-center text-sm text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-xl">
                      Not involved in this transaction
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
