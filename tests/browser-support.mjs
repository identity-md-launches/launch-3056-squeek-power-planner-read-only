import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
export const runFile = promisify(execFile);
export async function harness() {
  await mkdir(process.env.PLANNER_TEST_TMPDIR ?? 'test/scratch/t', { recursive: true });
  await mkdir('test/scratch/shots', { recursive: true });
  const { chromium, webkit } = await import(process.env.IMD_PLAYWRIGHT ? pathToFileURL(process.env.IMD_PLAYWRIGHT).href : 'playwright');
  const root = resolve('dist');
  const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.svg': 'image/svg+xml', '.png': 'image/png' };
  const server = createServer(async (req, res) => {
    try {
      const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (!path.startsWith('/preview/')) throw Error('Outside subpath');
      const file = resolve(root, path.slice(9) || 'index.html');
      if (!file.startsWith(root + '/')) throw Error('Outside export');
      res.setHeader('content-type', mime[extname(file)] ?? 'application/octet-stream');
      res.end(await readFile(file));
    } catch { res.statusCode = 404; res.end('Not found'); }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const engine = process.env.PLANNER_BROWSER === 'webkit' ? webkit : chromium;
  const browser = await engine.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE } : {}), env: { ...process.env, TMPDIR: process.env.PLANNER_TEST_TMPDIR ?? 'test/scratch/t' } });
  return { browser, url: `http://127.0.0.1:${server.address().port}/preview/`, close: async () => { await browser.close(); await new Promise(r => server.close(r)); } };
}
export async function curlBridge(context) {
  // Test-only transport. No relay is included in the static site.
  await context.route(/^https:\/\/(api\.squeekchain\.com\/v1\/|ethereum-sepolia-rpc\.publicnode\.com\/?$)/, async route => {
    const request = route.request();
    try {
      const args = ['--silent', '--show-error', '--fail-with-body', '--max-time', '25', request.url(), '-H', 'accept: application/json'];
      if (request.method() === 'POST') args.push('-H', 'content-type: application/json', '--data-binary', request.postData() ?? '');
      const { stdout } = await runFile('curl', args, { maxBuffer: 8 * 1024 * 1024 });
      await route.fulfill({ status: 200, contentType: 'application/json', body: stdout, headers: { 'access-control-allow-origin': '*' } });
    } catch(e) { await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ status: 'unavailable', reason: 'test_transport_failed' }) }).catch(() => {}); }
  });
}
export async function assertReflow(page, label, widths = [320, 390, 768, 1440]) {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    const size = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    if (size.scroll > size.client + 1) throw new Error(`${label}: overflow at ${width}: ${JSON.stringify(size)}`);
  }
}
