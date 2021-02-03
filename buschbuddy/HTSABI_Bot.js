var timestamp = require('console-stamp')(console, {
    pattern: 'dd/mm/yyyy HH:MM:ss.l'
});

var bot = require("./config.json").bot;
var botId = bot.id;
var botName = bot.name;
var sdk = require("./lib/sdk");
var Promise = require("bluebird");
var request = require('request-promise');
var config = require("./config");
var debug = require('debug')("Agent");
var api = require('./SalesforceLiveChatAPI.js');
var _ = require('lodash');
var config = require('./config.json');
var schedular = require('node-schedule');
const NodeCache = require("node-cache");
const cache = new NodeCache();

//var AlertSubscriptionEvent = require("./AlertSubscriptionEvent.js");
//var VisitorTimeOutEvent = require("./VisitorTimeOutEvent.js");

var _map = {}; //used to store secure session ids //TODO: need to find clear map var
var userDataMap = {}; //this will be use to store the data object for each user
var userResponseDataMap = {};
var expectedPortalEvents = {};
var liveAgentConnectedUsers = {};

function stopChat(data, visitorId){
    delete userResponseDataMap[visitorId];
    delete _map[visitorId];
    sdk.clearAgentSession(data);
    console.log("<--------------Agent transfer connection Cancelled--------->")
}

function getPendingMessages(visitorId, session_key, affinity_token) {
    // console.log("getPendingMessages: %s %s %s", visitorId, session_key, affinity_token);
    debug("getPendingMessages: %s %s ", session_key, affinity_token);
    //var licence_id = config.liveagentlicense;
    return api.getPendingMessages(session_key, affinity_token)
        .then(function(res) {
            var data = userDataMap[visitorId];
            // console.log(data);
            data2 = data;
            visitor_id = visitorId
                // console.log("Polling", JSON.stringify(res));
            _.each(res.messages, function(event, key) {
                if (event.type === "ChatEstablished") {
                    // console.log("response.messages  ", res.messages);
                    // console.log("Key   ", key);
                    // console.log('connected ', event);
                    debug('chat established ', event);
                    var timeout = event.message.chasitorIdleTimeout.timeout
                        // console.log(" TTTTTTTTTTTTTTTT ", timeout);
                    data.context.session_key = session_key;
                    data.context.affinity_token = affinity_token;
                    //VisitorTimeOutEvent.add(data, timeout);
                    liveAgentConnectedUsers[visitorId] = true;

                } else if (event.type === "ChatMessage") {
                    debug('replying ', event);
                    data.message = event.message.text;
                    //data._originalPayload.message = data.text;
                    var initials = event.message.name.match(/\b\w/g) || [];
                    initials = ((initials.shift() || '') + (initials.pop() || '')).toUpperCase();
                    // var overrideMessagePayload = {
                    //     body: JSON.stringify({
                    //         "type": "template",
                    //         "payload": {
                    //             "template_type": "live_agent",
                    //             "text": event.message.text,
                    //             "agent_name": initials
                    //         }
                    //     }),
                    //     isTemplate: true
                    // };
                    data.overrideMessagePayload = null;
                    console.warn("<<<<<<<<<<< Message from SFDC >>>>>>>>>>", data.message);
                    var interval = key >= 1 ? 1000 * (key) : 0;
                    // console.log(">>>>>>>>>>>>>>>" , interval);
                    setTimeout(function(tempdata) {
                        return sdk.sendUserMessage(tempdata, function(err) {
                             console.log("err is-->", err);

                            if (err) {
                                return api.endChat(session_key, affinity_token).then(function(re) {
                                    console.log("end chat reached"+re)
                                    stopChat(data, visitorId);
                                    // delete userDataMap[visitorId];
                                    // delete _map[visitorId];
                                    // sdk.clearAgentSession(data);
                                    data.message = "Thank you for reaching out today. It seems you are not connected."
                                    return sdk.sendUserMessage(data);
                                });
                            }
                        }).catch(function(e) {
                            console.warn("Getting error while End chat");
                            // console.log(e);
                        });
                    }, interval, _.clone(data));
                } else if (event.type==="ChatEnded" || event.type==="chat_closed") {
                    console.log("chat_closed");
                    stopChat(data, visitorId);
                    data.message = "Thank you for reaching out today. I've left this chat. Have a great day.";
                    sdk.sendUserMessage(data);
                } else if (event.type === "ChatRequestFail") {
                    console.warn('<<<<<<<<<<<<<<<<< Agent is unavailbale >>>>>>>>>>>>>>>>>');
                    stopChat(data, visitorId);
                    data.message = "Sorry! There are no agents available right now.\n Please check back later ";
                    sdk.sendUserMessage(data);
                } else {
               //     stopChat(data, visitorId);
                    console.warn('unknown event type, ')
                    console.warn(event.type);
                    sdk.sendUserMessage(data);
                }
            });
        })
        .catch(function(e) {
            console.error("error " + e.message);
        });
}


