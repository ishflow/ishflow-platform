# R2 CORS Policy — Browser Direct-PUT Uploads

## Why this matters

Attachments use a presigned PUT URL so the browser uploads directly to Cloudflare R2, bypassing the Next.js server. R2 blocks cross-origin requests by default; without a CORS policy the browser preflight (`OPTIONS`) will fail and no file will upload.

## Buckets

| Environment | Bucket name |
|-------------|-------------|
| Production  | `<prod-bucket>` |
| Staging/dev | `<dev-bucket>` |

## Required CORS configuration

Apply this JSON policy to **each bucket** via the Cloudflare R2 dashboard → bucket → Settings → CORS.

```json
[
  {
    "AllowedOrigins": [
      "https://ishflow.com",
      "https://<your-app>.vercel.app",
      "http://localhost:3100"
    ],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["Content-Type", "Content-Length", "Cache-Control"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

## How to apply (Cloudflare dashboard)

1. Open **Cloudflare dashboard** → R2 → select bucket.
2. Go to **Settings** → **CORS policy**.
3. Paste the JSON above and click **Save**.
4. Repeat for the other bucket.

## Verification

After applying, confirm the preflight succeeds from a terminal or browser devtools:

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -X OPTIONS \
  -H "Origin: https://ishflow.com" \
  -H "Access-Control-Request-Method: PUT" \
  -H "Access-Control-Request-Headers: Content-Type" \
  "https://pub-<account>.r2.dev/<bucket>/<any-key>"
# Expected: 200 or 204
```

Replace `<account>` with your Cloudflare account hash and `<bucket>` with the bucket name.

You can also open the browser devtools Network tab during an upload and confirm the `OPTIONS` preflight response includes:

```
Access-Control-Allow-Origin: https://ishflow.com
Access-Control-Allow-Methods: PUT, GET, HEAD
```

## Symptoms of missing / wrong CORS

| Symptom | Likely cause |
|---------|--------------|
| Upload button spins forever, no progress | Preflight blocked — CORS not applied |
| `NetworkError` or `CORS policy` error in browser console | Origin not in `AllowedOrigins` |
| File appears to upload but attachment never shows in UI | ETag not in `ExposeHeaders`; upload client can't confirm success |
| Works on `localhost:3100` but not on prod | Prod origin missing from `AllowedOrigins` |
| Works on `ishflow.com` but not on Vercel preview | Preview URL differs from `<your-app>.vercel.app`; add the preview URL or use a wildcard for `*.vercel.app` (dev only) |

## Adding new allowed origins

If a new domain needs access (e.g. a new Vercel preview alias, a white-label domain):

1. Edit the CORS JSON and add the origin to `AllowedOrigins`.
2. Save in the Cloudflare dashboard.
3. No deployment or code change required — CORS is bucket-level configuration.
4. Update this runbook to document the addition.

## Notes

- The `MaxAgeSeconds: 3600` value caches the preflight response for 1 hour. Browsers won't re-check until the cache expires, so CORS config changes may take up to an hour to take effect in the browser.
- `PUT` is required for presigned upload. `GET` and `HEAD` are included for future signed download URLs.
- Never add `*` to `AllowedOrigins` in production — it allows any website to upload to the bucket on behalf of users.
