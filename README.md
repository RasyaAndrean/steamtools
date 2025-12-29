# 🎮 SteamTools

A full-stack application for tracking Steam game prices, managing your game library, and never missing a deal.

## 🏗️ Tech Stack

### Frontend
- **React 19** - Latest React with modern features
- **Vite** - Lightning-fast build tool
- **Tailwind CSS 4** - Utility-first CSS with custom brutalist theme
- **TypeScript** - Type-safe development
- **React Router** - Client-side routing
- **tRPC + React Query** - Type-safe API calls with caching

### Backend
- **Express.js** - Fast, minimalist web framework
- **tRPC** - End-to-end type-safe APIs
- **TypeScript** - Type-safe server development
- **Drizzle ORM** - Type-safe database toolkit
- **MySQL** - Relational database
- **Vercel-ready** - Serverless deployment configuration

## 📁 Project Structure

```
steamtools/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Card.tsx
│   │   │   └── Button.tsx
│   │   ├── pages/           # Page components
│   │   │   ├── Home.tsx
│   │   │   ├── Library.tsx
│   │   │   ├── Tracking.tsx
│   │   │   └── GameDetails.tsx
│   │   ├── styles/          # Global styles
│   │   │   └── index.css
│   │   ├── utils/           # Utility functions
│   │   │   └── trpc.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── tailwind.config.ts   # Tailwind configuration
│   ├── vite.config.ts       # Vite configuration
│   └── package.json
├── backend/                  # Express backend application
│   ├── src/
│   │   ├── routers/         # tRPC routers
│   │   │   ├── games.ts
│   │   │   ├── users.ts
│   │   │   ├── library.ts
│   │   │   ├── tracking.ts
│   │   │   └── index.ts
│   │   ├── db/              # Database configuration
│   │   │   ├── schema.ts
│   │   │   └── index.ts
│   │   ├── server.ts        # Express server setup
│   │   └── trpc.ts          # tRPC configuration
│   ├── drizzle.config.ts    # Drizzle ORM configuration
│   ├── vercel.json          # Vercel deployment config
│   └── package.json
├── shared/                   # Shared types between frontend/backend
│   ├── src/
│   │   └── types.ts
│   └── package.json
└── package.json             # Root package.json with workspaces
```

## 🗄️ Database Schema

### Users Table
- `id` - Primary key
- `username` - Unique username
- `email` - Unique email
- `password_hash` - Hashed password
- `created_at` - Account creation timestamp

### Games Table
- `id` - Primary key
- `app_id` - Steam app ID (unique)
- `name` - Game name
- `description` - Game description
- `price` - Current price
- `genres` - Game genres
- `tags` - Game tags
- `developer` - Developer name
- `release_date` - Release date
- `created_at` - Record creation timestamp

### User Library Table
- `id` - Primary key
- `user_id` - Foreign key to users
- `game_id` - Foreign key to games
- `added_at` - Added timestamp

### Tracked Games Table
- `id` - Primary key
- `user_id` - Foreign key to users
- `game_id` - Foreign key to games
- `target_price` - Target price for notifications
- `created_at` - Track creation timestamp

### Price History Table
- `id` - Primary key
- `game_id` - Foreign key to games
- `price` - Historical price
- `discount_percent` - Discount percentage
- `recorded_at` - Price recording timestamp

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- MySQL database running
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd steamtools
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**

   Create `.env` file in the `backend` directory:
   ```bash
   cp backend/.env.example backend/.env
   ```
   
   Edit `backend/.env` and add your MySQL credentials:
   ```env
   DATABASE_URL=mysql://user:password@localhost:3306/steamtools
   DATABASE_HOST=localhost
   DATABASE_PORT=3306
   DATABASE_USER=your_username
   DATABASE_PASSWORD=your_password
   DATABASE_NAME=steamtools
   PORT=3001
   NODE_ENV=development
   ```

   Create `.env` file in the `frontend` directory:
   ```bash
   cp frontend/.env.example frontend/.env
   ```
   
   Edit `frontend/.env`:
   ```env
   VITE_API_URL=http://localhost:3001
   ```

4. **Setup the database**
   
   Create the database:
   ```bash
   mysql -u root -p -e "CREATE DATABASE steamtools;"
   ```
   
   Generate and run migrations:
   ```bash
   cd backend
   npm run db:generate
   npm run db:migrate
   cd ..
   ```

5. **Start the development servers**
   ```bash
   npm run dev
   ```
   
   This will start both frontend (http://localhost:5173) and backend (http://localhost:3001)

## 📜 Available Scripts

### Root
- `npm run dev` - Start both frontend and backend dev servers
- `npm run dev:frontend` - Start only frontend dev server
- `npm run dev:backend` - Start only backend dev server
- `npm run build` - Build all workspaces
- `npm run build:frontend` - Build only frontend
- `npm run build:backend` - Build only backend

### Backend
- `npm run dev` - Start backend in watch mode
- `npm run build` - Build backend for production
- `npm run start` - Start production server
- `npm run db:generate` - Generate database migrations
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Drizzle Studio (database GUI)

### Frontend
- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 🎨 Design System

The app uses a custom **brutalist design theme** with:
- **IBM Plex Sans** for headings and body text
- **IBM Plex Mono** for code and monospace elements
- High contrast black/white color scheme
- Thick borders (3px, 5px, 6px)
- Bold shadows (brutal-sm, brutal, brutal-lg)
- Accent red color for CTAs

## 🚢 Deployment

### Vercel Deployment

The backend is configured for Vercel serverless deployment:

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy backend:
   ```bash
   cd backend
   vercel
   ```

3. Deploy frontend:
   ```bash
   cd frontend
   vercel
   ```

4. Set environment variables in Vercel dashboard

### Database Migration on Production
```bash
cd backend
npm run db:migrate
```

## 🔧 Configuration Files

- **tailwind.config.ts** - Tailwind CSS configuration with custom theme
- **vite.config.ts** - Vite bundler configuration
- **drizzle.config.ts** - Drizzle ORM configuration
- **vercel.json** - Vercel serverless configuration
- **tsconfig.json** - TypeScript configuration (frontend, backend, shared)

## 📦 API Endpoints

### tRPC Routes

#### Games Router (`/trpc/games`)
- `getAll` - Get all games
- `getById` - Get game by ID
- `getByAppId` - Get game by Steam App ID
- `getPriceHistory` - Get price history for a game
- `search` - Search games by name

#### Users Router (`/trpc/users`)
- `getAll` - Get all users
- `getById` - Get user by ID
- `getByUsername` - Get user by username

#### Library Router (`/trpc/library`)
- `getUserLibrary` - Get user's game library
- `addToLibrary` - Add game to library
- `removeFromLibrary` - Remove game from library

#### Tracking Router (`/trpc/tracking`)
- `getUserTrackedGames` - Get user's tracked games
- `trackGame` - Add game to tracking
- `untrackGame` - Remove game from tracking
- `updateTargetPrice` - Update target price for tracked game

## 🛠️ Development Tips

### Database Management
- Use `npm run db:studio` in the backend directory to open Drizzle Studio
- Drizzle Studio provides a visual interface for your database

### Type Safety
- Types are shared between frontend and backend via the `shared` workspace
- tRPC provides end-to-end type safety from server to client

### Hot Reload
- Both frontend and backend support hot reload in development
- Changes to tRPC routers are automatically reflected in the frontend

## 📝 License

This project is for educational purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Built with ❤️ using React 19, Vite, Express, tRPC, Drizzle, and MySQL
