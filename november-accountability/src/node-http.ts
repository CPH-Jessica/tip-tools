import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { Desk } from './app.ts';

export function nodeHandler(desk: Desk) {
  return async function handler(req: IncomingMessage, res: ServerResponse) {
    try {
      const host = req.headers.host ?? '127.0.0.1';
      const url = new URL(req.url ?? '/', `http://${host}`);
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value == null) continue;
        if (Array.isArray(value)) for (const item of value) headers.append(key, item);
        else headers.set(key, value);
      }
      const method = req.method ?? 'GET';
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      const body = method === 'GET' || method === 'HEAD' ? undefined : Buffer.concat(chunks);
      const response = await desk.fetch(new Request(url, { method, headers, body }));
      res.statusCode = response.status;
      const cookies = typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : [];
      response.headers.forEach((value, key) => {
        if (key.toLowerCase() === 'set-cookie') return;
        res.setHeader(key, value);
      });
      if (cookies.length > 0) res.setHeader('set-cookie', cookies);
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch {
      if (!res.headersSent) res.statusCode = 500;
      res.end('The ledger could not do that.');
    }
  };
}

export function listen(desk: Desk, host: string, port: number): Server {
  const server = createServer(nodeHandler(desk));
  server.listen(port, host);
  return server;
}
