const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const channelSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  randomStatus: {type: Boolean},
  sentences : [{ type: Schema.Types.ObjectId, ref: 'Sentence' }]
},
{
  timestamps: true
});

module.exports = mongoose.model('Channel', channelSchema);