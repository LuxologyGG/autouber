import { InteractionResponseType, InteractionType, verifyKey } from 'discord-interactions';

/**
 * Cloudflare Worker entry point for the AutoUber Discord bot.
 *
 * Handles Discord HTTP interactions (signature verification, commands, buttons, modals).
 * Note: Camoufox browser automation runs on the separate Node.js process (main.js/bot.js),
 * not here — Cloudflare Workers don't support browser binaries.
 */
export default {
  async fetch(request, env) {
    if (request.method === 'GET') {
      return new Response('AutoUber Discord Bot is running!');
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // Verify Discord request signature
    const signature = request.headers.get('x-signature-ed25519');
    const timestamp = request.headers.get('x-signature-timestamp');
    const rawBody = await request.arrayBuffer();

    const isValid = verifyKey(rawBody, signature, timestamp, env.DISCORD_PUBLIC_KEY);
    if (!isValid) {
      return new Response('Bad request signature', { status: 401 });
    }

    const interaction = JSON.parse(new TextDecoder().decode(rawBody));

    // ── PING (required by Discord during endpoint setup) ──────────────────────
    if (interaction.type === InteractionType.PING) {
      return Response.json({ type: InteractionResponseType.PONG });
    }

    // ── Slash command: /start ─────────────────────────────────────────────────
    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
      if (interaction.data.name === 'start') {
        return Response.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            embeds: [{
              color: 0x06c167,
              title: '🚗 AutoUber – Order Panel',
              description: 'Welcome to AutoUber!\nUse the buttons below to place an Uber Eats order or cancel at any time.',
              fields: [{ name: 'How it works', value: '1. Click **Start Uber Order**\n2. Fill in the order details\n3. Confirm and we handle the rest!' }],
              footer: { text: 'AutoUber • powered by Camoufox' },
              timestamp: new Date().toISOString(),
            }],
            components: [{
              type: 1,
              components: [
                { type: 2, style: 3, label: '🛒 Start Uber Order', custom_id: 'start_order' },
                { type: 2, style: 2, label: '❌ Cancel', custom_id: 'cancel_order' },
              ],
            }],
          },
        });
      }
    }

    // ── Button interactions ───────────────────────────────────────────────────
    if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
      if (interaction.data.custom_id === 'start_order') {
        return Response.json({
          type: 9, // MODAL
          data: {
            custom_id: 'order_modal',
            title: 'Uber Eats Order Details',
            components: [
              { type: 1, components: [{ type: 4, custom_id: 'restaurant', label: 'Restaurant name or Uber Eats URL', style: 1, placeholder: "e.g. McDonald's or https://ubereats.com/...", required: true }] },
              { type: 1, components: [{ type: 4, custom_id: 'address', label: 'Delivery address', style: 1, placeholder: 'e.g. 123 Main St, New York, NY 10001', required: true }] },
              { type: 1, components: [{ type: 4, custom_id: 'items', label: 'Items to order', style: 2, placeholder: 'e.g. Big Mac, Large Fries, Coke', required: true }] },
            ],
          },
        });
      }

      if (interaction.data.custom_id === 'cancel_order') {
        return Response.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: "❌ Order cancelled. Use `/start` whenever you're ready to order.", flags: 64 },
        });
      }
    }

    // ── Modal submission ──────────────────────────────────────────────────────
    if (interaction.type === InteractionType.MODAL_SUBMIT) {
      if (interaction.data.custom_id === 'order_modal') {
        const restaurant = interaction.data.components[0].components[0].value;
        const address = interaction.data.components[1].components[0].value;
        const items = interaction.data.components[2].components[0].value;

        // The Camoufox automation runs on the Node.js bot process (bot.js/main.js).
        // If you want the worker to trigger it, configure AUTOMATION_WEBHOOK_URL in .dev.vars
        // and POST { restaurant, address, items } to that endpoint from here.

        return Response.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            embeds: [{
              color: 0xffa500,
              title: '⏳ Order Queued',
              description: 'Order received! The Camoufox automation will start shortly.',
              fields: [
                { name: '🍽️ Restaurant', value: restaurant },
                { name: '📍 Delivery Address', value: address },
                { name: '📦 Items', value: items },
              ],
              footer: { text: 'AutoUber • powered by Camoufox' },
              timestamp: new Date().toISOString(),
            }],
          },
        });
      }
    }

    return new Response('Unhandled interaction type', { status: 400 });
  },
};
