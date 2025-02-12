import dotenv from "dotenv";
import https from "https";
// @ts-ignore until we update darkages package to typescript
import Darkages from 'darkages';
import { Client, GatewayIntentBits } from "discord.js";

const MAX_GUILD_CHAT_MESSAGE_LENGTH = 64;

// load config
dotenv.config();

// The Aisling that listens and posts to in-game guild chat
const darkAgesUsername = loadParam("MESSENGER_NAME");
const darkAgesPassword = loadParam("MESSENGER_PASSWORD");
const discordMessagesUrl = loadParam("DISCORD_MESSAGES_WEBHOOK_URL");
const discordLoginsUrl = loadParam("DISCORD_LOGINS_WEBHOOK_URL")
const discordBotToken = loadParam("DISCORD_BOT_TOKEN");
const discordEchoChannelId = loadParam("DISCORD_ECHO_CHANNEL_ID");

const client = new Darkages.Client(darkAgesUsername, darkAgesPassword);

function loadParam(key: string): string {
    if (process.env[key]) {
        return process.env[key];
    }

    // return the environment key or exit
    console.log(`dotenv key "${key}" not found, please fix this and run again`);
    process.exit(1);
}

// Function to send the given message string to the channel configured by the webhook
function sendToDiscord(message: string, webhookUrl: string): void {
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
client.events.on(0x0A, (packet: { readByte: () => any; readString16: () => any; }): void => {
    const channel = packet.readByte();
    const message = packet.readString16();
    let guildChatRegExp = /^.* member .* has entered Temuair$/;
    let newMemberRegExp = /^.* has a new member! Welcome .* to the clan$/;

    console.log(`In-game message: '${message}'`);

    // don't force the constant tick to get regexpd
    if (message === ' ') {
        return;
    // If it's a guild chat not from the messenger Aisling, then send to discord
    } else if (message.startsWith('<!') && !message.startsWith(`<!${darkAgesUsername}`)) {
        sendToDiscord(message, discordMessagesUrl);
    // Send "entered Temuair" messages to discord
    } else if (guildChatRegExp.test(message)) {
        sendToDiscord(message, discordLoginsUrl);
    // Send "New member" messages to discord
    } else if (newMemberRegExp.test(message)) {
        sendToDiscord(message, discordLoginsUrl)
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
    console.log(`Logged in as ${discordClient.user?.tag} in Discord!`);
});

// Listen for discord messages
discordClient.on("messageCreate", (message) => {
    // Ignore messages from bots, to avoid loops
    if (message.author.bot) return;

    // TODO: figure out server-specific display name
    console.log(`Discord message from displayName: ${message.author.displayName} id: ${message.author.id} global name: ${message.author.globalName} discriminator: ${message.author.discriminator} id: ${message.author.id}, in  channel ${message.channel}, content: ${message.content}`);

    // If the discord message is from the guild chat channel, send it to the game
    if (message.channel.id === discordEchoChannelId) {
        // Remove any non-ascii characters
        const sanitizedMessage = message.content.replace(/[^\x00-\x7F]/g, '');

        const whisperMessage = `${message.author.displayName}" ${sanitizedMessage}`;
        const trimmedMessage = whisperMessage.substring(0, MAX_GUILD_CHAT_MESSAGE_LENGTH); // Maximum

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
discordClient.login(discordBotToken).catch(
    (err) => {
        console.error(err)
});
