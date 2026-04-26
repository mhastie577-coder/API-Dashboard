const cache = new Map();
function setCache(key, value, ttl = 60000) {
  cache.set(key, { value, expires: Date.now() + ttl });
}
function getCache(key) {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() > e.expires) { cache.delete(key); return null; }
  return e.value;
}

const el = id => document.getElementById(id);
const setLoading = (c, msg='Loading...') => c.innerHTML = `<p class="loading">${msg}</p>`;
const setError = (c, msg='Something went wrong') => c.innerHTML = `<p class="error">${msg}</p>`;
const imgHtml = (src, alt='', cls='') => `<img src="${src}" alt="${alt}" class="${cls}" loading="lazy">`;

/*  Dog API 2 buttons 1 for single dog, 1 for multiple dogs */
async function getDog(single = true) {
  const out = el('dog-output');
  setLoading(out, 'Fetching dog image(s)...');
  try {
    const url = single
      ? 'https://dog.ceo/api/breeds/image/random'
      : 'https://dog.ceo/api/breeds/image/random/3';
    const res = await fetch(url + '?cb=' + Date.now());
    if (!res.ok) throw new Error();
    const data = await res.json();
    const imgs = Array.isArray(data.message) ? data.message : [data.message];
     out.innerHTML = imgs.map((s,i)=>
      `<figure class="media-card">${imgHtml(s, 'Dog '+(i+1), 'thumb')}</figure>`
    ).join('');
  } catch {
    setError(out, 'Failed to load dog image.');
  }
}

/*  Cat API */
async function getCat() {
  const out = el('cat-output');
  setLoading(out, 'Fetching cat image...');
  try {
    const res = await fetch('https://api.thecatapi.com/v1/images/search?cb=' + Date.now());
    if (!res.ok) throw new Error();
    const data = await res.json();
    out.innerHTML = `<figure class="media-card">${imgHtml(data[0].url, 'Cat', 'thumb')}</figure>`;
  } catch {
    setError(out, 'Failed to load cat image.');
  }
}

/* WEATHER API */
async function getWeather(city) {
  const out = el('weather-output');
  city = city.trim();
  if (!city) return setError(out, 'Enter a city.');
  const cacheKey = 'weather:' + city.toLowerCase();
  const cached = getCache(cacheKey);
  if (cached) return out.innerHTML = cached;
  setLoading(out, 'Fetching weather...');
  try {
    const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    const place = data.nearest_area?.[0]?.areaName?.[0]?.value || city;
    const region = data.nearest_area?.[0]?.region?.[0]?.value || '';
    const country = data.nearest_area?.[0]?.country?.[0]?.value || '';
    const current = data.current_condition?.[0] || {};
    const html = `
      <div class="card">
        <h3>${place}${region ? ', '+region : ''}${country ? ', '+country : ''}</h3>
        <p><strong>Condition:</strong> ${current.weatherDesc?.[0]?.value || ''}</p>
        <p><strong>Temp:</strong> ${current.temp_C}°C (${current.temp_F}°F)</p>
        <p><strong>Humidity:</strong> ${current.humidity}%</p>
        <p><strong>Wind:</strong> ${current.windspeedKmph} km/h</p>
      </div>
    `;
    out.innerHTML = html;
    setCache(cacheKey, html, 90000);
  } catch {
    setError(out, 'Failed to load weather.');
  }
}

/* Currency checker */
async function getRates() {
  const out = el('currency-output');
  const code = el('currency-code').value.trim().toUpperCase();
  if (!code) return setError(out, 'Enter a currency code (e.g., EUR).');
  setLoading(out, 'Fetching currency rate...');
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!res.ok) throw new Error();
    const data = await res.json();
    if (data.result !== 'success') throw new Error();
    const rate = data.rates[code];
    if (!rate) return setError(out, `Currency "${code}" not found.`);
    const html = `
      <div class="card">
        <h3>USD → ${code}</h3>
        <p><strong>Rate:</strong> ${rate.toFixed(4)}</p>
        <p class="muted small">Base currency: USD</p>
      </div>
    `; out.innerHTML = html;
  } catch (err) {
    console.error(err);
    setError(out, 'Failed to load currency rate.');
  }
}

