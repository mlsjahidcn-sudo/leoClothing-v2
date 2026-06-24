import { createServer } from 'node:http';
import { parse } from 'node:url';
import next from 'next';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '5000', 10);

// The legacy `url.parse()` triggers a Node [DEP0169] warning per
// request but is the only thing Next.js's RequestHandler accepts as
// a second arg (it needs `UrlWithParsedQuery` shape with .pathname +
// .query — WHATWG `URL` doesn't have `.query`, so we can't switch
// without breaking routing).
//
// Suppress DEP0169 by default in the dev script via
// NODE_OPTIONS=--no-deprecation. Production runs already use
// `next start` and don't hit this code path.

// Create Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url ?? '', true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });
  server.once('error', (err) => {
    console.error(err);
    process.exit(1);
  });
  server.listen(port, () => {
    console.log(`> Server listening at http://${hostname}:${port} as ${dev ? 'development' : 'production'}`);
  });
});
