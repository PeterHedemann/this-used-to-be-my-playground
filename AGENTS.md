<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->


## Project overview

This is an image resizer built with Next.js App Router, React, strict TypeScript,
Tailwind CSS 4, Better Auth, and Prisma ORM 7 with MySQL. Users sign in, submit an
image to an external resize service, and manage private saved PNG results.
See `README.md` for setup, deployment limits, and baseline migration instructions.

## Setup and commands

Use npm. Node.js 24 is recommended because the tests import TypeScript directly
using Node's built-in support.

- `npm install` installs dependencies.
- `docker compose up -d` starts local MySQL 8; `init-db/` initializes the databases.
- Configure local `.env` from `.env.example`. Required settings are `DATABASE_URL`,
  `SHADOW_DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and
  `IMAGE_API_SECRET`. Keep secrets server-side and out of version control.
- `npm run db:generate` generates the Prisma client; run after installation and
  schema changes, before building a fresh checkout.
- `npm run db:migrate` applies existing migrations; it does not create migrations.
- `npm run dev` starts development; `npm run build` builds production;
  `npm start` serves the production build.
- `npm test` runs `tests/*.test.mjs` with Node's test runner.
- `npm run lint` runs ESLint.

## Code map and conventions

- `app/` contains App Router pages, layouts, and route handlers. Interactive UI
  lives in client components; keep database access and secrets on the server.
- `app/components/` contains image upload and deletion controls.
- `lib/auth.ts`, `lib/users.ts`, and `lib/actions/` handle authentication, current
  users, and authentication server actions. Reuse these helpers.
- `app/api/transformations/route.ts` validates uploads, calls the resize service,
  and saves the result. `app/api/images/[id]/route.ts` serves and deletes images.
- `lib/image-processing.ts` owns stream limits, image validation with Sharp, and
  filename sanitization. `lib/image-http.ts` owns image errors, private cache
  headers, and same-origin checks.
- `lib/saved-images.ts` retrieves paginated history metadata without image bytes.
- `lib/prisma.ts` provides the shared Prisma client with the MariaDB driver adapter
  for MySQL. Reuse it instead of creating clients per request.
- Use the `@/*` alias for imports from the repository root, following nearby code.
- `generated/prisma/` is ignored generated output; regenerate rather than edit it.

## Database changes

The schema is `prisma/schema.prisma`; migrations live in `prisma/migrations/`.
Prisma CLI commands must use `--config prisma7.config.ts` (the npm scripts already
supply this). Connection URLs are configured there, outside the schema.
Create migrations for schema changes and regenerate the client. Preserve existing
data; follow the README's baseline procedure for databases that already contain
authentication tables, and never mark the baseline applied on an empty database.

## Image handling invariants

- Scope history, image reads, and deletes to the authenticated user's ID.
- Preserve same-origin checks on uploads and deletes, and `private, no-store`
  caching on image API responses.
- Decode and validate image contents rather than trusting MIME types. Accept only
  non-animated PNG, JPEG, and WebP uploads within the 40-megapixel limit.
- Bound streamed uploads and upstream responses to 10 MiB per image, with 64 KiB
  extra allowance for multipart overhead. Preserve the upstream timeout.
- Send `IMAGE_API_SECRET` only from the server. Validate upstream PNG bytes,
  sanitize download filenames, and record actual output dimensions.
- Save result metadata and bytes atomically after the external call. Original
  uploads are not stored. Keep history queries metadata-only (20 items per page).
- Image processing routes require the Node.js runtime for Sharp and database access.

## Validation

For application changes, run the relevant tests, `npm run lint`, and
`npm run build`. The current unit suite covers bounded streams, filename safety,
image validation, and output dimensions; it does not verify the full authenticated
upload flow. Live transformations additionally need MySQL and a working external
API secret. Report any checks that could not run and why. For documentation-only
changes, inspect the diff and run `git diff --check`.
