/**
 * Сборка goida2.css из goida2.txt.
 *
 * goida2.txt сохранён в кодировке CP866, поэтому его нельзя просто
 * переименовать в .css - браузер прочитает кириллицу как «кракозябры»:
 * в комментариях будет мусор, а content: "..." в псевдоэлементах
 * выведет битые символы на странице.
 *
 * Скрипт перекодирует текст в UTF-8 и переводит все ссылки на ассеты
 * на raw-URL репозитория.
 *
 * Запуск (из корня репозитория):
 *   node tools/build.js
 *   node tools/build.js --owner new-owner --repo new-repo
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

const DEFAULT_OWNER = 'VovaBurry';
const DEFAULT_REPO = 'shikimori-goida2';
const DEFAULT_BRANCH = 'main';

// Позиции в process.argv: [0]=node [1]=script, дальше - наши аргументы.
function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const owner = arg('owner', DEFAULT_OWNER);
const repo = arg('repo', DEFAULT_REPO);
const branch = arg('branch', DEFAULT_BRANCH);
const source = path.join(ROOT, arg('src', 'goida2.txt'));
const target = path.join(ROOT, arg('out', 'goida2.css'));

const RAW_BASE = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/assets/`;

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

const raw = fs.readFileSync(source);

let css;
let recoded = false;
try {
  // Если файл уже валидный UTF-8 - берём как есть.
  css = new TextDecoder('utf-8', { fatal: true }).decode(raw);
} catch {
  css = decodeCp866(raw);
  recoded = true;
}

const LINK_RE =
  /https:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/(?:main|master)\/assets\//g;
const kinds = new Set(css.match(LINK_RE) || []);

css = css.replace(LINK_RE, RAW_BASE);
css = css.replace(/\r\n/g, '\n');

const banner =
  '/* goida2.css - итоговая тема, собранная из goida2.txt скриптом tools/build.js.\n' +
  '   Ассеты подтягиваются из репозитория: ' +
  RAW_BASE +
  '\n' +
  '   Вручную не правим - меняем goida2.txt и пересобираем. */\n\n';

fs.writeFileSync(target, banner + css, 'utf8');

console.log(`источник: ${path.relative(ROOT, source)}`);
console.log(`результат: ${path.relative(ROOT, target)}`);
console.log(`ссылок переписано: ${kinds.size} шт.`);
if (recoded) console.log('исходник был не в UTF-8 - перекодирован');
