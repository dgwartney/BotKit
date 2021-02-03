//var sdk = require("./lib/sdk");
var Promise = require('bluebird');
var request = require('request-promise');
var template = require('url-template');
const NodeCache = require("node-cache");
var schedular = require('node-schedule');


const cache = new NodeCache();

var sfdc_config_file = require("./config.json").sfdc_config_file;
var config = require(sfdc_config_file);
var liveAgentUrl = config.live_agent.liveAgentUrl;

//live agent 
var organizationId = config.live_agent.organizationId;
var deploymentId = config.live_agent.deploymentId;
var apiVersion = config.live_agent.apiVersion;
var screenResolution = config.live_agent.screenResolution;
//var userAgent = config.live_agent.userAgent;
var language =config.live_agent.language;

//Oauth
var client_id =config.oauth.client_id;
var client_secret = config.oauth.client_secret;
var username = config.oauth.username;
var password = config.oauth.password;
var redirect_uri= config.oauth.redirect_uri
var SFDC_API_URL = config.SFDC_API_URL;
var SFDC_TOKEN_URL = config.SFDC_TOKEN_URL;
var _ = require('lodash');

var dataObj;
// var VisitorTimeOutEvent = require("./VisitorTimeOutEvent.js");
schedular.scheduleJob('*/59 * * * *', function () {
    authorization();
});


async function getSession() {
    var url = liveAgentUrl + "/System/SessionId";
    console.log("|getSession | salesforceLiveChatAPI.js | ", url);
    var options = {
      method: 'GET',
      uri: url,
      headers: {
        'X-Liveagent-Affinity': 'null',
        'X-Liveagent-Api-Version': 47
      }
    };
    try {
      const res = await request(options);
      console.log("|getSession | salesforceLiveChatAPI.js | success"+res);
      return JSON.parse(res);
    }
    catch (err) {
      console.error("getSession | salesforceLiveChatAPI.js |", err);
      return Promise.reject(err);
    }
  }

async function serverFailtureNotification() {
    console.log("|serverFailtureNotification | salesforceLiveChatAPI.js | started");
    var url = config.instance.notificationUrl;
    var options = {
      method: 'GET',
      uri: url,
      headers: {
      }
    };
    try {
      const res = await request(options);
      console.log("|serverFailtureNotification | salesforceLiveChatAPI.js | ended");
    }
    catch (err) {
      console.error("serverFailtureNotification | salesforceLiveChatAPI.js | ", err);
      return Promise.reject(err);
    }
  }

