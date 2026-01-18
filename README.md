# MCP Social Security

ChatGPT Apps SDK compatible MCP server for searching Korean welfare services (central government + local government).

## Requirements
- Node.js 24+
- Data.go.kr service key

## Setup
```bash
npm install
```

Create `.env`:
```
WELFARE_API_KEY=YOUR_KEY
```

## Run
```bash
npm run dev
```
- Dev mode shows a 3s loading state and mock results for UI preview.

```bash
npm run build
WELFARE_API_KEY=YOUR_KEY npm start
```

## MCP endpoint
- `POST /mcp`

## Tools
### `search_welfare`
- `age`: number (optional)
- `searchWrd`: string (required) - use only the core keyword (e.g. `????`, `??`, `??`)
- `ctpvNm`: string (optional)
- `sggNm`: string (optional)
- `sources`: `['national','local']` (optional)
- `pageNo`, `numOfRows`, `maxResults` (optional)

## MCP resource
### `welfare://summary`
Returns the latest comparison data as JSON for ChatGPT portal to render its own table.
