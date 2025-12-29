import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Library from './pages/Library';
import Tracking from './pages/Tracking';
import GameDetails from './pages/GameDetails';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-secondary-100">
        <Header />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/library" element={<Library />} />
            <Route path="/tracking" element={<Tracking />} />
            <Route path="/game/:id" element={<GameDetails />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}
