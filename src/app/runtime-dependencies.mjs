import memoryCore from "../features/memory-review/core.js";
import animationCoordinator from "../animations/animation-coordinator.js";
import animationGeometry from "../animations/geometry.js";
import cardTransition from "../animations/card-transition.js";
import deckTransitionView from "../animations/deck-transition-view.js";
import wordbookParser from "../features/wordbooks/parser.js";
import wordbookController from "../features/wordbooks/controller.js";
import classicDeckModel from "../features/classic-deck/model.js";
import classicDeckController from "../features/classic-deck/controller.js";
import reviewSession from "../features/memory-review/review-session.js";
import memoryReviewController from "../features/memory-review/controller.js";
import memoryRefresh from "../features/memory-review/refresh-policy.js";
import storageAvailability from "../services/storage/availability.js";
import storageMigrationV1 from "../services/storage/migrations/v1.js";
import storageMigrationV2 from "../services/storage/migrations/v2.js";
import storageDatabase from "../services/storage/database.js";
import reviewRepository from "../services/storage/review-repository.js";
import wordbookRepository from "../services/storage/wordbook-repository.js";
import settingsRepository from "../services/storage/settings-repository.js";
import settings from "../features/settings/controller.js";
import settingsView from "../views/settings-view.js";
import wordbookView from "../views/wordbook-view.js";
import completionView from "../views/completion-view.js";
import classicDeckView from "../views/classic-deck-view.js";
import memoryReviewView from "../views/memory-review-view.js";
import appEvents from "./events.js";
import importProcessor from "../services/import/processor.js";
import * as fsrs from "ts-fsrs";

const animations = Object.assign(
  {},
  animationCoordinator,
  animationGeometry,
  cardTransition,
  deckTransitionView,
);
const wordbooks = Object.assign({}, wordbookParser, wordbookController);
const classicDeck = Object.assign({}, classicDeckModel, classicDeckController);
const memoryReview = Object.assign({}, reviewSession, memoryReviewController);
const storage = Object.assign(
  {},
  storageAvailability,
  storageMigrationV1,
  storageMigrationV2,
  storageDatabase,
  reviewRepository,
  wordbookRepository,
  settingsRepository,
);
const views = Object.assign(
  {},
  settingsView,
  wordbookView,
  completionView,
  classicDeckView,
  memoryReviewView,
);

export {
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
};
