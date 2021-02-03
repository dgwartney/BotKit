var Promise = require('bluebird');
var request = require('request-promise');
var _ = require('lodash');

//loading config files
var sfdc_config_file = require("./config.json").sfdc_config_file;
var config = require(sfdc_config_file);
var liveAgentUrl = config.live_agent.liveAgentUrl;

//live agent 
var organizationId = config.live_agent.organizationId;
var deploymentId = config.live_agent.deploymentId;
var apiVersion = config.live_agent.apiVersion;
var screenResolution = config.live_agent.screenResolution;
var language = config.live_agent.language;

async function getSession() {
  var url = liveAgentUrl + "/System/SessionId";
  console.log("|getSession | salesforceLiveChatAPI.js | ", url);
  var options = {
    method: 'GET',
    uri: url,
    headers: {
      'X-Liveagent-Affinity': 'null',
      'X-Liveagent-Api-Version': apiVersion
    }
  };
  try {
    const res = await request(options);
    console.log("|getSession | salesforceLiveChatAPI.js | success");
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

async function initChat(session, options) {
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
  console.log("|sendMsg | salesforceLiveChatAPI.js | Before Sending Message |", options.uri);
  try {
    const res = await request(options);
    console.log("|sendMsg | salesforceLiveChatAPI.js |", options.uri, "success");
    return res;
  }
  catch (err) {
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
  console.log("|getPendingMessages | salesforceLiveChatAPI.js | ", options.uri);
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

module.exports.initChat = initChat;
module.exports.sendMsg = sendMsg;
module.exports.getPendingMessages = getPendingMessages;
module.exports.getSession = getSession;
module.exports.endChat = endChat;
module.exports.serverFailtureNotification = serverFailtureNotification;