const sdk = require("./lib/sdk");
const Promise = sdk.Promise;
const config = require("./config");
const request = require("request");
const log4js = require("log4js");
const logger = log4js.getLogger();
logger.level = "DEBUG";

module.exports = {
    botId: config.bot.id,
    botName: config.bot.name,
    on_user_message: function (requestId, data, callback) {
        logger.debug(`on_user_message()=> requestId:${requestId}, data.message: ${data.message}`);
        if (data.message === 'Hello') {
            data.message = "Hi, How are you?";
            return sdk.sendUserMessage(data, callback);
        } else {
            return sdk.sendBotMessage(data, callback);
        }
    },
    on_bot_message: function (requestId, data, callback) {
        logger.debug(`on_bot_message()=> requestId:${requestId}, data.message: ${data.message}`);
        return sdk.sendUserMessage(data, callback);
    },
    on_webhook: function (requestId, data, componentName, callback) {
        logger.debug(`on_bot_message()=> requestId:${requestId}, componentName: ${componentName}, data.message: ${data.message}`);
        if (componentName === "HookNode") {
            getNutritionInformation()
                .then(function (nutrition_information) {
                    data.context.nutrition_information = nutrition_information;
                    console.log(`${nutrition_information.length} entries returned`);
                    callback(null, data);
                });
        }
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
