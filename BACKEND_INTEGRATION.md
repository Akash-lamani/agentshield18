# Backend Integration Guide

## Option 1: Express API Wrapper

Create a thin API server around the AgentShield CLI:

```typescript
// api-server.ts
import express from 'express';
import { AgentShieldScanner } from './src/scanner';

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

app.post('/api/scan', async (req, res) => {
  const scanner = new AgentShieldScanner({ targetPath: req.body.path, deep: true });
  res.json(await scanner.scan());
});

app.get('/api/watch', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  // stream watch events as SSE
});

app.listen(3000);
```

## Option 2: Replace Mock Data in src/data/mockData.ts

Replace `buildInitialReport()` with a real API call:
```typescript
export async function fetchReport(path: string) {
  const res = await fetch(`/api/scan`, { method: 'POST', body: JSON.stringify({ path }) });
  return res.json();
}
```

## Vite Proxy Config
```typescript
// vite.config.ts
export default defineConfig({
  server: { proxy: { '/api': 'http://localhost:3000' } }
})
```
