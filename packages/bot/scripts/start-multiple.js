const { exec } = require('child_process');

const num = parseInt(process.argv[2], 10);
const env = process.argv[3];

// Validate arguments
if (isNaN(num) || (env !== 'stage' && env !== 'prod')) {
  console.error('Usage: node start-multiple.js <num> <env>');
  console.error('<env> should be either "stage" or "prod"');
  process.exit(1);
}

// Stop all PM2 applications at the beginning
exec('pm2 stop all', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error stopping all PM2 processes: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`Stderr stopping PM2 processes: ${stderr}`);
    return;
  }
  console.log(`Stopped all PM2 processes: ${stdout}`);

  // Run the start script in a loop after stopping all processes
  for (let i = 0; i <= num; i++) {
    const scriptName = `start-${env}.js`;
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
