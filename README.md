<p align="center">
  <a href="https://syntx-docs.vercel.app">
    <img width="500" src="https://github.com/rqnjs/website/blob/main/img/syntx.js.png?raw=true" alt="Syntx.js">
  </a>
</p>

<div align="center">
  <b>Create Discord bots faster and easier.</b>
</div>

<br/>

<div align="center">

[![npm version](https://img.shields.io/npm/v/syntx.js.svg?style=flat-square)](https://www.npmjs.org/package/syntx.js) &nbsp;
[![npm downloads](https://img.shields.io/npm/dm/syntx.js.svg)](https://www.npmjs.com/package/syntx.js) &nbsp;
![License](https://img.shields.io/npm/l/syntx.js) &nbsp;
![Node](https://img.shields.io/node/v/syntx.js)

<br/>

  <a href="https://www.npmjs.com/package/dbdteamjs">
    <img width="360" src="https://github.com/rqnjs/website/blob/main/img/dbdteamjs.png?raw=true" alt="Inspired project by dbdteamjs">
  </a>

  <p>
    <a href="https://syntx-docs.vercel.app"><b>Documentation</b></a>
  </p>
</div>

Syntx.js is an npm package built on top of [discord.js](https://discord.js.org/) that simplifies and accelerates the creation of Discord bots. It uses a JSON-based structure and provides helpers for prefix commands, slash commands, embeds, components, polls, and more.

> Requires Node.js ≥ 18.

## Installation

```bash
npm i syntx.js
```

```bash
# or from GitHub
npm i github:erxproject/syntx.js
```

## Table of contents

- [Setting up the client](#setting-up-the-client)
- [Prefix commands](#prefix-commands)
- [Slash commands](#slash-commands)
- [Embeds](#embeds)
- [Components](#components)
- [Polls](#polls)

---

## Setting up the client

```js
const { ERXClient, Intents } = require("syntx.js")

const client = new ERXClient({
    prefix: "!",
    intents: Intents.All,
    token: "YOUR_DISCORD_BOT_TOKEN",
    clientId: "YOUR_APPLICATION_ID"
})

client.ready(() => {
    console.log(`Bot ${client.bot.user.username} is ready!`)
})

client.start()
```

| Option     | Type              | Description                                        |
| ---------- | ----------------- | -------------------------------------------------- |
| `token`    | `string`          | Your bot token from the Discord Developer Portal.  |
| `intents`  | `number \| array` | Gateway intents. Use `Intents.All` or a bitfield.  |
| `prefix`   | `string`          | Prefix for message commands (`!`, `?`, `$`, …).   |
| `clientId` | `string`          | Application ID, required for slash commands.       |
| `database` | `object`          | Optional database instance (e.g. `SyntxDB`).      |

---

## Prefix commands

Register commands with `client.command()` and call `client.registerCommands()` before `client.start()`.

```js
const { ERXClient, Intents, cmd } = require("syntx.js")

const client = new ERXClient({ prefix: "!", intents: Intents.All, token: "TOKEN" })

client.command({
    name: "hi",
    alias: ["hello", "hey"],
    content: async (message) => {
        cmd.message.send({ text: `Hello, ${message.author.username}!` }, message)
    }
})

client.registerCommands()
client.start()
```

---

## Slash commands

Use `SlashCommand` to define the command, `client.slash()` to register it, and `client.registerSlashCommands()` to deploy it to Discord.

```js
const { ERXClient, Intents, SlashCommand } = require("syntx.js")

const client = new ERXClient({ intents: Intents.All, token: "TOKEN", clientId: "CLIENT_ID" })

client.slash({
    data: new SlashCommand({
        name: "ping",
        description: "Replies with Pong!",
        scope: "global" // or "guild"
    }),
    execute: async (interaction) => {
        await interaction.reply("🏓 Pong!")
    }
})

client.ready(async () => {
    await client.registerSlashCommands()
})

client.start()
```

---

## Embeds

```js
const { Embed, cmd } = require("syntx.js")

const embed = new Embed()
embed.set({
    title: "Hello!",
    description: "This is an embed.",
    color: "#5865F2",
    footer: "Syntx.js",
    thumbnail: "https://example.com/icon.png"
})
embed.timestamp()

cmd.message.send({ embeds: [embed.build()] }, message)
```

---

## Components

### Buttons

```js
const { Buttons, cmd } = require("syntx.js")

const row = new Buttons()
row.set([
    { label: "Click me!", style: "Primary", id: "btn-click" },
    { label: "Visit", style: "Link", url: "https://example.com" }
])

cmd.message.send({ text: "Press a button:", components: [row.build()] }, message)
```

Handle the interaction with `client.interaction()` and activate the listener with `client.registerInteractions()`.

```js
client.interaction({
    id: "btn-click",
    content: async (interaction) => {
        await interaction.reply({ content: "You clicked it!", ephemeral: true })
    }
})

client.registerInteractions()
client.start()
```

### Modals

```js
const { Modal } = require("syntx.js")

const modal = new Modal()
modal.set({
    id: "feedback-modal",
    title: "Send Feedback",
    inputs: [{ id: "feedback-input", label: "Your feedback", style: "paragraph" }]
})

// Show the modal on a button click
client.interaction({
    id: "open-modal",
    content: async (interaction) => {
        await interaction.showModal(modal.build())
    }
})

// Handle the submission
client.modal({
    id: "feedback-modal",
    run: async (interaction) => {
        const feedback = interaction.fields.getTextInputValue("feedback-input")
        await interaction.reply({ content: `Thanks! "${feedback}"`, ephemeral: true })
    }
})
```

---

## Polls

```js
const { Poll, cmd } = require("syntx.js")

const poll = new Poll()
poll.set({
    question: "Favorite color?",
    answers: [
        { text: "Red",   emoji: "🔴" },
        { text: "Blue",  emoji: "🔵" },
        { text: "Green", emoji: "🟢" }
    ],
    duration: 24,       // hours
    multiselect: false
})

cmd.message.send({ poll: poll.build() }, message)
```

---

More information in the [documentation](https://syntx-docs.vercel.app).