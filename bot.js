require('dotenv').config();

const {RTMClient, WebClient} = require('@slack/client');
const mongoose = require('mongoose');

const schedule = require('node-schedule');

const token = process.env.BOT_TOKEN;

const rtm = new RTMClient(token, {logLevel: 'error'});
const web = new WebClient(token);

mongoose.Promise = global.Promise;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Successfully connected to mongodb');
    init();
  })
  .catch(e => console.error(e));

const Channel = require('./models/Channel');
const Sentence = require('./models/Sentence');

const Status = {
  BASE : 0,
  WAIT_ADD_ENG : 1,
  WAIT_ADD_KOR : 2,
  WAIT_RANDOM_QUESTION_ENG : 3,
  WAIT_RANDOM_QUESTION_KOR : 4
};

const Command = {
  ADD : 'add',
  REGISTER : 'register',
  LIST : 'list',
  HELP : 'help',
  STOP : 'stop'
};

Object.freeze(Status);
Object.freeze(Command);

const channels = {};
const registeredChannels = [];

rtm.start();

function init(){
  Channel.find({}).populate('sentences').exec((err,chs)=>{

    if(!chs.length){
      console.log("no channel");
      return;
    }

    chs.forEach((ch) =>{

      console.log(ch);

      const channel = {
        status : Status.BASE,
        randomStatus : ch.randomStatus,
        addSentence : {
          eng : "",
          kor : ""
        },
        questionAnswer: "",
        sentences : ch.sentences,
        DBModel : ch
      };

      channels[ch.id] = Object.seal(channel);
      if(ch.randomStatus){
        registeredChannels.push(ch.id);
      }
    })
  })
}

const randomSchedule = schedule.scheduleJob('10 * * * * *', ()=>{

  if(registeredChannels.length  == 0 ){
    console.log("Registerd user not exist.");
    return;
  }
   
  let cIdx = Math.floor(Math.random() * (registeredChannels.length));
  const channelId = registeredChannels[cIdx];
  const channel = channels[channelId];

  if(!channel.status == Status.BASE){
    return;
  }

  let sIdx = Math.floor(Math.random() * (channel.sentences.length));
  
  web.chat.postMessage({
    channel : channelId,
    text : "[Random Question]\n" + channel.sentences[sIdx].kor,
    as_user: true
  });

  channel.status = Status.WAIT_RANDOM_QUESTION_KOR;
  channel.questionAnswer = channel.sentences[sIdx].eng;
});

console.log("Slack bot is started.")

