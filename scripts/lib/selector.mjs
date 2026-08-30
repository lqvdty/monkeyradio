/* Selector (DJ) attribution, parsed out of a Mixcloud cloudcast's title.
 *
 * The station's Mixcloud account uploads every show under one generic
 * "Monkey Radio India" user, so the actual selector's name almost always
 * lives inside the show title itself ("DJ Amul - Vinyl Session",
 * "Dub Vibration ft. Roots Unwired", "Selekta Chakkra | Reggae Roots" ...).
 * djFrom() picks it out; selector() falls back to the upload account's own
 * name, then to the station name, when nothing usable is found.
 *
 * Shared by every build script that needs a show's selector - keep it in
 * one place rather than letting copies drift (this mirrors djFrom() in
 * src/app.jsx, which needs the identical logic client-side and can't
 * import a Node module, so that copy is kept in step by hand).
 */

const NOT_A_DJ = ['indiearth', 'monkey radio', 'monkeyradio', 'monkey sound', 'tune inn', 'souls of sound', 'music manthan', 'disco freak', 'bass sanskriti', 'dub vibration', 'roots unwired', 'aurelia pszichedelia', 'puri juggernaut', 'the situation', 'steppin outta babylon', 'ziggys blunts', 'ziggy blunts', 'deep space traveller', 'folk viber', 'daktadub', 'dakta dub', 'hyderabad underground movement', 'hyderabad hi fi', 'hi fi hyderabad', 'sunday special', 'sunday live', 'excursions in', 'guest mix', 'radio show', 'podcast'];
const ALIASES = ['dj def hawk', 'selekta chakkra', 'amul', 'psylenz', 'berencz balazs', 'dj makarun', 'the groove thief'];
const GENERIC = ['the', 'a', 'of', 'and', 'in', 'on', 'for', 'my', 'our', 'your', 'music', 'musical', 'journey', 'transmission', 'world', 'day', 'vibration', 'vibes', 'special', 'session', 'sessions', 'sound', 'sounds', 'radio', 'show', 'mix', 'mixes', 'set', 'selection', 'live', 'dancehall', 'funk', 'bass', 'soul', 'jazz', 'dub', 'house', 'techno', 'hip', 'hop', 'rap', 'reggae', 'disco', 'edition', 'episode', 'vol', 'volume', 'part', 'night', 'weekend', 'sunday', 'monday', 'friday', 'saturday', 'summer', 'winter', 'new', 'best', 'top'];
const flat = (x) => (x || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Resident selector behind a recurring show - credited only when the title
// itself names no guest, so a "<show> ft <guest>" episode still keeps its
// guest. First regex to match wins.
const RESIDENTS = [
  [/\b(?:dub\s+vibr|tune\s?inn|hyderabad hi.?fi|hi.?fi hyderabad)/i, 'Dakta Dub'],
  [/\bmusic manthan\b/i, 'Selekta Chakkra'],
  [/\broots unwired\b/i, 'Mr Nobody'],
  [/swatantram/i, 'Velugu'],
  [/souls of sound/i, 'Selecta Psylenz'],
  [/\bpuri juggernaut\b/i, 'Shivacult'],
  [/\bthe situation\b/i, 'Kid Move'],
  [/\btransmissions?\b/i, 'Chidakasha'],
  [/di+sco freak/i, 'Amul'],
  [/steppin['`´’]?\s*outta\s+babylon/i, 'Selekta Dreadhead'],
  [/ziggy['`´’]?s?\s+blunts/i, 'Ziggy B'],
  [/funk assassin/i, 'Funk Assassin'],
  [/deep space travellers?/i, 'Dj Ozon and Dr Analog'],
  [/bol hyderabad|musical journey with balu/i, 'Dakta Dub'],
  [/folk\s?viber/i, 'Themeekcrab'],
  [/\bsleepless monk\b/i, 'Sleepless Monk'],
  [/\byidam\b/i, 'Yidam'],
  [/svaha sound system/i, 'Svaha Sound System'],
  [/\bdr\.?\s?dub\b/i, 'Dr.Dub'],
  [/steppa vibration|love vibration|dancehall vibration/i, 'Dakta Dub']
];

// One-off titles that bury the selector's name in phrasing no rule can
// reasonably parse. Checked before everything else.
const OVERRIDES = [
  [/sunday guest mix\s*-\s*george vargas/i, 'George Vargas'],
  [/^\s*george vargas monkey radio india part/i, 'George Vargas'],
  [/\btune in features daham/i, 'Daham'],
  [/monkey radio india\s*-\s*dj quincy/i, 'DJ Quincy'],
  [/sunday special\s*-\s*mr\.?\s*skunk/i, 'Mr.Skunk'],
  [/sunday special\b.*rudy roots selekta/i, 'Rudy Roots Selekta'],
  [/sunday special\s*-\s*roman nz selekta/i, 'Roman NZ Selekta'],
  [/monkey radio india special mix\s*-\s*von dewey/i, 'Von Dewey'],
  [/\bmango\s?-?\s?p-zion highway/i, 'Selecta Mango P'],
  [/cloudcast by daktadub/i, 'Dakta Dub']
];

// The text before a "presents"/"feat"/"showcase" keyword is the station or
// one of its recurring programme names, not a person - so when we see it
// there, the selector is whatever comes after the keyword.
const isShowish = (x) => /monkey|indiearth/i.test(x) || NOT_A_DJ.some((n) => flat(x).indexOf(flat(n)) >= 0);
// A plausible person/act name: <=3 words, letters/digits/basic punctuation,
// no bare article or "of" (those mark a themed episode title, not a name).
const nameish = (x) => x.length >= 2 && x.length <= 34
  && /^[\p{L}\p{N}][\p{L}\p{N}.'’ -]*$/u.test(x)
  && x.split(/\s+/).length <= 3
  && !/\b(?:of|the|a|an|evolution)\b/i.test(x);
const trimTail = (x) => x
  .replace(/\s*[({\[].*$/, '')
  .replace(/\s+-\s+.*$/, '')
  .replace(/\s*\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\s*$/, '')
  .replace(/\s*\b(?:19|20)\d{2}\b\s*$/, '')
  .replace(/\s+from\s+[A-Z][\w'’-]+\s*$/i, '')
  // "<multi-word name>-<show>" glued with a hyphen (e.g.
  // "Rudy Roots Selekta-Bangaranga") - keep the name, drop the show.
  .replace(/([\p{L}\p{N}]+(?:\s+[\p{L}\p{N}]+)+)[-–][\p{L}\p{N}]+\s*$/u, '$1')
  .trim();

export function djFrom(raw) {
  const s = (raw || '').replace(/│/g, '|');
  for (const [re, name] of OVERRIDES) if (re.test(s)) return name;
  const named = pickDj(raw);
  if (named) return named;
  // No guest in the title - fall back to the show's resident selector.
  for (const [re, name] of RESIDENTS) if (re.test(s)) return name;
  return null;
}

function pickDj(raw) {
  let s = (raw || '').replace(/│/g, '|').trim();
  const alias = ALIASES.find((a) => flat(s).indexOf(flat(a)) >= 0);
  if (alias) return alias.replace(/\b\w/g, (c) => c.toUpperCase());
  const bar = s.split('|');
  const barred = bar.length > 1 && bar[0].trim().length > 1;
  if (barred) s = bar[0].trim();
  let cand = null;
  { const m = s.match(/\bby\s+([A-Za-z][^|,]{1,34})$/i); if (m) cand = m[1]; }
  // "<station/show> presents|feat|features|showcase - <guest>"
  if (!cand) {
    const m = s.match(/^(.{2,46}?)\s+(?:presents?|pres\.?|introduces?|introducing|featuring|features?|feat\.?|ft\.?)\s+(.{2,60}?)\s*$/i)
      || s.match(/^(.{2,46}?)\s+(?:presents?|pres\.?|introduces?|introducing|featuring|features?|feat\.?|ft\.?)\s+([^-–(){}[\]]{2,40}?)\s*(?=[-–(]|\s\d|$)/i)
      || s.match(/\bexcursions in dub\s?techno\b.*?\)\s*(.{2,40}?)\s+\d/i)
      || s.match(/\bshowcase\s*[-–]\s*(.{2,60}?)\s*$/i);
    if (m) {
      const after = trimTail((m.length > 2 ? m[2] : m[1]).trim());
      if ((m.length <= 2 || isShowish(m[1])) && nameish(after)) cand = after;
    }
  }
  if (!cand) { const i = s.indexOf(' - '); if (i > 1 && i < 52) cand = s.slice(0, i); }
  if (!cand) { const m = s.match(/^(.{2,46}?)\s+(?:presents|present|pres\.?)\s+/i); if (m) cand = m[1]; }
  if (!cand) { const m = s.match(/^(.{2,46}?)\s+(?:feat\.?|ft\.?|w\/)\s+/i); if (m) cand = m[1]; }
  if (!cand && barred) cand = s;
  if (!cand) return null;
  cand = cand.replace(/\s+(?:feat\.?|ft\.?|w\/|with)\s+.*$/i, '');
  cand = cand.replace(/\s*\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\s*$/, '');
  cand = cand.replace(/\s*\b(?:19|20)\d{2}\b\s*$/, '');
  cand = cand.split(' - ')[0];
  const w = cand.match(/\b(?:with|w\/)\s+(.{2,36})$/i);
  if (w) cand = w[1];
  cand = cand.replace(/^[\s\-–_.,:]+/, '').replace(/[\s\-–_.,:]+$/, '').trim();
  cand = cand.replace(/\s{2,}/g, ' ');
  if (cand.length < 2 || cand.length > 44) return null;
  if (/^\d+$/.test(cand)) return null;
  const fc = flat(cand);
  if (NOT_A_DJ.some((n) => fc.indexOf(flat(n)) >= 0)) return null;
  if (/monkey/i.test(cand)) return null;
  if (/^\d{1,2}[-./]\d{1,2}[-./]\d{2,4}/.test(cand) || cand.indexOf('__') >= 0) return null;
  if (cand.toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean).every((x) => GENERIC.indexOf(x) >= 0)) return null;
  if (/\b(fm|f\.m\.|radio|station)\b/i.test(cand)) return null;
  if (/\b\d+\s*(st|nd|rd|th)\s+(anniversary|birthday|edition)\b/i.test(cand)) return null;
  if (/\b(special|episode|vol|volume|part|mixtape|session|mix|mixes|show|set|selection|takeover|edition)\b\s*\d*$/i.test(cand)) return null;
  if (/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i.test(cand)) return null;
  return cand;
}

export function selector(c) {
  let dj = djFrom(c.name || '');
  if (!dj && c.user && c.user.name && c.user.name !== 'Monkey Radio India') dj = c.user.name;
  return dj || 'Monkey Radio India';
}
