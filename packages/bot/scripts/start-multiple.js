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

// Function to execute shell commands and handle errors
const executeCommand = (command, description) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        // Ignore the specific warning for "No process found"
        if (stderr.includes('No process found')) {
          console.warn(`[PM2][WARN] No process found, continuing...`);
          resolve();
        } else {
          console.error(`Error during ${description}: ${error.message}`);
          reject(stderr || error.message);
        }
      } else if (stderr) {
        console.error(`Stderr during ${description}: ${stderr}`);
        reject(stderr);
      } else {
        console.log(`${description} completed successfully: ${stdout}`);
        resolve();
      }
    });
  });
};

// Stop all PM2 applications and then remove them
executeCommand('pm2 stop all && pm2 delete all', 'stopping and deleting all PM2 processes')
  .then(() => {
    // Run the start script in a loop after removing all processes
    for (let i = 0; i <= num; i++) {
      const scriptName = path.join(scriptDir, `start-${env}.js`);
      const command = `node ${scriptName} ${i}`;
      
      console.log(`Running: ${command}`);

      executeCommand(command, `starting application ${i}`)
        .catch((error) => {
          console.error(`Error starting application ${i}: ${error}`);
          process.exit(1); // Exit the script with failure if any app fails to start
        });
    }

    // After starting all apps, run the restart.sh script
    executeCommand('/home/ubuntu/botchat/restart.sh', 'running restart.sh')
      .then(() => {
        console.log('All processes started and restart.sh executed successfully');
      })
      .catch((error) => {
        console.error(`Error running restart.sh: ${error}`);
        process.exit(1); // Exit the script with failure if restart.sh fails
      });
  })
  .catch((error) => {
    console.error(`Failed during PM2 stop/delete: ${error}`);
    process.exit(1); // Exit the script with failure if PM2 stop/delete fails
  });
