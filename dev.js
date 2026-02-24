// File Path: dev.js
// Swastik Gold & Silver Lab - Development Launcher
const { spawn, execSync, spawnSync } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m'
};

/**
 * Print formatted message
 */
function log(message, color = colors.white, prefix = '') {
    console.log(`${color}${prefix}${message}${colors.reset}`);
}

/**
 * Print header
 */
function printHeader() {
    console.log('\n'.repeat(2));
    log('=================================================', colors.cyan, '  ');
    log('     SWASTIK GOLD & SILVER LAB v2.0.0           ', colors.bright + colors.cyan, '  ');
    log('=================================================', colors.cyan, '  ');
    console.log('\n');
}

/**
 * Kill processes on specific ports (Cross-platform)
 */
function killPorts(ports) {
    log(`🔧 Step 1: Cleaning up ports ${ports.join(', ')}...`, colors.yellow);

    const platform = os.platform();

    ports.forEach((port) => {
        try {
            if (platform === 'win32') {
                // Windows
                const stdout = execSync(`netstat -ano | findstr :${port}`).toString();
                const lines = stdout.trim().split('\n');
                const pids = new Set();

                lines.forEach((line) => {
                    const parts = line.trim().split(/\s+/);
                    const pid = parts[parts.length - 1];
                    if (pid && /^\d+$/.test(pid) && pid !== '0') {
                        pids.add(pid);
                    }
                });

                pids.forEach((pid) => {
                    try {
                        execSync(`taskkill /F /PID ${pid}`);
                        log(`✓ Terminated process ${pid} on port ${port}`, colors.green);
                    } catch (e) {
                        // Process might already be gone
                    }
                });
            } else {
                // Linux/Mac
                try {
                    const pid = execSync(`lsof -ti:${port}`).toString().trim();
                    if (pid) {
                        execSync(`kill -9 ${pid}`);
                        log(`✓ Terminated process ${pid} on port ${port}`, colors.green);
                    }
                } catch (e) {
                    // Port not in use
                }
            }
        } catch (err) {
            // Port likely not in use
        }
    });

    log('✓ Port cleanup completed', colors.green);
}

/**
 * Check and install dependencies
 */
function checkDependencies() {
    log(`📦 Step 2: Checking dependencies...`, colors.yellow);

    const dirs = [
        { name: 'Root', path: '.' },
        { name: 'Backend', path: 'backend' },
        { name: 'Frontend', path: 'frontend' }
    ];

    let allInstalled = true;

    dirs.forEach((dir) => {
        const packagePath = path.join(__dirname, dir.path, 'package.json');
        const nodeModulesPath = path.join(__dirname, dir.path, 'node_modules');

        if (!fs.existsSync(packagePath)) {
            log(`⚠  Skipping ${dir.name} (no package.json)`, colors.yellow);
            return;
        }

        if (!fs.existsSync(nodeModulesPath)) {
            log(`📥 Installing dependencies in ${dir.name}...`, colors.cyan);
            try {
                spawnSync('npm', ['install', '--no-audit', '--progress=false'], {
                    cwd: path.join(__dirname, dir.path),
                    stdio: 'inherit',
                    shell: true,
                    timeout: 300000 // 5 minutes timeout
                });
                log(`✓ ${dir.name} dependencies installed`, colors.green);
            } catch (error) {
                log(`❌ Failed to install dependencies in ${dir.name}`, colors.red);
                allInstalled = false;
            }
        } else {
            log(`✓ ${dir.name} dependencies already installed`, colors.green);
        }
    });

    return allInstalled;
}

/**
 * LAN IP Discovery
 */
function getLanIp() {
    const networkInterfaces = os.networkInterfaces();
    let lanIp = '127.0.0.1';
    let candidates = [];

    for (const name in networkInterfaces) {
        for (const iface of networkInterfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                // Prioritize 192.168.x.x (Common Home/Office LAN)
                if (iface.address.startsWith('192.168.')) {
                    return iface.address;
                }
                // Store others as fallback
                candidates.push(iface.address);
            }
        }
    }

    // Fallback order: 10.0.0.0/8 -> 172.16.0.0/12 -> First found
    if (candidates.length > 0) {
        const tenSeries = candidates.find(ip => ip.startsWith('10.'));
        if (tenSeries) return tenSeries;
        return candidates[0];
    }

    return lanIp;
}

/**
 * Check database initialization
 */
function checkDatabase() {
    log(`🗄️  Step 3: Checking database...`, colors.yellow);

    const dbPath = path.join(__dirname, 'backend', 'db', 'lab.db');
    const dbDir = path.dirname(dbPath);

    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
        log('✓ Created database directory', colors.green);
    }

    if (!fs.existsSync(dbPath)) {
        log('📊 Initializing database...', colors.cyan);

        // Check if init.sql exists
        const initSqlPath = path.join(__dirname, 'backend', 'db', 'init.sql');
        if (!fs.existsSync(initSqlPath)) {
            log('❌ init.sql not found in backend/db/', colors.red);
            return false;
        }

        try {
            // Initialize database using the existing db.js
            const { initDb } = require('./backend/db/db');
            initDb();
            log('✓ Database initialized successfully', colors.green);
            return true;
        } catch (error) {
            log(`❌ Database initialization failed: ${error.message}`, colors.red);
            return false;
        }
    } else {
        log('✓ Database exists and ready', colors.green);
        return true;
    }
}

