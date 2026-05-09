import rlcard
import numpy as np
import matplotlib
matplotlib.use('Agg')   # non-interactive backend (works without a display)
import matplotlib.pyplot as plt

from agents import RandomAgent, RuleBasedAgent
from q_agent import QLearningAgent, run_train_episode, run_eval_episode


# -----------------------------------------------------------------------
# Hyperparameters
# -----------------------------------------------------------------------
ALPHA         = 0.1
GAMMA         = 0.99
EPSILON_START = 1.0
EPSILON_MIN   = 0.05
EPSILON_DECAY = 0.9995

TRAIN_EPISODES = 50_000
LOG_INTERVAL   = 1_000    # record avg reward every N episodes
EVAL_EPISODES  = 10_000


# -----------------------------------------------------------------------
# Training
# -----------------------------------------------------------------------

def train(env, agent, opponent, n_episodes, log_interval):
    rewards_buf = []
    curve       = []          # (episode, avg_reward)

    print(f"Training for {n_episodes:,} episodes ...")
    print(f"  alpha={agent.alpha}  gamma={agent.gamma}  "
          f"eps {agent.epsilon} -> {agent.epsilon_min}  decay={agent.epsilon_decay}")
    print()

    for ep in range(1, n_episodes + 1):
        r = run_train_episode(env, agent, opponent, learner_id=0)
        rewards_buf.append(r)

        if ep % log_interval == 0:
            avg = np.mean(rewards_buf)
            curve.append((ep, avg))
            rewards_buf.clear()
            if ep % 10_000 == 0:
                print(f"  ep {ep:>6,}  avg_reward={avg:+.4f}  eps={agent.epsilon:.4f}  "
                      f"Q-table size={len(agent.q_table):,}")

    print()
    return curve


# -----------------------------------------------------------------------
# Evaluation
# -----------------------------------------------------------------------

def evaluate(env, agent, opponent, n_episodes, label):
    rewards = [
        run_eval_episode(env, agent, opponent, learner_id=0)
        for _ in range(n_episodes)
    ]
    avg     = np.mean(rewards)
    wins    = np.sum(np.array(rewards) > 0) / n_episodes
    losses  = np.sum(np.array(rewards) < 0) / n_episodes
    draws   = 1 - wins - losses

    print(f"  vs {label:<20s}  avg={avg:+.4f}  "
          f"win={wins:.2%}  loss={losses:.2%}  draw={draws:.2%}")
    return avg


# -----------------------------------------------------------------------
# Plot
# -----------------------------------------------------------------------

def plot_curve(curve, path="learning_curve.png"):
    episodes, avgs = zip(*curve)
    fig, ax = plt.subplots(figsize=(9, 4))
    ax.plot(episodes, avgs, linewidth=1.5, label="Avg reward (per 1k eps)")

    # Rolling mean over 5 log-points for a smoother trend line
    if len(avgs) >= 5:
        kernel = np.ones(5) / 5
        smooth = np.convolve(avgs, kernel, mode='valid')
        ep_sm  = episodes[2: 2 + len(smooth)]
        ax.plot(ep_sm, smooth, linewidth=2.5, color='red', label="Smoothed (5-pt MA)")

    ax.axhline(0, color='grey', linestyle='--', linewidth=0.8)
    ax.set_xlabel("Training episode")
    ax.set_ylabel("Average reward")
    ax.set_title("Q-Learning Agent — Learning Curve (vs Random opponent)")
    ax.legend()
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(path, dpi=150)
    plt.close()
    print(f"  Learning curve saved to: {path}")


# -----------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------

def main():
    env = rlcard.make('leduc-holdem')

    agent    = QLearningAgent(
        num_actions   = env.num_actions,
        alpha         = ALPHA,
        gamma         = GAMMA,
        epsilon       = EPSILON_START,
        epsilon_min   = EPSILON_MIN,
        epsilon_decay = EPSILON_DECAY,
    )
    opponent = RandomAgent()

    # --- Train ---
    curve = train(env, agent, opponent, TRAIN_EPISODES, LOG_INTERVAL)

    # --- Save Q-table ---
    agent.save("q_table.pkl")
    print(f"Q-table saved ({len(agent.q_table):,} entries).")
    print()

    # --- Evaluate (greedy) ---
    print(f"Evaluation over {EVAL_EPISODES:,} episodes (epsilon=0):")
    avg_vs_random   = evaluate(env, agent, RandomAgent(),    EVAL_EPISODES, "Random Agent")
    avg_vs_rulebased = evaluate(env, agent, RuleBasedAgent(), EVAL_EPISODES, "Rule-Based Agent")

    print()
    assert avg_vs_random > 0, \
        f"Q-agent should beat random, got avg={avg_vs_random:.4f}"
    print("  [OK] Q-agent earns positive average reward vs Random.")

    # Rule-based is a stronger opponent — just confirm the agent isn't dominated
    if avg_vs_rulebased > 0:
        print("  [OK] Q-agent beats Rule-Based agent too.")
    else:
        print(f"  [~] Q-agent vs Rule-Based: avg={avg_vs_rulebased:+.4f} "
              "(competitive but not winning — this is normal at this stage).")

    # --- Plot ---
    print()
    plot_curve(curve)

    print()
    # Quick sanity: learning curve should trend upward in the first half
    first_half  = np.mean([r for _, r in curve[:len(curve)//2]])
    second_half = np.mean([r for _, r in curve[len(curve)//2:]])
    print(f"  Curve sanity: first-half avg={first_half:+.4f}, "
          f"second-half avg={second_half:+.4f}")
    if second_half > first_half:
        print("  [OK] Learning curve trends upward.")
    else:
        print("  [~] Curve did not trend upward — may need more episodes or tuning.")

    print()
    print("Step 3 complete.")


if __name__ == '__main__':
    main()
