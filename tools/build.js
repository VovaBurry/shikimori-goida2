/**
 * Сборка goida2.css (светлая) или goida2_black.css (тёмная) из goida2.txt.
 *
 * goida2.txt сохранён в кодировке CP866, поэтому его нельзя просто
 * переименовать в .css - браузер прочитает кириллицу как «кракозябры»:
 * в комментариях будет мусор, а content: "..." в псевдоэлементах
 * выведет битые символы на странице. Скрипт перекодирует текст в UTF-8
 * и переводит ссылки на ассеты на raw-URL репозитория.
 *
 * Тёмная тема собирается из того же исходника: заменами цвета получается
 * отдельный самодостаточный файл goida2_black.css (никаких @import -
 * Shikimori разрешает вставлять только один CSS сразу в <style>).
 *
 * Запуск (из корня репозитория):
 *   node tools/build.js            # обе темы
 *   node tools/build.js --light    # только goida2.css
 *   node tools/build.js --dark     # только goida2_black.css
 *   node tools/build.js --owner my-login --repo my-repo --branch master
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

const DEFAULT_OWNER = 'VovaBurry';
const DEFAULT_REPO = 'shikimori-goida2';
const DEFAULT_BRANCH = 'main';

// process.argv: [0]=node [1]=скрипт, дальше - наши аргументы.
function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const owner = arg('owner', DEFAULT_OWNER);
const repo = arg('repo', DEFAULT_REPO);
const branch = arg('branch', DEFAULT_BRANCH);
const source = path.join(ROOT, arg('src', 'goida2.txt'));

// --light / --dark ограничивают сборку; без флагов собираются обе темы.
const buildLight = !process.argv.includes('--dark') || process.argv.includes('--light');
const buildDark = !process.argv.includes('--light') || process.argv.includes('--dark');

const RAW_BASE = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/assets/`;

/* --- 1. Кодировка ----------------------------------------------------- */

// CP866 -> Unicode (верхняя половина таблицы, коды 0x80-0xFF).
const CP866 =
  '\u0410\u0411\u0412\u0413\u0414\u0415\u0416\u0417\u0418\u0419\u041a\u041b\u041c\u041d\u041e\u041f' +
  '\u0420\u0421\u0422\u0423\u0424\u0425\u0426\u0427\u0428\u0429\u042a\u042b\u042c\u042d\u042e\u042f' +
  '\u0430\u0431\u0432\u0433\u0434\u0435\u0436\u0437\u0438\u0439\u043a\u043b\u043c\u043d\u043e\u043f' +
  '\u2591\u2592\u2593\u2502\u2524\u2561\u2562\u2556\u2555\u2563\u2551\u2557\u255d\u255c\u255b\u2510' +
  '\u2514\u2534\u252c\u251c\u2500\u253c\u255e\u255f\u255a\u2554\u2569\u2566\u2560\u2550\u256c\u2567' +
  '\u2568\u2564\u2565\u2559\u2558\u2552\u2553\u256b\u256a\u2518\u250c\u2588\u2584\u258c\u2590\u2580' +
  '\u0440\u0441\u0442\u0443\u0444\u0445\u0446\u0447\u0448\u0449\u044a\u044b\u044c\u044d\u044e\u044f' +
  '\u0401\u0451\u0404\u0454\u0407\u0457\u040e\u045e\u00b0\u2219\u00b7\u221a\u2116\u00a4\u25a0\u00a0';
// Коды 0x00-0x7F совпадают с ASCII.
const CP866_TABLE = Array.from({ length: 256 }, (_, code) =>
  code < 0x80 ? String.fromCharCode(code) : CP866[code - 0x80],
);

function decodeCp866(buffer) {
  let out = '';
  for (const byte of buffer) out += CP866_TABLE[byte];
  return out;
}

function readSource(file) {
  const raw = fs.readFileSync(file);
  try {
    // Если файл уже валидный UTF-8 - берём как есть.
    return { css: new TextDecoder('utf-8', { fatal: true }).decode(raw), recoded: false };
  } catch {
    return { css: decodeCp866(raw), recoded: true };
  }
}

/* --- 2. Ссылки на ассеты ---------------------------------------------- */

const LINK_RE =
  /https:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/(?:main|master)\/assets\//g;

/* --- 3. Тёмная палитра ------------------------------------------------ */

