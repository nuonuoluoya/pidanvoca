(function attachDeckTransitionView(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else if (root)
    root.PidanvocaAnimations = Object.assign(
      {},
      root.PidanvocaAnimations || {},
      api,
    );
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function createDeckTransitionViewApi() {
    "use strict";

    class DeckTransitionView {
      constructor({
        cardLayer,
        synchronizeCards,
        setCardOffset,
        bringCurrentForward,
        applyExitPoint,
      }) {
        this.cardLayer = cardLayer;
        this.synchronizeCards = synchronizeCards;
        this.setCardOffset = setCardOffset;
        this.bringCurrentForward = bringCurrentForward;
        this.applyExitPoint = applyExitPoint;
      }

      mount(cards) {
        this.cardLayer.replaceChildren(...cards);
        this.bringCurrentForward(cards);
      }

      prepareMemoryAdvance(position, target) {
        const cards = this.synchronizeCards(
          position,
          1,
          new Set([position, target]),
        );
        this.mount(cards);
        this.cardLayer.classList.add("is-memory-advancing");
        void this.cardLayer.offsetWidth;
        return { cards, target };
      }

      startMemoryAdvance(advance, position) {
        if (!advance) return;
        advance.cards.forEach((card) => {
          const deckPosition = Number(card.dataset.deckPosition);
          if (deckPosition === position)
            card.classList.add("is-memory-hidden-current");
          else if (deckPosition > position)
            this.setCardOffset(card, deckPosition - advance.target);
        });
      }

      finishMemoryAdvance(advance, position) {
        if (!advance) return;
        this.cardLayer.classList.remove("is-memory-advancing");
        this.mount(this.synchronizeCards(position));
      }

      prepareMemoryRetreat(position) {
        const cards = this.synchronizeCards(position);
        this.mount(cards);
        this.cardLayer.classList.add("is-memory-retreating");
        void this.cardLayer.offsetWidth;
        return {
          cards,
          leadingCard: cards.find(
            (card) => Number(card.dataset.deckPosition) === position,
          ),
        };
      }

      startMemoryRetreat(retreat, position) {
        retreat.cards.forEach((card) => {
          const deckPosition = Number(card.dataset.deckPosition);
          if (deckPosition === position)
            card.classList.add("is-memory-hidden-current");
          this.setCardOffset(card, deckPosition - position + 1);
        });
      }

      finishMemoryRetreat(retreat, position) {
        if (!retreat) return;
        this.cardLayer.classList.remove("is-memory-retreating");
        this.mount(this.synchronizeCards(position));
      }

      prepareClassicMove({
        cards,
        currentCard,
        incomingCard,
        direction,
        exitPoint,
        currentWaterLevel,
      }) {
        const incomingWater =
          incomingCard && incomingCard.querySelector(".card-water-progress");
        const targetWaterLevel =
          incomingWater &&
          incomingWater.style.getPropertyValue("--water-level");
        if (incomingWater)
          incomingWater.style.setProperty(
            "--water-level",
            currentWaterLevel + "%",
          );
        if (direction > 0) {
          this.applyExitPoint(currentCard, exitPoint);
          currentCard.classList.add("is-flying-out");
          incomingCard.classList.add("is-incoming");
        } else {
          this.applyExitPoint(incomingCard, exitPoint);
          currentCard.classList.add("is-yielding");
          incomingCard.classList.add("is-incoming", "is-returning");
        }
        this.mount(cards);
        return { incomingWater, targetWaterLevel };
      }

      startClassicMove(cards, target, incomingWater, targetWaterLevel) {
        cards.forEach((card) =>
          this.setCardOffset(card, Number(card.dataset.deckPosition) - target),
        );
        this.cardLayer.classList.add("is-transitioning");
        requestAnimationFrame(() => {
          if (incomingWater && targetWaterLevel)
            incomingWater.style.setProperty("--water-level", targetWaterLevel);
        });
      }

      resetTransitionClasses() {
        this.cardLayer.classList.remove(
          "is-transitioning",
          "is-memory-advancing",
          "is-memory-retreating",
        );
      }
    }

    return Object.freeze({ DeckTransitionView });
  },
);
