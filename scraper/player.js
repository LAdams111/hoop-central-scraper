import * as cheerio from 'cheerio';

const BASE = 'https://www.basketball-reference.com';

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
  const height = $('span[itemprop="height"]').text().trim() || null;
  const weight = $('span[itemprop="weight"]').text().trim() || null;

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
    summary,
    perGame,
    url: `${BASE}/players/${playerId.charAt(0)}/${playerId}.html`,
  };
}