/**
 * Start the application
 */
async function start() {
    printHeader();

    const lanIp = getLanIp();
    log(`🌐 LAN IP Address: ${lanIp}`, colors.cyan);
    log(`💻 Platform: ${os.platform()} ${os.arch()}`, colors.dim);
    log(`📅 ${new Date().toLocaleString()}`, colors.dim);

    console.log('\n');

    // 1. Kill ports
    killPorts([3000, 5000]);

    // 2. Check dependencies
    const depsOk = checkDependencies();
    if (!depsOk) {
        log('⚠  Dependency check had issues, but continuing...', colors.yellow);
    }

    // 3. Check database
    const dbOk = checkDatabase();
    if (!dbOk) {
        log('⚠  Database initialization had issues, but continuing...', colors.yellow);
    }

    console.log('\n');
    log('🚀 Step 4: Launching services...', colors.yellow);
    console.log('\n');

    // Store child process references for cleanup
    const processes = [];

    // Function to handle exit
    function cleanup() {
        log('\n🔴 Shutting down services...', colors.red);
        processes.forEach(proc => {
            try {
                proc.kill('SIGTERM');
            } catch (e) {
                // Ignore
            }
        });
        setTimeout(() => process.exit(0), 1000);
    }

    // Handle process termination
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('exit', cleanup);

    // Start Backend
    log('🟢 Starting Backend (port 5000)...', colors.green);
    try {
        const server = spawn('npm', ['run', 'dev'], {
            cwd: path.join(__dirname, 'backend'),
            stdio: 'pipe',
            shell: true,
            env: {
                ...process.env,
                PORT: '5000',
                HOST: '0.0.0.0',
                NODE_ENV: 'development'
            }
        });

        processes.push(server);

        server.stdout.on('data', (data) => {
            const output = data.toString().trim();
            if (output.includes('Server running')) {
                log(`✓ Backend started: ${output}`, colors.green);
            }
            console.log(`[Backend] ${output}`);
        });

        server.stderr.on('data', (data) => {
            console.error(`[Backend Error] ${data.toString().trim()}`);
        });

        server.on('error', (err) => {
            log(`❌ Backend failed to start: ${err.message}`, colors.red);
        });

    } catch (error) {
        log(`❌ Failed to start backend: ${error.message}`, colors.red);
    }

    // Wait a bit before starting frontend
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Start Frontend
    log('\n🟢 Starting Frontend (port 3000)...', colors.green);
    try {
        const clientEnv = {
            ...process.env,
            HOST: '0.0.0.0',
            PORT: '3000',
            BROWSER: 'none',
            REACT_APP_API_URL: `http://${lanIp}:5000/api`,
            REACT_APP_LAN_IP: lanIp,
            GENERATE_SOURCEMAP: 'false'
        };

        const client = spawn('npm', ['start'], {
            cwd: path.join(__dirname, 'frontend'),
            stdio: 'pipe',
            shell: true,
            env: clientEnv
        });

        processes.push(client);

        client.stdout.on('data', (data) => {
            const output = data.toString().trim();
            if (output.includes('Compiled successfully')) {
                log(`✓ Frontend started: ${output}`, colors.green);
            }
            console.log(`[Frontend] ${output}`);
        });

        client.stderr.on('data', (data) => {
            console.error(`[Frontend Error] ${data.toString().trim()}`);
        });

        client.on('error', (err) => {
            log(`❌ Frontend failed to start: ${err.message}`, colors.red);
        });

    } catch (error) {
        log(`❌ Failed to start frontend: ${error.message}`, colors.red);
    }

    // Display success message after both services are (hopefully) running
    setTimeout(() => {
        console.log('\n\n');
        log('=================================================', colors.bright + colors.green);
        log('     ✅ SWASTIK GOLD & SILVER LAB ONLINE         ', colors.bright + colors.green);
        log('=================================================', colors.bright + colors.green);
        console.log('\n');

        log('📡 ACCESS LINKS:', colors.cyan);
        log(`   Backend API:    http://localhost:5000`, colors.white);
        log(`   Frontend App:   http://localhost:3000`, colors.white);
        log(`   Health Check:   http://localhost:5000/health`, colors.dim);
        console.log('\n');

        log('🌐 NETWORK ACCESS:', colors.cyan);
        log(`   Backend API:    http://${lanIp}:5000`, colors.white);
        log(`   Frontend App:   http://${lanIp}:3000`, colors.white);
        console.log('\n');

        log('🔐 DEFAULT CREDENTIALS:', colors.cyan);
        log(`   Username: admin`, colors.white);
        log(`   Password: admin123`, colors.white);
        console.log('\n');

        log('🛑 TO STOP: Press Ctrl + C', colors.yellow);
        log('=================================================', colors.dim);
        console.log('\n\n');
    }, 5000);
}

// Error handling for the script itself
process.on('uncaughtException', (err) => {
    log(`❌ Uncaught Exception: ${err.message}`, colors.red);
    console.error(err.stack);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    log(`❌ Unhandled Rejection at: ${promise}`, colors.red);
    console.error('Reason:', reason);
});

// Start the application
start();
