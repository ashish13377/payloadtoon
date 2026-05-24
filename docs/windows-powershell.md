# Windows PowerShell Examples

PayloadTOON works on Windows via PowerShell. Below are equivalent commands for all common operations.

## Prerequisites

```powershell
# Install Node.js from https://nodejs.org
# Then install PayloadTOON globally
npm install -g payloadtoon
```

## Local Compression

```powershell
# Compress a JSON file
payloadtoon compress .\examples\server-logs.json --pretty

# Compress with output file
payloadtoon compress .\examples\server-logs.json --out .\output\compressed.json --pretty

# Compress without TOON string (analytics only)
payloadtoon compress .\data.json --no-toon-string --pretty
```

## API Testing with Invoke-RestMethod

```powershell
# Start the API server first (in another terminal)
# yarn dev

# Compress via API
$body = @{
    documents = Get-Content .\examples\server-logs.json | ConvertFrom-Json
} | ConvertTo-Json -Depth 20

Invoke-RestMethod `
  -Uri "http://localhost:3000/api/v1/toon/compress" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body |
ConvertTo-Json -Depth 20

# Check saved payloads status
Invoke-RestMethod `
  -Uri "http://localhost:3000/api/v1/saved-payloads/status" |
ConvertTo-Json -Depth 20

# List saved templates
Invoke-RestMethod `
  -Uri "http://localhost:3000/api/v1/saved-payloads" |
ConvertTo-Json -Depth 20
```

## Gemini Analysis

```powershell
# Set API key
$env:GEMINI_API_KEY = "your_key_here"

# Create analysis request
$analyzeBody = @{
    documents = Get-Content .\examples\server-logs.json | ConvertFrom-Json
    userQuery = "Find all errors and summarize root causes."
} | ConvertTo-Json -Depth 20

Invoke-RestMethod `
  -Uri "http://localhost:3000/api/v1/analyze" `
  -Method Post `
  -ContentType "application/json" `
  -Body $analyzeBody |
ConvertTo-Json -Depth 20
```

## Save and Load Templates

```powershell
# Save a template
$template = @{
    name = "Error Log Analysis"
    userQuery = "Find all errors and summarize root causes."
    documentContext = Get-Content .\examples\server-logs.json | ConvertFrom-Json
} | ConvertTo-Json -Depth 20

Invoke-RestMethod `
  -Uri "http://localhost:3000/api/v1/saved-payloads" `
  -Method Post `
  -ContentType "application/json" `
  -Body $template |
ConvertTo-Json -Depth 20

# Delete a template
Invoke-RestMethod `
  -Uri "http://localhost:3000/api/v1/saved-payloads/template-id-here" `
  -Method Delete |
ConvertTo-Json -Depth 20
```

## Output to File

```powershell
# Save API response to file
Invoke-RestMethod `
  -Uri "http://localhost:3000/api/v1/toon/compress" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body |
ConvertTo-Json -Depth 20 |
Out-File -FilePath .\output\result.json -Encoding UTF8

# Save compressed output from CLI
payloadtoon compress .\examples\server-logs.json --out .\output\toon-output.json --pretty
```

## Environment Variables (PowerShell)

```powershell
# Set for current session
$env:GEMINI_API_KEY = "your_key"
$env:PORT = "3000"
$env:FILE_STORE_ENABLED = "true"
$env:FILE_STORE_PATH = ".\data\saved_payloads.json"

# Set permanently (user-level)
[Environment]::SetEnvironmentVariable("GEMINI_API_KEY", "your_key", "User")
```
