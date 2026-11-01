# Deploy ComponentCare with Webuzo, SSH and GitHub

This app needs a running Node.js process and MySQL. phpMyAdmin manages MySQL; it does not execute the Node application. Production serves the React build and REST API together through one Node process.

## Information needed before deployment

- Domain or subdomain and DNS target.
- SSH host, port and username, with key-based access configured locally.
- Operating system, Webuzo version and active web server (Nginx, Apache or OpenLiteSpeed).
- GitHub repository URL and access to clone it.
- MySQL version, database name and dedicated database username. Enter passwords on the server, not in chat or GitHub.
- Whether to start with an empty database or transfer the current records and attachments.

## Architecture

HTTPS domain -> Webuzo-managed web server -> 127.0.0.1:4000 -> Node/Express -> MySQL

Express serves both the built React site and /api paths. Keep port 4000 private. Use a subdomain root for the initial deployment, rather than a subdirectory.

## Prepare the repository

Commit source, package.json, package-lock.json, the TypeScript configuration and ecosystem.config.cjs. Exclude .env, database exports, data, uploaded files, PDF exports, temporary files, node_modules and builds. The .gitignore includes these exclusions. If sensitive files were already tracked, ignoring them does not remove them from Git history; inspect the repository before publishing.

## Initial server setup

Use Node.js 24 and MySQL 8+. Run the app as the hosting account, not root. Create the database and a dedicated user in Webuzo's database manager; give that user privileges on this app database only. Use the exact database/user names shown by Webuzo, which may have an account prefix.

Clone into a private application directory outside public_html. Example commands below contain placeholders to replace with your actual values:

```sh
mkdir -p ~/apps
cd ~/apps
git clone YOUR_GITHUB_REPOSITORY componentcare
cd componentcare
npm ci
npm run build
cp .env.example .env
chmod 600 .env
mkdir -p ~/componentcare-storage/attachments
```

Edit the server .env with a terminal editor:

```dotenv
NODE_ENV=production
HOST=127.0.0.1
PORT=4000
STORAGE_MODE=mysql
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=YOUR_WEBUZO_DATABASE
MYSQL_USER=YOUR_WEBUZO_DATABASE_USER
MYSQL_PASSWORD="SET_ON_SERVER"
ADMIN_EMAIL=YOUR_ADMIN_EMAIL
ADMIN_PASSWORD="SET_ON_SERVER_AT_LEAST_10_CHARACTERS"
COOKIE_SECURE=true
TRUST_PROXY=loopback
ATTACHMENT_DIR=/home/YOUR_ACCOUNT/componentcare-storage/attachments
```

TRUST_PROXY=loopback applies only when the proxy connects locally. The web server must overwrite forwarded client IP headers with trustworthy values. Configure a different topology deliberately before exposing the app.

For a new empty database, initialize tables and the administrator:

```sh
node dist-server/server/init-db.js
```

For a transfer, export component_care through local phpMyAdmin, import into the new server database, and copy data/attachments into the configured server ATTACHMENT_DIR. Preserve attachment filenames. Do not initialize an unrelated existing database or import into a populated database without reviewing conflicts. Imported users retain their passwords; editing ADMIN_PASSWORD does not reset existing accounts.

## Keep Node running

Install PM2 using the server's Node environment, then:

```sh
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Follow the platform-specific command printed by pm2 startup to enable reboot recovery. Use one process because sessions are held in process memory. Restarts sign users out.

If the hosting plan does not permit PM2, Webuzo Application Manager also supports self-managed Node applications. Use the private project directory as working directory and `node dist-server/server/index.js` as the start command. Configure its lifecycle using the actual panel version. Do not run PM2 and Application Manager for the same process.

## Domain, HTTPS and reverse proxy

Point the subdomain to the server, add it in Webuzo and issue an HTTPS certificate. Configure the domain's proxy through Webuzo's supported custom configuration mechanism. Do not replace panel-generated web-server configuration files.

The proxy must:

- Forward all paths, including /api and client routes such as /jobs/new, to http://127.0.0.1:4000.
- Preserve the Host header and forward the HTTPS scheme and trusted client IP.
- Accept uploads up to at least 6 MB; the application limits file contents to 5 MB.
- Avoid caching authenticated API responses or attachments.
- Redirect HTTP to HTTPS.

Exact directives depend on Nginx, Apache or OpenLiteSpeed and will be prepared after identifying the server. A directory containing .env, source or uploaded documents must not become a public document root.

## Verify

```sh
curl http://127.0.0.1:4000/api/health
pm2 status
pm2 logs componentcare --lines 50
```

Then check the HTTPS domain, sign-in, a master record, a service job, upload/download, image preview and refreshing /jobs/new directly. Confirm the API reports mysql. Test with the dedicated database user rather than the server root account. No public deployment is complete until these checks pass.

## Updating from GitHub

Back up MySQL and the attachment directory before updates. Review changes and retain the previous release commit for rollback. In the application directory:

```sh
git pull --ff-only
npm ci
npm run build
pm2 restart ecosystem.config.cjs --update-env
```

Restart only after the build succeeds. This is a simple single-instance deployment, not zero-downtime deployment. Database changes require reviewing their migration instructions; db:init is not a general migration engine.

## Official Webuzo references

- [Application Manager](https://www.webuzo.com/docs/enduser-applications/application-manager/)
- [Available server applications](https://webuzo.com/apps-overview)

Status: deployment preparation only. No GitHub push, SSH connection, remote database import, DNS change or public deployment has been performed.
