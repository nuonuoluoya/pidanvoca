const fs = require('fs');
const path = require('path');
const { parseWordbook } = require('./src/features/wordbooks/parser');

const wordbooksPath = path.join(__dirname, 'wordbooks');
const personalWordbooksPath = path.join(wordbooksPath, 'my');
const defaultBookFileName = 'cet-4-vocabulary.html';
const outputPath = path.join(__dirname, 'vocabulary-flashcards.html');
const memoryCorePath = path.join(__dirname, 'memory-curve-core.js');
const animationCoordinatorPath = path.join(__dirname, 'src', 'animations', 'animation-coordinator.js');
const animationGeometryPath = path.join(__dirname, 'src', 'animations', 'geometry.js');
const cardTransitionPath = path.join(__dirname, 'src', 'animations', 'card-transition.js');
const wordbookParserPath = path.join(__dirname, 'src', 'features', 'wordbooks', 'parser.js');
const classicDeckModelPath = path.join(__dirname, 'src', 'features', 'classic-deck', 'model.js');
const reviewSessionPath = path.join(__dirname, 'src', 'features', 'memory-review', 'review-session.js');
const databaseModulePath = path.join(__dirname, 'src', 'services', 'storage', 'database.js');
const reviewRepositoryPath = path.join(__dirname, 'src', 'services', 'storage', 'review-repository.js');
const wordbookRepositoryPath = path.join(__dirname, 'src', 'services', 'storage', 'wordbook-repository.js');
const fsrsEntryPath = require.resolve('ts-fsrs');
const fsrsBrowserBundlePath = path.join(path.dirname(fsrsEntryPath), 'index.umd.js');
const fsrsPackagePath = path.join(path.dirname(fsrsEntryPath), '..', 'package.json');
const builtInBookDefinitions = [
  { fileName: 'cet-6-vocabulary.html', name: '大学英语六级单词本' },
  { fileName: 'cet-4-vocabulary.html', name: '大学英语四级单词本' },
  { fileName: 'college-entrance-exam-vocabulary.html', name: '高考英语单词本' },
  { fileName: 'postgraduate-entrance-exam-vocabulary.html', name: '考研英语单词本' },
  { fileName: 'primary-school-vocabulary.html', name: '小学英语单词本' },
  { fileName: 'ielts-vocabulary.html', name: '雅思英语单词本' },
  { fileName: 'junior-high-school-entrance-exam-vocabulary.html', name: '中考英语单词本' }
];
const legacyBuiltInBookIds = {
  '大学英语六级单词本.html': 'cet-6-vocabulary.html',
  '大学英语四级单词本.html': 'cet-4-vocabulary.html',
  '高考英语单词本.html': 'college-entrance-exam-vocabulary.html',
  '考研英语单词本.html': 'postgraduate-entrance-exam-vocabulary.html',
  '小学英语单词本.html': 'primary-school-vocabulary.html',
  '雅思英语单词本.html': 'ielts-vocabulary.html',
  '中考英语单词本.html': 'junior-high-school-entrance-exam-vocabulary.html'
};

if (!fs.existsSync(wordbooksPath)) {
  throw new Error('未找到 wordbooks 文件夹。');
}

function listHtmlFiles(directoryPath) {
  if (!fs.existsSync(directoryPath)) return [];
  return fs.readdirSync(directoryPath)
  .filter((fileName) => /\.html?$/i.test(fileName))
  .sort((left, right) => left.localeCompare(right, 'zh-CN'));
}

function createCustomBookId(fileName) {
  return 'custom:' + encodeURIComponent(String(fileName || '').trim().toLocaleLowerCase());
}

const wordbookFileNames = listHtmlFiles(wordbooksPath);

if (!wordbookFileNames.length) {
  throw new Error('wordbooks 文件夹中没有 HTML 生词本。');
}

const missingBuiltInBooks = builtInBookDefinitions
  .map((book) => book.fileName)
  .filter((fileName) => !wordbookFileNames.includes(fileName));

if (missingBuiltInBooks.length) {
  throw new Error(`缺少内置生词本文件：${missingBuiltInBooks.join(', ')}`);
}

const definedBookFileNames = new Set(builtInBookDefinitions.map((book) => book.fileName));
const additionalBookDefinitions = wordbookFileNames
  .filter((fileName) => !definedBookFileNames.has(fileName))
  .map((fileName) => ({
    fileName,
    name: path.basename(fileName, path.extname(fileName))
  }));
const builtInBooks = builtInBookDefinitions.concat(additionalBookDefinitions).map(({ fileName, name }) => ({
  id: fileName,
  name,
  fileName,
  words: parseWordbook(fs.readFileSync(path.join(wordbooksPath, fileName), 'utf8'), fileName)
}));
const includePersonalWordbooks = process.env.INCLUDE_PERSONAL_WORDBOOKS === '1';
const personalBooks = (includePersonalWordbooks ? listHtmlFiles(personalWordbooksPath) : []).map((fileName) => ({
  id: createCustomBookId(fileName),
  name: path.basename(fileName, path.extname(fileName)),
  fileName,
  words: parseWordbook(fs.readFileSync(path.join(personalWordbooksPath, fileName), 'utf8'), fileName)
}));
const defaultBuiltInBook = builtInBooks.find((book) => book.fileName === defaultBookFileName) || builtInBooks[0];
const embeddedBuiltInBooks = JSON.stringify(builtInBooks).replace(/</g, '\\u003c');
const embeddedPersonalBooks = JSON.stringify(personalBooks).replace(/</g, '\\u003c');
const embeddedDefaultBookId = JSON.stringify(defaultBuiltInBook.id);
const embeddedLegacyBuiltInBookIds = JSON.stringify(legacyBuiltInBookIds);
const embeddedMemoryCore = fs.readFileSync(memoryCorePath, 'utf8').replace(/[ \t]+$/gm, '').replace(/<\/script/gi, '<\\/script');
const embeddedAnimationCoordinator = fs.readFileSync(animationCoordinatorPath, 'utf8').replace(/[ \t]+$/gm, '').replace(/<\/script/gi, '<\\/script');
const embeddedAnimationGeometry = fs.readFileSync(animationGeometryPath, 'utf8').replace(/[ \t]+$/gm, '').replace(/<\/script/gi, '<\\/script');
const embeddedCardTransition = fs.readFileSync(cardTransitionPath, 'utf8').replace(/[ \t]+$/gm, '').replace(/<\/script/gi, '<\\/script');
const embeddedWordbookParser = fs.readFileSync(wordbookParserPath, 'utf8').replace(/[ \t]+$/gm, '').replace(/<\/script/gi, '<\\/script');
const embeddedClassicDeckModel = fs.readFileSync(classicDeckModelPath, 'utf8').replace(/[ \t]+$/gm, '').replace(/<\/script/gi, '<\\/script');
const embeddedReviewSession = fs.readFileSync(reviewSessionPath, 'utf8').replace(/[ \t]+$/gm, '').replace(/<\/script/gi, '<\\/script');
const embeddedDatabaseModule = fs.readFileSync(databaseModulePath, 'utf8').replace(/[ \t]+$/gm, '').replace(/<\/script/gi, '<\\/script');
const embeddedReviewRepository = fs.readFileSync(reviewRepositoryPath, 'utf8').replace(/[ \t]+$/gm, '').replace(/<\/script/gi, '<\\/script');
const embeddedWordbookRepository = fs.readFileSync(wordbookRepositoryPath, 'utf8').replace(/[ \t]+$/gm, '').replace(/<\/script/gi, '<\\/script');
const embeddedFsrsBundle = fs.readFileSync(fsrsBrowserBundlePath, 'utf8').replace(/[ \t]+$/gm, '').replace(/<\/script/gi, '<\\/script');
const fsrsPackageVersion = JSON.parse(fs.readFileSync(fsrsPackagePath, 'utf8')).version;
const embeddedFsrsPackageVersion = JSON.stringify(fsrsPackageVersion);

