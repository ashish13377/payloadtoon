# ⚡ PayloadTOON Quickstart

## 📦 Install

```bash
npm install payloadtoon
```

or:

```bash
yarn add payloadtoon
```

## 🟢 Local Compression Without Gemini

```bash
payloadtoon compress ./data.json --pretty
```

Write output:

```bash
payloadtoon compress ./data.json --out ./toon-output.json --pretty
```

Preview only:

```bash
payloadtoon compress ./data.json --no-toon-string --pretty
```

## 🚀 Run API Server

```bash
npx payloadtoon
```

or:

```bash
yarn dev
```

## 🌐 Local Compression API

```http
POST http://localhost:3000/api/v1/toon/compress
```

PowerShell:

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:3000/api/v1/toon/compress" `
  -Method Post `
  -ContentType "application/json" `
  -InFile "examples\requests\analyze.sample.json" |
ConvertTo-Json -Depth 20
```

## 💾 Enable Saved Templates Disk Mode

```env
FILE_STORE_ENABLED=true
FILE_STORE_PATH=./data/saved_payloads.json
```

Then restart backend:

```bash
yarn dev
```

## 🛡️ Backend Offline Recovery

If the dashboard shows the server offline screen:

```bash
cd payloadtoon
yarn dev
```

Then click:

```text
Retry Connection
```

## 🧠 Gemini AI Analysis API

Requires:

```env
GEMINI_API_KEY=your_key_here
```

Endpoint:

```http
POST http://localhost:3000/api/v1/analyze
```

## 🔍 Main Difference

```text
/api/v1/toon/compress
  → local only
  → no Gemini
  → compression + local token estimate
  → ledger chart records analytics

/api/v1/analyze
  → Gemini required
  → compression + exact Gemini token count + AI insights
```
