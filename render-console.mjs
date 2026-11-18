const palette = {
  backdrop: '#0e1219', gutter: '#282631',
  border: '#8a509f', dimBorder: '#594267', bright: '#f0dffa', lavender: '#dfadf8',
  purple: '#bd72f4', green: '#75f7a9', greenText: '#94f5b7',
  amber: '#ffbd71', muted: '#d0d3df', subdued: '#b5bacc',
};
const font = 'ui-monospace, SFMono-Regular, Consolas, Liberation Mono, monospace';
const artColors = ['#766b81', '#c2b6cb', '#ece1ef', '#fff8ff', '#a456ca', '#d887ff', '#f6dbff'];
const activityColors = ['#202e32', '#24473e', '#347057', '#42a272', '#76f6a8'];
const svgWidth = 900;
const decimal = new Intl.NumberFormat('en-US');

export function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, symbol => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[symbol]);
}

function text(x, y, value, options = {}) {
  const { size = 14, fill = palette.muted, weight = 400, tracking = 0, anchor = 'start' } = options;
  return `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" fill="${fill}" font-weight="${weight}" letter-spacing="${tracking}" text-anchor="${anchor}">${escapeXml(value)}</text>`;
}

function rectangle(x, y, w, h, radius, fill, border = 'none') {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" stroke="${border}"/>`;
}

function icon(type, x, y, color, size = 20) {
  const paths = {
    terminal: 'M5 6l6 6-6 6m8 0h6', project: 'M8 7l-5 5 5 5m8-10 5 5-5 5m-2-13-4 16',
    activity: 'M4 19v-5m5 5V9m5 10V4m5 15V8', mail: 'M3 6h18v12H3zm0 0 9 7 9-7',
    branch: 'M5 8v9m0-5h6a5 5 0 0 0 5-5V6m-9 0a2 2 0 1 0-4 0 2 2 0 0 0 4 0Zm0 13a2 2 0 1 0-4 0 2 2 0 0 0 4 0Zm11-15a2 2 0 1 0-4 0 2 2 0 0 0 4 0Z',
    star: 'M12 3l2.8 5.8 6.4.9-4.6 4.5 1.1 6.4-5.7-3-5.7 3 1.1-6.4-4.6-4.5 6.4-.9L12 3Z',
    grid: 'M3 4h18v16H3zM3 8h18m-13 4h1m3 0h1m3 0h1M8 16h1m3 0h1m3 0h1',
    repo: 'M8 4h11v16H8a3 3 0 0 1 0-6h11M5 17V7a3 3 0 0 1 3-3m2 4h6m-6 3h5',
    shield: 'M12 2.8 20 6v6c0 5-4 8-8 9-4-1-8-4-8-9V6l8-3.2Zm-3 9 2 2 4-4',
    target: 'M12 2v4m0 12v4M2 12h4m12 0h4m-2 0a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-5 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
    pulse: 'M2 13h5l3-8 3.5 13 2.5-7h6',
  };
  return `<g transform="translate(${x} ${y}) scale(${size / 24})"><path d="${paths[type]}" stroke="${color}" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`;
}

function svg(width, height, title, description, contents) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc"><title id="title">${escapeXml(title)}</title><desc id="desc">${escapeXml(description)}</desc>${contents}</svg>\n`;
}

function portrait(rows) {
  const cell = 4.94;
  const lines = rows.map((row, index) => {
    const runs = [];
    for (const match of row.matchAll(/([^0-6 ]+)([0-6])/g)) {
      const glyphs = match[1];
      const preceding = row.slice(0, match.index).replace(/[0-6]/g, '');
      const x = 13 + cell * preceding.length;
      runs.push(`<tspan x="${x.toFixed(2)}" fill="${artColors[Number(match[2])]}" textLength="${(cell * glyphs.length).toFixed(2)}" lengthAdjust="spacingAndGlyphs">${escapeXml(glyphs)}</tspan>`);
    }
    return `<text y="${(47 + index * 7.38).toFixed(2)}" font-family="${font}" font-size="8.23" xml:space="preserve">${runs.join('')}</text>`;
  });

  return `<g aria-hidden="true">${lines.join('')}</g>`;
}

