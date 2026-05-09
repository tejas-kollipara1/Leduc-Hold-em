import rlcard
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

from agents import RandomAgent, TightAgent, AggressiveAgent
from q_agent import QLearningAgent, run_eval_episode as std_eval
from oa_agent import OpponentAwareQLearningAgent, run_train_episode, run_eval_episode


# -----------------------------------------------------------------------
# Hyperparameters — identical to Step 3 for a fair comparison
# -----------------------------------------------------------------------
ALPHA         = 0.1
GAMMA         = 0.99
EPSILON_START = 1.0
EPSILON_MIN   = 0.05
EPSILON_DECAY = 0.9995

TRAIN_EPISODES = 50_000
BLOCK_SIZE     = 30          # episodes per opponent before switching
                             # W=20 needs ~7-10 episodes to fill (1-3 opp
                             # actions/ep); 30 leaves plenty of classified time
LOG_INTERVAL   = 1_000
EVAL_EPISODES  = 10_000

OPPONENT_POOL = {
    "random":     RandomAgent,
    "tight":      TightAgent,
    "aggressive": AggressiveAgent,
}
STYLE_NAMES = list(OPPONENT_POOL.keys())


# -----------------------------------------------------------------------
# Training  (block-based opponent scheduling)
# -----------------------------------------------------------------------

def train(env, agent: OpponentAwareQLearningAgent):
    """
    Train for TRAIN_EPISODES total.

    Opponents are scheduled in blocks of BLOCK_SIZE episodes so the
    classifier window (W=20) can fill before we switch to the next style.
    On each block boundary the classifier is reset — it saw a different
    opponent before this block, so stale observations would mislead it.

    Learning curves are tracked per opponent style.
    """
    bufs   = {k: [] for k in STYLE_NAMES}
    curves = {k: [] for k in STYLE_NAMES}

    ep_total   = 0
    block_idx  = 0

    print(f"Training OA-agent for {TRAIN_EPISODES:,} episodes "
          f"(blocks of {BLOCK_SIZE} eps per opponent, cycling {STYLE_NAMES})")
    print(f"  alpha={agent.alpha}  gamma={agent.gamma}  "
          f"eps {agent.epsilon} -> {agent.epsilon_min}  decay={agent.epsilon_decay}")
    print()

    while ep_total < TRAIN_EPISODES:
        opp_name = STYLE_NAMES[block_idx % len(STYLE_NAMES)]
        opponent = OPPONENT_POOL[opp_name]()

        # Reset classifier at block start — new opponent type
        agent.reset_classifier()

        for _ in range(BLOCK_SIZE):
            if ep_total >= TRAIN_EPISODES:
                break
            reward = run_train_episode(env, agent, opponent, learner_id=0)
            bufs[opp_name].append(reward)
            ep_total += 1

            if ep_total % LOG_INTERVAL == 0:
                for name in STYLE_NAMES:
                    avg = np.mean(bufs[name]) if bufs[name] else 0.0
                    curves[name].append((ep_total, avg))
                if ep_total % 10_000 == 0:
                    print(f"  ep {ep_total:>6,}  eps={agent.epsilon:.4f}  "
                          f"Q-entries={len(agent.q_table):,}")
                    for name in STYLE_NAMES:
                        avg = np.mean(bufs[name]) if bufs[name] else 0.0
                        print(f"    vs {name:<12s}: {avg:+.3f}")
                bufs = {k: [] for k in STYLE_NAMES}

        block_idx += 1

    print()
    return curves


# -----------------------------------------------------------------------
# Evaluation helpers
# -----------------------------------------------------------------------

def evaluate_oa(env, agent: OpponentAwareQLearningAgent,
                n_eps: int = EVAL_EPISODES) -> dict:
    """
    Evaluate OA agent against each opponent type.
    For each type: reset classifier once, then run n_eps episodes so the
    classifier accumulates evidence and converges to the correct style label.
    """
    results = {}
    for name, OppClass in OPPONENT_POOL.items():
        agent.reset_classifier()        # fresh slate for this opponent session
        opponent = OppClass()
        rewards = [run_eval_episode(env, agent, opponent, learner_id=0)
                   for _ in range(n_eps)]
        results[name] = float(np.mean(rewards))
    results["overall"] = float(np.mean([results[k] for k in STYLE_NAMES]))
    return results


def evaluate_std(env, agent: QLearningAgent,
                 n_eps: int = EVAL_EPISODES) -> dict:
    results = {}
    for name, OppClass in OPPONENT_POOL.items():
        rewards = [std_eval(env, agent, OppClass(), learner_id=0)
                   for _ in range(n_eps)]
        results[name] = float(np.mean(rewards))
    results["overall"] = float(np.mean([results[k] for k in STYLE_NAMES]))
    return results


# -----------------------------------------------------------------------
# Plotting
# -----------------------------------------------------------------------

STYLE_COLORS = {"random": "steelblue", "tight": "darkorange", "aggressive": "crimson"}