/* Trending Movies */
async function getMovies() {
  const out = el('movies-output');
  setLoading(out, 'Fetching movies...');
  try {
    const res = await fetch('https://ghibliapi.vercel.app/films');
    if (!res.ok) throw new Error();
    const data = await res.json();
    const shuffled = data
      .slice()
      .sort(() => Math.random() - 0.5);
    const top = shuffled.slice(0, 5);
    const html = top.map(f => `
      <article class="card movie">
        <h4>${f.title} <span class="muted">(${f.release_date})</span></h4>
        <p class="muted small">${f.director} — ${f.producer}</p>
        <p>${f.description.slice(0,200)}${f.description.length>200?'…':''}</p>
      </article>
    `).join('');
    out.innerHTML = html;
  } catch {
    setError(out, 'Failed to load movies.');
  }
}

/* GITHUB API */
async function getGithubUser(username) {
  const out = el('github-output');
  username = username.trim();
  if (!username) return setError(out, 'Enter a username.');
  const cacheKey = 'gh:' + username.toLowerCase();
  const cached = getCache(cacheKey);
  if (cached) return out.innerHTML = cached;
  setLoading(out, 'Fetching GitHub user...');
  try {
    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`);
    if (res.status === 404) return setError(out, 'User not found.');
    if (!res.ok) throw new Error();
    const u = await res.json();
    const html = `
      <div class="card user">
        ${u.avatar_url ? imgHtml(u.avatar_url, u.login, 'avatar') : ''}
        <h3><a href="${u.html_url}" target="_blank" rel="noopener noreferrer">${u.login}</a></h3>
        <p>${u.name || ''}</p>
        <p>${u.bio || ''}</p>
        <p class="muted">Repos: ${u.public_repos} • Followers: ${u.followers}</p>
      </div>
    `;
    out.innerHTML = html;
    setCache(cacheKey, html, 120000);
  } catch {
    setError(out, 'Failed to load GitHub user.');
  }
}

/* Joke LOL API */
async function getJoke() {
  const out = el('joke-output');
  setLoading(out, 'Fetching a joke...');
  try {
    const res = await fetch('https://official-joke-api.appspot.com/random_joke');
    if (!res.ok) throw new Error();
    const j = await res.json();
    out.innerHTML = `<div class="card"><p><strong>${j.setup}</strong></p><p>${j.punchline}</p></div>`;
  } catch {
    setError(out, 'Failed to load joke.');
  }
}

/* Random History Facts */
async function getHistoryFacts() {
  const out = el('history-output');
  setLoading(out, 'Fetching historical facts...');
  try {
    const res = await fetch('https://history.muffinlabs.com/date');
    if (!res.ok) throw new Error();
    const data = await res.json();
    const events = data.data?.Events;
    if (!Array.isArray(events) || !events.length)
      throw new Error();
   const shuffled = events
      .slice()
      .sort(() => Math.random() - 0.5);
    const top = shuffled.slice(0, 5);
    const html = top.map(e => `
      <article class="card history">
        <h4>${e.year}</h4>
        <p>${e.text}</p>
        ${e.links?.length
          ? `<a href="${e.links[0].link}" target="_blank" rel="noopener noreferrer">Learn more</a>`
          : ''
        }
      </article>
    `).join('');
    out.innerHTML = html;
  } catch (err) {
    console.error(err);
    setError(out, 'Failed to load history facts.');
  }
}
/* Event Listeners */
function init() {
  el('dog-single-btn').addEventListener('click', ()=>getDog(true));
  el('dog-multi-btn').addEventListener('click', ()=>getDog(false));
  el('cat-btn').addEventListener('click', getCat);
  el('weather-btn').addEventListener('click', ()=>getWeather(el('weather-city').value));
  el('currency-btn').addEventListener('click', getRates);
  el('movies-btn').addEventListener('click', getMovies);
  el('github-btn').addEventListener('click', ()=>getGithubUser(el('github-username').value));
  el('joke-btn').addEventListener('click', getJoke);
  el('history-btn').addEventListener('click', getHistoryFacts);
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', init)
  : init();
