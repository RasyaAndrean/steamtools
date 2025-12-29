# 🚀 SteamTools - Quick Start Guide

Get up and running with SteamTools in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- MySQL 5.7+ or 8.0+ running
- npm or yarn

## Step 1: Install Dependencies

```bash
npm install
```

This installs dependencies for all workspaces (frontend, backend, shared).

## Step 2: Setup MySQL Database

Create a new database:

```bash
mysql -u root -p
```

```sql
CREATE DATABASE steamtools;
EXIT;
```

## Step 3: Configure Environment Variables

### Backend Configuration

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and update with your MySQL credentials:

```env
DATABASE_URL=mysql://your_user:your_password@localhost:3306/steamtools
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=your_user
DATABASE_PASSWORD=your_password
DATABASE_NAME=steamtools
PORT=3001
NODE_ENV=development
```

### Frontend Configuration

```bash
cd frontend
cp .env.example .env
```

The default configuration should work:

```env
VITE_API_URL=http://localhost:3001
```

## Step 4: Run Database Migrations

```bash
cd backend
npm run db:generate
npm run db:migrate
cd ..
```

## Step 5: Start Development Servers

From the root directory:

```bash
npm run dev
```

This starts both servers:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## 🎉 You're Ready!

Open your browser and visit:
- **Frontend**: http://localhost:5173
- **API Health Check**: http://localhost:3001/health

## Verify Installation

### Test Frontend
Open http://localhost:5173 in your browser. You should see the SteamTools homepage.

### Test Backend
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{"status":"ok","timestamp":"2024-..."}
```

### Test tRPC Connection
The frontend should connect to the backend automatically. Check the browser console for any errors.

## Common Issues

### Port Already in Use

If port 5173 or 3001 is already in use:

```bash
# Find and kill the process
lsof -i :5173
lsof -i :3001
kill -9 <PID>
```

### Database Connection Error

Ensure MySQL is running:

```bash
mysql -u root -p -e "SELECT 1"
```

Check your credentials in `backend/.env` are correct.

### Module Not Found Errors

Clear node_modules and reinstall:

```bash
rm -rf node_modules package-lock.json
rm -rf frontend/node_modules backend/node_modules shared/node_modules
npm install
```

## Next Steps

1. **Explore the Code**
   - Check `frontend/src/pages/` for page components
   - Check `backend/src/routers/` for API routes
   - Check `shared/src/types.ts` for shared types

2. **Read Documentation**
   - `README.md` - Full project documentation
   - `SETUP.md` - Detailed setup guide
   - `IMPLEMENTATION_SUMMARY.md` - What's been built

3. **Start Building Features**
   - Add authentication
   - Integrate Steam API
   - Implement price tracking
   - Add more pages

## Development Tips

### Run Individual Services

Frontend only:
```bash
npm run dev:frontend
```

Backend only:
```bash
npm run dev:backend
```

### Database Management

Open Drizzle Studio (visual database editor):
```bash
cd backend
npm run db:studio
```

### Building for Production

```bash
npm run build
```

### Type Checking

Frontend:
```bash
cd frontend
npx tsc --noEmit
```

Backend:
```bash
cd backend
npx tsc --noEmit
```

## Project Structure

```
steamtools/
├── frontend/      # React 19 + Vite + Tailwind CSS 4
├── backend/       # Express + tRPC + Drizzle ORM
├── shared/        # Shared TypeScript types
└── docs/          # Documentation files
```

## Tech Stack Summary

- **Frontend**: React 19, Vite, Tailwind CSS 4, TypeScript
- **Backend**: Express, tRPC, Drizzle ORM, TypeScript
- **Database**: MySQL
- **Styling**: Custom brutalist theme with IBM Plex fonts

## Getting Help

- Read the full documentation in `README.md`
- Check `SETUP.md` for detailed setup instructions
- Review `PROJECT_CHECKLIST.md` for implementation details

## Happy Coding! 🎮

Now you're ready to build amazing features for SteamTools!
