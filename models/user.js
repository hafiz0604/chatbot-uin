const mongoose = require('mongoose');

// Definisi Schema User
const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true,
    minlength: 4
  },
  password: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true,
    unique: true,
    match: /@student\.uin-suka\.ac\.id$/
  },
  name: { 
    type: String, 
    required: false 
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Pastikan model dibuat dengan benar
const User = mongoose.model('User', userSchema);

// Export model
module.exports = User;