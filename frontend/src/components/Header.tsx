import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="bg-primary text-secondary border-b-5 border-black">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-3xl font-bold hover:opacity-80 transition-opacity">
            STEAMTOOLS
          </Link>
          <nav className="flex gap-6">
            <Link 
              to="/" 
              className="text-lg font-semibold hover:underline decoration-5 underline-offset-8"
            >
              HOME
            </Link>
            <Link 
              to="/search" 
              className="text-lg font-semibold hover:underline decoration-5 underline-offset-8"
            >
              SEARCH
            </Link>
            <Link 
              to="/library" 
              className="text-lg font-semibold hover:underline decoration-5 underline-offset-8"
            >
              LIBRARY
            </Link>
            <Link 
              to="/tracking" 
              className="text-lg font-semibold hover:underline decoration-5 underline-offset-8"
            >
              TRACKING
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
