// @ts-ignore until we update darkages package to typescript
import Darkages from "darkages";
import { Message, OmitPartialGroupDMChannel } from "discord.js";

const CHAT_DELAY_MS = 1000;
const MAX_GUILD_CHAT_MESSAGE_LENGTH = 60;
const SANTITIZE_REGEXP = /[^\x00-\x7F]/g;

export async function whisper(
  message: string,
  messenger: string,
  client: Darkages.Client,
): Promise<void> {
  const response = new Darkages.Packet(0x19);
  response.writeString8(messenger); // name to whisper
  response.writeString8(message); //message to send
  client.send(response);
  // wait
  await new Promise((res) => setTimeout(res, CHAT_DELAY_MS));
}

export async function guildChat(
  message: string,
  client: Darkages.Client,
): Promise<void> {
  const response = new Darkages.Packet(0x19);
  response.writeString8("!"); // name to whisper
  response.writeString8(message); //message to send
  client.send(response);
}

export async function sendToDarkAges(
  message: OmitPartialGroupDMChannel<Message>,
  client: Darkages.Client,
): Promise<void> {
  let messages: string[] = [];
  // Remove any non-ascii characters that DarkAges can't handle
  const sanitizedDisplayName = message.author.displayName
    .replace(SANTITIZE_REGEXP, "")
    .trim();
  let sanitizedMessage = message.content.replace(SANTITIZE_REGEXP, "");

  // convert gifs from tenor to just the words
  if (sanitizedMessage.includes("https://tenor.com/view/")) {
    let gifWords = sanitizedMessage
      .replace("https://tenor.com/view/", "")
      .split("-");
    gifWords = gifWords.filter((x) => x !== "gif" && isNaN(Number(x)));
    sanitizedMessage = gifWords.join("-") + ".gif";
  }

  // add other attachment titles/names to the message
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

  // split messages if too long
  if (sanitizedMessage.length <= MAX_GUILD_CHAT_MESSAGE_LENGTH) {
    messages.push(`${sanitizedDisplayName}" ${sanitizedMessage}`);
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
    messages.push(newMessage);
  }

  let i = 0;
  setInterval(async () => {
    if (i >= messages.length) return;
    guildChat(messages[i], client);
    i++;
  }, CHAT_DELAY_MS);
}
