let sdk = require("./lib/sdk");
let config = require("./config");
let sfdc_config = require("./sfdc-config.json");
const jsforce = require('jsforce');
const log4js = require("log4js");
const logger = log4js.getLogger();
logger.level = "DEBUG";

const API_URI = config.api_url;

/**
 * Create a new contact in Salesforce
 * @param data
 * @param first_name
 * @param last_name
 * @param email
 * @param phone
 */
function createContact(data, first_name, last_name, email, phone) {
    logger.debug(`first_name: ${first_name}`);
    logger.debug(`last_name: ${last_name}`);
    logger.debug(`email: ${email}`);
    const conn = new jsforce.Connection({
        loginUrl: sfdc_config.oauth.token_uri
    })
    conn.login(sfdc_config.oauth.username, sfdc_config.oauth.password, function (err, userInfo) {
        if (err) {
            return logger.error(err)
        }
        logger.debug(conn.accessToken)
        logger.debug(conn.instanceUrl)
        logger.debug(`userInfo: ${JSON.stringify(userInfo)}`);

        // Create contact object
        return conn.sobject('Contact').create(
            {
                FirstName: first_name,
                LastName: last_name,
                Email: email,
                Phone: phone
            },
            function (err, ret) {
                if (err || !ret.success) {
                    return logger.error(err, ret)
                }
                logger.debug(`Created record id : ${ret.id}`)
            }
        );
    });
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
        logger.debug(`on_webhook()=> requestId:${requestId}, componentName: ${componentName}, data.message: ${data.message}`);
        if (componentName === 'CreateSFDCContact') {
            createContact(data,
                data.context.first_name,
                data.context.last_name,
                data.context.email,
                data.context.phone);
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
