# Discord Guild Chat for Darkages

This project can help setup a bidirectional guild chat in a discord server.

##### What does that mean?

It means any guild chat messages in Darkages show up in a discord channel, and any messages in that discord channel show up in-game.

### Setup:

You'll need an admin of the Discord server to setup the integration.

1. Create and install a Discord App following this guide: https://discord.com/developers/docs/quick-start/getting-started#step-1-creating-an-app

   a) Make sure to copy the bot token value

   b) You'll want to give it at least the `Read Message History` and `Send Messages` permissions
2. Copy the `dotenv` file to `.env`, and fill out its values

    a) You can create webhooks for the desired channels by following this guide: https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks

    b) You can find the desired echo channel ID by enabling developer mode (User Settings -> Advanced), and then right clicking a channel
3. Run `npm install`, and `npm start`

## TODO:
- swap messenger Aisling
- other features? any whisper commands / stats?
- linting / simple tests
