const { execSync } = require('child_process');

const killPort = (port) => {
  try {
    const output = execSync(`netstat -ano | findstr ":${port} LISTENING"`, { encoding: 'utf-8' });
    const lines = output.trim().split('\n');
    
    for (const line of lines) {
      const pidMatch = line.match(/LISTENING\s+(\d+)/);
      if (pidMatch) {
        const pid = pidMatch[1];
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
      }
    }
  } catch (e) {
    // Port is not in use
  }
};

console.log('Killing servers...');
killPort(3000);
killPort(5173);
console.log('Done.');
