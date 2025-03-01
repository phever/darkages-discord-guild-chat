import dotenv from "dotenv";
import https from "https";
// @ts-ignore until we update darkages package to typescript
import Darkages from "darkages";
import {
  Client,
  GatewayIntentBits,
  Message,
  OmitPartialGroupDMChannel,
} from "discord.js";

// actually 64 max length, 61-64 character messages don't pop up
const MAX_GUILD_CHAT_MESSAGE_LENGTH = 60;
const CHAT_DELAY_MS = 1000;
const DOTENV_DELIMITER = ",";
const SANTITIZE_REGEXP = /[^\x00-\x7F]/g;

// load config
dotenv.config();

// The Aisling that listens and posts to in-game guild chat
const darkAgesUsername = loadParam("MESSENGER_NAME");
const darkAgesPassword = loadParam("MESSENGER_PASSWORD");
const additionalDarkAgesCharacters = loadParams("ADDITIONAL_MESSENGERS");
// discord webhook urls for messages
const discordGuildMessagesUrl = loadParam("DISCORD_MESSAGES_GUILD_WEBHOOK_URL");
const discordMessagesUrls = loadParams("DISCORD_MESSAGES_WEBHOOK_URLS");
// same for logins
const discordGuildLoginsUrl = loadParam("DISCORD_LOGINS_GUILD_WEBHOOK_URL");
const discordLoginsUrls = loadParams("DISCORD_LOGINS_WEBHOOK_URLS");
// discord channel IDs of channel you want to link
const discordGuildChannelId = loadParam("DISCORD_GUILD_CHANNEL_ID");
const discordEchoChannelIds = loadParams("DISCORD_ECHO_CHANNEL_IDS");
const discordBotToken = loadParam("DISCORD_BOT_TOKEN");

const client = new Darkages.Client(darkAgesUsername, darkAgesPassword);

function loadParams(key: string): string[] {
  if (process.env[key]) {
    if (process.env[key].includes(DOTENV_DELIMITER)) {
      return process.env[key].split(DOTENV_DELIMITER);
    }
    return [process.env[key]];
  }

  // return the environment key or exit
  console.log(`.env key "${key}" not found, please fix this and run again`);
  process.exit(1);
}

function loadParam(key: string): string {
  if (process.env[key]) {
    return process.env[key];
  }

  console.log(`.env key "${key}" not found, please fix this and run again`);
  process.exit(1);
}

async function whisper(message: string) {
  for (let messenger of additionalDarkAgesCharacters) {
    const response = new Darkages.Packet(0x19);
    response.writeString8(messenger); // name to whisper
    response.writeString8(message); //message to send
    client.send(response);
    // wait
    await new Promise((res) => setTimeout(res, CHAT_DELAY_MS));
  }
}

async function sendToDarkAges(messages: string[]): Promise<void> {
  for (const message of messages) {
    const response = new Darkages.Packet(0x19);
    response.writeString8("!"); // name to whisper
    response.writeString8(message); //message to send
    client.send(response);
    // wait
    await new Promise((res) => setTimeout(res, CHAT_DELAY_MS));
  }
}

// Function to send the given message string to the channel configured by the webhook
function sendToDiscord(message: string, webhookUrl: string): void {
  const body = JSON.stringify({
    content: message,
  });

  const request = https.request(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    },
  });

  request.write(body);
  request.end();
}

function waterSpiritRoast(message: OmitPartialGroupDMChannel<Message>): void {
  // Roast the water spirit anywhere, lol
  if (message.content.toLowerCase().includes("water spirit")) {
    const responses = [
      "Water Spirit is moist lol",
      "Water Spirit sucks, Gatorade Spirit is better",
      "Look at me I like the lame Water Spirit",
    ];
    let rand = Math.floor(Math.random() * responses.length);
    message.channel.send(responses[rand]);
  }
}

