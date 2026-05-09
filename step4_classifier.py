import rlcard
import numpy as np
from collections import defaultdict

from agents import RandomAgent, TightAgent, AggressiveAgent
from classifier import OpponentStyleClassifier

SEED = 42
np.random.seed(SEED)


# -----------------------------------------------------------------------
# Helper: feed N opponent actions from scripted opponent into classifier
# -----------------------------------------------------------------------

def collect_actions(env, opponent, n_actions: int, observer_id: int = 0) -> list[int]:
    """
    Play episodes until we have observed n_actions from the opponent.
    Returns the list of raw opponent action IDs in order.
    """
    actions_seen = []
    state, player_id = env.reset()

    while len(actions_seen) < n_actions:
        if player_id != observer_id:
            # Opponent's turn — record before stepping
            action = opponent.act(state)
            actions_seen.append(action)
        else:
            action = RandomAgent().act(state)   # observer plays randomly

        state, player_id = env.step(action)

        if env.is_over():
            state, player_id = env.reset()

    return actions_seen[:n_actions]


# -----------------------------------------------------------------------
# Test 1: incremental classification at checkpoints
# -----------------------------------------------------------------------

def test_incremental_classification(env):
    print("=" * 60)
    print("TEST 1: Incremental classification at 20 / 50 / 100 / 200 actions")
    print("=" * 60)

    opponents = {
        "Random":     RandomAgent(),
        "Tight":      TightAgent(),
        "Aggressive": AggressiveAgent(),
    }
    checkpoints = [20, 50, 100, 200]

    results = {}   # opponent -> {checkpoint -> label}

    for name, opp in opponents.items():
        clf = OpponentStyleClassifier()
        actions = collect_actions(env, opp, n_actions=200)
        print(f"\n  Opponent: {name}")
        print(f"  {'Step':>6s}  {'f_raise':>8s}  {'f_fold':>8s}  {'f_bet':>8s}  label")
        print(f"  {'-'*6}  {'-'*8}  {'-'*8}  {'-'*8}  -----")

        results[name] = {}
        for i, action in enumerate(actions):
            clf.observe(action)
            step = i + 1
            if step in checkpoints:
                s = clf.stats()
                label = s['label']
                results[name][step] = label
                print(f"  {step:>6d}  {s['f_raise']:>8.3f}  {s['f_fold']:>8.3f}  "
                      f"{s['f_bet']:>8.3f}  {label}")

    return results


# -----------------------------------------------------------------------
# Test 2: reset correctness
# -----------------------------------------------------------------------

def test_reset(env):
    print("\n" + "=" * 60)
    print("TEST 2: Classifier reset between episodes")
    print("=" * 60)

    clf = OpponentStyleClassifier()
    aggressive = AggressiveAgent()

    # Fill window with aggressive actions
    actions_ep1 = collect_actions(env, aggressive, n_actions=30)
    for a in actions_ep1:
        clf.observe(a)

    label_before_reset = clf.classify()
    stats_before = clf.stats()
    print(f"\n  After 30 aggressive actions:")
    print(f"    label={label_before_reset}  f_raise={stats_before['f_raise']:.3f}  "
          f"n={stats_before['n']}")

    # Simulate episode boundary
    clf.reset()
    label_after_reset = clf.classify()
    stats_after = clf.stats()
    print(f"\n  After reset():")
    print(f"    label={label_after_reset}  n={stats_after['n']}")

    assert label_before_reset == "aggressive", \
        f"Expected 'aggressive' before reset, got '{label_before_reset}'"
    assert label_after_reset == "random", \
        f"Expected 'random' after reset (window empty), got '{label_after_reset}'"
    assert stats_after['n'] == 0, "Window should be empty after reset"
    print("  [OK] Reset clears history; default label is 'random'.")


# -----------------------------------------------------------------------
# Test 3: multi-episode stale-bleed check
# -----------------------------------------------------------------------

def test_no_bleed(env):
    print("\n" + "=" * 60)
    print("TEST 3: No stale data bleed across episodes")
    print("=" * 60)

    clf = OpponentStyleClassifier()
    tight = TightAgent()
    aggressive = AggressiveAgent()

    # Episode A: tight opponent fills window
    actions_a = collect_actions(env, tight, n_actions=30)
    for a in actions_a:
        clf.observe(a)
    label_a = clf.classify()
    print(f"\n  Episode A (tight):  label = {label_a}  "
          f"f_fold={clf.stats()['f_fold']:.3f}")

    # Episode boundary
    clf.reset()

    # Episode B: aggressive opponent, only 10 actions so far (< W=20)
    actions_b = collect_actions(env, aggressive, n_actions=10)
    for a in actions_b:
        clf.observe(a)
    label_b_partial = clf.classify()
    print(f"  Episode B (10 aggressive actions so far): label = {label_b_partial}  "
          f"(should be 'random' — window not yet full)")

    assert label_b_partial == "random", \
        f"Expected 'random' with partial window, got '{label_b_partial}'"
    print("  [OK] No bleed: tight data from episode A does not affect episode B.")


# -----------------------------------------------------------------------
# Test 4: classification accuracy over many episodes
# -----------------------------------------------------------------------

def test_accuracy(env, n_episodes: int = 500):
    print("\n" + "=" * 60)
    print(f"TEST 4: Classification accuracy over {n_episodes} episodes")
    print("=" * 60)

    opponents = {
        "Random":     (RandomAgent(),     "random"),
        "Tight":      (TightAgent(),      "tight"),
        "Aggressive": (AggressiveAgent(), "aggressive"),
    }

    for name, (opp, expected_label) in opponents.items():
        correct = 0
        label_counts = defaultdict(int)

        for _ in range(n_episodes):
            clf = OpponentStyleClassifier()
            # Observe exactly W=20 actions per episode
            actions = collect_actions(env, opp, n_actions=20)
            for a in actions:
                clf.observe(a)
            label = clf.classify()
            label_counts[label] += 1
            if label == expected_label:
                correct += 1

        acc = correct / n_episodes
        dist = {k: f"{v/n_episodes:.1%}" for k, v in sorted(label_counts.items())}
        print(f"\n  {name:<12s}  expected='{expected_label}'  "
              f"accuracy={acc:.1%}  distribution={dist}")

        if name != "Random":
            # Scripted archetypes should be reliably classified
            assert acc >= 0.70, \
                f"{name}: accuracy {acc:.1%} below 70% threshold"
            print(f"  [OK] {name} classified correctly >= 70% of the time.")
        else:
            print(f"  [~] Random: may be classified as any label (that's expected).")


# -----------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------

def main():
    env = rlcard.make('leduc-holdem')

    results = test_incremental_classification(env)
    test_reset(env)
    test_no_bleed(env)
    test_accuracy(env)

    # Final summary
    print("\n" + "=" * 60)
    print("SUMMARY — Classification at 200 observed actions")
    print("=" * 60)
    for opp, by_step in results.items():
        label_at_200 = by_step.get(200, "N/A")
        print(f"  {opp:<12s} -> {label_at_200}")

    print("\nStep 4 complete.")


if __name__ == '__main__':
    main()
