# PayloadTOON 🚀

<div align="center" >
  <img src="https://res.cloudinary.com/diyncva2v/image/upload/v1779620880/clouxaekmyq5m6mdh1jr.png" target="_blank" alt="Ezhire App" style="max-width: 50%; height: 350px; border-radius: 30px;" />
</div>

---

**Compress JSON before AI sees it.** ⚡

PayloadTOON is a TypeScript npm package, CLI, API server, and developer dashboard that converts large JSON payloads into compact, schema-aware TOON format before sending data to AI models.

It helps reduce:

- 💸 LLM input tokens
- 🔁 repeated JSON structure
- ⚡ inference cost
- 🚀 latency
- 📦 context window waste
- 🧠 unnecessary AI context usage

PayloadTOON can run as:

1. 💻 a local JSON-to-TOON CLI,
2. 🌐 a standalone API server,
3. 🧩 Express middleware/router inside an existing backend,
4. 🛠️ a lightweight JSON-to-TOON utility,
5. 📊 a dashboard for testing, saved templates, analytics, and backend diagnostics.

---

## 💡 Why PayloadTOON?

Large JSON arrays waste tokens because every row repeats the same keys and syntax.

### ❌ Normal JSON

```json
[
  {
    "serverId": "svr_01",
    "endpoint": "/auth/login",
    "status": 200,
    "region": "us-east"
  },
  {
    "serverId": "svr_02",
    "endpoint": "/payments/payout",
    "status": 500,
    "region": "us-west"
  }
]
```

### ✅ PayloadTOON format

```text
Format: [serverId | endpoint | status | region]

svr_01|/auth/login|200|us-east
svr_02|/payments/payout|500|us-west
```

The AI still understands the data because the schema is sent once.

The repeated JSON keys, quotes, braces, and brackets are removed before the AI call. 🔥

---

## 🧠 Important: What is Gemini’s role?

Gemini is **not** the compression engine.

PayloadTOON compresses JSON locally in TypeScript.

```text
Raw JSON
   ↓
PayloadTOON parser
   ↓
Optimized TOON
   ↓
Gemini / AI model
```

Gemini is optional and used for two things:

1. 📊 **Exact Gemini token counting**
   - raw JSON token count
   - optimized TOON token count
   - tokens saved
   - savings percentage

2. 🧠 **AI analysis**
   - reads optimized TOON
   - answers the user query
   - returns structured JSON insights

So the token saving happens because PayloadTOON reduces the payload **before** it reaches Gemini or any other LLM.

---

## 🟢 Gemini-Free Mode

PayloadTOON can work without Gemini.

This mode only performs local compression and local token estimation.

### 💻 Local CLI

```bash
payloadtoon compress ./data.json --pretty
```

Write output to a file:

```bash
payloadtoon compress ./data.json --out ./toon-output.json --pretty
```

Hide the full TOON string and return only analytics/preview:

```bash
payloadtoon compress ./data.json --no-toon-string --pretty
```

### 🌐 Local API

```http
POST /api/v1/toon/compress
```

This endpoint does not require `GEMINI_API_KEY`.

It returns:

- 🧾 schema header
- 📦 TOON string or preview
- 🔢 row count
- 🧮 column count
- 📊 local raw token estimate
- 📉 local optimized token estimate
- 💰 estimated tokens saved
- ✅ estimated savings percentage

Note: local token estimation is approximate. Exact billing tokens depend on the selected AI provider and model tokenizer.

---

## 🧩 Saved Templates & Dashboard Persistence

PayloadTOON now includes a saved template system inside the dashboard.

You can save frequently used query + payload combinations and reload them instantly.

### 🟡 Default Mode: In-Memory Session Cache

By default:

```env
FILE_STORE_ENABLED=false
```

Users can still:

- ✅ save named templates
- ✅ load templates
- ✅ delete templates
- ✅ use the dashboard without any file setup

But templates are stored temporarily in server memory.

The dashboard shows a stylish **Session Cache** badge to remind users that saves are temporary.

### 🟢 Persistent Disk Mode

Enable permanent saved templates:

```env
FILE_STORE_ENABLED=true
FILE_STORE_PATH=./data/saved_payloads.json
```

When enabled:

- ✅ saved templates are written to disk
- ✅ templates survive server restarts
- ✅ dashboard shows a vibrant **Disk** badge
- ✅ storage path defaults to `./data/saved_payloads.json`

---

## 🌐 Saved Payload REST API

PayloadTOON exposes full REST endpoints for saved dashboard templates:

```http
GET    /api/v1/saved-payloads/status
GET    /api/v1/saved-payloads
POST   /api/v1/saved-payloads
DELETE /api/v1/saved-payloads/:id
```

### Status

```http
GET /api/v1/saved-payloads/status
```

Returns:

```json
{
  "enabled": true
}
```

### Create Template

```http
POST /api/v1/saved-payloads
```

Request:

```json
{
  "name": "Production Error Logs",
  "userQuery": "Find critical errors and summarize the RCA.",
  "documentContext": [
    {
      "serverId": "svr_01",
      "status": 500,
      "endpoint": "/payments/payout"
    }
  ]
}
```

---

## 🛡️ Active Backend Verification & Recovery Screen

The dashboard automatically verifies the backend connection:

- ✅ on mount
- ✅ during service calls
- ✅ after retry attempts

If the backend is offline, the dashboard shows a full-screen premium diagnostics view:

- 🌌 illuminated mesh radial gradients
- ⚠️ pulsing warning icon block
- 🧾 step-by-step startup codebox
- 🔁 animated Retry Connection button
- ⏳ live loading indicators

This helps users recover quickly when the API server is not running.

Recommended backend startup:

```bash
yarn dev
```

or:

