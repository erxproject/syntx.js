const discord = require("discord.js");
const errors = require("./errors");
const ERXClient = require("./classes/client");
const SlashCommand = require("./classes/SlashCommand.js")
const Embed = require("./classes/embed")
const { Database: SyntxDB, Scope } = require("@erxprojects/syntx-db");
const Buttons = require("./classes/components/buttons");
const SelectMenus = require("./classes/components/selectMenus");
const Modal = require("./classes/components/modal")
const Display = require("./classes/components/display")
const Poll = require("./classes/poll")
const text = require("./functions/random/text");
const number = require("./functions/random/number");
const intents = require("./intents/intents");
const argument = require("./functions/message/argument");
const send = require("./functions/message/sendMessage");
const clientId = require("./functions/client/id");
const avatar = require("./functions/user/avatar");
const mentions = require("./functions/message/mentions");
const content = require("./functions/message/content");
const data = require("./functions/message/data");
const channelId = require("./functions/channel/id");
const ping = require("./functions/client/ping");
const edit = require("./functions/message/edit");
const addReactions = require("./functions/message/addReactions");
const messageId = require("./functions/message/id");
const thread = require("./functions/channel/thread");
const editButton = require("./functions/message/edit/editButtons")
const userInfo = require("./functions/user/info")
const serverInfo = require("./functions/guild/info");
const channelInfo = require("./functions/channel/info");
const roleInfo = require("./functions/role/info")
const createRole = require("./functions/role/create")
const addRole = require("./functions/user/edit/roles/add")
const removeRole = require("./functions/user/edit/roles/remove")
const updateUser = require("./functions/user/edit/nick")
const timeout = require("./functions/user/timeout")
const untimeout = require("./functions/user/untimeout")
const ban = require("./functions/user/ban")
const unban = require("./functions/user/unban")
const channelCreate = require("./functions/channel/create")
const deleteChannel = require("./functions/channel/delete")
const editChannel = require("./functions/channel/edit")

module.exports = {
    ...discord,
    ERXClient,
    SlashCommand,
    Intents: intents,
    Embed,
    SyntxDB,
    Scope,
    errors,
    SyntxError: errors.SyntxError,
    ErrorCodes: errors.ErrorCodes,
    Buttons,
    SelectMenus,
    Modal,
    Display,
    Poll,
    cmd: {
        random: {
            text,
            number
        },
        channel: {
            id: channelId,
            create: Object.assign(channelCreate, { thread }),
            info: channelInfo,
            delete: deleteChannel,
            edit: editChannel
        },
        role: {
            info: roleInfo,
            create: createRole
        },
        message: {
            argument,
            send,
            mentions,
            id: messageId,
            content,
            data,
            addReactions,
            edit: Object.assign(edit, { buttons: editButton })
        },
        client: {
            id: clientId,
            ping
        },
        user: {
            avatar,
            timeout,
            untimeout,
            ban,
            unban,
            info: userInfo,
            edit: {
                nick: updateUser,
                roles: {
                    add: addRole,
                    remove: removeRole
                }
            }
        },
        guild: {
            info: serverInfo
        }
    }
};