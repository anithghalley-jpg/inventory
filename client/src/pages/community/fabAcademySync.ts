export type FabCardMidpoint = {
  id: string;
  top: number;
  bottom: number;
  height: number;
};

type FindNearestCardArgs = {
  containerTop: number;
  containerHeight: number;
  cards: FabCardMidpoint[];
};

export function findNearestCardToContainerMidpoint({
  containerTop,
  containerHeight,
  cards,
}: FindNearestCardArgs): string | null {
  if (containerHeight <= 0 || cards.length === 0) {
    return null;
  }

  const containerBottom = containerTop + containerHeight;
  const containerMidpoint = containerTop + containerHeight / 2;
  const measurableCards = cards.filter(card => card.height > 0);
  const visibleCards = measurableCards.filter(
    card => card.bottom > containerTop && card.top < containerBottom
  );
  const candidateCards =
    visibleCards.length > 0 ? visibleCards : measurableCards;

  if (candidateCards.length === 0) {
    return null;
  }

  let nearestId = candidateCards[0].id;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const card of candidateCards) {
    const cardMidpoint = card.top + card.height / 2;
    const midpointDistance = Math.abs(cardMidpoint - containerMidpoint);

    if (midpointDistance < nearestDistance) {
      nearestDistance = midpointDistance;
      nearestId = card.id;
    }
  }

  return nearestId;
}
