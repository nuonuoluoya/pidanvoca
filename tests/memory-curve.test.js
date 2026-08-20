const assert = require('node:assert/strict');
const Core = require('../memory-curve-core');
const FSRS = require('ts-fsrs');

function test(name, run) {
  try {
    run();
    console.log('✓ ' + name);
  } catch (error) {
    console.error('✗ ' + name);
    throw error;
  }
}

test('规范化单词键保留实际标点并统一空白和大小写', () => {
  assert.equal(Core.normalizeWordKey('  Tit\u3000For   Tat  '), 'tit for tat');
  assert.equal(Core.normalizeWordKey("Mother-in-law's"), "mother-in-law's");
});

test('卡片 ID 按词库隔离', () => {
  assert.equal(Core.createCardId('cet4', 'Acme'), 'cet4::acme');
  assert.notEqual(Core.createCardId('cet4', 'Acme'), Core.createCardId('ielts', 'Acme'));
});

test('同一天的新词选择稳定且排除已学习词', () => {
  const words = Array.from({ length: 30 }, (_, index) => ({ word: 'word-' + index }));
  const learned = new Set(['word-1', 'word-2']);
  const first = Core.selectDailyNewWords(words, learned, 'book-a', '2026-08-20', 10);
  const second = Core.selectDailyNewWords(words, learned, 'book-a', '2026-08-20', 10);
  assert.deepEqual(first, second);
  assert.equal(first.length, 10);
  assert.equal(first.some((item) => learned.has(item.wordKey)), false);
});

test('每日新词缺省值为 10，显式设置 0 时仍可暂停新词', () => {
  assert.equal(Core.clampDailyNew(null), 10);
  assert.equal(Core.clampDailyNew(undefined), 10);
  assert.equal(Core.clampDailyNew(0), 0);
});

test('FSRS 两档评分生成 10 分钟重学与更长 Good 间隔', () => {
  const now = new Date('2026-08-20T00:00:00Z');
  const scheduler = FSRS.fsrs({
    request_retention: 0.9,
    enable_short_term: true,
    learning_steps: ['10m'],
    relearning_steps: ['10m'],
    enable_fuzz: false
  });
  const preview = scheduler.repeat(FSRS.createEmptyCard(now), now);
  assert.equal(preview[FSRS.Rating.Again].card.due.getTime() - now.getTime(), 10 * 60 * 1000);
  assert.ok(preview[FSRS.Rating.Good].card.due.getTime() > preview[FSRS.Rating.Again].card.due.getTime());
});

test('FSRS 卡片序列化后能恢复日期字段', () => {
  const now = new Date('2026-08-20T00:00:00Z');
  const card = FSRS.createEmptyCard(now);
  const serialized = Core.serializeFsrsCard(card);
  const restored = Core.deserializeFsrsCard(serialized);
  assert.ok(restored.due instanceof Date);
  assert.equal(restored.due.getTime(), now.getTime());
});

test('到期记录按到期时间排序', () => {
  const sorted = Core.sortDueRecords([
    { cardId: 'b', due: 20 },
    { cardId: 'a', due: 20 },
    { cardId: 'c', due: 10 }
  ]);
  assert.deepEqual(sorted.map((item) => item.cardId), ['c', 'a', 'b']);
});

test('备份格式校验拒绝不兼容版本', () => {
  assert.equal(Core.validateBackup({}).valid, false);
  assert.equal(Core.validateBackup({
    format: Core.backupFormat,
    formatVersion: Core.backupFormatVersion,
    reviewCards: [],
    reviewLogs: [],
    metaEntries: []
  }).valid, true);
});

console.log('记忆曲线逻辑测试全部通过。');
