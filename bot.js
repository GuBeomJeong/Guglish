require('dotenv').config();

const {RTMClient, WebClient} = require('@slack/client');
const mongoose = require('mongoose');

const token = process.env.BOT_TOKEN;

const rtm = new RTMClient(token, {logLevel: 'error'});
const web = new WebClient(token);

const User = require('./models/User');
const Sentence = require('./models/Sentence');

mongoose.Promise = global.Promise;

const schedule = require('node-schedule');

const schedules = []

const Grammarbot = require('grammarbot');

const bot = new Grammarbot({
  'api_key' : process.env.GRAMMER_API_KEY,      // (Optional) defaults to node_default
  'language': 'en-US'         // (Optional) defaults to en-US
  //'base_uri': 'pro.grammarbot.io', // (Optional) defaults to api.grammarbot.io
});

rtm.start();

// mongoose.connect(process.env.MONGO_URI)
//   .then(() => console.log('Successfully connected to mongodb'))
//   .catch(e => console.error(e));

console.log("Slack bot is started.")

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


rtm.on("message",async (event)=>{

    console.log(event);

    if(!event.bot_id){

      if(event.text == "Help"){
        web.chat.postMessage({
          channel : event.channel,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `Welcome to the channel, <@${event.user}>. We're here to help. Let us know if you have an issue.`,
              },
              accessory: {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'Get Help',
                },
                value: 'get_help',
              },
            },
          ],
        });
      }

      if(event.text == "Add"){
        web.chat.postMessage({
          channel : event.channel,
          text : "Enter the sentence.",
          as_user: true
        });
      }

      if(event.text == "Register"){

        // const user = new User({
        //   id : event.user,
        //   channel : event.channel,
        //   random : true
        // });

        // user.save().then(()=>{
        //   console.log("User Registered");
        // });

        if(schedules[event.channel]){
          web.chat.postMessage({
            channel : event.channel,
            text : "You are already registered",
            as_user: true
          });
          return;
        }

        web.chat.postMessage({
            channel : event.channel,
            text : "You will recieve a random sentence.",
            as_user: true
        });

        const value = schedule.scheduleJob('10 * * * * *', ()=>{
          
          console.log("test")

          web.chat.postMessage({
            channel : event.channel,
            text : "Schedule Test",
            as_user: true
          });
        });

        schedules[event.channel] = value 
      }

      // const sentence = new Sentence({
      //   eng: event.text
      // })

      // sentence.save().then(()=>{
      //   console.log('Saved succesfully')
      // })

      // bot.check("I can't remember how to go their", function(error, result) {
      //   if (!error){
      //     console.log(JSON.stringify(result));
      //   }
      // });
      
      // Async/Await style
      // const result = await bot.checkAsync("I can't remember how to go their");
      // console.log(JSON.stringify(result));
      
    }  
})