require('dotenv').config();

const {RTMClient, WebClient} = require('@slack/client');
const mongoose = require('mongoose');

const token = process.env.BOT_TOKEN;

const rtm = new RTMClient(token, {logLevel: 'error'});
const web = new WebClient(token);

mongoose.Promise = global.Promise;

rtm.start();

console.log("Slack bot is started.")

mongoose.connect(process.env.MONGO_URI, { useMongoClient: true })
  .then(() => console.log('Successfully connected to mongodb'))
  .catch(e => console.error(e));

rtm.on('member_joined_channel', async (event) => {
    try {
      // Send a typing indicator, and wait for 3 seconds
      await rtm.sendTyping(event.channel);
      await (new Promise((resolve) => setTimeout(resolve, 3000)));
  
      // Send a message (clears typing indicator)
      const reply = await rtm.sendMessage(`Welcome to the channel, <@${event.user}>`, event.channel)
      console.log('Message sent successfully', reply.ts);
    } catch (error) {
      console.log('An error occurred', error);
    }
  });


rtm.on("message",(event)=>{

    console.log(event);

    if(!event.bot_id){
        web.chat.postMessage({
            channel : event.channel,
            text : "Hi enter the right query please.",
            as_user: true
        });
    }  
})