require("dotenv").config();
const { Telegraf } = require("telegraf");
const util = require("util");
const { exec } = require("child_process");

// Validate environment variables
const requiredEnvVars = ["BOT_TOKEN", "DEVELOPER_ID"];
requiredEnvVars.forEach(envVar => {
    if (!process.env[envVar]) throw new Error(`'${envVar}' env var is required!`);
});

const {
    BOT_TOKEN,
    DEVELOPER_ID
} = process.env;
const DEVELOPER_IDS = DEVELOPER_ID.split(",").map(id => id.trim());

// Initialize bot
const bot = new Telegraf(BOT_TOKEN);

// Check if user is authorized
function isAuthorized(userId) {
    return DEVELOPER_IDS.includes(userId.toString());
}

// Send messages in stages
async function sendMessage(ctx, message) {
    const maxLength = 4096;
    for (let i = 0; i < message.length; i += maxLength) {
        await ctx.reply(message.slice(i, i + maxLength));
    }
}

// Eval command
bot.hears(/^==> |^=> /, async (ctx) => {
    if (!isAuthorized(ctx.message.from.id)) return;

    try {
        const code = ctx.message.text.slice(ctx.message.text.startsWith("==> ") ? 4 : 3);
        const result = await eval(ctx.message.text.startsWith("==> ") ? `(async () => { ${code} })()` : code);
        await sendMessage(ctx, util.format(result));
    } catch (error) {
        await sendMessage(ctx, util.format(error));
    }
});

// Exec command
bot.hears(/^\$ /, async (ctx) => {
    if (!isAuthorized(ctx.message.from.id)) return;

    try {
        const command = ctx.message.text.slice(2);
        const output = await util.promisify(exec)(command);
        await sendMessage(ctx, output.stdout || output.stderr);
    } catch (error) {
        await sendMessage(ctx, util.format(error));
    }
});

// Start bot
bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));