schedular.scheduleJob('*/2 * * * * *', function() {
    // console.log("***********************");
    debug('schedular triggered');
    var promiseArr = [];
    _.each(_map, function(entry) {
        promiseArr.push(getPendingMessages(entry.visitorId, entry.session_key, entry.affinity_token));
    });
    return Promise.all(promiseArr).then(function() {
        debug('scheduled finished');
    }).catch(function(e) {
        debug('error in schedular', e);
    });
});

function IsJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

function isEmpty(obj) {
    for (var prop in obj) {
        if (obj.hasOwnProperty(prop))
            return false;
    }

    return JSON.stringify(obj) === JSON.stringify({});
}



function getHistoryString(messages) {
    return new Promise(function(resolve, reject) {
        var str = "";
        //messages = messages.length > 0 ? messages.reverse() : [];
        messages = messages.length > 0 ? messages : [];
        messages.forEach(function(message) {
            if (message.components && message.components[0].cT == "text")
                var text = message.components[0].data.text;
            if (IsJsonString(text) && isNaN(text)) {
                // console.log("In")
                var template = JSON.parse(text);
                if (template && template.payload.template_type === "button") {
                    str = str + "Bot: " + template.payload.text + "\n";
                    template.payload.buttons.forEach(function(button) {
                        str = str + "       " + button.title + "\n";
                    });
                } else if (template && template.payload.template_type === "live_agent") {
                    str = str + "Bot: " + template.payload.text + "\n";
                } else {

                }
                str = str + "\n";
            } else {
                if (message.type === "incoming" ){//&& !(historyIgnoreMessages && historyIgnoreMessages.indexOf(text.trim().toUpperCase()) > -1)) {
                    str = str + "Visitor: " + text + "\n\n";
                } else if (message.type === "outgoing") {
                    str = str + "Bot: " + text + "\n\n";
                }
            }

        });
        resolve(str);
    });
}


function getAllHistory(userId, offset) {
    // console.log("In get all history")
    offset = offset || 0;
    var limit = 10;
    return gethistory(userId, limit, offset)
        .then(function(messages) {
            messages = messages || [];

            if (messages.length == 10) {
                return getAllHistory(userId, offset + 10)
                    .then(function(res) {
                        // return messages.concat(res);
                        console.log("Chat history message returened--->"+messages)
                        return res.concat(messages)
                    });
            }
            return messages;
        }).catch(function(e) {
             console.log("error here"+e.message);
        });
}

function gethistory(userId, limit, offset) {
    // console.log("********************$$$$$$$$$$$$$&&&&&&&&&&&&&&&&");
    var data = userDataMap[userId];
    return new Promise(function(resolve, reject) {
        if (data) {
            data.limit = limit;
            data.offset = offset;
            data.channelType = "rtm";
            sdk.getMessages(data, function(err, resp) {
                if (err) {
                    // console.log("err", err);
                    return reject(err);
                }
         //       console.log("History messages"+JSON.stringify(resp.messages))
                return resolve(resp.messages);
            });
        } else {
            var error = {
                msg: "Invalid user",
                code: 401
            };
            return reject(error);
        }
    });
}

function getChatButton(developerName) {
    return api.authorization()
        .then(function(auth) {
            return api.getChatButtons(developerName, auth.access_token)
                .then(function(buttons) {
                    return buttons[0];
                })
        });
}



