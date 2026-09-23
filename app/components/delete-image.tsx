"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteImage({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <div>
    <button type="button" disabled={busy} className="text-sm text-red-700 underline disabled:opacity-50" onClick={async () => {
      if (!window.confirm("Permanently delete this saved image?")) return;
      setBusy(true);
      setError("");
      try {
        const response = await fetch(`/api/images/${id}`, { method: "DELETE" });
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error ?? "Could not delete image.");
        }
        router.refresh();
      } catch (error) {
        setError(error instanceof Error ? error.message : "Could not delete image.");
      } finally { setBusy(false); }
    }}>{busy ? "Deleting…" : "Delete"}</button>
    {error && <p role="alert" className="mt-1 text-sm text-red-700">{error}</p>}
  </div>;
}
