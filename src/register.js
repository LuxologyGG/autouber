/**
 * One-time script to register slash commands with Discord.
 * Run with: node src/register.js
 *
 * Requires DISCORD_TOKEN and DISCORD_APPLICATION_ID in .env (or .dev.vars).
 */
require('dotenv').config({ path: '.dev.vars' });
require('dotenv').config(); // fallback to .env

const token = process.env.DISCORD_TOKEN;
const applicationId = process.env.DISCORD_APPLICATION_ID || process.env.DISCORD_APP_ID || process.env.DISCORD_CLIENT_ID;

if (!token || !applicationId) {
  console.error('DISCORD_TOKEN and DISCORD_APPLICATION_ID (or DISCORD_APP_ID) must be set.');
  process.exit(1);
}

const commands = [
  {
    name: 'start',
    description: 'Open the AutoUber order panel',
    type: 1,
  },
];

async function registerCommands() {
  const guildId = process.env.DISCORD_GUILD_ID;
  const url = guildId
    ? `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`
    : `https://discord.com/api/v10/applications/${applicationId}/commands`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Failed to register commands (${res.status}): ${text}`);
    process.exit(1);
  }

  console.log(`Commands registered ${guildId ? `for guild ${guildId}` : 'globally'}.`);
}

registerCommands();
