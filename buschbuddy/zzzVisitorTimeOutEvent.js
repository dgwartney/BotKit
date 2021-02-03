var sdk = require("./lib/sdk");
var config = require('./config.json');
var api = require('./SalesforceLiveChatAPI.js');

var sub = require("./lib/RedisClient.js").createClient(config.redis);
var pub = require("./lib/RedisClient.js").createClient(config.redis);

pub.config("SET", "notify-keyspace-events", "KExA");


sub.on('message', function(channel, msg) {
    if (msg == "expired") {
        console.log("Triggered Feedback Message to User on " + channel + " message : " + msg);
        var id = channel.split(":")[1];
        pub.get(id + ":data", function(err, reply) {
            var tempData = JSON.parse(reply);
            var data = tempData;

            data.toJSON = function() {
                    return {
                        __payloadClass: 'OnMessagePayload',
                        requestId: data.requestId,
                        botId: data.botId,
                        componentId: data.componentId,
                        sendUserMessageUrl: data.sendUserMessageUrl,
                        sendBotMessageUrl: data.sendBotMessageUrl,
                        context: data.context,
                        channel: data.channel,
                        message: "Your conversation with us timed-out. If you need anything else, please provide a summary of what you need help with.",
                        overrideMessagePayload: {
                            body: "Your conversation with us timed-out. If you need anything else, please provide a summary of what you need help with.",
                            isTemplate: false
                        }
                    };
                };
                

            return api.endChat(data.context.session_key, data.context.affinity_token, data, isFromRedis = true).then(function(re) {
                // console.log(re);
                /*data.toJSON = function() {
                    return {
                        __payloadClass: 'OnMessagePayload',
                        requestId: data.requestId,
                        botId: data.botId,
                        componentId: data.componentId,
                        sendUserMessageUrl: data.sendUserMessageUrl,
                        sendBotMessageUrl: data.sendBotMessageUrl,
                        context: data.context,
                        channel: data.channel,
                        message: "Thanks for reaching out today. I've ended this chat. If you need anything else, please provide a summary of what you need help with. Have a great day.",
                        overrideMessagePayload: {
                            body: "Thanks for reaching out today. I've ended this chat. If you need anything else, please provide a summary of what you need help with. Have a great day.",
                            isTemplate: false
                        }
                    };
                };
                sdk.sendBotMessage(data);*/
                return;
            });

        });
       
    }
});

function addEvent(data, time) {
    //var uuid = data.channel.type + "/" + data.channel.from;
    var type = data.channel.type || data.channel.channelInfos.type; 
    var from = data.channel.from || data.channel.channelInfos.from;
    var uuid = type + "/" + from;
    console.log("Visitor time out event starting...", uuid)

    time = 240 ;//parseInt(time) || 300;
    pub.set(uuid, JSON.stringify(data));
    pub.set(uuid + ":data", JSON.stringify(data));
    pub.expire(uuid, time);
    sub.subscribe("__keyspace@0__:" + uuid);
}

function deleteEvent(data) {
    //var uuid = data.channel.type + "/" + data.channel.from;
    var type = data.channel.type || data.channel.channelInfos.type; 
    var from = data.channel.from || data.channel.channelInfos.from;
    var uuid = type + "/" + from;
    console.log("delete event", uuid);
    pub.del(uuid);
}
module.exports = {
    add: addEvent,
    delete: deleteEvent
}