const {
  animations,
  appEvents,
  classicDeck,
  fsrs,
  importProcessor,
  memoryCore,
  memoryRefresh,
  memoryReview,
  settings,
  storage,
  views,
  wordbooks,
} = require("./runtime-dependencies.mjs");

window.PidanvocaRuntime = Object.freeze({
  memoryCore,
  animations: Object.freeze(animations),
  wordbooks: Object.freeze(wordbooks),
  classicDeck: Object.freeze(classicDeck),
  memoryReview: Object.freeze(memoryReview),
  memoryRefresh,
  storage: Object.freeze(storage),
  settings,
  views: Object.freeze(views),
  appEvents,
  importProcessor,
  fsrs,
});

require("./bootstrap");
delete window.PidanvocaRuntime;
