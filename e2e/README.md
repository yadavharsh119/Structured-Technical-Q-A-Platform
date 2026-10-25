# End-to-end happy path

A single Selenium script that drives the real client and API:

1. registers author A, author B and moderator M with a unique timestamp suffix;
2. verifies their emails and promotes M directly in PostgreSQL;
3. has A ask a question and checks it is pending;
4. has M approve the question by creating a topic;
5. has A and B each submit a perspective;
6. checks the self-upvote rule and toggles A's vote on B's perspective; and
7. compares both perspectives.

All created rows are removed in a `finally` block, matched by the run's
timestamped email prefix. `audit_logs` is append-only and is intentionally left
alone.

## Prerequisites

- PostgreSQL running, with migrations applied (`npm run db:migrate`)
- Backend API on `http://localhost:5000`
- Client on `http://localhost:3000`
- Python 3.10+ and Google Chrome (Selenium Manager downloads the matching
  driver automatically; no manual driver install)
- `DATABASE_URL` in the repo `.env`

## Install

```bash
python -m pip install -r e2e/requirements.txt
```

## Run

Start the database, backend and client from the repo root:

```bash
docker-compose up -d
npm run db:migrate
npm run dev:server
npm run dev:client
```

Then, in another terminal:

```bash
python e2e/happy_path.py           # headless Chrome (default)
python e2e/happy_path.py --headed  # watch the browser
```

The script prints `PASS` or `FAIL` for every step and stops at the first
failure. A screenshot of the failed page is written to `e2e/artifacts/`.
The process exits non-zero on failure (including cleanup failures).

## Configuration

| Variable | Default |
| --- | --- |
| `BASE_URL` | `CLIENT_URL` from the repo `.env` (`http://localhost:3000`) |
| `DATABASE_URL` | `DATABASE_URL` from the repo `.env` |

Environment variables override values from `.env`.

## Auth rate limit

The API allows 20 auth requests per IP per 15 minutes. A run uses 8 of them
(3 registrations and 5 logins), so two consecutive runs fit inside one window.
If you have just made other auth requests, wait for the window to reset before
starting a repeat run.

## Notes

- Elements are located only by `data-testid`, using explicit `WebDriverWait`
  conditions. There are no fixed sleeps.
- Each run uses fresh emails and usernames, so repeated runs do not collide.
- Questions, topics, perspectives and votes are created through the UI; SQL is
  used only to verify emails, promote M, and clean up, because Selenium cannot
  read the verification email.
