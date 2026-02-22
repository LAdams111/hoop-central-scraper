import * as cheerio from 'cheerio';

const BASE = 'https://www.basketball-reference.com';

/**
 * Parse a team's season page HTML from Basketball Reference.
 * @param {string} html - Raw HTML of the team page
 * @param {string} teamId - BR team abbreviation (e.g. 'LAL')
 * @param {string|number} season - Season year (e.g. 2025 for 2024-25)
 * @returns {Object} Parsed team info and stats
 */
export function parseTeamPage(html, teamId, season) {
  const $ = cheerio.load(html);

  const h1Text = $('h1').first().text().trim();
  // "2024-25\n      Los Angeles Lakers\n    Roster and Stats" -> "Los Angeles Lakers"
  const nameMatch = h1Text.match(/\s+([^\n]+(?:Lakers|Celtics|Nets|Knicks|76ers|Raptors|Bulls|Cavaliers|Pistons|Pacers|Bucks|Hawks|Hornets|Heat|Magic|Wizards|Nuggets|Timberwolves|Thunder|Trail Blazers|Jazz|Warriors|Clippers|Suns|Kings|Mavericks|Rockets|Grizzlies|Pelicans|Spurs)[^\n]*)/i)
    || h1Text.match(/\n\s+([A-Za-z ].+?)(?:\n|Roster|$)/);
  const name = (nameMatch ? nameMatch[1].trim() : h1Text).replace(/\s*Roster and Stats\s*$/i, '').trim();

  const allP = $('p').map((i, el) => $(el).text()).get().join(' ');
  const recordMatch = allP.match(/Record:\s*(\d+)-(\d+)/);
  const record = recordMatch
    ? { wins: parseInt(recordMatch[1], 10), losses: parseInt(recordMatch[2], 10) }
    : null;

  const ptsPerGame = allP.match(/PTS\/G:\s*([\d.]+)/);
  const oppPtsPerGame = allP.match(/Opp PTS\/G:\s*([\d.]+)/);
  const srsMatch = allP.match(/SRS[:\s]*([-\d.]+)/);
  const paceMatch = allP.match(/Pace[:\s]*([\d.]+)/);
  const offRtgMatch = allP.match(/Off Rtg[:\s]*([\d.]+)/);
  const defRtgMatch = allP.match(/Def Rtg[:\s]*([\d.]+)/);

  const roster = [];
  // Team per-game table uses name_display (not "player") and pts_per_g
  const statsTable = $('table').filter((_, t) => $(t).find('td[data-stat="pts_per_g"]').length && $(t).find('td[data-stat="name_display"]').length).first();
  if (statsTable.length) {
    statsTable.find('tbody tr').each((__, tr) => {
      const $tr = $(tr);
      const nameCell = $tr.find('td[data-stat="name_display"]');
      const playerLink = nameCell.find('a');
      const player = (playerLink.length ? playerLink.text() : nameCell.text()).trim();
      const playerId = (playerLink.attr('href') || '').match(/\/players\/[a-z]\/([a-z]+\d+)\.html/)?.[1];
      roster.push({
        playerId: playerId || null,
        player,
        pos: $tr.find('td[data-stat="pos"]').text().trim() || null,
        age: parseCell($tr, 'age'),
        g: parseCell($tr, 'g'),
        gs: parseCell($tr, 'gs'),
        mp: parseCell($tr, 'mp_per_g'),
        pts: parseCell($tr, 'pts_per_g'),
        trb: parseCell($tr, 'trb_per_g'),
        ast: parseCell($tr, 'ast_per_g'),
        fg_pct: parseCell($tr, 'fg_pct'),
        fg3_pct: parseCell($tr, 'fg3_pct'),
        ft_pct: parseCell($tr, 'ft_pct'),
      });
    });
  }

  return {
    teamId,
    season: String(season),
    name: name || h1Text.replace(/\s*Roster.*$/i, '').trim(),
    record,
    ptsPerGame: ptsPerGame ? parseFloat(ptsPerGame[1]) : null,
    oppPtsPerGame: oppPtsPerGame ? parseFloat(oppPtsPerGame[1]) : null,
    srs: srsMatch ? parseFloat(srsMatch[1]) : null,
    pace: paceMatch ? parseFloat(paceMatch[1]) : null,
    offRtg: offRtgMatch ? parseFloat(offRtgMatch[1]) : null,
    defRtg: defRtgMatch ? parseFloat(defRtgMatch[1]) : null,
    roster,
    url: `${BASE}/teams/${teamId}/${season}.html`,
  };
}

function parseCell($row, dataStat) {
  // Team tables use "games" not "g", "games_started" not "gs"
  const stat = dataStat === 'g' ? ['g', 'games'] : dataStat === 'gs' ? ['gs', 'games_started'] : [dataStat];
  for (const s of stat) {
    const text = $row.find(`td[data-stat="${s}"]`).text().trim();
    if (text === '') continue;
    const num = parseFloat(text);
    return isNaN(num) ? text : num;
  }
  return null;
}
