# SteamTools - Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

This will install dependencies for all workspaces (frontend, backend, shared).

### 2. Setup Database

Create a MySQL database:
```bash
mysql -u root -p
CREATE DATABASE steamtools;
EXIT;
```

Update the backend `.env` file with your database credentials:
```bash
cd backend
cp .env.example .env
# Edit .env with your actual database credentials
```

### 3. Run Database Migrations

Generate and run migrations:
```bash
cd backend
npm run db:generate
npm run db:migrate
```

### 4. Setup Frontend Environment

```bash
cd frontend
cp .env.example .env
# Edit .env if needed (default is http://localhost:3001)
```

### 5. Start Development Servers

From the root directory:
```bash
npm run dev
```

This will start:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Individual Commands

### Run Frontend Only
```bash
npm run dev:frontend
# or
cd frontend && npm run dev
```

### Run Backend Only
```bash
npm run dev:backend
# or
cd backend && npm run dev
```

### Build for Production
```bash
npm run build
# or individually
npm run build:frontend
npm run build:backend
```

## Database Management

### Open Drizzle Studio (Database GUI)
```bash
cd backend
npm run db:studio
```

### Generate New Migration
After modifying `backend/src/db/schema.ts`:
```bash
cd backend
npm run db:generate
npm run db:migrate
```

## Testing the API

The backend provides a health check endpoint:
```bash
curl http://localhost:3001/health
```

tRPC endpoints are available at:
```
http://localhost:3001/trpc
```

## Project Structure Overview

```
steamtools/
├── frontend/          # React 19 + Vite application
├── backend/           # Express + tRPC API server
├── shared/            # Shared TypeScript types
└── package.json       # Root workspace configuration
```

## Technology Stack

### Frontend
- React 19
- Vite 6
- Tailwind CSS 4 (with @tailwindcss/postcss)
- TypeScript 5.7
- React Router DOM 7
- tRPC React Query

### Backend
- Express.js 4
- tRPC 11 (RC)
- Drizzle ORM 0.37
- MySQL2
- TypeScript 5.7
- Zod for validation

### Development Tools
- tsx for backend hot reload
- Vite for frontend hot reload
- Drizzle Kit for database migrations

## Common Issues

### Port Already in Use
If you get a port error, check if another process is using ports 5173 or 3001:
```bash
lsof -i :5173
lsof -i :3001
```

### Database Connection Error
Ensure MySQL is running and credentials in `backend/.env` are correct:
```bash
mysql -u [username] -p -e "SELECT 1"
```

### TypeScript Errors
Run type checking:
```bash
cd frontend && npx tsc --noEmit
cd backend && npx tsc --noEmit
```

### Tailwind CSS Not Working
Ensure @tailwindcss/postcss is installed:
```bash
cd frontend
npm install -D @tailwindcss/postcss
```

## Next Steps

1. **Add Authentication**: Implement user authentication with sessions or JWT
2. **Steam API Integration**: Connect to Steam API to fetch game data
3. **Price Tracking Logic**: Implement price comparison and notifications
4. **Testing**: Add unit and integration tests
5. **Deployment**: Deploy to Vercel (config already included)

## Useful Resources

- [React 19 Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS 4 Documentation](https://tailwindcss.com/)
- [tRPC Documentation](https://trpc.io/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Express.js Documentation](https://expressjs.com/)

## Development Workflow

1. Make changes to code
2. Code will hot reload automatically
3. Check browser console for errors
4. Check terminal for server errors
5. Use Drizzle Studio for database inspection

## Building for Production

### Frontend
```bash
cd frontend
npm run build
# Output: frontend/dist/
```

### Backend
```bash
cd backend
npm run build
# Output: backend/dist/
```

### Run Production Build
```bash
cd backend
npm start
```

## Deployment

### Vercel (Recommended)

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

## Support

For issues or questions, check the main README.md or open an issue on GitHub.
