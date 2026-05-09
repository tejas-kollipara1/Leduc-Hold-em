import rlcard
import numpy as np
from agents import RandomAgent, RuleBasedAgent


def run_episode(env, agents):
    """
    Play one complete episode.
    agents: list of 2 agent objects indexed by player_id.
    Returns payoffs array [p0_reward, p1_reward].
    """
    state, player_id = env.reset()

    while not env.is_over():
        action = agents[player_id].act(state)
        state, player_id = env.step(action)

    return env.get_payoffs()


def evaluate(env, agents, n_episodes=1000, label=""):
    """Run n_episodes and return per-player stats."""
    total_rewards = np.zeros(2)
    wins          = np.zeros(2)   # win = strictly positive payoff
    draws         = 0

    for _ in range(n_episodes):
        payoffs = run_episode(env, agents)
        total_rewards += payoffs
        if payoffs[0] > 0:
            wins[0] += 1
        elif payoffs[1] > 0:
            wins[1] += 1
        else:
            draws += 1

    avg  = total_rewards / n_episodes
    wrate = wins / n_episodes
    drate = draws / n_episodes

    print(f"\n{'=' * 55}")
    print(f"  {label}  ({n_episodes} episodes)")
    print(f"{'=' * 55}")
    print(f"  {'':20s}  {'Player 0':>10s}  {'Player 1':>10s}")
    print(f"  {'Avg reward':20s}  {avg[0]:>+10.4f}  {avg[1]:>+10.4f}")
    print(f"  {'Win rate':20s}  {wrate[0]:>10.2%}  {wrate[1]:>10.2%}")
    print(f"  {'Draw rate':20s}  {drate:>10.2%}")
    print(f"  Reward sum (should ~= 0): {total_rewards.sum():.4f}")

    return avg, wrate


def main():
    env = rlcard.make('leduc-holdem')

    random_agent   = RandomAgent()
    rulebased_agent = RuleBasedAgent()

    N = 1000

    # --- Matchup 1: Random vs Random ---
    agents_rr = [random_agent, RandomAgent()]
    avg_rr, wr_rr = evaluate(env, agents_rr, N, "Random (P0) vs Random (P1)")

    assert abs(avg_rr[0] + avg_rr[1]) < 0.5, \
        "Zero-sum check failed: rewards don't cancel"
    print("  [OK] Zero-sum property holds.")

    sym_diff = abs(wr_rr[0] - wr_rr[1])
    assert sym_diff < 0.10, \
        f"Symmetry check failed: win-rate gap {sym_diff:.2%} > 10%"
    print("  [OK] Win rates are roughly symmetric (< 10% gap).")

    # --- Matchup 2: Rule-Based (P0) vs Random (P1) ---
    agents_br = [rulebased_agent, RandomAgent()]
    avg_br, wr_br = evaluate(env, agents_br, N, "RuleBased (P0) vs Random (P1)")

    # Rule-based folds J/Q pre-flop, so random wins more *hands* by count,
    # but rule-based earns more *chips* overall (it wins larger pots when it
    # has a pair or a King). Correct check: positive average reward.
    assert avg_br[0] > 0, \
        f"Sanity check failed: rule-based avg reward should be > 0, got {avg_br[0]:.4f}"
    print("  [OK] Rule-based earns positive average reward vs random.")
    print(f"  Note: rule-based wins fewer hands ({wr_br[0]:.1%}) but earns more chips "
          f"(avg {avg_br[0]:+.4f}) — it folds small and wins big.")

    # --- Matchup 3: Random (P0) vs Rule-Based (P1) — symmetric check ---
    agents_rb = [RandomAgent(), rulebased_agent]
    avg_rb, wr_rb = evaluate(env, agents_rb, N, "Random (P0) vs RuleBased (P1)")

    assert avg_rb[1] > 0, \
        f"Sanity check failed: rule-based should earn > 0 as P1, got {avg_rb[1]:.4f}"
    print("  [OK] Rule-based earns positive average reward as Player 1 too.")

    print("\n" + "=" * 55)
    print("  Step 2 complete: all checks passed.")
    print("=" * 55)


if __name__ == '__main__':
    main()
