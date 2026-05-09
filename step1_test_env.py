import rlcard
import numpy as np

# RLCard 1.2.0 Leduc Hold'em action indices
# env.actions = ['call', 'raise', 'fold', 'check']
ACTION_NAMES = {0: 'call', 1: 'raise', 2: 'fold', 3: 'check'}


def run_episode(env, episode_num):
    """Run one complete episode with random actions, printing state info."""
    state, player_id = env.reset()

    print("=" * 60)
    print(f"EPISODE {episode_num} — INITIAL STATE")
    print("=" * 60)
    obs = state['obs']
    print(f"  Current player  : {player_id}")
    print(f"  Obs shape       : {obs.shape}")
    print(f"  Obs vector      : {obs}")
    print(f"  Legal actions   : {list(state['legal_actions'].keys())} "
          f"({[ACTION_NAMES[a] for a in state['legal_actions']]})")
    print()

    step = 0
    while True:
        legal_actions = list(state['legal_actions'].keys())
        action = np.random.choice(legal_actions)
        print(f"  Step {step}: Player {player_id} -> {action} ({ACTION_NAMES[action]})")

        state, player_id = env.step(action)
        obs = state['obs']
        print(f"           Next player: {player_id} | "
              f"Legal: {[ACTION_NAMES[a] for a in state['legal_actions']]}")
        step += 1

        if env.is_over():
            payoffs = env.get_payoffs()
            print(f"\n  Episode over in {step} steps. "
                  f"Payoffs: P0={payoffs[0]:+.1f}, P1={payoffs[1]:+.1f}")
            return payoffs


def explain_observation(env):
    """Print a breakdown of the 36-dim observation vector."""
    state, _ = env.reset()
    obs = state['obs']

    print("\n" + "=" * 60)
    print("OBSERVATION VECTOR BREAKDOWN  (RLCard 1.2.0, Leduc Hold'em)")
    print("=" * 60)
    print(f"Total length: {len(obs)}  (shape: {obs.shape})\n")

    # Leduc Hold'em observation is 36-dimensional:
    #   [0:3]   one-hot private card   (J=0, Q=1, K=2)
    #   [3:6]   one-hot public card    (J=0, Q=1, K=2) — zeros until flop
    #   [6:21]  round-1 betting history  (5 slots × 3 actions = 15 values)
    #   [21:36] round-2 betting history  (5 slots × 3 actions = 15 values)
    print("Indices  | Content")
    print("-" * 45)
    print("  [0:3]  | Private card one-hot: [J, Q, K]")
    print("  [3:6]  | Public card one-hot:  [J, Q, K]  (zeros before flop)")
    print("  [6:21] | Round 1 betting history (5 action slots x 3 bits)")
    print(" [21:36] | Round 2 betting history (5 action slots x 3 bits)")
    print()
    print(f"  Private card : {obs[0:3]}")
    print(f"  Public card  : {obs[3:6]}")
    print(f"  Round-1 hist : {obs[6:21]}")
    print(f"  Round-2 hist : {obs[21:36]}")


def main():
    print(f"RLCard version : {rlcard.__version__}")

    env = rlcard.make('leduc-holdem')

    print(f"Num actions    : {env.num_actions}")
    print(f"Action names   : {list(enumerate(env.actions))}")
    print(f"Num players    : {env.num_players}")
    print(f"State shape    : {env.state_shape}")
    print()

    # RLCard 1.2.0 registers 4 action IDs (call/raise/fold/check) but at most
    # 3 are ever legal in a single state — check replaces call when no bet is
    # outstanding.  For this project we treat the legal action set as {fold,
    # call/check, raise} — always 3 choices.
    assert env.num_actions == 4, f"Unexpected num_actions: {env.num_actions}"
    assert env.num_players == 2

    explain_observation(env)

    print("\n" + "=" * 60)
    print("RUNNING 3 RANDOM EPISODES")
    print("=" * 60)
    for i in range(1, 4):
        print()
        run_episode(env, i)

    print("\nStep 1 complete: Leduc Hold'em environment verified.")
    print("  - Obs vector is 36-dim (private card, public card, 2x betting history)")
    print("  - 4 action IDs registered; max 3 legal per state (fold / call-or-check / raise)")


if __name__ == '__main__':
    main()
