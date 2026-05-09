"""
Step 6: Full Experiments, Plots, and Warmup Analysis
Self-contained — retrains both agents, evaluates all baselines, runs warmup
characterization, and saves all figures to disk.
"""

import rlcard
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import json
from collections import defaultdict

from agents import RandomAgent, RuleBasedAgent, TightAgent, AggressiveAgent
from q_agent  import QLearningAgent,            run_train_episode as std_train_ep
from oa_agent import OpponentAwareQLearningAgent, run_train_episode as oa_train_ep

# -----------------------------------------------------------------------
# Shared hyperparameters
# -----------------------------------------------------------------------
ALPHA         = 0.1
GAMMA         = 0.99
EPSILON_START = 1.0
EPSILON_MIN   = 0.05
EPSILON_DECAY = 0.9995

N_TRAIN          = 50_000
BLOCK_SIZE       = 30
LOG_INTERVAL     = 1_000
N_EVAL           = 10_000
N_WARMUP_BLOCKS  = 300    # × 30 eps = 9 k eps per opp type

OPPONENTS = {
    "random":     (RandomAgent,     "random"),
    "tight":      (TightAgent,      "tight"),
    "aggressive": (AggressiveAgent, "aggressive"),
}
OPP_NAMES   = list(OPPONENTS.keys())
STYLE_COLORS = {"random": "steelblue", "tight": "darkorange", "aggressive": "crimson"}

# -----------------------------------------------------------------------
# Generic evaluator
# -----------------------------------------------------------------------

def eval_agent(env, agent, opp_cls, n_eps,
               is_oa=False, is_cfr=False, learner_id=0):
    """
    Evaluate *agent* against *opp_cls* for *n_eps* greedy episodes.
    Handles standard agents, OA agents, and CFR agents uniformly.
    For OA: resets classifier once at session start, resets episode state each ep.
    """
    if is_oa:
        agent.reset_classifier()
        saved_eps     = agent.epsilon
        agent.epsilon = 0.0
    elif hasattr(agent, 'epsilon'):
        saved_eps     = agent.epsilon
        agent.epsilon = 0.0

    rewards = []
    opponent = opp_cls()

    for ep_idx in range(n_eps):
        if is_oa:
            agent.reset()          # episode metadata only, NOT classifier
        if ep_idx % 2000 == 0 and ep_idx > 0:
            opponent = opp_cls()   # fresh instance occasionally (stateless anyway)

        state, pid = env.reset()
        while not env.is_over():
            if pid == learner_id:
                if is_cfr:
                    action, _ = agent.eval_step(state)
                else:
                    action = agent.act(state)
            else:
                action = opponent.act(state)
                if is_oa:
                    agent.observe_opponent(action)
            state, pid = env.step(action)
        rewards.append(env.get_payoffs()[learner_id])

    if is_oa:
        agent.epsilon = saved_eps
    elif hasattr(agent, 'epsilon'):
        agent.epsilon = saved_eps

    return float(np.mean(rewards))


# -----------------------------------------------------------------------
# 1. Train Standard Q-learning agent
# -----------------------------------------------------------------------

def train_standard_q(env):
    print("=" * 58)
    print("Training Standard Q-learning agent (vs Random, 50k eps)")
    print("=" * 58)

    agent = QLearningAgent(
        num_actions=env.num_actions, alpha=ALPHA, gamma=GAMMA,
        epsilon=EPSILON_START, epsilon_min=EPSILON_MIN,
        epsilon_decay=EPSILON_DECAY,
    )
    opponent = RandomAgent()
    curve, buf = [], []

    for ep in range(1, N_TRAIN + 1):
        r = std_train_ep(env, agent, opponent, learner_id=0)
        buf.append(r)
        if ep % LOG_INTERVAL == 0:
            avg = float(np.mean(buf))
            curve.append((ep, avg))
            buf.clear()
            if ep % 10_000 == 0:
                print(f"  ep {ep:>6,}  avg={avg:+.4f}  eps={agent.epsilon:.4f}"
                      f"  Q={len(agent.q_table)}")

    agent.epsilon = 0.0
    print()
    return agent, curve


# -----------------------------------------------------------------------
# 2. Train Opponent-Aware Q-learning agent
# -----------------------------------------------------------------------