function connectToAgent(requestId, data, cb) {
     console.log("connecto to agent")
    var visitorId = _.get(data, 'channel.channelInfos.from');
    if (!visitorId) {
        visitorId = _.get(data, 'channel.from');
    }
    userDataMap[visitorId] = data;

    data.message = "An Agent will be assigned to you shortly!!!";
    data.overrideMessagePayload = null;
    sdk.sendUserMessage(data, cb);

    return api.getSession()
        .then(function(session) {
            var customData = _.get(data, 'context.session.BotUserSession.lastMessage.messagePayload.botInfo.customData', {});
            var botUserSession = _.get(data, 'context.session.BotUserSession');
            var options = customData || {};
            var Metro = data.context.session.BotUserSession.Metro || customData.Metro || "New York";
            var isProactive = _.get(customData, "isProactive", false);
            var MasterLabel = isProactive ? Metro + " Proactive" : Metro;
            options.IP_Address = _.get(customData, "Ip-Address");
            options.UserAgent = _.get(customData, "UserAgent");
            options.VisitorName = _.get(botUserSession, "visitor_email", "Visitor");
            options.visitor_email = _.get(botUserSession, "visitor_email");
            options.Metro = Metro;
            options.job_search_location = botUserSession.zipcode;
            options.Visitor_Type__c = botUserSession.visitorType;
            options.Proactive__c = isProactive;
            options.Chat_Transferred_from_Kore__c = config.chatAllowedMetros.indexOf(Metro.toLowerCase()) > -1 ? true : false;
            
            var buttonId = data.context.session.BotUserSession.buttonId;
            options.buttonId = buttonId;
            return api.initChat(session, options)
                .then(function(res) {
                    _map[visitorId] = {
                        session_key: session.key,
                        affinity_token: session.affinityToken,
                        visitorId: visitorId,
                        last_message_id: 0
                    };
                    if (config.chatAllowedMetros.indexOf(Metro.toLowerCase()) > 2) {
                        return getAllHistory(visitorId).then(function(messages) {
                            return getHistoryString(messages).then(function(str) {
                                var message = {
                                    text: str
                                }
                                console.log("messages from history"+message)
                                return api.sendMsg(session.key, session.affinityToken, message)
                                    .catch(function(e) {
                                        console.log("########inside send message error#####")
                                        console.error(e);
                                        delete userDataMap[visitorId];
                                        delete _map[visitorId];
                                    });
                            });
                        });
                    } else {
                        if (data.context.entities && data.context.entities.WelcomeMessage) {
                            var message = {
                                text: data.context.entities.WelcomeMessage
                            }
                            return api.sendMsg(session.key, session.affinityToken, message)
                                .catch(function(e) {
                                    console.error("Send message error"+e);
                                    delete userDataMap[visitorId];
                                    delete _map[visitorId];
                                    return;
                                });
                        }
                    }
                });
        }).catch(function(err) {
            console.warn("live agent transfer failed", err);
             stopChat(data, visitorId);
             data.message = "Sorry! There are no agents available right now.\n Please check back later or try us on our phone at\n02 200 60 50 or email \n at CSC.OnTrade.DD.BE@ab-inbev.com"
             data.overrideMessagePayload = null;
             return sdk.sendUserMessage(data);
        });
}


