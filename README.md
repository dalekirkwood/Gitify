<p align="center">
  <img src="Feature%20Graphic.png" alt="Gitify" width="100%" />
</p>

<h1 align="center">Gitify</h1>

<p align="center">
  <img src="Icon.png" alt="" width="88" /><br/>
  <b>Issue &amp; project management for Forgejo and Gitea.</b><br/>
  Desktop, Android, and a full-screen terminal app — one login, one codebase.
</p>

---

## What it is

Connect to a self-hosted **Forgejo** or **Gitea** server with a token. Browse
projects, filter and search issues, assign people, comment with `@`-mentions,
and run a drag-and-drop Kanban board. There's a recent-**Activity** feed too.

## Supported

| Service | Status |
|---|---|
| Forgejo (self-hosted) | ✅ |
| Gitea (self-hosted) | ✅ |
| GitHub / GitLab | ❌ different API |

Needs **Gitea 1.20+ / Forgejo 1.21.4+** and a token with `repository` + `issue` scope.

## Install

**Linux (.deb)** — installs the desktop app **and** the terminal app.

```bash
sudo apt install ./gitify_0.1.0_amd64.deb
gitify        # desktop GUI
gitify-tui    # terminal UI
```

**Android (.apk)** — download and sideload `gitify.apk` (enable "install unknown apps").

## Run from source

```bash
npm install
npm run tauri dev     # desktop window
npm run tui           # terminal UI
```

Mobile: `npm run tauri android dev` (Android) · `npm run tauri ios dev` (needs macOS).

## Terminal keys

`j/k` move · `g/G` top/bottom · `f/b` page · `enter` open · `esc` back · `/` search.
`o/c/a` open/closed/all · `n` new issue · `c` close/reopen · `m` comment (`@` mention).
`a` assignees · `q` quit. Credentials: `GITIFY_URL` + `GITIFY_TOKEN`, or `~/.config/gitify/config.json`.

## Notes

Kanban is built from `status/*` labels (Gitea/Forgejo have no board API) and is
desktop-only. The token lives in the Tauri store (GUI) or a `0600` config file
(TUI) — move it to the OS keychain before a public release.

## Stack

React · TypeScript · Tailwind (Catppuccin Macchiato) · Tauri 2 · Ink · TanStack Query.
