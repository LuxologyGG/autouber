const { Camoufox } = require('camoufox');
const crypto = require('crypto');
require('dotenv').config();

/**
 * Signs up for a fresh Uber Eats account and places an order.
 *
 * @param {object} orderDetails
 * @param {string} orderDetails.restaurant - Restaurant name or Uber Eats URL
 * @param {string} orderDetails.address    - Delivery address
 * @param {string} orderDetails.items      - Comma-separated list of items to order
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function runOrder({ restaurant, address, items }) {
  const browser = await Camoufox({
    headless: process.env.HEADLESS !== 'false',
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(60000); // 60 seconds

  // Generate a random email for a fresh account
  const randomString = crypto.randomBytes(8).toString('hex');
  const email = `${randomString}@camr.one`;
  const password = process.env.UBER_PASSWORD;

  console.log(`[runOrder] email=${email} restaurant=${restaurant} address=${address} items=${items}`);

  try {
    // ── Step 1: Sign up ───────────────────────────────────────────────────────
    await page.goto('https://www.ubereats.com/signup', { timeout: 60000 });

    await page.waitForSelector('input[type="email"]', { timeout: 60000 });
    await page.fill('input[type="email"]', email);
    await page.getByRole('button', { name: 'Next' }).click();

    await page.waitForSelector('input[type="password"]', { timeout: 60000 });
    await page.fill('input[type="password"]', password);
    await page.getByRole('button', { name: 'Next' }).click();

    // ── Step 2: Set delivery address ──────────────────────────────────────────
    await page.waitForURL('**/feed**', { timeout: 60000 });
    const addressInput = page.getByPlaceholder('Enter delivery address');
    await addressInput.fill(address);
    await page.keyboard.press('Enter');
    // Wait for the address autocomplete to resolve before continuing
    await page.waitForSelector('[data-testid="address-suggestion"]', { timeout: 10000 })
      .then(() => page.locator('[data-testid="address-suggestion"]').first().click())
      .catch(() => page.keyboard.press('Enter')); // fallback if no suggestion dropdown

    // ── Step 3: Navigate to the restaurant ───────────────────────────────────
    const isUrl = restaurant.startsWith('http');
    if (isUrl) {
      await page.goto(restaurant, { timeout: 60000 });
    } else {
      await page.goto(
        `https://www.ubereats.com/search?q=${encodeURIComponent(restaurant)}`,
        { timeout: 60000 }
      );
      // Click the first search result
      await page.locator('[data-testid="store-card"]').first().click();
    }

    // ── Step 4: Add each item to the cart ────────────────────────────────────
    const itemList = items.split(',').map(i => i.trim()).filter(Boolean);
    for (const item of itemList) {
      try {
        const itemLocator = page.getByText(item, { exact: false }).first();
        const count = await itemLocator.count();
        if (count > 0 && await itemLocator.isVisible()) {
          await itemLocator.click();
          // Confirm add-to-cart dialog if present
          const addBtn = page.getByRole('button', { name: /add to order/i });
          if (await addBtn.count() > 0 && await addBtn.isVisible()) {
            await addBtn.click();
          }
        } else {
          console.warn(`[runOrder] Item not found on menu: ${item}`);
        }
      } catch (itemErr) {
        console.warn(`[runOrder] Could not add item "${item}": ${itemErr.message}`);
      }
    }

    // ── Step 5: Go to checkout ────────────────────────────────────────────────
    // Try "View cart" first, fall back to "Go to checkout"
    const viewCartBtn = page.getByRole('button', { name: /view cart/i });
    const checkoutBtn = page.getByRole('button', { name: /go to checkout/i });
    if (await viewCartBtn.count() > 0) {
      await viewCartBtn.click();
    } else {
      await checkoutBtn.click();
    }
    await page.getByRole('button', { name: /place order/i }).click();

    await page.waitForURL('**/order-confirmation**', { timeout: 90000 });
    console.log('[runOrder] Order placed successfully!');
    return { success: true, message: 'Order placed successfully!' };
  } catch (err) {
    console.error('[runOrder] Automation error:', err.message);
    return { success: false, message: `Automation error: ${err.message}` };
  } finally {
    await browser.close();
  }
}

module.exports = { runOrder };

// Allow running directly for manual testing: `node src/playwright-script.js`
if (require.main === module) {
  runOrder({
    restaurant: process.env.TEST_RESTAURANT || 'McDonald\'s',
    address: process.env.TEST_ADDRESS || '350 5th Ave, New York, NY 10118',
    items: process.env.TEST_ITEMS || 'Big Mac',
  }).then(result => console.log('Result:', result));
}
