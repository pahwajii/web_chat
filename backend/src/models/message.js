import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      required: true,
      index: true,
    },
    receiver: {
      type: String,
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    delivered: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index to speed up conversation query: sender & receiver combination
MessageSchema.index({ sender: 1, receiver: 1 });

const Message = mongoose.model('Message', MessageSchema);
export default Message;
