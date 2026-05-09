import { useState } from 'react';
import { CasinoProvider, useCasino } from './context/CasinoContext';
import { Login } from './pages/Login';
import { Lobby } from './pages/Lobby';
import { Navbar } from './components/Navbar';
import { AnimatedBackground } from './components/AnimatedBackground';
import { SlotMachine } from './games/SlotMachine';
import { Roulette } from './games/Roulette';
import { Blackjack } from './games/Blackjack';
import { Poker } from './games/Poker';
import { LeducPoker } from './games/LeducPoker';
import { LeducVisualizer } from './games/LeducVisualizer';
import { VideoTransition } from './components/VideoTransition';
import { SevenUpSevenDown } from './games/SevenUpSevenDown';
import { SessionReport } from './pages/SessionReport';
import { AIChatbot } from './components/AIChatbot';
import './index.css';

const MainApp = () => {
  const { user } = useCasino();
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pendingGame, setPendingGame] = useState<string | null>(null);

  // Connection Guard UI (Disabled for local setup)
  // if (!isCloud) { ... }

  const handleSelectGame = (gameId: string) => {
    setPendingGame(gameId);
    setIsTransitioning(true);
  };

  const handleTransitionComplete = () => {
    if (pendingGame) {
      setActiveGame(pendingGame);
      setPendingGame(null);
    }
    setIsTransitioning(false);
  };

  const handleGoLobby = () => {
    setActiveGame(null);
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {/* Global animated background always visible */}
      <AnimatedBackground />
      
      {/* Content layer */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {!user ? (
          <Login />
        ) : (
          <>
            <Navbar onOpenReport={() => setActiveGame('report')} onGoToLobby={handleGoLobby} />
            {!activeGame && !isTransitioning ? (
              <Lobby onSelectGame={handleSelectGame} />
            ) : (
              <div style={{ flex: 1 }}>
                {activeGame === 'slots'     && <SlotMachine onBack={handleGoLobby} />}
                {activeGame === 'roulette'  && <Roulette    onBack={handleGoLobby} />}
                {activeGame === 'blackjack' && <Blackjack   onBack={handleGoLobby} />}
                {activeGame === 'poker'     && <Poker       onBack={handleGoLobby} />}
                {activeGame === 'leduc'     && <LeducPoker  onBack={handleGoLobby} />}
                {activeGame === 'leduc_vis' && <LeducVisualizer onBack={handleGoLobby} />}
                {activeGame === 'dice'      && <SevenUpSevenDown onBack={handleGoLobby} />}
                {activeGame === 'report'    && <SessionReport onBack={handleGoLobby} />}
              </div>
            )}
          </>
        )}
        
        {/* Global AI Chatbot accessible from anywhere */}
        {user && <AIChatbot />}
      </div>

      <VideoTransition 
        src="/Whisk_uzmkjjz5ywo3iwzi1czifdotiwnyqtl2ygzh1iy.mp4"
        isVisible={isTransitioning}
        onComplete={handleTransitionComplete}
        startTime={0}
      />
    </div>
  );
};

function App() {
  return (
    <CasinoProvider>
      <MainApp />
    </CasinoProvider>
  );
}

export default App;