function convertDiscordMessage(
  message: OmitPartialGroupDMChannel<Message>,
): void {
  // Remove any non-ascii characters
  const messages = [];
  const sanitizedDisplayName = message.author.displayName
    .replace(SANTITIZE_REGEXP, "")
    .trim();
  let sanitizedMessage = message.content.replace(SANTITIZE_REGEXP, "");
  if (sanitizedMessage.includes("https://tenor.com/view/")) {
    let gifWords = sanitizedMessage
      .replace("https://tenor.com/view/", "")
      .split("-");
    gifWords = gifWords.filter((x) => x !== "gif" && isNaN(Number(x)));
    sanitizedMessage = gifWords.join("-") + ".gif";
  }
  if (message.attachments.size > 0) {
    for (let attachment of message.attachments.values()) {
      if (attachment.title) {
        sanitizedMessage += `${attachment.title.replace(SANTITIZE_REGEXP, "")} `;
      } else {
        sanitizedMessage += `${attachment.name.replace(SANTITIZE_REGEXP, "")} `;
      }
    }
    sanitizedMessage = sanitizedMessage.trim();
  }

  const whisperMessage = `${sanitizedDisplayName}" ${sanitizedMessage}`;
  if (whisperMessage.length <= MAX_GUILD_CHAT_MESSAGE_LENGTH) {
    sendToDarkAges([whisperMessage]).then();
  } else if (sanitizedMessage.includes(" ")) {
    let words = sanitizedMessage.split(" ");
    let newMessage = `${sanitizedDisplayName}"`;
    for (const word of words) {
      // if the word will cause the chat to exceed max length
      if (newMessage.length + word.length + 1 > MAX_GUILD_CHAT_MESSAGE_LENGTH) {
        messages.push(newMessage);
        newMessage = `${sanitizedDisplayName}" ${word}`;
      } else {
        newMessage += ` ${word}`;
      }
    }
    messages.push(newMessage);
    sendToDarkAges(messages).then();
  } else {
    // no spaces lol
    let maxLength =
      MAX_GUILD_CHAT_MESSAGE_LENGTH - sanitizedDisplayName.length - 2;
    let counter = 0;
    while (counter + maxLength < sanitizedMessage.length) {
      let newMessage = `${sanitizedDisplayName}" ${sanitizedMessage.substring(counter, counter + maxLength)}`;
      messages.push(newMessage);
      counter += maxLength;
    }
    messages.push(
      `${sanitizedDisplayName}" ${sanitizedMessage.substring(counter)}`,
    );
    sendToDarkAges(messages).then();
  }
}

// Listen for whispers and guild chats in-game
client.events.on(
  0x0a,
  (packet: { readByte: () => any; readString16: () => string }): void => {
    const channel = packet.readByte();
    const message = packet.readString16();
    let guildChatRegExp = /^.* member .* has entered Temuair$/;
    let newMemberRegExp = /^.* has a new member! Welcome .* to the clan$/;
    let worldShoutRegExp = /^\[.*]: .*$/;
    let masterRegExp =
      /^.* has shown to be worth to wear the mantle of Master.$/;
    let gameMasterShoutRegExp = /^\w+! .*$/;
    let whisperRegExp = /^\w+" .*$/;

    console.log(`In-game message: '${message}'`);

    // don't force the constant tick to get regexpd
    if (message === " ") {
      return;
      // If it's a guild chat not from the messenger Aisling, then send to discord
    } else if (
      message.startsWith("<!") &&
      !message.startsWith(`<!${darkAgesUsername}`)
    ) {
      for (let url of discordMessagesUrls) {
        sendToDiscord(message, url);
      }
      sendToDiscord(message, discordGuildMessagesUrl);
      // todo: make this nicer
      whisper(message.substring(0, MAX_GUILD_CHAT_MESSAGE_LENGTH)).then();
    } else if (whisperRegExp.test(message)) {
      for (let messenger of additionalDarkAgesCharacters) {
        if (message.startsWith(messenger)) {
          let messageWithoutWhisperName = message.replace(`${messenger}" `, "");
          sendToDarkAges([messageWithoutWhisperName]).then();
        }
      }
      // Send "entered Temuair" messages to discord
    } else if (guildChatRegExp.test(message)) {
      for (let url of discordLoginsUrls) {
        sendToDiscord(message, url);
      }
      sendToDiscord(message, discordGuildLoginsUrl);
      // Send "New member" messages to discord
    } else if (newMemberRegExp.test(message)) {
      for (let url of discordMessagesUrls) {
        sendToDiscord(message, url);
      }
      sendToDiscord(message, discordGuildMessagesUrl);
      // GM Shouts to discord
    } else if (gameMasterShoutRegExp.test(message)) {
      for (let url of discordMessagesUrls) {
        sendToDiscord(message, url);
      }
    }

    // TODO: any special whisper commands?
  },
);

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
discordClient.on(
  "messageCreate",
  (message: OmitPartialGroupDMChannel<Message>) => {
    // Ignore messages from bots, to avoid loops
    if (message.author.bot) return;

    // TODO: figure out server-specific display name
    console.log(
      `Discord message from displayName: ${message.author.displayName} ` +
        `id: ${message.author.id} global name: ${message.author.globalName} ` +
        `discriminator: ${message.author.discriminator} id: ${message.author.id}, in ` +
        `channel ${message.channel}, content: ${message.content}`,
    );

    // If the discord message is from the guild chat channel, send it to the game
    if (discordEchoChannelIds.includes(message.channel.id)) {
      convertDiscordMessage(message);
    }

    if (discordGuildChannelId === message.channel.id) {
      for (let channelUrl of discordMessagesUrls) {
        sendToDiscord(
          `\`${message.author.displayName}:\` ${message.content}`,
          channelUrl,
        );
      }
      convertDiscordMessage(message);
    }

    // waterSpiritRoast(message);
  },
);

// Login the Discord bot
discordClient.login(discordBotToken).catch((err) => {
  console.error(err);
});
