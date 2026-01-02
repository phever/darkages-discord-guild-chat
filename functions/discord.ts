import https from "https";
import { Message, OmitPartialGroupDMChannel } from "discord.js";

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
