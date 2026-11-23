# Deploying to Railway

The app ships as one Docker image (`Dockerfile`): the Next.js server, headless
Chromium for rendering pages, and Ghostscript for the CMYK print PDF. Railway
builds it from GitHub on every push to `main`.

You need three things in one Railway project: the **app**, a **Postgres**
database and a **volume** (disk) for uploaded photos.

## First deploy (about 15 minutes)

1. Sign in at [railway.com](https://railway.com) with GitHub and pick the Hobby
   plan.
2. **New Project → Deploy from GitHub repo →** `akshayChourasia/TFCA`. Railway
   finds the `Dockerfile` and `railway.json` on its own. The first build
   takes about 5 minutes. It will fail health checks until the next steps are
   done; that is expected.
3. In the project, **+ Create → Database → PostgreSQL**.
4. Open the app service → **Variables**, and add:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (Railway fills it in from the database) |
   | `RENDER_SECRET` | any long random text, 40+ characters; never share it |
   | `ADMIN_PHONE` | your 10-digit mobile number |
   | `ADMIN_NAME` | your name |
   | `ADMIN_PASSWORD` | a temporary password; you will replace it on first login |

5. Right-click the app service (or **+ Create → Volume**) → **Attach volume**,
   mount path **`/data`**. Uploaded photos live here and survive redeploys.
6. App service → **Settings → Networking → Generate Domain**. This gives an
   address like `tfca-production.up.railway.app`. A custom domain such as
   `magazine.tfca.in` can be added in the same place later.
7. Redeploy if Railway didn't already. In **Deploy Logs** you should see:

   ```
   [startup] database migrations applied
   [startup] Created TFCA and its first admin. Log in with mobile …
   ```

8. Open the domain, log in with `ADMIN_PHONE` and `ADMIN_PASSWORD`, set your own
   password, then add the team on **Team & logins**.

After the first start you can delete `ADMIN_PASSWORD` from the variables. The
admin is only created when the database is empty.

## Every later release

Merging a pull request into `main` deploys it. Database migrations run on
startup before the new version takes traffic. If startup fails, the health
check (`/api/health`) fails and Railway keeps the previous version running.

## What runs where

| Piece | Where |
| --- | --- |
| App (Next.js, Chromium, Ghostscript) | Railway service built from `Dockerfile` |
| Database | Railway Postgres; Railway backs it up |
| Photos | Volume at `/data/uploads`, served at `/uploads/...` |
| PDFs | Made on demand, not stored |

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string |
| `RENDER_SECRET` | yes | Signs the internal page URLs Chromium opens for PDF export |
| `UPLOAD_DIR` | no | Set to `/data/uploads` in the image |
| `ADMIN_PHONE`, `ADMIN_NAME`, `ADMIN_PASSWORD` | first start | Creates the township and its first admin on an empty database. Without `ADMIN_PASSWORD` a temporary one is printed in the logs |
| `ORG_NAME`, `ORG_SHORT_NAME`, `ORG_SLUG` | no | Defaults to Treasure Fantasy Cricket Association / TFCA / tfca |
| `MIGRATE_ON_START` | no | `false` skips migrations on startup |
| `RENDER_ORIGIN` | no | Overrides the address Chromium uses to reach the app, which is `http://127.0.0.1:$PORT` by default |

Do not run `npm run db:seed` against production: it replaces the TFCA data
with sample content.

## Running the image anywhere else

```bash
docker build -t tfca .
docker run -p 3000:3000 -v tfca-data:/data \
  -e DATABASE_URL=postgres://… -e RENDER_SECRET=… \
  -e ADMIN_PHONE=98xxxxxxxx -e ADMIN_PASSWORD=… tfca
```

Any host that runs a Docker container with about 1 GB of memory and a
persistent disk works the same way.
