import { model, Schema } from 'mongoose';
import { ChatModel, IChat } from './chat.interface';

const chatSchema = new Schema<IChat, ChatModel>(
  {
    participants: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    lastMessage: {
      message: {
        type: String,
        default: 'You have a new message',
      },
      status: {
        type: Boolean,
      },
    },
    lastMessageTime: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

export const Chat = model<IChat, ChatModel>('Chat', chatSchema);
