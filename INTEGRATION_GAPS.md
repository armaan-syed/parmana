# Integration gaps

The frontend was connected to the existing FastAPI backend without changing any
backend behaviour. This file records everything that **cannot** be wired up as a
real product feature today, with the backend code that proves each gap. These
are backend/demo-prototype limitations, not frontend bugs.

## 1. Authentication is a demo mock — not secure

- `POST /auth/login` (`backend/app/routes/auth.py`) accepts `{role, email?, password?}`
  but **ignores the email and password completely**: it only validates the role
  string, then logs in the _first_ `User` row with that role. Any email +
  password combination that selects the `customer` role grants the demo
  customer identity.
- The returned token is a plain string (`mock-customer-jwt-token`,
  `mock-admin-jwt-token`). It is **never verified** and **no other endpoint
  checks the `Authorization` header at all**: `GET /admin/requests`,
  `POST .../process|update-and-process|reject`, and `/audit/logs` are all
  reachable without any token. There is no role-based authorization beyond the
  frontend hiding admin screens.
- Implication: this can never be described as a secure login. A real
  deployment needs credential checking (hashing), signed tokens, and
  server-side route guards.
- The web UI's email/password form is therefore decorative: it only chooses
  which role button is used (the form signs in with role `customer`). This is
  what the demo backend supports; nothing more can be sent.

## 2. Document submission is metadata-only

`POST /documents/submit` (`backend/app/routes/documents.py`) takes
`{files: ["Aadhaar", ...], customerId}` — string document **types only**. No
file bytes, no multipart/form-data, and the `Document` rows it creates get a
fabricated filename (`aadhaar_upload.pdf`, status `UPLOADED`). There is no
storage (S3/local), no upload endpoint, and no OCR/extraction — the
"extracted" field values are part of database seed content, not a pipeline.

The frontend therefore submits document-type metadata, matching what the
backend can accept. Wire-up of real files would require backend support
(first), such as:

- a multipart upload or presigned-URL flow,
- a real documents table API,
- an extraction step whose output lands in `fields_data`.

## 3. No backend endpoint for a request's document list / uploads

`Document` rows are written on submit, but the only way the frontend ever sees
documents is `documents_list` embedded in `KycRequestResponse`
(`GET /admin/requests`, `GET /customer/status`, `GET /admin/requests/{id}` —
authoritative copy in `backend/app/schemas/kyc.py`). There is no
`GET /documents` endpoint and no per-document detail, so `document detail`
screens can only show these type strings.

## 4. Profile is read-only

There is no `PATCH/POST` customer-profile endpoint anywhere
(`backend/app/routes/customers.py` only has `GET /profile`, `GET /status`,
`GET /list`). The only user-caused profile mutation is indirect:
`update-and-process` sets the customer's `name`/`dob`/`address` when a field
correction is processed (admin flow). The customer UI cannot offer any
"edit profile" action because it would be fabricated.

## 5. No server-side search, filter, or pagination

- `GET /customer/list` returns **all** customers, ordered by primary key, no
  query parameters. The address-book filters/search run client-side on the
  full response.
- `GET /admin/requests` returns all requests ordered ascending with no
  filtering; the queue's status filter tabs and search are also client-side.
- `GET /audit/logs` likewise returns the full history descending, no paging.
- Implication: acceptable for demo volumes; a real deployment needs
  parameterized queries (search, status, page size/cursor).

## 6. Backend timestamps and IDs are hardcoded / synthetic

- `documents.py`, `admin.py` write literal dates: `today = "12 Oct 2026"`,
  `updated_at = "12 Oct 2026"`, audit timestamps `"12 Oct 2026 · 15:00"`.
  The frontend faithfully displays these strings; they do not reflect real
  submission times and never change.
- New request IDs from `documents/submit` are derived from
  `f"KYC-{str(int(time.time()))[-4:]}"` — four digits of the current Unix
  timestamp, which can collide across submissions in the same second.
- `admin.py` (update-and-process) builds an audit ID with
  `f"AUD-{str(int(time.time() * 1000))[-5:]}" if "time" in locals() else ...`,
  but does not import `time`. The fallback is therefore used, producing a
  deterministic `AUD-{request_id[-4:]}` ID. Repeated corrections for the same
  request can collide with the database's audit-ID uniqueness constraint.

## 7. `POST /documents/submit` writes no audit log

It mutates/creates a `KycRequest` and the customer's `kyc_status`, but does not
insert an `AuditLog` row. Resubmissions will therefore not appear in the audit
trail (`GET /audit/logs`), even though admin processing actions do. The
frontend cannot invent those events — the audit page will simply not show them.

## 8. Auth/roles are shared identities

Only one demo user per role exists (`User.role`; auth picks `.first()`), so
every "customer" session is the same identity (`CUS-1042` by fallback;
`CUS-1042` is also what the submit endpoint defaults to when `customerId` is
omitted). There is no multi-user isolation: any customer session can
passively receive whatever customer record is first in the DB, and API calls
carry no server-side identity, so cross-record authorization is impossible
today (all `customer_id` filters are client-supplied).

## 9. Minor contract frictions handled in the frontend

- Status values come back as SCREAMING_CASE strings with no enum endpoint; the
  frontend maps `_<verb>` statuses defensively and renders any unknown status
  verbatim (title-cased) instead of crashing.
- `POST /requests/{id}/process` refuses non-`MATCH` fields server-side (HTTP
  400). The frontend additionally disables the button so the raw 400 is the
  rare path, but both are handled without fake success states.
- Process endpoints take an optional payload (`ProcessRequest` allows `None`),
  but the frontend always sends `{adminName}` derived from the session; the
  backend ignores it only if absent (falls back to the hardcoded
  `"Nisha Verma"`).

## Manual verification against a live backend

The automated tests exercise the screens against a mock `fetch`, so finish
validation once against the real server:

```bash
# backend
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000

# frontend (in a second terminal, from the repo root)
npm install
npm run dev
```

- `Create .env` (`VITE_API_BASE_URL=http://localhost:8000`) if you want an
  explicit value; the default already points at `:8000`.
- Sign in with the Customer role button → dashboards must show seed data from
  PostgreSQL, not bundled mock data (devtools Network tab shows real calls).
- Submit documents from `/customer/submit` → status page shows the request id
  returned by the real API; `GET /customer/status` now returns a request.
- In `/admin/requests/{id}`: process a MATCH-only request (toast + verified),
  update & process a MISMATCH field, and reject a request with a reason —
  each refreshes its data and the audit trail (`POST`s visible in Network).
- Reloading after sign-in must keep you signed in (session persists in
  `sessionStorage`), and sign-out must clear every cached query.
