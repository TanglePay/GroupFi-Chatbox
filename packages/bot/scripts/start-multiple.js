const { exec } = require('child_process');
const path = require('path');

const num = parseInt(process.argv[2], 10);
const env = process.argv[3];

// Validate arguments
if (isNaN(num) || (env !== 'stage' && env !== 'prod')) {
  console.error('Usage: node ./scripts/start-multiple.js <num> <env>');
  console.error('<env> should be either "stage" or "prod"');
  process.exit(1);
}

// Path to the script directory
const scriptDir = path.join(__dirname);

// Stop all PM2 applications and then remove them
exec('pm2 stop all && pm2 delete all', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error stopping and deleting all PM2 processes: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`Stderr stopping and deleting PM2 processes: ${stderr}`);
    return;
  }
  console.log(`Stopped and removed all PM2 processes: ${stdout}`);

  // Run the start script in a loop after removing all processes
  for (let i = 0; i <= num; i++) {
    const scriptName = path.join(scriptDir, `start-${env}.js`);
    const command = `node ${scriptName} ${i}`;
    
    console.log(`Running: ${command}`);

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`Stderr: ${stderr}`);
        return;
      }
      console.log(`Stdout: ${stdout}`);
    });
  }
});
