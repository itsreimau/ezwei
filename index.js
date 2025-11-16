import "dotenv/config";
import { Telegraf } from "telegraf";
import util from "util";
import { exec } from "child_process";

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

// Helper function to check if user is authorized
function isAuthorized(userId) {
    return DEVELOPER_IDS.includes(userId.toString());
}

// Eval command
bot.hears(/^([>|>>])\s+(.+)/, async (ctx) => {
    if (!isAuthorized(ctx.message.from.id)) return;

    try {
        const code = ctx.match[2];
        const result = await eval(ctx.match[1] === ">>" ? `(async () => { ${code} })()` : code);
        await ctx.reply(util.inspect(result, {
            depth: 1
        }).substring(0, 4000));
    } catch (error) {
        await ctx.reply(util.inspect(error, {
            depth: 1
        }).substring(0, 4000));
    }
});

// Exec command
bot.hears(/^\$\s+(.+)/, async (ctx) => {
    if (!isAuthorized(ctx.message.from.id)) return;

    try {
        const command = ctx.match[1];
        const output = await new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(`Error: ${error.message}`));
                } else if (stderr) {
                    reject(new Error(stderr));
                } else {
                    resolve(stdout);
                }
            });
        });
        await ctx.reply(output.toString().substring(0, 4000));
    } catch (error) {
        await ctx.reply(util.inspect(error, {
            depth: 1
        }).substring(0, 4000));
    }
});

// Start bot
bot.launch().then(() => {
    console.log("Bot started");
});

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));