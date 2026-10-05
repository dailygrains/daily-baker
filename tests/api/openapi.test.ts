import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, inject, it } from 'vitest';

const API_DIR = path.resolve(__dirname, '../../src/app/api/v1');
const UNDOCUMENTED = new Set(['/openapi.json', '/docs']);

/** Every route file under /api/v1 as "METHOD /path/{param}". */
function routeOperations(dir = API_DIR, prefix = ''): string[] {
  const ops: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      const segment = name.replace(/^\[(\w+)\]$/, '{$1}');
      ops.push(...routeOperations(full, `${prefix}/${segment}`));
    } else if (name === 'route.ts' && !UNDOCUMENTED.has(prefix)) {
      const source = readFileSync(full, 'utf8');
      const exported = [...source.matchAll(/export (?:const|async function)\s*\{?([A-Z,\s]+)\}?/g)]
        .flatMap((m) => m[1].split(','))
        .map((m) => m.trim())
        .filter((m) => ['GET', 'POST', 'PUT', 'DELETE'].includes(m));
      ops.push(...exported.map((m) => `${m} ${prefix}`));
    }
  }
  return ops;
}

describe('OpenAPI spec', () => {
  it('documents exactly the operations the route files export', async () => {
    const res = await fetch(`${inject('apiBase')}/openapi.json`);
    const spec = await res.json();

    const documented = Object.entries(spec.paths as Record<string, Record<string, unknown>>)
      .flatMap(([p, methods]) => Object.keys(methods).map((m) => `${m.toUpperCase()} ${p}`))
      .sort();

    const routes = routeOperations().sort();
    expect(routes.length).toBeGreaterThan(40);
    expect(documented).toEqual(routes);
  });
});
