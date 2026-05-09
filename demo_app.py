"""
Demo web server for the Opponent-Aware Q-Learning poker agent.

Run:
    .\\venv\\Scripts\\Activate.ps1
    python demo_app.py
Then open http://localhost:5000 in your browser.
"""

from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
import pickle
from collections import defaultdict
import numpy as np
import rlcard
import sys
import os

# Make sure our project modules are importable regardless of CWD
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from agents import RandomAgent, TightAgent, AggressiveAgent, FOLD, CALL, RAISE, CHECK
from oa_agent import OpponentAwareQLearningAgent
from q_agent import QLearningAgent

app = Flask(__name__)
CORS(app)

# ── Global demo session (single-user demo, not thread-safe) ───────────────
_session: dict = {
    'env':           None,
    'agent':         None,
    'opponent':      None,
    'opponent_type': 'random',
    'agent_type':    'oa',
    'stats': {'hands': 0, 'total_reward': 0.0, 'rewards': []},
}

ACTION_NAMES = {CALL: 'CALL', RAISE: 'RAISE', FOLD: 'FOLD', CHECK: 'CHECK'}
RANK_NAMES   = ['J', 'Q', 'K']

# Suit character → Unicode symbol
SUIT_SYM = {'S': '♠', 'H': '♥', 'D': '♦', 'C': '♣'}
RED_SUITS = {'H', 'D'}


# ── Card helpers ──────────────────────────────────────────────────────────

def _parse_card(card) -> dict:
    """
    Convert an RLCard Card object to a serialisable dict.
    In RLCard Leduc, card.hand is a single Card with .rank and .suit.
    """
    try:
        rank      = card.rank                      # 'J', 'Q', 'K'
        suit_char = str(card.suit).upper()         # 'S', 'H', 'D', 'C'
        return {
            'rank':  rank,
            'suit':  SUIT_SYM.get(suit_char, suit_char),
            'color': 'red' if suit_char in RED_SUITS else 'black',
        }
    except Exception:
        return {'rank': '?', 'suit': '♠', 'color': 'black'}


def _game_cards(env) -> dict:
    """
    Extract current card state from the RLCard game object.
    Returns agent's private card and the community card (None pre-flop).
    """
    try:
        agent_card = _parse_card(env.game.players[0].hand)
        pub        = env.game.public_card
        pub_card   = _parse_card(pub) if pub else None
    except Exception:
        agent_card = {'rank': '?', 'suit': '♠', 'color': 'black'}
        pub_card   = None
    return {'agent': agent_card, 'public': pub_card}


def _opp_card(env) -> dict:
    """Get opponent's card for the showdown reveal."""
    try:
        return _parse_card(env.game.players[1].hand)
    except Exception:
        return {'rank': '?', 'suit': '♥', 'color': 'red'}


# ── Classifier stats ───────────────────────────────────────────────────────

def _clf_info(agent) -> dict:
    """Return classifier stats dict for the frontend meters."""
    if not hasattr(agent, 'classifier'):
        return {'label': 'N/A', 'f_raise': 0.0, 'f_fold': 0.0,
                'f_bet': 0.0, 'n': 0, 'window_pct': 0.0}
    s = agent.classifier.stats()          # {n, f_raise, f_fold, f_bet, label}
    return {**s, 'window_pct': min(1.0, s['n'] / 20)}


# ── Q-value introspection ──────────────────────────────────────────────────

def _q_values(agent, state: dict, style: str) -> dict:
    """
    Return Q-values for every legal action in the current state.
    This lets the frontend show the agent's decision rationale.
    """
    legal = list(state['legal_actions'].keys())
    obs   = state['obs']
    if hasattr(agent, '_aug_key'):
        # OA agent: augmented key includes opponent style
        base_key = agent._aug_key(obs, style)
    else:
        # Standard Q agent
        base_key = agent._key(obs)
    return {
        ACTION_NAMES[a]: round(float(agent.q_table.get((base_key, a), 0.0)), 3)
        for a in legal
    }


# ── Agent / opponent factories ─────────────────────────────────────────────

