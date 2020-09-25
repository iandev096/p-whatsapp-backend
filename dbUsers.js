import mongoose from 'mongoose';

export const userSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, index: true },
  uid: { type: String, required: true, unique: true, index: true }
});

export default mongoose.model('User', userSchema);
