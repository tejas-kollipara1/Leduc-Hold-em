import numpy as np
import pickle
from collections import defaultdict

from classifier import OpponentStyleClassifier

STYLES = ("random", "tight", "aggressive")


class OpponentAwareQLearningAgent:
    """
    Q-learning agent whose state key is (base_obs_tuple, style_label).

    Effectively maintains three separate Q-tables — one per opponent style —
    inside a single dict, keyed by the style label suffix.

    Timing contract (enforced by the training loop, not this class):
      1. agent.act(state)          — classify() → ε-greedy selection
      2. env.step(learner_action)
      3. opponent acts
      4. agent.observe_opponent(opp_action)   — update classifier window
      5. agent.update(...)         — Q-backup using style stored at act-time
         for current key, and current classify() for next-state key
    """

    def __init__(
        self,
        num_actions: int = 4,
        alpha: float = 0.1,
        gamma: float = 0.99,
        epsilon: float = 1.0,
        epsilon_min: float = 0.05,
        epsilon_decay: float = 0.9995,
    ):
        self.num_actions   = num_actions
        self.alpha         = alpha
        self.gamma         = gamma
        self.epsilon       = epsilon
        self.epsilon_min   = epsilon_min
        self.epsilon_decay = epsilon_decay

        self.q_table: dict      = defaultdict(float)
        self.classifier         = OpponentStyleClassifier()
        self._last_style: str   = "random"   # style used at last act() call

    # ------------------------------------------------------------------
    # internal helpers
    # ------------------------------------------------------------------

    def _base_key(self, obs: np.ndarray) -> tuple:
        return tuple(obs.round(2).tolist())

    def _aug_key(self, obs: np.ndarray, style: str) -> tuple:
        """Augmented state key = (base_tuple, style_label)."""
        return (self._base_key(obs), style)

    def _best_q(self, aug_key: tuple, legal: list) -> float:
        return max(self.q_table[(aug_key, a)] for a in legal)

    # ------------------------------------------------------------------
    # public API
    # ------------------------------------------------------------------

    def act(self, state: dict) -> int:
        """
        ε-greedy over the Q-values for the current augmented state.
        Stores the style used so update() can build a consistent key.
        """
        self._last_style = self.classifier.classify()
        legal = list(state['legal_actions'].keys())
        if np.random.random() < self.epsilon:
            return np.random.choice(legal)
        key = self._aug_key(state['obs'], self._last_style)
        return max(legal, key=lambda a: self.q_table[(key, a)])

    def update(
        self,
        state: dict,
        action: int,
        reward: float,
        next_state: dict,
        done: bool,
        act_style: str,         # style that was current when act() was called
        next_style: str,        # style current now (after observing opponent)
    ) -> None:
        """
        Standard Q-learning Bellman backup on augmented keys.

        current key  uses act_style  (consistent with the action selected)
        next    key  uses next_style (reflects any new opponent info observed)
        """
        cur_key = self._aug_key(state['obs'], act_style)
        if done:
            target = reward
        else:
            nxt_key = self._aug_key(next_state['obs'], next_style)
            nlegal  = list(next_state['legal_actions'].keys())
            target  = reward + self.gamma * self._best_q(nxt_key, nlegal)
        self.q_table[(cur_key, action)] += self.alpha * (
            target - self.q_table[(cur_key, action)]
        )

    def observe_opponent(self, action: int) -> None:
        self.classifier.observe(action)

    def reset(self) -> None:
        """
        Reset episode-level metadata only.
        The classifier window intentionally persists across episodes so it
        can accumulate the W=20 observations needed to make style inferences.
        A Leduc episode only produces 1-3 opponent actions, so the window
        must span several episodes before it can fire a non-'random' label.
        Call reset_classifier() explicitly when starting a new opponent session.
        """
        self._last_style = "random"

    def reset_classifier(self) -> None:
        """Explicitly clear classifier history. Call when facing a new opponent."""
        self.classifier.reset()
        self._last_style = "random"

    def decay_epsilon(self) -> None:
        self.epsilon = max(self.epsilon_min, self.epsilon * self.epsilon_decay)

    def save(self, path: str) -> None:
        with open(path, 'wb') as f:
            pickle.dump(dict(self.q_table), f)

    def load(self, path: str) -> None:
        with open(path, 'rb') as f:
            data = pickle.load(f)
        self.q_table = defaultdict(float, data)


# ----------------------------------------------------------------------
# Training episode runner — enforces the correct timing order
# ----------------------------------------------------------------------

def run_train_episode(
    env,
    agent: OpponentAwareQLearningAgent,
    opponent,
    learner_id: int = 0,
) -> float:
    """
    Play one training episode with the correct observe/act/update ordering.

    Transitions are collected as (state, action, style_at_act_time).
    After the episode ends, Q-updates are issued for each transition:
      - intermediate steps: reward=0,  next = next learner state
      - final step:         reward=payoff, done=True

    The next_style for each update is taken from the FOLLOWING transition's
    act_style (i.e. after the opponent was observed in between), ensuring
    the next-state key reflects the most recent classifier state.
    For the terminal update, next_style = current classify() (post-episode).
    """
    state, player_id = env.reset()
    agent.reset()

    # Each entry: (state_snapshot, action_taken, style_at_act_time)
    transitions: list[tuple] = []

    while not env.is_over():
        if player_id == learner_id:
            # ── Step 1: classify → ε-greedy ──────────────────────────
            style  = agent.classifier.classify()
            action = agent.act(state)                # also sets _last_style
            transitions.append((state, action, style))
        else:
            # ── Step 3: observe opponent AFTER they act ───────────────
            action = opponent.act(state)
            agent.observe_opponent(action)

        state, player_id = env.step(action)

    payoffs = env.get_payoffs()
    reward  = payoffs[learner_id]

    # ── Step 5: Q-updates ─────────────────────────────────────────────
    for i, (s, a, sty) in enumerate(transitions):
        is_last = (i == len(transitions) - 1)
        if is_last:
            next_sty = agent.classifier.classify()   # post-episode style
            agent.update(s, a, reward, state, done=True,
                         act_style=sty, next_style=next_sty)
        else:
            next_s, _, next_sty = transitions[i + 1]
            agent.update(s, a, 0.0, next_s, done=False,
                         act_style=sty, next_style=next_sty)

    agent.decay_epsilon()
    return reward


def run_eval_episode(
    env,
    agent: OpponentAwareQLearningAgent,
    opponent,
    learner_id: int = 0,
) -> float:
    """
    Greedy evaluation episode — epsilon=0, no Q-updates.
    Does NOT reset the classifier so the caller can accumulate evidence
    across episodes within a session (call agent.reset_classifier() once
    before the full evaluation session for a given opponent type).
    """
    saved_eps     = agent.epsilon
    agent.epsilon = 0.0
    agent.reset()   # episode metadata only (not classifier)

    state, player_id = env.reset()
    while not env.is_over():
        if player_id == learner_id:
            action = agent.act(state)
        else:
            action = opponent.act(state)
            agent.observe_opponent(action)
        state, player_id = env.step(action)

    agent.epsilon = saved_eps
    return env.get_payoffs()[learner_id]
