const puppeteer = require('puppeteer');

async function simulateUser(url, waitTime) {
    // Launch a headless browser instance
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    try {
        // Set a realistic user agent to mimic a real user
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36');
        
        // Set viewport size
        await page.setViewport({ width: 1280, height: 800 });

        // Load the target URL and wait until the network is idle
        await page.goto(url, { waitUntil: 'networkidle2' });

        // Keep the page open for the specified wait time to simulate a user staying on the page
        await page.waitForTimeout(waitTime); // Wait time in milliseconds

    } catch (error) {
        console.error('Error simulating user:', error);
    } finally {
        await browser.close();
    }
}

async function simulateAllUsers(url, totalUsers, waitTime) {
    const userPromises = [];

    // Launch all users concurrently
    for (let i = 0; i < totalUsers; i++) {
        userPromises.push(simulateUser(url, waitTime));
    }

    // Wait for all users to complete
    console.log(`Launching ${totalUsers} users...`);
    await Promise.all(userPromises);
    console.log('All user simulations completed.');
}

// Configuration
const url = 'https://prerelease.groupfi.ai';
const totalUsers = 1000;       // Number of users to simulate
const waitTime = 300000;        // 5 minutes in milliseconds

simulateAllUsers(url, totalUsers, waitTime);
