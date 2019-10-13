const mongoose = require('mongoose');

// Define Schemes
const sentenceSchema = new mongoose.Schema({
  eng: { type: String, required: true, unique: true },
  kor: {type:String}
},
{
  timestamps: true
});

module.exports = mongoose.model('Sentence', sentenceSchema);