// Read-only static contract inventory. Run --sql via a privileged metadata-only connection,
// or --check with psql/libpq PG* environment variables. Never embeds credentials.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import assert from 'node:assert/strict'
import ts from 'typescript'
const ident = /^[a-z_][a-z0-9_]*$/i
const literal = node => node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) ? node.text : null
function scan(text, file) {
  const src = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const refs = [], dynamic = []
  function visit(n) {
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) {
      const method = n.expression.name.text, receiver = n.expression.expression.getText(src)
      if (['from', 'rpc'].includes(method) && !/^(?:Array|Buffer)$/.test(receiver) && !/(?:^|\.)storage$/.test(receiver)) {
        const name = literal(n.arguments[0]); const line = src.getLineAndCharacterOfPosition(n.getStart(src)).line + 1
        if (name && ident.test(name)) {
          const ref = { kind: method === 'rpc' ? 'rpc' : 'relation', name, file, line, columns: [], args: null }
          if (method === 'rpc') {
            const a = n.arguments[1]
            if (!a) ref.args = []
            else if (ts.isObjectLiteralExpression(a) && a.properties.every(p => p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) && ident.test(p.name.text))) ref.args = a.properties.map(p => p.name.text).sort()
          } else {
            let prev = n
            while (prev.parent && ts.isPropertyAccessExpression(prev.parent) && prev.parent.expression === prev && prev.parent.parent && ts.isCallExpression(prev.parent.parent) && prev.parent.parent.expression === prev.parent) {
              const chain = prev.parent.parent, op = prev.parent.name.text, arg = literal(chain.arguments[0])
              if (op === 'select' && arg) {
                // Skip embedded PostgREST joins and JSON/alias syntax, rather than making false assertions.
                const cols = arg.split(',').map(x => x.trim())
                if (cols.every(x => x === '*' || ident.test(x))) ref.columns.push(...cols.filter(x => x !== '*'))
              } else if (['eq','neq','gt','gte','lt','lte','like','ilike','is','in','order','filter','not','contains','containedBy','overlaps','match'].includes(op) && arg && ident.test(arg)) ref.columns.push(arg)
              prev = chain
            }
          }
          ref.columns = [...new Set(ref.columns)].sort(); refs.push(ref)
        } else if (method === 'rpc' || name === null) dynamic.push({ method, file, line })
      }
    }
    ts.forEachChild(n, visit)
  }
  visit(src); return { refs, dynamic }
}
function inventory(root) {
  const refs = [], dynamic = []
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(p)
      else if (/\.(?:tsx?|jsx?)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
        const result = scan(fs.readFileSync(p, 'utf8'), path.relative(root, p).split(path.sep).join('/'))
        refs.push(...result.refs); dynamic.push(...result.dynamic)
      }
    }
  }
  for (const d of ['app', 'lib', 'components']) if (fs.existsSync(path.join(root, d))) walk(path.join(root, d))
  return { refs, dynamic }
}
function sqlFor(refs) {
  const unique = new Map()
  for (const { kind, name, columns, args } of refs) {
    const k = JSON.stringify([kind, name, args]); const v = unique.get(k) || { kind, name, columns: [], args }
    v.columns = [...new Set([...v.columns, ...columns])].sort(); unique.set(k, v)
  }
  const json = JSON.stringify([...unique.values()]).replaceAll("'", "''")
  return `WITH expected AS (SELECT * FROM jsonb_to_recordset('${json}'::jsonb) AS x(kind text,name text,columns text[],args text[])),
relations AS (SELECT c.oid,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f')),
functions AS (SELECT p.proname,COALESCE(p.proargnames[1:p.pronargs],ARRAY[]::text[]) AS names,COALESCE(p.proargnames[1:(p.pronargs-p.pronargdefaults)],ARRAY[]::text[]) AS required FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind='f'),
failures AS (
 SELECT 'missing_relation' AS problem,e.name,'' AS detail FROM expected e WHERE e.kind='relation' AND NOT EXISTS(SELECT 1 FROM relations r WHERE r.relname=e.name)
 UNION SELECT 'missing_column',e.name,col FROM expected e JOIN relations r ON r.relname=e.name CROSS JOIN LATERAL unnest(e.columns) col WHERE e.kind='relation' AND NOT EXISTS(SELECT 1 FROM pg_attribute a WHERE a.attrelid=r.oid AND a.attnum>0 AND NOT a.attisdropped AND a.attname=col)
 UNION SELECT 'rpc_contract',e.name,COALESCE(array_to_string(e.args,','),'dynamic_args') FROM expected e WHERE e.kind='rpc' AND NOT EXISTS(SELECT 1 FROM functions f WHERE f.proname=e.name AND (e.args IS NULL OR (e.args <@ f.names AND f.required <@ e.args)))
) SELECT COALESCE(jsonb_agg(to_jsonb(f) ORDER BY problem,name,detail),'[]'::jsonb) FROM failures f;`
}
if (process.argv.includes('--self-test')) {
  const { refs, dynamic } = scan("db.from('employees').select('id,full_name').eq('id',x); db.rpc('f',{ p_id:x }); db.rpc(name,args); Array.from('abc'); db.storage.from('private');", 'sample.ts')
  assert.equal(refs.length, 2); assert.deepEqual(refs[0].columns, ['full_name','id']); assert.deepEqual(refs[1].args, ['p_id']); assert.equal(dynamic.length,1); assert.match(sqlFor(refs),/rpc_contract/); console.log('Database contract scanner self-test PASS')
} else {
  const result = inventory(process.cwd())
  if (process.argv.includes('--sql')) console.log(sqlFor(result.refs))
  else if (process.argv.includes('--check')) {
    // libpq PG* variables / pgpass are configured outside source. No SQL writes.
    const r = spawnSync('psql', ['-X','-v','ON_ERROR_STOP=1','-At','-c',sqlFor(result.refs)], { encoding: 'utf8', timeout: 30000, env: { ...process.env, PGOPTIONS: '-c default_transaction_read_only=on -c statement_timeout=15000' } })
    if (r.error || r.status !== 0) { console.error('BLOCKED: psql catalog check failed; check connection and permissions.'); process.exitCode = 2 }
    else { const failures = JSON.parse(r.stdout.trim()); console.log(JSON.stringify({ failures, unresolvedDynamicCalls: result.dynamic }, null, 2)); if (failures.length) process.exitCode = 1 }
  } else console.log(JSON.stringify(result, null, 2))
}
