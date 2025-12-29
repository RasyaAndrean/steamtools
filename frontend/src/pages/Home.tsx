import { trpc } from '../utils/trpc';
import Card from '../components/Card';
import Button from '../components/Button';

export default function Home() {
  const { data: games, isLoading } = trpc.games.getAll.useQuery();

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-6xl font-bold mb-4">STEAMTOOLS</h1>
        <p className="text-2xl font-semibold mb-8">
          Track Prices. Manage Your Library. Never Miss a Deal.
        </p>
        <div className="flex gap-4 justify-center">
          <Button variant="accent">GET STARTED</Button>
          <Button variant="secondary">LEARN MORE</Button>
        </div>
      </div>

      <section className="mb-16">
        <h2 className="text-4xl font-bold mb-8 text-center">FEATURES</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card>
            <h3 className="text-2xl font-bold mb-4">📊 PRICE TRACKING</h3>
            <p className="text-lg">
              Set target prices for games and get notified when they go on sale.
            </p>
          </Card>
          <Card>
            <h3 className="text-2xl font-bold mb-4">📚 LIBRARY MANAGER</h3>
            <p className="text-lg">
              Keep track of all your Steam games in one organized place.
            </p>
          </Card>
          <Card>
            <h3 className="text-2xl font-bold mb-4">📈 PRICE HISTORY</h3>
            <p className="text-lg">
              View historical price data to make informed purchase decisions.
            </p>
          </Card>
        </div>
      </section>

      <section>
        <h2 className="text-4xl font-bold mb-8 text-center">POPULAR GAMES</h2>
        {isLoading ? (
          <div className="text-center text-xl">Loading games...</div>
        ) : games && games.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.slice(0, 6).map((game) => (
              <Card key={game.id}>
                <h3 className="text-xl font-bold mb-2">{game.name}</h3>
                <p className="text-lg font-semibold mb-4">
                  {game.price ? `$${game.price}` : 'Price not available'}
                </p>
                <Button variant="accent" className="w-full">
                  VIEW DETAILS
                </Button>
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