def train_oa_agent(env):
    print("=" * 58)
    print(f"Training OA Q-learning agent (block={BLOCK_SIZE}, 50k eps)")
    print("=" * 58)

    agent = OpponentAwareQLearningAgent(
        num_actions=env.num_actions, alpha=ALPHA, gamma=GAMMA,
        epsilon=EPSILON_START, epsilon_min=EPSILON_MIN,
        epsilon_decay=EPSILON_DECAY,
    )
    curves = {k: [] for k in OPP_NAMES}
    bufs   = {k: [] for k in OPP_NAMES}
    ep_total, block_idx = 0, 0

    while ep_total < N_TRAIN:
        opp_name           = OPP_NAMES[block_idx % len(OPP_NAMES)]
        OppClass, _        = OPPONENTS[opp_name]
        opponent           = OppClass()
        agent.reset_classifier()

        for _ in range(BLOCK_SIZE):
            if ep_total >= N_TRAIN:
                break
            r = oa_train_ep(env, agent, opponent, learner_id=0)
            bufs[opp_name].append(r)
            ep_total += 1

            if ep_total % LOG_INTERVAL == 0:
                for name in OPP_NAMES:
                    avg = float(np.mean(bufs[name])) if bufs[name] else 0.0
                    curves[name].append((ep_total, avg))
                if ep_total % 10_000 == 0:
                    print(f"  ep {ep_total:>6,}  eps={agent.epsilon:.4f}"
                          f"  Q={len(agent.q_table)}")
                    for n in OPP_NAMES:
                        avg = float(np.mean(bufs[n])) if bufs[n] else 0.0
                        print(f"    vs {n:<12s}: {avg:+.3f}")
                bufs = {k: [] for k in OPP_NAMES}
        block_idx += 1

    agent.epsilon = 0.0
    print()
    return agent, curves


# -----------------------------------------------------------------------
# 3. CFR baseline (optional)
# -----------------------------------------------------------------------

def setup_cfr(env, n_iters=30_000):
    try:
        from rlcard.agents import CFRAgent
        print(f"Training CFR agent ({n_iters:,} iterations)...")
        cfr = CFRAgent(env, model_path='./cfr_model/')
        for i in range(n_iters):
            cfr.train()
        print(f"  CFR training done.  Policy size: {len(cfr.policy)}\n")
        return cfr
    except Exception as exc:
        print(f"  CFR not available ({exc.__class__.__name__}: {exc}). Skipping.\n")
        return None


def eval_cfr(env, cfr_agent, opp_cls, n_eps, learner_id=0):
    rewards = []
    for _ in range(n_eps):
        state, pid = env.reset()
        while not env.is_over():
            if pid == learner_id:
                action, _ = cfr_agent.eval_step(state)
            else:
                action = opp_cls().act(state)
            state, pid = env.step(action)
        rewards.append(env.get_payoffs()[learner_id])
    return float(np.mean(rewards))


# -----------------------------------------------------------------------
# 4. Warmup analysis
# -----------------------------------------------------------------------

def warmup_analysis(env, oa_agent, n_blocks=N_WARMUP_BLOCKS, block_size=BLOCK_SIZE):
    """
    For tight and aggressive opponents, run n_blocks evaluation blocks.
    At each episode position within the block record:
      - reward
      - whether classifier label == true style (accuracy)
    Returns dict: opp_name -> {'rewards': [...], 'accuracy': [...]}  (len=block_size)
    """
    print(f"Warmup analysis: {n_blocks} blocks × {block_size} eps per opponent ...")
    results = {}
    saved_eps     = oa_agent.epsilon
    oa_agent.epsilon = 0.0

    for opp_name in ("tight", "aggressive"):
        OppClass, true_style = OPPONENTS[opp_name]
        pos_rewards  = defaultdict(list)
        pos_correct  = defaultdict(list)

        for _ in range(n_blocks):
            oa_agent.reset_classifier()
            opponent = OppClass()

            for pos in range(1, block_size + 1):
                oa_agent.reset()               # episode metadata only
                state, pid = env.reset()

                while not env.is_over():
                    if pid == 0:
                        action = oa_agent.act(state)
                    else:
                        action = opponent.act(state)
                        oa_agent.observe_opponent(action)
                    state, pid = env.step(action)

                reward = env.get_payoffs()[0]
                label  = oa_agent.classifier.classify()

                pos_rewards[pos].append(reward)
                pos_correct[pos].append(1 if label == true_style else 0)

        results[opp_name] = {
            "rewards":  [float(np.mean(pos_rewards[p]))  for p in range(1, block_size+1)],
            "accuracy": [float(np.mean(pos_correct[p]))  for p in range(1, block_size+1)],
        }
        print(f"  {opp_name}: done.  "
              f"ep-1 acc={results[opp_name]['accuracy'][0]:.2%}  "
              f"ep-{block_size} acc={results[opp_name]['accuracy'][-1]:.2%}")

    oa_agent.epsilon = saved_eps
    print()
    return results


