import rlcard
import numpy as np
from oa_agent import OpponentAwareQLearningAgent
from q_agent import QLearningAgent
from agents import TightAgent, AggressiveAgent, RandomAgent

def map_action(action_id):
    mapping = {0: "CALL", 1: "RAISE", 2: "FOLD", 3: "CHECK"}
    return mapping.get(action_id, f"UNKNOWN({action_id})")

def test_live_agent():
    env = rlcard.make('leduc-holdem')
    
    # 1. Load the pre-trained OA Agent
    print("Loading Opponent-Aware Agent...")
    oa_agent = OpponentAwareQLearningAgent(num_actions=env.num_actions)
    try:
        oa_agent.load("oa_q_table.pkl")
        print(f"Loaded successfully. Q-table size: {len(oa_agent.q_table)}")
    except FileNotFoundError:
        print("Could not find 'oa_q_table.pkl'. Please run step6_experiments.py first to generate it.")
        return

    # Disable exploration for testing
    oa_agent.epsilon = 0.0

    print("\n=======================================================")
    print("TEST 1: OA Agent vs AGGRESSIVE Opponent (Best of 5 games)")
    print("=======================================================")
    
    aggressive_opponent = AggressiveAgent()
    oa_agent.reset_classifier() # Reset history before facing a new opponent
    
    for game in range(1, 31):
        state, player_id = env.reset()
        oa_agent.reset()
        
        print(f"\n--- Game {game} ---")
        while not env.is_over():
            # Get current classifier stats
            label = oa_agent.classifier.classify()
            
            if player_id == 0:
                # It's our OA Agent's turn
                action = oa_agent.act(state)
                # Let's peek into the agent's thought process
                print(f"[OA Agent] Perceived Style: '{label}' => Played: {map_action(action)}")
            else:
                # It's the opponent's turn
                action = aggressive_opponent.act(state)
                oa_agent.observe_opponent(action)
                print(f"[Opponent] Played: {map_action(action)}")
                
            state, player_id = env.step(action)
            
        payoffs = env.get_payoffs()
        print(f"Outcome: OA Agent gets {payoffs[0]} chips.")
        
    print("\nLook closely at how the 'Perceived Style' shifts from 'random' to 'aggressive' across hands!")

if __name__ == "__main__":
    test_live_agent()
