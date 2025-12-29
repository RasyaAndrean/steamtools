import { useParams } from 'react-router-dom';
import { trpc } from '../utils/trpc';
import ComparisonDashboard from '../components/ComparisonDashboard';

export default function GameDetails() {
  const { id } = useParams<{ id: string }>();
  const gameId = id ? parseInt(id) : 0;
  
  return (
    <div className="container mx-auto px-4 py-12">
      <ComparisonDashboard gameId={gameId} />
    </div>
  );
}