# -----------------------------------------------------------------------
# Plotting
# -----------------------------------------------------------------------

def smooth(vals, w=5):
    k = np.ones(w) / w
    return np.convolve(vals, k, mode='valid')


def plot1_learning_curves(std_curve, oa_curves, path="plot1_learning_curves.png"):
    """Two-panel: (a) std vs OA overall, (b) OA per style."""
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 4), sharey=False)

    # Panel a — Standard Q vs OA overall
    eps_s, avgs_s = zip(*std_curve)
    ax1.plot(eps_s, avgs_s, color="steelblue", linewidth=1.2, alpha=0.5)
    ax1.plot(eps_s[2:2+len(smooth(avgs_s))], smooth(avgs_s),
             color="steelblue", linewidth=2.3, label="Standard Q (vs Random)")

    # OA overall = mean across three style curves at each point
    all_oa = {}
    for name, data in oa_curves.items():
        for ep, val in data:
            all_oa.setdefault(ep, []).append(val)
    oa_eps  = sorted(all_oa)
    oa_avg  = [np.mean(all_oa[e]) for e in oa_eps]
    ax1.plot(oa_eps, oa_avg, color="darkorange", linewidth=1.2, alpha=0.5)
    ax1.plot(oa_eps[2:2+len(smooth(oa_avg))], smooth(oa_avg),
             color="darkorange", linewidth=2.3, label="OA Q (mixed opponents)")

    ax1.axhline(0, color='grey', linestyle='--', linewidth=0.8)
    ax1.set_xlabel("Training episode"); ax1.set_ylabel("Avg reward (per 1k eps)")
    ax1.set_title("(a) Standard Q vs OA Q — Overall Learning")
    ax1.legend(); ax1.grid(True, alpha=0.3)

    # Panel b — OA per style
    for name, data in oa_curves.items():
        if not data: continue
        eps, avgs = zip(*data)
        col = STYLE_COLORS[name]
        ax2.plot(eps, avgs, color=col, linewidth=1.2, alpha=0.4)
        ax2.plot(eps[2:2+len(smooth(avgs))], smooth(avgs),
                 color=col, linewidth=2.3, label=f"vs {name}")

    ax2.axhline(0, color='grey', linestyle='--', linewidth=0.8)
    ax2.set_xlabel("Training episode"); ax2.set_ylabel("Avg reward (per 1k eps)")
    ax2.set_title("(b) OA Q — Per-Style Learning Curves")
    ax2.legend(); ax2.grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig(path, dpi=150); plt.close()
    print(f"  Saved: {path}")


def plot2_bar_chart(all_results, path="plot2_head_to_head.png"):
    """Grouped bar chart: opponent on x-axis, one bar per agent."""
    agents_in_order = [k for k in
                       ["Random", "Rule-Based", "Standard Q", "OA Q", "CFR"]
                       if k in all_results]
    opp_labels = ["random", "tight", "aggressive", "overall"]
    n_agents   = len(agents_in_order)
    n_groups   = len(opp_labels)
    x          = np.arange(n_groups)
    total_w    = 0.75
    w          = total_w / n_agents
    colors     = ["#9ecae1", "#a1d99b", "#4292c6", "#e6550d", "#756bb1"]

    fig, ax = plt.subplots(figsize=(10, 5))
    for i, aname in enumerate(agents_in_order):
        vals = [all_results[aname].get(k, 0.0) for k in opp_labels]
        offset = (i - n_agents/2 + 0.5) * w
        ax.bar(x + offset, vals, w,
               label=aname, color=colors[i % len(colors)], alpha=0.88,
               edgecolor='white', linewidth=0.5)

    ax.axhline(0, color='grey', linestyle='--', linewidth=0.8)
    ax.set_xticks(x); ax.set_xticklabels(opp_labels)
    ax.set_ylabel("Average reward (10k eps)")
    ax.set_title("Head-to-Head Comparison — All Agents vs All Opponents")
    ax.legend(loc='upper right', fontsize=9)
    ax.grid(True, axis='y', alpha=0.3)
    plt.tight_layout()
    plt.savefig(path, dpi=150); plt.close()
    print(f"  Saved: {path}")


