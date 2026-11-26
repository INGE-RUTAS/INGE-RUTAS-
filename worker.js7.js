export default {
  async fetch(req) {
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };
    const json = (o, st = 200) => new Response(JSON.stringify(o), { status: st, headers: { ...cors, 'content-type': 'application/json' } });
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

    const u = new URL(req.url).searchParams.get('u') || '';
    if (!/^https:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs|(www\.)?google\.[a-z.]+\/maps|maps\.google\.[a-z.]+)/i.test(u)) return json({ error: 'enlace no valido' }, 400);

    const pats = [
      /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
      /\/maps\/place\/(-?\d+\.\d+),\s*(-?\d+\.\d+)/,
      /[?&](?:q|ll|query|destination|daddr)=(-?\d+\.\d+)(?:,|%2C)\s*(-?\d+\.\d+)/i,
      /center=(-?\d+\.\d+)(?:,|%2C)(-?\d+\.\d+)/,
      /@(-?\d+\.\d+),\s*(-?\d+\.\d+)/,
      /\[null,null,(-?\d+\.\d+),(-?\d+\.\d+)\]/
    ];
    const buscar = (t) => {
      let d = t; try { d = decodeURIComponent(t); } catch (e) {}
      for (const x of [t, d]) for (const re of pats) {
        const m = x.match(re);
        if (m && +m[1] > -5 && +m[1] < 14 && +m[2] > -80 && +m[2] < -66) return { lat: +m[1], lon: +m[2] };
      }
      return null;
    };

    let url = u, vistos = '';
    const h = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', 'Accept-Language': 'es-CO,es;q=0.9', 'Cookie': 'CONSENT=YES+1; SOCS=CAI' };
    try {
      for (let i = 0; i < 6; i++) {
        const r = await fetch(url, { redirect: 'manual', headers: h });
        const loc = r.headers.get('location');
        if (loc && r.status >= 300 && r.status < 400) {
          url = new URL(loc, url).toString();
          vistos += url + '\n';
          const c = buscar(vistos);
          if (c) return json({ ...c, url });
          continue;
        }
        const c = buscar(vistos + (await r.text()).slice(0, 400000));
        return json(c ? { ...c, url } : { error: 'sin coordenadas', url }, c ? 200 : 404);
      }
    } catch (e) { return json({ error: String(e) }, 500); }
    return json({ error: 'demasiadas redirecciones', url }, 404);
  }
};
