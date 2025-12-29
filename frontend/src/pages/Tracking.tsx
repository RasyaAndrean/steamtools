import Card from '../components/Card';
import Button from '../components/Button';

export default function Tracking() {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-5xl font-bold mb-8">PRICE TRACKING</h1>
      
      <Card className="mb-8">
        <p className="text-xl mb-4">
          Track game prices and get notified when they hit your target price.
        </p>
        <Button variant="accent">
          ADD GAME TO TRACK
        </Button>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tracked games will be rendered here */}
      </div>
    </div>
  );
}
