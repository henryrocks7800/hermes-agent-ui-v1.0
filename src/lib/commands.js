// Mirrors hermes_cli/commands.py COMMAND_REGISTRY
export const COMMANDS = [
  // Session
  { name: 'new',        aliases: ['reset'],    description: 'Start a new session',                         category: 'Session',       args: '' },
  { name: 'clear',      aliases: [],           description: 'Clear screen and start a new session',        category: 'Session',       args: '' },
  { name: 'history',    aliases: [],           description: 'Show conversation history',                   category: 'Session',       args: '' },
  { name: 'save',       aliases: [],           description: 'Save the current conversation',               category: 'Session',       args: '' },
  { name: 'retry',      aliases: [],           description: 'Retry the last message',                      category: 'Session',       args: '' },
  { name: 'undo',       aliases: [],           description: 'Remove the last exchange',                    category: 'Session',       args: '' },
  { name: 'title',      aliases: [],           description: 'Set a title for the current thread',          category: 'Session',       args: '[name]' },
  { name: 'branch',     aliases: ['fork'],     description: 'Branch the current session',                  category: 'Session',       args: '[name]' },
  { name: 'compress',   aliases: [],           description: 'Manually compress conversation context',      category: 'Session',       args: '' },
  { name: 'rollback',   aliases: [],           description: 'List or restore filesystem checkpoints',      category: 'Session',       args: '[number]' },
  { name: 'stop',       aliases: [],           description: 'Kill all running background processes',       category: 'Session',       args: '' },
  { name: 'background', aliases: ['bg'],       description: 'Run a prompt in the background',              category: 'Session',       args: '<prompt>' },
  { name: 'btw',        aliases: [],           description: 'Ephemeral side question (no tools)',          category: 'Session',       args: '<question>' },
  { name: 'queue',      aliases: ['q'],        description: "Queue a prompt for the next turn",            category: 'Session',       args: '<prompt>' },
  { name: 'resume',     aliases: [],           description: 'Resume a previously-named session',           category: 'Session',       args: '[name]' },
  // Configuration
  { name: 'model',      aliases: [],           description: 'Switch model for this session',               category: 'Configuration', args: '[model] [--global]' },
  { name: 'provider',   aliases: [],           description: 'Show available providers',                    category: 'Configuration', args: '' },
  { name: 'config',     aliases: [],           description: 'Show current configuration',                  category: 'Configuration', args: '' },
  { name: 'prompt',     aliases: [],           description: 'View/set custom system prompt',               category: 'Configuration', args: '[text]', subcommands: ['clear'] },
  { name: 'personality',aliases: [],           description: 'Set a predefined personality',                category: 'Configuration', args: '[name]' },
  { name: 'verbose',    aliases: [],           description: 'Cycle tool progress: off→new→all→verbose',    category: 'Configuration', args: '' },
  { name: 'yolo',       aliases: [],           description: 'Toggle YOLO mode (skip approval prompts)',    category: 'Configuration', args: '' },
  { name: 'reasoning',  aliases: [],           description: 'Set reasoning effort',                        category: 'Configuration', args: '[level|show|hide]', subcommands: ['none','low','minimal','medium','high','xhigh','show','hide','on','off'] },
  { name: 'skin',       aliases: [],           description: 'Show or change the display theme',            category: 'Configuration', args: '[name]' },
  { name: 'voice',      aliases: [],           description: 'Toggle voice mode',                           category: 'Configuration', args: '[on|off|tts|status]', subcommands: ['on','off','tts','status'] },
  { name: 'statusbar',  aliases: ['sb'],       description: 'Toggle the status bar',                       category: 'Configuration', args: '' },
  // Tools & Skills
  { name: 'tools',      aliases: [],           description: 'Manage tools',                                category: 'Tools',         args: '[list|disable|enable] [name]' },
  { name: 'toolsets',   aliases: [],           description: 'List available toolsets',                     category: 'Tools',         args: '' },
  { name: 'skills',     aliases: [],           description: 'Search, install, inspect, manage skills',     category: 'Tools',         args: '[search|browse|inspect|install]', subcommands: ['search','browse','inspect','install'] },
  { name: 'cron',       aliases: [],           description: 'Manage scheduled tasks',                      category: 'Tools',         args: '[subcommand]', subcommands: ['list','add','create','edit','pause','resume','run','remove'] },
  { name: 'browser',    aliases: [],           description: 'Connect browser tools via CDP',               category: 'Tools',         args: '[connect|disconnect|status]', subcommands: ['connect','disconnect','status'] },
  { name: 'plugins',    aliases: [],           description: 'List installed plugins',                      category: 'Tools',         args: '' },
  { name: 'reload-mcp', aliases: ['reload_mcp'], description: 'Reload MCP servers from config',           category: 'Tools',         args: '' },
  // Info
  { name: 'help',       aliases: [],           description: 'Show available commands',                     category: 'Info',          args: '' },
  { name: 'usage',      aliases: [],           description: 'Show token usage for the current session',    category: 'Info',          args: '' },
  { name: 'insights',   aliases: [],           description: 'Show usage insights and analytics',           category: 'Info',          args: '[days]' },
  { name: 'profile',    aliases: [],           description: 'Show active profile name and home directory', category: 'Info',          args: '' },
  { name: 'platforms',  aliases: ['gateway'],  description: 'Show messaging platform status',              category: 'Info',          args: '' },
  { name: 'paste',      aliases: [],           description: 'Check clipboard for an image and attach it',  category: 'Info',          args: '' },
]

