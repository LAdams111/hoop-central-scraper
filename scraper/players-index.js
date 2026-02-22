import * as cheerio from 'cheerio';

/**
 * Parse a Basketball Reference players index page (e.g. /players/a/)
 * to extract player IDs and names.
 * @param {string} html - Raw HTML of the index page
 * @param {string} letter - Letter (a-z) for that page
 * @returns {Array<{ playerId: string, name: string }>}
 */
export function parsePlayersIndex(html, letter) {
  const $ = cheerio.load(html);
  const players = [];
  $('table#players tbody tr, .stats_table tbody tr').each((_, tr) => {
    const link = $(tr).find('td a[href*="/players/"]').first();
    if (!link.length) return;
    const href = link.attr('href') || '';
    const match = href.match(/\/players\/[a-z]\/([a-z]+\d+)\.html/);
    if (match) {
      players.push({
        playerId: match[1],
        name: link.text().trim(),
      });
    }
  });
  // Fallback: any link to /players/x/xxxxx.html
  if (players.length === 0) {
    $(`a[href*="/players/${letter}/"]`).each((_, el) => {
      const href = $(el).attr('href') || '';
      const match = href.match(/\/players\/[a-z]\/([a-z]+\d+)\.html/);
      if (match) {
        const name = $(el).text().trim();
        if (name && !players.some(p => p.playerId === match[1])) {
          players.push({ playerId: match[1], name });
        }
      }
    });
  }
  return players;
}
