import dotenv from "dotenv";
// @ts-ignore until we update darkages package to typescript
import Darkages from "darkages";
import {
  Client,
  GatewayIntentBits,
  Message,
  OmitPartialGroupDMChannel,
} from "discord.js";
import { loadParam, loadParams } from "./lib/helpers";
import { guildChat, sendToDarkAges, whisper } from "./lib/darkages";
import { sendToDiscord, waterSpiritRoast } from "./lib/discord";

// actually 64 max length, 61-64 character messages don't pop up
const MAX_GUILD_CHAT_MESSAGE_LENGTH = 60;
const MINUTES_BETWEEN_HEALTH_CHECKS = 5;
const MINUTES_BETWEEN_DARKAGES_WHISPER_CLEARS = 3;

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

function darkAgesClientConfig(darkAgesClient: Darkages.Client): void {
  // Listen for whispers and guild chats in-game
  darkAgesClient.events.on(
    0x0a,
    (packet: { readByte: () => any; readString16: () => string }): void => {
      const channel = packet.readByte(); // need to read the channel byte to get the message, but currently not used
      const message = packet.readString16();
      let guildChatRegExp = /^.* member .* has entered Temuair$/;
      let newMemberRegExp = /^.* has a new member! Welcome .* to the clan$/;
      let worldShoutRegExp = /^\[.*]: .*$/;
      let masterRegExp =
        /^.* has shown to be worth to wear the mantle of Master.$/;
      let caistealAttackedRegExp = /^.* is now attacking Caisteal .*$/;
      let caistealConqueredRegExp = /^.* have conquered Caisteal .*$/;
      let caistealDefendedRegExp =
        /^Caisteal .* has been successfully defended.$/;
      let gameMasterShoutRegExp = /^\w+! .*$/;
      let whisperRegExp = /^\w+" .*$/;

      console.log(`In-game message: '${message}'`);

      // don't force the constant tick to get regexpd
      if (message === " ") {
        lastTick = Date.now();
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
        for (let messenger of additionalDarkAgesCharacters) {
          whisper(
            // todo: make this nicer
            message.substring(0, MAX_GUILD_CHAT_MESSAGE_LENGTH),
            darkAgesUsername,
            darkAgesClient,
          ).then();
        }
      } else if (whisperRegExp.test(message)) {
        for (let messenger of additionalDarkAgesCharacters) {
          if (message.startsWith(messenger)) {
            for (let messenger of additionalDarkAgesCharacters) {
              let messageWithoutWhisperName = message.replace(
                `${messenger}" `,
                "",
              );
              guildChat(messageWithoutWhisperName, darkAgesClient).then();
            }
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
        sendToDiscord(message, discordGuildMessagesUrl);
      } else if (caistealAttackedRegExp.test(message)) {
        sendToDiscord(message, discordGuildMessagesUrl);
      } else if (caistealConqueredRegExp.test(message)) {
        sendToDiscord(message, discordGuildMessagesUrl);
      } else if (caistealDefendedRegExp.test(message)) {
        sendToDiscord(message, discordGuildMessagesUrl);
      }

      // TODO: any special whisper commands?
    },
  );
  // Login the messenger Aisling in Darkages
  darkAgesClient.connect();
}

let client = new Darkages.Client(darkAgesUsername, darkAgesPassword);
darkAgesClientConfig(client);
let lastTick = Date.now();

setInterval(
  async () => {
    // if last tick was more than x minutes ago
    if (
      Date.now() - lastTick >=
      MINUTES_BETWEEN_DARKAGES_WHISPER_CLEARS * 60 * 1000
    ) {
      client = new Darkages.Client(darkAgesUsername, darkAgesPassword);
      darkAgesClientConfig(client);
    }
  },
  MINUTES_BETWEEN_HEALTH_CHECKS * 60 * 1000,
); // minutes in milliseconds

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
      sendToDarkAges(message, client);
    }

    if (discordGuildChannelId === message.channel.id) {
      for (let channelUrl of discordMessagesUrls) {
        sendToDiscord(
          `\`${message.author.displayName}:\` ${message.content}`,
          channelUrl,
        );
      }
      sendToDarkAges(message, client);
      waterSpiritRoast(message); // roast in guild-chat
    }
  },
);

// Login the Discord bot
discordClient.login(discordBotToken).catch((err) => {
  console.error(err);
});