// Build flat lookup including aliases
export const COMMAND_MAP = {}
for (const cmd of COMMANDS) {
  COMMAND_MAP[cmd.name] = cmd
  for (const alias of cmd.aliases) {
    COMMAND_MAP[alias] = cmd
  }
}

// @ context references
export const CONTEXT_REFS = [
  { value: '@diff',    description: 'Git working tree diff' },
  { value: '@staged',  description: 'Git staged diff' },
  { value: '@file:',   description: 'Attach a file' },
  { value: '@folder:', description: 'Attach a folder' },
  { value: '@git:',    description: 'Git log with diffs (e.g. @git:5)' },
  { value: '@url:',    description: 'Fetch web content' },
]

// Provider model lists (from Hermes setup.py)
export const PROVIDER_MODELS = {
  'openai-codex':  ['gpt-5.4', 'gpt-5.4-mini', 'gpt-5.3-codex', 'gpt-4.1', 'gpt-4o'],
  'openai':        ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4-turbo'],
  'anthropic':     ['claude-opus-4.6', 'claude-sonnet-4.6', 'claude-sonnet-4.5', 'claude-haiku-4.5'],
  'openrouter':    ['anthropic/claude-sonnet-4.6', 'google/gemini-2.5-flash', 'openai/gpt-4o', 'deepseek/deepseek-r1'],
  'ollama':        ['llama3.1:8b', 'qwen3-coder', 'mistral', 'gemma3:12b'],
  'lmstudio':      ['default', 'qwen3-coder-30b'],
  'gemini':        ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'],
  'copilot':       ['gpt-5.4', 'gpt-5.4-mini', 'claude-sonnet-4.6', 'gemini-2.5-pro'],
  'custom':        ['gpt-4o-mini', 'qwen3-coder-next'],
}

/**
 * Get slash command completions for a partial input.
 * @param {string} input - text starting with /
 * @returns {Array} matching commands sorted by relevance
 */
export function getCommandCompletions(input) {
  const query = input.slice(1).toLowerCase()
  const parts = query.split(' ')
  const base = parts[0]
  const subQuery = parts[1] ?? null

  // If base command is complete and there's a space — suggest subcommands
  const exactCmd = COMMAND_MAP[base]
  if (exactCmd && subQuery !== null && exactCmd.subcommands?.length) {
    return exactCmd.subcommands
      .filter(s => s.startsWith(subQuery))
      .map(s => ({ type: 'subcommand', value: s, parent: exactCmd.name }))
  }

  // Otherwise suggest matching command names
  return COMMANDS
    .filter(cmd => cmd.name.startsWith(base) || cmd.aliases.some(a => a.startsWith(base)))
    .slice(0, 10)
    .map(cmd => ({ type: 'command', value: cmd.name, description: cmd.description, args: cmd.args, category: cmd.category }))
}

/**
 * Get @ context completions for a partial @ref input.
 */
export function getContextCompletions(input) {
  const lower = input.toLowerCase()
  return CONTEXT_REFS.filter(r => r.value.startsWith(lower))
}