const output = `<!doctype html>
<!-- Generated by build-vocabulary.js. Do not edit directly. -->
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#edf4fc">
  <title>随机单词本</title>
  <script>
    try {
      if (window.localStorage.getItem('random-vocabulary:theme:v1') === 'playful') {
        document.documentElement.dataset.theme = 'playful';
      }
    } catch { /* Use the classic theme when storage is unavailable. */ }
  </script>
  <style>
    :root {
      color-scheme: light;
      --canvas: #edf4fc;
      --surface: rgba(255, 255, 255, 0.93);
      --text: #171d29;
      --muted: #7f8793;
      --faint: #aab1bc;
      --line: #e2e8f0;
      --accent: #1878f2;
      --accent-dark: #0e66da;
      --shadow: 0 22px 60px rgba(69, 96, 130, 0.12), 0 4px 14px rgba(69, 96, 130, 0.06);
      --radius: 22px;
      --settings-panel-width: clamp(270px, 24vw, 320px);
      --settings-page-offset: -2px;
    }

    * { box-sizing: border-box; }

    html { min-height: 100%; }

    body {
      min-height: 100vh;
      margin: 0;
      color: var(--text);
      font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
      background:
        radial-gradient(circle at 50% 0%, rgba(255,255,255,0.96) 0, rgba(255,255,255,0.42) 34%, transparent 62%),
        var(--canvas);
      -webkit-font-smoothing: antialiased;
      perspective: 1800px;
    }

    button { font: inherit; }

    .app {
      position: relative;
      width: min(1220px, calc(100% - 32px));
      min-height: 100vh;
      margin: 0 auto;
      padding: clamp(34px, 6vh, 54px) 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .card {
      width: min(1040px, calc(100% - 168px));
      min-height: min(720px, calc(100vh - 84px));
      max-height: min(720px, calc(100vh - 84px));
      padding: clamp(30px, 4.4vw, 58px);
      border: 1px solid rgba(255,255,255,0.9);
      border-radius: var(--radius);
      background: var(--surface);
      box-shadow: var(--shadow);
      overflow: auto;
      scrollbar-width: none;
    }

    .card__topline {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      margin-bottom: clamp(52px, 8vh, 82px);
    }

    @property --progress-ratio {
      syntax: "<percentage>";
      inherits: true;
      initial-value: 0%;
    }

    .clock-progress {
      --progress-ratio: 0%;
      --progress-angle: 0deg;
      position: absolute;
      top: 5px;
      right: 28px;
      left: auto;
      z-index: 3;
      display: none;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      min-width: 96px;
      padding: 9px 9px 8px;
      border: 1px solid rgba(125, 139, 156, 0.18);
      border-radius: 22px;
      background: rgba(240,247,255,0.86);
      box-shadow: 0 9px 28px rgba(69,96,130,0.1), inset 0 1px 0 rgba(255,255,255,0.88);
      font-variant-numeric: tabular-nums;
      backdrop-filter: blur(16px);
      pointer-events: none;
      user-select: none;
      transition: --progress-ratio 620ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }

    .clock-progress__dial {
      position: relative;
      width: 72px;
      height: 72px;
      flex: 0 0 72px;
      border: 1px solid rgba(93, 124, 164, 0.18);
      border-radius: 50%;
      background:
        radial-gradient(circle at 36% 30%, rgba(255,255,255,0.98) 0 14%, transparent 35%),
        linear-gradient(145deg, #fafdff, #e8f1fc);
      box-shadow: inset 0 0 0 4px rgba(255,255,255,0.72), 0 4px 12px rgba(69,96,130,0.13);
    }

    .clock-progress__dial::before {
      content: "";
      position: absolute;
      inset: 2px;
      border-radius: 50%;
      background: conic-gradient(from 0deg, #5aa8ff 0 var(--progress-ratio), rgba(126, 151, 184, 0.14) var(--progress-ratio) 100%);
      -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #000 0);
      mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #000 0);
    }

    .clock-progress__twelve {
      position: absolute;
      top: 7px;
      left: 50%;
      z-index: 3;
      color: #7f91a9;
      font-size: 8px;
      font-weight: 850;
      line-height: 1;
      transform: translateX(-50%);
    }

    .clock-progress__tick {
      position: absolute;
      z-index: 3;
      width: 2px;
      height: 2px;
      border-radius: 50%;
      background: #99a9bd;
    }

    .clock-progress__tick--three { top: 50%; right: 9px; transform: translateY(-50%); }
    .clock-progress__tick--six { bottom: 9px; left: 50%; transform: translateX(-50%); }
    .clock-progress__tick--nine { top: 50%; left: 9px; transform: translateY(-50%); }

    .clock-progress__hand-wrap {
      position: absolute;
      inset: 0;
      z-index: 4;
      transform: rotate(var(--progress-angle));
      transition: transform 620ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }

    .clock-progress__hand {
      position: absolute;
      bottom: 50%;
      left: 50%;
      width: 3px;
      height: 21px;
      border-radius: 3px 3px 1px 1px;
      background: linear-gradient(#5f63ed, #1878f2);
      box-shadow: 0 1px 5px rgba(24,120,242,0.35);
      transform: translateX(-50%);
    }

    .clock-progress__hand::after {
      content: "";
      position: absolute;
      left: 50%;
      bottom: -5px;
      width: 9px;
      height: 9px;
      border: 2px solid #fff;
      border-radius: 50%;
      background: #247ef1;
      box-shadow: 0 1px 5px rgba(24,120,242,0.32);
      transform: translateX(-50%);
    }

    .clock-progress__meta {
      display: grid;
      grid-template-columns: auto;
      align-items: baseline;
      justify-content: center;
      column-gap: 5px;
      row-gap: 2px;
      text-align: center;
      line-height: 1;
    }

    .clock-progress__label {
      grid-column: 1 / -1;
      color: #9aa5b3;
      font-size: 9px;
      font-weight: 750;
      letter-spacing: 0.15em;
    }

    .clock-progress__percent {
      color: #243249;
      font-size: 15px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }

    @property --water-level {
      syntax: "<percentage>";
      inherits: true;
      initial-value: 0%;
    }

    .card-water-progress {
      --water-level: 0%;
      position: absolute;
      inset: 0;
      z-index: 1;
      overflow: hidden;
      border-radius: inherit;
      pointer-events: none;
      transition: opacity 420ms linear, visibility 420ms linear;
    }

    .card-water-progress__fill {
      position: absolute;
      right: -1px;
      bottom: 0;
      left: -1px;
      height: clamp(0px, var(--water-level), 100%);
      overflow: hidden;
      background: transparent;
      transition: height 720ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }

    .card-water-progress[aria-valuenow="100"] .card-water-progress__fill {
      background: rgba(126,201,254,0.18);
    }

    .card-water-progress__fill::after {
      content: "";
      position: absolute;
      inset: 18px 0 0;
      background:
        radial-gradient(circle at 8% 84%, rgba(255,255,255,0.2) 0 2px, transparent 3px),
        radial-gradient(circle at 34% 58%, rgba(255,255,255,0.16) 0 1px, transparent 2px),
        radial-gradient(circle at 63% 78%, rgba(255,255,255,0.18) 0 1.5px, transparent 2.5px),
        radial-gradient(circle at 91% 46%, rgba(255,255,255,0.14) 0 2px, transparent 3px);
      background-size: 230px 180px, 270px 210px, 310px 230px, 250px 190px;
      animation: water-shimmer 13s linear infinite;
      animation-delay: var(--wave-phase, 0ms);
    }

    .card-water-progress__wave {
      position: absolute;
      left: 0;
      width: 200%;
      overflow: visible;
      filter: none;
      animation: water-wave 8s linear infinite;
      animation-delay: var(--wave-phase, 0ms);
    }

    .card-water-progress__wave path { fill: currentColor; }

    .card-water-progress__wave--band {
      top: var(--band-offset);
      height: 720px;
    }

    .card-water-progress__wave--band-six {
      --band-offset: 0px;
      color: rgba(126,201,254,0.18);
      animation-duration: 16s;
    }

    .card-water-progress__wave--band-five {
      --band-offset: 120px;
      color: rgba(105,190,251,0.1);
      animation-duration: 13.5s;
      animation-direction: reverse;
    }

    .card-water-progress__wave--band-four {
      --band-offset: 240px;
      color: rgba(82,174,247,0.1);
      animation-duration: 11.5s;
    }

    .card-water-progress__wave--band-three {
      --band-offset: 360px;
      color: rgba(59,155,241,0.1);
      animation-duration: 14s;
      animation-direction: reverse;
    }

    .card-water-progress__wave--band-two {
      --band-offset: 480px;
      color: rgba(36,136,232,0.1);
      animation-duration: 10s;
    }

    .card-water-progress__wave--band-one {
      --band-offset: 600px;
      color: rgba(18,112,214,0.1);
      animation-duration: 8.5s;
      animation-direction: reverse;
    }

    .deck-card:not([data-offset="0"]) .card-water-progress {
      opacity: 0 !important;
      visibility: hidden !important;
    }

    @keyframes water-wave {
      from { transform: translate3d(0, 0, 0); }
      to { transform: translate3d(-50%, 0, 0); }
    }

    @keyframes water-shimmer {
      from { transform: translate3d(0, 0, 0); }
      to { transform: translate3d(230px, -36px, 0); }
    }

    .card-progress-count {
      position: absolute;
      top: 36px;
      left: 48px;
      z-index: 3;
      display: inline-flex;
      align-items: baseline;
      gap: 5px;
      color: var(--faint);
      font-size: 15px;
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.01em;
      pointer-events: none;
      user-select: none;
    }

    .card-progress-count strong {
      color: #39465a;
      font-size: 16px;
      font-weight: 700;
    }

    .page-actions {
      position: fixed;
      top: 24px;
      right: 32px;
      z-index: 60;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .quiet-button.page-action-button {
      width: 44px;
      height: 44px;
      justify-content: center;
      padding: 0;
      border: 1px solid rgba(102, 161, 202, 0.22);
      border-radius: 50%;
      color: #3f8fc5;
      background: linear-gradient(145deg, rgba(238,248,255,0.96), rgba(201,229,247,0.92));
      box-shadow: 0 8px 24px rgba(67,125,166,0.12), inset 0 1px 0 rgba(255,255,255,0.82);
      backdrop-filter: blur(14px);
    }

    .quiet-button.page-action-button .icon { opacity: 0.8; }

    .quiet-button.page-action-button:hover {
      color: var(--accent);
      background: linear-gradient(145deg, #f5fbff, #bfdef3);
      box-shadow: 0 10px 28px rgba(67,125,166,0.16), inset 0 1px 0 rgba(255,255,255,0.9);
    }

    .quiet-button,
    .nav-button,
    .sound-button,
    .dictionary-button,
    .study-mode-button {
      border: 0;
      cursor: pointer;
      transition: transform 160ms ease, color 160ms ease, background 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
    }

    .quiet-button {
      display: inline-flex;
      align-items: center;
      gap: 9px;
      padding: 9px 2px;
      color: #68717e;
      background: transparent;
      font-size: 15px;
      font-weight: 600;
    }

    .quiet-button:hover { color: var(--text); }
    .quiet-button:active { transform: scale(0.97); }
    .quiet-button:disabled { opacity: 0.46; cursor: wait; }

    .import-input {
      position: fixed;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      clip-path: inset(50%);
      white-space: nowrap;
    }

    .toast {
      position: fixed;
      left: 50%;
      top: 42%;
      z-index: 10;
      max-width: min(520px, calc(100% - 32px));
      padding: 11px 16px;
      border: 1px solid rgba(125, 139, 156, 0.2);
      border-radius: 12px;
      color: #344052;
      background: rgba(255,255,255,0.94);
      box-shadow: 0 12px 34px rgba(69,96,130,0.16);
      font-size: 14px;
      line-height: 1.45;
      text-align: center;
      opacity: 0;
      transform: translate(-50%, calc(-50% + 12px));
      pointer-events: none;
      transition: opacity 180ms ease, transform 180ms ease;
      backdrop-filter: blur(14px);
    }

    .toast.is-visible { opacity: 1; transform: translate(-50%, -50%); }
    .toast.is-error { color: #a83a3a; border-color: rgba(190,72,72,0.22); }

    .study-complete-backdrop {
      position: fixed;
      inset: 0;
      z-index: 12;
      display: grid;
      place-items: center;
      padding: 24px;
      background: rgba(225, 237, 248, 0.42);
      opacity: 0;
      pointer-events: none;
      transition: opacity 220ms ease;
      backdrop-filter: blur(8px);
    }

    .study-complete-backdrop[hidden] { display: none; }
    .study-complete-backdrop.is-visible { opacity: 1; pointer-events: auto; }

    .study-complete-panel {
      width: min(360px, calc(100vw - 40px));
      padding: 30px 28px 26px;
      border: 1px solid rgba(112, 148, 180, 0.2);
      border-radius: 24px;
      color: var(--text);
      background: rgba(255, 255, 255, 0.96);
      box-shadow: 0 28px 80px rgba(61, 86, 114, 0.2), inset 0 1px 0 rgba(255,255,255,0.96);
      text-align: center;
      opacity: 0;
      transform: translateY(14px) scale(0.97);
      transition: opacity 220ms ease, transform 320ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }

    .study-complete-backdrop.is-visible .study-complete-panel { opacity: 1; transform: translateY(-4vh) scale(1); }

    .study-complete-icon {
      width: 54px;
      height: 54px;
      display: grid;
      place-items: center;
      margin: 0 auto 16px;
      border: 1px solid rgba(69, 158, 221, 0.22);
      border-radius: 18px;
      color: #4ba7df;
      background: linear-gradient(145deg, #f4fbff, #e7f5ff);
      box-shadow: 0 10px 26px rgba(75, 167, 223, 0.14);
    }

    .study-complete-icon .icon { width: 28px; height: 28px; stroke-width: 2.4; }
    .study-complete-panel h2 { margin: 0; font-size: 24px; letter-spacing: -0.025em; }
    .study-complete-score { margin: 13px 0 4px; color: #2f7fb8; font-size: 30px; font-weight: 780; font-variant-numeric: tabular-nums; }
    .study-complete-detail { margin: 0; color: #78899b; font-size: 14px; line-height: 1.6; }

    .study-complete-actions {
      display: grid;
      gap: 9px;
      margin-top: 23px;
    }

    .study-complete-button {
      min-height: 46px;
      padding: 0 18px;
      border: 1px solid rgba(61, 143, 203, 0.18);
      border-radius: 14px;
      color: #3f617d;
      background: #f4f9fd;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
      transition: transform 160ms ease, color 160ms ease, background 160ms ease, box-shadow 160ms ease;
    }

    .study-complete-button:hover { color: #176fbf; background: #eaf6ff; }
    .study-complete-button:active { transform: scale(0.98); }
    .study-complete-button--primary { color: #fff; border-color: transparent; background: linear-gradient(135deg, #69b7e8, #499bd5); box-shadow: 0 12px 26px rgba(64, 145, 204, 0.22); }
    .study-complete-button--primary:hover { color: #fff; background: linear-gradient(135deg, #5fafe2, #3e91ce); }

    .word-row {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    h1 {
      min-width: 0;
      margin: 0;
      overflow-wrap: anywhere;
      font-size: clamp(42px, 5.2vw, 66px);
      line-height: 0.98;
      letter-spacing: -0.045em;
      font-weight: 750;
    }

    .sound-button,
    .dictionary-button,
    .study-mode-button {
      flex: 0 0 auto;
      width: 42px;
      height: 42px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      color: #8b929d;
      background: #f2f5f8;
      text-decoration: none;
    }

    .sound-button:hover,
    .dictionary-button:hover,
    .study-mode-button:hover {
      color: var(--accent);
      background: #e8f2ff;
    }

    body:not([data-study-mode="full"]) .study-mode-button {
      color: var(--accent);
      background: rgba(220, 238, 255, 0.82);
      box-shadow: inset 0 0 0 1px rgba(24, 120, 242, 0.08);
    }

    .study-mode-button .study-mode-icon { display: none; }
    body[data-study-mode="full"] .study-mode-icon--full,
    body[data-study-mode="word-only"] .study-mode-icon--word,
    body[data-study-mode="spelling"] .study-mode-icon--spelling { display: inline; }
    .study-mode-button:disabled { opacity: 0.46; cursor: wait; }

    .phonetic {
      min-height: 25px;
      margin: 26px 0 0;
      color: #858d98;
      font-size: clamp(15px, 1.7vw, 18px);
      line-height: 1.5;
      white-space: pre-wrap;
    }

    .meaning {
      margin: 24px 0 0;
      font-size: clamp(17px, 1.8vw, 20px);
      line-height: 1.65;
      font-weight: 650;
      white-space: pre-line;
    }

    .notes {
      margin-top: clamp(34px, 5vh, 50px);
      padding-top: clamp(30px, 4vh, 42px);
      border-top: 1px dashed var(--line);
    }

    .notes[hidden] { display: none; }

    .notes h2 {
      margin: 0 0 14px;
      font-size: 18px;
      line-height: 1.3;
      font-weight: 750;
    }

    .notes p {
      max-width: 820px;
      margin: 0;
      color: #293241;
      font-family: Georgia, "Times New Roman", "Noto Serif", serif;
      font-size: clamp(17px, 1.8vw, 20px);
      line-height: 1.62;
      white-space: pre-line;
    }

    .controls {
      position: absolute;
      inset: 0;
      z-index: 2;
      display: flex;
      align-items: center;
      justify-content: space-between;
      pointer-events: none;
    }

    .nav-button {
      position: relative;
      width: 124px;
      min-width: 124px;
      height: 148px;
      padding: 0;
      display: grid;
      place-items: center;
      border: 0;
      border-radius: 0;
      color: #8fc8ee;
      background: transparent;
      box-shadow: none;
      opacity: 0.2;
      pointer-events: auto;
      overflow: visible;
      isolation: isolate;
    }

    .app::after {
      content: "";
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      z-index: 80;
      width: 34px;
      background: linear-gradient(90deg, transparent, rgba(66, 91, 120, 0.14));
      opacity: 0;
      pointer-events: none;
      transition: opacity 480ms ease;
    }

    body.settings-open .app {
      border-radius: 0 26px 26px 0;
      box-shadow: 24px 0 52px rgba(42, 66, 94, 0.2);
      transform: translate3d(calc(var(--settings-page-offset) - var(--settings-panel-width)), 0, 0) rotateY(-2.2deg) scale(0.992);
      pointer-events: none;
    }

    body.settings-open .app::after { opacity: 1; }

    .settings-toggle {
      position: fixed;
      top: 24px;
      right: 32px;
      z-index: 70;
      width: 44px;
      height: 44px;
      display: grid;
      place-items: center;
      padding: 0;
      border: 1px solid rgba(102, 161, 202, 0.22);
      border-radius: 50%;
      color: #3f8fc5;
      background: linear-gradient(145deg, rgba(238,248,255,0.98), rgba(201,229,247,0.94));
      box-shadow: 0 8px 24px rgba(67,125,166,0.12), inset 0 1px 0 rgba(255,255,255,0.86);
      cursor: pointer;
      isolation: isolate;
      overflow: hidden;
      transition: transform 220ms ease, color 320ms ease, border-color 440ms ease, box-shadow 440ms ease;
      backdrop-filter: blur(14px);
    }

    .settings-toggle::before {
      content: '';
      position: absolute;
      inset: 0;
      z-index: -1;
      border-radius: inherit;
      background: linear-gradient(145deg, #ffffff 0%, #fdfefe 48%, #f2f6fa 100%);
      opacity: 0;
      pointer-events: none;
      transition: opacity 440ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    .settings-toggle:hover {
      color: var(--accent);
      background: linear-gradient(145deg, #f5fbff, #bfdef3);
      box-shadow: 0 10px 28px rgba(67,125,166,0.16), inset 0 1px 0 rgba(255,255,255,0.9);
    }

    .settings-toggle:active { transform: scale(0.94); }
    .settings-toggle .icon {
      position: relative;
      z-index: 1;
      transition: transform 640ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    body.settings-open .settings-toggle {
      border-color: rgba(150, 168, 185, 0.2);
      box-shadow: 0 8px 24px rgba(73,96,120,0.1), inset 0 1px 0 rgba(255,255,255,0.96);
    }

    body.settings-open .settings-toggle::before { opacity: 1; }
    body.settings-open .settings-toggle .icon { transform: rotate(52deg); }

    .theme-toggle {
      position: fixed;
      top: 24px;
      right: 144px;
      z-index: 70;
      width: 44px;
      height: 44px;
      display: grid;
      place-items: center;
      padding: 0;
      border: 1px solid rgba(102, 161, 202, 0.22);
      border-radius: 50%;
      color: #3f8fc5;
      background: linear-gradient(145deg, rgba(238,248,255,0.98), rgba(201,229,247,0.94));
      box-shadow: 0 8px 24px rgba(67,125,166,0.12), inset 0 1px 0 rgba(255,255,255,0.86);
      cursor: pointer;
      isolation: isolate;
      transition: transform 180ms ease, color 240ms ease, background 240ms ease, border-color 240ms ease, box-shadow 240ms ease;
      backdrop-filter: blur(14px);
    }

    .theme-toggle:hover {
      color: var(--accent);
      background: linear-gradient(145deg, #f5fbff, #bfdef3);
      box-shadow: 0 10px 28px rgba(67,125,166,0.18), inset 0 1px 0 rgba(255,255,255,0.92);
    }

    .theme-toggle:active { transform: scale(0.94); }
    .theme-toggle .icon { width: 23px; height: 23px; transition: transform 420ms cubic-bezier(0.2,0.8,0.2,1); }
    html[data-theme="playful"] .theme-toggle .icon { transform: rotate(24deg) scale(1.06); }

    .memory-toggle {
      position: fixed;
      top: 24px;
      right: 88px;
      z-index: 70;
      width: 44px;
      height: 44px;
      display: grid;
      place-items: center;
      padding: 0;
      border: 1px solid rgba(102, 161, 202, 0.22);
      border-radius: 50%;
      color: #3f8fc5;
      background: linear-gradient(145deg, rgba(238,248,255,0.98), rgba(201,229,247,0.94));
      box-shadow: 0 8px 24px rgba(67,125,166,0.12), inset 0 1px 0 rgba(255,255,255,0.86);
      cursor: pointer;
      isolation: isolate;
      transition: transform 180ms ease, color 320ms ease, border-color 440ms ease, box-shadow 440ms ease;
      backdrop-filter: blur(14px);
    }

    .memory-toggle::before {
      content: '';
      position: absolute;
      inset: 0;
      z-index: 0;
      border-radius: inherit;
      background: linear-gradient(145deg, #ffffff 0%, #fdfefe 48%, #f2f6fa 100%);
      opacity: 0;
      pointer-events: none;
      transition: opacity 440ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    .memory-toggle:hover { color: var(--accent); box-shadow: 0 10px 28px rgba(67,125,166,0.18), inset 0 1px 0 rgba(255,255,255,0.92); }
    .memory-toggle:active { transform: scale(0.94); }
    .memory-toggle:disabled { opacity: 0.48; cursor: wait; }
    .memory-toggle .icon {
      position: relative;
      z-index: 1;
      width: 23px;
      height: 23px;
      transition: transform 640ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    body.settings-open .memory-toggle {
      border-color: rgba(150, 168, 185, 0.2);
      box-shadow: 0 8px 24px rgba(73,96,120,0.1), inset 0 1px 0 rgba(255,255,255,0.96);
    }

    body.settings-open .memory-toggle::before { opacity: 1; }
    body.settings-open .memory-toggle .icon { transform: rotate(-12deg) scale(1.04); }

    .memory-badge {
      position: absolute;
      top: -5px;
      right: -6px;
      z-index: 2;
      min-width: 20px;
      height: 20px;
      display: grid;
      place-items: center;
      padding: 0 5px;
      border: 2px solid #edf4fc;
      border-radius: 999px;
      color: #fff;
      background: #4f9fe4;
      font-size: 10px;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
      line-height: 1;
    }

    .memory-badge[hidden] { display: none; }

    body.memory-mode .memory-toggle {
      color: #fff;
      border-color: rgba(57,132,188,0.45);
      background: linear-gradient(145deg,#65b5ea,#378ecf);
      box-shadow: 0 11px 30px rgba(45,126,184,0.26), inset 0 1px 0 rgba(255,255,255,0.38);
    }
    body.memory-mode .memory-toggle .icon { transform: scale(1.04); }
    body.memory-mode .card-layer { pointer-events: none; }
    body.memory-mode .controls { opacity: 0; visibility: hidden; pointer-events: none; }
    body.memory-mode .orbit { opacity: 0.72; }

    .memory-backdrop {
      position: absolute;
      inset: 0;
      z-index: 60;
      display: block;
      padding: 0;
      background: transparent;
      opacity: 0;
      transition: opacity 240ms ease, transform 300ms cubic-bezier(0.2,0.8,0.2,1);
    }

    .memory-backdrop[hidden] { display: none; }
    .memory-backdrop.is-visible { opacity: 1; }

    .memory-panel {
      width: 100%;
      height: 100%;
      max-height: none;
      display: grid;
      grid-template-rows: auto auto minmax(0, 1fr) auto;
      gap: clamp(10px, 2vh, 18px);
      padding: clamp(18px, 3.5vw, 30px);
      border: 1px solid rgba(255,255,255,0.92);
      border-radius: 20px;
      color: var(--text);
      background: linear-gradient(150deg,#fff 0%,#fbfdff 62%,#eef7ff 100%);
      box-shadow: 0 22px 56px rgba(69,96,130,0.13), 0 4px 14px rgba(69,96,130,0.06), inset 0 1px 0 #fff;
      transform-origin: 50% 50% -1120px;
      transform-style: preserve-3d;
      transform: translateY(8px) scale(0.988);
      transition: transform 280ms cubic-bezier(0.2,0.8,0.2,1);
    }

    .memory-backdrop.is-visible .memory-panel { transform: translateY(0) scale(1); }
    .memory-backdrop.is-transitioning > .memory-panel:not(.memory-panel--flight) { pointer-events: none; }

    .memory-panel.is-good-blocked {
      animation: memory-good-blocked 420ms cubic-bezier(0.22, 0.75, 0.28, 1);
    }

    @keyframes memory-good-blocked {
      0%, 100% { translate: 0 0; }
      18% { translate: 12px -1px; }
      38% { translate: -4px 0; }
      56% { translate: 7px 0; }
      74% { translate: -2px 0; }
      88% { translate: 2px 0; }
    }

    .memory-backdrop.is-returning-to-classic {
      opacity: 0;
      pointer-events: none;
      transition: opacity 360ms ease-in;
    }

    .memory-backdrop.is-returning-to-classic > .memory-panel:not(.memory-panel--flight) {
      opacity: 0;
      filter: saturate(0.82) brightness(0.99);
      transform: translateZ(-150px) rotateY(14deg) scale(0.94);
      transition:
        transform 620ms cubic-bezier(0.16, 1, 0.3, 1),
        opacity 360ms ease-in,
        filter 360ms ease-in,
        box-shadow 360ms ease;
    }

    .memory-panel--flight {
      position: absolute;
      inset: 0;
      z-index: 24;
      pointer-events: none;
      will-change: transform, opacity, filter, box-shadow;
      box-shadow: 0 32px 76px rgba(69,96,130,0.22);
      transition:
        transform 430ms cubic-bezier(0.55, 0, 1, 0.45),
        opacity 360ms ease-in,
        filter 360ms ease-in,
        box-shadow 360ms ease;
    }

    .memory-backdrop.is-visible > .memory-panel.memory-panel--incoming {
      position: absolute;
      inset: 0;
      z-index: 12;
      pointer-events: none;
      opacity: 0;
      filter: saturate(0.82) brightness(0.99);
      transform: translateZ(-150px) rotateY(14deg) scale(0.94);
      will-change: transform, opacity, filter, box-shadow;
      transition:
        transform 640ms cubic-bezier(0.4, 0, 0.2, 1),
        opacity 340ms ease 220ms,
        filter 420ms ease 180ms,
        box-shadow 420ms ease 180ms;
    }

    .memory-panel.memory-panel--incoming > * {
      opacity: 0;
      transition: opacity 420ms linear;
    }

    .memory-backdrop.is-card-advancing > .memory-panel.memory-panel--incoming {
      opacity: 1;
      filter: none;
      transform: translateZ(0) rotateY(0deg) scale(1);
      box-shadow: 0 22px 56px rgba(69,96,130,0.13), 0 4px 14px rgba(69,96,130,0.06), inset 0 1px 0 #fff;
    }

    .memory-backdrop.is-card-advancing > .memory-panel.memory-panel--incoming > * {
      opacity: 1;
      transition-delay: 280ms;
    }

    .memory-backdrop.is-transitioning .memory-panel--flight.is-flying-out {
      opacity: 0;
      filter: blur(1px) saturate(0.8);
      transform: translate3d(var(--fly-x), var(--fly-y), 160px) rotateZ(var(--fly-rotate)) rotateY(-18deg) scale(0.72);
    }

    .memory-panel--yielding {
      position: absolute;
      inset: 0;
      z-index: 10;
      pointer-events: none;
    }

    .memory-backdrop.is-visible > .memory-panel.memory-panel--returning {
      z-index: 20;
      opacity: 1;
      filter: none;
      transform: translate3d(var(--fly-x), var(--fly-y), 0) scale(1);
      will-change: transform;
      transition: transform 560ms cubic-bezier(0.22, 0.78, 0.26, 1);
    }

    .memory-backdrop.is-undo-returning > .memory-panel.memory-panel--returning {
      opacity: 1;
      transform: translate3d(0, 0, 0) scale(1);
    }

    .memory-backdrop.is-undo-returning > .memory-panel--yielding {
      z-index: 10;
      opacity: 1;
      filter: none;
      transform: translate3d(0, 0, 0) scale(1);
    }

    .memory-header,
    .memory-session-meta,
    .memory-actions,
    .memory-complete-actions,
    .memory-setting-row,
    .memory-setting-actions {
      display: flex;
      align-items: center;
    }

    .memory-header { justify-content: space-between; gap: 14px; }
    .memory-header-copy { min-width: 0; }
    .memory-eyebrow { margin: 0 0 4px; color: #7e9bb4; font-size: 11px; font-weight: 800; letter-spacing: 0.14em; }
    .memory-title { margin: 0; font-size: clamp(20px, 3vw, 28px); }
    .memory-header-actions { display: flex; gap: 8px; }

    .memory-icon-button {
      width: 40px;
      height: 40px;
      display: grid;
      place-items: center;
      border: 1px solid rgba(105,142,174,0.15);
      border-radius: 13px;
      color: #688198;
      background: #f5f9fc;
      cursor: pointer;
    }

    .memory-icon-button:hover { color: #176fbf; background: #edf6ff; }
    .memory-icon-button:disabled { opacity: 0.35; cursor: default; }
    .memory-icon-button .icon { width: 19px; height: 19px; }
    .memory-mode-button[data-memory-study-mode="spelling"] { color: #287fb9; background: #eaf5fc; border-color: rgba(65,139,188,0.2); }
    .memory-mode-button .memory-mode-icon { display: none; }
    .memory-mode-button[data-memory-study-mode="recall"] .memory-mode-icon--recall,
    .memory-mode-button[data-memory-study-mode="spelling"] .memory-mode-icon--spelling { display: inline; }

    .memory-session-meta { justify-content: space-between; gap: 14px; color: #8091a2; font-size: 12px; }
    .memory-progress-track { flex: 1; height: 7px; overflow: hidden; border-radius: 999px; background: #e8f0f7; }
    .memory-progress-fill { width: var(--memory-progress, 0%); height: 100%; border-radius: inherit; background: linear-gradient(90deg,#7fc9f4,#4e9ee5); transition: width 360ms ease; }

    .memory-card {
      min-height: 0;
      overflow: auto;
      display: grid;
      align-content: center;
      justify-items: center;
      gap: 18px;
      padding: clamp(28px, 6vw, 58px);
      border: 1px solid rgba(119,151,181,0.11);
      border-radius: 18px;
      background: rgba(255,255,255,0.58);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.92);
      text-align: center;
      cursor: pointer;
    }

    .memory-card:focus-visible { outline: 3px solid rgba(24,120,242,0.28); outline-offset: 3px; }
    .memory-word-row { display: flex; align-items: center; justify-content: center; gap: 12px; width: 100%; }
    .memory-card-word { margin: 0; font-size: clamp(38px, 8vw, 68px); line-height: 1.05; overflow-wrap: anywhere; }
    .memory-sound-button { flex: 0 0 auto; width: 38px; height: 38px; display: grid; place-items: center; padding: 0; border: 1px solid rgba(83,151,202,0.16); border-radius: 50%; color: #5a9fd2; background: rgba(255,255,255,0.88); cursor: pointer; }
    .memory-sound-button .icon { width: 19px; height: 19px; }
    .memory-card-prompt { margin: 0; color: #8b99a7; font-size: 13px; }
    .memory-card.is-spelling:not(.is-revealed) .memory-word-row { display: none; }
    .memory-card.is-spelling .memory-card-prompt {
      width: min(680px, 100%);
      color: #344758;
      font-size: clamp(19px, 2.3vw, 27px);
      font-weight: 720;
      line-height: 1.65;
      letter-spacing: 0.01em;
      text-align: center;
      white-space: pre-line;
    }
    .memory-answer { width: 100%; display: grid; gap: 12px; padding-top: 18px; border-top: 1px solid rgba(113,139,165,0.12); text-align: left; }
    .memory-answer[hidden] { display: none; }
    .memory-answer p { margin: 0; white-space: pre-line; line-height: 1.7; }
    .memory-answer-phonetic { color: #8a929c; }
    .memory-answer-meaning { color: #26323d; font-size: 16px; font-weight: 620; }
    .memory-answer-note { padding: 12px 14px; border-radius: 12px; color: #617487; background: rgba(234,245,255,0.76); }

    .memory-spelling { width: min(430px,100%); display: grid; gap: 10px; }
    .memory-spelling[hidden] { display: none; }
    .memory-spelling-input { width: 100%; padding: 13px 16px; border: 1px solid rgba(95,139,178,0.24); border-radius: 14px; color: #263847; background: #fff; font: inherit; font-size: 21px; font-weight: 720; text-align: center; outline: none; }
    .memory-spelling-input:focus { border-color: rgba(24,120,242,0.5); box-shadow: 0 0 0 4px rgba(24,120,242,0.08); }
    .memory-spelling-input.is-correct { color: #3186b8; border-color: rgba(65,151,196,0.42); background: #f1f9fd; }
    .memory-spelling-feedback { min-height: 20px; margin: 0; color: #8292a1; font-size: 12px; }
    .memory-spelling-feedback.is-error { color: #bb6470; }
    .memory-spelling-feedback.is-success { color: #438dbb; }

    .memory-actions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
    .memory-actions[hidden] { display: none; }
    .memory-rating,
    .memory-complete-button {
      min-height: 50px;
      padding: 0 22px;
      border: 1px solid rgba(105,142,174,0.16);
      border-radius: 15px;
      font: inherit;
      font-weight: 760;
      cursor: pointer;
    }

    .memory-rating { min-width: 0; width: 100%; display: grid; grid-template-columns: auto minmax(0,1fr); align-items: center; gap: 3px 9px; padding: 0 16px; text-align: left; }
    .memory-rating strong { font-size: 14px; }
    .memory-rating small { grid-column: 2; color: #8796a5; font-size: 11px; font-weight: 600; }
    .memory-rating--again { color: #a85d68; background: #fff2f3; border-color: rgba(190,92,105,0.18); }
    .memory-rating--reveal { color: #4f7f9f; background: #f2f8fc; border-color: rgba(75,137,179,0.18); }
    .memory-rating--good { color: #227db8; background: #eaf7ff; border-color: rgba(50,139,196,0.18); }
    .memory-rating:hover:not(:disabled) { filter: brightness(0.985); transform: translateY(-1px); }
    .memory-rating:disabled { opacity: 0.42; cursor: default; }

    .memory-complete { min-height: 390px; display: grid; place-items: center; align-content: center; gap: 14px; text-align: center; }
    .memory-complete[hidden] { display: none; }
    .memory-complete-icon { width: 72px; height: 72px; display: grid; place-items: center; border-radius: 50%; color: #3f98d6; background: linear-gradient(145deg,#edf9ff,#d5edff); }
    .memory-complete-icon .icon { width: 34px; height: 34px; }
    .memory-complete h3 { margin: 0; font-size: 28px; }
    .memory-complete p { margin: 0; color: #758696; line-height: 1.65; }
    .memory-complete-actions { gap: 10px; margin-top: 8px; }
    .memory-complete-button { color: #4b657c; background: #f3f7fa; }
    .memory-complete-button--primary { color: #fff; background: linear-gradient(135deg,#62afe6,#378fd2); }

    .memory-settings-panel { margin: -2px 0 4px; padding: 13px; border: 1px solid rgba(105,142,174,0.12); border-radius: 13px; background: rgba(244,249,253,0.78); }
    .memory-settings-panel[hidden] { display: none; }
    .memory-summary { margin: 0 0 12px; color: #6d8295; font-size: 11px; line-height: 1.6; }
    .memory-setting-row { justify-content: space-between; gap: 12px; margin-bottom: 10px; color: #49647c; font-size: 12px; font-weight: 700; }
    .memory-daily-input { width: 76px; padding: 8px 9px; border: 1px solid rgba(105,142,174,0.18); border-radius: 10px; color: #33526c; background: #fff; font: inherit; text-align: center; }
    .memory-daily-presets { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: -2px 0 11px; }
    .memory-daily-presets button { min-height: 32px; border: 1px solid rgba(105,142,174,0.14); border-radius: 9px; color: #5f7f98; background: rgba(255,255,255,0.82); font: inherit; font-size: 11px; font-weight: 750; cursor: pointer; }
    .memory-daily-presets button:hover { color: #286d9f; border-color: rgba(66,143,198,0.3); background: #fff; }
    .memory-setting-actions { flex-wrap: wrap; gap: 7px; }
    .memory-setting-button { flex: 1 1 46%; min-height: 38px; padding: 0 9px; border: 1px solid rgba(105,142,174,0.14); border-radius: 10px; color: #527087; background: #fff; font: inherit; font-size: 11px; font-weight: 700; cursor: pointer; }
    .memory-setting-button:hover { color: #176fbf; background: #edf7ff; }
    .memory-setting-button--danger { color: #a86771; background: #fff7f8; }
    .memory-import-mode { width: 100%; min-height: 36px; margin-top: 8px; padding: 0 9px; border: 1px solid rgba(105,142,174,0.14); border-radius: 10px; color: #527087; background: #fff; font: inherit; font-size: 11px; }
    .memory-file-input { display: none; }
    .memory-danger-zone { margin-top: 10px; color: #71869a; font-size: 11px; }
    .memory-danger-zone summary { cursor: pointer; font-weight: 700; }
    .memory-danger-zone .memory-setting-actions { margin-top: 8px; }

    .settings-drawer {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      z-index: 1;
      width: var(--settings-panel-width);
      padding: 96px 24px 28px;
      color: var(--text);
      background: #fff;
      border-left: 1px solid rgba(112, 132, 154, 0.12);
      box-shadow: inset 18px 0 36px rgba(87, 110, 136, 0.04);
      opacity: 0;
      overflow-y: auto;
      transform: translateX(0);
      pointer-events: none;
      transition: opacity 360ms ease 90ms;
    }

    body.settings-open .settings-drawer {
      opacity: 1;
      transform: translateX(0);
      pointer-events: auto;
    }

    .settings-drawer__eyebrow {
      margin: 0 0 22px;
      color: #9aa5b2;
      font-size: 12px;
      font-weight: 750;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }

    .settings-actions {
      display: grid;
      gap: 10px;
    }

    .settings-action {
      width: 100%;
      min-height: 54px;
      display: flex;
      align-items: center;
      gap: 13px;
      padding: 0 16px;
      border: 1px solid rgba(105, 142, 174, 0.14);
      border-radius: 15px;
      color: #3f5268;
      background: #f6f9fc;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.9);
      font-size: 15px;
      font-weight: 680;
      text-align: left;
      cursor: pointer;
      transition: transform 160ms ease, color 160ms ease, background 160ms ease, border-color 160ms ease;
    }

    .settings-action:hover {
      color: var(--accent-dark);
      border-color: rgba(24,120,242,0.18);
      background: #edf6ff;
    }

    .settings-action:active { transform: scale(0.98); }
    .settings-action:disabled { opacity: 0.46; cursor: wait; }
    .settings-action .icon { width: 21px; height: 21px; }

    .settings-action__chevron {
      width: 18px !important;
      height: 18px !important;
      margin-left: auto;
      color: #8ba0b5;
      transition: transform 180ms ease;
    }

    .settings-action[aria-expanded="true"] .settings-action__chevron { transform: rotate(180deg); }

    .study-size-panel {
      margin: -2px 0 4px;
      padding: 13px;
      border: 1px solid rgba(105, 142, 174, 0.12);
      border-radius: 13px;
      background: rgba(244, 249, 253, 0.78);
      animation: study-size-reveal 200ms ease both;
    }

    .study-size-panel[hidden] { display: none; }

    @keyframes study-size-reveal {
      from { opacity: 0; transform: translateY(-5px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .study-size-panel__heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin: 0 2px 7px;
      color: #49647c;
      font-size: 12px;
      font-weight: 760;
    }

    .study-size-panel__value {
      padding: 5px 9px;
      border: 1px solid rgba(69, 151, 210, 0.14);
      border-radius: 999px;
      color: #4f85ad;
      background: rgba(234, 246, 255, 0.94);
      font-size: 10px;
      font-variant-numeric: tabular-nums;
      line-height: 1;
      white-space: nowrap;
    }

    .study-size-panel__hint {
      margin: 0 2px 11px;
      color: #8393a3;
      font-size: 11px;
      line-height: 1.55;
    }

    .study-size-presets {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 7px;
    }

    .study-size-preset {
      min-height: 36px;
      padding: 0 7px;
      border: 1px solid rgba(105, 142, 174, 0.13);
      border-radius: 11px;
      color: #536b81;
      background: rgba(255,255,255,0.86);
      font: inherit;
      font-size: 12px;
      font-weight: 720;
      font-variant-numeric: tabular-nums;
      cursor: pointer;
      transition: transform 150ms ease, color 150ms ease, background 150ms ease, border-color 150ms ease;
    }

    .study-size-preset:hover { color: #176fbf; border-color: rgba(24,120,242,0.18); background: #fff; }
    .study-size-preset:active { transform: scale(0.97); }
    .study-size-preset.is-selected { color: #176fbf; border-color: rgba(24,120,242,0.22); background: #e6f4ff; box-shadow: inset 0 1px 0 rgba(255,255,255,0.9); }

    .study-size-custom {
      display: grid;
      grid-template-columns: 36px minmax(54px, 1fr) 36px 54px;
      gap: 7px;
      margin-top: 10px;
    }

    .study-size-step,
    .study-size-apply {
      min-height: 36px;
      border: 1px solid rgba(105, 142, 174, 0.13);
      border-radius: 11px;
      color: #58728a;
      background: rgba(255,255,255,0.9);
      font: inherit;
      font-weight: 760;
      cursor: pointer;
    }

    .study-size-step:hover,
    .study-size-apply:hover { color: #176fbf; border-color: rgba(24,120,242,0.18); background: #fff; }

    .study-size-input {
      min-width: 0;
      border: 1px solid rgba(105, 142, 174, 0.16);
      border-radius: 11px;
      color: #3f5a72;
      background: #fff;
      font: inherit;
      font-size: 13px;
      font-weight: 740;
      font-variant-numeric: tabular-nums;
      text-align: center;
      outline: none;
    }

    .study-size-input:focus { border-color: rgba(24,120,242,0.4); box-shadow: 0 0 0 3px rgba(24,120,242,0.09); }
    .study-size-custom.is-selected .study-size-input { color: #176fbf; border-color: rgba(24,120,242,0.28); background: #eef8ff; }
    .study-size-input::-webkit-inner-spin-button,
    .study-size-input::-webkit-outer-spin-button { margin: 0; appearance: none; }
    .study-size-apply { color: #2e78ad; background: #eaf6ff; font-size: 12px; }

    .wordbook-panel {
      margin: 2px 0 6px;
      padding: 12px;
      border: 1px solid rgba(105, 142, 174, 0.12);
      border-radius: 15px;
      background: rgba(244, 249, 253, 0.78);
    }

    .wordbook-panel[hidden] { display: none; }

    .wordbook-section[hidden] { display: none; }
    .wordbook-section + .wordbook-section { margin-top: 14px; }

    .wordbook-panel__label {
      margin: 0 0 9px 2px;
      color: #91a0af;
      font-size: 11px;
      font-weight: 760;
      letter-spacing: 0.12em;
    }

    .wordbook-list {
      display: grid;
      gap: 7px;
    }

    .wordbook-option-stack {
      min-width: 0;
      display: grid;
      gap: 7px;
    }

    .wordbook-option {
      width: 100%;
      min-width: 0;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto 14px;
      align-items: center;
      gap: 10px;
      padding: 11px 12px;
      border: 1px solid transparent;
      border-radius: 12px;
      color: #41566c;
      background: rgba(255,255,255,0.84);
      text-align: left;
      cursor: pointer;
      transition: color 160ms ease, background 160ms ease, border-color 160ms ease, transform 160ms ease;
    }

    .wordbook-option:hover {
      color: var(--accent-dark);
      border-color: rgba(24,120,242,0.16);
      background: #fff;
    }

    .wordbook-option:active { transform: scale(0.985); }

    .wordbook-option[aria-pressed="true"] {
      color: #176fbf;
      border-color: rgba(24,120,242,0.2);
      background: #eaf5ff;
    }

    .wordbook-option__chevron {
      width: 14px;
      height: 14px;
      color: #91a5b8;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
      transition: transform 180ms ease;
    }

    .wordbook-option[aria-expanded="true"] .wordbook-option__chevron { transform: rotate(90deg); }

    .wordbook-option__name {
      overflow: hidden;
      font-size: 13px;
      font-weight: 680;
      line-height: 1.35;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .wordbook-option__count {
      color: #91a0af;
      font-size: 11px;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .study-size-delete {
      width: 100%;
      min-height: 38px;
      margin-top: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border: 1px solid rgba(196,84,100,0.14);
      border-radius: 11px;
      color: #a86670;
      background: rgba(255,247,248,0.76);
      font: inherit;
      font-size: 12px;
      font-weight: 680;
      cursor: pointer;
      transition: color 160ms ease, background 160ms ease, border-color 160ms ease, transform 160ms ease;
    }

    .study-size-delete[hidden] { display: none; }

    .study-size-delete:hover {
      color: #c45464;
      border-color: rgba(196,84,100,0.24);
      background: #fff4f5;
    }

    .study-size-delete:active { transform: scale(0.98); }
    .study-size-delete .icon { width: 16px; height: 16px; }

    .nav-button::before,
    .nav-button::after {
      display: none;
    }

    .nav-button__icon {
      position: relative;
      z-index: 2;
      width: 104px;
      height: 128px;
      display: grid;
      place-items: center;
      border: 0;
      border-radius: 0;
      color: inherit;
      background: transparent;
      box-shadow: none;
      transform: none;
      transition: none;
    }

    .nav-button__icon::after {
      display: none;
    }

    .nav-button--next .nav-button__icon {
      color: inherit;
      background: transparent;
      box-shadow: none;
      transform: none;
    }

    .nav-button__icon .icon {
      width: 84px;
      height: 112px;
      stroke-width: 4.6;
      stroke-linecap: butt;
      stroke-linejoin: miter;
      transition: none;
    }

    .nav-button__arrow-base,
    .nav-button__arrow-flow,
    .nav-button__completion-check {
      fill: none;
      stroke-linejoin: miter;
      transition: opacity 180ms ease;
    }

    .nav-button__arrow-base {
      stroke: currentColor;
      stroke-width: inherit;
      stroke-linecap: butt;
    }

    .nav-button__arrow-flow {
      pointer-events: none;
      stroke-linecap: round;
      animation: nav-button-path-flow 2.05s linear infinite;
    }

    .nav-button__arrow-flow--sheen {
      stroke: #f2fbff;
      stroke-width: 2.25;
      stroke-dasharray: 18 82;
      opacity: 0.95;
    }

    .nav-button__arrow-flow--ripple {
      stroke: #4ba7df;
      stroke-width: 0.95;
      stroke-dasharray: 3 7;
      opacity: 0.92;
      animation-duration: 1.25s;
      animation-direction: reverse;
    }

    .nav-button--next .nav-button__arrow-flow--sheen { animation-delay: -1.025s; }
    .nav-button--next .nav-button__arrow-flow--ripple { animation-delay: -0.625s; }

    .nav-button__completion-check {
      stroke: currentColor;
      stroke-width: 3.2;
      stroke-linecap: round;
      stroke-linejoin: round;
      opacity: 0;
    }

    .nav-button.is-completion .nav-button__arrow-base,
    .nav-button.is-completion .nav-button__arrow-flow { opacity: 0; }
    .nav-button.is-completion .nav-button__completion-check { opacity: 1; }

    @keyframes nav-button-path-flow {
      from { stroke-dashoffset: 0; }
      to { stroke-dashoffset: -100; }
    }

    .nav-button:hover:not(:disabled) { opacity: 0.7; }
    .nav-button:active:not(:disabled) { opacity: 0.82; }
    .nav-button:disabled { opacity: 0.1; cursor: not-allowed; }

    .icon {
      width: 22px;
      height: 22px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .card.is-changing .card__content { animation: card-in 260ms ease both; }

    @keyframes card-in {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    :focus-visible {
      outline: 3px solid rgba(24,120,242,0.3);
      outline-offset: 3px;
    }

    @media (max-width: 700px) {
      :root {
        --settings-panel-width: min(78vw, 300px);
        --settings-page-offset: -1px;
      }

      .settings-toggle { top: 10px; right: 14px; width: 42px; height: 42px; }
      .memory-toggle { top: 10px; right: 66px; width: 42px; height: 42px; }
      .theme-toggle { top: 10px; right: 118px; width: 42px; height: 42px; }
      .settings-drawer { padding: 78px 18px 22px; }
      .settings-action { min-height: 52px; padding: 0 14px; }
      .memory-backdrop { padding: 0; }
      .memory-panel { max-height: none; gap: 10px; padding: 15px; border-radius: 18px; }
      .memory-backdrop.is-returning-to-classic > .memory-panel:not(.memory-panel--flight) {
        transform: translateZ(-80px) rotateY(12deg) scale(0.95);
      }
      .memory-backdrop.is-visible > .memory-panel.memory-panel--incoming {
        transform: translateZ(-80px) rotateY(12deg) scale(0.95);
      }
      .memory-backdrop.is-visible > .memory-panel.memory-panel--returning {
        transform: translate3d(var(--fly-x), var(--fly-y), 0) scale(1);
      }
      .memory-backdrop.is-undo-returning > .memory-panel.memory-panel--returning {
        transform: translate3d(0, 0, 0) scale(1);
      }
      .memory-backdrop.is-undo-returning > .memory-panel--yielding {
        transform: translate3d(0, 0, 0) scale(1);
      }
      .memory-card { min-height: 0; padding: 20px 18px; }
      .memory-actions { gap: 6px; }
      .memory-rating { min-width: 0; flex: 1; gap: 2px 6px; padding: 0 8px; }
      .memory-rating strong { font-size: 13px; }
      .memory-rating small { font-size: 10px; }
      .memory-session-meta { font-size: 10px; }

      .app {
        width: min(100% - 24px, 560px);
        padding: 18px 0;
      }

      .card {
        width: 100%;
        min-height: calc(100vh - 36px);
        max-height: calc(100vh - 36px);
        padding: 24px 28px 34px;
        border-radius: 18px;
      }

      .card__topline { margin-bottom: 48px; }
      .top-actions { gap: 14px; }
      h1 { font-size: clamp(38px, 11vw, 52px); }
      .sound-button,
      .dictionary-button { width: 38px; height: 38px; }
      .phonetic { margin-top: 22px; }
      .meaning { margin-top: 20px; }
      .nav-button {
        min-width: 48px;
        width: 48px;
        height: 48px;
        padding: 6px;
      }
      .nav-button::before, .nav-button::after { width: 34px; height: 34px; border-radius: 12px; }
      .nav-button__icon { width: 36px; height: 36px; border-radius: 13px; }
      .nav-button__icon::after { width: 10px; height: 10px; border-radius: 0 12px 0 7px; }
      .nav-button__icon .icon { width: 19px; height: 19px; }
      .nav-button--previous { margin-left: -6px; }
      .nav-button--next { margin-right: -6px; }
    }

    /* 3D circular vocabulary deck */
    html,
    body {
      width: 100%;
      height: 100%;
      overflow: hidden;
    }

    body {
      background:
        radial-gradient(circle at 50% 34%, rgba(255,255,255,0.98) 0, rgba(255,255,255,0.62) 25%, rgba(237,244,252,0.2) 58%, transparent 76%),
        var(--canvas);
    }

    .app {
      position: relative;
      width: 100vw;
      min-height: 100vh;
      margin: 0;
      padding: 0;
      display: block;
      overflow: hidden;
      isolation: isolate;
      z-index: 2;
      background:
        radial-gradient(circle at 50% 34%, rgba(255,255,255,0.98) 0, rgba(255,255,255,0.62) 25%, rgba(237,244,252,0.2) 58%, transparent 76%),
        var(--canvas);
      transform: translate3d(0, 0, 0) rotateY(0deg) scale(1);
      transform-origin: left center;
      backface-visibility: hidden;
      will-change: transform;
      transition:
        transform 760ms cubic-bezier(0.4, 0, 0.2, 1),
        border-radius 620ms cubic-bezier(0.4, 0, 0.2, 1),
        box-shadow 620ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    .scene {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      perspective: 1600px;
      perspective-origin: 50% 46%;
    }

    .scene::before {
      content: "";
      position: absolute;
      left: 50%;
      top: 48%;
      width: min(1040px, 78vw);
      height: min(560px, 66vh);
      border-radius: 50%;
      background: radial-gradient(ellipse, rgba(255,255,255,0.86) 0, rgba(255,255,255,0.18) 58%, transparent 74%);
      filter: blur(22px);
      transform: translate(-50%, -50%);
      pointer-events: none;
    }

    .orbit {
      position: absolute;
      left: 50%;
      bottom: clamp(38px, 8vh, 82px);
      width: min(1380px, 96vw);
      height: 310px;
      border-bottom: 2px solid rgba(127,148,174,0.18);
      border-radius: 0 0 50% 50%;
      box-shadow: 0 26px 52px rgba(86,112,145,0.06);
      transform: translateX(-50%);
      pointer-events: none;
    }

    .deck-stage {
      position: relative;
      z-index: 2;
      width: min(760px, calc(100vw - 280px));
      height: min(620px, calc(100vh - 150px));
      min-height: 500px;
      transform-style: preserve-3d;
    }

    .card-layer {
      position: absolute;
      inset: 0;
      transform-style: preserve-3d;
      transition: opacity 220ms ease, transform 280ms ease, visibility 220ms ease;
    }

    .deck-card {
      position: absolute;
      inset: 0;
      padding: 0;
      border: 1px solid rgba(255,255,255,0.94);
      border-radius: 20px;
      color: var(--text);
      background: #ffffff;
      box-shadow: 0 22px 56px rgba(69,96,130,0.13), 0 4px 14px rgba(69,96,130,0.06);
      overflow: hidden;
      backface-visibility: hidden;
      transform-origin: 50% 50% -1120px;
      transform-style: preserve-3d;
      will-change: transform, opacity, filter;
      transition:
        transform 640ms cubic-bezier(0.4, 0, 0.2, 1),
        translate 180ms ease,
        opacity 500ms ease,
        filter 500ms ease,
        box-shadow 500ms ease;
    }

    .card-scroll {
      position: absolute;
      inset: 0;
      z-index: 2;
      padding: 132px 48px 44px;
      overflow: auto;
      scrollbar-width: thin;
      scrollbar-color: #cbd5e1 transparent;
    }

    .card-scroll::-webkit-scrollbar { width: 0; height: 0; }

    .deck-card[data-offset="0"] {
      z-index: 10;
      opacity: 1;
      filter: none;
      transform: rotateY(0deg) scale(1);
      pointer-events: auto;
    }

    .deck-card[data-offset="-1"] { z-index: 8; opacity: 0.82; filter: saturate(0.82) brightness(0.99); transform: translateZ(-150px) rotateY(-14deg) scale(0.94); }
    .deck-card[data-offset="1"]  { z-index: 8; opacity: 0.82; filter: saturate(0.82) brightness(0.99); transform: translateZ(-150px) rotateY(14deg) scale(0.94); }
    .deck-card[data-offset="-2"] { z-index: 6; opacity: 0.5; filter: saturate(0.7) brightness(1.01); transform: translateZ(-310px) rotateY(-26deg) scale(0.86); }
    .deck-card[data-offset="2"]  { z-index: 6; opacity: 0.5; filter: saturate(0.7) brightness(1.01); transform: translateZ(-310px) rotateY(26deg) scale(0.86); }
    .deck-card[data-offset="-3"] { z-index: 4; opacity: 0.24; filter: saturate(0.55) brightness(1.02); transform: translateZ(-470px) rotateY(-36deg) scale(0.78); }
    .deck-card[data-offset="3"]  { z-index: 4; opacity: 0.24; filter: saturate(0.55) brightness(1.02); transform: translateZ(-470px) rotateY(36deg) scale(0.78); }
    .deck-card[data-offset="-4"] { z-index: 2; opacity: 0; filter: saturate(0.4); transform: translateZ(-620px) rotateY(-44deg) scale(0.72); }
    .deck-card[data-offset="4"]  { z-index: 2; opacity: 0; filter: saturate(0.4); transform: translateZ(-620px) rotateY(44deg) scale(0.72); }

    .deck-card.is-incoming { z-index: 11 !important; }

    .deck-card.is-flying-out,
    .deck-card.is-returning {
      z-index: 14 !important;
      filter: none !important;
      box-shadow: 0 32px 76px rgba(69,96,130,0.22) !important;
    }

    .deck-card.is-flying-out {
      transition:
        transform 430ms cubic-bezier(0.55, 0, 1, 0.45),
        opacity 360ms ease-in,
        filter 360ms ease-in,
        box-shadow 360ms ease;
    }

    .deck-card.is-returning {
      opacity: 0;
      transform: translate3d(var(--fly-x), var(--fly-y), 160px) rotateZ(var(--fly-rotate)) rotateY(-18deg) scale(0.72);
      transition:
        transform 620ms cubic-bezier(0.16, 1, 0.3, 1),
        opacity 460ms ease-out,
        filter 460ms ease-out,
        box-shadow 460ms ease;
    }

    .deck-card.is-yielding { z-index: 10 !important; }

    .card-layer.is-transitioning .deck-card.is-flying-out {
      opacity: 0;
      filter: blur(1px) saturate(0.8);
      transform: translate3d(var(--fly-x), var(--fly-y), 160px) rotateZ(var(--fly-rotate)) rotateY(-18deg) scale(0.72);
    }

    .card-layer.is-transitioning .deck-card.is-returning {
      opacity: 1;
      filter: none;
      transform: translateZ(0) rotateY(0deg) rotateZ(0deg) scale(1);
    }

    .deck-card:not([data-offset="0"]) {
      pointer-events: none;
      overflow: hidden;
      box-shadow: 0 14px 36px rgba(69,96,130,0.09);
    }

    @media (min-width: 701px) and (hover: hover) and (pointer: fine) {
      .deck-card[data-offset="1"] {
        pointer-events: auto;
        cursor: pointer;
      }

      .deck-card[data-offset="1"]:hover {
        translate: -6px 0;
        opacity: 0.9;
        filter: saturate(0.92) brightness(1.015);
        box-shadow: 0 18px 44px rgba(64,126,173,0.16);
      }

      body.memory-mode .memory-backdrop { pointer-events: none; }
      body.memory-mode .memory-backdrop > .memory-panel:not(.memory-panel--flight):not(.memory-panel--yielding) { pointer-events: auto; }
      body.memory-mode .deck-card[data-offset="1"] { pointer-events: auto; }
      body.memory-mode.memory-good-enabled .deck-card[data-offset="1"]:hover {
        box-shadow: 0 20px 48px rgba(61,151,211,0.22);
      }
      body.memory-mode:not(.memory-good-enabled) .deck-card[data-offset="1"] { cursor: not-allowed; }
      body.memory-mode:not(.memory-good-enabled) .deck-card[data-offset="1"]:hover {
        translate: -3px 0;
        opacity: 0.78;
        filter: saturate(0.68) brightness(1.01);
      }
    }

    .deck-card > * { transition: opacity 420ms linear; }
    .deck-card:not([data-offset="0"]) > * { opacity: 0; visibility: hidden; }
    .deck-card:not([data-offset="0"]) .sound-button,
    .deck-card:not([data-offset="0"]) .dictionary-button,
    .deck-card:not([data-offset="0"]) .study-mode-button { display: none; }
    .deck-card.is-flying-out > *,
    .deck-card.is-yielding > * { opacity: 1 !important; visibility: visible !important; }
    .deck-card.is-incoming > * { opacity: 0 !important; visibility: visible !important; }
    .card-layer.is-transitioning .deck-card.is-flying-out > *,
    .card-layer.is-transitioning .deck-card.is-yielding > * {
      opacity: 0 !important;
      transition-duration: 360ms;
    }
    .card-layer.is-transitioning .deck-card.is-incoming > * {
      opacity: 1 !important;
      transition-duration: 520ms;
      transition-delay: 60ms;
    }

    .card-layer.is-memory-advancing .deck-card > * {
      opacity: 0 !important;
      visibility: hidden !important;
    }

    .card-layer.is-memory-advancing .deck-card.is-memory-hidden-current {
      opacity: 0 !important;
      pointer-events: none !important;
      transition: opacity 140ms ease-out;
    }

    .card-layer.is-memory-returning {
      z-index: 70;
      pointer-events: none;
    }

    .card-layer.is-memory-returning .deck-card:not(.is-returning) {
      opacity: 0 !important;
    }

    .card-word-row {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .card-word {
      min-width: 0;
      margin: 0;
      overflow-wrap: anywhere;
      color: var(--text);
      font-size: clamp(46px, 4.7vw, 62px);
      line-height: 1;
      letter-spacing: -0.045em;
      font-weight: 760;
    }

    .card-spelling-form {
      min-width: 0;
      flex: 1 1 auto;
      display: none;
      align-items: flex-end;
      margin: 0;
    }

    .card-spelling-input {
      width: 100%;
      min-width: 0;
      padding: 4px 8px 9px;
      border: 0;
      border-bottom: 2px solid rgba(111, 136, 164, 0.46);
      border-radius: 10px 10px 3px 3px;
      outline: 0;
      color: var(--text);
      background: transparent;
      font: inherit;
      font-size: clamp(38px, 4.4vw, 58px);
      line-height: 1;
      letter-spacing: -0.035em;
      font-weight: 730;
      transition: border-color 180ms ease, background 220ms ease, box-shadow 180ms ease;
    }

    .card-spelling-input:focus {
      border-bottom-color: rgba(24, 120, 242, 0.72);
      box-shadow: 0 5px 10px -8px rgba(24, 120, 242, 0.58);
    }

    .card-spelling-input.is-correct {
      border-bottom-color: rgba(67, 155, 222, 0.62);
      background: rgba(126, 201, 254, 0.3);
      box-shadow: 0 8px 24px rgba(89, 165, 224, 0.12);
    }

    body[data-study-mode="spelling"] .card-word { display: none; }
    body[data-study-mode="spelling"] .card-spelling-form { display: flex; }
    body[data-study-mode="spelling"] .card-word-row { align-items: flex-end; }
    body[data-study-mode="spelling"] .card-tense-info { display: none; }

    body[data-study-mode="word-only"] .card-progress-count,
    body[data-study-mode="word-only"] .card-phonetic,
    body[data-study-mode="word-only"] .card-meaning,
    body[data-study-mode="word-only"] .card-notes { display: none; }

    .deck-card .sound-button,
    .deck-card .dictionary-button,
    .deck-card .study-mode-button {
      width: 40px;
      height: 40px;
    }

    .card-phonetic {
      margin: 25px 0 0;
      color: #858d98;
      font-size: 17px;
      line-height: 1.5;
      white-space: pre-wrap;
    }

    .card-meaning {
      margin: 24px 0 0;
      color: var(--text);
      font-size: 19px;
      line-height: 1.62;
      font-weight: 650;
      white-space: pre-line;
    }

    .card-notes {
      margin-top: 34px;
      padding-top: 30px;
      border-top: 1px dashed var(--line);
      transition: opacity 400ms ease;
    }

    .card-notes h3 {
      margin: 0 0 13px;
      font-size: 18px;
      line-height: 1.3;
      font-weight: 750;
    }

    .card-notes p {
      max-width: 670px;
      margin: 0;
      color: #293241;
      font-family: Georgia, "Times New Roman", "Noto Serif", serif;
      font-size: 19px;
      line-height: 1.62;
      white-space: pre-line;
    }

    .controls {
      position: absolute;
      inset: 0;
      z-index: 40;
      display: block;
      pointer-events: none;
      transition: opacity 220ms ease, visibility 220ms ease;
    }

    .nav-button {
      position: absolute;
      top: 50%;
      min-height: 0;
      pointer-events: auto;
      transform: translateY(-50%);
    }

    .nav-button--previous { left: clamp(26px, 3.2vw, 56px); margin: 0; color: #8fc8ee; }
    .nav-button--next { right: clamp(26px, 3.2vw, 56px); margin: 0; }
    .nav-button:hover:not(:disabled) { opacity: 0.7; transform: translateY(-50%); }
    .nav-button:active:not(:disabled) { opacity: 0.82; transform: translateY(-50%) scale(0.96); }
    .nav-button:disabled { opacity: 0.1; }

    @media (max-width: 700px) {
      .page-actions { top: 8px; right: 14px; gap: 7px; }
      .quiet-button.page-action-button {
        width: 42px;
        height: 42px;
        justify-content: center;
        padding: 0;
        border-radius: 50%;
      }
      .clock-progress {
        top: 3px;
        right: 16px;
        left: auto;
        min-width: 84px;
        gap: 4px;
        padding: 6px;
        border-radius: 19px;
      }
      .clock-progress__dial { width: 63px; height: 63px; flex-basis: 63px; }
      .clock-progress__twelve { top: 6px; font-size: 7px; }
      .clock-progress__tick--three { right: 8px; }
      .clock-progress__tick--six { bottom: 8px; }
      .clock-progress__tick--nine { left: 8px; }
      .clock-progress__hand { width: 2px; height: 18px; }
      .clock-progress__label { font-size: 8px; }
      .clock-progress__percent { font-size: 14px; }
      .card-progress-count { top: 28px; left: 28px; font-size: 12px; }
      .card-progress-count strong { font-size: 14px; }

      .scene { perspective: 980px; perspective-origin: 50% 48%; }

      .orbit {
        bottom: 34px;
        width: 138vw;
        height: 190px;
      }

      .deck-stage {
        width: calc(100vw - 44px);
        height: calc(100vh - 108px);
        min-height: 0;
        max-height: 720px;
        touch-action: pan-y;
      }

      .controls { display: none; }

      .deck-card {
        border-radius: 18px;
        transform-origin: 50% 50% -520px;
      }

      .card-scroll { padding: 112px 28px 34px; }

      .deck-card[data-offset="-1"] { transform: translateZ(-80px) rotateY(-12deg) scale(0.95); }
      .deck-card[data-offset="1"]  { transform: translateZ(-80px) rotateY(12deg) scale(0.95); }
      .deck-card[data-offset="-2"] { transform: translateZ(-175px) rotateY(-22deg) scale(0.87); }
      .deck-card[data-offset="2"]  { transform: translateZ(-175px) rotateY(22deg) scale(0.87); }
      .deck-card[data-offset="-3"] { transform: translateZ(-270px) rotateY(-30deg) scale(0.79); }
      .deck-card[data-offset="3"]  { transform: translateZ(-270px) rotateY(30deg) scale(0.79); }
      .deck-card[data-offset="-4"] { transform: translateZ(-360px) rotateY(-37deg) scale(0.72); }
      .deck-card[data-offset="4"]  { transform: translateZ(-360px) rotateY(37deg) scale(0.72); }
      .deck-card.is-returning {
        transform: translate3d(var(--fly-x), var(--fly-y), 90px) rotateZ(var(--fly-rotate)) rotateY(-14deg) scale(0.76);
      }
      .card-layer.is-transitioning .deck-card.is-flying-out {
        transform: translate3d(var(--fly-x), var(--fly-y), 90px) rotateZ(var(--fly-rotate)) rotateY(-14deg) scale(0.76);
      }

      .card-word { font-size: clamp(38px, 11vw, 50px); }
      .card-word-row { gap: 9px; }
      .card-spelling-input {
        padding-right: 5px;
        padding-left: 5px;
        font-size: clamp(32px, 9.6vw, 44px);
      }
      .deck-card .sound-button,
      .deck-card .dictionary-button,
      .deck-card .study-mode-button { width: 36px; height: 36px; }
      .card-phonetic { margin-top: 22px; font-size: 15px; }
      .card-meaning { margin-top: 20px; font-size: 17px; }
      .card-notes { margin-top: 28px; padding-top: 25px; }
      .card-notes h3 { font-size: 17px; }
      .card-notes p { font-size: 17px; }

      .nav-button {
        min-width: 96px;
        width: 96px;
        height: 116px;
        padding: 0;
      }

      .nav-button__icon { width: 80px; height: 104px; }
      .nav-button__icon .icon { width: 64px; height: 88px; stroke-width: 4.4; }
      .nav-button--previous { left: 2px; }
      .nav-button--next { right: 2px; }
      .toast { top: 40%; }
    }

    /* Optional playful scrapbook theme. The classic theme above remains the default. */
    html[data-theme="playful"] {
      --canvas: #78c7ed;
      --surface: #fff8e7;
      --text: #573945;
      --muted: #9b7b78;
      --faint: #b89991;
      --line: rgba(211, 128, 117, 0.3);
      --accent: #e96872;
      --accent-dark: #bf4f5b;
      --shadow: 0 24px 0 rgba(78, 58, 66, 0.06), 0 28px 62px rgba(55, 105, 139, 0.24);
      --radius: 30px;
    }

    html[data-theme="playful"] body {
      color: var(--text);
      font-family: "Segoe Print", "Comic Sans MS", "KaiTi", "STKaiti", "PingFang SC", "Microsoft YaHei", sans-serif;
      background-color: #78c7ed;
      background-image:
        radial-gradient(ellipse at 13% 14%, rgba(255,255,255,0.76) 0 2.8%, transparent 3%),
        radial-gradient(ellipse at 82% 18%, rgba(255,255,255,0.68) 0 3.2%, transparent 3.4%),
        radial-gradient(circle at 8% 74%, rgba(255,255,255,0.2) 0 3px, transparent 4px),
        radial-gradient(circle at 92% 66%, rgba(255,255,255,0.18) 0 4px, transparent 5px),
        repeating-linear-gradient(105deg, rgba(255,255,255,0.025) 0 2px, rgba(63,133,177,0.025) 2px 5px),
        linear-gradient(180deg, #82cef0 0%, #6bbce6 100%);
      -webkit-font-smoothing: antialiased;
    }

    html[data-theme="playful"] body::after {
      content: "";
      position: fixed;
      right: 0;
      bottom: 0;
      left: 0;
      z-index: 0;
      height: 88px;
      background:
        radial-gradient(70px 34px at 35px 0, transparent 63%, rgba(32,136,202,0.2) 65% 70%, transparent 72%) 0 0 / 140px 54px repeat-x,
        linear-gradient(180deg, rgba(77,174,224,0.08), rgba(24,128,196,0.22));
      pointer-events: none;
    }

    html[data-theme="playful"] .app {
      background:
        radial-gradient(circle at 50% 38%, rgba(255,255,255,0.44), transparent 56%),
        transparent;
    }

    html[data-theme="playful"] .scene::before {
      width: min(1100px, 86vw);
      height: min(640px, 74vh);
      background: radial-gradient(ellipse, rgba(255,255,255,0.36), transparent 70%);
      filter: blur(10px);
    }

    html[data-theme="playful"] .orbit {
      bottom: 24px;
      height: 180px;
      border: 0;
      border-radius: 50% 50% 0 0;
      background:
        radial-gradient(95px 46px at 48px 15px, transparent 61%, rgba(255,255,255,0.46) 63% 67%, transparent 69%) 0 0 / 190px 70px repeat-x,
        linear-gradient(180deg, rgba(88,190,235,0.16), rgba(23,133,204,0.24));
      box-shadow: none;
      opacity: 0.9;
    }

    html[data-theme="playful"] .deck-card {
      border: 8px solid #fff4d9;
      border-radius: 30px;
      color: #573945;
      background:
        radial-gradient(circle at 17% 12%, rgba(255,255,255,0.82) 0 2px, transparent 3px),
        repeating-linear-gradient(0deg, rgba(151,101,75,0.018) 0 1px, transparent 1px 5px),
        #fff8e7;
      box-shadow: 0 9px 0 #ddb999, 0 26px 56px rgba(57,83,103,0.22), inset 0 0 0 2px rgba(215,112,108,0.38);
    }

    html[data-theme="playful"] .deck-card::before {
      content: "";
      position: absolute;
      inset: 16px;
      z-index: 1;
      border: 2px dashed rgba(215,112,108,0.5);
      border-radius: 19px;
      pointer-events: none;
    }

    html[data-theme="playful"] .deck-card[data-offset="-1"],
    html[data-theme="playful"] .deck-card[data-offset="1"] { background-color: #ffe3a3; }
    html[data-theme="playful"] .deck-card[data-offset="-2"],
    html[data-theme="playful"] .deck-card[data-offset="2"] { background-color: #cfe59a; }
    html[data-theme="playful"] .deck-card[data-offset="-3"],
    html[data-theme="playful"] .deck-card[data-offset="3"] { background-color: #d7b7e8; }

    html[data-theme="playful"] .card-scroll { padding-top: 126px; scrollbar-color: #e8b68d transparent; }
    html[data-theme="playful"] .card-word {
      color: #53333e;
      font-family: "Comic Sans MS", "Segoe Print", "KaiTi", sans-serif;
      font-weight: 800;
      letter-spacing: -0.025em;
      text-decoration: underline;
      text-decoration-color: #efb93e;
      text-decoration-thickness: 5px;
      text-underline-offset: 12px;
    }
    html[data-theme="playful"] .card-phonetic { color: #9d7773; font-weight: 650; }
    html[data-theme="playful"] .card-meaning { color: #573945; }
    html[data-theme="playful"] .card-tense-info { color: #c75d66; font-weight: 780; }
    html[data-theme="playful"] .card-notes { border-color: rgba(94,165,205,0.42); }

    html[data-theme="playful"] .card-progress-count {
      top: 30px;
      left: 50%;
      padding: 8px 17px;
      border: 3px solid #fff4d9;
      border-radius: 999px;
      color: #ae7a76;
      background: #fffdf4;
      box-shadow: 0 4px 0 #e4c8aa, 0 8px 18px rgba(91,61,68,0.12);
      font-weight: 760;
      transform: translateX(-50%);
    }
    html[data-theme="playful"] .card-progress-count strong { color: #d85f69; font-size: 18px; }

    html[data-theme="playful"] .deck-card .sound-button,
    html[data-theme="playful"] .deck-card .dictionary-button,
    html[data-theme="playful"] .deck-card .study-mode-button {
      width: 46px;
      height: 46px;
      border: 4px solid #fff7e5;
      color: #fff;
      box-shadow: 0 4px 0 rgba(105,72,73,0.22), 0 8px 16px rgba(78,60,69,0.12);
    }
    html[data-theme="playful"] .deck-card .sound-button { background: #58aee3; }
    html[data-theme="playful"] .deck-card .dictionary-button { background: #efbd3f; }
    html[data-theme="playful"] .deck-card .study-mode-button { background: #98c957; }
    html[data-theme="playful"] .deck-card .sound-button:hover,
    html[data-theme="playful"] .deck-card .dictionary-button:hover,
    html[data-theme="playful"] .deck-card .study-mode-button:hover { color: #fff; filter: saturate(1.08) brightness(1.03); transform: translateY(-2px); }

    html[data-theme="playful"] .card-spelling-input {
      border-color: rgba(90,174,227,0.34);
      border-radius: 16px;
      color: #573945;
      background: rgba(255,253,244,0.92);
    }

    html[data-theme="playful"] .card-water-progress__fill::after {
      background:
        radial-gradient(circle at 8% 84%, rgba(255,255,255,0.9) 0 4px, transparent 5px),
        radial-gradient(circle at 34% 58%, rgba(255,255,255,0.78) 0 3px, transparent 4px),
        radial-gradient(circle at 63% 78%, rgba(255,255,255,0.82) 0 5px, transparent 6px),
        radial-gradient(circle at 91% 46%, rgba(255,255,255,0.76) 0 4px, transparent 5px);
      background-size: 190px 160px, 230px 190px, 270px 210px, 220px 170px;
    }
    html[data-theme="playful"] .card-water-progress__wave { filter: drop-shadow(0 -3px 0 rgba(255,255,255,0.72)); }
    html[data-theme="playful"] .card-water-progress__wave--band-six { color: rgba(118,201,239,0.72); }
    html[data-theme="playful"] .card-water-progress__wave--band-five { color: rgba(87,183,231,0.42); }
    html[data-theme="playful"] .card-water-progress__wave--band-four { color: rgba(60,164,221,0.36); }
    html[data-theme="playful"] .card-water-progress__wave--band-three { color: rgba(47,148,211,0.32); }
    html[data-theme="playful"] .card-water-progress__wave--band-two { color: rgba(35,132,198,0.29); }
    html[data-theme="playful"] .card-water-progress__wave--band-one { color: rgba(22,116,183,0.27); }
    html[data-theme="playful"] .card-water-progress[aria-valuenow="100"] .card-water-progress__fill { background: rgba(77,173,225,0.5); }

    html[data-theme="playful"] .nav-button { color: #d85864; opacity: 1; }
    html[data-theme="playful"] .nav-button__icon {
      width: 78px;
      height: 78px;
      border: 7px solid #fff4d9;
      border-radius: 50%;
      color: #fff;
      background: #e96872;
      box-shadow: 0 6px 0 #bd6268, 0 13px 26px rgba(76,57,66,0.2);
    }
    html[data-theme="playful"] .nav-button__icon .icon { width: 42px; height: 42px; stroke-width: 3.7; }
    html[data-theme="playful"] .nav-button:hover:not(:disabled) { opacity: 1; filter: brightness(1.05); }

    html[data-theme="playful"] .theme-toggle,
    html[data-theme="playful"] .memory-toggle,
    html[data-theme="playful"] .settings-toggle {
      border: 5px solid #fff7e5;
      color: #fff;
      background: #efbd3f;
      box-shadow: 0 4px 0 #c69037, 0 10px 22px rgba(80,59,66,0.18);
      backdrop-filter: none;
    }
    html[data-theme="playful"] .memory-toggle { background: #58aee3; }
    html[data-theme="playful"] .settings-toggle { background: #a984ca; }
    html[data-theme="playful"] .theme-toggle:hover,
    html[data-theme="playful"] .memory-toggle:hover,
    html[data-theme="playful"] .settings-toggle:hover { color: #fff; filter: brightness(1.04); }
    html[data-theme="playful"] .theme-toggle[aria-pressed="true"] { background: #f3c33d; }
    html[data-theme="playful"] body.settings-open .memory-toggle::before,
    html[data-theme="playful"] body.settings-open .settings-toggle::before { opacity: 0; }
    html[data-theme="playful"] .memory-badge { border-color: #fff7e5; background: #e96872; }
    html[data-theme="playful"] body.memory-mode .memory-toggle { background: #e96872; border-color: #fff7e5; }

    html[data-theme="playful"] .settings-drawer {
      color: #573945;
      background:
        repeating-linear-gradient(0deg, rgba(151,101,75,0.018) 0 1px, transparent 1px 5px),
        #fff8e7;
      box-shadow: inset 8px 0 0 #e56d75, inset 11px 0 0 #fff1d8, -24px 0 52px rgba(66,57,69,0.18);
    }
    html[data-theme="playful"] .settings-drawer__eyebrow {
      color: #a74451;
      font-size: 18px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-align: center;
    }
    html[data-theme="playful"] .settings-action {
      min-height: 54px;
      border: 4px solid #fff7e5;
      border-radius: 999px;
      color: #fff;
      background: #5aafe3;
      box-shadow: 0 4px 0 rgba(100,72,73,0.2), 0 8px 16px rgba(74,57,65,0.1);
      font-weight: 800;
    }
    html[data-theme="playful"] #memorySettingsButton { background: #9aca58; }
    html[data-theme="playful"] #shuffleButton { background: #eb745d; }
    html[data-theme="playful"] #importButton { background: #efbd3f; }
    html[data-theme="playful"] .settings-action:hover { color: #fff; border-color: #fff7e5; background: #4ea5da; transform: translateY(-1px); }
    html[data-theme="playful"] .settings-action__chevron { color: rgba(255,255,255,0.92); }

    html[data-theme="playful"] .wordbook-panel,
    html[data-theme="playful"] .study-size-panel,
    html[data-theme="playful"] .memory-settings-panel {
      border: 2px solid rgba(218,165,126,0.36);
      border-radius: 20px;
      background: rgba(255,253,244,0.88);
      box-shadow: inset 0 1px 0 #fff;
    }
    html[data-theme="playful"] .wordbook-panel__label { color: #aa7d71; }
    html[data-theme="playful"] .wordbook-option {
      border: 2px solid rgba(217,180,142,0.35);
      border-radius: 15px;
      color: #62454b;
      background: #fffdf4;
      box-shadow: 0 3px 0 rgba(181,137,111,0.12);
    }
    html[data-theme="playful"] .wordbook-option:hover { color: #ba4f5b; border-color: rgba(233,104,114,0.44); background: #fffaf0; }
    html[data-theme="playful"] .wordbook-option[aria-pressed="true"] { color: #2d76a6; border-color: #69b6e4; background: #e5f4fb; }
    html[data-theme="playful"] .wordbook-option__count { color: #a5847e; }

    html[data-theme="playful"] .study-size-panel__heading,
    html[data-theme="playful"] .memory-setting-row { color: #714f54; }
    html[data-theme="playful"] .study-size-panel__value { color: #b05c60; border-color: rgba(217,155,76,0.4); background: #fff1cb; }
    html[data-theme="playful"] .study-size-preset,
    html[data-theme="playful"] .memory-daily-presets button {
      border: 3px solid #fff8e9;
      border-radius: 14px;
      color: #704e50;
      background: #f4c548;
      box-shadow: 0 3px 0 rgba(139,94,65,0.18);
    }
    html[data-theme="playful"] .study-size-preset:nth-child(2),
    html[data-theme="playful"] .memory-daily-presets button:nth-child(2) { background: #f19b60; }
    html[data-theme="playful"] .study-size-preset:nth-child(3),
    html[data-theme="playful"] .memory-daily-presets button:nth-child(3) { background: #65b5e5; }
    html[data-theme="playful"] .study-size-preset:nth-child(4),
    html[data-theme="playful"] .memory-daily-presets button:nth-child(4) { background: #a8ce64; }
    html[data-theme="playful"] .study-size-preset:nth-child(5) { background: #bc99d4; }
    html[data-theme="playful"] .study-size-preset:nth-child(6) { background: #e98798; }
    html[data-theme="playful"] .study-size-preset.is-selected { color: #fff; border-color: #fff8e9; background: #e96872; box-shadow: 0 3px 0 #b95761; }
    html[data-theme="playful"] .study-size-step,
    html[data-theme="playful"] .study-size-input,
    html[data-theme="playful"] .memory-daily-input,
    html[data-theme="playful"] .memory-import-mode,
    html[data-theme="playful"] .memory-setting-button { border: 2px solid rgba(205,159,123,0.34); color: #654b50; background: #fffdf4; }
    html[data-theme="playful"] .study-size-apply { border: 3px solid #fff4d8; color: #754b32; background: #f4c548; box-shadow: 0 3px 0 #c9932c; }

    html[data-theme="playful"] .memory-panel {
      border: 8px solid #fff2d6;
      border-radius: 28px;
      color: #573945;
      background:
        repeating-linear-gradient(0deg, rgba(151,101,75,0.018) 0 1px, transparent 1px 5px),
        #fff8e7;
      box-shadow: 0 9px 0 #d9958f, 0 25px 56px rgba(58,72,91,0.22), inset 0 0 0 2px rgba(218,107,111,0.35);
    }
    html[data-theme="playful"] .memory-eyebrow { color: #5a9dc5; background: #d9eff8; padding: 4px 9px; border-radius: 6px; }
    html[data-theme="playful"] .memory-title { color: #a8424f; font-weight: 900; }
    html[data-theme="playful"] .memory-icon-button,
    html[data-theme="playful"] .memory-sound-button {
      border: 4px solid #fff5de;
      color: #fff;
      background: #efbd3f;
      box-shadow: 0 3px 0 rgba(117,75,64,0.2);
    }
    html[data-theme="playful"] .memory-progress-track { height: 13px; border: 3px solid #fff4db; background: #e8ddc7; box-shadow: 0 2px 0 rgba(121,82,70,0.12); }
    html[data-theme="playful"] .memory-progress-fill { background: linear-gradient(90deg,#f19b46,#efbd3f); }
    html[data-theme="playful"] .memory-card { border: 3px dashed rgba(93,167,210,0.58); border-radius: 24px; background: rgba(255,253,244,0.82); box-shadow: 0 6px 0 rgba(179,131,98,0.12); }
    html[data-theme="playful"] .memory-card-word { color: #9e3f4c; font-family: "Comic Sans MS", "Segoe Print", sans-serif; font-weight: 850; }
    html[data-theme="playful"] .memory-card-prompt { padding: 8px 14px; border-radius: 999px; color: #8e5559; background: #ffe3d5; font-weight: 700; }
    html[data-theme="playful"] .memory-answer { border-color: rgba(93,167,210,0.42); }
    html[data-theme="playful"] .memory-answer-meaning { color: #573945; }
    html[data-theme="playful"] .memory-rating { border: 5px solid #fff2db; border-radius: 999px; box-shadow: 0 5px 0 rgba(103,72,70,0.18); }
    html[data-theme="playful"] .memory-rating--again { color: #fff; background: #e96f72; }
    html[data-theme="playful"] .memory-rating--reveal { color: #6b4c42; background: #f4c548; }
    html[data-theme="playful"] .memory-rating--good { color: #fff; background: #58aee3; }
    html[data-theme="playful"] .memory-rating small { color: inherit; opacity: 0.78; }
    html[data-theme="playful"] .memory-complete-icon { color: #fff; background: #efbd3f; box-shadow: 0 5px 0 #cf8f35; }
    html[data-theme="playful"] .memory-complete-button--primary { border: 4px solid #fff2d5; color: #6b463f; background: #f4c548; box-shadow: 0 4px 0 #c58d32; }

    html[data-theme="playful"] .study-complete-backdrop { background: rgba(65,119,149,0.42); backdrop-filter: blur(5px); }
    html[data-theme="playful"] .study-complete-panel {
      border: 8px solid #fff1d1;
      border-radius: 26px;
      color: #573945;
      background: #fff8e7;
      box-shadow: 0 8px 0 #d79189, 0 28px 70px rgba(66,55,65,0.28), inset 0 0 0 2px rgba(217,107,112,0.36);
    }
    html[data-theme="playful"] .study-complete-icon { border: 5px solid #fff1d5; color: #fff; background: #efbd3f; box-shadow: 0 4px 0 #c78e31; }
    html[data-theme="playful"] .study-complete-score { color: #a8404c; font-family: "Comic Sans MS", "Segoe Print", sans-serif; font-weight: 900; }
    html[data-theme="playful"] .study-complete-detail { color: #886b68; }
    html[data-theme="playful"] .study-complete-button { border: 3px solid #ead8b8; color: #694b4d; background: #fffdf4; }
    html[data-theme="playful"] .study-complete-button--primary { border-color: #fff0cf; color: #6b463f; background: #f4c548; box-shadow: 0 4px 0 #c58d32; }

    html[data-theme="playful"] .toast { border: 4px solid #fff2d8; border-radius: 18px; color: #573945; background: #fff8e7; box-shadow: 0 5px 0 rgba(122,79,69,0.16), 0 16px 34px rgba(70,59,66,0.18); }

    @media (max-width: 700px) {
      html[data-theme="playful"] .deck-stage { width: calc(100vw - 36px); height: calc(100vh - 102px); }
      html[data-theme="playful"] .deck-card { border-width: 6px; border-radius: 26px; }
      html[data-theme="playful"] .deck-card::before { inset: 11px; border-radius: 16px; }
      html[data-theme="playful"] .card-scroll { padding: 106px 25px 34px; }
      html[data-theme="playful"] .card-progress-count { top: 24px; padding: 7px 14px; }
      html[data-theme="playful"] .deck-card .sound-button,
      html[data-theme="playful"] .deck-card .dictionary-button,
      html[data-theme="playful"] .deck-card .study-mode-button { width: 38px; height: 38px; border-width: 3px; }
      html[data-theme="playful"] .card-word { text-decoration-thickness: 4px; text-underline-offset: 9px; }
      html[data-theme="playful"] .orbit { bottom: 12px; width: 150vw; height: 130px; }
      html[data-theme="playful"] .memory-panel { border-width: 6px; border-radius: 24px; padding: 13px; }
      html[data-theme="playful"] .memory-card { border-radius: 20px; padding: 22px 17px; }
      html[data-theme="playful"] .memory-rating { border-width: 4px; border-radius: 20px; }
      html[data-theme="playful"] .settings-drawer { box-shadow: inset 6px 0 0 #e56d75, inset 9px 0 0 #fff1d8, -18px 0 42px rgba(66,57,69,0.18); }
      html[data-theme="playful"] .settings-action { min-height: 50px; border-width: 3px; }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
      .app { transition-duration: 280ms !important; }
      .app::after,
      .settings-drawer,
      .settings-toggle::before,
      .memory-toggle::before,
      .memory-backdrop,
      .memory-panel,
      .settings-toggle .icon,
      .memory-toggle .icon { transition-duration: 220ms !important; }
    }
  </style>
</head>
<body data-study-mode="full">
  <button class="theme-toggle" id="themeButton" type="button" aria-label="启用童趣主题" aria-pressed="false" title="启用童趣主题">
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 1.7 5.2L19 9l-4.3 3.2 1.6 5.3L12 14.3 7.7 17.5l1.6-5.3L5 9l5.3-1.8L12 2Z"></path><path d="M4 17.5 2.5 19M19.5 4.5 21 3M19 19l2 2M3 3l2 2"></path></svg>
  </button>
  <button class="memory-toggle" id="memoryButton" type="button" aria-label="打开今日复习" aria-pressed="false" title="今日复习" disabled>
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 5.2A4 4 0 0 0 5 9.1c0 .5.1 1 .3 1.4A3.5 3.5 0 0 0 7 17h2.5"></path><path d="M10 4v14"></path><path d="M10 7.5H8M10 12H7.5M10 16H8"></path><circle cx="16.5" cy="15.5" r="4.5"></circle><path d="M16.5 13v2.8l1.8 1"></path></svg>
    <span class="memory-badge" id="memoryBadge" hidden>0</span>
  </button>
  <button class="settings-toggle" id="settingsButton" type="button" aria-label="打开设置" aria-controls="settingsDrawer" aria-expanded="false" title="打开设置">
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.08A1.7 1.7 0 0 0 8.97 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15.03 1.7 1.7 0 0 0 3.08 14H3v-4h.08A1.7 1.7 0 0 0 4.6 8.97a1.7 1.7 0 0 0-.34-1.88l-.06-.06L7.03 4.2l.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 10 3.08V3h4v.08a1.7 1.7 0 0 0 1.03 1.52 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06a1.7 1.7 0 0 0-.34 1.88A1.7 1.7 0 0 0 20.92 10H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z"></path></svg>
  </button>

  <aside class="settings-drawer" id="settingsDrawer" aria-label="页面设置" aria-hidden="true" inert>
    <p class="settings-drawer__eyebrow">页面设置</p>
    <div class="settings-actions">
      <button class="settings-action" id="wordbookButton" type="button" aria-label="显示单词本列表" aria-controls="wordbookPanel" aria-expanded="false">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5Z"></path><path d="M4 4.5v17"></path><path d="M8 6h8"></path></svg>
        <span>单词本</span>
        <svg class="icon settings-action__chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 9 5 5 5-5"></path></svg>
      </button>
      <div class="wordbook-panel" id="wordbookPanel" hidden>
        <section class="wordbook-section" aria-labelledby="builtInWordbookLabel">
          <p class="wordbook-panel__label" id="builtInWordbookLabel">内置</p>
          <div class="wordbook-list" id="builtInWordbookList"></div>
        </section>
        <section class="wordbook-section" id="customWordbookSection" aria-labelledby="customWordbookLabel" hidden>
          <p class="wordbook-panel__label" id="customWordbookLabel">我的单词本</p>
          <div class="wordbook-list" id="customWordbookList"></div>
        </section>
      </div>
      <div class="study-size-panel" id="studySizePanel" hidden>
        <div class="study-size-panel__heading">
          <span>每组背词数量</span>
          <span class="study-size-panel__value" id="studySizeValue">30 词</span>
        </div>
        <p class="study-size-panel__hint" id="studySizeHint">完整词序按组推进，整轮结束前不会重复。</p>
        <div class="study-size-presets" id="studySizePresets" role="group" aria-label="选择每组词数">
          <button class="study-size-preset" type="button" data-study-size="10" aria-pressed="false">10</button>
          <button class="study-size-preset" type="button" data-study-size="20" aria-pressed="false">20</button>
          <button class="study-size-preset" type="button" data-study-size="30" aria-pressed="false">30</button>
          <button class="study-size-preset" type="button" data-study-size="50" aria-pressed="false">50</button>
          <button class="study-size-preset" type="button" data-study-size="100" aria-pressed="false">100</button>
          <button class="study-size-preset" type="button" data-study-size="all" aria-pressed="false">全部</button>
        </div>
        <div class="study-size-custom" id="studySizeCustom" aria-label="自定义每组词数">
          <button class="study-size-step" id="studySizeDecrease" type="button" aria-label="减少每组词数">−</button>
          <input class="study-size-input" id="studySizeInput" type="number" min="5" max="500" step="5" value="30" inputmode="numeric" aria-label="自定义每组词数，5到500">
          <button class="study-size-step" id="studySizeIncrease" type="button" aria-label="增加每组词数">+</button>
          <button class="study-size-apply" id="studySizeApply" type="button">确定</button>
        </div>
        <button class="study-size-delete" id="studySizeDelete" type="button" hidden>
          <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"></path><path d="M9 3h6l1 4H8l1-4Z"></path><path d="M6.5 7l1 14h9l1-14"></path><path d="M10 11v6M14 11v6"></path></svg>
          <span>删除这个单词本</span>
        </button>
      </div>
      <button class="settings-action" id="memorySettingsButton" type="button" aria-label="显示记忆曲线设置" aria-controls="memorySettingsPanel" aria-expanded="false">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 5.2A4 4 0 0 0 5 9.1c0 .5.1 1 .3 1.4A3.5 3.5 0 0 0 7 17h2.5"></path><path d="M10 4v14"></path><circle cx="16.5" cy="15.5" r="4.5"></circle><path d="M16.5 13v2.8l1.8 1"></path></svg>
        <span>记忆曲线</span>
        <svg class="icon settings-action__chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 9 5 5 5-5"></path></svg>
      </button>
      <div class="memory-settings-panel" id="memorySettingsPanel" hidden>
        <p class="memory-summary" id="memorySummary">正在读取当前词库的学习进度…</p>
        <label class="memory-setting-row" for="memoryDailyNewInput">
          <span>每日新词</span>
          <input class="memory-daily-input" id="memoryDailyNewInput" type="number" min="0" max="100" step="1" value="10">
        </label>
        <div class="memory-daily-presets" id="memoryDailyPresets" role="group" aria-label="每日新词快捷设置">
          <button type="button" data-memory-daily="0">0</button><button type="button" data-memory-daily="5">5</button><button type="button" data-memory-daily="10">10</button><button type="button" data-memory-daily="20">20</button>
        </div>
        <div class="memory-setting-actions">
          <button class="memory-setting-button" id="memoryExportButton" type="button">导出进度</button>
          <button class="memory-setting-button" id="memoryImportButton" type="button">导入进度</button>
        </div>
        <select class="memory-import-mode" id="memoryImportMode" aria-label="学习进度导入模式">
          <option value="merge">导入方式：合并（推荐）</option>
          <option value="replace">导入方式：替换全部</option>
        </select>
        <input class="memory-file-input" id="memoryImportInput" type="file" accept="application/json,.json" aria-label="选择学习进度 JSON 文件">
        <details class="memory-danger-zone">
          <summary>高级与危险操作</summary>
          <div class="memory-setting-actions">
            <button class="memory-setting-button memory-setting-button--danger" id="memoryResetBookButton" type="button">重置当前词库</button>
            <button class="memory-setting-button memory-setting-button--danger" id="memoryResetAllButton" type="button">重置全部进度</button>
          </div>
        </details>
      </div>
      <button class="settings-action" id="shuffleButton" type="button" aria-label="随机重排" title="重新随机排序（R）">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M16 3h5v5"></path><path d="M4 20 21 3"></path><path d="M21 16v5h-5"></path><path d="m15 15 6 6"></path><path d="M4 4l5 5"></path></svg>
        <span>随机重排</span>
      </button>
      <button class="settings-action" id="importButton" type="button" aria-label="导入生词本" title="导入一个或多个 HTML 生词本">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"></path><path d="m7 10 5 5 5-5"></path><path d="M5 21h14"></path></svg>
        <span>导入生词本</span>
      </button>
      <input class="import-input" id="importInput" type="file" accept=".html,.htm,text/html" multiple aria-label="选择一个或多个 HTML 生词本">
    </div>
  </aside>

  <main class="app" aria-label="随机单词本">
    <section class="scene" aria-label="3D 单词卡片组">
      <div class="orbit" aria-hidden="true"></div>
      <div class="deck-stage">
        <div class="card-layer" id="cardLayer" aria-live="polite"></div>
      </div>

      <nav class="controls" aria-label="单词切换">
        <button class="nav-button nav-button--previous" id="previousButton" type="button" aria-label="上一个单词" title="上一个单词（←）">
          <span class="nav-button__icon" aria-hidden="true">
            <svg class="icon" viewBox="0 0 24 24">
              <path class="nav-button__arrow-base" d="M11.196 3 6 12l5.196 9"></path>
              <path class="nav-button__arrow-flow nav-button__arrow-flow--sheen" pathLength="100" d="M11.196 3 6 12l5.196 9"></path>
              <path class="nav-button__arrow-flow nav-button__arrow-flow--ripple" pathLength="100" d="M11.196 3 6 12l5.196 9"></path>
            </svg>
          </span>
        </button>
        <button class="nav-button nav-button--next" id="nextButton" type="button" aria-label="下一个单词" title="下一个单词（→）">
          <span class="nav-button__icon" aria-hidden="true">
            <svg class="icon" viewBox="0 0 24 24">
              <path class="nav-button__arrow-base" d="M12.804 3 18 12l-5.196 9"></path>
              <path class="nav-button__arrow-flow nav-button__arrow-flow--sheen" pathLength="100" d="M12.804 3 18 12l-5.196 9"></path>
              <path class="nav-button__arrow-flow nav-button__arrow-flow--ripple" pathLength="100" d="M12.804 3 18 12l-5.196 9"></path>
              <path class="nav-button__completion-check" d="m5.5 12.5 4.2 4.2L18.8 7.5"></path>
            </svg>
          </span>
        </button>
      </nav>

    </section>
  </main>

  <div class="toast" id="importStatus" role="status" aria-live="polite"></div>

  <div class="study-complete-backdrop" id="studyCompleteBackdrop" hidden>
    <section class="study-complete-panel" role="dialog" aria-modal="true" aria-labelledby="studyCompleteTitle" aria-describedby="studyCompleteDetail">
      <div class="study-complete-icon" aria-hidden="true">
        <svg class="icon" viewBox="0 0 24 24"><path d="m5 12.5 4.3 4.3L19 7"></path></svg>
      </div>
      <h2 id="studyCompleteTitle">本组完成</h2>
      <p class="study-complete-score" id="studyCompleteScore">30 / 30</p>
      <p class="study-complete-detail" id="studyCompleteDetail">词本中还有更多未出现的单词</p>
      <div class="study-complete-actions">
        <button class="study-complete-button study-complete-button--primary" id="studyCompleteContinue" type="button">再来一组</button>
        <button class="study-complete-button" id="studyCompleteAdjust" type="button">调整数量</button>
      </div>
    </section>
  </div>

  <div class="memory-backdrop" id="memoryBackdrop" hidden>
    <section class="memory-panel" role="region" aria-labelledby="memoryTitle">
      <header class="memory-header">
        <div class="memory-header-copy">
          <p class="memory-eyebrow">MEMORY REVIEW</p>
          <h2 class="memory-title" id="memoryTitle">今日复习</h2>
        </div>
        <div class="memory-header-actions">
          <button class="memory-icon-button memory-mode-button" id="memoryModeButton" type="button" data-memory-study-mode="recall" aria-label="当前：回忆模式；点击切换到拼写练习" title="当前：回忆模式；点击切换到拼写练习">
            <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
              <g class="memory-mode-icon memory-mode-icon--recall"><path d="M5 6h14M5 12h14M5 18h10"></path></g>
              <g class="memory-mode-icon memory-mode-icon--spelling"><path d="m5 16-.7 3.7L8 19l10.6-10.6-3-3L5 16Z"></path><path d="M4 21h16"></path></g>
            </svg>
          </button>
          <button class="memory-icon-button" id="memoryUndoButton" type="button" aria-label="撤销上次评分" title="撤销上次评分（Ctrl/⌘ + Z）" disabled>
            <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 7-5 5 5 5"></path><path d="M4 12h9a6 6 0 0 1 6 6"></path></svg>
          </button>
          <button class="memory-icon-button" id="memoryCloseButton" type="button" aria-label="返回经典模式" title="返回经典模式（Esc）">
            <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"></path></svg>
          </button>
        </div>
      </header>
      <div class="memory-session-meta">
        <span id="memoryProgressText">0 / 0</span>
        <div class="memory-progress-track" aria-hidden="true"><div class="memory-progress-fill" id="memoryProgressFill"></div></div>
        <span id="memoryQueueText">准备队列</span>
      </div>
      <article class="memory-card" id="memoryCard" tabindex="0" aria-live="polite">
        <div class="memory-word-row"><h3 class="memory-card-word" id="memoryCardWord">准备中…</h3><button class="memory-sound-button" id="memorySoundButton" type="button" aria-label="朗读当前单词"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4Z"></path><path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"></path></svg></button></div>
        <p class="memory-card-prompt" id="memoryCardPrompt">正在读取学习记录</p>
        <div class="memory-spelling" id="memorySpelling" hidden>
          <input class="memory-spelling-input" id="memorySpellingInput" type="text" autocomplete="off" autocapitalize="none" spellcheck="false" aria-label="输入英文单词">
          <p class="memory-spelling-feedback" id="memorySpellingFeedback"></p>
        </div>
        <div class="memory-answer" id="memoryAnswer" hidden>
          <p class="memory-answer-phonetic" id="memoryAnswerPhonetic"></p>
          <p class="memory-answer-meaning" id="memoryAnswerMeaning"></p>
          <p class="memory-answer-note" id="memoryAnswerNote" hidden></p>
        </div>
      </article>
      <div class="memory-actions" id="memoryRatingActions" hidden>
        <button class="memory-rating memory-rating--again" id="memoryAgainButton" type="button" disabled><span aria-hidden="true">↶</span><strong>忘记</strong><small id="memoryAgainInterval">10 分钟</small></button>
        <button class="memory-rating memory-rating--reveal" id="memoryRevealButton" type="button"><span aria-hidden="true">⌄</span><strong>查看答案</strong><small>Space</small></button>
        <button class="memory-rating memory-rating--good" id="memoryGoodButton" type="button" disabled><span aria-hidden="true">✓</span><strong>记得</strong><small id="memoryGoodInterval">计算中</small></button>
      </div>
      <div class="memory-complete" id="memoryComplete" hidden>
        <div class="memory-complete-icon" aria-hidden="true"><svg class="icon" viewBox="0 0 24 24"><path d="m5 12.5 4.3 4.3L19 7"></path></svg></div>
        <h3>今天的任务完成了</h3>
        <p id="memoryCompleteDetail">复习记录已保存。</p>
        <div class="memory-complete-actions"><button class="memory-complete-button memory-complete-button--primary" id="memoryReturnButton" type="button">返回经典模式</button></div>
      </div>
    </section>
  </div>

  <script>${embeddedMemoryCore}</script>
  <script>${embeddedAnimationCoordinator}</script>
  <script>${embeddedAnimationGeometry}</script>
  <script>${embeddedCardTransition}</script>
  <script>${embeddedWordbookParser}</script>
  <script>${embeddedClassicDeckModel}</script>
  <script>${embeddedReviewSession}</script>
  <script>${embeddedDatabaseModule}</script>
  <script>${embeddedReviewRepository}</script>
  <script>${embeddedWordbookRepository}</script>
  <script>/* ts-fsrs ${fsrsPackageVersion}, MIT License */\n${embeddedFsrsBundle}</script>
  <script>
    const BUILT_IN_BOOKS = ${embeddedBuiltInBooks};
    const PROJECT_PERSONAL_BOOKS = ${embeddedPersonalBooks};
    const DEFAULT_BOOK_ID = ${embeddedDefaultBookId};
    const LEGACY_BUILT_IN_BOOK_IDS = ${embeddedLegacyBuiltInBookIds};
    const DEFAULT_BOOK = BUILT_IN_BOOKS.find((book) => book.id === DEFAULT_BOOK_ID) || BUILT_IN_BOOKS[0];
    const DEFAULT_WORDS = DEFAULT_BOOK.words;
    const vocabularyStorageKey = 'random-vocabulary:last-import:v1';
    const studySizeStorageKey = 'random-vocabulary:study-size:v1';
    const studySizePreferencesStorageKey = 'random-vocabulary:study-sizes:v2';
    const themeStorageKey = 'random-vocabulary:theme:v1';
    const defaultStudySize = 30;
    const presetStudySizes = [10, 20, 30, 50, 100];
    const vocabularyDatabaseName = 'random-vocabulary';
    const vocabularyDatabaseVersion = 2;
    const vocabularyDatabaseRecord = 'last-import';
    const memoryCardStore = 'reviewCards';
    const memoryLogStore = 'reviewLogs';
    const memorySchedulerVersion = 'FSRS-6';
    const memoryPackageVersion = ${embeddedFsrsPackageVersion};
    const memoryParameterVersion = 'default-0.90-v1';
    const memoryAppVersion = '1.1.0';
    const memoryCore = window.MemoryCurveCore;
    const memoryScheduler = window.FSRS.fsrs({
      request_retention: 0.9,
      enable_short_term: true,
      learning_steps: ['10m'],
      relearning_steps: ['10m'],
      enable_fuzz: true
    });
    const vocabularyDatabase = window.PidanvocaStorage.createDatabaseClient({
      indexedDB: window.indexedDB,
      name: vocabularyDatabaseName,
      version: vocabularyDatabaseVersion
    });
    const reviewRepository = window.PidanvocaStorage.createReviewRepository({
      databaseClient: vocabularyDatabase,
      keyRange: window.IDBKeyRange
    });
    const wordbookRepository = window.PidanvocaStorage.createWordbookRepository({
      databaseClient: vocabularyDatabase,
      recordKey: vocabularyDatabaseRecord
    });

    function normalizeStudySize(value) {
      if (value === 'all' || value === Infinity) return Infinity;
      const numericValue = Math.round(Number(value));
      if (!Number.isFinite(numericValue)) return defaultStudySize;
      return Math.min(500, Math.max(5, numericValue));
    }

    function loadStudySizePreference() {
      try {
        const savedValue = window.localStorage.getItem(studySizeStorageKey);
        return savedValue === null ? defaultStudySize : normalizeStudySize(savedValue);
      } catch {
        return defaultStudySize;
      }
    }

    function loadStudySizePreferences() {
      try {
        const saved = JSON.parse(window.localStorage.getItem(studySizePreferencesStorageKey) || '{}');
        if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {};
        return Object.fromEntries(Object.entries(saved).map(([bookId, value]) => [
          LEGACY_BUILT_IN_BOOK_IDS[bookId] || bookId,
          normalizeStudySize(value)
        ]));
      } catch {
        return {};
      }
    }

    function studySizePreferenceForBook(bookId) {
      return Object.prototype.hasOwnProperty.call(studySizePreferences, bookId)
        ? normalizeStudySize(studySizePreferences[bookId])
        : legacyStudySizePreference;
    }

    function saveStudySizePreference(bookId, value) {
      studySizePreferences[bookId] = value;
      try {
        const serializable = Object.fromEntries(Object.entries(studySizePreferences).map(([id, size]) => [id, size === Infinity ? 'all' : size]));
        window.localStorage.setItem(studySizePreferencesStorageKey, JSON.stringify(serializable));
      } catch {
        // The setting remains active for this page even when storage is unavailable.
      }
    }

    function studySizeLabel(value, spaced = true) {
      if (value === Infinity) return '全部';
      return String(value) + (spaced ? ' 词' : '词');
    }

    function normalizeStoredWord(entry) {
      if (!entry || typeof entry !== 'object' || typeof entry.word !== 'string' || !entry.word.trim()) return null;
      return {
        word: entry.word.trim(),
        phonetic: typeof entry.phonetic === 'string' ? entry.phonetic : '',
        meaning: typeof entry.meaning === 'string' ? entry.meaning : '',
        note: typeof entry.note === 'string' ? entry.note : ''
      };
    }

    function createCustomBookId(fileName) {
      return 'custom:' + encodeURIComponent(String(fileName || '').trim().toLocaleLowerCase());
    }

    const PROJECT_PERSONAL_BOOK_IDS = new Set(PROJECT_PERSONAL_BOOKS.map((book) => book.id));

    function normalizeCustomBook(book) {
      if (!book || typeof book !== 'object' || !Array.isArray(book.words)) return null;
      const words = book.words.map(normalizeStoredWord).filter(Boolean);
      if (!words.length) return null;
      const fileName = typeof book.fileName === 'string' && book.fileName.trim() ? book.fileName.trim() : '我的单词本.html';
      return {
        id: typeof book.id === 'string' && book.id ? book.id : createCustomBookId(fileName),
        name: typeof book.name === 'string' && book.name.trim() ? book.name.trim() : fileName.replace(/\\.html?$/i, ''),
        fileName,
        words
      };
    }

    function mergeProjectPersonalBooks(savedBooks = [], deletedProjectBookIds = []) {
      const deletedIds = new Set(deletedProjectBookIds);
      const bookMap = new Map(savedBooks.filter((book) => !deletedIds.has(book.id)).map((book) => [book.id, book]));
      PROJECT_PERSONAL_BOOKS.forEach((book) => {
        if (!deletedIds.has(book.id)) bookMap.set(book.id, book);
      });
      return Array.from(bookMap.values());
    }

    function normalizeRememberedPayload(saved) {
      if (!saved || saved.version !== 1) return null;
      const fileNames = Array.isArray(saved.fileNames) ? saved.fileNames.filter((name) => typeof name === 'string' && name.trim()) : [];
      const rememberedBuiltInBookId = typeof saved.builtInBookId === 'string'
        ? (LEGACY_BUILT_IN_BOOK_IDS[saved.builtInBookId] || saved.builtInBookId)
        : null;
      const builtInBook = rememberedBuiltInBookId
        ? BUILT_IN_BOOKS.find((book) => book.id === rememberedBuiltInBookId)
        : null;
      const rememberedWords = Array.isArray(saved.words) ? saved.words.map(normalizeStoredWord).filter(Boolean) : [];
      const savedCustomBooks = Array.isArray(saved.customBooks)
        ? saved.customBooks.map(normalizeCustomBook).filter(Boolean)
        : [];
      const deletedProjectPersonalBookIds = Array.isArray(saved.deletedProjectPersonalBookIds)
        ? saved.deletedProjectPersonalBookIds.filter((id) => typeof id === 'string' && PROJECT_PERSONAL_BOOK_IDS.has(id))
        : [];
      const customBooks = mergeProjectPersonalBooks(savedCustomBooks, deletedProjectPersonalBookIds);
      let customBook = typeof saved.customBookId === 'string'
        ? customBooks.find((book) => book.id === saved.customBookId)
        : null;

      if (!builtInBook && !customBook && fileNames.length === 1) {
        customBook = customBooks.find((book) => book.id === createCustomBookId(fileNames[0])) || null;
      }

      if (!builtInBook && !customBook && !savedCustomBooks.length && fileNames.length) {
        if (!rememberedWords.length) return null;
        const legacyFileName = fileNames.length === 1 ? fileNames[0] : '已导入的 ' + fileNames.length + ' 个单词本.html';
        customBook = {
          id: createCustomBookId(legacyFileName),
          name: legacyFileName.replace(/\\.html?$/i, ''),
          fileName: legacyFileName,
          words: rememberedWords
        };
        customBooks.push(customBook);
      }

      if (!builtInBook && !customBook && !rememberedWords.length) return null;

      return {
        words: builtInBook ? builtInBook.words : (customBook ? customBook.words : rememberedWords),
        builtInBookId: builtInBook ? builtInBook.id : null,
        customBookId: customBook ? customBook.id : null,
        customBooks,
        deletedProjectPersonalBookIds,
        fileNames
      };
    }

    async function readRememberedPayload() {
      return wordbookRepository.readLastImport();
    }

    async function writeRememberedPayload(payload) {
      return wordbookRepository.writeLastImport(payload);
    }

    async function memoryReadAll(storeName) {
      return reviewRepository.readAll(storeName);
    }

    async function memoryReadMeta(key) {
      return reviewRepository.readMeta(key);
    }

    async function memoryWriteMeta(key, value) {
      return reviewRepository.writeMeta(key, value);
    }

    async function memoryCardsForBook(bookId) {
      return reviewRepository.cardsForBook(bookId);
    }

    async function memoryDueCardsForBook(bookId, now) {
      return reviewRepository.dueCardsForBook(bookId, now);
    }

    function settleWithin(promise, milliseconds) {
      return new Promise((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error('Storage write timed out')), milliseconds);
        promise.then((value) => {
          window.clearTimeout(timeout);
          resolve(value);
        }, (error) => {
          window.clearTimeout(timeout);
          reject(error);
        });
      });
    }

    function loadRememberedVocabularyFromLocalStorage() {
      try {
        const saved = JSON.parse(window.localStorage.getItem(vocabularyStorageKey) || 'null');
        return normalizeRememberedPayload(saved);
      } catch {
        return null;
      }
    }

    async function loadRememberedVocabulary() {
      try {
        const rememberedVocabulary = normalizeRememberedPayload(await readRememberedPayload());
        if (rememberedVocabulary) return rememberedVocabulary;
      } catch {
        // File URLs and privacy modes may not expose IndexedDB; use the compatible fallback.
      }
      const localVocabulary = loadRememberedVocabularyFromLocalStorage();
      if (localVocabulary) {
        writeRememberedPayload({
          version: 1,
          builtInBookId: localVocabulary.builtInBookId,
          customBookId: localVocabulary.customBookId,
          customBooks: localVocabulary.customBooks,
          deletedProjectPersonalBookIds: localVocabulary.deletedProjectPersonalBookIds,
          fileNames: localVocabulary.fileNames,
          savedAt: new Date().toISOString(),
          words: localVocabulary.words
        }).then(() => {
          try { window.localStorage.removeItem(vocabularyStorageKey); } catch { /* Keep the compatible copy. */ }
        }).catch(() => {});
      }
      return localVocabulary;
    }

    let WORDS = DEFAULT_WORDS;
    let activeBuiltInBookId = DEFAULT_BOOK.id;
    let activeCustomBookId = null;
    let customBooks = PROJECT_PERSONAL_BOOKS.slice();
    let deletedProjectPersonalBookIds = [];
    const deckStage = document.querySelector('.deck-stage');
    const cardLayer = document.getElementById('cardLayer');
    const previousButton = document.getElementById('previousButton');
    const nextButton = document.getElementById('nextButton');
    const themeButton = document.getElementById('themeButton');
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    const settingsButton = document.getElementById('settingsButton');
    const settingsDrawer = document.getElementById('settingsDrawer');
    const wordbookButton = document.getElementById('wordbookButton');
    const wordbookPanel = document.getElementById('wordbookPanel');
    const studySizePanel = document.getElementById('studySizePanel');
    const studySizeValue = document.getElementById('studySizeValue');
    const studySizeHint = document.getElementById('studySizeHint');
    const studySizePresets = document.getElementById('studySizePresets');
    const studySizeCustom = document.getElementById('studySizeCustom');
    const studySizeInput = document.getElementById('studySizeInput');
    const studySizeDecrease = document.getElementById('studySizeDecrease');
    const studySizeIncrease = document.getElementById('studySizeIncrease');
    const studySizeApply = document.getElementById('studySizeApply');
    const studySizeDelete = document.getElementById('studySizeDelete');
    const builtInWordbookList = document.getElementById('builtInWordbookList');
    const customWordbookSection = document.getElementById('customWordbookSection');
    const customWordbookList = document.getElementById('customWordbookList');
    const importButton = document.getElementById('importButton');
    const importInput = document.getElementById('importInput');
    const importStatus = document.getElementById('importStatus');
    const shuffleButton = document.getElementById('shuffleButton');
    const studyCompleteBackdrop = document.getElementById('studyCompleteBackdrop');
    const studyCompleteTitle = document.getElementById('studyCompleteTitle');
    const studyCompleteScore = document.getElementById('studyCompleteScore');
    const studyCompleteDetail = document.getElementById('studyCompleteDetail');
    const studyCompleteContinue = document.getElementById('studyCompleteContinue');
    const studyCompleteAdjust = document.getElementById('studyCompleteAdjust');
    const memoryButton = document.getElementById('memoryButton');
    const memoryBadge = document.getElementById('memoryBadge');
    const memorySettingsButton = document.getElementById('memorySettingsButton');
    const memorySettingsPanel = document.getElementById('memorySettingsPanel');
    const memorySummary = document.getElementById('memorySummary');
    const memoryDailyNewInput = document.getElementById('memoryDailyNewInput');
    const memoryDailyPresets = document.getElementById('memoryDailyPresets');
    const memoryExportButton = document.getElementById('memoryExportButton');
    const memoryImportButton = document.getElementById('memoryImportButton');
    const memoryImportInput = document.getElementById('memoryImportInput');
    const memoryImportMode = document.getElementById('memoryImportMode');
    const memoryResetBookButton = document.getElementById('memoryResetBookButton');
    const memoryResetAllButton = document.getElementById('memoryResetAllButton');
    const memoryBackdrop = document.getElementById('memoryBackdrop');
    const memoryPanel = document.querySelector('.memory-panel');
    const memoryCloseButton = document.getElementById('memoryCloseButton');
    const memoryModeButton = document.getElementById('memoryModeButton');
    const memoryUndoButton = document.getElementById('memoryUndoButton');
    const memoryProgressText = document.getElementById('memoryProgressText');
    const memoryProgressFill = document.getElementById('memoryProgressFill');
    const memoryQueueText = document.getElementById('memoryQueueText');
    const memoryCard = document.getElementById('memoryCard');
    const memoryCardWord = document.getElementById('memoryCardWord');
    const memorySoundButton = document.getElementById('memorySoundButton');
    const memoryCardPrompt = document.getElementById('memoryCardPrompt');
    const memoryAnswer = document.getElementById('memoryAnswer');
    const memoryPhonetic = document.getElementById('memoryAnswerPhonetic');
    const memoryMeaning = document.getElementById('memoryAnswerMeaning');
    const memoryNote = document.getElementById('memoryAnswerNote');
    const memorySpelling = document.getElementById('memorySpelling');
    const memorySpellingInput = document.getElementById('memorySpellingInput');
    const memorySpellingFeedback = document.getElementById('memorySpellingFeedback');
    const memoryRevealButton = document.getElementById('memoryRevealButton');
    const memoryRatingActions = document.getElementById('memoryRatingActions');
    const memoryAgainButton = document.getElementById('memoryAgainButton');
    const memoryGoodButton = document.getElementById('memoryGoodButton');
    const memoryAgainInterval = document.getElementById('memoryAgainInterval');
    const memoryGoodInterval = document.getElementById('memoryGoodInterval');
    const memoryComplete = document.getElementById('memoryComplete');
    const memoryCompleteDetail = document.getElementById('memoryCompleteDetail');
    const memoryReturnButton = document.getElementById('memoryReturnButton');
    deckStage.append(memoryBackdrop);
    const studyModes = ['full', 'word-only', 'spelling'];
    const studyModeLabels = {
      full: '完整显示',
      'word-only': '只显示单词',
      spelling: '拼写练习'
    };

    previousButton.disabled = true;
    nextButton.disabled = true;
    wordbookButton.disabled = true;
    importButton.disabled = true;
    shuffleButton.disabled = true;
    memoryButton.disabled = true;

    let deck = [];
    let position = 0;
    const legacyStudySizePreference = loadStudySizePreference();
    let studySizePreferences = loadStudySizePreferences();
    let studySize = studySizePreferenceForBook(DEFAULT_BOOK.id);
    let studyGroups = [];
    let studyGroupIndex = 0;
    let expandedStudyBookId = null;
    let isStudyCompleteOpen = false;
    let statusTimer = 0;
    let isTransitioning = false;
    let isReady = false;
    let isImporting = false;
    let spellingAdvanceTimer = 0;
    let studyCompleteTimer = 0;
    let studyMode = 'full';
    let memoryDailyNew = memoryCore.defaultDailyNew;
    let memoryStorageAvailable = true;
    const memoryVolatileCards = new Map();
    const memoryVolatileLogs = new Map();
    let memoryIsOpen = false;
    let memoryModeLoading = false;
    let memoryClosing = false;
    let memoryBlockedShakeTimer = 0;
    let memoryQueue = [];
    let memoryIndex = 0;
    let memoryPreview = null;
    let memoryPreviewTime = null;
    let memoryRevealed = false;
    let memoryStudyMode = 'recall';
    let memorySpellingWasWrong = false;
    let memorySpellingAccepted = false;
    let memorySpellingAdvanceTimer = 0;
    let memorySessionId = '';
    let memorySessionBookId = null;
    let memorySessionDateKey = null;
    let memorySessionReviewed = 0;
    let memorySessionNew = 0;
    const memoryActionHistory = [];
    let memoryRatingPending = false;
    let memorySummaryToken = 0;
      const animationCoordinator = new window.PidanvocaAnimations.AnimationCoordinator(({ state }) => {
        deckStage.dataset.animationState = state;
      });
      deckStage.dataset.animationState = animationCoordinator.state;
      const visibleRadius = 3;
      const exitPoints = new Map();
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      const mobileClassicLayout = window.matchMedia('(max-width: 700px)');
      const stackedCardPointer = window.matchMedia('(min-width: 701px) and (hover: hover) and (pointer: fine)');
      let classicSwipeGesture = null;

    function activeStudyBookKey() {
      return activeBuiltInBookId || activeCustomBookId || 'combined-import';
    }

    function activeMemoryBookId() {
      return activeBuiltInBookId || activeCustomBookId || null;
    }

    function memoryUuid() {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
      return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
    }

    function memoryWordMap() {
      return window.PidanvocaMemoryReview.createWordMap(WORDS, memoryCore.normalizeWordKey);
    }

    function memoryRecordFromCard(bookId, word, card) {
      const serialized = memoryCore.serializeFsrsCard(card);
      return {
        cardId: memoryCore.createCardId(bookId, word.word),
        bookId,
        wordKey: memoryCore.normalizeWordKey(word.word),
        displayWord: word.word,
        fsrsCard: serialized,
        state: card.state,
        due: card.due.getTime(),
        stability: card.stability,
        difficulty: card.difficulty,
        elapsedDays: card.elapsed_days,
        scheduledDays: card.scheduled_days,
        reps: card.reps,
        lapses: card.lapses,
        lastReviewAt: card.last_review ? card.last_review.getTime() : null,
        updatedAt: Date.now(),
        schedulerVersion: memorySchedulerVersion,
        packageVersion: memoryPackageVersion,
        parameterVersion: memoryParameterVersion
      };
    }

    function memorySerializeLog(log) {
      if (!log || typeof log !== 'object') return null;
      return {
        ...log,
        due: log.due instanceof Date ? log.due.getTime() : Number(log.due),
        review: log.review instanceof Date ? log.review.getTime() : Number(log.review)
      };
    }

    function setMemorySettingsOpen(isOpen) {
      memorySettingsButton.setAttribute('aria-expanded', String(isOpen));
      memorySettingsButton.setAttribute('aria-label', isOpen ? '隐藏记忆曲线设置' : '显示记忆曲线设置');
      memorySettingsPanel.hidden = !isOpen;
      if (isOpen) refreshMemorySummary();
    }

    async function loadMemorySettings() {
      try {
        const settings = await memoryReadMeta('memory-settings');
        memoryDailyNew = memoryCore.clampDailyNew(settings && settings.dailyNew);
        await memoryWriteMeta('memory-system', {
          formatVersion: memoryCore.backupFormatVersion,
          schedulerName: memorySchedulerVersion,
          fsrsVersion: '6',
          packageVersion: memoryPackageVersion,
          parameterVersion: memoryParameterVersion,
          requestRetention: 0.9,
          databaseVersion: vocabularyDatabaseVersion,
          migrationStatus: 'ready',
          checkedAt: Date.now()
        });
      } catch {
        memoryStorageAvailable = false;
        memoryDailyNew = memoryCore.defaultDailyNew;
      }
      memoryDailyNewInput.value = String(memoryDailyNew);
    }

    async function saveMemorySettings() {
      memoryDailyNew = memoryCore.clampDailyNew(memoryDailyNewInput.value);
      memoryDailyNewInput.value = String(memoryDailyNew);
      try {
        await memoryWriteMeta('memory-settings', { dailyNew: memoryDailyNew, updatedAt: Date.now() });
        memoryStorageAvailable = true;
        showImportStatus('每日新词已设为 ' + memoryDailyNew + ' 个');
      } catch {
        memoryStorageAvailable = false;
        showImportStatus('浏览器无法保存记忆曲线设置，本次调整仅在当前页面有效。', true);
      }
      refreshMemorySummary();
    }

    async function memoryOverview(bookId) {
      if (!bookId) return { records: [], due: [], learned: new Set(), newWords: [] };
      const now = Date.now();
      const records = memoryStorageAvailable
        ? await memoryCardsForBook(bookId)
        : Array.from(memoryVolatileCards.values()).filter((record) => record.bookId === bookId);
      const wordMap = memoryWordMap();
      const relevant = records.filter((record) => wordMap.has(record.wordKey));
      const indexedDue = memoryStorageAvailable
        ? await memoryDueCardsForBook(bookId, now)
        : relevant.filter((record) => Number(record.due) <= now);
      const due = memoryCore.sortDueRecords(indexedDue.filter((record) => wordMap.has(record.wordKey)));
      const learned = new Set(relevant.map((record) => record.wordKey));
      const newWords = due.length >= memoryCore.backlogThreshold
        ? []
        : memoryCore.selectDailyNewWords(WORDS, learned, bookId, memoryCore.localDateKey(new Date()), memoryDailyNew);
      return { records: relevant, due, learned, newWords };
    }

    async function refreshMemorySummary() {
      const token = ++memorySummaryToken;
      const bookId = activeMemoryBookId();
      if (!bookId) {
        memorySummary.textContent = '合并查看模式不能建立稳定进度，请先选择一个具体单词本。';
        memoryButton.disabled = !isReady || memoryModeLoading;
        memoryBadge.hidden = true;
        memoryResetBookButton.disabled = true;
        return;
      }
      try {
        const overview = await memoryOverview(bookId);
        const dailySelection = await memoryDailySelection(bookId, overview);
        if (token !== memorySummaryToken) return;
        const paused = overview.due.length >= memoryCore.backlogThreshold;
        const now = Date.now();
        const nextDue = overview.records.map((record) => Number(record.due)).filter((due) => due > now).sort((left, right) => left - right)[0];
        const upcoming = nextDue && nextDue - now <= 60 * 60 * 1000 ? '；最近重学 ' + memoryCore.intervalLabel(now, nextDue) + '后到期' : '';
        memorySummary.textContent = '共 ' + WORDS.length + ' 词 · 今日待复习 ' + overview.due.length + ' · 今日新词 ' + dailySelection.length + ' · 已学习 ' + overview.learned.size + upcoming + (paused ? '；积压较多，已暂停新词' : '') + (memoryStorageAvailable ? '' : '；当前为临时会话，进度不会保存');
        memoryBadge.textContent = overview.due.length > 99 ? '99+' : String(overview.due.length);
        memoryBadge.hidden = overview.due.length === 0;
        memoryButton.title = memoryIsOpen ? '返回经典模式（Esc）' : overview.due.length + ' 个待复习，' + dailySelection.length + ' 个今日新词';
        memoryButton.disabled = !isReady || memoryModeLoading;
        memoryResetBookButton.disabled = overview.records.length === 0;
      } catch {
        if (token !== memorySummaryToken) return;
        memoryStorageAvailable = false;
        memorySummary.textContent = '当前浏览器无法使用 IndexedDB，记忆曲线进度不会保存。';
        memoryButton.disabled = !isReady || memoryModeLoading;
        memoryBadge.hidden = true;
        memoryResetBookButton.disabled = true;
      }
    }

    async function memoryDailySelection(bookId, overview) {
      const dateKey = memoryCore.localDateKey(new Date());
      const metaKey = 'daily:' + bookId + ':' + dateKey;
      const wordMap = memoryWordMap();
      let selectedKeys = [];
      let hasSavedSelection = false;
      if (overview.due.length >= memoryCore.backlogThreshold) return selectedKeys;
      if (!memoryStorageAvailable) {
        return memoryCore.selectDailyNewWords(WORDS, overview.learned, bookId, dateKey, memoryDailyNew).map((item) => item.wordKey);
      }
      try {
        const saved = await memoryReadMeta(metaKey);
        if (saved && Array.isArray(saved.wordKeys)) {
          hasSavedSelection = true;
          selectedKeys = saved.wordKeys.filter((key) => wordMap.has(key) && !overview.learned.has(key));
        }
        if (!hasSavedSelection && overview.due.length < memoryCore.backlogThreshold) {
          selectedKeys = memoryCore.selectDailyNewWords(WORDS, overview.learned, bookId, dateKey, memoryDailyNew).map((item) => item.wordKey);
          await memoryWriteMeta(metaKey, { bookId, dateKey, wordKeys: selectedKeys, createdAt: Date.now() });
        }
      } catch {
        memoryStorageAvailable = false;
        throw new Error('无法读取复习进度，记忆曲线未启动。');
      }
      return selectedKeys;
    }

    async function buildMemoryQueue() {
      const bookId = activeMemoryBookId();
      if (!bookId) throw new Error('请先在“单词本”中选择一个具体词库。');
      const overview = await memoryOverview(bookId);
      const selectedKeys = await memoryDailySelection(bookId, overview);
      return {
        ...window.PidanvocaMemoryReview.buildReviewQueue(
          WORDS,
          overview.due,
          selectedKeys,
          memoryCore.normalizeWordKey
        ),
        learnedCount: overview.learned.size
      };
    }

    function memoryCurrentItem() {
      return memoryQueue[memoryIndex] || null;
    }

    function cancelMemorySpellingAdvance() {
      window.clearTimeout(memorySpellingAdvanceTimer);
      memorySpellingAdvanceTimer = 0;
    }

    function syncMemoryModeButton() {
      const isSpelling = memoryStudyMode === 'spelling';
      const description = isSpelling
        ? '当前：拼写练习；点击切换到回忆模式'
        : '当前：回忆模式；点击切换到拼写练习';
      memoryModeButton.dataset.memoryStudyMode = memoryStudyMode;
      memoryModeButton.setAttribute('aria-pressed', String(isSpelling));
      memoryModeButton.setAttribute('aria-label', description);
      memoryModeButton.title = description;
    }

    function clearMemoryActionHistory() {
      memoryActionHistory.length = 0;
      memoryUndoButton.disabled = true;
    }

    function invalidateMemorySessionHistory(bookId = null) {
      if (bookId && bookId !== memorySessionBookId) return;
      clearMemoryActionHistory();
      memorySessionBookId = null;
      memorySessionDateKey = null;
    }

    function syncMemoryUndoButton() {
      memoryUndoButton.disabled = memoryRatingPending || memoryActionHistory.length === 0;
    }

    function syncMemoryRatingButtons() {
      const hasItem = Boolean(memoryCurrentItem());
      const isSpelling = memoryStudyMode === 'spelling';
      memoryAgainButton.disabled = !hasItem || memoryRatingPending || memorySpellingAccepted;
      memoryGoodButton.disabled = !hasItem || memoryRatingPending || isSpelling;
      memoryRevealButton.disabled = !hasItem || memoryRatingPending || memorySpellingAccepted;
      memoryModeButton.disabled = !hasItem || memoryRatingPending || memorySpellingAccepted;
      document.body.classList.toggle('memory-good-enabled', memoryIsOpen && hasItem && !memoryGoodButton.disabled);
    }

    function shakeBlockedMemoryGood() {
      if (!memoryCurrentItem() || memoryRatingPending || memoryBackdrop.classList.contains('is-transitioning')) return;
      window.clearTimeout(memoryBlockedShakeTimer);
      memoryPanel.classList.remove('is-good-blocked');
      void memoryPanel.offsetWidth;
      memoryPanel.classList.add('is-good-blocked');
      memoryBlockedShakeTimer = window.setTimeout(() => {
        memoryPanel.classList.remove('is-good-blocked');
        memoryBlockedShakeTimer = 0;
      }, 440);
    }

    function revealMemoryAnswer() {
      if (!memoryCurrentItem() || memoryRevealed) return;
      if (memoryStudyMode === 'spelling') {
        cancelMemorySpellingAdvance();
        memorySpellingAccepted = false;
        memorySpellingWasWrong = true;
        memoryCardWord.textContent = memoryCurrentItem().word.word;
        memorySpellingInput.readOnly = true;
        if (!memorySpellingFeedback.textContent) memorySpellingFeedback.textContent = '已查看答案，本词请按“忘记”继续。';
        memorySpellingFeedback.className = 'memory-spelling-feedback is-error';
        memoryAgainButton.querySelector('strong').textContent = '继续';
      }
      memoryRevealed = true;
      memoryAnswer.hidden = false;
      memoryCard.classList.add('is-revealed');
      syncMemoryRatingButtons();
      memoryRevealButton.querySelector('strong').textContent = '收起答案';
      memoryRevealButton.querySelector('small').textContent = '再次点击';
      memoryAgainButton.focus();
    }

    function hideMemoryAnswer() {
      if (!memoryCurrentItem() || !memoryRevealed || memoryRatingPending) return;
      memoryRevealed = false;
      memoryAnswer.hidden = true;
      memoryCard.classList.remove('is-revealed');
      if (memoryStudyMode === 'spelling') memoryCardWord.textContent = '';
      syncMemoryRatingButtons();
      memoryRevealButton.querySelector('strong').textContent = '查看答案';
      memoryRevealButton.querySelector('small').textContent = 'Space';
      memoryRevealButton.focus();
    }

    function toggleMemoryAnswer() {
      if (memoryRevealed) hideMemoryAnswer();
      else revealMemoryAnswer();
    }

    function memoryPreviewCard(item) {
      if (item.record) {
        const card = memoryCore.deserializeFsrsCard(item.record.fsrsCard);
        if (card) return card;
      }
      return window.FSRS.createEmptyCard(memoryPreviewTime);
    }

    function focusMemorySurface() {
      if (!memoryIsOpen) return;
      if (!memoryCurrentItem()) memoryReturnButton.focus();
      else if (memoryStudyMode === 'spelling') memorySpellingInput.focus();
      else memoryCard.focus();
    }

    function setMemoryStudyMode(nextMode) {
      if (!['recall', 'spelling'].includes(nextMode) || nextMode === memoryStudyMode || memoryRatingPending || memorySpellingAccepted) return;
      cancelMemorySpellingAdvance();
      memoryStudyMode = nextMode;
      syncMemoryModeButton();
      if (memoryCurrentItem()) renderMemoryCard();
    }

    function toggleMemoryStudyMode() {
      setMemoryStudyMode(memoryStudyMode === 'spelling' ? 'recall' : 'spelling');
    }

    function renderMemoryCard(shouldFocus = true) {
      const item = memoryCurrentItem();
      memoryComplete.hidden = Boolean(item);
      memoryCard.hidden = !item;
      memoryRatingActions.hidden = !item;
      syncMemoryUndoButton();
      if (!item) {
        cancelMemorySpellingAdvance();
        memoryModeButton.disabled = true;
        memoryProgressText.textContent = memoryQueue.length + ' / ' + memoryQueue.length;
        memoryProgressFill.style.width = '100%';
        memoryQueueText.textContent = '今日完成';
        memoryCompleteDetail.textContent = '完成 ' + memorySessionReviewed + ' 次复习，学习 ' + memorySessionNew + ' 个新词。正在计算下一次复习…';
        refreshMemoryCompletion();
        return;
      }
      memoryRevealed = false;
      memorySpellingWasWrong = false;
      memorySpellingAccepted = false;
      cancelMemorySpellingAdvance();
      memoryPreviewTime = new Date();
      memoryPreview = memoryScheduler.repeat(memoryPreviewCard(item), memoryPreviewTime);
      memoryAgainInterval.textContent = memoryCore.intervalLabel(memoryPreviewTime, memoryPreview[window.FSRS.Rating.Again].card.due);
      memoryGoodInterval.textContent = memoryCore.intervalLabel(memoryPreviewTime, memoryPreview[window.FSRS.Rating.Good].card.due);
      memoryCard.classList.remove('is-revealed');
      memoryCard.classList.toggle('is-spelling', memoryStudyMode === 'spelling');
      memoryProgressText.textContent = (memoryIndex + 1) + ' / ' + memoryQueue.length;
      memoryProgressFill.style.width = Math.round(memoryIndex / Math.max(1, memoryQueue.length) * 100) + '%';
      memoryQueueText.textContent = item.isNew ? '今日新词' : '到期复习';
      memoryCardWord.textContent = memoryStudyMode === 'spelling' ? '' : item.word.word;
      memoryCardPrompt.textContent = memoryStudyMode === 'spelling' ? (item.word.meaning || '根据释义拼写单词') : '回想后直接评分，或查看答案';
      memoryPhonetic.textContent = item.word.phonetic || '';
      memoryPhonetic.hidden = !item.word.phonetic;
      memoryMeaning.textContent = item.word.meaning || '暂无释义';
      memoryNote.textContent = item.word.note || '';
      memoryNote.hidden = !item.word.note;
      memoryAnswer.hidden = true;
      memorySpelling.hidden = memoryStudyMode !== 'spelling';
      memorySpellingInput.value = '';
      memorySpellingInput.readOnly = false;
      memorySpellingInput.classList.remove('is-correct');
      memorySpellingFeedback.textContent = '';
      memorySpellingFeedback.className = 'memory-spelling-feedback';
      syncMemoryRatingButtons();
      syncMemoryModeButton();
      memoryAgainButton.querySelector('strong').textContent = '忘记';
      memoryRevealButton.querySelector('strong').textContent = '查看答案';
      memoryRevealButton.querySelector('small').textContent = 'Space';
      if (shouldFocus) window.setTimeout(focusMemorySurface, 80);
    }

    function cloneMemoryPanelForTransition(...classNames) {
      const panel = memoryPanel.cloneNode(true);
      panel.querySelectorAll('[id]').forEach((element) => {
        element.dataset.memoryCloneId = element.id;
        element.removeAttribute('id');
      });
      panel.removeAttribute('role');
      panel.removeAttribute('aria-labelledby');
      panel.setAttribute('aria-hidden', 'true');
      panel.classList.add(...classNames);
      return panel;
    }

    function memoryClonePart(panel, id) {
      return panel.querySelector('[data-memory-clone-id="' + id + '"]');
    }

    function populateMemoryTransitionPanel(panel) {
      const item = memoryCurrentItem();
      const complete = memoryClonePart(panel, 'memoryComplete');
      const card = memoryClonePart(panel, 'memoryCard');
      const ratingActions = memoryClonePart(panel, 'memoryRatingActions');
      const progressText = memoryClonePart(panel, 'memoryProgressText');
      const progressFill = memoryClonePart(panel, 'memoryProgressFill');
      const queueText = memoryClonePart(panel, 'memoryQueueText');
      complete.hidden = Boolean(item);
      card.hidden = !item;
      ratingActions.hidden = !item;
      if (!item) {
        progressText.textContent = memoryQueue.length + ' / ' + memoryQueue.length;
        progressFill.style.width = '100%';
        queueText.textContent = '今日完成';
        memoryClonePart(panel, 'memoryCompleteDetail').textContent = '完成 ' + memorySessionReviewed + ' 次复习，学习 ' + memorySessionNew + ' 个新词。';
        return;
      }

      const previewTime = new Date();
      const preview = memoryScheduler.repeat(memoryPreviewCard(item), previewTime);
      const isSpelling = memoryStudyMode === 'spelling';
      card.classList.remove('is-revealed');
      card.classList.toggle('is-spelling', isSpelling);
      progressText.textContent = (memoryIndex + 1) + ' / ' + memoryQueue.length;
      progressFill.style.width = Math.round(memoryIndex / Math.max(1, memoryQueue.length) * 100) + '%';
      queueText.textContent = item.isNew ? '今日新词' : '到期复习';
      memoryClonePart(panel, 'memoryCardWord').textContent = isSpelling ? '' : item.word.word;
      memoryClonePart(panel, 'memoryCardPrompt').textContent = isSpelling ? (item.word.meaning || '根据释义拼写单词') : '回想后直接评分，或查看答案';
      const phonetic = memoryClonePart(panel, 'memoryAnswerPhonetic');
      phonetic.textContent = item.word.phonetic || '';
      phonetic.hidden = !item.word.phonetic;
      memoryClonePart(panel, 'memoryAnswerMeaning').textContent = item.word.meaning || '暂无释义';
      const note = memoryClonePart(panel, 'memoryAnswerNote');
      note.textContent = item.word.note || '';
      note.hidden = !item.word.note;
      memoryClonePart(panel, 'memoryAnswer').hidden = true;
      memoryClonePart(panel, 'memorySpelling').hidden = !isSpelling;
      memoryClonePart(panel, 'memoryAgainInterval').textContent = memoryCore.intervalLabel(previewTime, preview[window.FSRS.Rating.Again].card.due);
      memoryClonePart(panel, 'memoryGoodInterval').textContent = memoryCore.intervalLabel(previewTime, preview[window.FSRS.Rating.Good].card.due);
    }

    function waitForElementTransition(element, propertyName, fallbackMilliseconds) {
      return window.PidanvocaAnimations.waitForElementTransition(element, propertyName, fallbackMilliseconds, window);
    }

    function afterTwoAnimationFrames(callback) {
      window.PidanvocaAnimations.afterTwoAnimationFrames(callback, window.requestAnimationFrame.bind(window));
    }

    function prepareMemoryStackAdvance() {
      const target = position + 1;
      if (target >= deck.length) return null;
      const cards = synchronizeCards(position, 1, new Set([position, target]));
      cardLayer.replaceChildren(...cards);
      bringCurrentCardForward(cards);
      cardLayer.classList.add('is-memory-advancing');
      void cardLayer.offsetWidth;
      return { cards, target };
    }

    function startMemoryStackAdvance(advance) {
      if (!advance) return;
      advance.cards.forEach((card) => {
        const deckPosition = Number(card.dataset.deckPosition);
        if (deckPosition === position) {
          card.classList.add('is-memory-hidden-current');
          return;
        }
        if (deckPosition > position) setCardOffset(card, deckPosition - advance.target);
      });
    }

    function finishMemoryStackAdvance(advance) {
      if (!advance) return;
      cardLayer.classList.remove('is-memory-advancing');
      const cards = synchronizeCards(position);
      cardLayer.replaceChildren(...cards);
      bringCurrentCardForward(cards);
    }

    async function transitionMemoryCardAfterRating(exitPoint, advanceFromStack, transition) {
      if (reducedMotion.matches) {
        renderMemoryCard();
        transition.finish();
        return;
      }
      const incomingPanel = cloneMemoryPanelForTransition('memory-panel--incoming');
      populateMemoryTransitionPanel(incomingPanel);
      const stackAdvance = advanceFromStack ? prepareMemoryStackAdvance() : null;
      memoryPanel.classList.add('memory-panel--flight');
      applyExitPoint(memoryPanel, exitPoint || createExitPoint());
      memoryBackdrop.append(incomingPanel);
      memoryBackdrop.classList.add('is-transitioning');
      const outgoingFinished = waitForElementTransition(memoryPanel, 'transform', 560);
      const incomingFinished = waitForElementTransition(incomingPanel, 'transform', 760);
      void incomingPanel.offsetWidth;
      const incomingStartRect = incomingPanel.getBoundingClientRect();
      incomingPanel.dataset.transitionStartCenter = String(incomingStartRect.left + incomingStartRect.width / 2);
      try {
        await new Promise((resolve) => {
          afterTwoAnimationFrames(() => {
            memoryPanel.classList.add('is-flying-out');
            if (stackAdvance) {
              transition.move('advancing-stack');
              startMemoryStackAdvance(stackAdvance);
            }
            transition.move('revealing-incoming');
            memoryBackdrop.classList.add('is-card-advancing');
            Promise.all([outgoingFinished, incomingFinished]).then(resolve);
          });
        });
      } finally {
        memoryPanel.style.visibility = 'hidden';
        memoryPanel.classList.remove('memory-panel--flight', 'is-flying-out');
        clearExitPoint(memoryPanel);
        renderMemoryCard(false);
        finishMemoryStackAdvance(stackAdvance);
        memoryBackdrop.classList.remove('is-transitioning', 'is-card-advancing');
        incomingPanel.remove();
        memoryPanel.style.removeProperty('visibility');
        if (transition.isActive()) transition.finish();
      }
      focusMemorySurface();
    }

    async function transitionMemoryCardAfterUndo(exitPoint, transition) {
      if (reducedMotion.matches) {
        renderMemoryCard();
        transition.finish();
        return;
      }
      const yieldingPanel = cloneMemoryPanelForTransition('memory-panel--yielding');
      memoryBackdrop.append(yieldingPanel);
      applyExitPoint(memoryPanel, exitPoint || createExitPoint());
      memoryPanel.classList.add('memory-panel--returning');
      memoryBackdrop.classList.add('is-transitioning');
      renderMemoryCard(false);
      void memoryPanel.offsetWidth;
      try {
        const returningFinished = waitForElementTransition(memoryPanel, 'transform', 680);
        await new Promise((resolve) => {
          afterTwoAnimationFrames(() => {
            memoryBackdrop.classList.add('is-undo-returning');
            returningFinished.then(resolve);
          });
        });
      } finally {
        yieldingPanel.remove();
        memoryPanel.classList.remove('memory-panel--returning');
        clearExitPoint(memoryPanel);
        memoryBackdrop.classList.remove('is-transitioning', 'is-undo-returning');
        if (transition.isActive()) transition.finish();
      }
      focusMemorySurface();
    }

    function cancelActiveCardTransition(reason = 'interrupted') {
      if (animationCoordinator.isIdle) return false;
      animationCoordinator.cancelActive(reason);
      if (memoryClosing) {
        finishMemoryReviewClose();
        return true;
      }

      memoryBackdrop.querySelectorAll('.memory-panel--incoming, .memory-panel--yielding').forEach((panel) => panel.remove());
      memoryPanel.classList.remove(
        'memory-panel--flight',
        'memory-panel--incoming',
        'memory-panel--returning',
        'is-flying-out'
      );
      memoryPanel.style.removeProperty('visibility');
      clearExitPoint(memoryPanel);
      memoryBackdrop.classList.remove('is-transitioning', 'is-card-advancing', 'is-undo-returning');
      cardLayer.classList.remove('is-transitioning', 'is-memory-returning', 'is-memory-advancing');
      isTransitioning = false;
      if (memoryIsOpen) renderMemoryCard(false);
      renderStable();
      return true;
    }

    async function refreshMemoryCompletion() {
      if (!memoryIsOpen || memoryCurrentItem()) return;
      try {
        const overview = await memoryOverview(activeMemoryBookId());
        const now = Date.now();
        const nextDue = overview.records.map((record) => Number(record.due)).filter((due) => due > now).sort((left, right) => left - right)[0];
        const savedText = memoryStorageAvailable ? '进度已保存。' : '当前为临时会话，关闭页面后进度会丢失。';
        memoryCompleteDetail.textContent = '完成 ' + memorySessionReviewed + ' 次复习，学习 ' + memorySessionNew + ' 个新词。' + (nextDue ? '下一张预计 ' + new Date(nextDue).toLocaleString() + ' 到期。' : '当前没有未来任务。') + savedText;
      } catch {
        memoryCompleteDetail.textContent = '完成 ' + memorySessionReviewed + ' 次复习，学习 ' + memorySessionNew + ' 个新词。';
      }
    }

    async function openMemoryReview() {
      if (memoryIsOpen || memoryModeLoading || memoryClosing || !animationCoordinator.isIdle || !isReady) return;
      memoryModeLoading = true;
      memoryButton.disabled = true;
      try {
        const bookId = activeMemoryBookId();
        if (!bookId) throw new Error('请先在“单词本”中选择一个具体词库。');
        const dateKey = memoryCore.localDateKey(new Date());
        const canResume = memorySessionBookId === bookId && memorySessionDateKey === dateKey;
        if (!canResume) {
          const built = await buildMemoryQueue();
          memoryQueue = built.items;
          memoryIndex = 0;
          memorySessionId = memoryUuid();
          memorySessionBookId = bookId;
          memorySessionDateKey = dateKey;
          memorySessionReviewed = 0;
          memorySessionNew = 0;
          clearMemoryActionHistory();
        }
        memoryIsOpen = true;
        setSettingsOpen(false);
        closeStudyComplete();
        document.body.classList.add('memory-mode');
        memoryButton.setAttribute('aria-pressed', 'true');
        memoryButton.setAttribute('aria-label', '返回经典模式');
        memoryButton.title = '返回经典模式（Esc）';
        settingsButton.disabled = true;
        cardLayer.setAttribute('aria-hidden', 'true');
        memoryBackdrop.setAttribute('aria-hidden', 'false');
        memoryBackdrop.hidden = false;
        window.requestAnimationFrame(() => memoryBackdrop.classList.add('is-visible'));
        renderMemoryCard();
        document.title = '今日复习 · 随机单词本';
      } catch (error) {
        showImportStatus(error instanceof Error ? error.message : '记忆曲线无法启动。', true);
      } finally {
        memoryModeLoading = false;
        memoryButton.disabled = !isReady;
      }
    }

    function finishMemoryReviewClose(transition = null) {
      cancelMemorySpellingAdvance();
      memoryClosing = false;
      memoryIsOpen = false;
      window.clearTimeout(memoryBlockedShakeTimer);
      memoryBlockedShakeTimer = 0;
      memoryPanel.classList.remove('is-good-blocked');
      document.body.classList.remove('memory-mode', 'memory-good-enabled');
      memoryButton.setAttribute('aria-pressed', 'false');
      memoryButton.setAttribute('aria-label', '打开今日复习');
      memoryButton.disabled = !isReady;
      memoryCloseButton.disabled = false;
      memoryReturnButton.disabled = false;
      settingsButton.disabled = !isReady;
      cardLayer.setAttribute('aria-hidden', 'false');
      memoryBackdrop.setAttribute('aria-hidden', 'true');
      memoryBackdrop.classList.remove('is-visible', 'is-returning-to-classic');
      memoryBackdrop.hidden = true;
      memoryBackdrop.querySelectorAll('.memory-panel--flight, .memory-panel--incoming, .memory-panel--yielding').forEach((panel) => {
        if (panel !== memoryPanel) panel.remove();
      });
      memoryPanel.classList.remove('memory-panel--flight', 'memory-panel--incoming', 'memory-panel--returning', 'is-flying-out');
      memoryPanel.style.removeProperty('visibility');
      clearExitPoint(memoryPanel);
      cardLayer.classList.remove('is-transitioning', 'is-memory-returning', 'is-memory-advancing');
      if (transition?.isActive()) transition.finish();
      renderStable();
      refreshMemorySummary();
      syncChrome();
      memoryButton.focus();
    }

    function closeMemoryReview() {
      if (!memoryIsOpen || memoryRatingPending || memoryClosing || !animationCoordinator.isIdle) return;
      if (reducedMotion.matches) {
        finishMemoryReviewClose();
        return;
      }

      const transition = animationCoordinator.begin('closing-memory', { mode: 'memory', direction: 'backward' });

      const incomingCard = cardLayer.querySelector('.deck-card[data-offset="0"]');
      if (!(incomingCard instanceof HTMLElement)) {
        finishMemoryReviewClose(transition);
        return;
      }

      memoryClosing = true;
      memoryButton.disabled = true;
      memoryCloseButton.disabled = true;
      memoryReturnButton.disabled = true;
      applyExitPoint(incomingCard, exitPointFor(position));
      incomingCard.classList.add('is-incoming', 'is-returning');
      cardLayer.classList.add('is-memory-returning');
      const returningFinished = waitForElementTransition(incomingCard, 'transform', 760);
      void incomingCard.offsetWidth;

      afterTwoAnimationFrames(() => {
          transition.move('returning-classic');
          cardLayer.classList.add('is-transitioning');
          memoryBackdrop.classList.add('is-returning-to-classic');
          returningFinished.then(() => finishMemoryReviewClose(transition));
      });
    }

    async function rateMemoryCard(rating) {
      const item = memoryCurrentItem();
      if (!item || !memoryPreview || memoryRatingPending || !animationCoordinator.isIdle || (rating !== window.FSRS.Rating.Again && rating !== window.FSRS.Rating.Good)) return;
      if (memoryStudyMode === 'spelling') {
        if (rating === window.FSRS.Rating.Good && !memorySpellingAccepted) return;
      }
      cancelMemorySpellingAdvance();
      memoryRatingPending = true;
      memoryAgainButton.disabled = true;
      memoryRevealButton.disabled = true;
      memoryGoodButton.disabled = true;
      document.body.classList.remove('memory-good-enabled');
      const transition = animationCoordinator.begin('saving-rating', { mode: 'memory', direction: 'forward' });
      try {
        const result = memoryPreview[rating];
        const bookId = activeMemoryBookId();
        if (!bookId) throw new Error('当前词库已变化。');
        const afterRecord = memoryRecordFromCard(bookId, item.word, result.card);
        const reviewedAt = memoryPreviewTime.getTime();
        const logId = memoryUuid();
        const logRecord = {
          logId,
          sessionId: memorySessionId,
          cardId: afterRecord.cardId,
          bookId,
          wordKey: afterRecord.wordKey,
          rating,
          reviewedAt,
          dueBefore: item.record ? item.record.due : reviewedAt,
          dueAfter: afterRecord.due,
          scheduledDays: afterRecord.scheduledDays,
          elapsedDays: afterRecord.elapsedDays,
          stateBefore: item.record ? item.record.state : window.FSRS.State.New,
          stateAfter: afterRecord.state,
          beforeRecord: item.record ? { ...item.record } : null,
          afterRecord: { ...afterRecord },
          fsrsLog: memorySerializeLog(result.log),
          timezoneOffsetMinutes: new Date(reviewedAt).getTimezoneOffset(),
          schedulerVersion: memorySchedulerVersion,
          packageVersion: memoryPackageVersion,
          parameterVersion: memoryParameterVersion
        };
        if (memoryStorageAvailable) {
          await reviewRepository.saveReview(afterRecord, logRecord);
        } else {
          memoryVolatileCards.set(afterRecord.cardId, afterRecord);
          memoryVolatileLogs.set(logId, logRecord);
        }
        const exitPoint = createExitPoint();
        const sessionUpdate = window.PidanvocaMemoryReview.applyRating(
          { index: memoryIndex, reviewed: memorySessionReviewed, learnedNew: memorySessionNew },
          {
            logId,
            beforeRecord: item.record,
            afterRecord,
            wasNew: item.isNew,
            exitPoint
          }
        );
        memoryActionHistory.push(sessionUpdate.action);
        memorySessionReviewed = sessionUpdate.reviewed;
        memorySessionNew = sessionUpdate.learnedNew;
        item.record = afterRecord;
        memoryIndex = sessionUpdate.index;
        if (transition.isActive()) {
          transition.move('exiting-current');
          await transitionMemoryCardAfterRating(exitPoint, rating === window.FSRS.Rating.Good, transition);
        } else {
          renderMemoryCard(false);
        }
        refreshMemorySummary();
      } catch (error) {
        transition.cancel('rating-failed');
        if (memoryStudyMode === 'spelling' && rating === window.FSRS.Rating.Good) {
          memorySpellingAccepted = false;
          memorySpellingInput.readOnly = false;
          memorySpellingInput.classList.remove('is-correct');
          memorySpellingFeedback.textContent = '进度保存失败，请按 Enter 重试。';
          memorySpellingFeedback.className = 'memory-spelling-feedback is-error';
        }
        showImportStatus(error instanceof Error ? error.message : '学习进度未保存，请重试。', true);
      } finally {
        if (transition.isActive()) transition.cancel('rating-finished-without-settling');
        memoryRatingPending = false;
        memoryRevealButton.disabled = !memoryCurrentItem();
        syncMemoryRatingButtons();
        syncMemoryUndoButton();
      }
    }

    async function undoMemoryRating() {
      const action = memoryActionHistory.at(-1);
      if (!action || memoryRatingPending || !animationCoordinator.isIdle) return;
      memoryRatingPending = true;
      memoryUndoButton.disabled = true;
      memoryAgainButton.disabled = true;
      memoryRevealButton.disabled = true;
      memoryGoodButton.disabled = true;
      const transition = animationCoordinator.begin('undo-returning', { mode: 'memory', direction: 'backward' });
      try {
        if (memoryStorageAvailable) {
          await reviewRepository.undoReview(action);
        } else {
          if (action.beforeRecord) memoryVolatileCards.set(action.beforeRecord.cardId, action.beforeRecord);
          else memoryVolatileCards.delete(action.afterRecord.cardId);
          memoryVolatileLogs.delete(action.logId);
        }
      } catch {
        transition.cancel('undo-save-failed');
        showImportStatus('撤销失败，原评分仍然保留。', true);
        memoryRatingPending = false;
        syncMemoryRatingButtons();
        syncMemoryUndoButton();
        return;
      }

      memoryActionHistory.pop();
      const restoredSession = window.PidanvocaMemoryReview.undoRating(
        { index: memoryIndex, reviewed: memorySessionReviewed, learnedNew: memorySessionNew },
        action
      );
      memoryIndex = restoredSession.index;
      memorySessionReviewed = restoredSession.reviewed;
      memorySessionNew = restoredSession.learnedNew;
      const item = memoryQueue[memoryIndex];
      if (item) item.record = action.beforeRecord ? { ...action.beforeRecord } : null;
      try {
        if (transition.isActive()) await transitionMemoryCardAfterUndo(action.exitPoint, transition);
        else renderMemoryCard(false);
      } catch {
        transition.cancel('undo-animation-failed');
        renderMemoryCard(false);
      } finally {
        if (transition.isActive()) transition.cancel('undo-finished-without-settling');
        memoryRatingPending = false;
        memoryRevealButton.disabled = !memoryCurrentItem();
        syncMemoryRatingButtons();
        syncMemoryUndoButton();
      }
      refreshMemorySummary();
      showImportStatus('已撤销上次评分');
    }

    function checkMemorySpelling(markWrong = false) {
      const item = memoryCurrentItem();
      if (!item || memoryStudyMode !== 'spelling' || memoryRatingPending || memorySpellingAccepted || memorySpellingWasWrong) return;
      const answer = normalizeSpelling(memorySpellingInput.value);
      if (!answer) return;
      const correct = answer === normalizeSpelling(item.word.word);
      if (correct) {
        memorySpellingAccepted = true;
        memorySpellingInput.readOnly = true;
        memorySpellingInput.classList.add('is-correct');
        memorySpellingFeedback.textContent = '拼写正确，正在进入下一个单词…';
        memorySpellingFeedback.className = 'memory-spelling-feedback is-success';
        syncMemoryRatingButtons();
        memorySpellingAdvanceTimer = window.setTimeout(() => {
          memorySpellingAdvanceTimer = 0;
          rateMemoryCard(window.FSRS.Rating.Good);
        }, 600);
        return;
      }
      if (!markWrong) return;
      memorySpellingWasWrong = true;
      memorySpellingInput.readOnly = true;
      memorySpellingFeedback.textContent = '拼写错误，答案是 ' + item.word.word + '。请按“忘记”继续。';
      memorySpellingFeedback.className = 'memory-spelling-feedback is-error';
      revealMemoryAnswer();
      memoryAgainButton.querySelector('strong').textContent = '继续';
      syncMemoryRatingButtons();
    }

    async function exportMemoryProgress() {
      try {
        const storedProgress = memoryStorageAvailable
          ? await reviewRepository.exportProgress()
          : {
              reviewCards: Array.from(memoryVolatileCards.values()),
              reviewLogs: Array.from(memoryVolatileLogs.values()),
              metaEntries: [['memory-settings', { dailyNew: memoryDailyNew }]]
            };
        const { reviewCards, reviewLogs, metaEntries: metaValues } = storedProgress;
        const bookIds = new Set(reviewCards.map((card) => card.bookId));
        const books = BUILT_IN_BOOKS.concat(customBooks).filter((book) => bookIds.has(book.id)).map((book) => ({ id: book.id, name: book.name, fileName: book.fileName, wordCount: book.words.length }));
        const payload = {
          format: memoryCore.backupFormat,
          formatVersion: memoryCore.backupFormatVersion,
          exportedAt: new Date().toISOString(),
          appVersion: memoryAppVersion,
          schedulerName: memorySchedulerVersion,
          fsrsVersion: '6',
          packageVersion: memoryPackageVersion,
          parameterVersion: memoryParameterVersion,
          parameters: { requestRetention: 0.9, enableShortTerm: true, learningSteps: ['10m'], relearningSteps: ['10m'] },
          settings: { dailyNew: memoryDailyNew },
          books,
          scheduler: { name: memorySchedulerVersion, package: 'ts-fsrs', packageVersion: memoryPackageVersion, parameterVersion: memoryParameterVersion, requestRetention: 0.9 },
          reviewCards,
          reviewLogs,
          metaEntries: metaValues
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'pidanvoca-memory-progress-' + memoryCore.localDateKey(new Date()) + '.json';
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        showImportStatus('学习进度已导出');
      } catch {
        showImportStatus('学习进度导出失败。', true);
      }
    }

    async function importMemoryProgress(file) {
      if (!file) return;
      try {
        if (file.size > 25 * 1024 * 1024) throw new Error('进度文件超过 25 MB，请确认文件是否正确。');
        const payload = JSON.parse(await file.text());
        const validation = memoryCore.validateBackup(payload);
        if (!validation.valid) throw new Error(validation.reason);
        if (payload.fsrsVersion && String(payload.fsrsVersion) !== '6') throw new Error('该进度使用不兼容的 FSRS 主版本，已停止导入。');
        const incomingParameterVersion = payload.parameterVersion || (payload.scheduler && payload.scheduler.parameterVersion);
        if (incomingParameterVersion && incomingParameterVersion !== memoryParameterVersion) throw new Error('该进度使用不同的调度参数版本，已停止导入。');
        const cardIds = new Set();
        const logIds = new Set();
        payload.reviewCards.forEach((card) => {
          if (!card || typeof card.cardId !== 'string' || typeof card.bookId !== 'string' || !Number.isFinite(Number(card.due)) || !card.fsrsCard) throw new Error('进度文件包含无效卡片。');
          if (cardIds.has(card.cardId)) throw new Error('进度文件包含重复的卡片 ID。');
          cardIds.add(card.cardId);
        });
        payload.reviewLogs.forEach((log) => {
          if (!log || typeof log.logId !== 'string' || !Number.isFinite(Number(log.reviewedAt))) throw new Error('进度文件包含无效复习日志。');
          if (logIds.has(log.logId)) throw new Error('进度文件包含重复的日志 ID。');
          logIds.add(log.logId);
        });
        const existingCards = await memoryReadAll(memoryCardStore);
        const existingLogs = await memoryReadAll(memoryLogStore);
        const existingCardIds = new Set(existingCards.map((card) => card.cardId));
        const existingLogIds = new Set(existingLogs.map((log) => log.logId));
        const conflicts = payload.reviewCards.filter((card) => existingCardIds.has(card.cardId)).length;
        const duplicateLogs = payload.reviewLogs.filter((log) => existingLogIds.has(log.logId)).length;
        const bookCount = new Set(payload.reviewCards.map((card) => card.bookId)).size;
        const reviewTimes = payload.reviewLogs.map((log) => Number(log.reviewedAt)).filter(Number.isFinite).sort((left, right) => left - right);
        const replace = memoryImportMode.value === 'replace';
        const summary = bookCount + ' 个词库、' + payload.reviewCards.length + ' 张卡片、' + payload.reviewLogs.length + ' 条记录';
        const timeRange = reviewTimes.length ? '\\n记录时间：' + new Date(reviewTimes[0]).toLocaleString() + ' 至 ' + new Date(reviewTimes[reviewTimes.length - 1]).toLocaleString() : '';
        const conflictText = '\\n卡片冲突 ' + conflicts + ' 个；重复日志 ' + duplicateLogs + ' 条。';
        if (!window.confirm((replace ? '替换会先清空现有全部学习进度。' : '将按更新时间合并进度。') + '\\n\\n准备导入：' + summary + timeRange + conflictText + '\\n是否继续？')) return;
        await reviewRepository.importProgress(payload, { replace });
        invalidateMemorySessionHistory();
        await loadMemorySettings();
        await refreshMemorySummary();
        showImportStatus('已导入 ' + summary);
      } catch (error) {
        showImportStatus(error instanceof Error ? error.message : '学习进度导入失败。', true);
      } finally {
        memoryImportInput.value = '';
      }
    }

    async function resetMemoryProgress(bookId) {
      const scope = bookId ? '当前词库的' : '全部';
      try {
        const allCards = memoryStorageAvailable ? await memoryReadAll(memoryCardStore) : Array.from(memoryVolatileCards.values());
        const allLogs = memoryStorageAvailable ? await memoryReadAll(memoryLogStore) : Array.from(memoryVolatileLogs.values());
        const affectedCards = bookId ? allCards.filter((record) => record.bookId === bookId) : allCards;
        const affectedLogs = bookId ? allLogs.filter((record) => record.bookId === bookId) : allLogs;
        if (!window.confirm('确定重置' + scope + '记忆曲线进度吗？\\n\\n将删除 ' + affectedCards.length + ' 张卡片状态和 ' + affectedLogs.length + ' 条复习日志，不会删除词库内容。此操作无法撤销，建议先导出备份。')) return;
        if (!memoryStorageAvailable) {
          affectedCards.forEach((record) => memoryVolatileCards.delete(record.cardId));
          affectedLogs.forEach((record) => memoryVolatileLogs.delete(record.logId));
          invalidateMemorySessionHistory(bookId);
          await refreshMemorySummary();
          showImportStatus('已重置' + scope + '临时记忆曲线进度');
          return;
        }
        await reviewRepository.resetProgress(bookId);
        invalidateMemorySessionHistory(bookId);
        if (!bookId) {
          memoryDailyNew = memoryCore.defaultDailyNew;
          memoryDailyNewInput.value = String(memoryDailyNew);
        }
        await refreshMemorySummary();
        showImportStatus('已重置' + scope + '记忆曲线进度');
      } catch {
        showImportStatus('重置失败，原进度未改变。', true);
      }
    }

    function createExitPoint() {
      return window.PidanvocaAnimations.createExitPoint({ width: window.innerWidth, height: window.innerHeight });
    }

    function exitPointFor(deckPosition) {
      if (!exitPoints.has(deckPosition)) exitPoints.set(deckPosition, createExitPoint());
      return exitPoints.get(deckPosition);
    }

    function applyExitPoint(card, point) {
      window.PidanvocaAnimations.applyExitPoint(card, point);
    }

    function clearExitPoint(card) {
      window.PidanvocaAnimations.clearExitPoint(card);
    }

    const importedEntityDecoder = document.createElement('textarea');
    const importBatchSize = 100;

    function decodeImportedEntities(value) {
      importedEntityDecoder.innerHTML = value;
      return importedEntityDecoder.value;
    }

    function yieldToMainThread() {
      return new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
    }

    function importedHtmlToText(html) {
      return window.PidanvocaWordbooks.htmlToText(String(html), decodeImportedEntities);
    }

    function extractImportedNote(explanationHtml) {
      return window.PidanvocaWordbooks.extractNote(explanationHtml);
    }

    function extractImportedMeaning(explanationHtml, note) {
      return window.PidanvocaWordbooks.extractMeaning(explanationHtml, note, importedHtmlToText);
    }

    function collectImportedRows(root, entries) {
      root.querySelectorAll('tbody tr').forEach((row) => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 5) return;
        const explanationRoot = cells[4].querySelector('.expDiv') || cells[4];
        const explanationHtml = explanationRoot.innerHTML;
        const note = extractImportedNote(explanationHtml);
        const entry = {
          word: (cells[1].textContent || '').trim(),
          phonetic: (cells[2].textContent || '').replace(/\\s+/g, ' ').trim(),
          meaning: extractImportedMeaning(explanationHtml, note),
          note
        };
        if (entry.word) entries.push(entry);
      });
    }

    async function parseImportedBook(html, onProgress) {
      const sourceHtml = String(html);
      const entries = [];
      const parser = new DOMParser();
      const rowPattern = /<tr[^>]*>[\\s\\S]*?<\\/tr>/gi;
      const batch = [];
      let match;
      let discoveredRows = 0;
      const bodyOpen = /<tbody[^>]*>/i.exec(sourceHtml);
      const scanStart = bodyOpen ? bodyOpen.index + bodyOpen[0].length : 0;
      rowPattern.lastIndex = scanStart;

      while ((match = rowPattern.exec(sourceHtml))) {
        batch.push(match[0]);
        discoveredRows += 1;
        if (batch.length < importBatchSize) continue;
        const batchDocument = parser.parseFromString('<table><tbody>' + batch.join('') + '</tbody></table>', 'text/html');
        collectImportedRows(batchDocument, entries);
        batch.length = 0;
        if (onProgress) onProgress(discoveredRows);
        await yieldToMainThread();
      }

      if (batch.length) {
        const batchDocument = parser.parseFromString('<table><tbody>' + batch.join('') + '</tbody></table>', 'text/html');
        collectImportedRows(batchDocument, entries);
        if (onProgress) onProgress(discoveredRows);
      }
      if (!discoveredRows) {
        collectImportedRows(parser.parseFromString(sourceHtml, 'text/html'), entries);
      }
      return entries;
    }

    function mergeDistinctText(currentValue, incomingValue) {
      if (!incomingValue) return currentValue;
      if (!currentValue) return incomingValue;
      if (currentValue === incomingValue || currentValue.includes(incomingValue)) return currentValue;
      if (incomingValue.includes(currentValue)) return incomingValue;
      return currentValue + '\\n\\n' + incomingValue;
    }

    function replaceWithImportedWords(importedWords) {
      const wordMap = new Map();

      importedWords.forEach((entry) => {
        const key = entry.word.toLocaleLowerCase();
        const existing = wordMap.get(key);
        if (!existing) {
          wordMap.set(key, { ...entry });
          return;
        }
        existing.phonetic = existing.phonetic || entry.phonetic;
        existing.meaning = mergeDistinctText(existing.meaning, entry.meaning);
        existing.note = mergeDistinctText(existing.note, entry.note);
      });

      WORDS = Array.from(wordMap.values());
      return WORDS.length;
    }

    async function rememberVocabulary({
      builtInBookId = activeBuiltInBookId,
      customBookId = activeCustomBookId,
      fileNames = []
    } = {}) {
      const payload = {
        version: 1,
        builtInBookId,
        customBookId,
        customBooks,
        deletedProjectPersonalBookIds,
        fileNames,
        savedAt: new Date().toISOString(),
        words: builtInBookId ? [] : WORDS
      };

      try {
        await settleWithin(writeRememberedPayload(payload), 1800);
        try { window.localStorage.removeItem(vocabularyStorageKey); } catch { /* IndexedDB already succeeded. */ }
        return true;
      } catch {
        try {
          window.localStorage.setItem(vocabularyStorageKey, JSON.stringify(payload));
          return true;
        } catch {
          return false;
        }
      }
    }

    let rememberedSelectionQueue = Promise.resolve(true);

    function queueRememberedSelection(options) {
      rememberedSelectionQueue = rememberedSelectionQueue
        .catch(() => false)
        .then(() => rememberVocabulary(options));
      return rememberedSelectionQueue;
    }

    function showImportStatus(message, isError = false, keepVisible = false) {
      window.clearTimeout(statusTimer);
      importStatus.textContent = message;
      importStatus.classList.toggle('is-error', isError);
      importStatus.classList.add('is-visible');
      if (!keepVisible) {
        statusTimer = window.setTimeout(() => importStatus.classList.remove('is-visible'), 4200);
      }
    }

    function storeImportedBooks(importedBooks) {
      const bookMap = new Map(customBooks.map((book) => [book.id, book]));
      const storedBooks = importedBooks.map((book) => {
        const customBook = {
          id: createCustomBookId(book.fileName),
          name: book.fileName.replace(/\\.html?$/i, ''),
          fileName: book.fileName,
          words: book.entries
        };
        bookMap.set(customBook.id, customBook);
        return customBook;
      });
      customBooks = Array.from(bookMap.values());
      const restoredIds = new Set(storedBooks.map((book) => book.id));
      deletedProjectPersonalBookIds = deletedProjectPersonalBookIds.filter((id) => !restoredIds.has(id));
      activeCustomBookId = storedBooks.length === 1 ? storedBooks[0].id : null;
    }

    async function importBooks(files) {
      if (!files.length) return;
      isImporting = true;
      importButton.disabled = true;
      showImportStatus('正在读取 ' + files.length + ' 个生词本…', false, true);

      try {
        const books = [];
        for (let fileIndex = 0; fileIndex < files.length; fileIndex += 1) {
          const file = files[fileIndex];
          showImportStatus('正在读取第 ' + (fileIndex + 1) + ' / ' + files.length + ' 个生词本…', false, true);
          const html = await file.text();
          const entries = await parseImportedBook(html, (parsedRows) => {
            showImportStatus('正在解析第 ' + (fileIndex + 1) + ' / ' + files.length + ' 个生词本，已处理 ' + parsedRows + ' 行…', false, true);
          });
          books.push({ fileName: file.name, entries });
          await yieldToMainThread();
        }
        const validBooks = books.filter((book) => book.entries.length > 0);
        if (!validBooks.length) throw new Error('未在所选文件中识别到生词表，请选择 HTML 格式的导出生词本。');

        const total = replaceWithImportedWords(validBooks.flatMap((book) => book.entries));
        activeBuiltInBookId = null;
        storeImportedBooks(validBooks);
        studySize = studySizePreferenceForBook(activeStudyBookKey());
        expandedStudyBookId = activeStudyBookKey();
        renderWordbookLists();
        const remembered = await rememberVocabulary({ fileNames: validBooks.map((book) => book.fileName) });
        const skipped = files.length - validBooks.length;
        shuffle();
        refreshMemorySummary();
        let message = '已载入 ' + validBooks.length + ' 个生词本，共 ' + total + ' 个词条';
        if (skipped) message += '；忽略 ' + skipped + ' 个无法识别的文件';
        message += remembered ? '；下次打开将自动恢复' : '；浏览器未能保存，下次打开会恢复默认词库';
        showImportStatus(message);
      } catch (error) {
        showImportStatus(error instanceof Error ? error.message : '导入失败，请检查文件格式。', true);
      } finally {
        isImporting = false;
        importInput.value = '';
        syncChrome();
      }
    }

    const randomValueBuffer = new Uint32Array(1);

    function randomIndex(max) {
      if (window.crypto?.getRandomValues) {
        const limit = Math.floor(0x100000000 / max) * max;
        do window.crypto.getRandomValues(randomValueBuffer); while (randomValueBuffer[0] >= limit);
        return randomValueBuffer[0] % max;
      }
      return Math.floor(Math.random() * max);
    }

    function createDeck() {
      return window.PidanvocaClassicDeck.createShuffledDeck(WORDS.length, randomIndex);
    }

    function cancelSpellingAdvance() {
      window.clearTimeout(spellingAdvanceTimer);
      spellingAdvanceTimer = 0;
    }

    function normalizeSpelling(value) {
      return window.PidanvocaClassicDeck.normalizeSpelling(value);
    }

    function appendMeaningText(element, value) {
      const text = String(value);
      const tensePattern = /时\\s*态\\s*[:：][^\\r\\n]*/g;
      let cursor = 0;
      for (const match of text.matchAll(tensePattern)) {
        if (match.index > cursor) element.append(document.createTextNode(text.slice(cursor, match.index)));
        const tense = document.createElement('span');
        tense.className = 'card-tense-info';
        tense.textContent = match[0];
        element.append(tense);
        cursor = match.index + match[0].length;
      }
      if (cursor < text.length) element.append(document.createTextNode(text.slice(cursor)));
    }

    function syncStudyModeButton(button) {
      const currentIndex = studyModes.indexOf(studyMode);
      const nextMode = studyModes[(currentIndex + 1) % studyModes.length];
      const description = '当前：' + studyModeLabels[studyMode] + '；点击切换到' + studyModeLabels[nextMode];
      button.title = description;
      button.setAttribute('aria-label', description);
    }

    function syncStudyModeButtons() {
      cardLayer.querySelectorAll('.study-mode-button').forEach(syncStudyModeButton);
    }

    function resetSpellingInputs() {
      cardLayer.querySelectorAll('.card-spelling-input').forEach((input) => {
        input.value = '';
        input.readOnly = false;
        input.classList.remove('is-correct');
        input.removeAttribute('data-accepted');
        input.setAttribute('aria-label', '输入当前单词');
      });
    }

    function focusCurrentSpellingInput() {
      if (studyMode !== 'spelling' || isTransitioning) return;
      const input = cardLayer.querySelector('.deck-card[data-offset="0"] .card-spelling-input:not([readonly])');
      if (input) input.focus({ preventScroll: true });
    }

    function setStudyMode(nextMode) {
      if (!studyModes.includes(nextMode) || nextMode === studyMode) return;
      cancelSpellingAdvance();
      studyMode = nextMode;
      document.body.dataset.studyMode = studyMode;
      resetSpellingInputs();
      syncStudyModeButtons();
      if (studyMode === 'spelling') window.requestAnimationFrame(focusCurrentSpellingInput);
    }

    function cycleStudyMode() {
      if (isTransitioning || isImporting) return;
      const currentIndex = studyModes.indexOf(studyMode);
      setStudyMode(studyModes[(currentIndex + 1) % studyModes.length]);
    }

    function checkSpellingInput(input) {
      if (studyMode !== 'spelling' || isTransitioning || input.dataset.accepted === 'true') return;
      const card = input.closest('.deck-card[data-offset="0"]');
      if (!card) return;
      const deckPosition = Number(card.dataset.deckPosition);
      if (deckPosition !== position) return;
      const answer = WORDS[deck[deckPosition]].word;
      if (normalizeSpelling(input.value) !== normalizeSpelling(answer)) return;

      input.dataset.accepted = 'true';
      input.readOnly = true;
      input.classList.add('is-correct');
      input.setAttribute('aria-label', '拼写正确，正在切换到下一个单词');
      cancelSpellingAdvance();
      spellingAdvanceTimer = window.setTimeout(() => {
        spellingAdvanceTimer = 0;
        if (studyMode === 'spelling' && position === deckPosition) next();
      }, 600);
    }

    function setCardOffset(card, offset) {
      const isCurrent = offset === 0;
      card.dataset.offset = String(offset);
      card.setAttribute('aria-hidden', String(!isCurrent));
      const heading = card.querySelector('.card-word');
      if (heading) heading.setAttribute('aria-level', isCurrent ? '1' : '2');
      card.querySelectorAll('.sound-button, .dictionary-button, .study-mode-button, .card-spelling-input').forEach((control) => {
        control.tabIndex = isCurrent ? 0 : -1;
      });
    }

    function progressLabelFor(progressValue) {
      if (progressValue >= 100) return '100%';
      if (progressValue >= 10) return Math.round(progressValue) + '%';
      return progressValue.toFixed(1) + '%';
    }

    function createStudyGroup(start, requestedSize = studySize) {
      return window.PidanvocaClassicDeck.createStudyGroup(deck.length, start, requestedSize);
    }

    function currentStudyGroup() {
      return studyGroups[studyGroupIndex] || null;
    }

    function studyGroupForPosition(deckPosition) {
      return window.PidanvocaClassicDeck.studyGroupForPosition(studyGroups, studyGroupIndex, deckPosition);
    }

    function studyProgressFor(deckPosition) {
      return window.PidanvocaClassicDeck.studyProgress(deck.length, studyGroups, studyGroupIndex, deckPosition);
    }

    function updateStudySizeControls() {
      const group = currentStudyGroup();
      const hasPendingSize = Boolean(group && studyGroupIndex === studyGroups.length - 1 && position > group.start && group.requestedSize !== studySize);
      studySizeValue.textContent = hasPendingSize ? '下组 ' + studySizeLabel(studySize, false) : studySizeLabel(studySize);
      studySizeHint.textContent = hasPendingSize
        ? '当前组保持 ' + studySizeLabel(group.requestedSize) + '，新数量从下一组生效。'
        : '完整词序按组推进，整轮结束前不会重复。';

      studySizePresets.querySelectorAll('[data-study-size]').forEach((button) => {
        const buttonValue = button.dataset.studySize === 'all' ? Infinity : Number(button.dataset.studySize);
        const isSelected = buttonValue === studySize;
        button.classList.toggle('is-selected', isSelected);
        button.setAttribute('aria-pressed', String(isSelected));
      });

      studySizeCustom.classList.toggle('is-selected', studySize !== Infinity && !presetStudySizes.includes(studySize));

      if (studySize !== Infinity) studySizeInput.value = String(studySize);
    }

    function refreshCurrentCard() {
      const currentCard = cardLayer.querySelector('.deck-card[data-offset="0"]');
      if (currentCard) stripCardContent(currentCard);
      renderStable();
    }

    function setStudySizePreference(value) {
      const nextStudySize = normalizeStudySize(value);
      studySize = nextStudySize;
      saveStudySizePreference(activeStudyBookKey(), studySize);

      const group = currentStudyGroup();
      const canApplyImmediately = Boolean(group && studyGroupIndex === studyGroups.length - 1 && position === group.start);
      if (canApplyImmediately) {
        studyGroups[studyGroupIndex] = createStudyGroup(group.start, studySize);
        updateStudySizeControls();
        refreshCurrentCard();
        showImportStatus('本组已调整为' + studySizeLabel(studyGroups[studyGroupIndex].end - studyGroups[studyGroupIndex].start));
        setSettingsOpen(false);
        return;
      }

      updateStudySizeControls();
      if (group) showImportStatus('已设为每组' + studySizeLabel(studySize) + '，将从下一组生效');
      setSettingsOpen(false);
    }

    function createCardProgressCount(deckPosition) {
      const metrics = studyProgressFor(deckPosition);
      const progress = document.createElement('div');
      progress.className = 'card-progress-count';
      progress.setAttribute('aria-hidden', 'true');
      const current = document.createElement('strong');
      current.textContent = metrics.current;
      const separator = document.createElement('span');
      separator.textContent = '/';
      const total = document.createElement('span');
      total.textContent = metrics.total;
      progress.append(current, separator, total);
      return progress;
    }

    function createWaterProgress(deckPosition) {
      const metrics = studyProgressFor(deckPosition);
      const progressValue = metrics.progressValue;
      const progressLabel = progressLabelFor(progressValue);
      const water = document.createElement('div');
      water.className = 'card-water-progress';
      water.setAttribute('role', 'progressbar');
      water.setAttribute('aria-label', '学习进度');
      water.setAttribute('aria-valuemin', '0');
      water.setAttribute('aria-valuemax', '100');
      water.setAttribute('aria-valuenow', String(Math.round(progressValue * 10) / 10));
      const groupNumber = Math.max(1, studyGroups.indexOf(metrics.group) + 1);
      water.setAttribute('aria-valuetext', '第 ' + groupNumber + ' 组，第 ' + metrics.current + ' 个，共 ' + metrics.total + ' 个；整个词本 ' + deck.length + ' 个，完成 ' + progressLabel);
      water.style.setProperty('--water-level', progressValue + '%');
      water.style.setProperty('--wave-phase', -performance.now() + 'ms');
      water.innerHTML = '<div class="card-water-progress__fill" aria-hidden="true">'
        + '<svg class="card-water-progress__wave card-water-progress__wave--band card-water-progress__wave--band-six" viewBox="0 0 1200 720" preserveAspectRatio="none">'
        + '<path d="M0 14C50 2 100 2 150 14s100 12 150 0 100-12 150 0 100 12 150 0V720H0ZM600 14c50-12 100-12 150 0s100 12 150 0 100-12 150 0 100 12 150 0V720H600Z"/>'
        + '</svg>'
        + '<svg class="card-water-progress__wave card-water-progress__wave--band card-water-progress__wave--band-five" viewBox="0 0 1200 720" preserveAspectRatio="none">'
        + '<path d="M0 14C50 2 100 2 150 14s100 12 150 0 100-12 150 0 100 12 150 0V720H0ZM600 14c50-12 100-12 150 0s100 12 150 0 100-12 150 0 100 12 150 0V720H600Z"/>'
        + '</svg>'
        + '<svg class="card-water-progress__wave card-water-progress__wave--band card-water-progress__wave--band-four" viewBox="0 0 1200 720" preserveAspectRatio="none">'
        + '<path d="M0 14C50 2 100 2 150 14s100 12 150 0 100-12 150 0 100 12 150 0V720H0ZM600 14c50-12 100-12 150 0s100 12 150 0 100-12 150 0 100 12 150 0V720H600Z"/>'
        + '</svg>'
        + '<svg class="card-water-progress__wave card-water-progress__wave--band card-water-progress__wave--band-three" viewBox="0 0 1200 720" preserveAspectRatio="none">'
        + '<path d="M0 14C50 2 100 2 150 14s100 12 150 0 100-12 150 0 100 12 150 0V720H0ZM600 14c50-12 100-12 150 0s100 12 150 0 100-12 150 0 100 12 150 0V720H600Z"/>'
        + '</svg>'
        + '<svg class="card-water-progress__wave card-water-progress__wave--band card-water-progress__wave--band-two" viewBox="0 0 1200 720" preserveAspectRatio="none">'
        + '<path d="M0 14C50 2 100 2 150 14s100 12 150 0 100-12 150 0 100 12 150 0V720H0ZM600 14c50-12 100-12 150 0s100 12 150 0 100-12 150 0 100 12 150 0V720H600Z"/>'
        + '</svg>'
        + '<svg class="card-water-progress__wave card-water-progress__wave--band card-water-progress__wave--band-one" viewBox="0 0 1200 720" preserveAspectRatio="none">'
        + '<path d="M0 14C50 2 100 2 150 14s100 12 150 0 100-12 150 0 100 12 150 0V720H0ZM600 14c50-12 100-12 150 0s100 12 150 0 100-12 150 0 100 12 150 0V720H600Z"/>'
        + '</svg>'
        + '</div>';
      return water;
    }

    function mountCardContent(card, deckPosition) {
      if (card.dataset.contentPosition === String(deckPosition) && card.querySelector('.card-scroll')) return;
      const entry = WORDS[deck[deckPosition]];
      card.replaceChildren();
      card.dataset.contentPosition = String(deckPosition);
      const content = document.createElement('div');
      content.className = 'card-scroll';
      content.append(createCardProgressCount(deckPosition));
      card.append(createWaterProgress(deckPosition), content);

      const wordRow = document.createElement('div');
      wordRow.className = 'card-word-row';

      const heading = document.createElement('h2');
      heading.className = 'card-word';
      heading.setAttribute('role', 'heading');
      heading.textContent = entry.word;

      const sound = document.createElement('button');
      sound.className = 'sound-button';
      sound.type = 'button';
      sound.title = '朗读单词';
      sound.setAttribute('aria-label', '朗读 ' + entry.word);
      sound.innerHTML = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5Z"></path><path d="M15.5 8.5a5 5 0 0 1 0 7"></path><path d="M18 6a8.5 8.5 0 0 1 0 12"></path></svg>';

      const dictionary = document.createElement('a');
      dictionary.className = 'dictionary-button';
      dictionary.href = 'https://dictionary.cambridge.org/dictionary/english/' + encodeURIComponent(entry.word.trim().toLowerCase().replace(/\\s+/g, '-'));
      dictionary.title = '在 Cambridge Dictionary 中查询';
      dictionary.setAttribute('aria-label', '在 Cambridge Dictionary 中查询 ' + entry.word);
      dictionary.innerHTML = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11a3 3 0 0 1 3 3v14a3 3 0 0 0-3-3H6.5A2.5 2.5 0 0 0 4 19.5v-14Z"></path><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H14v17a3 3 0 0 1 3-3h.5a2.5 2.5 0 0 1 2.5 2.5v-14Z"></path></svg>';

      const studyModeButton = document.createElement('button');
      studyModeButton.className = 'study-mode-button';
      studyModeButton.type = 'button';
      studyModeButton.innerHTML = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">'
        + '<g class="study-mode-icon study-mode-icon--full"><path d="M5 6h14M5 12h14M5 18h10"></path></g>'
        + '<g class="study-mode-icon study-mode-icon--word"><path d="m7 18 3.4-12h3.2L17 18M8.5 14h7"></path></g>'
        + '<g class="study-mode-icon study-mode-icon--spelling"><path d="m5 16-.7 3.7L8 19l10.6-10.6-3-3L5 16Z"></path><path d="M4 21h16"></path></g>'
        + '</svg>';
      syncStudyModeButton(studyModeButton);

      const spellingForm = document.createElement('div');
      spellingForm.className = 'card-spelling-form';
      const spellingInput = document.createElement('input');
      spellingInput.className = 'card-spelling-input';
      spellingInput.type = 'text';
      spellingInput.autocomplete = 'off';
      spellingInput.autocapitalize = 'none';
      spellingInput.spellcheck = false;
      spellingInput.setAttribute('aria-label', '输入当前单词');
      spellingForm.append(spellingInput);

      wordRow.append(heading, spellingForm, sound, dictionary, studyModeButton);
      content.append(wordRow);

      if (entry.phonetic) {
        const phonetic = document.createElement('p');
        phonetic.className = 'card-phonetic';
        phonetic.textContent = entry.phonetic;
        content.append(phonetic);
      }

      if (entry.meaning) {
        const meaning = document.createElement('p');
        meaning.className = 'card-meaning';
        appendMeaningText(meaning, entry.meaning);
        content.append(meaning);
      }

      if (entry.note) {
        const notes = document.createElement('section');
        notes.className = 'card-notes';
        const notesTitle = document.createElement('h3');
        notesTitle.textContent = '我的笔记';
        const note = document.createElement('p');
        note.textContent = entry.note;
        notes.append(notesTitle, note);
        content.append(notes);
      }
    }

    function stripCardContent(card) {
      if (!card.childElementCount) return;
      card.replaceChildren();
      delete card.dataset.contentPosition;
    }

    function resetCardFlightState(card) {
      card.className = 'deck-card';
      card.style.removeProperty('--fly-x');
      card.style.removeProperty('--fly-y');
      card.style.removeProperty('--fly-rotate');
      delete card.dataset.flyX;
      delete card.dataset.flyY;
      delete card.dataset.flyRotate;
    }

    function createCard(deckPosition, offset, includeContent = false) {
      const card = document.createElement('article');
      card.className = 'deck-card';
      card.dataset.deckPosition = String(deckPosition);
      if (includeContent) mountCardContent(card, deckPosition);
      setCardOffset(card, offset);
      return card;
    }

    function synchronizeCards(center, direction = 0, contentPositions = new Set([center])) {
      const existingCards = new Map(
        Array.from(cardLayer.querySelectorAll('.deck-card')).map((card) => [Number(card.dataset.deckPosition), card])
      );

      return cardPositions(center, direction).map((deckPosition) => {
        const offset = deckPosition - center;
        const card = existingCards.get(deckPosition) || createCard(deckPosition, offset);
        resetCardFlightState(card);
        card.dataset.deckPosition = String(deckPosition);
        if (contentPositions.has(deckPosition)) mountCardContent(card, deckPosition);
        else stripCardContent(card);
        setCardOffset(card, offset);
        return card;
      });
    }

    function cardPositions(center, direction = 0) {
      const first = direction < 0 ? Math.max(0, center - 1) : center;
      const last = Math.min(deck.length - 1, center + visibleRadius + (direction > 0 ? 1 : 0));
      const positions = [];
      for (let deckPosition = first; deckPosition <= last; deckPosition += 1) positions.push(deckPosition);
      return positions;
    }

    function closeStudyComplete(restoreFocus = false) {
      window.clearTimeout(studyCompleteTimer);
      isStudyCompleteOpen = false;
      studyCompleteBackdrop.classList.remove('is-visible');
      studyCompleteTimer = window.setTimeout(() => {
        if (!isStudyCompleteOpen) studyCompleteBackdrop.hidden = true;
      }, 230);
      if (restoreFocus) nextButton.focus();
      syncChrome();
    }

    function showStudyComplete() {
      const group = currentStudyGroup();
      if (!group || isStudyCompleteOpen) return;
      const groupTotal = Math.max(0, group.end - group.start);
      const remaining = Math.max(0, deck.length - group.end);
      const isRoundComplete = remaining === 0;
      const nextGroupTotal = studySize === Infinity ? remaining : Math.min(studySize, remaining);

      window.clearTimeout(studyCompleteTimer);
      setSettingsOpen(false);
      studyCompleteTitle.textContent = isRoundComplete ? '这一轮，收下了' : '这一组，收下了';
      studyCompleteScore.textContent = groupTotal + ' / ' + groupTotal;
      studyCompleteDetail.textContent = isRoundComplete
        ? '已完成本词本的 ' + deck.length + ' 个单词，可以重新随机开始。'
        : '词本中还有 ' + remaining + ' 个单词未出现。';
      studyCompleteContinue.textContent = isRoundComplete ? '随机开始新一轮' : '再来 ' + nextGroupTotal + ' 词';
      studyCompleteBackdrop.hidden = false;
      isStudyCompleteOpen = true;
      window.requestAnimationFrame(() => studyCompleteBackdrop.classList.add('is-visible'));
      syncChrome();
      window.setTimeout(() => studyCompleteContinue.focus(), 80);
    }

    function continueAfterStudyComplete() {
      const group = currentStudyGroup();
      if (!group) return;
      if (group.end >= deck.length) {
        closeStudyComplete();
        shuffle();
        showImportStatus('已重新随机排序，开始新一轮');
        return;
      }

      studyGroups.splice(studyGroupIndex + 1);
      studyGroups.push(createStudyGroup(group.end, studySize));
      closeStudyComplete();
      updateStudySizeControls();
      moveDeck(1);
    }

    function adjustStudySizeAfterComplete() {
      closeStudyComplete();
      setSettingsOpen(true);
      setWordbookPanelOpen(true);
      expandedStudyBookId = activeStudyBookKey();
      renderWordbookLists();
      updateStudySizeControls();
      window.setTimeout(() => {
        scrollExpandedStudyBook();
        const activeOption = document.querySelector('.wordbook-option-stack[data-book-id="' + CSS.escape(expandedStudyBookId) + '"] .wordbook-option');
        if (activeOption instanceof HTMLButtonElement) activeOption.focus();
      }, 80);
    }

    function syncChrome() {
      shuffleButton.disabled = !isReady || isTransitioning || isImporting;
      importButton.disabled = !isReady || isTransitioning || isImporting;
      wordbookButton.disabled = !isReady || isTransitioning || isImporting;
      studySizePanel.querySelectorAll('button, input').forEach((control) => {
        control.disabled = !isReady || isTransitioning || isImporting;
      });
      cardLayer.querySelectorAll('.study-mode-button').forEach((button) => {
        button.disabled = !isReady || isTransitioning || isImporting;
      });
      if (!deck.length) {
        previousButton.disabled = true;
        nextButton.disabled = true;
        nextButton.classList.remove('is-completion');
        return;
      }
      const entry = WORDS[deck[position]];
      if (!entry) {
        previousButton.disabled = true;
        nextButton.disabled = true;
        nextButton.classList.remove('is-completion');
        document.title = '随机单词本';
        return;
      }
      const group = studyGroupForPosition(position);
      const isLatestGroup = studyGroupIndex === studyGroups.length - 1;
      const isGroupEnd = Boolean(group && position === group.end - 1 && isLatestGroup);
      const isRoundEnd = isGroupEnd && group.end === deck.length;
      previousButton.disabled = isTransitioning || isStudyCompleteOpen || position === 0;
      nextButton.disabled = isTransitioning || isStudyCompleteOpen;
      nextButton.classList.toggle('is-completion', isGroupEnd);
      nextButton.setAttribute('aria-label', isRoundEnd ? '完成本轮' : (isGroupEnd ? '完成本组' : '下一个单词'));
      nextButton.title = isRoundEnd ? '完成本轮（→）' : (isGroupEnd ? '完成本组（→）' : '下一个单词（→）');
      document.title = entry.word + ' · 随机单词本';
      updateStudySizeControls();
    }

    function bringCurrentCardForward(cards) {
      const currentCard = cards.find((card) => card.dataset.offset === '0');
      if (currentCard) cardLayer.append(currentCard);
    }

    function renderStable() {
      isTransitioning = false;
      cardLayer.classList.remove('is-transitioning');
      const cards = synchronizeCards(position);
      cardLayer.replaceChildren(...cards);
      bringCurrentCardForward(cards);
      cardLayer.setAttribute('aria-busy', 'false');
      syncChrome();
      window.requestAnimationFrame(focusCurrentSpellingInput);
    }

    function moveDeck(direction) {
      if (isTransitioning || isStudyCompleteOpen || !animationCoordinator.isIdle) return;
      cancelSpellingAdvance();
      let target = position + direction;
      if (target < 0) return;

      const group = currentStudyGroup();
      if (direction > 0 && group && target >= group.end) {
        if (studyGroupIndex < studyGroups.length - 1) studyGroupIndex += 1;
        else {
          showStudyComplete();
          return;
        }
      } else if (direction < 0 && group && target < group.start && studyGroupIndex > 0) {
        studyGroupIndex -= 1;
      }
      if (target >= deck.length) return showStudyComplete();

      if (reducedMotion.matches) {
        if (direction > 0) exitPointFor(position);
        position = target;
        renderStable();
        return;
      }

      const transition = animationCoordinator.begin(direction > 0 ? 'exiting-current' : 'undo-returning', {
        mode: 'classic',
        direction: direction > 0 ? 'forward' : 'backward'
      });
      isTransitioning = true;
      cardLayer.setAttribute('aria-busy', 'true');
      const cards = synchronizeCards(position, direction, new Set([position, target]));
      const currentCard = cards.find((card) => Number(card.dataset.deckPosition) === position);
      const incomingCard = cards.find((card) => Number(card.dataset.deckPosition) === target);
      const incomingWater = incomingCard && incomingCard.querySelector('.card-water-progress');
      const targetWaterLevel = incomingWater && incomingWater.style.getPropertyValue('--water-level');
      const currentWaterLevel = studyProgressFor(position).progressValue;
      if (incomingWater) incomingWater.style.setProperty('--water-level', currentWaterLevel + '%');

      if (direction > 0) {
        applyExitPoint(currentCard, exitPointFor(position));
        currentCard.classList.add('is-flying-out');
        incomingCard.classList.add('is-incoming');
      } else {
        applyExitPoint(incomingCard, exitPointFor(target));
        currentCard.classList.add('is-yielding');
        incomingCard.classList.add('is-incoming', 'is-returning');
      }

      cardLayer.replaceChildren(...cards);
      bringCurrentCardForward(cards);
      syncChrome();
      const deckTransitionFinished = waitForElementTransition(incomingCard, 'transform', 760);
      void cardLayer.offsetWidth;

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          cards.forEach((card) => setCardOffset(card, Number(card.dataset.deckPosition) - target));
          if (direction > 0) {
            transition.move('advancing-stack');
            transition.move('revealing-incoming');
          }
          cardLayer.classList.add('is-transitioning');
          window.requestAnimationFrame(() => {
            if (incomingWater && targetWaterLevel) incomingWater.style.setProperty('--water-level', targetWaterLevel);
          });
          syncChrome();
          deckTransitionFinished.then(() => {
            if (!transition.isActive()) return;
            position = target;
            transition.finish();
            renderStable();
          });
        });
      });
    }

    function shuffle() {
      cancelSpellingAdvance();
      closeStudyComplete();
      isTransitioning = false;
      exitPoints.clear();
      cardLayer.replaceChildren();
      deck = createDeck();
      position = 0;
      studyGroups = deck.length ? [createStudyGroup(0, studySize)] : [];
      studyGroupIndex = 0;
      updateStudySizeControls();
      renderStable();
    }

    function next() { moveDeck(1); }
    function previous() { moveDeck(-1); }

    function handleStackedCardAdvance(event) {
      if (!stackedCardPointer.matches || !(event.target instanceof Element)) return false;
      const stackedCard = event.target.closest('.deck-card[data-offset="1"]');
      if (!(stackedCard instanceof HTMLElement) || !cardLayer.contains(stackedCard)) return false;
      event.preventDefault();
      if (memoryIsOpen) {
        if (!memoryCurrentItem() || memoryClosing) return true;
        if (memoryGoodButton.disabled || memoryRatingPending || memoryBackdrop.classList.contains('is-transitioning')) {
          shakeBlockedMemoryGood();
          return true;
        }
        rateMemoryCard(window.FSRS.Rating.Good);
        return true;
      }
      if (!isTransitioning && !isStudyCompleteOpen && !document.body.classList.contains('settings-open')) next();
      return true;
    }

    function isClassicSwipeControl(target) {
      return target instanceof Element && Boolean(target.closest('button, a, input, textarea, select, label, [contenteditable="true"]'));
    }

    function clearClassicSwipe(pointerId) {
      if (deckStage.hasPointerCapture?.(pointerId)) deckStage.releasePointerCapture(pointerId);
      classicSwipeGesture = null;
    }

    function startClassicSwipe(event) {
      if (!mobileClassicLayout.matches || event.isPrimary === false || event.button !== 0) return;
      if (memoryIsOpen || isTransitioning || isStudyCompleteOpen || document.body.classList.contains('settings-open')) return;
      if (isClassicSwipeControl(event.target)) return;
      classicSwipeGesture = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        startedAt: window.performance.now()
      };
      deckStage.setPointerCapture?.(event.pointerId);
    }

    function finishClassicSwipe(event) {
      const gesture = classicSwipeGesture;
      if (!gesture || gesture.pointerId !== event.pointerId) return;
      const deltaX = event.clientX - gesture.x;
      const deltaY = event.clientY - gesture.y;
      const elapsed = window.performance.now() - gesture.startedAt;
      const minimumDistance = Math.max(44, Math.min(64, window.innerWidth * 0.13));
      clearClassicSwipe(event.pointerId);
      if (elapsed > 850 || Math.abs(deltaX) < minimumDistance || Math.abs(deltaX) <= Math.abs(deltaY) * 1.2) return;
      event.preventDefault();
      if (deltaX < 0) next();
      else previous();
    }

    function cancelClassicSwipe(event) {
      if (classicSwipeGesture?.pointerId === event.pointerId) clearClassicSwipe(event.pointerId);
    }

    function syncThemeButton() {
      const isPlayful = document.documentElement.dataset.theme === 'playful';
      themeButton.setAttribute('aria-pressed', String(isPlayful));
      themeButton.setAttribute('aria-label', isPlayful ? '恢复经典主题' : '启用童趣主题');
      themeButton.title = isPlayful ? '恢复经典主题' : '启用童趣主题';
      if (themeColorMeta) themeColorMeta.content = isPlayful ? '#78c7ed' : '#edf4fc';
    }

    function setTheme(theme) {
      if (theme === 'playful') document.documentElement.dataset.theme = 'playful';
      else delete document.documentElement.dataset.theme;
      try { window.localStorage.setItem(themeStorageKey, theme === 'playful' ? 'playful' : 'classic'); } catch { /* Keep the in-page choice. */ }
      syncThemeButton();
    }

    function setSettingsOpen(isOpen) {
      document.body.classList.toggle('settings-open', isOpen);
      settingsButton.setAttribute('aria-expanded', String(isOpen));
      settingsButton.setAttribute('aria-label', isOpen ? '关闭设置' : '打开设置');
      settingsButton.title = isOpen ? '关闭设置' : '打开设置';
      settingsDrawer.setAttribute('aria-hidden', String(!isOpen));
      settingsDrawer.inert = !isOpen;
    }

    function setWordbookPanelOpen(isOpen) {
      wordbookButton.setAttribute('aria-expanded', String(isOpen));
      wordbookButton.setAttribute('aria-label', isOpen ? '隐藏单词本列表' : '显示单词本列表');
      wordbookPanel.hidden = !isOpen;
    }

    function scrollExpandedStudyBook() {
      if (!expandedStudyBookId) return;
      const stack = document.querySelector('.wordbook-option-stack[data-book-id="' + CSS.escape(expandedStudyBookId) + '"]');
      if (stack) stack.scrollIntoView({ block: 'nearest', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    }

    function setExpandedStudyBook(bookId, isOpen) {
      expandedStudyBookId = isOpen ? bookId : null;
      renderWordbookLists();
      updateStudySizeControls();
      if (expandedStudyBookId) window.setTimeout(scrollExpandedStudyBook, 80);
    }

    function stepStudySizeInput(direction) {
      const currentValue = normalizeStudySize(studySizeInput.value || (studySize === Infinity ? defaultStudySize : studySize));
      const numericValue = currentValue === Infinity ? defaultStudySize : currentValue;
      studySizeInput.value = String(normalizeStudySize(numericValue + direction * 5));
    }

    function applyCustomStudySize() {
      setStudySizePreference(studySizeInput.value);
    }

    function createWordbookOption(book, source, isActive) {
      const button = document.createElement('button');
      button.className = 'wordbook-option';
      button.type = 'button';
      button.dataset.bookId = book.id;
      button.dataset.bookSource = source;
      button.setAttribute('aria-pressed', String(isActive));
      button.setAttribute('aria-expanded', String(isActive && expandedStudyBookId === book.id));
      button.setAttribute('aria-controls', 'studySizePanel');
      button.setAttribute('aria-label', (isActive ? '当前单词本 ' : '使用单词本 ') + book.name + '，共 ' + book.words.length + ' 个词条' + (isActive ? '；点击设置每组数量' : ''));

      const name = document.createElement('span');
      name.className = 'wordbook-option__name';
      name.textContent = book.name;

      const count = document.createElement('span');
      count.className = 'wordbook-option__count';
      count.textContent = book.words.length + ' 词';

      const chevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      chevron.classList.add('wordbook-option__chevron');
      chevron.setAttribute('viewBox', '0 0 24 24');
      chevron.setAttribute('aria-hidden', 'true');
      chevron.innerHTML = '<path d="m9 6 6 6-6 6"></path>';

      button.append(name, count, chevron);
      return button;
    }

    function createWordbookOptionStack(book, source, isActive) {
      const stack = document.createElement('div');
      stack.className = 'wordbook-option-stack';
      stack.dataset.bookId = book.id;
      stack.append(createWordbookOption(book, source, isActive));

      if (isActive && expandedStudyBookId === book.id) {
        const canDelete = source === 'custom';
        studySizeDelete.hidden = !canDelete;
        studySizeDelete.dataset.deleteBookId = canDelete ? book.id : '';
        studySizeDelete.setAttribute('aria-label', canDelete ? '删除单词本 ' + book.name : '删除当前单词本');
        studySizeDelete.title = canDelete ? '删除“' + book.name + '”' : '';
        studySizePanel.hidden = false;
        stack.append(studySizePanel);
      }
      return stack;
    }

    function renderWordbookLists() {
      studySizePanel.hidden = true;
      studySizeDelete.hidden = true;
      studySizeDelete.dataset.deleteBookId = '';
      const builtInFragment = document.createDocumentFragment();
      BUILT_IN_BOOKS.forEach((book) => {
        builtInFragment.append(createWordbookOptionStack(book, 'built-in', book.id === activeBuiltInBookId));
      });
      builtInWordbookList.replaceChildren(builtInFragment);

      const customFragment = document.createDocumentFragment();
      const hasCombinedImport = !activeBuiltInBookId && !activeCustomBookId && WORDS.length > 0;
      if (hasCombinedImport) {
        customFragment.append(createWordbookOptionStack({ id: 'combined-import', name: '合并生词本', words: WORDS }, 'combined', true));
      }
      customBooks.forEach((book) => {
        customFragment.append(createWordbookOptionStack(book, 'custom', book.id === activeCustomBookId));
      });
      customWordbookList.replaceChildren(customFragment);
      customWordbookSection.hidden = customBooks.length === 0 && !hasCombinedImport;
    }

    async function selectBuiltInBook(bookId) {
      if (!isReady || isTransitioning || isImporting) return;
      const book = BUILT_IN_BOOKS.find((entry) => entry.id === bookId);
      if (!book) return;
      if (activeBuiltInBookId === book.id) {
        setExpandedStudyBook(book.id, expandedStudyBookId !== book.id);
        return;
      }

      isImporting = true;
      WORDS = book.words;
      activeBuiltInBookId = book.id;
      activeCustomBookId = null;
      studySize = studySizePreferenceForBook(book.id);
      expandedStudyBookId = book.id;
      renderWordbookLists();
      shuffle();
      window.setTimeout(scrollExpandedStudyBook, 80);
      isImporting = false;
      syncChrome();
      refreshMemorySummary();

      const remembered = await queueRememberedSelection({
        builtInBookId: book.id,
        customBookId: null,
        fileNames: [book.fileName]
      });
      if (activeBuiltInBookId !== book.id) return;
      showImportStatus('已切换到“' + book.name + '”，共 ' + book.words.length + ' 个词条；请选择每组数量' + (remembered ? '' : '；浏览器未能保存本次选择'));
    }

    async function selectCustomBook(bookId) {
      if (!isReady || isTransitioning || isImporting) return;
      const book = customBooks.find((entry) => entry.id === bookId);
      if (!book) return;
      if (activeCustomBookId === book.id) {
        setExpandedStudyBook(book.id, expandedStudyBookId !== book.id);
        return;
      }

      isImporting = true;
      WORDS = book.words;
      activeBuiltInBookId = null;
      activeCustomBookId = book.id;
      studySize = studySizePreferenceForBook(book.id);
      expandedStudyBookId = book.id;
      renderWordbookLists();
      shuffle();
      window.setTimeout(scrollExpandedStudyBook, 80);
      isImporting = false;
      syncChrome();
      refreshMemorySummary();

      const remembered = await queueRememberedSelection({
        builtInBookId: null,
        customBookId: book.id,
        fileNames: [book.fileName]
      });
      if (activeCustomBookId !== book.id) return;
      showImportStatus('已切换到“' + book.name + '”，共 ' + book.words.length + ' 个词条；请选择每组数量' + (remembered ? '' : '；浏览器未能保存本次选择'));
    }

    async function deleteCustomBook(bookId) {
      if (!isReady || isTransitioning || isImporting) return;
      const book = customBooks.find((entry) => entry.id === bookId);
      if (!book) return;

      const isProjectBook = PROJECT_PERSONAL_BOOK_IDS.has(book.id);
      const warning = isProjectBook
        ? '确定从“我的单词本”中移除“' + book.name + '”吗？项目中的源文件不会被删除。'
        : '确定删除“' + book.name + '”吗？删除后需要重新导入才能恢复。';
      if (!window.confirm(warning)) return;

      isImporting = true;
      const wasActive = activeCustomBookId === book.id;
      customBooks = customBooks.filter((entry) => entry.id !== book.id);
      if (isProjectBook && !deletedProjectPersonalBookIds.includes(book.id)) {
        deletedProjectPersonalBookIds.push(book.id);
      }

      if (wasActive) {
        WORDS = DEFAULT_WORDS;
        activeBuiltInBookId = DEFAULT_BOOK.id;
        activeCustomBookId = null;
        studySize = studySizePreferenceForBook(DEFAULT_BOOK.id);
        expandedStudyBookId = null;
        shuffle();
      }
      renderWordbookLists();

      const activeBook = activeBuiltInBookId
        ? BUILT_IN_BOOKS.find((entry) => entry.id === activeBuiltInBookId)
        : customBooks.find((entry) => entry.id === activeCustomBookId);
      const remembered = await rememberVocabulary({
        fileNames: activeBook ? [activeBook.fileName] : []
      });
      showImportStatus('已删除“' + book.name + '”' + (wasActive ? '，并切换到默认内置词库' : '') + (remembered ? '' : '；浏览器未能保存本次删除'));
      isImporting = false;
      syncChrome();
      refreshMemorySummary();
    }

    function speak() {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const memoryItem = memoryIsOpen ? memoryCurrentItem() : null;
      const activeWord = memoryItem ? memoryItem.word : WORDS[deck[position]];
      if (!activeWord) return;
      const utterance = new SpeechSynthesisUtterance(activeWord.word);
      utterance.lang = 'en-US';
      utterance.rate = 0.88;
      window.speechSynthesis.speak(utterance);
    }

    previousButton.addEventListener('click', previous);
    nextButton.addEventListener('click', next);
    deckStage.addEventListener('pointerdown', startClassicSwipe);
    deckStage.addEventListener('pointerup', finishClassicSwipe);
    deckStage.addEventListener('pointercancel', cancelClassicSwipe);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelActiveCardTransition('document-hidden');
    });
    window.addEventListener('pagehide', () => cancelActiveCardTransition('page-hidden'));
    themeButton.addEventListener('click', () => {
      setTheme(document.documentElement.dataset.theme === 'playful' ? 'classic' : 'playful');
    });
    settingsButton.addEventListener('click', () => {
      setSettingsOpen(!document.body.classList.contains('settings-open'));
    });
    wordbookButton.addEventListener('click', () => {
      setWordbookPanelOpen(wordbookPanel.hidden);
    });
    memorySettingsButton.addEventListener('click', () => setMemorySettingsOpen(memorySettingsPanel.hidden));
    memoryDailyNewInput.addEventListener('change', saveMemorySettings);
    memoryDailyPresets.addEventListener('click', (event) => {
      const button = event.target instanceof Element ? event.target.closest('[data-memory-daily]') : null;
      if (!(button instanceof HTMLButtonElement)) return;
      memoryDailyNewInput.value = button.dataset.memoryDaily;
      saveMemorySettings();
    });
    memoryDailyNewInput.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      saveMemorySettings();
    });
    memoryButton.addEventListener('click', () => {
      if (memoryIsOpen) closeMemoryReview();
      else openMemoryReview();
    });
    memoryCloseButton.addEventListener('click', closeMemoryReview);
    memoryReturnButton.addEventListener('click', closeMemoryReview);
    memoryModeButton.addEventListener('click', toggleMemoryStudyMode);
    memoryRevealButton.addEventListener('click', toggleMemoryAnswer);
    memorySoundButton.addEventListener('click', (event) => { event.stopPropagation(); speak(); });
    memoryCard.addEventListener('click', (event) => {
      if (!(event.target instanceof HTMLInputElement)) revealMemoryAnswer();
    });
    memoryAgainButton.addEventListener('click', () => rateMemoryCard(window.FSRS.Rating.Again));
    memoryGoodButton.addEventListener('click', () => rateMemoryCard(window.FSRS.Rating.Good));
    memoryUndoButton.addEventListener('click', undoMemoryRating);
    memorySpellingInput.addEventListener('input', () => checkMemorySpelling(false));
    memorySpellingInput.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      checkMemorySpelling(true);
    });
    memoryExportButton.addEventListener('click', exportMemoryProgress);
    memoryImportButton.addEventListener('click', () => memoryImportInput.click());
    memoryImportInput.addEventListener('change', () => importMemoryProgress(memoryImportInput.files && memoryImportInput.files[0]));
    memoryResetBookButton.addEventListener('click', () => resetMemoryProgress(activeMemoryBookId()));
    memoryResetAllButton.addEventListener('click', () => resetMemoryProgress(null));
    studySizePresets.addEventListener('click', (event) => {
      const option = event.target instanceof Element ? event.target.closest('[data-study-size]') : null;
      if (!(option instanceof HTMLButtonElement)) return;
      setStudySizePreference(option.dataset.studySize === 'all' ? Infinity : option.dataset.studySize);
    });
    studySizeDecrease.addEventListener('click', () => stepStudySizeInput(-1));
    studySizeIncrease.addEventListener('click', () => stepStudySizeInput(1));
    studySizeApply.addEventListener('click', applyCustomStudySize);
    studySizeDelete.addEventListener('click', () => {
      if (studySizeDelete.dataset.deleteBookId) deleteCustomBook(studySizeDelete.dataset.deleteBookId);
    });
    studySizeInput.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      applyCustomStudySize();
    });
    function handleWordbookOptionClick(event) {
      const option = event.target instanceof Element ? event.target.closest('.wordbook-option') : null;
      if (option instanceof HTMLButtonElement && option.dataset.bookId) {
        if (option.dataset.bookSource === 'combined') {
          setExpandedStudyBook(option.dataset.bookId, expandedStudyBookId !== option.dataset.bookId);
        } else if (option.dataset.bookSource === 'custom') {
          selectCustomBook(option.dataset.bookId);
        } else {
          selectBuiltInBook(option.dataset.bookId);
        }
      }
    }
    builtInWordbookList.addEventListener('click', handleWordbookOptionClick);
    customWordbookList.addEventListener('click', handleWordbookOptionClick);
    cardLayer.addEventListener('click', (event) => {
      if (!(event.target instanceof Element)) return;
      if (handleStackedCardAdvance(event)) return;
      if (event.target.closest('.study-mode-button')) {
        cycleStudyMode();
        return;
      }
      if (event.target.closest('.sound-button')) speak();
    });
    cardLayer.addEventListener('input', (event) => {
      if (event.target instanceof HTMLInputElement && event.target.matches('.card-spelling-input')) {
        checkSpellingInput(event.target);
      }
    });
    importButton.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', () => importBooks(Array.from(importInput.files || [])));
    shuffleButton.addEventListener('click', shuffle);
    studyCompleteContinue.addEventListener('click', continueAfterStudyComplete);
    studyCompleteAdjust.addEventListener('click', adjustStudySizeAfterComplete);

    window.addEventListener('keydown', (event) => {
      if (memoryIsOpen) {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
          event.preventDefault();
          undoMemoryRating();
          return;
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          closeMemoryReview();
          return;
        }
        const isMemoryInput = event.target instanceof HTMLInputElement;
        if (isMemoryInput) return;
        if (event.key === ' ' && !memoryRevealed) {
          event.preventDefault();
          revealMemoryAnswer();
          return;
        }
        if (event.key === '1' || event.key === 'ArrowLeft') {
          event.preventDefault();
          rateMemoryCard(window.FSRS.Rating.Again);
          return;
        }
        if (memoryStudyMode !== 'spelling' && (event.key === '2' || event.key === 'ArrowRight')) {
          event.preventDefault();
          rateMemoryCard(window.FSRS.Rating.Good);
          return;
        }
        return;
      }
      if (isStudyCompleteOpen && event.key === 'Tab') {
        const dialogButtons = [studyCompleteContinue, studyCompleteAdjust];
        const currentIndex = dialogButtons.indexOf(document.activeElement);
        const nextIndex = event.shiftKey
          ? (currentIndex <= 0 ? dialogButtons.length - 1 : currentIndex - 1)
          : (currentIndex >= dialogButtons.length - 1 ? 0 : currentIndex + 1);
        event.preventDefault();
        dialogButtons[nextIndex].focus();
        return;
      }
      if (event.key === 'Escape' && isStudyCompleteOpen) {
        event.preventDefault();
        closeStudyComplete(true);
        return;
      }
      if (event.key === 'Escape' && document.body.classList.contains('settings-open')) {
        event.preventDefault();
        setSettingsOpen(false);
        settingsButton.focus();
        return;
      }
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const isTextEntry = event.target instanceof HTMLElement && Boolean(event.target.closest('input, textarea, [contenteditable="true"]'));
      if (isTextEntry) return;
      const isInteractive = event.target instanceof HTMLElement && Boolean(event.target.closest('button, input, a'));
      if (isInteractive && (event.key === ' ' || event.key === 'Enter')) return;
      if (event.key === 'ArrowRight' || event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        next();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        previous();
      } else if (event.key.toLowerCase() === 'r') {
        if (shuffleButton.disabled) return;
        event.preventDefault();
        shuffle();
      }
    });

    syncThemeButton();

    async function initializeVocabulary() {
      const rememberedVocabulary = await loadRememberedVocabulary();
      if (rememberedVocabulary) {
        WORDS = rememberedVocabulary.words;
        activeBuiltInBookId = rememberedVocabulary.builtInBookId;
        activeCustomBookId = rememberedVocabulary.customBookId;
        customBooks = rememberedVocabulary.customBooks;
        deletedProjectPersonalBookIds = rememberedVocabulary.deletedProjectPersonalBookIds;
      }
      studySize = studySizePreferenceForBook(activeStudyBookKey());
      renderWordbookLists();
      await loadMemorySettings();
      isReady = true;
      shuffle();
      refreshMemorySummary();
    }

    initializeVocabulary().catch(() => {
      WORDS = DEFAULT_WORDS;
      activeBuiltInBookId = DEFAULT_BOOK.id;
      activeCustomBookId = null;
      customBooks = PROJECT_PERSONAL_BOOKS.slice();
      deletedProjectPersonalBookIds = [];
      studySize = studySizePreferenceForBook(DEFAULT_BOOK.id);
      renderWordbookLists();
      isReady = true;
      shuffle();
      loadMemorySettings().finally(refreshMemorySummary);
    });
    let memoryLastClock = Date.now();
    window.setInterval(() => {
      const now = Date.now();
      if (now < memoryLastClock - 5 * 60 * 1000) showImportStatus('检测到设备时间明显回拨；已有复习时间未被改写，请确认系统时钟。', true);
      memoryLastClock = now;
      refreshMemorySummary();
    }, 60 * 1000);
  </script>
</body>
</html>`;

fs.writeFileSync(outputPath, output, 'utf8');
console.log(`已生成 ${path.basename(outputPath)}，内置 ${builtInBooks.length} 个单词本、我的单词本 ${personalBooks.length} 个，共 ${builtInBooks.concat(personalBooks).reduce((total, book) => total + book.words.length, 0)} 个词条。`);
