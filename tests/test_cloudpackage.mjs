// Fix 55c: all three cloud items shown when the box has a Box ID and a saved Cloud Server URL
class CL { constructor(){ this.s = new Set(['hidden']); } add(c){this.s.add(c)} remove(c){this.s.delete(c)} contains(c){return this.s.has(c)} }
const els = { cloudsyncregion: {classList: new CL()}, cloudpackageregion: {classList: new CL()}, 'server_url-input': {dataset:{}} };
globalThis.document = { getElementById: (id) => els[id] || null };
const m = await import('./cloudpackage.mjs');
let P = 0, F = 0; const check = (n, ok) => { ok ? P++ : F++; console.log((ok ? '  [PASS] ' : '  [FAIL] ') + n); };
const sync = () => !els.cloudsyncregion.classList.contains('hidden'), pkg = () => !els.cloudpackageregion.classList.contains('hidden');
const both = (v) => sync() === v && pkg() === v; const url = els['server_url-input'];
m.updateCloudPackageVisibility(); check('nothing loaded: all hidden', both(false));
m.noteSavedCloudValue(url, 'http://server'); check('URL only (Box ID not loaded yet): all hidden', both(false));
m.noteBoxId('48-22-9b-0b-fd-f3'); check('Box ID + URL: all three shown (no Auth Key needed)', both(true));
m.noteSavedCloudValue(url, '   '); check('URL saved blank: all hidden', both(false));
m.noteSavedCloudValue(url, 'http://server'); check('URL saved again: shown', both(true));
m.noteBoxId('Error: Command failed: cat /sys/class/net/eth0/address'); check('Box ID is an error message: all hidden', both(false));
m.noteBoxId('48:22:9B:0B:FD:F3'); check('Box ID with colons / capitals: shown', both(true));
url.value = ''; m.updateCloudPackageVisibility(); check('URL typed away but not saved: still shown', both(true));
console.log(`\nResults: ${P} passed, ${F} failed`); process.exit(F ? 1 : 0);
