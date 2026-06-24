const {
  SlashCommandBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
} = require("discord.js")
const errors = require("../errors")

const SOURCE = "SlashCommand"
const INTEGRATION_TYPES = {
  guild: ApplicationIntegrationType.GuildInstall,
  user: ApplicationIntegrationType.UserInstall,
}

const CONTEXTS = {
  guild: InteractionContextType.Guild,
  bot_dm: InteractionContextType.BotDM,
  private_channel: InteractionContextType.PrivateChannel,
}

class SlashCommand {
  constructor({
    name,
    description,
    name_localizations,
    description_localizations,
    options = [],
    subcommands = [],
    groups = [],
    scope = "global",
    nsfw = false,
    integrationTypes = null,
    contexts = null,
    defaultMemberPermissions = null,
  }) {
    if (scope !== "global" && scope !== "guild") {
      errors.invalidValue("scope", `Invalid scope "${scope}".`, SOURCE, {
        expected: '"global" or "guild"',
        received: scope,
      })
    }

    if (typeof name !== "string" || !name.length) {
      errors.invalidValue("name", 'A slash command requires a non-empty "name" (string).', SOURCE, { received: name })
    }

    if (typeof description !== "string" || !description.length) {
      errors.invalidValue("description", `The slash command "${name}" requires a non-empty "description" (string).`, SOURCE, { received: description })
    }
    
    if (options.length > 0 && (subcommands.length > 0 || groups.length > 0)) {
      errors.usage(
        `The slash command "${name}" cannot have top-level options AND subcommands/groups at the same time.`,
        SOURCE,
        { hint: "Discord does not allow mixing the two. Use either top-level options OR subcommands/groups." },
      )
    }

    const builder = new SlashCommandBuilder().setName(name).setDescription(description)

    if (name_localizations) builder.setNameLocalizations(name_localizations)
    if (description_localizations) builder.setDescriptionLocalizations(description_localizations)
    if (nsfw) builder.setNSFW(true)
    if (defaultMemberPermissions !== null && defaultMemberPermissions !== undefined) {
      builder.setDefaultMemberPermissions(defaultMemberPermissions)
    }
    
    if (Array.isArray(integrationTypes) && integrationTypes.length > 0) {
      const resolved = integrationTypes.map((t) => {
        const value = INTEGRATION_TYPES[String(t).toLowerCase()]
        if (value === undefined) {
          errors.invalidValue("integrationTypes", `Invalid integration type "${t}" for command "${name}".`, SOURCE, {
            expected: '"guild" or "user"',
            received: t,
          })
        }
        return value
      })
      builder.setIntegrationTypes(resolved)
    }

    if (Array.isArray(contexts) && contexts.length > 0) {
      const resolved = contexts.map((c) => {
        const value = CONTEXTS[String(c).toLowerCase()]
        if (value === undefined) {
          errors.invalidValue("contexts", `Invalid context "${c}" for command "${name}".`, SOURCE, {
            expected: '"guild", "bot_dm" or "private_channel"',
            received: c,
          })
        }
        return value
      })
      builder.setContexts(resolved)
    }

    for (const opt of options) {
      this._applyOption(builder, opt)
    }

    for (const sub of subcommands) {
      builder.addSubcommand((s) => {
        s.setName(sub.name).setDescription(sub.description)
        if (sub.options) {
          for (const opt of sub.options) this._applyOption(s, opt)
        }
        return s
      })
    }

    for (const group of groups) {
      builder.addSubcommandGroup((g) => {
        g.setName(group.name).setDescription(group.description)
        for (const sub of group.subcommands) {
          g.addSubcommand((s) => {
            s.setName(sub.name).setDescription(sub.description)
            if (sub.options) {
              for (const opt of sub.options) this._applyOption(s, opt)
            }
            return s
          })
        }
        return g
      })
    }

    this.builder = builder
    this.scope = scope
  }
  
  _applyOption(parent, opt) {
    const base = (o) => {
      o.setName(opt.name)
        .setDescription(opt.description)
        .setRequired(opt.required || false)
      return o
    }

    switch (opt.type) {
      case "string":
        parent.addStringOption((o) => {
          base(o)
          if (opt.choices) o.addChoices(...this._normalizeChoices(opt.choices))
          if (opt.min_length !== undefined) o.setMinLength(opt.min_length)
          if (opt.max_length !== undefined) o.setMaxLength(opt.max_length)
          if (opt.autocomplete) o.setAutocomplete(true)
          return o
        })
        break

      case "integer":
        parent.addIntegerOption((o) => {
          base(o)
          if (opt.choices) o.addChoices(...this._normalizeChoices(opt.choices))
          if (opt.min_value !== undefined) o.setMinValue(opt.min_value)
          if (opt.max_value !== undefined) o.setMaxValue(opt.max_value)
          if (opt.autocomplete) o.setAutocomplete(true)
          return o
        })
        break

      case "number":
        parent.addNumberOption((o) => {
          base(o)
          if (opt.choices) o.addChoices(...this._normalizeChoices(opt.choices))
          if (opt.min_value !== undefined) o.setMinValue(opt.min_value)
          if (opt.max_value !== undefined) o.setMaxValue(opt.max_value)
          if (opt.autocomplete) o.setAutocomplete(true)
          return o
        })
        break

      case "boolean":
        parent.addBooleanOption((o) => base(o))
        break

      case "user":
        parent.addUserOption((o) => base(o))
        break

      case "channel":
        parent.addChannelOption((o) => {
          base(o)
          if (opt.channel_types) o.addChannelTypes(...opt.channel_types)
          return o
        })
        break

      case "role":
        parent.addRoleOption((o) => base(o))
        break

      case "mentionable":
        parent.addMentionableOption((o) => base(o))
        break

      case "attachment":
        parent.addAttachmentOption((o) => base(o))
        break

      default:
        errors.invalidValue("opt.type", `Unsupported option type "${opt.type}" for option "${opt.name}".`, SOURCE, {
          expected: "string, integer, number, boolean, user, channel, role, mentionable, attachment",
          received: opt.type,
        })
    }
  }
  
  _normalizeChoices(choices) {
    return choices.map((c) =>
      typeof c === "object" && c !== null ? c : { name: String(c), value: c },
    )
  }

  toJSON() {
    return this.builder.toJSON()
  }

  get name() {
    return this.builder.name
  }
}

module.exports = SlashCommand