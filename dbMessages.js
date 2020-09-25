import mongoose from 'mongoose';

export const messageScehma = new mongoose.Schema({
  message: {
    type: String,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  timestamp: Date,
}, {
  timestamps: true
});

export default mongoose.model('Message', messageScehma);
