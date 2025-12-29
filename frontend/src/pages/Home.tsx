import { Link } from 'react-router-dom';
import { trpc } from '../utils/trpc';
import Card from '../components/Card';
import Button from '../components/Button';
import TrendingGames from '../components/TrendingGames';

export default function Home() {
  const { data: games, isLoading } = trpc.games.getAll.useQuery();

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-6xl font-bold mb-4">STEAMTOOLS</h1>
        <p className="text-2xl font-semibold mb-8">
          Track Prices. Compare Deals. Never Overpay.
        </p>
        <div className="flex gap-4 justify-center">
          <Link to="/search">
            <Button variant="accent">SEARCH GAMES</Button>
          </Link>
          <Button variant="secondary">LEARN MORE</Button>
        </div>
      </div>

      <section className="mb-16">
        <h2 className="text-4xl font-bold mb-8 text-center">FEATURES</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card>
            <h3 className="text-2xl font-bold mb-4">🔍 ADVANCED SEARCH</h3>
            <p className="text-lg">
              Search across Steam, Epic Games, and GOG with powerful filters and sorting.
            </p>
          </Card>
          <Card>
            <h3 className="text-2xl font-bold mb-4">💰 PRICE COMPARISON</h3>
            <p className="text-lg">
              Compare prices across platforms and find the best deal instantly.
            </p>
          </Card>
          <Card>
            <h3 className="text-2xl font-bold mb-4">💡 WHERE TO BUY</h3>
            <p className="text-lg">
              Get smart recommendations on where to buy based on price and features.
            </p>
          </Card>
        </div>
      </section>

      <section className="mb-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-4xl font-bold">TRENDING GAMES</h2>
          <Link to="/search">
            <Button variant="secondary">VIEW ALL</Button>
          </Link>
        </div>
        <TrendingGames timeframe="week" limit={6} />
      </section>

      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-4xl font-bold">POPULAR GAMES</h2>
          <Link to="/search">
            <Button variant="secondary">SEARCH MORE</Button>
          </Link>
        </div>
        {isLoading ? (
          <div className="text-center text-xl">Loading games...</div>
        ) : games && games.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.slice(0, 6).map((game) => (
              <Card key={game.id}>
                <h3 className="text-xl font-bold mb-2">{game.name}</h3>
                <p className="text-lg font-semibold mb-4">
                  {game.price ? `${game.price}` : 'Price not available'}
                </p>
                <Link to={`/search?q=${encodeURIComponent(game.name)}`}>
                  <Button variant="accent" className="w-full">
                    COMPARE PRICES
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <p className="text-center text-xl">No games available yet. Check back soon!</p>
          </Card>
        )}
      </section>
    </div>
  );
}