function tiles(stats) {
  const data = [
    ['branch', 'COMMITS', decimal.format(stats.commits)],
    ['repo', 'REPOS', decimal.format(stats.repos)],
    ['project', 'PULL REQS', decimal.format(stats.pullRequests)],
    ['star', 'STARS', decimal.format(stats.stars)],
  ];
  return data.map(([symbol, label, number], index) => {
    const x = 404 + index * 122;
    return `${rectangle(x + .5, 222.5, 111, 49, 6, '#10141a', palette.border)}
${icon(symbol, x + 13, 232, palette.lavender, 17)}
${text(x + 40, 238, label, { size: 10.25, fill: palette.lavender, tracking: .12 })}
${text(x + 70, 260, number, { size: number.length > 6 ? 16 : 21, weight: 750, fill: palette.green, anchor: 'middle' })}`;
  }).join('');
}

function toolkit(config) {
  const colors = [palette.green, palette.purple, palette.amber];
  const width = 328 / config.toolkit.length;
  const segments = config.toolkit.map((_, index) => rectangle(410 + width * index, 316, width - 2, 13, 0, colors[index])).join('');
  const legend = config.toolkit.map((skill, index) => {
    const y = 296 + index * 17;
    return `${rectangle(756, y - 10, 10, 10, 1.7, colors[index])}${text(773, y, skill, { size: 11.4 })}`;
  }).join('');
  return `<clipPath id="toolkitBar"><rect x="410" y="316" width="326" height="13" rx="6.5"/></clipPath>
${text(405, 302, '›  TOOLKIT', { size: 12, fill: palette.lavender })}
<g clip-path="url(#toolkitBar)">${segments}</g>${legend}`;
}

function languageMix(languages) {
  if (!languages?.length) return '';
  const colors = [palette.green, palette.purple, palette.amber, '#8791ac'];
  let offset = 0;
  const bars = languages.map(({ percent }, index) => {
    const x = offset;
    offset += percent * 3.25;
    return rectangle(410 + x, 316, percent * 3.25, 13, 0, colors[index]);
  }).join('');
  const legend = languages.map(({ name, percent }, index) => {
    const y = 290 + index * 15;
    const safeLabel = name.length > 12 ? `${name.slice(0, 11)}…` : name;
    return `<rect x="745" y="${y - 8}" width="8" height="8" rx="1.5" fill="${colors[index]}"/>
${text(759, y, safeLabel, { size: 10.5 })}${text(883, y, `${percent.toFixed(1)}%`, { size: 10.5, anchor: 'end' })}`;
  }).join('');
  return `<clipPath id="languageBar"><rect x="410" y="316" width="325" height="13" rx="6.5"/></clipPath>
${text(405, 302, '›  LANGUAGES · REPO BYTES', { size: 12, fill: palette.lavender })}<g clip-path="url(#languageBar)">${bars}</g>${legend}`;
}

