const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define Schemes
const sentenceSchema = new mongoose.Schema({
  eng: {type: String, required: true, unique : false},
  kor: {type:String, required: true, unique : false},
  channel : { type: Schema.Types.ObjectId, ref: 'Channel' }
},
{
  timestamps: true
});

module.exports = mongoose.model('Sentence', sentenceSchema);