function onBotMessage(requestId, data, cb) {
//   console.log("Context is --->"+JSON.stringify(data))
    if(IsJsonString(data.message) ){
        console.log("onBotMessage intent:", data.context.intent, "msg:->",JSON.parse(data.message).payload.text);
        if(JSON.parse(data.message).payload.text === "Are you satisfied with the answers I've given you?"){
            var caseid=data.context.caseId;
            var contactid ="";

           
            if(data.context.createContactId === "NA"){
                contactid=data.context.contactId;
            }else{
                contactid=data.context.createContactId;
            }
            // var brandid="";
            // if(data.context.entities.BuschType==="Busch"){
            //     brandid="aCi0B000000CtmZSAS"
            // }else if(data.context.entities.BuschType==="Busch Light"){
            //     brandid="aCi0B000000CtmbSAC";
            // }else if(data.context.entities.BuschType==="Busch Ice"){
            //     brandid="aCi0B000000CtmaSAC";
            // }else if(data.context.entities.BuschType==="Busch Non-Alcoholic"){
            //     brandid="aCi0B000000CtmcSAC"
            // }

            var brandid="";
            if(data.context.entities.BuschType==="BSH"){
                brandid="aCi5C0000004L4u"
            }else if(data.context.entities.BuschType==="BHL"){
                brandid="aCi5C0000004L4z";
            }else if(data.context.entities.BuschType==="IBH"){
                brandid="aCi5C0000004L54";
            }else if(data.context.entities.BuschType==="BNA"){
                brandid="aCi5C0000004L59"
            }

            var dataClosed = {
                "Status": "Closed",
                "Origin": "Chat",
                "B2C_Brand__c":brandid,
                "Priority":"Medium",
                 "RecordType": {
                     "Name": "Inquiry"
                   },
            "B2C_Do_Not_Communicate_For_This_Case__c":"false",
                "B2C_Subject1__c" : "Availability",
                "ContactId" :contactid
            }
            var optionsClosed = {
                method: 'PATCH',
                body: dataClosed,
                uri: 'https://naz--nazdinosit.cs62.my.salesforce.com/services/data/v47.0/sobjects/case/'+caseid,
                headers: {
                    'content-type': 'application/json',
                    "Authorization":"Bearer "+api.getJWTToken()
                },
                json: true
            };
            console.log(" options:" + JSON.stringify(optionsClosed));
            request(optionsClosed).then(function (respc) {
               console.log("Case closed-->"+JSON.stringify(respc));
           }).catch(function (err) {
               console.log(JSON.stringify(err))
           });


        }
    }

    
    
    var visitorId = _.get(data, 'channel.from');
    var entry = _map[visitorId];
    if (data.message.length === 0 || data.message === '') {
        return;
    }

    //* handle good-byes
    if(data.message.trim() == "OK, bye for now!")
    {   
        stopChat(data, visitorId);
        return sdk.sendUserMessage(data);
    }//*/

    var message_tone = _.get(data, 'context.message_tone');
    if (message_tone && message_tone.length > 0) {
        var angry = _.filter(message_tone, {
            tone_name: 'angry'
        });
        // handle are we angry - straight to agent!
        if (angry.length) {
            angry = angry[0];
            if (angry.level >= 1 && (data.context && data.context.intent != "Agent Chat")) {
                console.log("<<<<<<<<<<<<<<<< ANGRY LEVEL >>>>>>>>>>>>>>>>");
                onAgentTransfer(requestId, data, cb);
                data.message = "Transfering you to an agent ...";
                data.overrideMessagePayload = null;
                data.metaInfo = { setBotLanguage: "en" }
                return sdk.sendBotMessage(data);
            } else {
                console.debug("not angry enough1", angry);
                sdk.sendUserMessage(data, cb);
            }
        } else {
            console.debug("Angry level not exist");
            sdk.sendUserMessage(data, cb);
        }
    } else if (!entry) {
        sdk.sendUserMessage(data, cb);
    } else {
        console.error("entry found - no sdk.sendUserMessage");
    }
}

