let sdk = require("./lib/sdk");
let Promise = sdk.Promise;
let request = require("request");
let config = require("./config");
const log4js = require("log4js");
const logger = log4js.getLogger();
logger.level = "DEBUG";


let amdApiKey = "<%amdApiKey%>";

//Make request to service app
function getNutritionInformation() {
    return new Promise(function (resolve, reject) {
        request({
            url: "https://www.tapintoyourbeer.com/api/v1/beers",
            method: 'get'
        }, function (err, res) {
            if (err) {
                return reject(err);
            }
            resolve(JSON.parse(res.body));
        });
    });
}


//Make request to service app
function findAirports(searchTerm) {
    var airportsUrl = "http://api.sandbox.amadeus.com/v1.2/airports/autocomplete?apikey=" + amdApiKey;
    return new Promise(function (resolve, reject) {
        request({
            url: airportsUrl + "&term=" + searchTerm,
            method: 'get',
        }, function (err, res) {
            if (err) {
                return reject(err);
            }
            resolve(JSON.parse(res.body));
        });
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
