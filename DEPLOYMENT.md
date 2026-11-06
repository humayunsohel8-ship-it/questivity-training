# Deployment guide

Total time: about 45 minutes. You'll need accounts on **GitHub**, **Supabase**, **Anthropic** and
**Vercel** (or Netlify), plus access to Questivity's DNS.

---

## 1. Put the code on GitHub

```bash
cd questivity-academy
git init -b main            # skip if the folder is already a git repo
git add . && git commit -m "Questivity Academy"
# create an empty PRIVATE repo on github.com (e.g. questivity/academy), then:
git remote add origin https://github.com/<org>/<repo>.git
git push -u origin main
```

After your first `npm install`, commit the generated `package-lock.json` so builds are reproducible.

## 2. Create the Supabase project

1. supabase.com → **New project**. Pick a region close to your users and a strong DB password.
2. **SQL Editor** → run each file in `supabase/migrations/` **in filename order**, then `supabase/seed.sql`.
   (Or with the Supabase CLI: `supabase link --project-ref <ref>` → `supabase db push`, then run the seed in the SQL Editor.)
3. **Project Settings → API**: copy the Project URL, the anon/publishable key and the service-role/secret key.

### Auth settings (Authentication → …)

| Setting | Value |
|---|---|
| URL Configuration → **Site URL** | `https://learn.questivity.com` (your final domain) |
| URL Configuration → **Redirect URLs** | `https://learn.questivity.com/auth/callback`, `http://localhost:3000/auth/callback` |
| Sign In / Providers → **Email** | Enabled |
| Emails → **Magic Link** template | Add the code so people can type it instead of clicking: `Your sign-in code: {{ .Token }}` (keep the link too) |
| Emails → **SMTP** | Configure your company SMTP (e.g. Microsoft 365/SendGrid) — Supabase's built-in sender is rate-limited and for testing only |

**Optional — Microsoft 365 single sign-on:** register an app in Microsoft Entra ID with redirect URI
`https://<project-ref>.supabase.co/auth/v1/callback`, enable the **Azure** provider in Supabase with its
client ID/secret and tenant URL, then set `NEXT_PUBLIC_ENABLE_MICROSOFT_SSO=true` in the app's environment.

## 3. Get a Claude API key

console.anthropic.com → **API keys** → create a key. Set a monthly spend limit under Billing.
Cost is driven by questions asked; the per-user hourly limit (`ASSISTANT_HOURLY_LIMIT`) caps abuse.

## 4. Deploy to Vercel

1. vercel.com → **Add New → Project** → import the GitHub repo (framework auto-detected: Next.js).
2. **Environment Variables** (Production + Preview):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | service-role / secret key (**never** prefix with NEXT_PUBLIC) |
| `ANTHROPIC_API_KEY` | your Claude key |
| `ANTHROPIC_MODEL` | `claude-sonnet-5-5` (or another current Claude model id) |
| `NEXT_PUBLIC_SITE_URL` | `https://learn.questivity.com` |
| `ALLOWED_EMAIL_DOMAINS` | `questivity.com` |
| `ASSISTANT_HOURLY_LIMIT` | `60` |
| `NEXT_PUBLIC_ENABLE_MICROSOFT_SSO` | `true` only if you set up SSO |

3. **Deploy.** Every push to `main` redeploys automatically; pull requests get preview URLs.

*Netlify instead?* Import the repo the same way — Netlify detects Next.js and uses its Next.js runtime.
Set the same environment variables.

## 5. Custom domain

Example: `learn.questivity.com`.

1. Vercel → Project → **Settings → Domains** → add `learn.questivity.com`.
2. At your DNS provider (wherever questivity.com is managed) add the record Vercel shows, typically:

| Type | Name | Value |
|---|---|---|
| CNAME | `learn` | `cname.vercel-dns.com` |

3. Wait for the green check (usually minutes; DNS can take up to 24 h). HTTPS is issued automatically.
4. Make sure `NEXT_PUBLIC_SITE_URL` and the Supabase **Site URL / Redirect URLs** use the final domain, then redeploy.

## 6. First admin & go-live checklist

1. Open the site, sign in with your work email.
2. Supabase **SQL Editor** → run `scripts/make-admin.sql` with your email. Refresh — the **Admin** menu appears.
3. Admin → **Settings**: confirm allowed domains and pass mark; adjust departments.
4. Admin → **Users**: set department, manager and role (Manager/Admin) for people as they sign in, or invite them.
5. Admin → **Knowledge base**: complete and publish the two TEMPLATE drafts; review every seeded article.
6. Admin → **Courses / Learning paths**: review content, upload videos, publish.
7. Apply official branding (BRAND.md).
8. Test as a learner: onboarding path auto-assigned → complete a course → certificate → ask the assistant.

## Operations

- **Backups:** Supabase Pro includes daily backups and point-in-time recovery — recommended for production.
- **Monitoring:** Vercel → Logs for app errors; Supabase → Logs/Advisors for database and auth.
- **Schema changes:** add a new numbered file in `supabase/migrations/`; CI applies and tests every migration.
- **Content growth:** watch Admin → Overview → *Knowledge gaps* weekly and write articles for recurring questions.
- **Scaling the assistant:** full-text search works well for hundreds of articles. For thousands, or for
  semantic ("meaning-based") matching, add `pgvector` embeddings alongside `search_kb_chunks` — the chunk table
  is already in place.