function saleforceAPIInvocation(data,cb){
    if(data.context.entities.Email){
        var optInVal="false"
        if(data.context.entities.optIn && data.context.entities.optIn === "yes")
        {
            optInVal="true"
        }

        console.log("inside talk to  person")
       

           var getEmail = {
               method: 'GET',
               uri: 'https://naz--nazdinosit.cs117.my.salesforce.com/services/data/v47.0/query/?q=SELECT+Id+from+Contact+where+Email='+'\''+data.context.entities.Email +'\''
            ,
               headers: {
                   'content-type': 'application/json',
                   "Authorization":"Bearer "+ api.getJWTToken()
               }
           };
           console.log(" options:-->" + JSON.stringify(getEmail));
           return request(getEmail).then(function (res) {
               console.log("Does the contact exists"+JSON.stringify(res));
               var resp = JSON.parse(res);

               if(resp.totalSize === 1){
                   data.context.confirmed="true";
                   var ctctId = JSON.parse(res).records[0].Id
                   data.context.contactId=ctctId;
                   var getContactDetails = {
                       method: 'GET',
                       uri: 'https://naz--nazdinosit.cs117.my.salesforce.com/services/data/v47.0/sobjects/Contact/'+ctctId
                    ,
                       headers: {
                           'content-type': 'application/json',
                           "Authorization":"Bearer "+ api.getJWTToken()
           
                       }
                   }; 
                   return  request(getContactDetails).then(function (contactResp){
                       var contactRespdet = JSON.parse(contactResp);
                       data.context.zip= contactRespdet.MailingAddress.postalCode;
                       data.context.firstName=contactRespdet.LastName;
                       data.context.contactId=contactRespdet.Id;
                       data.context.emailId=contactRespdet.Email;
                       data.context.contactDetails=contactRespdet;
                       return data;
                   }).catch(function (err) {
                       console.log("Error "+JSON.stringify(err))
                   });
               }else{

                   if(data.context.entities.Email && data.context.entities.Name && data.context.entities.Birthday && data.context.entities.Zip){
                    var dateEntity = data.context.entities.Birthday; 
                    console.log(dateEntity)
                    var dateInput ="";
                    if(dateEntity){ 
                    dateInput = dateEntity.replace(/(\d\d)\/(\d\d)\/(\d{4})/, "$3-$1-$2");
                }
                var firstname="";
                var lastname="";
                if(data.context.entities.Name){
                    var fullName = data.context.entities.Name.split(' '),
                    firstname = fullName[0],
                    lastname = fullName[fullName.length - 1];
                }
                    var dataContact = {
                           "LastName": lastname,
                           "FirstName": firstname,
                           "Email":data.context.entities.Email,
                           "MobilePhone": "",
                           "Status__c": "Active",
                           "MailingPostalCode": data.context.entities.Zip,
                           "B2C_OPT_IN__c" : optInVal,
                           "B2C_Contact_Type__c" : "Consumer",
                           "Birthdate" : dateInput,
                           "B2C_Live_Chat_Optin__c" : "on",
                            "RecordType": {
                                "Name": "ABI B2C"
                              }
                           }
           
                       var createContactOptions = { 
                           method: 'POST',
                           body: dataContact,
                           uri: 'https://naz--nazdinosit.cs117.my.salesforce.com/services/data/v47.0/sobjects/Contact/',
                           headers: {
                               'content-type': 'application/json',
                             //  "Authorization":"Bearer "+auth.access_token
                             "Authorization":"Bearer "+ api.getJWTToken()
   
                           },
                           json: true
                       };
                       console.log("Case Creation options:" + JSON.stringify(createContactOptions));
                       return   request(createContactOptions).then(function (contCreateResp) {
                        //   var contnew = JSON.parse(contCreateResp);
                           console.log("Contact Creation-->"+JSON.stringify(contCreateResp));
                           var newContract= JSON.stringify(contCreateResp);
                         //  console.log("Contact Creation-->"+JSON.parse(contCreateResp).id);
                           data.context.createContactId = (JSON.parse(newContract)).id;
                           data.context.confirmed="true";
                          

                           return data;
                       }).catch(function (err) {
                           console.log("An Error Occured -->"+JSON.stringify(err))
                       });
   
                   }
               }

           }).catch(function (err) {
               console.log("Error "+JSON.stringify(err))
           });


           // return api.getChatButtons(developerName, auth.access_token)
           //     .then(function(buttons) {
           //         return buttons[0];
           //     })
       
      


          // sdk.sendUserMessage(data, cb);
        } 
}

function createCase(data,callback){
    var contactid ="";
    if(data.context.createContactId === "NA"){
        contactid=data.context.contactId;
    }else{
        contactid=data.context.createContactId;
    }
    var dataCaseCreation = {
        "Subject": "In Progress",
        "Status": "New",
        "Origin": "Chat",
        "Priority":"Medium",
         "RecordType": {
             "Name": "Inquiry"
           },
        "B2C_Subject1__c" : "Availability",
    //    "B2C_Subject2__c" : "General",
        "ContactId" :contactid
    }
//First we make a call to create a case and get caseid
// Then we use email to fetch the contact api payload
// If contact does not exist we create a new contact. //payload
//live agent
// We pull history from kore chatbot and pass it to sf
// Make another API call to transactions API which will store this chat history of SF


    var options = {
        method: 'POST',
        body: dataCaseCreation,
        uri: 'https://naz--nazdinosit.cs62.my.salesforce.com/services/data/v47.0/sobjects/case/',
        headers: {
            'content-type': 'application/json',
            "Authorization":"Bearer "+api.getJWTToken()
        },
        json: true
    };
    console.log(" options:" + JSON.stringify(options));
    return request(options).then(function (resCase) {
        console.log("New case is created-->"+JSON.stringify(resCase));
        var casestr = JSON.stringify(resCase);
        data.context.caseId = (JSON.parse(casestr)).id;
//        var caseNew= JSON.parse(resCase);
        return data;   
    }).catch(function (err) {
        console.log(JSON.stringify(err))
    });

}

