# Image resizer

A Next.js app with BetterAuth sign-in and private, database-backed image history.
Users upload a PNG, JPEG, or WebP image. The server sends it to the external resize
service, then atomically saves the returned PNG and metadata in MySQL via Prisma.
Original uploads are not saved. The interface includes previews, paginated history,
downloads, and deletion.

## Local setup

1. Install dependencies with `npm install` (Node.js 24 is recommended; the tests use
   Node's built-in TypeScript support).
2. Start MySQL with `docker compose up -d`.
3. Configure `.env` with the following values. Keep this file out of version control:

   ```dotenv
   DATABASE_URL="mysql://myuser:mypass@127.0.0.1:3306/app_dev"
   SHADOW_DATABASE_URL="mysql://myuser:mypass@127.0.0.1:3306/app_shadow"
   BETTER_AUTH_SECRET="replace-with-a-long-random-secret"
   BETTER_AUTH_URL="http://localhost:3000"
   IMAGE_API_SECRET="your-resize-api-secret"
   ```

4. Run `npm run db:generate` and `npm run db:migrate`.
5. Run `npm run dev`, open http://localhost:3000, and create an account.

The resize endpoint is `https://peters-api-lab.vercel.app/api/resize`. The server sends
`IMAGE_API_SECRET` in the `secret` header and the upload in the multipart `image`
field. The secret never reaches the browser. The response must be a valid PNG; its actual dimensions are saved and displayed.
The live service currently returns 1072 × 1456 pixels. Its `Filename` header is sanitized and retained for downloads.

## Database migrations

The migrations include an initial baseline for the authentication tables and an
additive migration for `SavedImage` and `ImageContent`. For a new database, use
`npm run db:migrate` normally.

If an existing deployment already has the authentication tables but no migration
history, verify they match the baseline SQL, then mark only that baseline applied:

```bash
npx prisma migrate resolve --applied 20260923000000_baseline --config prisma7.config.ts
npm run db:migrate
```

Do not mark the baseline applied on an empty database. No database reset is needed.

## Limits and hosting

- Uploads and returned PNGs are limited to 10 MiB each. The multipart request gets
  an additional 64 KiB allowance. The server enforces limits while reading streams.
- Uploads must be non-animated PNG, JPEG, or WebP images under 40 megapixels;
  file contents are decoded and validated rather than trusting the MIME type.
- The resize request times out after 120 seconds. The route requests a 180-second
  execution allowance; the deployment platform must support that duration.
- Configure hosting/proxy body limits to allow the upload plus multipart overhead.
  Platform limits can be lower than the application's limit.
- MySQL server and driver packet limits must accommodate a 10 MiB image plus query
  overhead (16 MiB or greater). Database backups include all saved image bytes.
- History queries retrieve only metadata, 20 records per page. Images are loaded
  separately through authenticated routes with `private, no-store` caching.
- Upload and delete requests require a matching Origin header. Ensure the reverse
  proxy preserves the public request origin.
- There is no per-user storage quota or distributed rate limiter yet; add these
  before allowing unrestricted public sign-ups for a paid resize service.

## Checks

```bash
npm test
npm run lint
npm run build
```

The unit tests exercise bounded stream reads, filename sanitization, corrupt image
rejection, and actual output dimension handling. A live transformation additionally
requires a working external API secret.
