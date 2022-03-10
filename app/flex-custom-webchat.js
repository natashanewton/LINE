require('dotenv').config();
const fetch = require('node-fetch');
const { URLSearchParams } = require('url');
var base64 = require('base-64');

const client = require('twilio')(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

function sendChatMessage(serviceSid, channelSid, chatUserName, body) {
  console.log('Sending new chat message');
  const params = new URLSearchParams();
  params.append('Body', body);
  params.append('From', chatUserName);
  return fetch(
    `https://chat.twilio.com/v2/Services/${serviceSid}/Channels/${channelSid}/Messages`,
    {
      method: 'post',
      body: params,
      headers: {
        'X-Twilio-Webhook-Enabled': 'true',
        Authorization: `Basic ${base64.encode(
          `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
        )}`
      }
    }
  );
}

function createNewChannel(flexFlowSid, flexChatService, userViberId, chatUserName) {
  return client.flexApi.channel
    .create({
      flexFlowSid: flexFlowSid,
      identity: userViberId,
      chatUserFriendlyName: chatUserName,
      chatFriendlyName: 'Flex Custom Chat',
      target: chatUserName
    })
    .then(channel => {
      console.log(`Created new channel ${channel.sid}`);
      return client.chat
        .services(flexChatService)
        .channels(channel.sid)
        .webhooks.create({
          type: 'webhook',
          'configuration.method': 'POST',
          'configuration.url': `${process.env.WEBHOOK_BASE_URL}/new-message?channel=${channel.sid}`,
          'configuration.filters': ['onMessageSent']
        }
        
        )
        .then(() => client.chat
        .services(flexChatService)
        .channels(channel.sid)
        .webhooks.create({
          type: 'webhook',
          'configuration.method': 'POST',
          'configuration.url': `${process.env.WEBHOOK_BASE_URL}/channel-update`,
          'configuration.filters': ['onChannelUpdated']
        }))
        .then(() => client.chat
        .services(flexChatService)
        .channels(channel.sid)
        .webhooks.create({
          type: 'webhook',
          'configuration.method': 'POST',
          'configuration.url': `${process.env.WEBHOOK_BASE_URL}/end-chat?channel=${channel.sid}&viberId=${userViberId}`,
          'configuration.filters': ['onMemberRemoved']
        }))
    })
    .then(webhook => webhook.channelSid)
    .catch(error => {
      console.log(error);
    });
    
}

function removeChannel(channelId) {
  return new Promise(function(resolve, reject) {
    client.flexApi.channel(channelId).remove().then(success => {
        console.log("removed channel id ", `${channelId}`);
        resolve(success);
    }).catch(err => {
        reject(err);
    })
  })
}

const channels = [];

async function resetChannel(status) {
  if (status == 'INACTIVE') {
    channels.map((channel, index) => {
      if(channel['userViberId'] == userViberId) {
        channel['flex_channel'] = false;
      }
    })
  }
}

async function sendMessageToFlex(msg,userViberId, userName, flexChannelCreated) {
  console.log(`${process.env.WEBHOOK_BASE_URL}`);
  sendChatMessage(
    process.env.FLEX_CHAT_SERVICE,
    flexChannelCreated,
    userName,
    msg
  );
}

exports.sendMessageToFlex = sendMessageToFlex;
exports.resetChannel = resetChannel;
exports.createNewChannel = createNewChannel;
exports.removeChannel = removeChannel;