def plot_curves(curves: dict, path: str = "oa_learning_curves.png"):
    fig, ax = plt.subplots(figsize=(10, 4))
    for style, data in curves.items():
        if not data:
            continue
        eps, avgs = zip(*data)
        ax.plot(eps, avgs, linewidth=1.2, alpha=0.5,
                color=STYLE_COLORS.get(style, "grey"))
        if len(avgs) >= 5:
            kernel = np.ones(5) / 5
            sm     = np.convolve(avgs, kernel, mode='valid')
            ep_sm  = eps[2: 2 + len(sm)]
            ax.plot(ep_sm, sm, linewidth=2.2,
                    color=STYLE_COLORS.get(style, "grey"), label=f"vs {style}")

    ax.axhline(0, color='grey', linestyle='--', linewidth=0.8)
    ax.set_xlabel("Training episode")
    ax.set_ylabel("Avg reward (per 1k eps)")
    ax.set_title("Opponent-Aware Q-Learning — Per-Style Learning Curves")
    ax.legend()
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(path, dpi=150)
    plt.close()
    print(f"  Per-style learning curves saved to: {path}")


def plot_comparison(oa: dict, std: dict, path: str = "comparison.png"):
    labels  = ["random", "tight", "aggressive", "overall"]
    x       = np.arange(len(labels))
    w       = 0.35

    fig, ax = plt.subplots(figsize=(8, 4))
    ax.bar(x - w/2, [std[k] for k in labels], w,
           label="Standard Q",      color="steelblue",  alpha=0.85)
    ax.bar(x + w/2, [oa[k]  for k in labels], w,
           label="Opponent-Aware Q", color="darkorange", alpha=0.85)
    ax.axhline(0, color='grey', linestyle='--', linewidth=0.8)
    ax.set_xticks(x)
    ax.set_xticklabels(labels)
    ax.set_ylabel("Avg reward (10k eps)")
    ax.set_title("Standard Q vs Opponent-Aware Q — Evaluation Comparison")
    ax.legend()
    ax.grid(True, axis='y', alpha=0.3)
    plt.tight_layout()
    plt.savefig(path, dpi=150)
    plt.close()
    print(f"  Comparison chart saved to: {path}")


# -----------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------

def main():
    env = rlcard.make('leduc-holdem')

    # --- Train OA agent ---
    oa_agent = OpponentAwareQLearningAgent(
        num_actions   = env.num_actions,
        alpha         = ALPHA,
        gamma         = GAMMA,
        epsilon       = EPSILON_START,
        epsilon_min   = EPSILON_MIN,
        epsilon_decay = EPSILON_DECAY,
    )
    curves = train(env, oa_agent)
    oa_agent.save("oa_q_table.pkl")
    print(f"OA Q-table saved: {len(oa_agent.q_table):,} entries.")
    print()

    # --- Load standard Q-agent from Step 3 ---
    std_agent = QLearningAgent(num_actions=env.num_actions)
    std_agent.load("q_table.pkl")
    std_agent.epsilon = 0.0

    # --- Evaluate both ---
    print(f"Evaluating both agents ({EVAL_EPISODES:,} eps per opponent, epsilon=0)...")
    oa_results  = evaluate_oa(env, oa_agent)
    std_results = evaluate_std(env, std_agent)

    # --- Comparison table ---
    print()
    print(f"  {'Opponent':<14s}  {'Standard Q':>12s}  {'OA Q':>12s}  {'Delta':>10s}")
    print(f"  {'-'*14}  {'-'*12}  {'-'*12}  {'-'*10}")
    for key in ["random", "tight", "aggressive", "overall"]:
        s     = std_results[key]
        oa    = oa_results[key]
        delta = oa - s
        flag  = " <-- gain" if delta > 0.05 else (" <-- loss" if delta < -0.05 else "")
        print(f"  {key:<14s}  {s:>+12.4f}  {oa:>+12.4f}  {delta:>+10.4f}{flag}")

    # --- Assertions ---
    print()
    # OA should outperform standard on the two exploitable opponents
    for opp in ("tight", "aggressive"):
        assert oa_results[opp] > std_results[opp] - 0.05, (
            f"OA agent should be competitive vs {opp}: "
            f"OA={oa_results[opp]:+.4f}, Std={std_results[opp]:+.4f}"
        )
    print("  [OK] OA agent competitive vs tight and aggressive opponents.")

    assert oa_results["overall"] > 0, \
        f"OA agent overall avg should be positive, got {oa_results['overall']:+.4f}"
    print("  [OK] OA agent earns positive average reward overall.")

    assert len(oa_agent.q_table) > len(std_agent.q_table), (
        f"OA Q-table ({len(oa_agent.q_table)}) should be larger than "
        f"standard ({len(std_agent.q_table)}) — style labels differentiate states"
    )
    print(f"  [OK] OA Q-table ({len(oa_agent.q_table):,} entries) > "
          f"Standard ({len(std_agent.q_table):,} entries).")

    # --- Plots ---
    print()
    plot_curves(curves)
    plot_comparison(oa_results, std_results)

    print()
    print("Step 5 complete.")


if __name__ == '__main__':
    main()
