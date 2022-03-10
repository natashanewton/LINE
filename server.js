const ViberBot = require('viber-bot').Bot;
const BotEvents = require('viber-bot').Events;
const TextMessage = require('viber-bot').Message.Text;
const PictureMessage = require('viber-bot').Message.Picture;
const ngrok = require('./app/get_public_url');
const flex = require('./app/flex-custom-webchat');
const http = require('http');
// require('dotenv').config({path:'./.env'});


var express    = require('express');        // call express
var app        = express();                 // define our app using express
var bodyParser = require('body-parser');
require('dotenv').config()
const configuration = {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET
}
const line = require('@line/bot-sdk')
const lineClient = new line.Client(configuration)


//Line Start
app.post('/event', line.middleware(configuration), function(req, res){
    //console.log('UserID ',req.body.events[0])
    console.log('UserID ',req.body.events[0].source.userId)
    console.log('message ',req.body.events[0].message.text)
    
   getUserName(req.body.events[0].source.userId).then(name => {
        createChannel(req.body.events[0].source.userId, res,name).then(client => {
            // Echo's back the message to the client. Your bot logic should sit here.
            console.log('hello message received Ted', req.body.events[0].message.text);
            flex.sendMessageToFlex(req.body.events[0].message.text, req.body.events[0].source.userId, client['user_Name'], client['flex_channel']);
        }).catch(err => {
            console.log(err);
        });
   })

    res.status(200).send('Chatbot Tutorial')
})

getUserName = (userID) => {
    return new Promise(function(resolve, reject) {
        lineClient.getProfile(userID).then((profile) => {
            console.log("UserID",profile.userId);
             resolve(profile.displayName);
          }).catch((error)=>{
              console.log(error)
          });
    })
} 


//Line Stop

// configure app to use bodyParser()
// this will let us get the data from a POST
//app.use(bodyParser.urlencoded({ extended: true }));

//https://chatbotslife.com/build-viber-bot-with-nodejs-a21487e5b65

// const bot = new ViberBot({
// 	authToken: '4d4d95871f27dc4b-d3ac11d52f948ea2-7af6fc5137ac58ec',
// 	name: "TwilioTest",
// 	avatar: "https://dl-media.viber.com/1/share/2/long/vibes/icon/image/0x0/b95f/821be113f3e0537b8af3f9b27aa420d3fa5cb66c6250d875c0480598d90db95f.jpg" // It is recommended to be 720x720, and no more than 100kb.
// });
// Twilio Socket
  

//Twilio Socket
// bot.on(BotEvents.CONVERSATION_STARTED, (response) => {

//     const roomname = response.userProfile.id;
//     const username = response.userProfile.name;
//     const profile_pic = response.userProfile.avatar;
//     const country_origin = response.userProfile.country;
//     const language_origin = response.userProfile.language;

//     //Do something with user data
//     console.log('hello message received');
// })

const clients = [];
async function createChannel(LineID, userResponse,UserName) {
    let client;
    clients.map((l_client, index) => {
      if(l_client['LineID'] == LineID) {
        client = l_client;
      }
    });
    if(!client) {
        console.log("create new client");
        let flexChannelCreated = await flex.createNewChannel(
            process.env.FLEX_FLOW_SID,
            process.env.FLEX_CHAT_SERVICE,
            LineID,
            'Line-Chat-'+UserName
          );
        client = {};
        client['LineID'] = LineID;
        client['flex_channel'] = flexChannelCreated;
        //client['user_bot'] = userResponse;
        client['user_Name'] = UserName;
        clients.push(client);
    }
    return client;
}

// Perfect! Now here's the key part:
// bot.on(BotEvents.MESSAGE_RECEIVED, (request, response) => {
//     createChannel(response.userProfile.id, response).then(client => {
//         // Echo's back the message to the client. Your bot logic should sit here.
//         console.log('hello message received Ted', request);
//         flex.sendMessageToFlex(request.text, response.userProfile.id, response.userProfile.name, client['flex_channel']);
//     }).catch(err => {
//         console.log(err);
//     });
// });

// Perfect! Now here's the key part:
// bot.on(BotEvents.MESSAGE_SENT, (message, userProfile) => {
// 	// Echo's back the message to the client. Your bot logic should sit here.
// 	console.log('hello', userProfile);
//     console.log('Message sent', message);
    
// });

var port = process.env.PORT || 3000;        // set our port
app.use(bodyParser.urlencoded({ extended: true }));
app.post('/new-message', bodyParser.json(), function(request, response) {
   // console.log(request)
    if (request.body.Source === 'SDK' ) { // from twillo
        clients.map((l_client, index) => {
            if(l_client['flex_channel'] == request.query.channel) {
                console.log('Message receveid from Twilio webhook fired',request.body.Body);
                // let message = request.body.Body;
                //let message = new PictureMessage(request.body.Body);
                //l_client['user_bot'].send(message);
                console.log("Line User ID message")
               console.log(request.body.Body)


                lineClient.pushMessage(l_client['LineID'],{type: 'text', text: request.body.Body}).then(res=>console.log("success")).catch(err=>{
                    console.log('error from line')
                    console.log(err);
                })

                // lineClient.pushMessage(l_client['LineID'], {
                //     type: 'text',
                //     text: message,
                //   }).then(res=>{
                //       console.log(res)
                //   }).catch(error=>{
                //       console.log(error)
                //   })
                
            }
        });
    }
});
app.post('/end-chat', bodyParser.json(), function(request, response) {
    console.log('End chat API called by trillio', request.query.viberId);
    removeClient(request);
});

function removeClient(request) {
    if (request.body.Source === 'SDK' ) { // from twillo
       // console.log(clients);
        let globalIndex;
        clients.map((l_client, index) => {
            let channel = request.query.channel;
            let viberId = request.query.viberId;
            if(l_client['flex_channel'] == channel 
                && l_client['LineID'] == viberId) {
                console.log('End chat member Id', viberId);
                globalIndex = index;
            }
        });
        if(globalIndex >= 0) {
            clients.splice(globalIndex, 1);
            flex.removeChannel(request.query.channel);
        }
    }
}

//app.use("/viber/webhook", bot.middleware());

let server = http.createServer(app);
// var io = require('socket.io')(server);
// io.on('connection', function(socket) {
//     console.log('Socket connected');
// });
//
//server.listen(port, (req) => console.log('Listening port is ',req.url));
//


ngrok.getPublicUrl().then(publicUrl => {
    console.log('Set the new webhook to"', publicUrl);
    process.env.WEBHOOK_BASE_URL = publicUrl;
    server.listen(port, () => {
             console.log('Magic happens on port ' + port);
        let webhook = publicUrl+"/viber/webhook";
        // bot.setWebhook(webhook).then(data => { 
        //     console.log('Magic happens on port ' + port);
        // }).catch(err => {
        //     console.log('Error ', err);
        // });
    });
}).catch(error => {
    console.log('Can not connect to ngrok server. Is it running?');
    console.error(error);
});
