const mongoose = require('mongoose');

// Define Schemes
const userSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true }
},
{
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);