def _load_agent(agent_type: str):
    """Load pre-trained agent from disk and set epsilon=0 (greedy eval mode)."""
    if agent_type == 'oa':
        agent = OpponentAwareQLearningAgent(num_actions=4)
        with open('oa_q_table.pkl', 'rb') as f:
            agent.q_table = defaultdict(float, pickle.load(f))
        agent.epsilon = 0.0
        agent.reset_classifier()   # fresh window for new session
    else:
        agent = QLearningAgent(num_actions=4)
        with open('q_table.pkl', 'rb') as f:
            agent.q_table = defaultdict(float, pickle.load(f))
        agent.epsilon = 0.0
    return agent


def _make_opponent(opp_type: str):
    if opp_type == 'tight':
        return TightAgent()
    if opp_type == 'aggressive':
        return AggressiveAgent()
    return RandomAgent()


# ── Flask routes ───────────────────────────────────────────────────────────

@app.route('/')
def index():
    """Serve the frontend HTML."""
    return send_file('demo.html')


@app.route('/api/start_session', methods=['POST'])
def start_session():
    """
    Initialise a fresh session: load trained agent, create opponent, reset stats.
    Called whenever the user changes agent type or opponent style.
    """
    data     = request.get_json() or {}
    opp_type = data.get('opponent', 'random')
    agt_type = data.get('agent',    'oa')

    _session['env']           = rlcard.make('leduc-holdem')
    _session['agent']         = _load_agent(agt_type)
    _session['opponent']      = _make_opponent(opp_type)
    _session['opponent_type'] = opp_type
    _session['agent_type']    = agt_type
    _session['stats']         = {'hands': 0, 'total_reward': 0.0, 'rewards': [], 'styles': []}

    return jsonify({'status': 'ok', 'opponent': opp_type, 'agent': agt_type})


@app.route('/api/play_hand', methods=['POST'])
def play_hand():
    """
    Play one complete Leduc Hold'em hand and return every step for animation.

    Step types returned:
      'deal'      - cards dealt, agent card visible, opponent card hidden
      'community' - community card appears (start of round 2)
      'action'    - a player acted (CALL/RAISE/FOLD/CHECK)
      'showdown'  - game over, opponent card revealed, payoff shown
    """
    env      = _session['env']
    agent    = _session['agent']
    opponent = _session['opponent']

    if env is None:
        return jsonify({'error': 'Call /api/start_session first'}), 400

    learner_id = 0   # RL agent always plays as player 0
    state, player_id = env.reset()

    if hasattr(agent, 'reset'):
        agent.reset()        # episode metadata only, not classifier
    if hasattr(opponent, 'reset'):
        opponent.reset()

    steps    = []
    prev_pub = None   # track community card appearance

    # ── Deal step ─────────────────────────────────────────────────────────
    cards = _game_cards(env)
    steps.append({
        'type':        'deal',
        'agent_card':  cards['agent'],
        'public_card': None,
        'clf':         _clf_info(agent),
    })

    # ── Gameplay loop ──────────────────────────────────────────────────────
    while not env.is_over():
        cards   = _game_cards(env)
        pub_now = cards['public']

        # Detect community card appearing at the start of round 2
        pub_rank = pub_now['rank'] if pub_now else None
        if pub_rank and not prev_pub:
            prev_pub = pub_rank
            steps.append({
                'type':        'community',
                'agent_card':  cards['agent'],
                'public_card': pub_now,
                'clf':         _clf_info(agent),
            })

        if player_id == learner_id:
            # Agent's turn: classify → select action → record Q-values
            clf_now = _clf_info(agent)
            qv      = _q_values(agent, state, clf_now['label'])
            action  = agent.act(state)
            steps.append({
                'type':        'action',
                'player':      'agent',
                'action':      ACTION_NAMES.get(action, str(action)),
                'action_id':   int(action),
                'q_values':    qv,
                'clf':         clf_now,
                'agent_card':  cards['agent'],
                'public_card': pub_now,
            })
        else:
            # Opponent's turn: act → update classifier window
            action = opponent.act(state)
            if hasattr(agent, 'observe_opponent'):
                agent.observe_opponent(action)    # slide the deque
            steps.append({
                'type':        'action',
                'player':      'opponent',
                'action':      ACTION_NAMES.get(action, str(action)),
                'action_id':   int(action),
                'clf':         _clf_info(agent),  # label may have updated
                'agent_card':  cards['agent'],
                'public_card': pub_now,
            })

        state, player_id = env.step(action)

    # ── Showdown ──────────────────────────────────────────────────────────
    payoff      = float(env.get_payoffs()[learner_id])
    final_cards = _game_cards(env)
    steps.append({
        'type':        'showdown',
        'agent_card':  final_cards['agent'],
        'opp_card':    _opp_card(env),
        'public_card': final_cards['public'],
        'payoff':      payoff,
        'result':      'win' if payoff > 0 else ('lose' if payoff < 0 else 'tie'),
        'clf':         _clf_info(agent),
    })

    # ── Update running stats ───────────────────────────────────────────────
    s = _session['stats']
    s['hands']        += 1
    s['total_reward'] += payoff
    s['rewards'].append(payoff)
    s['styles'].append(_clf_info(agent)['label'])

    return jsonify({
        'steps':  steps,
        'payoff': payoff,
        'stats': {
            'hands':        s['hands'],
            'avg_reward':   s['total_reward'] / s['hands'],
            'total_reward': s['total_reward'],
            'rewards':      s['rewards'],
            'styles':       s['styles'],
        },
    })


