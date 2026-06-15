/**
 * Classic Indian Rummy — Card Utilities
 */

export const SUITS = { S: '♠', H: '♥', D: '♦', C: '♣' };
export const SUIT_NAMES = { S: 'Spades', H: 'Hearts', D: 'Diamonds', C: 'Clubs' };
export const RANK_ORDER = { A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13 };

export const SUIT_COLORS = { S: '#1A1A2E', H: '#D32F2F', D: '#D32F2F', C: '#1A1A2E' };

/** Get suit symbol for display */
export function getSuitSymbol(cardCode) {
  if (cardCode.startsWith('J')) return '★';
  return SUITS[cardCode[0]] || '';
}

/** Get suit color */
export function getSuitColor(cardCode) {
  if (cardCode.startsWith('J')) return '#FF6F00';
  const suit = cardCode[0];
  return suit === 'H' || suit === 'D' ? '#D32F2F' : '#1A1A2E';
}

/** Get rank string */
export function getRank(cardCode) {
  if (cardCode === 'J1') return 'PJ';
  if (cardCode === 'J2') return 'PJ';
  return cardCode.substring(1);
}

/** Full display name */
export function getCardDisplay(cardCode) {
  if (cardCode === 'J1') return '★ P-Joker';
  if (cardCode === 'J2') return '★ P-Joker';
  return `${getSuitSymbol(cardCode)} ${getRank(cardCode)}`;
}

/** Card points for scoring */
export function getCardPoints(cardCode) {
  if (cardCode.startsWith('J')) return 0;
  const rank = cardCode.substring(1);
  return Math.min(RANK_ORDER[rank] || 0, 10);
}

/** Check if card is a joker */
export function isJoker(card, wildJoker) {
  return card === 'J1' || card === 'J2' || card === wildJoker;
}

/** Sort hand by suit */
export function sortBySuit(cards) {
  const suitOrder = { S: 0, H: 1, D: 2, C: 3, J: 4 };
  return [...cards].sort((a, b) => {
    const sa = suitOrder[a[0]] ?? 9;
    const sb = suitOrder[b[0]] ?? 9;
    if (sa !== sb) return sa - sb;
    return (RANK_ORDER[a.substring(1)] || 0) - (RANK_ORDER[b.substring(1)] || 0);
  });
}

/** Sort hand by rank */
export function sortByRank(cards) {
  return [...cards].sort((a, b) => {
    return (RANK_ORDER[a.substring(1)] || 0) - (RANK_ORDER[b.substring(1)] || 0);
  });
}

/**
 * Find best possible meld groups from a hand (auto-suggestion).
 * Returns array of meld groups: [{ cards: string[], type: 'pure_seq' | 'seq' | 'set' }]
 */
export function findMelds(hand, wildJoker) {
  const cards = [...hand];
  const used = new Set();
  const melds = [];

  // Step 1: Find pure sequences (greedy by suit)
  for (const suit of ['S', 'H', 'D', 'C']) {
    const suited = cards
      .filter(c => c[0] === suit && !used.has(c) && !isJoker(c, wildJoker))
      .sort((a, b) => RANK_ORDER[a.substring(1)] - RANK_ORDER[b.substring(1)]);

    let run = [];
    for (const card of suited) {
      if (run.length === 0) {
        run = [card];
      } else {
        const lastRank = RANK_ORDER[run[run.length - 1].substring(1)];
        const thisRank = RANK_ORDER[card.substring(1)];
        if (thisRank === lastRank + 1) {
          run.push(card);
        } else {
          if (run.length >= 3) {
            melds.push({ cards: [...run], type: 'pure_seq' });
            run.forEach(c => used.add(c));
          }
          run = [card];
        }
      }
    }
    if (run.length >= 3) {
      melds.push({ cards: [...run], type: 'pure_seq' });
      run.forEach(c => used.add(c));
    }
  }

  // Step 2: Find sets
  const remaining = cards.filter(c => !used.has(c) && !isJoker(c, wildJoker));
  const rankGroups = {};
  for (const card of remaining) {
    const r = card.substring(1);
    if (!rankGroups[r]) rankGroups[r] = [];
    const suits = new Set(rankGroups[r].map(c => c[0]));
    if (!suits.has(card[0])) rankGroups[r].push(card);
  }
  for (const [rank, group] of Object.entries(rankGroups)) {
    if (group.length >= 3) {
      const setCards = group.slice(0, Math.min(4, group.length));
      melds.push({ cards: setCards, type: 'set' });
      setCards.forEach(c => used.add(c));
    }
  }

  // Remaining cards (deadwood)
  const deadwoodCards = cards.filter(c => !used.has(c));
  const deadwoodPoints = deadwoodCards.reduce((sum, c) => sum + getCardPoints(c), 0);

  return { melds, deadwoodCards, deadwoodPoints };
}

/** Rank tier name */
export function getTierName(tier) {
  const names = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master'];
  return names[tier] || 'Unranked';
}

/** Format large numbers (e.g., 1500 → "1.5K") */
export function formatNumber(num) {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

/** Parse card code from a display format */
export function parseCardCode(code) {
  return code?.toUpperCase()?.replace(/\s+/g, '') || '';
}
