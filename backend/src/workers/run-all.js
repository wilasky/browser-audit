// Manual one-shot sync of all feeds. Used in CI and for initial data load.
import { syncUrlhaus } from './sync-urlhaus.js';
import { syncMalwareBazaar } from './sync-malwarebazaar.js';
import { syncDisconnectMe } from './sync-disconnectme.js';
import { syncPhishTank } from './sync-phishtank.js';

const log = {
  info: (msg) => console.error(`[INFO] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
};

async function main() {
  const results = await Promise.allSettled([
    syncUrlhaus(log),
    syncMalwareBazaar(log),
    syncDisconnectMe(log),
    syncPhishTank(log),
  ]);

  for (const [i, r] of results.entries()) {
    const name = ['URLhaus', 'MalwareBazaar', 'DisconnectMe', 'PhishTank'][i];
    if (r.status === 'rejected') {
      console.error(`${name}: FAILED — ${r.reason?.message}`);
    } else {
      console.error(`${name}: OK — ${r.value} records`);
    }
  }
}

main();
