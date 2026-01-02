import https from "https";
// @ts-ignore until we update darkages package to typescript
import Darkages from "darkages";
import { Message, OmitPartialGroupDMChannel } from "discord.js";
import { sendToDarkAges } from "./darkages";

const SANTITIZE_REGEXP = /[^\x00-\x7F]/g;
const MAX_GUILD_CHAT_MESSAGE_LENGTH = 60;

export function convertDiscordMessage(
  message: OmitPartialGroupDMChannel<Message>,
  client: Darkages.Client,
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
    sendToDarkAges(whisperMessage, client).then();
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
    sendToDarkAges(newMessage, client).then();
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
    let newMessage = `${sanitizedDisplayName}" ${sanitizedMessage.substring(counter)}`;
    sendToDarkAges(newMessage, client).then();
  }
}

// Function to send the given message string to the channel configured by the webhook
export function sendToDiscord(message: string, webhookUrl: string): void {
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

export function waterSpiritRoast(
  message: OmitPartialGroupDMChannel<Message>,
): void {
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
