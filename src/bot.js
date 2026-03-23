console.log('src/bot.js is being executed.');
const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', msg => {
  if (msg.content === 'ping') {
    msg.reply('pong');
  }
});

const login = () => {
  console.log('Logging in the bot...');
  client.login(process.env.DISCORD_TOKEN);
};

module.exports = {
  client,
  login,
};
