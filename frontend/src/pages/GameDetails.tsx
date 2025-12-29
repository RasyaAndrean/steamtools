import { useParams } from 'react-router-dom';
import { trpc } from '../utils/trpc';
import Card from '../components/Card';
import Button from '../components/Button';

export default function GameDetails() {
  const { id } = useParams<{ id: string }>();
  const gameId = id ? parseInt(id) : 0;
  
  const { data: game, isLoading } = trpc.games.getById.useQuery({ id: gameId });
  const { data: priceHistory } = trpc.games.getPriceHistory.useQuery({ gameId });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card>
          <p className="text-xl text-center">Loading game details...</p>
        </Card>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card>
          <p className="text-xl text-center">Game not found.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <Card className="mb-8">
        <h1 className="text-4xl font-bold mb-4">{game.name}</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-lg mb-2"><strong>Developer:</strong> {game.developer || 'Unknown'}</p>
            <p className="text-lg mb-2"><strong>Price:</strong> {game.price ? `$${game.price}` : 'N/A'}</p>
            <p className="text-lg mb-2"><strong>Release Date:</strong> {game.releaseDate ? new Date(game.releaseDate).toLocaleDateString() : 'Unknown'}</p>
          </div>
          <div>
            <p className="text-lg mb-2"><strong>Genres:</strong> {game.genres || 'N/A'}</p>
            <p className="text-lg mb-2"><strong>Tags:</strong> {game.tags || 'N/A'}</p>
          </div>
        </div>
        {game.description && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">DESCRIPTION</h2>
            <p className="text-lg">{game.description}</p>
          </div>
        )}
        <div className="flex gap-4">
          <Button variant="accent">ADD TO LIBRARY</Button>
          <Button variant="secondary">TRACK PRICE</Button>
        </div>
      </Card>

      {priceHistory && priceHistory.length > 0 && (
        <Card>
          <h2 className="text-3xl font-bold mb-4">PRICE HISTORY</h2>
          <div className="space-y-2">
            {priceHistory.map((record) => (
              <div key={record.id} className="flex justify-between items-center border-b-2 border-black pb-2">
                <span className="text-lg">{new Date(record.recordedAt).toLocaleDateString()}</span>
                <span className="text-lg font-bold">
                  ${record.price} {record.discountPercent > 0 && `(-${record.discountPercent}%)`}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
