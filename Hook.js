let sdk = require("./lib/sdk");
let Promise = sdk.Promise;
let request = require("request");
let config = require("./config");
let faker = require('faker');
const log4js = require("log4js");
const logger = log4js.getLogger();
logger.level = "DEBUG";
/**
 * Generates a random user using the Faker library
 *
 * @returns {string}
 */
function random_user() {
    return 'Hello World!';
}

module.exports = {
    botId: config.bot.id,
    botName: config.bot.name,
    on_user_message: function (requestId, data, callback) {
        logger.debug(`on_user_message()=> requestId:${requestId}, data.message: ${data.message}`);
        sdk.sendBotMessage(data, callback);
    },
    on_bot_message: function (requestId, data, callback) {
        logger.debug(`on_bot_message()=> requestId:${requestId}, data.message: ${data.message}`);
        sdk.sendUserMessage(data, callback);
    },
    on_webhook: function (requestId, data, componentName, callback) {
        logger.debug(`on_bot_message()=> requestId:${requestId}, componentName: ${componentName}, data.message: ${data.message}`);
        logger.debug(`on_webhook()=> requestId:${requestId}, componentName: ${componentName}, data.message: ${data.message}`);
        if (componentName === "RandomUser") {
            data.context.randomUser = random_user();
        }
        callback(null, data);
    },
    on_agent_transfer: function (requestId, data, callback) {
        logger.debug(`on_agent_transfer()=> requestId:${requestId}, data.message: ${data.message}`);
        return callback(null, data);
    },
    on_event: function (requestId, data, callback) {
        logger.debug(`on_event() => ${JSON.stringify(data.event)}, ${data.context.intent}`);
        return callback(null, data);
    }
};