function gatherFeedback(data,callback){
    
    var feedbackCreation = {
        "B2C_Services_Satisfaction__c": data.context.entities.FeedbackFirst,
        "B2C_Verbatim__c": data.context.entities.FeedbackSecond,
        "Case__c": data.context.caseId
    }
    
//First we make a call to create a case and get caseid
// Then we use email to fetch the contact api payload
// If contact does not exist we create a new contact. //payload
//live agent
// We pull history from kore chatbot and pass it to sf
// Make another API call to transactions API which will store this chat history of SF


    var options = {
        method: 'POST',
        body: feedbackCreation,
        uri: 'https://naz--nazdinosit.cs62.my.salesforce.com/services/data/v47.0/sobjects/Survey_Response__c',
        headers: {
            'content-type': 'application/json',
            "Authorization":"Bearer "+api.getJWTToken()
        },
        json: true
    };
    console.log(" options:" + JSON.stringify(options));
    return request(options).then(function (resCase) {
        console.log("New Feedback is created-->"+JSON.stringify(resCase));
        var contactid ="";

           
        if(data.context.createContactId === "NA"){
            contactid=data.context.contactId;
        }else{
            contactid=data.context.createContactId;
        }
        var brandid="";
        if(data.context.entities.BuschType==="BSH"){
            brandid="aCi5C0000004L4u"
        }else if(data.context.entities.BuschType==="BHL"){
            brandid="aCi5C0000004L4z";
        }else if(data.context.entities.BuschType==="IBH"){
            brandid="aCi5C0000004L54";
        }else if(data.context.entities.BuschType==="BNA"){
            brandid="aCi5C0000004L59"
        }

        var dataClosed = {
            "Status": "Closed",
            "Origin": "Chat",
            "B2C_Brand__c":brandid,
            "Priority":"Medium",
             "RecordType": {
                 "Name": "Inquiry"
               },
        "B2C_Do_Not_Communicate_For_This_Case__c":"true",
            "B2C_Subject1__c" : "Availability",
            "ContactId" :contactid
        }
        console.log("Case closed options:" + JSON.stringify(optionsClosed));
        var optionsClosed = {
            method: 'PATCH',
            body: dataClosed,
            uri: 'https://naz--nazdinosit.cs62.my.salesforce.com/services/data/v47.0/sobjects/case/'+caseid,
            headers: {
                'content-type': 'application/json',
                "Authorization":"Bearer "+api.getJWTToken()
            },
            json: true
        };
        console.log("Case closed options:" + JSON.stringify(optionsClosed));

        request(optionsClosed).then(function (respc) {
               console.log("Case updated with do not communicate flag-->"+JSON.stringify(respc));
               return data;   
           }).catch(function (err) {
               console.log("error message"+JSON.stringify(err))
           });
//        var caseNew= JSON.parse(resCase);
    }).catch(function (err) {
        console.log(JSON.stringify(err))
    });

}



function onUserMessage(requestId, data, cb) {
  //  console.info("onUserMessage", JSON.stringify(data.context.entities));
 //   console.log("onUserMessage"+JSON.stringify(data))
  //  console.log(api.getJWTToken());
//   data.context.entities.Email="abc@def.com"
//stopChat(data, visitorId);
// if(data.agent_transfer === false){
//     stopChat(data, visitorId);
// }

    var visitorId = _.get(data, 'channel.from');
    if (data.channel && !data.channel.channelInfos) {
        data.channel.channelInfos = {
            from: visitorId
        }
    }
    userDataMap[visitorId] = data;

    var entry = _map[visitorId];

    var customData = _.get(data, 'context.session.BotUserSession.lastMessage.messagePayload.botInfo.customData', {});
    var Metro = data.context.session.BotUserSession.Metro || customData.Metro;
    if (!Metro || isEmpty(Metro))
        Metro = "New York";

    var chatAllowedMetros = config.chatAllowedMetros;
    
    if(data.message === 'customData' || data.message === 'custom data'){
        data.message = JSON.stringify(customData);
        return sdk.sendUserMessage(data, cb);
    }

    if (data.message === "quit" || data.message === "#session_closed" || data.message === 'ophouden') {
        if (data.message === "quit" || data.message === 'ophouden') {
            var isVisitorConnectedToLA = liveAgentConnectedUsers[visitorId];
            delete liveAgentConnectedUsers[visitorId];
            if (entry) {
                var session_key = entry.session_key;
                var affinity_token = entry.affinity_token;
                return api.endChat(session_key, affinity_token).then(function(re) {
                    stopChat(data, visitorId);
                    data.message = "You have successfully disconnected from the live agent. If you need anything else, please provide a summary of what you need help with. "
                    data.overrideMessagePayload = null;
                    return sdk.sendUserMessage(data, cb);
                });
            } 
        }
        stopChat(data, visitorId);
        data.message = "You have successfully disconnected from the live agent. If you need anything else, please provide a summary of what you need help with."
        data.overrideMessagePayload = null;
        return sdk.sendUserMessage(data, cb);
    }

    //Metro Check
    if (!entry && (!customData || !Metro || chatAllowedMetros.indexOf(Metro.toLowerCase()) === 2)) {
        if (data.context.session.BotUserSession.isMetroNotSupportingChatBotINITProcessCompleted) {
            return onAgentTransfer(requestId, data, cb);
        } else {
            data.context.session.BotUserSession.isMetroNotSupportingChatBot = "yes"
        }
    }

    // entry check
    if (entry) {
        console.log("Entry  >>>>>>> ", entry);
        var session_key = entry.session_key;
        var affinity_token = entry.affinity_token;
        var message = {
            text: data.message
        }
        data.context.session_key = session_key;
        data.context.affinity_token = affinity_token;
        //VisitorTimeOutEvent.add(data);
        return api.sendMsg(session_key, affinity_token, message)
            .catch(function(e) {
                console.error(e);
                delete userDataMap[visitorId];
                delete _map[visitorId];
                return sdk.sendBotMessage(data, cb);
            });
    } else {
        //VisitorTimeOutEvent.delete(data);
        if (data.message === '*' || data.message === '**' || data.message === '***' || data.message === '****' || data.message === '*****') {
            var text = data.message.length+"";          
            data.message = text;
            console.log("stars replaced--->",data.message);         //return sdk.sendBotMessage(data, cb);
        }
        return sdk.sendBotMessage(data, cb);
    }
}
function IsJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