rtm.on("message",async (event)=>{

    if(!event.bot_id){

      console.log(event);

      const channel = channels[event.channel];

      if(!channel){

        const ch = new Channel({
          id : event.channel,
          randomStatus : false,
          sentences: []
        });

        ch.save().then(()=>{
          console.log("Channel DB Added");
        });

        let newChannel = {
          status : Status.BASE,
          randomStatus : false,
          addSentence : {
            eng : "",
            kor : ""
          },
          questionAnswer: "",
          sentences : [],
          DBModel : ch
        };

        channels[event.channel] = Object.seal(newChannel);

        console.log("New Channel");

        web.chat.postMessage({
          channel : event.channel,
          text : "You are added. Retry again.",
          as_user: true
        });

        return;
      }

      if(channel.status == Status.WAIT_ADD_ENG){

        channel.addSentence.eng = event.text;
        channel.status = Status.WAIT_ADD_KOR;

        web.chat.postMessage({
          channel : event.channel,
          text : "Enter the sentence(kor).",
          as_user: true
        });

        return;
      }

      if(channel.status == Status.WAIT_ADD_KOR){

        channel.addSentence.kor = event.text;
        let newSentence = {
          eng : channel.addSentence.eng,
          kor : channel.addSentence.kor
        }
        channel.status = Status.BASE;

        const sentence = new Sentence(newSentence);

        sentence.save().then(()=>{
          console.log('Sentence DB added succesfully');

          channel.DBModel.sentences.push(sentence);
          channel.DBModel.save().then(()=>{
            console.log("Channel Sentence Added");
          })
        });

        web.chat.postMessage({
          channel : event.channel,
          text : "Add successfully.",
          as_user: true
        });

        return;
      }

      if(channel.status == Status.WAIT_RANDOM_QUESTION_KOR){

        channel.status = Status.BASE;

        web.chat.postMessage({
          channel : event.channel,
          text : "[Original answer]\n" + channel.questionAnswer,
          as_user: true
        });

        return;
      }

      if(channel.status == Status.BASE){
        
        if(event.text == Command.ADD){

          channel.status = Status.WAIT_ADD_ENG;
  
          web.chat.postMessage({
            channel : event.channel,
            text : "Enter the sentence(eng).",
            as_user: true
          });
  
          return;
        }

        if(event.text == Command.REGISTER){

          if(channel.randomStatus){
            web.chat.postMessage({
              channel : event.channel,
              text : "You are already registered.",
              as_user: true
            });
          
            return;
          }
  
          if(channel.sentences.length == 0){
            web.chat.postMessage({
              channel : event.channel,
              text : "At least one sentence must be added.",
              as_user: true
            });
  
            return;
          }
  
          registeredChannels.push(event.channel);
          channel.randomStatus = true;
          channel.DBModel.randomStatus = true;
          channel.DBModel.save().then(()=>{
            console.log("register DB Saved.");
          });
  
          web.chat.postMessage({
              channel : event.channel,
              text : "You will recieve a random sentence.",
              as_user: true
          });
  
          return;
        }
      }

      if(event.text == Command.STOP){
        channel.randomStatus = false;
        channel.DBModel.randomStatus = false;
        channel.DBModel.save();

        const idx = registeredChannels.indexOf(event.channel); 
        if (idx > -1) registeredChannels.splice(idx, 1)

        web.chat.postMessage({
          channel : event.channel,
          text : "Register stop.",
          as_user: true
        });

        return;
      }

      if(event.text == Command.LIST){

        let result = "[Sentence List]\n";

        channel.sentences.forEach((sentence) =>{
          result += sentence.eng + " : " + sentence.kor + "\n";
        })

        if(result == ""){
          result = "List Empty";
        }

        web.chat.postMessage({
          channel : event.channel,
          text : result,
          as_user: true
        });

        return;
      }
      
      web.chat.postMessage({
        channel : event.channel,
        text : "Unknown command.",
        as_user: true
      });

    }  
})


// rtm.on('member_joined_channel', async (event) => {
//     try {
//       // Send a typing indicator, and wait for 3 seconds
//       await rtm.sendTyping(event.channel);
//       await (new Promise((resolve) => setTimeout(resolve, 3000)));
  
//       // Send a message (clears typing indicator)
//       const reply = await rtm.sendMessage(`Welcome to the channel, <@${event.user}>`, event.channel)
//       console.log('Message sent successfully', reply.ts);
//     } catch (error) {
//       console.log('An error occurred', error);
//     }
//   });


// if(event.text == "Help"){
//   web.chat.postMessage({
//     channel : channel,
//     blocks: [
//       {
//         type: 'section',
//         text: {
//           type: 'mrkdwn',
//           text: `Welcome to the channel, <@${event.user}>. We're here to help. Let us know if you have an issue.`,
//         },
//         accessory: {
//           type: 'button',
//           text: {
//             type: 'plain_text',
//             text: 'Get Help',
//           },
//           value: 'get_help',
//         },
//       },
//     ],
//   });
// }




// bot.check("I can't remember how to go their", function(error, result) {
//   if (!error){
//     console.log(JSON.stringify(result));
//   }
// });

// Async/Await style
// const result = await bot.checkAsync("I can't remember how to go their");
// console.log(JSON.stringify(result));


// const Grammarbot = require('grammarbot');

// const bot = new Grammarbot({
//   'api_key' : process.env.GRAMMER_API_KEY,      // (Optional) defaults to node_default
//   'language': 'en-US'         // (Optional) defaults to en-US
//   //'base_uri': 'pro.grammarbot.io', // (Optional) defaults to api.grammarbot.io
// });

