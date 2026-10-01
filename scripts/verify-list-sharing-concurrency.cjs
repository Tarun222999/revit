// Local-only DB concurrency verification. Never connects to a hosted project.
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const container = 'revit-tar197-test-db';
const owner = '88888888-8888-4888-8888-888888888888';
const list = '99999999-9999-4999-8999-999999999999';

function sql(query, onResult = () => {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', ['exec', '-i', container, 'psql', '-qAt', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1'], { windowsHide: true });
    let output = '';
    child.stdout.on('data', (chunk) => {
      output += chunk;
      if (output.includes('"version"')) onResult();
    });
    child.stderr.on('data', () => {});
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve(output.trim()) : reject(new Error('Local SQL verification failed.')));
    child.stdin.end(query);
  });
}
function manage(action, version, key = null) {
  return `select public.manage_list_sharing('${list}', '${owner}', '${action}', ${version}, ${key ? `'${key}'` : 'null'});`;
}
function result(output) { return JSON.parse(output.split('\n').find((line) => line.startsWith('{'))); }
async function race(first, second) {
  let release;
  const locked = new Promise((resolve) => { release = resolve; });
  const pending = sql(`begin; ${first} select pg_sleep(0.5); commit;`, release);
  // The first management result is emitted while its transaction still owns the lock.
  await Promise.race([locked, pending.then(() => { throw new Error('No lock result received.'); })]);
  const other = sql(second);
  return (await Promise.all([pending, other])).map(result);
}
(async () => {
  try {
    await sql(`insert into auth.users(id) values('${owner}');
      insert into public.profiles(id, username, display_name) values('${owner}', 'share_concurrency', 'Concurrency');
      insert into public.lists(id, user_id, name) values('${list}', '${owner}', 'Concurrent sharing');`);
    const [first, other] = await race(manage('share', 0, 'a'.repeat(64)), manage('share', 0, 'b'.repeat(64)));
    assert.equal(first.shareKey, other.shareKey);
    assert.equal(first.version, 1);
    const [stopped, staleCreate] = await race(manage('stop', 1), manage('share', 1, 'c'.repeat(64)));
    assert.equal(stopped.shareKey, null);
    assert.equal(staleCreate.code, 'sharing_conflict');
    const [enabled, staleStop] = await race(manage('share', 2, 'd'.repeat(64)), manage('stop', 1));
    assert.equal(enabled.version, 3);
    assert.equal(staleStop.code, 'sharing_conflict');
    console.log('PASS: concurrent first share, stop/create race, and re-enable/stale-stop race.');
  } finally {
    await sql(`delete from auth.users where id = '${owner}';`);
  }
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
