import mongoose from 'mongoose';

export const chatRoomSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, index: true },
  messages: [{type: mongoose.Schema.Types.ObjectId, ref: 'Message'}],
});

export default mongoose.model('Chat', chatRoomSchema);
