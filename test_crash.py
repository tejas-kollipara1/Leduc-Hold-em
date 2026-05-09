import sys
import traceback
import rlcard
from demo_app import _load_agent, _game_cards, _parse_card, ACTION_NAMES

def test():
    try:
        env = rlcard.make('leduc-holdem')
        agent = _load_agent('oa')
        
        state, player_id = env.reset()
        
        if player_id == 0:
            action = agent.act(state)
            agent_action_msg = ACTION_NAMES.get(action)
            state, player_id = env.step(action)
            
        cards = _game_cards(env)
        
        # simulate human_card retrieval
        hcard = _parse_card(env.game.players[1].hand)
        print("Success!", hcard)
    except Exception as e:
        traceback.print_exc()

if __name__ == '__main__':
    test()
