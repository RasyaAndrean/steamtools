import Card from '../components/Card';
import Button from '../components/Button';

export default function Library() {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-5xl font-bold mb-8">MY LIBRARY</h1>
      
      <Card className="mb-8">
        <p className="text-xl">
          Your game library will appear here. Connect your Steam account to import your games.
        </p>
        <Button variant="accent" className="mt-4">
          CONNECT STEAM ACCOUNT
        </Button>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Library items will be rendered here */}
      </div>
    </div>
  );
}
