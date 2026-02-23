import * as cheerio from 'cheerio';

const BASE = 'https://www.basketball-reference.com';

const MONTHS = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };

/** Parse "December 30, 1984" or "1984-12-30" to ISO date YYYY-MM-DD, or null. */
function parseBornDate(str) {
  if (!str || typeof str !== 'string') return null;
  const s = str.trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return s;
  const m = s.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (m) {
    const month = MONTHS[m[1].toLowerCase()];
    if (!month) return null;
    const day = Math.max(1, Math.min(31, parseInt(m[2], 10)));
    const year = parseInt(m[3], 10);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  const yearOnly = s.match(/^(\d{4})$/);
  if (yearOnly) return `${yearOnly[1]}-01-01`;
  return null;
}

/** Age in years from YYYY-MM-DD birth date. */
function ageFromBirthDate(isoDate) {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const [y, m, d] = isoDate.split('-').map(Number);
  const today = new Date();
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age -= 1;
  return age >= 0 ? age : null;
}

/**
 * Parse a player's page HTML from Basketball Reference.
 * @param {string} html - Raw HTML of the player page
 * @param {string} playerId - BR player id (e.g. 'jamesle01')
 * @returns {Object} Parsed player info and stats
 */
export function parsePlayerPage(html, playerId) {
  const $ = cheerio.load(html);

  // Name from title fallback (page often uses <title>LeBron James Stats...)
  let name = $('h1[itemprop="name"]').first().text().trim();
  if (!name) {
    const title = $('title').text().trim();
    const m = title.match(/^([^|]+)/);
    if (m) name = m[1].replace(/\s*Stats.*$/i, '').trim();
  }
  const teamLink = $('a[href*="/teams/"]').filter((i, el) => {
    const text = $(el).text().trim();
    return text && text.length <= 4 && /^[A-Z]{3}$/.test(text);
  }).first();
  const team = teamLink.text().trim() || null;
  const posPara = $('p').filter((i, el) => $(el).text().includes('Position:'));
  const position = posPara.length ? posPara.first().text().replace(/Position:\s*/i, '').split(/\s*▪/)[0].trim() : null;

  // Height & weight: BR uses span[itemprop] or displays "6-9, 250lb (206cm, 113kg)" in a paragraph
  let height = $('span[itemprop="height"]').first().text().trim() || null;
  let weight = $('span[itemprop="weight"]').first().text().trim() || null;
  const allPText = $('p').map((i, el) => $(el).text()).get().join(' ');
  const posText = posPara.length ? posPara.first().text() : '';
  const bodyText = posText + ' ' + allPText;
  if (!height || !weight) {
    const hwMatch = bodyText.match(/(\d-\d+(?:\.\d+)?)\s*,\s*(\d+)\s*lb/i);
    if (hwMatch) {
      if (!height) height = hwMatch[1].trim();           // e.g. "6-9"
      if (!weight) weight = hwMatch[2].trim() + ' lb';  // e.g. "250 lb"
    }
  }

  // Birth date: span[itemprop="birthDate"] or "Born: Month Day, Year in ..."
  let birthDate = $('span[itemprop="birthDate"]').first().attr('content') || $('span[itemprop="birthDate"]').first().text().trim() || null;
  let hometown = null;
  const bornMatch = bodyText.match(/Born:\s*([^ in]+(?:\s+\d{1,2},?\s+\d{4})?)\s*(?:in\s+(.+?))?(?:\s*[▪•]|$|High\s|College|Draft)/i);
  if (bornMatch) {
    const datePart = bornMatch[1].trim();
    if (!birthDate && datePart) {
      const parsed = parseBornDate(datePart);
      birthDate = parsed; // ISO YYYY-MM-DD or null
    }
    if (bornMatch[2]) hometown = bornMatch[2].replace(/\s*[▪•].*$/i, '').trim() || null;
  }
  if (birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    const parsed = parseBornDate(birthDate);
    if (parsed) birthDate = parsed;
  }

  // Jersey number: "No. 23" or "#23" in intro text
  let jerseyNumber = null;
  const noMatch = bodyText.match(/\bNo\.\s*(\d{1,3})\b/i) || bodyText.match(/#(\d{1,3})\b/);
  if (noMatch) jerseyNumber = noMatch[1];

  // Age from birth_date (current age as of today)
  const age = birthDate ? ageFromBirthDate(birthDate) : null;

  // Summary stats (current season + career) from the summary section
  const summary = {};
  const summaryGrid = $('.stats_pullout').first();
  if (summaryGrid.length) {
    summaryGrid.find('div').each((i, div) => {
      const $div = $(div);
      const stat = $div.find('.p1').text().trim();
      const vals = $div.find('.p2, .p3').map((_, el) => $(el).text().trim()).get();
      if (stat && vals.length >= 1) summary[stat] = vals.length === 2 ? { current: vals[0], career: vals[1] } : vals[0];
    });
  }

  // Per-game table: inside #div_per_game_stats (regular season), table id = playerId
  const perGame = [];
  let table = $(`#div_per_game_stats table#${playerId}`).first();
  if (!table.length) {
    table = $('table').filter((_, t) => $(t).find('th[data-stat="pts_per_g"]').length).first();
  }
  if (table.length) {
    const headers = [];
    table.find('thead th').each((i, th) => {
      const dataStat = $(th).attr('data-stat');
      if (dataStat) headers.push(dataStat);
    });
    table.find('tbody tr').each((_, tr) => {
      const row = {};
      $(tr).find('td, th').each((j, cell) => {
        const dataStat = $(cell).attr('data-stat');
        if (dataStat && headers.includes(dataStat)) {
          let val = $(cell).text().trim();
          const num = parseFloat(val);
          row[dataStat] = isNaN(num) ? val : num;
        }
      });
      if (Object.keys(row).length) perGame.push(row);
    });
  }

  return {
    playerId,
    name,
    team,
    position,
    height,
    weight,
    birth_date: birthDate ?? null,
    hometown: hometown ?? null,
    jersey_number: jerseyNumber ?? null,
    age: age != null ? age : null,
    summary,
    perGame,
    url: `${BASE}/players/${playerId.charAt(0)}/${playerId}.html`,
  };
}