def plot3_warmup_and_accuracy(warmup_data, block_size=BLOCK_SIZE,
                               path="plot3_warmup.png"):
    """
    Two rows × two columns:
      row 0 = tight,  row 1 = aggressive
      col 0 = reward, col 1 = classification accuracy
    """
    opp_names = [n for n in ("tight", "aggressive") if n in warmup_data]
    fig, axes = plt.subplots(len(opp_names), 2,
                             figsize=(12, 4 * len(opp_names)), squeeze=False)
    positions = list(range(1, block_size + 1))

    for row, opp in enumerate(opp_names):
        data = warmup_data[opp]
        rewards  = data["rewards"]
        accuracy = data["accuracy"]
        col = STYLE_COLORS[opp]

        # --- reward plot ---
        ax = axes[row][0]
        ax.plot(positions, rewards, color=col, linewidth=1.3, alpha=0.55)
        if len(rewards) >= 5:
            sm = smooth(rewards)
            ax.plot(positions[2:2+len(sm)], sm, color=col, linewidth=2.5)
        ax.axhline(0, color='grey', linestyle='--', linewidth=0.8)
        ax.set_xlabel("Episode within block"); ax.set_ylabel("Avg reward")
        ax.set_title(f"Warmup reward — vs {opp}")
        ax.grid(True, alpha=0.3)
        # mark W=20 classifier window full point
        ax.axvline(x=10, color='black', linestyle=':', linewidth=1.2,
                   label="~W=20 fills (~ep 10)")
        ax.legend(fontsize=8)

        # --- accuracy plot ---
        ax = axes[row][1]
        ax.plot(positions, accuracy, color=col, linewidth=1.3, alpha=0.55)
        if len(accuracy) >= 5:
            sm = smooth(accuracy)
            ax.plot(positions[2:2+len(sm)], sm, color=col, linewidth=2.5)
        ax.set_ylim(-0.05, 1.05)
        ax.set_xlabel("Episode within block"); ax.set_ylabel("Classification accuracy")
        ax.set_title(f"Classifier accuracy — vs {opp}")
        ax.axhline(1.0, color='grey', linestyle=':', linewidth=0.8)
        ax.axvline(x=10, color='black', linestyle=':', linewidth=1.2,
                   label="~W=20 fills (~ep 10)")
        ax.legend(fontsize=8)
        ax.grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig(path, dpi=150); plt.close()
    print(f"  Saved: {path}")


# -----------------------------------------------------------------------
# Summary table
# -----------------------------------------------------------------------

def print_summary_table(all_results):
    agents = [k for k in
              ["Random", "Rule-Based", "Standard Q", "OA Q", "CFR"]
              if k in all_results]
    cols   = ["random", "tight", "aggressive", "overall"]

    header = f"  {'Agent':<16s}" + "".join(f"  {'vs '+c:>14s}" for c in cols)
    print("\n" + "=" * len(header))
    print("  FINAL RESULTS TABLE")
    print("=" * len(header))
    print(header)
    print("  " + "-" * (len(header) - 2))
    for aname in agents:
        row = f"  {aname:<16s}"
        for c in cols:
            v = all_results[aname].get(c, float('nan'))
            row += f"  {v:>+14.4f}"
        print(row)
    print("=" * len(header))


# -----------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------

