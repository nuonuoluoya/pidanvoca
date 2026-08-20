const test = require("node:test");
const assert = require("node:assert/strict");
const {
  decodeEntities,
  htmlToText,
  parseWordbook,
} = require("../src/features/wordbooks/parser");

const fixture = `
<table><tbody>
  <tr>
    <td>1</td>
    <td>ice&nbsp;cream</td>
    <td>/aɪs &amp; kriːm/</td>
    <td></td>
    <td><div>旧内容<br><br>冰淇淋；雪糕</div><!--meta files {"comment":"a cold dessert"} --></td>
  </tr>
  <tr><td>2</td><td>persist</td><td>/pəˈsɪst/</td><td></td><td>坚持</td></tr>
</tbody></table>`;

test("实体解码同时支持命名、十进制和十六进制形式", () => {
  assert.equal(decodeEntities("A&amp;B &#65; &#x42;"), "A&B A B");
});

test("HTML 文本转换移除脚本样式并保留块级换行", () => {
  assert.equal(
    htmlToText("<p>Hello<br>world</p><style>x</style><script>y</script>"),
    "Hello\nworld",
  );
});

test("词本解析分离单词、音标、中文释义和英文笔记", () => {
  assert.deepEqual(parseWordbook(fixture, "fixture.html"), [
    {
      word: "ice cream",
      phonetic: "/aɪs & kriːm/",
      meaning: "冰淇淋；雪糕",
      note: "a cold dessert",
    },
    {
      word: "persist",
      phonetic: "/pəˈsɪst/",
      meaning: "坚持",
      note: "",
    },
  ]);
});

test("缺少 tbody 或有效词条时提供包含文件名的错误", () => {
  assert.throws(
    () => parseWordbook("<table></table>", "bad.html"),
    /bad\.html.*tbody/,
  );
  assert.throws(
    () => parseWordbook("<tbody><tr><td></td></tr></tbody>", "empty.html"),
    /empty\.html.*词条/,
  );
});