// Пары «светлое -> тёмное». Первая подходящая пара заменяет цвет.
// Всё специфичное для тёмной темы собрано здесь: если меняете цвета
// в goida2.txt, проверьте, не нужно ли добавить пару и сюда.
const DARK_COLORS = [
  // -- базовые переменные темы
  ['#F8F7F9', '#121212', 'фон страницы вокруг контента'],
  ['#FFFFFF', '#1A1A1A', 'фон карточек и страницы'],
  ['#4A4A4A', '#D6D6D6', 'основной текст'],
  ['#EAEAEA', '#2A2A2A', 'рамки и треки'],
  ['--accent-red: #D84C51', '--accent-red: #E85A60', 'акцент чуть светлее'],
  ['--accent-gold: #D3C0A3', '--accent-gold: #B9A583', 'золото приглушённее'],
  // -- шапка
  ['--menu-black: #363636', '--menu-black: #242424', 'палитра шапки'],
  ['--menu-pink: #f9a399', '--menu-pink: #c96d66', 'розовый шапки'],
  ['--menu-pink-light: #f9b2aa', '--menu-pink-light: #a85a55', 'розовый шапки светлый'],
  ['--menu-pink-pale: #fbcbc2', '--menu-pink-pale: #8f4c48', 'розовый шапки бледный'],
  // -- всплывающее меню: фон панелей брался из цвета текста
  // (пары применяются по порядку, поэтому панели меню правим до общей
  // замены background: var(--text-main))
  ['background: var(--text-main);\n    border: none;', 'background: var(--menu-black);\n    border: none;', 'фон выпадающего меню'],
  ['color: #363636', 'color: #D6D6D6', 'текстовый логотип'],
  // -- график активности: сплошной столбик вместо переливающегося @keyframes
  [
    'background: 0 0 !important;\n}\n.profile-content .cc-2.block .c-left .activity .graph .bar::before',
    'background: rgba(255, 255, 255, .10) !important;\n}\n.profile-content .cc-2.block .c-left .activity .graph .bar::before',
    'фон столбика графика',
  ],
  // -- карточки профиля
  ['#e8ebef', '#2A2A2A', 'рамка карточек активности'],
  ['background: #ececec', 'background: #1F1F1F', 'фон карточки при наведении'],
  ['5px #fff', '5px rgba(255, 255, 255, .12)', 'светлая тень при наведении'],
  ['rgba(154, 147, 140, .5)', 'rgba(0, 0, 0, .55)', 'внутренняя тень при наведении'],
  ['rgba(154, 147, 140, .307)', 'rgba(0, 0, 0, .5)', 'тень под графиком и полосой времени'],
  ['background: #fff;', 'background: #151515;', 'полотно графика и подложки картинок'],
  ['#d4d4d4', '#333333', 'треки и сетка графика'],
  ['#a3c2db', '#79a9cf', 'ось графика при наведении'],
  ['background: #edacd9', 'background: #b878a6', 'полоса манги: читаю'],
  ['background: #f5d3e6', 'background: #6b4a5e', 'полоса манги: не занято'],
  ['#ddedfb', '#213547', 'плашки аниме'],
  ['#ffe1f4', '#3d2436', 'плашки манги'],
  ['#9f6fb1', '#c79bd6', 'текст плашек манги'],
  ['#888', '#9a9a9a', 'подписи под значениями'],
  // -- мелочи
  ['#fdfaf5', '#211d18', 'спойлер'],
  ['#B33A3F', '#A83338', 'нажатие в меню и скроллбар'],
  ['#cf4e4e', '#8f3535', 'полоса «время за аниме»'],
];

/* --- 4. Сборка -------------------------------------------------------- */

function applyDarkColors(css) {
  let out = css;
  const applied = [];
  for (const [from, to, why] of DARK_COLORS) {
    if (!out.includes(from)) {
      applied.push({ from, why, hit: false });
      continue;
    }
    const count = out.split(from).length - 1;
    out = out.split(from).join(to);
    applied.push({ from, why, hit: true, count });
  }
  return { out, applied };
}

function buildTheme(css, dark) {
  const { out: recolor, applied } = dark ? applyDarkColors(css) : { out: css, applied: [] };

  let themed = recolor;

  if (dark) {
    themed +=
      '\n/* ============================================================\n' +
      '   ТЁМНАЯ ТЕМА: поиск в шапке\n' +
      '   ============================================================ */\n\n' +
      '.l-top_menu-v2 .global-search input {\n' +
      '    background: #2A2A2A;\n' +
      '    color: var(--text-main);\n' +
      '}\n' +
      '.l-top_menu-v2 .global-search input::placeholder {\n' +
      '    color: #8a8a8a;\n' +
      '}\n' +
      '.l-top_menu-v2 .global-search .search-results {\n' +
      '    background: var(--menu-black);\n' +
      '}\n' +
      '.l-top_menu-v2 .global-search .search-results > a {\n' +
      '    color: var(--text-main);\n' +
      '}\n' +
      '.l-top_menu-v2 .global-search .search-results > a:hover {\n' +
      '    background: var(--accent-red);\n' +
      '    color: #fff;\n' +
      '}\n';
  }

  return { css: themed, applied };
}

const banner = (file, dark) =>
  `/* ${file} - ${dark ? 'тёмная' : 'светлая'} тема goida2 для Shikimori.\n` +
  `   Собрано скриптом tools/build.js из goida2.txt - вручную не правим.\n` +
  `   Ассеты подтягиваются из репозитория: ${RAW_BASE}*${dark ? '.\n   Вставлять только этот файл, без @import.' : ''} */\n\n`;

const { css: base, recoded } = readSource(source);
const kinds = new Set();

function writeTheme(file, dark) {
  let { css, applied } = buildTheme(base, dark);
  const links = new Set(css.match(LINK_RE) || []);
  links.forEach((l) => kinds.add(l));
  css = css.replace(LINK_RE, RAW_BASE);
  css = css.replace(/\r\n/g, '\n');
  fs.writeFileSync(path.join(ROOT, file), banner(file, dark) + css, 'utf8');
  return applied;
}

if (buildLight) {
  const applied = writeTheme('goida2.css', false);
  const skipped = applied.filter((a) => !a.hit);
  console.log(`goida2.css - светлая тема`);
  if (skipped.length) console.log(`  не найдено в исходнике: ${skipped.length}`);
}

if (buildDark) {
  const applied = writeTheme('goida2_black.css', true);
  const missed = applied.filter((a) => !a.hit);
  console.log(`goida2_black.css - тёмная тема, заменено ${applied.length - missed.length} из ${applied.length}`);
  if (missed.length) {
    console.log('  не найдено в goida2.txt (проверьте, не изменился ли исходник):');
    missed.forEach((m) => console.log(`    - ${m.why}: ${m.from}`));
  }
}

console.log(`ссылок на ассеты: ${kinds.size}`);
if (recoded) console.log('исходник был не в UTF-8 - перекодирован');
