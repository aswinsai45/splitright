import { useRef, useState } from "react";
import api from "../lib/api";
import { IconCamera, IconRupeeBadge } from "./icons";

/**
 * Converts a File object to a base64 string (without the data URL prefix).
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // result is like "data:image/jpeg;base64,/9j/..."
      const base64 = reader.result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function BillScanInput({ onParsed }) {
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(null); // object URL for img preview
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null); // { amount, merchant_name, description, category }
  const [error, setError] = useState(null);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    setError(null);
    setPreview(URL.createObjectURL(file));
    scanBill(file);
  }

  async function scanBill(file) {
    setScanning(true);
    setError(null);
    try {
      const base64 = await fileToBase64(file);
      const mime_type = file.type || "image/jpeg";
      const { data } = await api.post("/nlp/parse-bill", {
        image_base64: base64,
        mime_type,
      });
      setResult(data);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(detail || "Could not read the bill. Try a clearer photo.");
    } finally {
      setScanning(false);
    }
  }

  function handleUse() {
    if (!result) return;
    onParsed({
      amount: result.amount,
      description: result.merchant_name || result.description || "",
      category: result.category || "other",
    });
    // clear state
    setPreview(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleClear() {
    setPreview(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-2xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-violet-600 dark:text-violet-300">
            <IconRupeeBadge className="w-5 h-5" />
          </span>
          <p className="text-sm font-medium text-violet-700 dark:text-violet-300">
            Scan bill / receipt
          </p>
        </div>
        {preview && (
          <button
            onClick={handleClear}
            className="text-xs text-gray-400 hover:text-red-400 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {!preview ? (
        /* Upload trigger */
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex flex-col items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed border-violet-300 dark:border-violet-700 text-violet-500 dark:text-violet-400 hover:border-violet-500 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-all"
        >
          <IconCamera className="w-7 h-7" />
          <span className="text-sm font-medium">
            Upload a photo of your bill
          </span>
          <span className="text-xs text-gray-400">JPG, PNG, HEIC, WEBP</span>
        </button>
      ) : (
        <div className="space-y-3">
          {/* Image preview */}
          <div className="relative w-full rounded-xl overflow-hidden border border-violet-200 dark:border-violet-800 max-h-48">
            <img
              src={preview}
              alt="Bill preview"
              className="w-full object-contain max-h-48"
            />
            {scanning && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <p className="text-white text-xs font-medium">Scanning bill…</p>
              </div>
            )}
          </div>

          {/* Result */}
          {result && !scanning && (
            <div className="bg-white dark:bg-gray-900 border border-violet-200 dark:border-violet-800 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Extracted
                </p>
                <span className="text-sm inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
                  <IconRupeeBadge className="w-4 h-4" />
                  <span className="ml-1 text-xs text-gray-400 capitalize">
                    {result.category}
                  </span>
                </span>
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {result.merchant_name || result.description || "Unknown"}
                  </p>
                  {result.description &&
                    result.description !== result.merchant_name && (
                      <p className="text-xs text-gray-400">
                        {result.description}
                      </p>
                    )}
                </div>
                <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                  ₹{parseFloat(result.amount).toFixed(2)}
                </p>
              </div>

              <button
                onClick={handleUse}
                className="w-full py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition-all"
              >
                Use this amount →
              </button>
            </div>
          )}

          {/* Error */}
          {error && !scanning && (
            <div className="flex items-start gap-2 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
              <span className="font-semibold">Error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Retry */}
          {!scanning && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-1.5 text-xs text-violet-500 hover:underline"
            >
              Try a different photo
            </button>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