# ── Interactive Routes (Human vs OA Bot) ──────────────────────────────────
_interactive_session: dict = {
    'env': None,
    'agent': None,
}

@app.route('/api/interactive/start', methods=['POST'])
def interactive_start():
    # The human plays as ID=1, RL Agent as ID=0 (OA usually trains this way)
    # Actually RL agent is learner_id=0, so the human is ID=1.
    _interactive_session['env'] = rlcard.make('leduc-holdem')
    _interactive_session['agent'] = _load_agent('oa')
    
    state, player_id = _interactive_session['env'].reset()
    
    # If the RL agent gets to act first, let it act before returning state to user
    agent_action_msg = None
    if player_id == 0:
        action = _interactive_session['agent'].act(state)
        agent_action_msg = ACTION_NAMES.get(action)
        state, player_id = _interactive_session['env'].step(action)
        
    cards = _game_cards(_interactive_session['env'])
    
    return jsonify({
        'status': 'ok',
        'is_over': _interactive_session['env'].is_over(),
        'whose_turn': 'human' if player_id == 1 else 'agent',
        'agent_action': agent_action_msg,
        'public_card': cards['public'],
        # IMPORTANT: 'agent' here actually means RL agent's private card, which human shouldn't see!
        # But wait, we need human's card. In _game_cards, players[0] is RL agent.
        'human_card': _parse_card(_interactive_session['env'].game.players[1].hand),
        'pot': 0
        # 'state': removed because it contains un-serializable np.ndarray which crashes jsonify
    })

@app.route('/api/interactive/act', methods=['POST'])
def interactive_act():
    env = _interactive_session['env']
    agent = _interactive_session['agent']
    
    if env is None or env.is_over():
        return jsonify({'error': 'Game is over or not started.'}), 400
        
    data = request.get_json()
    human_action_str = data.get('action') # 'CALL', 'RAISE', 'FOLD'
    
    # Map string back to integer
    action_map = {'CALL': CALL, 'RAISE': RAISE, 'FOLD': FOLD, 'CHECK': CALL}
    # RLCard Leduc doesn't explicitly have CHECK, CALL is mapped to check if no bet
    human_action = action_map.get(human_action_str, FOLD)
    
    try:
        # 1. Apply human action
        agent.observe_opponent(human_action) # Update RL agent's opponent classifier!
        state, player_id = env.step(human_action)
        
        agent_action_msg = None
        
        # 2. If it's agent's turn after human plays, agent plays
        while not env.is_over() and player_id == 0:
            action = agent.act(state)
            agent_action_msg = ACTION_NAMES.get(action)
            state, player_id = env.step(action)
            
    except Exception as e:
        return jsonify({'error': str(e)}), 400

    cards = _game_cards(_interactive_session['env'])
    payoffs = env.get_payoffs() if env.is_over() else None
    
    return jsonify({
        'is_over': env.is_over(),
        'whose_turn': 'human' if player_id == 1 else 'agent',
        'agent_action': agent_action_msg,
        'public_card': cards['public'],
        'human_card': _parse_card(env.game.players[1].hand),
        'agent_card_revealed': cards['agent'] if env.is_over() else None,
        'pot': 0,
        'payoff_human': float(payoffs[1]) if payoffs is not None else 0.0,
        'classifier': _clf_info(agent)
    })


if __name__ == '__main__':
    print("=" * 50)
    print("  Poker RL Demo running with CORS")
    print("=" * 50)
    app.run(debug=False, port=5001, use_reloader=False)
