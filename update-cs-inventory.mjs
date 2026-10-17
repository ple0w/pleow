// CS2 envanterini Steam'den çekip cs-inventory.json üretir.
// Elle:  node update-cs-inventory.mjs      (Node 18+)
// Otomatik: GitHub Actions bunu 12 saatte bir çalıştırır (update-cs-inventory.yml)
import { writeFileSync } from 'node:fs';

const ID = process.argv[2] || '76561199441806035';
const url = `https://steamcommunity.com/inventory/${ID}/730/2?l=english&count=300`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

let j = null, lastStatus = 0;
for (let attempt = 1; attempt <= 4; attempt++) {
  const r = await fetch(url, { headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' } });
  lastStatus = r.status;
  if (r.ok) { j = await r.json().catch(() => null); break; }
  console.error(`Deneme ${attempt}: Steam ${r.status}`);
  if (attempt < 4) await sleep(30000);
}
if (!j) { console.error(`Steam cevap vermedi (son durum ${lastStatus}). Eski dosya korunuyor.`); process.exit(1); }
if (!j.assets || !j.descriptions) {
  console.error('Envanter boş ya da gizli (Steam > Gizlilik > Envanter: Herkese açık olmalı).');
  process.exit(1);
}

const descs = {};
j.descriptions.forEach(d => { descs[d.classid + '_' + d.instanceid] = d; });
const rarityWeight = { '#eb4b4b': 6, '#d32ce6': 5, '#8847ff': 4, '#4b69ff': 3, '#5e98d9': 2, '#b0c3d9': 1 };
const SKIP_TYPES = ['CSGO_Type_Collectible', 'CSGO_Type_MusicKit']; // madalya, coin, rozet, müzik kiti
const BONUS_TYPES = ['CSGO_Type_Knife', 'Type_Hands'];               // bıçak ve eldivenler öne çıksın

let items = j.assets.map(a => {
  const d = descs[a.classid + '_' + a.instanceid];
  if (!d) return null;
  const tags = d.tags || [];
  const type = (tags.find(t => t.category === 'Type') || {}).internal_name || '';
  if (SKIP_TYPES.includes(type)) return null;
  const rt = tags.find(t => t.category === 'Rarity');
  const color = rt ? rt.color : '';
  const hasStickers = /sticker/i.test((d.descriptions || []).map(x => x.value || '').join(' ')) || /sticker/i.test(d.market_name || '');
  return {
    name: d.market_hash_name || d.market_name || d.name || 'Item',
    icon: d.icon_url ? `https://community.cloudflare.steamstatic.com/economy/image/${d.icon_url}/120x90` : '',
    rarity: color,
    _w: (rarityWeight['#' + color] || 0) + (hasStickers ? 0.5 : 0) + (BONUS_TYPES.includes(type) ? 1 : 0),
  };
}).filter(Boolean);

items.sort((a, b) => b._w - a._w);
items = items.slice(0, 24).map(({ _w, ...rest }) => rest);

const out = { ok: true, items, count: j.total_inventory_count || items.length };
writeFileSync('cs-inventory.json', JSON.stringify(out));
console.log(`Tamam: toplam ${out.count} eşya, ${items.length} skin cs-inventory.json dosyasına yazıldı.`);