async function initChat(session, options, caseID) {
    console.log("<<<<<<<<<<<<<<< INIT CHAT >>>>>>>>>>>>>>>")
    var Metro = _.get(options,"Metro", null);
    var visitor_email = _.get(options,"contactId", null);
    // var job_search_location = _.get(options,"job_search_location", null);
    // var resume_submited = _.get(options,"resume_submited", null);

    var buttonId = _.get(options,"buttonId", config.live_agent.buttonId);
    var visitorName = _.get(options,"VisitorName");
    var Visitor_Type__c = _.get(options,"Visitor_Type__c");

    var IP_Address = _.get(options,"IP_Address");
    var userAgent = _.get(options,"UserAgent", config.live_agent.userAgent);
    var Proactive__c = _.get(options, "Proactive__c", false);
    var Chat_Transferred_from_Kore__c =  _.get(options, "Chat_Transferred_from_Kore__c", false);

    var url = liveAgentUrl + "/Chasitor/ChasitorInit"
    
    var sessionId = session.id,
        sessionKey = session.key,
        affinityToken = session.affinityToken;
        
    var prechatDetails = [];
    var prechatEntities = [];


    prechatDetails = [
      {
        "label":"LastName",
        "value":"SFDC",
        "entityMaps":[
           {
              "entityName":"contact",
              "fieldName":"LastName"
           }
        ],
        "transcriptFields":[
           "LastName__c"
        ],
        "displayToAgent":true
     },
     {
        "label":"FirstName",
        "value":"test",
        "entityMaps":[
           {
              "entityName":"contact",
              "fieldName":"FirstName"
           }
        ],
        "transcriptFields":[
           "FirstName__c"
        ],
        "displayToAgent":true
     },
     {
        "label":"Email",
        "value": visitor_email,
        "entityMaps":[
           {
              "entityName":"contact",
              "fieldName":"Email"
           }
        ],
        "transcriptFields":[
           "Email__c"
        ],
        "displayToAgent":true
     },
     {
        "label":"Status",
        "value":"New",
        "entityMaps":[
           {
              "entityName":"Case",
              "fieldName":"Status"
           }
        ],
        "transcriptFields":[
           "caseStatus__c"
        ],
        "displayToAgent":true
     },
     {
        "label":"Origin",
        "value":"Web",
        "entityMaps":[
           {
              "entityName":"Case",
              "fieldName":"Origin"
           }
        ],
        "transcriptFields":[
           "caseOrigin__c"
        ],
        "displayToAgent":true
     },

     {
        "label":"Subject",
        "value":"TestCaseSubject",
        "entityMaps":[
           {
              "entityName":"Case",
              "fieldName":"Subject"
           }
        ],
        "transcriptFields":[
           "subject__c"
        ],
        "displayToAgent":true
     },
     {
        "label":"Description",
        "value":"TestCaseDescriptionShr",
        "entityMaps":[
           {
              "entityName":"Case",
              "fieldName":"Description"
           }
        ],
        "transcriptFields":[
           "description__c"
        ],
        "displayToAgent":true
     }
  ]
  prechatEntities = [
    {
          "entityName":"Contact",         
          "saveToTranscript":"contact",
          "linkToEntityName":"Case",
          "linkToEntityField":"ContactId",
          "entityFieldsMaps":[
            
              {
                "fieldName":"LastName",
                "label":"LastName",
                "doFind":true,
                "isExactMatch":true,
                "doCreate":true
             },
             {
                "fieldName":"FirstName",
                "label":"FirstName",
                "doFind":true,
                "isExactMatch":true,
                "doCreate":true
             },
             {
                "fieldName":"Email",
                "label":"Email",
                "doFind":true,
                "isExactMatch":true,
                "doCreate":true
             }
                        
          ]
       },
        {
          "entityName":"Case",
          "showOnCreate":true,          
          "saveToTranscript":"Case",
          "entityFieldsMaps":[
             {
                "fieldName":"Status",
                "label":"Status",
                "doFind":false,
                "isExactMatch":false,
                "doCreate":true
             },
             {
                "fieldName":"Origin",
                "label":"Origin",
                "doFind":false,
                "isExactMatch":false,
                "doCreate":true
             },  
 
          {
                "fieldName":"Subject",
                "label":"Subject",
                "doFind":false,
                "isExactMatch":false,
                "doCreate":true
             },
             {
                "fieldName":"Description",
                "label":"Description",
                "doFind":false,
                "isExactMatch":false,
                "doCreate":true
             }         
          ]             
         
       }      
       
    ];
  //    console.log(body)
    var body = {
        "organizationId": organizationId,
        "deploymentId": deploymentId,
        "sessionId": sessionId,
        "buttonId": buttonId,
        "screenResolution": screenResolution,
        "userAgent": userAgent,
        "language": language,
        "visitorName": visitorName,
        "prechatDetails": prechatDetails,
        "prechatEntities": prechatEntities,
        "receiveQueueUpdates": true,
        "isPost": true
    };
    
    console.log("Init chat session-->"+JSON.stringify(body));
    var options = {
        method: 'POST',
        uri: url,
        body: body,
        json: true, //
        headers: {
            'X-Liveagent-Sequence': '1',
            'X-Liveagent-Affinity': affinityToken,
            'X-Liveagent-Session-Key': sessionKey,
            'X-Liveagent-Api-Version': apiVersion
        }
    };
    console.log(JSON.stringify(options));
    return request(options).then(function(res) {
        console.log("<<<<<<<<<<<<< INIT CHAT SUCCESSFUL >>>>>>>>>>>>>>>>");
        console.log(res);
            return res;
        })
        .catch(function(err) {
            console.log("<<<<<<<<<<<<<<< INIT CHAT FAILED >>>>>>>>>>>>>>>", err);
            return Promise.reject(err);
        });
}

