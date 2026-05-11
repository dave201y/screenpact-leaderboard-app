# Launch Checklist

## Must Do Before Friend Launch

1. Rotate Supabase keys and update deployment secrets.
2. Confirm `FRONTEND_ORIGIN` contains only trusted app domains.
3. Confirm API starts with production env values.
4. Verify `POST /api/auth/login` rate limit is active.
5. Verify `POST /api/usage/sync` and `POST /api/usage/sync/batch` rate limits are active.
6. Verify usage sync accepts summary payload only.
7. Verify RLS is enabled and policies are in place.
8. Verify at least 2 real user accounts can login and sync.
9. Verify leaderboard updates after usage sync.
10. Verify profile and my-stats endpoints reflect synced data.

## First Week After Launch

1. Monitor 4xx and 5xx API logs daily.
2. Check sync failure rate and retry behavior.
3. Capture top 3 issues from users and patch quickly.
4. Add a persistent session store for production.

## Go/No-Go Gate

1. Login success for three users: yes/no
2. Sync success for three users: yes/no
3. Leaderboard updates within 10 seconds: yes/no
4. No critical backend errors in last 24h: yes/no
5. Keys rotated and secrets not committed: yes/no
