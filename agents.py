import numpy as np

# RLCard 1.2.0 Leduc Hold'em action IDs
FOLD  = 2
CALL  = 0
RAISE = 1
CHECK = 3

# Observation vector layout (36-dim):
#   [0:3]   private card one-hot  (index 0=J, 1=Q, 2=K)
#   [3:6]   public card one-hot   (index 0=J, 1=Q, 2=K; all zeros pre-flop)
#   [6:36]  betting history

CARD_NAMES = {0: 'J', 1: 'Q', 2: 'K'}


def _decode_card(one_hot_slice):
    """Return card index (0=J,1=Q,2=K) or -1 if all zeros (not yet dealt)."""
    idx = int(np.argmax(one_hot_slice))
    return idx if one_hot_slice[idx] == 1.0 else -1


class RandomAgent:
    """Picks uniformly at random from the legal actions provided by the env."""

    def act(self, state):
        legal_actions = list(state['legal_actions'].keys())
        return np.random.choice(legal_actions)


class RuleBasedAgent:
    """
    Heuristic agent for Leduc Hold'em:
      - Raise  if holding a pair (private card == community card)
      - Call   if holding a King
      - Fold   otherwise
    Pre-flop (no community card yet):
      - Call   if holding a King
      - Fold   otherwise
    Always restricted to the legal action set.
    """

    def act(self, state):
        obs          = state['obs']
        legal        = state['legal_actions']
        legal_keys   = set(legal.keys())

        private_idx  = _decode_card(obs[0:3])   # 0=J, 1=Q, 2=K
        public_idx   = _decode_card(obs[3:6])   # -1  pre-flop

        # Determine intended action
        if public_idx != -1 and private_idx == public_idx:
            intended = RAISE   # pair -> aggressive
        elif private_idx == 2:
            intended = CALL    # King -> call/check
        else:
            intended = FOLD

        # CHECK is semantically equivalent to CALL; substitute if needed
        if intended == CALL and CALL not in legal_keys and CHECK in legal_keys:
            intended = CHECK

        # Fall back to call/check -> fold if intended action is illegal
        if intended not in legal_keys:
            if CALL in legal_keys:
                intended = CALL
            elif CHECK in legal_keys:
                intended = CHECK
            else:
                intended = FOLD

        return intended


class TightAgent:
    """
    Style archetype: tight/passive.

    Strategy:
      - Raise  never.
      - Call   if holding a pair (private == public) or a King.
      - Fold   otherwise.
    Pre-flop: call with King, fold otherwise.

    Designed to produce f_fold >> 0.6 so the classifier labels it "tight".
    Expected fold rate: ~2/3 pre-flop (J or Q without a pair).
    """

    def act(self, state):
        obs        = state['obs']
        legal_keys = set(state['legal_actions'].keys())

        private_idx = _decode_card(obs[0:3])
        public_idx  = _decode_card(obs[3:6])

        has_pair = (public_idx != -1 and private_idx == public_idx)
        has_king = (private_idx == 2)

        if has_pair or has_king:
            # Call or check — never raise
            if CALL in legal_keys:
                return CALL
            if CHECK in legal_keys:
                return CHECK

        return FOLD


class AggressiveAgent:
    """
    Style archetype: aggressive.

    Strategy:
      - Raise  whenever raise is legal.
      - Fold   pre-flop if holding a Jack (lowest card) and no pair.
      - Call   in all other cases where raise is illegal.

    Designed to produce f_raise >> 0.6 and f_fold near zero so the
    classifier labels it "aggressive" (f_bet + f_raise > 0.6).
    """

    def act(self, state):
        obs        = state['obs']
        legal_keys = set(state['legal_actions'].keys())

        private_idx = _decode_card(obs[0:3])
        public_idx  = _decode_card(obs[3:6])

        is_preflop = (public_idx == -1)
        has_pair   = (not is_preflop and private_idx == public_idx)
        has_jack   = (private_idx == 0)

        # Pre-flop Jack with no pair: fold to avoid obvious losing spots
        if is_preflop and has_jack:
            return FOLD

        # Raise whenever possible
        if RAISE in legal_keys:
            return RAISE

        # Fallback: call or check
        if CALL in legal_keys:
            return CALL
        if CHECK in legal_keys:
            return CHECK

        return FOLD
