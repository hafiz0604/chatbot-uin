const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  username: { type: String, required: true, index: true }, // tambah index
  message: { type: String, required: true },
  sender: { type: String, enum: ['user', 'bot'], required: true },
  threadId: { type: String, required: true, index: true }, // tambah index
  createdAt: { type: Date, default: Date.now }
});

// (Opsional) index gabungan untuk pencarian thread per user lebih cepat
chatSchema.index({ username: 1, threadId: 1 });

module.exports = mongoose.model('Chat', chatSchema);