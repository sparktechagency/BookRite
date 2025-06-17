import { model, Schema } from 'mongoose';
import { ChatModel, IChat } from './chat.interface';

const chatSchema = new Schema<IChat, ChatModel>(
    {
        name: {
            type: String,
            required: false,
            default: '' 
        },
        participants: [
            {
                type: Schema.Types.ObjectId,
                ref: 'User'
            }
        ]
    },
    { timestamps: true }
)

export const Chat = model<IChat, ChatModel>('Chat', chatSchema);