# NexLauncher

Electron + React Minecraft launcher with a PHP API and admin panel.

## API address
Configured for `https://zeskin.freedev.app/api/index.php` in `src/config.js` and as the fallback in `electron/main.js`.

## Build
Pushes to `main` that change launcher files start the **Build NexLauncher for Windows** workflow. The installer is published as the `NexLauncher-Windows-Installer` workflow artifact.

Local build: `npm install`, `npm run build`, `npm run dist`.

## PHP admin setup
Upload `htdocs/` contents to the web root. Before logging in, generate a password hash with PHP:

```bash
php -r "echo password_hash('YOUR_NEW_PASSWORD', PASSWORD_DEFAULT);"
```

Put the resulting hash in `htdocs/api/config.php` as `admin_password_hash`. The repository intentionally does not ship with the known default password from the original draft. The pack list starts empty; add a pack after hosting its ZIP at an HTTPS URL and calculating its SHA-256 hash.