```bash
npm run dev
```

---

## 📊 Historical Ledger Chart Fix

PayloadTOON records local compression analytics in Gemini-free mode too.

That means the historical ledger chart now updates even when users only call:

```http
POST /api/v1/toon/compress
```

The frontend reloads ledger stats immediately after local compression succeeds, so the chart bars render in real time. 📈

---

## 📦 Installation

```bash
npm install payloadtoon
```

or:

```bash
yarn add payloadtoon
```

---

## 🔐 Environment Variables

For local compression only, Gemini is not required.

For Gemini-powered analysis, create a `.env` file:

```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
GEMINI_MODEL=gemini-2.5-flash
GEMINI_FALLBACK_MODEL=gemini-2.5-flash-lite
GEMINI_MAX_RETRIES=3
GEMINI_RETRY_INITIAL_DELAY_MS=500
GEMINI_RETRY_MAX_DELAY_MS=8000

FILE_STORE_ENABLED=false
FILE_STORE_PATH=./data/saved_payloads.json
```

Redis is optional:

```env
REDIS_URL=redis://localhost:6379
```

If Redis is not configured, PayloadTOON uses in-memory analytics/context storage.

---

## 🚀 Run as API Server

```bash
npx payloadtoon
```

or after global install:

```bash
npm install -g payloadtoon
payloadtoon
```

API runs at:

```text
http://localhost:3000/api/v1
```

---

## 🌐 API Endpoints

### ❤️ Health

```http
GET /api/v1/health
```

### 🟢 Local TOON Compression — No Gemini

```http
POST /api/v1/toon/compress
```

### 🧠 Analyze with Gemini

```http
POST /api/v1/analyze
```

### 🔁 Context Reuse

```http
POST   /api/v1/contexts
POST   /api/v1/contexts/:contextId/analyze
DELETE /api/v1/contexts/:contextId
```

### 💾 Saved Templates

```http
GET    /api/v1/saved-payloads/status
GET    /api/v1/saved-payloads
POST   /api/v1/saved-payloads
DELETE /api/v1/saved-payloads/:id
```

---

## ⚡ PowerShell Test

### 🟢 Local compression without Gemini

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:3000/api/v1/toon/compress" `
  -Method Post `
  -ContentType "application/json" `
  -InFile "examples\requests\analyze.sample.json" |
ConvertTo-Json -Depth 20
```

### 🧠 Gemini analysis

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:3000/api/v1/analyze" `
  -Method Post `
  -ContentType "application/json" `
  -InFile "examples\requests\analyze.sample.json" |
ConvertTo-Json -Depth 20
```

---

## 📊 Dashboard

The dashboard is provided as an example app.

```bash
cd examples/next-dashboard
yarn install
yarn dev -p 3001
```

Open:

```text
http://localhost:3001
```

Dashboard shows:

- 📝 JSON input
- 🔍 user query
- 📦 TOON preview
- 📊 raw token count
- 📉 optimized token count
- 💰 tokens saved
- ✅ savings percentage
- 🧠 AI response
- 📈 historical analytics
- 💾 saved templates
- 🛡️ backend diagnostics/recovery screen

---

## 📌 Use Cases

### 🖥️ Server Logs

Ask:

```text
Find all 500 errors, slow endpoints, and critical regions.
```

### 📊 ERP Reports

Ask:

```text
Summarize invoices by customer and flag abnormal tax amounts.
```

### 💰 Payroll Data

Ask:

```text
Find employees with unusual deductions or missing tax records.
```

### 🔔 Webhook Events

Ask:

```text
Find failed Stripe or Paynote webhooks and recommend retries.
```

### 👥 CRM Data

Ask:

```text
Identify high-priority leads and overdue follow-ups.
```

### 🎫 Support Tickets

Ask:

```text
Group repeated complaints and create a management summary.
```

### 🔍 Local JSON Inspection

Use:

```bash
payloadtoon compress ./large-api-response.json --pretty
```

---

## 🤝 Open Source Contribution

PayloadTOON is open source and welcomes contributions.

You can contribute by:

- 🐛 reporting bugs
- ✨ requesting features
- 🧩 improving compression strategies
- 🧠 adding AI provider support
- 🎨 improving the dashboard UI
- 📚 improving docs and examples
- ✅ adding tests
- 🔌 adding framework integrations

See:

```text
CONTRIBUTING.md
CODE_OF_CONDUCT.md
SECURITY.md
.github/ISSUE_TEMPLATE/
.github/PULL_REQUEST_TEMPLATE.md
```

---

## 🗺️ Feature Roadmap

### v1.1.0 🔌

- OpenAI provider support
- Anthropic provider support
- Provider abstraction layer

### v1.2.0 🧮

- Improved local token estimation
- Multiple tokenizer modes
- Provider-specific token warnings

### v1.3.0 ✂️

- Smart chunking for very large payloads
- Row range metadata
- Send only relevant chunks to AI

### v1.4.0 🔎

- Query-aware context filtering
- Rule-based pre-filtering
- Context search endpoint

### v1.5.0 🗄️

- Persistent context store adapters
- Redis context storage
- Database-backed context storage
- TTL and expiration support

### v2.0.0 🎛️

- Production dashboard
- Context manager
- Upload JSON file
- Local compression tab
- AI analysis tab
- Export optimization report
- Cost savings estimator

### v2.1.0 🤝

- Community plugin system
- Framework adapters
- Contributor examples
- Public benchmark suite

---

## 👤 Author

Built by **Ashish Kumar** 🚀

- Email: ashish.worksspace@gmail.com
- GitHub: https://github.com/ashish13377
- LinkedIn: https://www.linkedin.com/in/ashish-kumar-7a5b401ba/

---

## 📄 License

MIT
