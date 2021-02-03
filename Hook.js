var botId = "st-ca84a4f1-2f60-5619-b90f-f48605129d85";
var botName = "Bot SDK Example";
var sdk            = require("./lib/sdk");
var Promise        = sdk.Promise;
var request        = require("request");
var config         = require("./config");
//var mockServiceUrl = config.examples.mockServicesHost + '/cabbot';


var amdApiKey = "<%amdApiKey%>";

//Make request to service app
function getNutritionInformation() {
    return new Promise(function(resolve, reject) {
        request({
            url: "https://www.tapintoyourbeer.com/api/v1/beers",
            method: 'get'
        }, function(err, res) {
            if (err) {
                return reject(err);
            }
	        resolve(JSON.parse(res.body));
        });
    });
}


//Make request to service app
function findAirports(searchTerm) {
    var airportsUrl="http://api.sandbox.amadeus.com/v1.2/airports/autocomplete?apikey="+amdApiKey;
    return new Promise(function(resolve, reject) {
        request({
            url: airportsUrl+"&term="+searchTerm,
            method: 'get',
        }, function(err, res) {
            if (err) {
                return reject(err);
            }
            resolve(JSON.parse(res.body));
        });
    });
}



module.exports = {
    botId   : botId,
    botName : botName,
     on_user_message: function(requestId, data, callback) {
        sdk.sendBotMessage(data, callback);
    },
    on_bot_message: function(requestId, data, callback) {
        sdk.sendUserMessage(data, callback);
    },
    on_webhook: function(requestId, data, componentName, callback) {
        if (componentName == "HookNode") {
            console.log("on_webhook() CALLED");
            getNutritionInformation()
            .then(function(nutrition_information) {
                data.context.nutrition_information = nutrition_information;
		console.log(`${nutrition_information.length} entries returned`);
                callback(null, data);
            });
	}
    },
    on_agent_transfer : function(requestId, data, callback){
        return callback(null, data);
    }
};
