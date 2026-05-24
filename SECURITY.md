# Security Policy 🔐

## Reporting Security Issues

Please do not create public GitHub issues for security vulnerabilities.

Email:

```text
ashish.worksspace@gmail.com
```

Include:

- description of the issue
- affected version/area
- reproduction steps
- possible impact
- suggested fix if available

## Secrets Policy

Never commit:

```text
.env
GEMINI_API_KEY
API keys
customer data
saved payloads with real data
```

## Local Data Warning

If `FILE_STORE_ENABLED=true`, saved payloads may be written to:

```text
./data/saved_payloads.json
```

Do not commit real saved payload data.

Recommended `.gitignore`:

```gitignore
.env
.env.local
data/
dist/
node_modules/
```
