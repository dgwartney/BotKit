let sdk = require("./lib/sdk");
let config = require("./config");
const jsforce = require('jsforce');
const log4js = require("log4js");
const logger = log4js.getLogger();
logger.level = "DEBUG";

const API_URI = config.api_url;


/**
 * Creates an access via Oauth authentication
 */
function requestAccessToken() {
    let username = config.oauth.username;
    let password = config.oauth.password;
    let conn = new jsforce.Connection({
        oauth2 : {
            loginUrl : config.oauth.token_uri,
            clientId : config.oauth.client_id,
            clientSecret : config.oauth.client_secret,
            redirectUri : config.oauth.redirect_uri
        }
    });

    conn.login(username, password, function(err, userInfo) {
        logger.info("login()");
        if (err) { return console.error(err); }
        // Now you can get the access token and instance URL information.
        // Save them to establish connection next time.
        logger.trace(conn.accessToken);
        logger.trace(conn.instanceUrl);
        // logged in user property
        logger.trace(`authtoken is-> ${conn.accessToken}`);
        cache.set("token", conn.accessToken);
        logger.trace(`Access Token from cache ${cache.get("token")}`);
        return conn.accessToken;
    });
}

/**
 * Requests an access token if not cached.
 *
 * @returns access token
 */
function getJWTToken() {
    if (cache.get("token")) {
        logger.trace(cache.get("token"));
        return cache.get("token");
    } else {
        return requestAccessToken();
    }
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
        data.context.contact_id = Math.round(Math.random() * 1000);
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
