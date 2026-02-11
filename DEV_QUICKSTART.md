# OTTO Development Quick Start

## Starting Development Servers

### Option 1: Single Command (Recommended)
```bash
npm run dev:all
```
or
```bash
./dev.sh
```

This will start both:
- **Backend** on `http://localhost:8001`
- **Frontend** on `http://localhost:5173`

Press `Ctrl+C` to stop both servers.

### Option 2: Separate Terminals

**Terminal 1 - Backend:**
```bash
cd backend
OTTO_NODE_ROLE=hub PORT=8001 CORS_ORIGINS=* APP_DATA_DIR=~/.otto/data DATABASE_URL=sqlite:///~/.otto/data/db/otto.sqlite python3 main.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## Environment Variables

The `dev.sh` script automatically sets:
- `OTTO_NODE_ROLE=hub`
- `PORT=8001`
- `CORS_ORIGINS=*`
- `APP_DATA_DIR=~/.otto/data`
- `DATABASE_URL=sqlite:///~/.otto/data/db/otto.sqlite`

## First Run

On first run, you'll be prompted to select Hub or Spoke mode at `http://localhost:5173/#/setup`.

## Troubleshooting

**Port already in use:**
```bash
# Kill processes on ports 8001 and 5173
lsof -ti:8001 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

**Database issues:**
```bash
# Reset database (WARNING: deletes all data)
rm -rf ~/.otto/data
```