async function initChat1(session, options) {
    console.log("|initChat | salesforceLiveChatAPI.js | start |", options.buttonId, "|", options.visitorName);
    var buttonId = options.buttonId;
    var visitorName = _.get(options, "VisitorName");
    var userAgent = _.get(options, "UserAgent", config.live_agent.userAgent);
  
    var url = liveAgentUrl + "/Chasitor/ChasitorInit"
    var sessionId = session.id,
      sessionKey = session.key,
      affinityToken = session.affinityToken;
  
    var prechatDetails = [
      {
        "label": "Origin",
        "value": "Live Agent – Chatbot",
        "entityMaps": [
          {
            "entityName": "Case",
            "fieldName": "Origin"
          }
        ],
        "transcriptFields": [
        ],
        "displayToAgent": true
      },
      {
        "label": "Direction",
        "value": "Inbound",
        "entityMaps": [
          {
            "entityName": "Case",
            "fieldName": "ABI_DTT_Direction__c"
          }
        ],
        "transcriptFields": [
        ],
        "displayToAgent": true
      },
      {
        "label": "MyAccountId",
        "value": options.accountId,
        "entityMaps": [
          {
            "entityName": "Account",
            "fieldName": "AccountId"
          }
        ],
        "transcriptFields": [
        ],
        "displayToAgent": true
      },
      {
        "label": "MyContactId",
        "value": options.contactId,
        "entityMaps": [
          {
            "entityName": "Contact",
            "fieldName": "ContactId"
          }
        ],
        "transcriptFields": [
        ],
        "displayToAgent": true
      }
    ]
  
    var prechatEntities = [
      {
        "entityName": "Contact",
        "saveToTranscript": "ContactId",
        "linkToEntityName": "Case",
        "linkToEntityField": "ContactId",
        "entityFieldsMaps": [
          {
            "fieldName": "ContactId",
            "label": "MyContactId",
            "doFind": true,
            "isExactMatch": true,
            "doCreate": false
          },
          {
            "fieldName": "AccountId",
            "label": "MyAccountId",
            "doFind": true,
            "isExactMatch": true,
            "doCreate": false
          }
        ]
      },
      {
        "entityName": "Account",
        "saveToTranscript": "AccountId",
        "linkToEntityName": "Case",
        "linkToEntityField": "AccountId",
        "entityFieldsMaps": [
          {
            "fieldName": "AccountId",
            "label": "MyAccountId",
            "doFind": true,
            "isExactMatch": true,
            "doCreate": true
          }
        ]
      },
      {
        "entityName": "Case",
        "showOnCreate": true,
        "linkToEntityName": null,
        "linkToEntityField": null,
        "saveToTranscript": "Case",
        "entityFieldsMaps": [
          {
            "fieldName": "Origin",
            "label": "Origin",
            "doFind": false,
            "isExactMatch": false,
            "doCreate": true
          },
          {
            "fieldName": "ABI_DTT_Direction__c",
            "label": "Direction",
            "doFind": false,
            "isExactMatch": false,
            "doCreate": true
          }
        ]
      }
    ];
    var body = {
      "organizationId": organizationId,
      "deploymentId": deploymentId,
      "sessionId": sessionId,
      "buttonId": buttonId,
      "screenResolution": screenResolution,
      "userAgent": userAgent,
      "language": language,
      "visitorName": visitorName,
      "prechatDetails": prechatDetails,
      "prechatEntities": prechatEntities,
      "receiveQueueUpdates": true,
      "isPost": true
    };
    var options = {
      method: 'POST',
      uri: url,
      body: body,
      json: true,
      headers: {
        'X-Liveagent-Sequence': '1',
        'X-Liveagent-Affinity': affinityToken,
        'X-Liveagent-Session-Key': sessionKey,
        'X-Liveagent-Api-Version': apiVersion
      }
    };
    var id = (options.contactId != "" ? options.contactId : options.psid);
    console.log("|initChat | salesforceLiveChatAPI.js | BeforeInitiatingRequest |", visitorName, "|", id);
    try {
      const res = await request(options);
      console.log("|initChat | salesforceLiveChatAPI.js | Successfully initiallized |", visitorName, "|", id);
      return res;
    }
    catch (err) {
      console.log(err);
      console.error("initChat | salesforceLiveChatAPI.js | Chat Failed |", err);
      return Promise.reject(err);
    }
  }

