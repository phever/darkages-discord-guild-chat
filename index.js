require('dotenv').config()
const https = require('https');
const Darkages = require('darkages');
const { Client, GatewayIntentBits } = require("discord.js");

/**
 * TODO:
 * - convert to Typescript
 * - linting / simple tests
 * - update README and setup instructions
 * - support sending large messages as multiple in-game chats
 * - swap messenger Aisling
 */

// The Aisling that listens and posts to in-game guild chat
const messenger = process.env.MESSENGER_NAME;
const MAX_GUILD_CHAT_MESSAGE_LENGTH = 64;

const client = new Darkages.Client(messenger, process.env.MESSENGER_PASSWORD);


// Function to send the given message string to the channel configured by the webhook
function sendToDiscord(message, webhookUrl) {
    const body = JSON.stringify({
        content: message
    });

    const request = https.request(webhookUrl, {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
        }
    });

    request.write(body);
    request.end();
}


// Listen for whispers and guild chats in-game
client.events.on(0x0A, packet => {
    const channel = packet.readByte();
    const message = packet.readString16();

    console.log(`In-game message: ${message}`);

    // If it's a guild chat not from the messenger Aisling, then send to discord
    if (message.startsWith('<!') && !message.startsWith(`<!${messenger}`)) {
        sendToDiscord(message, process.env.DISCORD_MESSAGES_WEBHOOK_URL);
    } else if (message.startsWith('Sradagan member')) {
        sendToDiscord(message, process.env.DISCORD_LOGINS_WEBHOOK_URL);
    }

    // TODO: any special whisper commands?
});

// Login the messenger Aisling in Darkages
client.connect();

const discordClient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});


discordClient.once("ready", () => {
    console.log(`Logged in as ${discordClient.user.tag} in Discord!`);
});

// Listen for discord messages
discordClient.on("messageCreate", (message) => {
    // Ignore messages from bots, to avoid loops
    if (message.author.bot) return;

    // TODO: figure out server-specific display name
    console.log(`Discord message from displayName: ${message.author.displayName} id: ${message.author.id} global name: ${message.author.globalName} discriminator: ${message.author.discriminator} id: ${message.author.id}, in  channel ${message.channel.name}, content: ${message.content}`);

    // If the discord message is from the guild chat channel, send it to the game
    if (message.channel.name === 'guild-chat') {
        // Remove any non-ascii characters
        const sanitizedMessage = message.content.replace(/[^\x00-\x7F]/g, '');

        const whisperMessage = `${message.author.displayName}" ${sanitizedMessage}`;
        // Maximum 
        const trimmedMessage = whisperMessage.substring(0, MAX_GUILD_CHAT_MESSAGE_LENGTH);

        const response = new Darkages.Packet(0x19);
        response.writeString8('!'); // name to whisper
        response.writeString8(trimmedMessage); //message to send
        client.send(response);
    }

    // Roast the water spirit anywhere, lol
    if (message.content.toLowerCase().includes('water spirit')) {
        // TODO: multiple randomized responses
        message.channel.send("Water Spirit is moist lol");
    }
});

// Login the Discord bot
discordClient.login(process.env.DISCORD_BOT_TOKEN);
