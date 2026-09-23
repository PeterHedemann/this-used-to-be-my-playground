"use client";

/* eslint-disable @next/next/no-img-element -- Private images use authenticated routes. */
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Result = { filename: string; byteSize: number; width: number; height: number; imageUrl: string };

export function ImageUpload() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [preview]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || busy) return;
    setError("");
    setResult(null);
    if (file.size > 10 * 1024 * 1024) {
      setError("Choose an image no larger than 10 MiB.");
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const response = await fetch("/api/transformations", { method: "POST", body: form });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Upload failed. Please try again.");
      setResult(data);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-6" aria-labelledby="upload-heading">
      <h2 id="upload-heading" className="text-xl font-semibold">Resize an image</h2>
      <p className="mt-2 text-sm text-zinc-600">Upload a PNG, JPEG, or WebP image, up to 10 MiB. Your resized image is saved automatically.</p>
      <form onSubmit={submit} className="mt-5 space-y-4" aria-busy={busy}>
        <label className="block text-sm font-medium" htmlFor="image">Choose an image</label>
        <input id="image" name="image" type="file" accept="image/png,image/jpeg,image/webp" required disabled={busy}
          className="block w-full text-sm file:mr-4 file:rounded file:border file:border-zinc-300 file:bg-zinc-50 file:px-3 file:py-2 disabled:opacity-50"
          onChange={(event) => {
            const selected = event.target.files?.[0] ?? null;
            setFile(selected);
            setPreview(selected ? URL.createObjectURL(selected) : "");
            setResult(null);
            setError("");
          }} />
        <button disabled={!file || busy} className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {busy ? "Processing…" : "Resize and save"}
        </button>
        <p role="status" className="text-sm text-zinc-600">{busy ? "Processing your image. This may take up to two minutes." : result ? "Image saved to your history." : ""}</p>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      </form>
      {file && preview && <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <figure><figcaption className="mb-2 text-sm font-medium">Original</figcaption>
          <img src={preview} alt="Selected image preview" className="max-h-96 w-full rounded bg-zinc-100 object-contain" />
        </figure>
        {result && <figure><figcaption className="mb-2 text-sm font-medium">Saved result</figcaption>
          <img src={result.imageUrl} alt={result.filename} width={result.width} height={result.height} className="max-h-96 w-full rounded bg-zinc-100 object-contain" />
          <p className="mt-2 break-all text-sm">{result.filename}</p>
          <p className="text-sm text-zinc-600">{result.width} × {result.height} · {(result.byteSize / 1024).toFixed(1)} KiB · PNG</p>
          <a href={`${result.imageUrl}?download=1`} className="mt-2 inline-block text-sm underline">Download PNG</a>
        </figure>}
      </div>}
    </section>
  );
}
