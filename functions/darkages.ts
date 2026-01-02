// @ts-ignore until we update darkages package to typescript
import Darkages from "darkages";

const CHAT_DELAY_MS = 1000;

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

export async function sendToDarkAges(
  message: string,
  client: Darkages.Client,
): Promise<void> {
  const response = new Darkages.Packet(0x19);
  response.writeString8("!"); // name to whisper
  response.writeString8(message); //message to send
  client.send(response);
  // wait
  await new Promise((res) => setTimeout(res, CHAT_DELAY_MS));
}