def main():
    env = rlcard.make('leduc-holdem')
    np.random.seed(42)

    # ── Train ──────────────────────────────────────────────────────────
    std_agent, std_curve = train_standard_q(env)
    oa_agent,  oa_curves = train_oa_agent(env)

    std_agent.save("q_table.pkl")
    oa_agent.save("oa_q_table.pkl")

    cfr_agent = setup_cfr(env, n_iters=30_000)

    # ── Evaluate all agents vs all opponents ───────────────────────────
    print(f"Evaluating all agents ({N_EVAL:,} eps each) ...")
    all_results = {}

    # Simple agents (no Q-table or special state)
    for aname, agent_cls in [("Random", RandomAgent), ("Rule-Based", RuleBasedAgent)]:
        all_results[aname] = {}
        for opp_name, (OppClass, _) in OPPONENTS.items():
            all_results[aname][opp_name] = eval_agent(
                env, agent_cls(), OppClass, N_EVAL)
        all_results[aname]["overall"] = float(
            np.mean([all_results[aname][k] for k in OPP_NAMES]))
        print(f"  {aname} done.")

    # Standard Q
    all_results["Standard Q"] = {}
    for opp_name, (OppClass, _) in OPPONENTS.items():
        all_results["Standard Q"][opp_name] = eval_agent(
            env, std_agent, OppClass, N_EVAL)
    all_results["Standard Q"]["overall"] = float(
        np.mean([all_results["Standard Q"][k] for k in OPP_NAMES]))
    print("  Standard Q done.")

    # OA Q
    all_results["OA Q"] = {}
    for opp_name, (OppClass, _) in OPPONENTS.items():
        all_results["OA Q"][opp_name] = eval_agent(
            env, oa_agent, OppClass, N_EVAL, is_oa=True)
    all_results["OA Q"]["overall"] = float(
        np.mean([all_results["OA Q"][k] for k in OPP_NAMES]))
    print("  OA Q done.")

    # CFR (optional)
    if cfr_agent is not None:
        all_results["CFR"] = {}
        for opp_name, (OppClass, _) in OPPONENTS.items():
            all_results["CFR"][opp_name] = eval_cfr(
                env, cfr_agent, OppClass, N_EVAL)
        all_results["CFR"]["overall"] = float(
            np.mean([all_results["CFR"][k] for k in OPP_NAMES]))
        print("  CFR done.")

    print()

    # ── Warmup analysis ────────────────────────────────────────────────
    warmup_data = warmup_analysis(env, oa_agent)

    # ── Save raw numbers ───────────────────────────────────────────────
    with open("results.json", "w") as f:
        json.dump({"all_results": all_results,
                   "warmup": warmup_data}, f, indent=2)
    print("  Raw results saved to: results.json")

    with open("curves.json", "w") as f:
        json.dump({"std_curve": std_curve, "oa_curves": oa_curves}, f, indent=2)
    print("  Learning curves saved to: curves.json\n")

    # ── Plots ──────────────────────────────────────────────────────────
    print("Generating plots ...")
    plot1_learning_curves(std_curve, oa_curves)
    plot2_bar_chart(all_results)
    plot3_warmup_and_accuracy(warmup_data)

    # ── Summary table ──────────────────────────────────────────────────
    print_summary_table(all_results)

    # ── Key findings ───────────────────────────────────────────────────
    print()
    print("KEY FINDINGS")
    print("-" * 45)
    oa = all_results["OA Q"]
    sq = all_results["Standard Q"]

    delta_agg   = oa["aggressive"] - sq["aggressive"]
    delta_tight = oa["tight"]      - sq["tight"]
    delta_rand  = oa["random"]     - sq["random"]

    print(f"  vs Aggressive: OA gains {delta_agg:+.4f} over Standard Q")
    print(f"  vs Tight:      OA gains {delta_tight:+.4f} over Standard Q")
    print(f"  vs Random:     OA gains {delta_rand:+.4f} over Standard Q")

    w0    = warmup_data["aggressive"]["accuracy"][0]
    w_end = warmup_data["aggressive"]["accuracy"][-1]
    print(f"\n  Warmup (vs aggressive):")
    print(f"    Classifier accuracy ep-1:  {w0:.1%}")
    print(f"    Classifier accuracy ep-30: {w_end:.1%}")

    print()
    print("Step 6 complete.")


if __name__ == "__main__":
    main()
