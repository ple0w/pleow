const CLIENT_ID = process.env.OSU_CLIENT_ID;
const CLIENT_SECRET = process.env.OSU_CLIENT_SECRET;
const PUSH_SECRET = process.env.OSU_PUSH_SECRET;
const OSU_USER = process.env.OSU_USER || 'batuanfurkan5';
const OSU_MODE = process.env.OSU_MODE || 'mania';
const WORKER_URL = 'https://pleow-site.pqkalem.workers.dev/osu/push';

async function main() {
  const tokenRes = await fetch('https://osu.ppy.sh/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'client_credentials',
      scope: 'public',
    }),
  });
  if (!tokenRes.ok) throw new Error('token failed: ' + tokenRes.status);
  const { access_token } = await tokenRes.json();
  
  const r = await fetch(`https://osu.ppy.sh/api/v2/users/${encodeURIComponent(OSU_USER)}/${OSU_MODE}`, {
    headers: { Authorization: `Bearer ${access_token}`, Accept: 'application/json' },
  });
  if (!r.ok) throw new Error('user fetch failed: ' + r.status);
  const p = await r.json();
  const s = p.statistics || {};

  const payload = {
    ok: true,
    user: {
      username: p.username, name: p.username,
      user_id: p.id, id: p.id,
      pp_rank: s.global_rank || null,
      global_rank: s.global_rank || null,
      pp_country_rank: s.country_rank || null,
      country_rank: s.country_rank || null,
      pp_raw: s.pp ? Math.round(s.pp) : null,
      pp: s.pp ? Math.round(s.pp) : null,
      accuracy: (s.hit_accuracy != null) ? s.hit_accuracy.toFixed(2) : null,
      playcount: s.play_count != null ? s.play_count : null,
      ranked_score: s.ranked_score != null ? s.ranked_score : null,
      total_score: s.total_score != null ? s.total_score : null,
      level: (s.level && s.level.current != null) ? s.level.current : null,
      count_ss: (s.grade_counts ? (s.grade_counts.ss || 0) + (s.grade_counts.ssh || 0) : 0),
      count_s: (s.grade_counts ? (s.grade_counts.s || 0) + (s.grade_counts.sh || 0) : 0),
      count_a: (s.grade_counts ? (s.grade_counts.a || 0) : 0),
      country: (p.country && p.country.code) || p.country_code || null,
      seconds_played: s.play_time != null ? s.play_time : null,
      avatar: p.avatar_url || `https://a.ppy.sh/${p.id}`,
      profile: `https://osu.ppy.sh/users/${p.id}`,
      profileurl: `https://osu.ppy.sh/users/${p.id}/${OSU_MODE}`,
      mode: OSU_MODE,
    },
  };

  const push = await fetch(WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${PUSH_SECRET}` },
    body: JSON.stringify(payload),
  });
  const out = await push.json();
  console.log('pushed:', out);
  if (!push.ok) throw new Error('push failed: ' + push.status);
}

main().catch((e) => { console.error(e); process.exit(1); });
