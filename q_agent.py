import numpy as np
import pickle
from collections import defaultdict

from agents import RandomAgent


class QLearningAgent:
    """
    Tabular Q-learning agent for Leduc Hold'em.

    State key: the raw 36-dim binary observation rounded to 2 decimal
    places and cast to a tuple — already binary (0/1) so no information
    is lost.

    Q-table: dict[(state_tuple, action)] -> float, default 0.0.
    Only legal actions are ever queried, so illegal actions stay at 0 and
    are never selected.
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
        self.q_table: dict = defaultdict(float)

    # ------------------------------------------------------------------
    # helpers
    # ------------------------------------------------------------------

    def _key(self, obs: np.ndarray) -> tuple:
        """Convert observation array to a hashable dict key."""
        return tuple(obs.round(2).tolist())

    def _best_legal_q(self, key: tuple, legal_actions: list) -> float:
        return max(self.q_table[(key, a)] for a in legal_actions)

    # ------------------------------------------------------------------
    # public API
    # ------------------------------------------------------------------

    def act(self, state: dict) -> int:
        """epsilon-greedy action selection over legal actions only."""
        legal = list(state['legal_actions'].keys())
        if np.random.random() < self.epsilon:
            return np.random.choice(legal)
        key    = self._key(state['obs'])
        return max(legal, key=lambda a: self.q_table[(key, a)])

    def update(
        self,
        state: dict,
        action: int,
        reward: float,
        next_state: dict,
        done: bool,
    ) -> None:
        """Standard Q-learning update (off-policy Bellman backup)."""
        key = self._key(state['obs'])
        if done:
            target = reward
        else:
            nkey   = self._key(next_state['obs'])
            nlegal = list(next_state['legal_actions'].keys())
            target = reward + self.gamma * self._best_legal_q(nkey, nlegal)
        self.q_table[(key, action)] += self.alpha * (
            target - self.q_table[(key, action)]
        )

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
# Episode runner — handles both players, tracks learner transitions
# ----------------------------------------------------------------------

def run_train_episode(env, agent: QLearningAgent, opponent, learner_id: int = 0) -> float:
    """
    Play one training episode.
    Learner takes multiple turns; we store every (s,a) transition and
    update them at the end with their proper targets.

    Intermediate transitions get reward=0 and bootstrap from the next
    learner state; the final transition gets the true episode payoff.
    """
    state, player_id = env.reset()
    transitions = []          # list of (state_snapshot, action)

    while not env.is_over():
        if player_id == learner_id:
            action = agent.act(state)
            transitions.append((state, action))
        else:
            action = opponent.act(state)
        state, player_id = env.step(action)

    payoffs = env.get_payoffs()
    reward  = payoffs[learner_id]

    # Back-propagate: intermediate steps bootstrap; last step uses payoff
    for i, (s, a) in enumerate(transitions):
        is_last = (i == len(transitions) - 1)
        if is_last:
            agent.update(s, a, reward, state, done=True)
        else:
            next_learner_state = transitions[i + 1][0]
            agent.update(s, a, 0.0, next_learner_state, done=False)

    agent.decay_epsilon()
    return reward


def run_eval_episode(env, agent: QLearningAgent, opponent, learner_id: int = 0) -> float:
    """Play one evaluation episode with epsilon=0 (pure greedy)."""
    saved_eps      = agent.epsilon
    agent.epsilon  = 0.0

    state, player_id = env.reset()
    while not env.is_over():
        if player_id == learner_id:
            action = agent.act(state)
        else:
            action = opponent.act(state)
        state, player_id = env.step(action)

    agent.epsilon = saved_eps
    return env.get_payoffs()[learner_id]
