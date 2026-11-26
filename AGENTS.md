<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Application rules
- Universities are identified by the normalised college name on profiles; the name is locked after signup, because every access policy scopes administrators and teachers to it.
- One administrator per university is enforced in the email-confirmation trigger and the review RPC; the signup form's check is only a friendly message.
- Students register themselves; subject membership lives in `subject_students` and only the subject's teacher writes it. Attendance marking lists a session's subject members.
- The minimum attendance percentage is read per university through `useMinAttendance`; never hard-code a threshold in pages.
- Roles are assigned only by verified-email database triggers and the administrator review RPC, so signup choices cannot escalate privileges.
- Keep the auth context and hook in a non-component module separate from the provider, so live updates keep one context identity.
- Scope university settings reads with the existing database college-key helper, so omitting a browser filter cannot expose another university's settings.
