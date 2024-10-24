const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const num = process.argv[2] || 0;

// Adjusted storage path
const port = 4000 + parseInt(num, 10);
const storagePath = path.join(__dirname, `../storage/${num}`);
const processName = `groupfi-ai-bot-prod-${num}`;

// Ensure the storage folder exists
if (!fs.existsSync(storagePath)) {
  fs.mkdirSync(storagePath, { recursive: true });
  console.log(`Created storage folder: ${storagePath}`);
} else {
  console.log(`Storage folder already exists: ${storagePath}`);
}

// Print dynamic values to the console
console.log(`Starting with port: ${port}, storage path: ${storagePath}, name: ${processName}`);

// Construct the PM2 start command
const command = `cross-env NODE_ENV=production PORT=${port} STORAGE_PATH=${storagePath} pm2 start dist/server.js --name ${processName} --update-env`;

// Execute the command
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