export function consoleGraphic(config, ascii, stats) {
  const rows = config.fields.map(([name, description], index) => {
    const y = 111 + index * 17;
    const dots = Array.from({ length: Math.max(1, 21 - name.length) }, () => '·').join('');
    return `${text(405, y, '›', { size: 15, fill: palette.lavender, weight: 700 })}
${text(425, y, name, { size: 13.1, fill: palette.bright })}
${text(435 + name.length * 7.82, y, dots, { size: 12.4, fill: '#8c8294', tracking: .1 })}
${text(596, y, description, { size: 13.1 })}`;
  }).join('');

  const counts = stats.weeks.slice(-12).map(week => week.contributionDays.reduce((sum, day) => sum + day.contributionCount, 0));
  const peak = Math.max(1, ...counts);
  const bars = counts.map((count, index) => {
    const h = count > 0 ? 3 + Math.round(count / peak * 15) : 1;
    return rectangle(810 + 6.4 * index, 85 - h, 3, h, .7, count > 0 ? palette.green : '#506b5e');
  }).join('');
  const footer = stats.languages?.length ? languageMix(stats.languages) : toolkit(config);
  return svg(svgWidth, 360, `${config.name} · Cybersecurity Command Center`,
    `${config.fields.map(([name, value]) => `${name}: ${value}`).join('. ')}. ${stats.commits} commits, ${stats.repos} public repositories, ${stats.pullRequests} pull requests opened, and ${stats.stars} stars. Original hooded portrait rendered using monospace characters.`, `
<defs>
  <linearGradient id="commandBg" x2="1" y2="1"><stop stop-color="#11141b"/><stop offset="1" stop-color="#0e1118"/></linearGradient>
  <radialGradient id="portraitGlow"><stop stop-color="#7949a6" stop-opacity=".23"/><stop offset="1" stop-color="#261c34" stop-opacity="0"/></radialGradient>
</defs>
${rectangle(.5, .5, 899, 359, 8, 'url(#commandBg)', palette.border)}
<path d="M13 29H887" stroke="${palette.border}"/>
<circle cx="21" cy="15" r="4.7" fill="#fa7881"/><circle cx="38" cy="15" r="4.7" fill="#ffd16f"/><circle cx="55" cy="15" r="4.7" fill="#79ed9d"/>
${text(76, 19, '|  // CYBERSECURITY COMMAND CENTER  ·', { size: 12.3, weight: 650, fill: palette.lavender, tracking: .3 })}
<path d="M359 15H842" stroke="#9473a0" stroke-opacity=".7"/>
${text(858, 19, '//', { size: 13, fill: palette.lavender, weight: 650 })}
<ellipse cx="185" cy="197" rx="174" ry="153" fill="url(#portraitGlow)"/>
${portrait(ascii)}
${rectangle(405.5, 45.5, 45, 42, 3, '#211832', palette.purple)}
${icon('terminal', 413, 52, palette.lavender, 28)}
${text(470, 61, config.title, { size: 21.1, weight: 750, fill: palette.bright, tracking: .18 })}
${text(470, 84, `[ ${config.status.toLocaleUpperCase('en-US')} ]`, { size: 13.2, fill: palette.greenText })}
<path d="M651 85H883" stroke="#587366" stroke-width=".9"/>
${bars}
${rows}
<path d="M404 207H884" stroke="${palette.dimBorder}"/>
${tiles(stats)}
${footer}`);
}

const activityLevels = ['NONE', 'FIRST_QUARTILE', 'SECOND_QUARTILE', 'THIRD_QUARTILE', 'FOURTH_QUARTILE'];
const month = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });

function calendarGrid(weeks) {
  const start = 48;
  const spacing = Math.min(15.67, 834 / weeks.length);
  const size = spacing - 2.75;
  let previousMonth = '';
  let lastLabelIndex = -4;
  return weeks.map((week, index) => {
    const x = start + index * spacing;
    const firstDate = week.contributionDays[0]?.date;
    const key = firstDate?.slice(0, 7);
    const label = key && key !== previousMonth && index - lastLabelIndex >= 3 && index < weeks.length - 1
      ? text(x, 47, month.format(new Date(`${firstDate}T00:00:00Z`)), { size: 10.5, fill: palette.subdued }) : '';
    if (label) lastLabelIndex = index;
    if (key) previousMonth = key;
    const cells = week.contributionDays.map(day => {
      const y = 55 + 12.3 * new Date(`${day.date}T00:00:00Z`).getUTCDay();
      const level = Math.max(0, activityLevels.indexOf(day.contributionLevel));
      const title = `${day.date}: ${day.contributionCount} contribution${day.contributionCount === 1 ? '' : 's'}`;
      return `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${size.toFixed(2)}" height="10" rx="1.7" fill="${activityColors[level]}"><title>${escapeXml(title)}</title></rect>`;
    }).join('');
    return `${label}${cells}`;
  }).join('');
}

