# Club Genie

Automation-first session management for a small badminton club.

See `SPEC.md` for requirements and `TASKS.md` for the execution plan.

## Manual Test Steps
1. Admin login:
   - Visit `/admin/login`.
   - Sign in with `admin` / `admin`.
2. Rotate token and access `/sessions`:
   - In the Admin console, open the `Club Access` tab.
   - Click `Rotate Token`, then `Copy Invite Link`.
   - Open the invite link in a new tab (should land on `/sessions`).
3. Join/withdraw:
   - On `/sessions`, click `Join / Withdraw` on a session row.
   - Select one or more players and click `Join` or `Withdraw`.
4. Create/edit session (admin):
   - On `/sessions`, click `Create Session`.
   - Fill in fields and save.
   - Use `Edit` on a session row to update details.
