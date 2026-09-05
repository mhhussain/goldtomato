// Saved example Scripts — a demo with an empty editor starts with typing.

export interface Example {
  name: string;
  script: string;
  params: string; // JSON array of Params objects, as edited
}

export const EXAMPLES: Example[] = [
  {
    name: 'Hacker News top story',
    script: `await page.goto('https://news.ycombinator.com');
const title = await page.locator('.titleline > a').first().textContent();
log('Top story:', title);
await page.locator('.titleline > a').first().click();
await page.waitForLoadState('domcontentloaded');
log('Landed on:', page.url());`,
    params: '[{}]',
  },
  {
    name: 'Search Wikipedia (parameterized)',
    script: `await page.goto('https://en.wikipedia.org');
await page.getByRole('searchbox').fill(params.query);
await page.keyboard.press('Enter');
await page.waitForLoadState('domcontentloaded');
log('Result for', params.query, '→', await page.title());`,
    params: JSON.stringify(
      [{ query: 'Playwright (software)' }, { query: 'Cloud computing' }, { query: 'Tomato' }],
      null,
      2,
    ),
  },
];