export function activityGraphic(stats) {
  const label = `${decimal.format(stats.total)} contributions in the last 365 days`;
  const right = `${stats.from.slice(0, 4)} – ${stats.to.slice(0, 4)}`;
  const caption = stats.source === 'public-snapshot' ? `Public snapshot · ${stats.to}` : `Updated ${stats.updatedAt} UTC`;
  return svg(svgWidth, 167, label,
    `GitHub's contribution calendar from ${stats.from} to ${stats.to}. ${stats.total} contributions.`, `
${rectangle(.5, .5, 899, 166, 8, palette.backdrop, '#55515f')}
${icon('grid', 15, 12, palette.lavender, 18)}
${text(43, 25, label, { size: 13, fill: palette.bright, weight: 600 })}
${text(880, 25, right, { size: 11.3, fill: palette.subdued, anchor: 'end' })}
${calendarGrid(stats.weeks)}
${text(14, 75, 'Mon', { size: 10.5 })}${text(14, 100, 'Wed', { size: 10.5 })}${text(14, 124, 'Fri', { size: 10.5 })}
${text(17, 155, caption, { size: 10, fill: palette.subdued })}
${text(749, 155, 'Less', { size: 10.1, fill: palette.subdued, anchor: 'end' })}
${activityColors.map((color, i) => rectangle(759 + 13.5 * i, 146.5, 10, 10, 1.4, color)).join('')}
${text(878, 155, 'More', { size: 10.1, fill: palette.subdued, anchor: 'end' })}`);
}

const navItems = [['projects', 'PROJECTS', 'project'], ['activity', 'ACTIVITY', 'activity'], ['contact', 'CONTACT', 'mail']];

export function navigationGraphics() {
  return Object.fromEntries(navItems.map(([id, title, symbol]) => {
    const active = id === 'activity';
    return [`nav-${id}.svg`, svg(292, 36, title, `Jump to ${id}.`, `
<defs><linearGradient id="activeFill" x2="0" y2="1"><stop stop-color="#191622"/><stop offset=".85" stop-color="#271b39"/><stop offset="1" stop-color="#71339a"/></linearGradient></defs>
${rectangle(.5, .5, 291, 35, 6, active ? 'url(#activeFill)' : palette.backdrop, active ? palette.purple : '#615b70')}
${active ? '<path d="M8 34.5H284" stroke="#e19bff" stroke-width="1.5"/>' : ''}
${icon(symbol, 96, 10, palette.lavender, 16)}${text(122, 23, title, { size: 13, weight: 650, fill: palette.bright, tracking: .48 })}`)];
  }));
}

export function statusGraphic(config) {
  const panels = [
    ['shield', 'SECURITY OPS', 'Mobile defense · Networks', palette.greenText],
    ['target', 'CURRENT FOCUS', config.currentProject, palette.amber],
    ['pulse', 'FEATURED RELEASE', config.releaseHighlight, palette.greenText],
  ];
  const contents = panels.map(([symbol, label, copy, color], index) => {
    const x = index * 304;
    const accent = index === 2 ? `<circle cx="${x + 272}" cy="28" r="7.5" fill="#75f7a9" opacity=".14"/><circle cx="${x + 272}" cy="28" r="4.1" fill="#75f7a9"/>` : '';
    const width = index === 2 ? 291 : 288;
    return `${rectangle(x + .5, .5, width, 53, 6, '#11141b', index === 1 ? '#a96f44' : '#4e9272')}
${icon(symbol, x + 15, 15, color, 24)}
${text(x + 51, 22, label, { size: 12, fill: palette.bright, weight: 650, tracking: .3 })}
${text(x + 51, 40, copy, { size: 12.4, fill: color })}${accent}`;
  }).join('');
  return svg(svgWidth, 54, 'Current focus and featured release', `${config.currentProject}. Featured release: ${config.releaseHighlight}.`, contents);
}