async function sendMsg(session_key, affinity_token, data) {
    if (data.text === undefined) data.text = '';
    var url = liveAgentUrl + "/Chasitor/ChatMessage"
    var options = {
      method: 'POST',
      uri: url,
      body: data,
      json: true,
      headers: {
        'X-LIVEAGENT-API-VERSION': apiVersion,
        'X-LIVEAGENT-AFFINITY': affinity_token,
        'X-LIVEAGENT-SESSION-KEY': session_key
      }
    };
    console.log("|sendMsg | salesforceLiveChatAPI.js | Before Sending Message |", JSON.stringify(options));
    try {
      const res = await request(options);
      
      console.log("|sendMsg | salesforceLiveChatAPI.js |", options.uri, "success");
      console.log("Send Msg"+JSON.stringify(res));
      return res;
    }
    catch (err) {
      console.log("Send message failer"+JSON.stringify(err));
      console.error("sendMsg | salesforceLiveChatAPI.js |", err, "failed");
      return Promise.reject(err);
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
async function getPendingMessages(session_key, affinity_token) {
    var url = liveAgentUrl + "/System/Messages"
    var options = {
      method: 'GET',
      uri: url,
      headers: {
        'X-LIVEAGENT-API-VERSION': apiVersion,
        'X-LIVEAGENT-AFFINITY': affinity_token,
        'X-LIVEAGENT-SESSION-KEY': session_key
      }
    };
    console.log("|getPendingMessages | salesforceLiveChatAPI.js | ", JSON.stringify(options));
    try {
      const res = await request(options);
      if (IsJsonString(res)) {
        return Promise.resolve(JSON.parse(res));
      }

      return Promise.resolve({ "messages": [] });
    }
    catch (err) {

      console.error("getPendingMessages | salesforceLiveChatAPI.js | ", err.statusCode);
      return Promise.reject(err);
    }
  }


  async function endChat(session_key, affinity_token) {
    console.log("|endChat | salesforceLiveChatAPI.js | ", session_key);
    var url = liveAgentUrl + "/Chasitor/ChatEnd"
    var options = {
      method: 'POST',
      uri: url,
      body: { reason: "client" },
      json: true,
      headers: {
        'X-LIVEAGENT-API-VERSION': apiVersion,
        'X-LIVEAGENT-AFFINITY': affinity_token,
        'X-LIVEAGENT-SESSION-KEY': session_key
      }
    };
    console.log("|endChat | salesforceLiveChatAPI.js | ", session_key, " | ", url);
    try {
      const res = await request(options);
      console.log("|endChat | salesforceLiveChatAPI.js | success");
      Promise.resolve(res);
    }
    catch (err) {
      console.error("endChat | salesforceLiveChatAPI.js | error |", err);
      return Promise.reject(err);
    }
  }
  
function authorization(){
   var url = SFDC_TOKEN_URL
    var options = {
        method: 'POST',
        uri: url,
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
        },
        qs: {
           "grant_type": "password", 
           "client_id": client_id,
           "username":username,
           "password":password,
 
 "client_secret":client_secret,
           "redirect_uri":redirect_uri
        }
    };
 //   console.log("Body of request is-->"+JSON.stringify(options))
    return request(options).then(function(res) {
   //         console.log("authtoken is->"+JSON.stringify(res))
            cache.set("token", res);
   //         console.log("Access Token from cache xxxxxxxxxx  " + cache.get("token"));
            return JSON.parse(res);
        })
        .catch(function(err) {
            console.log("error is--->"+JSON.stringify(err))
            return Promise.reject(err);
        });
}

function getChatButtons(MasterLabel, token){ 
   var initUrl = SFDC_API_URL+"/services/data/v29.0/query/?q=SELECT Id, DeveloperName,MasterLabel, IsActive, CreatedDate FROM LiveChatButton WHERE MasterLabel='{MasterLabel}'";
   
   var url = template.parse(initUrl).expand({MasterLabel: MasterLabel});
   var options = {
        method: 'GET',
        uri: url,
        headers :{
            "Authorization":"Bearer "+token
        }
    };
    return request(options).then(function(res) {
            var data = JSON.parse(res); 
            return data.records;
        })
        .catch(function(err) {
            return Promise.reject(err);
        });
};


function createTranscript(data, access_token){
    var LiveChatButtonId = data.LiveChatButtonId || config.live_agent.buttonId;
    var body  = {
        "LiveChatVisitorId": data.LiveChatVisitorId,
        "LiveChatDeploymentId":deploymentId,
        "LiveChatButtonId":data.LiveChatButtonId,
        "Body":data.Body,
        "Visitor_Type__c":data.Visitor_Type__c,
        "Visitor_Metro__c":data.Visitor_Metro__c,
        "Visitor_Email__c":data.Visitor_Email__c,
        "RequestTime":data.RequestTime,
        "StartTime":data.StartTime,
        "EndTime":data.EndTime,
        "Proactive__c":data.Proactive__c,
        "Chat_Transferred_from_Kore__c":data.Chat_Transferred_from_Kore__c,
        // "Customer_Email__c" : "testlb3@gmail.com",
        // "EndedBy" : "Agent",
        // "Status" : "Completed",
        // "Body" : "Test",
        // "CaseId" : "5003C000003tSGlQAM",
        // "ContactId" : "0033C00000C0IjLQAV",
        // "LiveChatVisitorId" : "5713C000000R2py"
    }
    body.LiveChatDeploymentId = deploymentId; 
    // console.log("body ++++ ",body)
  var url = SFDC_API_URL+"/services/data/v47.0/sobjects/LiveChatTranscript"
    var options = {
        method: 'POST',
        uri: url,
        body: body,
        json: true,
        headers : {
            authorization : "Bearer "+ access_token
        }
    };

    return request(options).then(function(res) {
            return res;
        })
        .catch(function(err) {
            return Promise.reject(err);
        });  
}

function createChatVisitorSession(){
 var url = liveAgentUrl + "/Visitor/VisitorId"
    var options = {
        method: 'GET',
        uri: url,
        qs : {
        "org_id":organizationId,
        "deployment_id": deploymentId
        },
        headers: {
            'X-LIVEAGENT-API-VERSION': apiVersion
        }
    };
    return request(options).then(function(res) {
            return JSON.parse(res);
        })
        .catch(function(err) {
            return Promise.reject(err);
        });   
}

function createVisitor(body, access_token) {
   var url = SFDC_API_URL + "/services/data/v47.0/sobjects/LiveChatVisitor"
    var options = {
        method: 'POST',
        uri: url,
        body: body,
        json: true,
        headers : {
            authorization : "Bearer "+ access_token
        }
    };
    return request(options).then(function(res) {
            return res;
        })
        .catch(function(err) {
            return Promise.reject(err);
        });
}
function getJWTToken() {
    if (cache.get("token")) {
        return JSON.parse(cache.get("token")).access_token;
    } else {
        return authorization();
    }
}

module.exports.getJWTToken =getJWTToken
module.exports.initChat = initChat;
module.exports.sendMsg = sendMsg;
module.exports.getPendingMessages = getPendingMessages;
module.exports.getSession = getSession;
module.exports.endChat = endChat;
module.exports.authorization = authorization;
module.exports.getChatButtons = getChatButtons;
module.exports.createTranscript = createTranscript;
module.exports.createVisitor = createVisitor;
module.exports.createChatVisitorSession = createChatVisitorSession;
// module.exports.initDataObj = initDataObj;
module.exports.serverFailtureNotification = serverFailtureNotification;
