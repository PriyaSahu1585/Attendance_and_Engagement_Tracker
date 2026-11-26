# AttendIQ

Smart attendance & engagement for administrators, teachers and students.

## Run on your computer
1. Install Node.js 22+ and Bun (https://bun.sh).
2. Unzip, open a terminal in the folder that contains `package.json`.
3. `bun install`
4. `bun run dev` → open http://localhost:8080
5. Tests: `bun run test`

The included `.env` connects to this project's Lovable Cloud backend (shared real data).

## Deploy
- Easiest: in Lovable, click **Publish → Publish changes**.
- Self-hosting: `bun run build`, then deploy to a Cloudflare Workers–compatible host
  (see https://docs.lovable.dev/tips-tricks/self-hosting).
