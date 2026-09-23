/* eslint-disable @next/next/no-img-element -- Private images use authenticated routes. */
import { getCurrentUser } from "@/lib/users";
import { SignOutAction } from "@/lib/actions/signout";
import { getImageHistory } from "@/lib/saved-images";
import { ImageUpload } from "@/app/components/image-upload";
import { DeleteImage } from "@/app/components/delete-image";
import Link from "next/link";

export default async function Home({ searchParams }: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const user = await getCurrentUser();
  const query = await searchParams;
  const pageNumber = typeof query.page === "string" ? Number(query.page) : 1;
  const page = Number.isSafeInteger(pageNumber) && pageNumber > 0 && pageNumber <= 100_000 ? pageNumber : 1;
  const history = user ? await getImageHistory(user.id, page) : null;

  return <main className="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-950 sm:px-6">
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-3xl font-semibold">Image resizer</h1>
          <p className="mt-2 text-sm text-zinc-600">Resize your images and keep your results in one place.</p>
        </div>
        {user && <div className="flex items-center gap-4 text-sm">
          <span>{user.name}</span>
          <form action={SignOutAction}><button className="underline">Sign out</button></form>
        </div>}
      </header>
      {!user ? <section className="rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="text-xl font-semibold">Your own image history</h2>
        <p className="mt-2 text-zinc-600">Sign in to upload images and access your saved results.</p>
        <div className="mt-5 flex gap-4">
          <Link href="/signin" className="rounded bg-zinc-900 px-4 py-2 text-sm text-white">Sign in</Link>
          <Link href="/signup" className="rounded border border-zinc-300 px-4 py-2 text-sm">Create account</Link>
        </div>
      </section> : <>
        <ImageUpload />
        <section aria-labelledby="history-heading">
          <h2 id="history-heading" className="text-xl font-semibold">Saved images</h2>
          <p className="mt-1 text-sm text-zinc-600">Only you can view and download these images.</p>
          {!history?.images.length ? <p className="mt-5 rounded-lg border border-zinc-200 bg-white p-6 text-zinc-600">
            {page === 1 ? "No saved images yet. Upload your first image above." : "No images on this page."}
          </p> : <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {history.images.map((image) => <article key={image.id} className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
              <a href={`/api/images/${image.id}`} target="_blank" rel="noreferrer" aria-label={`View ${image.filename}`}>
                <img src={`/api/images/${image.id}`} alt={image.filename} width={image.width} height={image.height} loading="lazy" className="h-auto w-full bg-zinc-100 object-contain" />
              </a>
              <div className="space-y-2 p-4">
                <h3 className="break-all text-sm font-medium">{image.filename}</h3>
                <p className="text-xs text-zinc-600">{image.width} × {image.height} · {(image.byteSize / 1024).toFixed(1)} KiB · PNG</p>
                <time dateTime={image.createdAt.toISOString()} className="block text-xs text-zinc-600">{image.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC</time>
                <div className="flex justify-between gap-3">
                  <a href={`/api/images/${image.id}?download=1`} className="text-sm underline">Download</a>
                  <DeleteImage id={image.id} />
                </div>
              </div>
            </article>)}
          </div>}
          <nav aria-label="Image history pages" className="mt-5 flex items-center gap-5 text-sm">
            {page > 1 && <Link href={`/?page=${page - 1}`} className="underline">Previous</Link>}
            <span>Page {page}</span>
            {history?.hasMore && <Link href={`/?page=${page + 1}`} className="underline">Next</Link>}
          </nav>
        </section>
      </>}
    </div>
  </main>;
}
