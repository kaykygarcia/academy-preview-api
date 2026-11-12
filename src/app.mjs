import http from 'node:http';
import os from 'node:os';

const safeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);

const sendJson = (res, status, body) => {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(body));
};

const renderPage = ({ version, revision, environment, hostname, ready }) => `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Academy Preview — ${safeHtml(version)}</title>
  <style>
    :root { color-scheme: dark; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 28px; background: radial-gradient(ellipse at 70% 0%, #1a2a4b 0%, #0a0e19 52%, #06070c 100%); color: #e9edf8; }
    main { width: min(680px,100%); background: rgba(19,27,47,.88); border: 1px solid #3c4964; border-radius: 20px; padding: 36px; box-shadow: 0 30px 90px #0007; }
    .top { display: flex; justify-content: space-between; gap: 16px; align-items: center; }
    .brand { font-weight: 750; letter-spacing: .08em; font-size: 12px; color: #90a7e0; text-transform: uppercase; }
    .pill { border: 1px solid ${ready ? '#246f5a' : '#986034'}; background: ${ready ? '#103b31' : '#422e20'}; color: ${ready ? '#86e2ba' : '#ffd4a2'}; border-radius: 99px; padding: 7px 12px; font-size: 12px; }
    h1 { font-size: clamp(28px,5vw,44px); letter-spacing: -.045em; line-height: 1.08; margin: 34px 0 10px; }
    p { color: #adbad1; line-height: 1.65; max-width: 530px; }
    dl { margin: 28px 0 0; display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 12px; }
    dl > div { background: #101827; border: 1px solid #2b3b55; border-radius: 12px; padding: 16px; min-width: 0; }
    dt { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #8596b6; margin-bottom: 8px; }
    dd { margin: 0; overflow-wrap: anywhere; font-size: 15px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }
    footer { margin-top: 28px; font-size: 12px; color: #7989a7; }
    a { color: #9dbbff; }
    @media (max-width: 480px) { main { padding: 24px; } dl { grid-template-columns: 1fr; } }
  </style>
</head>
<body><main>
  <div class="top"><span class="brand">Kayky Academy / Release Preview</span><span class="pill">${ready ? '● Ready' : '● Not Ready'}</span></div>
  <h1>Uma alteração.<br>Um ambiente de testes.</h1>
  <p>Este ambiente identifica a versão que está atendendo às requisições. Depois, a pipeline vai criá-lo para um Pull Request e removê-lo quando não for mais necessário.</p>
  <dl>
    <div><dt>Versão</dt><dd>${safeHtml(version)}</dd></div>
    <div><dt>Commit</dt><dd>${safeHtml(revision)}</dd></div>
    <div><dt>Ambiente</dt><dd>${safeHtml(environment)}</dd></div>
    <div><dt>Instância</dt><dd>${safeHtml(hostname)}</dd></div>
  </dl>
  <footer><a href="/api/info">/api/info</a> · <a href="/health/live">/health/live</a> · <a href="/health/ready">/health/ready</a></footer>
</main></body></html>`;

export function createAppServer({
  version = process.env.APP_VERSION || '0.1.0',
  revision = process.env.BUILD_REVISION || 'local',
  environment = process.env.APP_ENV || 'local',
  readiness = process.env.APP_READY || 'true',
  hostname = os.hostname()
} = {}) {
  const ready = !['false', '0', 'no'].includes(String(readiness).toLowerCase());
  return http.createServer((req, res) => {
    const pathname = new URL(req.url || '/', 'http://localhost').pathname;

    if (req.method !== 'GET') return sendJson(res, 405, { error: 'method_not_allowed' });
    if (pathname === '/health/live') return sendJson(res, 200, { status: 'alive' });
    if (pathname === '/health/ready') return sendJson(res, ready ? 200 : 503, { status: ready ? 'ready' : 'not_ready' });
    if (pathname === '/api/info') return sendJson(res, 200, { service: 'academy-preview-api', version, revision, environment, hostname, ready });
    if (pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(renderPage({ version, revision, environment, hostname, ready }));
      return;
    }
    sendJson(res, 404, { error: 'not_found' });
  });
}