function onAgentTransfer(requestId, data, callback) {
    console.log("Agent transfer...");

    var visitorId = _.get(data, 'channel.channelInfos.from');
    if (!visitorId) visitorId = _.get(data, 'channel.from');
    userDataMap[visitorId] = data;
    connectToAgent(requestId, data, callback);
}

/*
    Hooks
 */
module.exports = {
    botId: botId,
    botName: botName,
    //*
    closeChat: function(data) {
        //VisitorTimeOutEvent.delete(data);
        var visitorId = _.get(data, 'channel.channelInfos.from');
        if (!visitorId) {
            visitorId = _.get(data, 'channel.from');
        }
        console.debug("close chat for ", visitorId);
        stopChat(data, visitorId);
        // delete userResponseDataMap[visitorId];
        // delete _map[visitorId];
        // // sdk.clearAgentSession(data);
        sdk.sendUserMessage(data);
        /*.then(() => {
            sdk.clearAgentSession(data).then(() => {
                return;
            });
        })*/
    },//*/
    // 1. direct from user
    on_user_message: function(requestId, data, callback) {
        onUserMessage(requestId, data, callback);
    },
    // 2. back from bot
    on_bot_message: function(requestId, data, callback) {
        onBotMessage(requestId, data, callback);
    },
    on_webhook  : function(requestId, data, componentId, callback) {
        console.log('make api call here'+componentId)
        if(componentId ==="sfAPIInvocation"){
        try{

            saleforceAPIInvocation(data,callback).then(function (response) {
                console.log("JSON PARS-------->E"+response)
                callback(null, data)
                }
               // 
            );
        } catch (err) {
        console.log("error in cuproxy", err);
            }
          
        }
        if(componentId ==="sfCreateCase"){
            try{
    
                createCase(data,callback).then(function (response) {
                    console.log("JSON CaseCreation-->"+response)
                    callback(null, data)
                    }
                   // 
                );
            } catch (err) {
            console.log("error ", err);
                }
              
            }
            if(componentId ==="FeedbackHook"){
                try{
        
                    gatherFeedback(data,callback).then(function (response) {
                        console.log("JSON CaseCreation-->"+response)
                        callback(null, data)
                        }
                       // 
                    );
                } catch (err) {
                console.log("error ", err);
                    }
                  
                }
        
    },
    // X. transfer to an agent - SF
    on_agent_transfer: function(requestId, data, callback) {
        onAgentTransfer(requestId, data, callback);
    },
    // X. lsiten to events
    on_event: function(requestId, data, callback) {
        console.log("on_event -->  Event : ", data.event, data.context.intent);
        return callback(null, data);
    }
};

