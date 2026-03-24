console.log('src/bot.js is being executed.');
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Slash command definitions
const commands = [
  new SlashCommandBuilder()
    .setName('start')
    .setDescription('Open the AutoUber order panel')
    .toJSON(),
];

// Register slash commands with Discord
async function registerCommands() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID || process.env.DISCORD_APPLICATION_ID || process.env.DISCORD_APP_ID;
  if (!token || !clientId) {
    console.warn(
      'DISCORD_TOKEN or DISCORD_CLIENT_ID is not set – skipping slash command registration.'
    );
    return;
  }

  const rest = new REST({ version: '10' }).setToken(token);
  try {
    const guildId = process.env.DISCORD_GUILD_ID;
    if (guildId) {
      // Guild-scoped registration (instant – good for development)
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: commands,
      });
      console.log(`Slash commands registered for guild ${guildId}.`);
    } else {
      // Global registration (can take up to 1 hour to propagate)
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
      console.log('Slash commands registered globally.');
    }
  } catch (err) {
    console.error('Failed to register slash commands:', err);
  }
}

client.on('clientReady', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  await registerCommands();
});

client.on('messageCreate', msg => {
  if (msg.content === 'ping') {
    msg.reply('pong');
  }
});

// Build the main order panel embed + buttons
function buildOrderPanel() {
  const embed = new EmbedBuilder()
    .setColor(0x06c167) // Uber Eats green
    .setTitle('🚗 AutoUber – Order Panel')
    .setDescription(
      'Welcome to AutoUber!\nUse the buttons below to place an Uber Eats order or cancel at any time.'
    )
    .addFields(
      { name: 'How it works', value: '1. Click **Start Uber Order**\n2. Fill in the order details\n3. Confirm and we handle the rest!' }
    )
    .setFooter({ text: 'AutoUber • powered by Camoufox' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('start_order')
      .setLabel('Start Uber Order')
      .setEmoji('🛒')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('cancel_order')
      .setLabel('Cancel')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row] };
}

// Build the order details modal
function buildOrderModal() {
  const modal = new ModalBuilder()
    .setCustomId('order_modal')
    .setTitle('Uber Eats Order Details');

  const restaurantInput = new TextInputBuilder()
    .setCustomId('restaurant')
    .setLabel('Restaurant name or Uber Eats URL')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g. McDonald\'s or https://ubereats.com/...')
    .setRequired(true);

  const addressInput = new TextInputBuilder()
    .setCustomId('address')
    .setLabel('Delivery address')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g. 123 Main St, New York, NY 10001')
    .setRequired(true);

  const itemsInput = new TextInputBuilder()
    .setCustomId('items')
    .setLabel('Items to order')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('e.g. Big Mac, Large Fries, Coke')
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(restaurantInput),
    new ActionRowBuilder().addComponents(addressInput),
    new ActionRowBuilder().addComponents(itemsInput)
  );

  return modal;
}

client.on('interactionCreate', async interaction => {
  // ── Slash command: /start ──────────────────────────────────────────────────
  if (interaction.isChatInputCommand() && interaction.commandName === 'start') {
    await interaction.reply({ ...buildOrderPanel(), ephemeral: false });
    return;
  }

  // ── Button: Start Uber Order ───────────────────────────────────────────────
  if (interaction.isButton() && interaction.customId === 'start_order') {
    await interaction.showModal(buildOrderModal());
    return;
  }

  // ── Button: Cancel ─────────────────────────────────────────────────────────
  if (interaction.isButton() && interaction.customId === 'cancel_order') {
    await interaction.reply({
      content: '❌ Order cancelled. Use `/start` whenever you\'re ready to order.',
      ephemeral: true,
    });
    return;
  }

  // ── Modal submission ───────────────────────────────────────────────────────
  if (interaction.isModalSubmit() && interaction.customId === 'order_modal') {
    const restaurant = interaction.fields.getTextInputValue('restaurant');
    const address = interaction.fields.getTextInputValue('address');
    const items = interaction.fields.getTextInputValue('items');

    // Defer the reply so Discord doesn't time out during automation (which can take minutes)
    await interaction.deferReply();

    // Lazy-load so startup is fast
    const { runOrder } = require('./playwright-script');

    const queuingEmbed = new EmbedBuilder()
      .setColor(0xffa500)
      .setTitle('⏳ Order Queued')
      .setDescription('Starting Uber Eats automation… this may take a minute.')
      .addFields(
        { name: '🍽️ Restaurant', value: restaurant },
        { name: '📦 Items', value: items },
        { name: '📍 Delivery Address', value: address }
      )
      .setFooter({ text: 'AutoUber • powered by Camoufox' })
      .setTimestamp();

    await interaction.editReply({ embeds: [queuingEmbed] });

    // Run the Playwright automation in the background
    const result = await runOrder({ restaurant, address, items });

    const resultEmbed = new EmbedBuilder()
      .setColor(result.success ? 0x06c167 : 0xff0000)
      .setTitle(result.success ? '✅ Order Placed!' : '❌ Order Failed')
      .setDescription(result.message)
      .addFields(
        { name: '🍽️ Restaurant', value: restaurant },
        { name: '📦 Items', value: items },
        { name: '📍 Delivery Address', value: address }
      )
      .setFooter({ text: 'AutoUber • powered by Camoufox' })
      .setTimestamp();

    await interaction.editReply({ embeds: [resultEmbed] });
    return;
  }
});

const login = () => {
  console.log('Logging in the bot...');
  client.login(process.env.DISCORD_TOKEN);
};

module.exports = {
  client,
  login,
  commands,
  registerCommands,
};
