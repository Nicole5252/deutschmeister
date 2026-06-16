// SM-2 Spaced Repetition Algorithm (same as Anki)
// Grade: 0=Again, 1=Hard, 2=Good, 3=Easy

export function calculateNextReview(card, grade) {
  const now = Date.now();
  let { easeFactor = 2.5, interval = 0, repetitions = 0 } = card.srs || {};

  if (grade === 0) {
    // Again: reset
    repetitions = 0;
    interval = 1;
    easeFactor = Math.max(1.3, easeFactor - 0.2);
  } else if (grade === 1) {
    // Hard
    interval = Math.max(1, Math.round(interval * 1.2));
    easeFactor = Math.max(1.3, easeFactor - 0.15);
  } else {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
    if (grade === 3) {
      // Easy
      easeFactor = easeFactor + 0.15;
      interval = Math.round(interval * 1.3);
    }
  }

  const nextReview = now + interval * 24 * 60 * 60 * 1000;

  return {
    easeFactor,
    interval,
    repetitions,
    nextReview,
    lastReview: now,
  };
}

export function isDue(card) {
  if (!card.srs?.nextReview) return true;
  return Date.now() >= card.srs.nextReview;
}

export function getDueCards(cards) {
  return cards.filter(isDue);
}

export function getNewCards(cards) {
  return cards.filter(c => !c.srs?.lastReview);
}

export function getMasteredCards(cards) {
  return cards.filter(c => c.srs?.repetitions >= 5 && c.srs?.interval >= 21);
}
