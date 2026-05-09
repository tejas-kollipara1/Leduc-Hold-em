// Poker Hand logic
type Card = { suit: string; value: string; numValue: number };

export const SUITS = ['♠', '♥', '♣', '♦'];
export const VALUES = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

export const getNumValue = (val: string): number => {
  if (val === 'J') return 11;
  if (val === 'Q') return 12;
  if (val === 'K') return 13;
  if (val === 'A') return 14;
  return parseInt(val);
};

export const createDeck = (): Card[] => {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const value of VALUES) {
      deck.push({ suit, value, numValue: getNumValue(value) });
    }
  }
  return deck.sort(() => Math.random() - 0.5);
};

// Extremely simplified evaluation just for the demo.
// Returns a score weight for the hand.
export const evaluateHand = (hand: Card[], community: Card[]): { name: string, score: number } => {
  const allCards = [...hand, ...community].sort((a, b) => b.numValue - a.numValue);
  if (allCards.length === 0) return { name: 'High Card', score: 0 };
  
  const counts: Record<string, number> = {};
  const suits: Record<string, number> = {};
  
  allCards.forEach(c => {
    counts[c.value] = (counts[c.value] || 0) + 1;
    suits[c.suit] = (suits[c.suit] || 0) + 1;
  });

  const isFlush = Object.values(suits).some(v => v >= 5);
  const pairs = Object.values(counts).filter(v => v === 2).length;
  const threeOfKind = Object.values(counts).filter(v => v === 3).length;
  const fourOfKind = Object.values(counts).filter(v => v === 4).length;

  let pairScore = 0, threeScore = 0, fourScore = 0;
  for (const val of Object.keys(counts)) {
    const num = getNumValue(val);
    if (counts[val] === 2) {
      // If there are multiple pairs, keep the highest as pairScore
      pairScore = Math.max(pairScore, num);
    }
    if (counts[val] === 3 && num > threeScore) threeScore = num;
    if (counts[val] === 4 && num > fourScore) fourScore = num;
  }

  // Create a kicker score out of the top 5 cards (used as a decimal tiebreaker)
  let kickerScore = 0;
  for (let i = 0; i < Math.min(5, allCards.length); i++) {
    kickerScore += allCards[i].numValue / Math.pow(100, i);
  }

  if (fourOfKind > 0) return { name: 'Four of a Kind', score: 80000 + fourScore * 100 + kickerScore };
  if (threeOfKind > 0 && pairs > 0) return { name: 'Full House', score: 70000 + threeScore * 100 + pairScore };
  if (isFlush) return { name: 'Flush', score: 60000 + kickerScore };
  if (threeOfKind > 0) return { name: 'Three of a Kind', score: 40000 + threeScore * 100 + kickerScore };
  if (pairs > 1) return { name: 'Two Pair', score: 30000 + pairScore * 100 + kickerScore };
  if (pairs === 1) return { name: 'Pair', score: 20000 + pairScore * 100 + kickerScore };
  
  return { name: `High Card (${allCards[0]?.value})`, score: kickerScore };
};
