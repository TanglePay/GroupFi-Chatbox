const puppeteer = require('puppeteer');

async function simulateUser(url, waitTime, userNumber) {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    try {
        console.log(`User ${userNumber}: Starting page load for ${url}`);

        // Capture console logs from the browser for every 10th user (adjust as needed)
        if (userNumber % 10 === 0) {
            page.on('console', (msg) => {
                console.log(`User ${userNumber} log:`, msg.text());
            });
        }

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36');
        await page.setViewport({ width: 1280, height: 800 });

        await page.goto(url, { waitUntil: 'load' });
        console.log(`User ${userNumber}: Page load complete`);

        await page.evaluate(() => console.log('Main page JavaScript is running.'));
        
        const frames = page.frames();
        console.log(`User ${userNumber}: Total Frames: ${frames.length}`);

        for (const frame of frames) {
            console.log(`User ${userNumber}: Frame URL: ${frame.url()}`);
            try {
                await frame.evaluate(() => console.log('Frame JavaScript is running.'));
            } catch (frameError) {
                console.error(`User ${userNumber}: Error executing JavaScript in frame:`, frameError);
            }
        }

        // Simulate user staying on the page for `waitTime`
        await new Promise(resolve => setTimeout(resolve, waitTime));

    } catch (error) {
        console.error(`User ${userNumber}: Error simulating user:`, error);
    } finally {
        await browser.close();
        console.log(`User ${userNumber}: Simulation complete, browser closed`);
    }
}

async function simulateUsersConcurrently(url, totalUsers, waitTime) {
    const staggerInterval = 50; // 50ms interval between each user's start
    let usersLaunched = 0;

    const launchUser = (userNumber) => {
        setTimeout(() => simulateUser(url, waitTime, userNumber), userNumber * staggerInterval);
    };

    console.log(`Starting all ${totalUsers} users concurrently with staggered start...`);
    
    for (let i = 1; i <= totalUsers; i++) {
        launchUser(i);
        usersLaunched++;
    }

    console.log(`All ${usersLaunched} users have been launched with staggered start.`);
}

const url = 'https://prerelease.groupfi.ai';
const totalUsers = 1000;
const waitTime = 600000; // 1 minute in milliseconds

simulateUsersConcurrently(url, totalUsers, waitTime);
