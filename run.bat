@echo off
REM ================================================
REM Swastik Gold & Silver Lab - Windows Launcher
REM ================================================
echo.
echo "================================================"
echo "  SWASTIK GOLD ^& SILVER LAB - STARTUP"
echo "================================================"
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ERROR: Node.js is not installed or not in PATH
    echo.
    echo Please install Node.js from:
    echo https://nodejs.org/
    pause
    exit /b 1
)

REM Check Node.js version
for /f "tokens=1" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✓ Node.js %NODE_VERSION% detected

REM Check if npm is available
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ERROR: npm is not installed
    pause
    exit /b 1
)

REM Set environment variables
set NODE_ENV=development
set PORT=5000
set FRONTEND_PORT=3000

echo.
echo 🔧 Checking project structure...
if not exist "package.json" (
    echo ❌ ERROR: package.json not found. Are you in the project root?
    pause
    exit /b 1
)

if not exist "backend" (
    echo ❌ ERROR: backend folder not found
    pause
    exit /b 1
)

if not exist "frontend" (
    echo ❌ ERROR: frontend folder not found
    pause
    exit /b 1
)

echo ✓ Project structure verified

REM Check for .env file
if not exist "backend\.env" (
    echo.
    echo ⚠ WARNING: .env file not found in backend/
    echo Creating default .env file...
    (
        echo # Server Configuration
        echo PORT=5000
        echo HOST=0.0.0.0
        echo.
        echo # Database Configuration
        echo DB_PATH=./db/lab.db
        echo.
        echo # JWT Secret
        echo JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
        echo.
        echo # Application
        echo NODE_ENV=development
    ) > backend\.env
    echo ✓ Created default .env file
)

REM Install dependencies
echo.
echo 📦 Installing/Checking dependencies...
echo.

REM Root dependencies
if exist "node_modules" (
    echo ✓ Root node_modules already exists
) else (
    echo Installing root dependencies...
    call npm install --no-audit --progress=false
)

REM Backend dependencies
if exist "backend\node_modules" (
    echo ✓ Backend node_modules already exists
) else (
    echo Installing backend dependencies...
    cd backend
    call npm install --no-audit --progress=false
    cd ..
)

REM Frontend dependencies
if exist "frontend\node_modules" (
    echo ✓ Frontend node_modules already exists
) else (
    echo Installing frontend dependencies...
    cd frontend
    call npm install --no-audit --progress=false
    cd ..
)

echo.
echo ✅ All dependencies installed

REM Check database
echo.
echo 🗄️ Checking database...
if not exist "backend\db" (
    mkdir backend\db
    echo ✓ Created db directory
)

REM Initialization is handled by db.js, so we simply verify existence
if not exist "backend\db\lab.db" (
    echo.
    echo 📊 Database will be initialized on first run.
) else (
    echo ✓ Database exists
)

echo.
echo "🚀 Starting Swastik Gold ^& Silver Lab..."
echo.

REM Start servers using dev.js
node dev.js

REM If dev.js exits, show message
echo.
echo ================================================
echo   Application stopped
echo ================================================
echo.
echo Options:
echo 1. Press any key to restart
echo 2. Close window to exit
echo.

pause >nul
goto :start
