const { Camoufox } = require('camoufox');
const crypto = require('crypto');
require('dotenv').config();

async function run() {
  const browser = await Camoufox({ headless: false }); // Run in headful mode to observe
  const page = await browser.newPage();
  page.setDefaultTimeout(60000); // 60 seconds

  // Generate a random email
  const randomString = crypto.randomBytes(8).toString('hex');
  const email = `${randomString}@camr.one`;
  const password = process.env.UBER_PASSWORD;

  console.log(`Using email: ${email} and password: ${password}`);

  await page.goto('https://www.ubereats.com/signup', { timeout: 60000 });
  await page.screenshot({ path: 'signup-page.png' });


  // // Wait for the email input field to be visible
  // await page.waitForSelector('input[type="email"]');
  // await page.fill('input[type="email"]', email);

  // // Click the next button
  // await page.getByRole('button', { name: 'Next' }).click();

  // // Wait for the password input field to be visible
  // await page.waitForSelector('input[type="password"]');
  // await page.fill('input[type="password"]', password);

  // // Click the next button
  // await page.getByRole('button', { name: 'Next' }).click();


  // Keep the browser open to observe the result
  // await browser.close();
}

run();
