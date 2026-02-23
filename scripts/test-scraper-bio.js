/**
 * One-off test: fetch a real BR player page and log what the scraper extracts
 * for birth_date, hometown, age, jersey_number.
 * Run: node scripts/test-scraper-bio.js
 */
import { parsePlayerPage } from '../scraper/player.js';

const TEST_URL = 'https://www.basketball-reference.com/players/j/jamesle01.html';
const PLAYER_ID = 'jamesle01';

async function main() {
  console.log('Fetching', TEST_URL, '...');
  const res = await fetch(TEST_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BasketballStatsBot/1.0)' },
  });
  if (!res.ok) {
    console.error('Fetch failed:', res.status, res.statusText);
    process.exit(1);
  }
  const html = await res.text();
  console.log('HTML length:', html.length);

  const data = parsePlayerPage(html, PLAYER_ID);

  console.log('\n--- Bio fields extracted ---');
  console.log('birth_date:', data.birth_date ?? '(null)');
  console.log('hometown:', data.hometown ?? '(null)');
  console.log('age:', data.age ?? '(null)');
  console.log('jersey_number:', data.jersey_number ?? '(null)');
  console.log('\nOther:', { name: data.name, team: data.team, position: data.position });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
