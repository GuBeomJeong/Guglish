const mongoose = require('mongoose');

// Define Schemes
const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  channel: {type:String, required: true, unique: true},
  random: {type: Boolean}
},
{
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);