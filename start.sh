#!/bin/bash
set -e

# c = verbose (show backend/frontend server logs); default = quiet servers
VERBOSE=false
[ "$1" = "c" ] && VERBOSE=true

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Haptimize startup ==="

# Check Python
if ! command -v python3 &>/dev/null; then
  echo "Error: python3 not found. Please install Python 3." >&2
  exit 1
fi
echo "✓ Python: $(python3 --version)"

# Check Node.js
if ! command -v node &>/dev/null; then
  echo "Error: node not found. Please install Node.js." >&2
  exit 1
fi
echo "✓ Node: $(node --version)"

# Check npm
if ! command -v npm &>/dev/null; then
  echo "Error: npm not found. Please install npm." >&2
  exit 1
fi
echo "✓ npm: $(npm --version)"

# Clear caches
echo ""
echo "Clearing caches..."
find backend -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find backend -type f -name "*.pyc" -delete 2>/dev/null || true
rm -rf frontend/.next 2>/dev/null || true
echo "✓ Cache cleared"

# Backend: venv + deps
echo ""
echo "Setting up backend..."
if [ ! -d backend/.venv ]; then
  python3 -m venv backend/.venv
fi
source backend/.venv/bin/activate
pip install -q -r backend/requirements.txt
echo "✓ Backend dependencies ready"

# Frontend: deps
echo ""
echo "Setting up frontend..."
cd frontend
npm ci --silent 2>/dev/null || npm install --silent
cd ..
echo "✓ Frontend dependencies ready"

# Start both
echo ""
echo "Starting backend and frontend..."
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo ""

source backend/.venv/bin/activate
if $VERBOSE; then
  (cd backend && exec python app.py) &
else
  (cd backend && exec python app.py) &>/dev/null &
fi
BACKEND_PID=$!
if $VERBOSE; then
  (cd frontend && exec npm run dev) &
else
  (cd frontend && exec npm run dev) &>/dev/null &
fi
FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "Press Ctrl+C to stop both."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
