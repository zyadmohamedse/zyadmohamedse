import { readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { activityGraphic, consoleGraphic, navigationGraphics, statusGraphic } from './render-console.mjs';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const base = 'https://api.github.com';
const languageLimit = 8;
const dayMs = 86_400_000;
const levels = new Set(['NONE', 'FIRST_QUARTILE', 'SECOND_QUARTILE', 'THIRD_QUARTILE', 'FOURTH_QUARTILE']);

function checkCount(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`GitHub returned an invalid ${label}.`);
  return value;
}

function widgetLanguages(byLanguage) {
  const sorted = [...byLanguage].sort(([leftName, leftCount], [rightName, rightCount]) => rightCount - leftCount || leftName.localeCompare(rightName, 'en-US'));
  const total = sorted.reduce((sum, [, bytes]) => sum + bytes, 0);
  if (!total) return [];
  const selected = sorted.slice(0, sorted.length > 4 ? 3 : 4);
  if (sorted.length > 4) selected.push(['Other', sorted.slice(3).reduce((sum, [, bytes]) => sum + bytes, 0)]);
  return selected.map(([name, bytes]) => ({ name, percent: 100 * bytes / total }));
}

async function githubJson(path, token, body) {
  const headers = { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}` };
  if (body) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${base}${path}`, {
    method: body ? 'POST' : 'GET', headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  if (response.status === 403 || response.status === 401) throw new Error(`GitHub denied access to ${path} (${response.status}). Check the workflow token access.`);
  if (!response.ok) throw new Error(`GitHub API status ${response.status} for ${path}.`);
  return response.json();
}

export async function fetchStats(username, token, now = new Date()) {
  const calendarFrom = new Date(now.toISOString().slice(0, 10) + 'T00:00:00Z');
  calendarFrom.setTime(calendarFrom.getTime() - 364 * dayMs);
  const from = calendarFrom.toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);

  const data = await githubJson('/graphql', token, {
    query: `query($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
          totalCommitContributions
          totalPullRequestContributions
          contributionCalendar {
            totalContributions
            weeks { contributionDays { date contributionCount contributionLevel } }
          }
        }
      }
    }`,
    variables: { login: username, from: calendarFrom.toISOString(), to: now.toISOString() },
  });

  const contributions = data.data?.user?.contributionsCollection;
  const calendar = contributions?.contributionCalendar;
  if (data.errors?.length || !calendar) {
    const details = data.errors?.map(error => error.message).join(' / ') || 'No contribution calendar returned.';
    throw new Error(`GitHub GraphQL error: ${details}`);
  }

  const seenDates = new Set();
  if (!Array.isArray(calendar.weeks) || !calendar.weeks.length || calendar.weeks.length > 54) throw new Error('GitHub returned an invalid contribution calendar.');
  for (const week of calendar.weeks) {
    if (!Array.isArray(week.contributionDays) || week.contributionDays.length > 7) throw new Error('GitHub returned an invalid contribution week.');
    for (const day of week.contributionDays) {
      const date = new Date(`${day.date}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date) || Number.isNaN(+date) || seenDates.has(day.date) || !levels.has(day.contributionLevel)) {
        throw new Error('GitHub returned an invalid contribution day.');
      }
      checkCount(day.contributionCount, 'daily contribution count');
      seenDates.add(day.date);
    }
  }
  if (!seenDates.size) throw new Error('GitHub returned an empty contribution calendar.');

  const owner = encodeURIComponent(username);
  const publicRepos = [];
  for (let page = 1; ; page += 1) {
    const repos = await githubJson(`/users/${owner}/repos?type=owner&sort=pushed&per_page=100&page=${page}`, token);
    if (!Array.isArray(repos)) throw new Error('GitHub returned an invalid repository list.');
    publicRepos.push(...repos.filter(repo => !repo.private));
    if (repos.length < 100) break;
  }
  const stars = publicRepos.reduce((sum, repo) => sum + checkCount(repo.stargazers_count, 'star count'), 0);
  const projects = publicRepos.filter(repo => !repo.fork && repo.name.toLowerCase() !== username.toLowerCase()).slice(0, languageLimit);
  const languageCounts = await Promise.all(projects.map(repo => githubJson(`/repos/${owner}/${encodeURIComponent(repo.name)}/languages`, token)));
  const byLanguage = new Map();
  for (const counts of languageCounts) {
    if (!counts || typeof counts !== 'object' || Array.isArray(counts)) throw new Error('GitHub returned an invalid language breakdown.');
    for (const [language, bytes] of Object.entries(counts)) {
      byLanguage.set(language, (byLanguage.get(language) || 0) + checkCount(bytes, 'language byte count'));
    }
  }

  return {
    source: 'github-api', from, to, updatedAt: to,
    total: checkCount(calendar.totalContributions, 'total contribution count'),
    commits: checkCount(contributions.totalCommitContributions, 'commit count'),
    pullRequests: checkCount(contributions.totalPullRequestContributions, 'pull request count'),
    weeks: calendar.weeks,
    repos: publicRepos.length,
    stars,
    languages: widgetLanguages(byLanguage),
  };
}

export async function refreshConsole({ root = repoRoot, snapshot = false, token } = {}) {
  const path = name => join(root, name);
  const [config, portrait] = await Promise.all([
    readFile(path('profile.json'), 'utf8').then(JSON.parse),
    readFile(path('assets/portrait-glyphs.json'), 'utf8').then(JSON.parse),
  ]);

  if (!snapshot && !token) throw new Error('Set GH_TOKEN or run with --snapshot.');
  const stats = snapshot
    ? await readFile(path('assets/public-snapshot.json'), 'utf8').then(JSON.parse)
    : await fetchStats(config.username, token);
  const images = {
    'command-center.svg': consoleGraphic(config, portrait, stats),
    'activity.svg': activityGraphic(stats),
    'status.svg': statusGraphic(config),
    ...navigationGraphics(),
  };

  for (const [name, image] of Object.entries(images)) {
    const destination = path(`assets/${name}`);
    const temporaryFile = `${destination}.${process.pid}.tmp`;
    await writeFile(temporaryFile, image, 'utf8');
    await rename(temporaryFile, destination);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await refreshConsole({ snapshot: process.argv.includes('--snapshot'), token: process.env.GH_TOKEN });
}
