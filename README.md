# NexLauncher

Minecraft launcher starter project built with Electron, React and Vite, plus a PHP read-only API for listing modpacks.

## Repository structure

- `launcher/` — Electron desktop shell and React/Vite interface.
- `api/` — PHP JSON API. Supports `?list=1` and `?pack=pack-id`.
- `data/packs.json` — pack manifest with a ZIP URL, Minecraft version, loader, SHA-256 field and server address.

## Run the desktop UI

Install Node.js 20 or newer, then:

```bash
cd launcher
npm install
npm run dev
```

For the Electron window, start Vite in one terminal with `npm run dev`, and in a second terminal run:

```bash
cd launcher
npm run desktop
```

Build a Windows installer:

```bash
npm run dist
```

The installer output is placed in `launcher/release/`.

## Configure the PHP API

1. Upload the `api/` and `data/` folders to a PHP-enabled host.
2. Ensure the PHP process can read `data/packs.json`.
3. Change `VITE_NEXLAUNCHER_API` in the launcher environment to the deployed `api/index.php` URL.
4. Replace the example `zipUrl` with a real HTTPS download URL for a ZIP archive.

API examples:

- `https://your-domain.example/api/index.php?list=1`
- `https://your-domain.example/api/index.php?pack=example-vanilla`

## Current status and important limitations

This is an initial scaffold, not a finished Minecraft launcher. The UI can read pack metadata, but **it does not yet download/install Minecraft or launch the game**. The PHP API is intentionally read-only; a secure PHP admin panel for editing `packs.json` still needs to be implemented. Do not expose a write endpoint without authentication and validation.

The example pack URL is a placeholder and must be replaced. The SHA-256 value is not currently validated by the client. Microsoft account authentication, Java runtime management, Vanilla/Fabric/Forge installation, pack ZIP extraction, server status, and settings are not implemented yet.

Do not commit passwords, access tokens, or other secrets.
