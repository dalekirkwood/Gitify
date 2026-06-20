# Gitify

Cross-platform issue & project management for **Forgejo** and **Gitea**. Connect to a
self-hosted instance with a personal access token, browse projects, filter issues,
assign users, and add comments — on Ubuntu, Android, and iOS from one codebase.

## Stack

- **React + TypeScript + Vite**
- **Tailwind CSS** (shadcn-style components)
- **Tauri 2** — desktop (Ubuntu/Win/macOS) + mobile (Android/iOS)
- **TanStack Query** — server state, caching, optimistic writes
- **Forgejo/Gitea REST** (`/api/v1`) — one client, base-URL swap covers both

## Develop

```bash
npm install
npm run tauri dev      # desktop window (needs Rust + webkit2gtk on Linux)
# or browser-only UI:
npm run dev
```

### Linux build prerequisites

Tauri's Rust build needs system libraries:

```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

Generate app icons before the first bundle: `npm run tauri icon path/to/logo.png`.

## Mobile

```bash
npm run tauri android init && npm run tauri android dev
npm run tauri ios init && npm run tauri ios dev   # requires macOS + Xcode
```

## Layout

```
src/
  lib/forge.ts        Forgejo/Gitea API client (the core)
  lib/auth.ts         Token storage (Tauri store; swap to OS keychain before shipping)
  state/connection.tsx  Active connection context
  components/Sidebar.tsx Projects (repos) sidebar
  screens/Connect.tsx    URL + token connect
  screens/IssueList.tsx  Filtered issue list
  screens/IssueDetail.tsx Assignees, comments, close/reopen
src-tauri/            Tauri 2 shell, plugins, capabilities
```

## Notes

- Min versions: Gitea 1.20+ / Forgejo 1.21.4+.
- No native Kanban API exists in Gitea/Forgejo; a board view (if added later) is
  synthesized from issues grouped by label/milestone/state.
- The PAT is currently kept in a Tauri store — move it to the OS keychain
  (`tauri-plugin-keyring`) before any real release.
