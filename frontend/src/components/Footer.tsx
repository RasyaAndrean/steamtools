export default function Footer() {
  return (
    <footer className="bg-primary text-secondary border-t-5 border-black mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-lg font-bold">STEAMTOOLS</p>
          <p className="mt-2 text-sm">Track & Manage Your Steam Games</p>
          <p className="mt-4 text-xs opacity-70">
            © {new Date().getFullYear()} SteamTools. Not affiliated with Valve Corporation.
          </p>
        </div>
      </div>
    </footer>
  );
}
