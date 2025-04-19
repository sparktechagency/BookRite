import { Model, Types } from 'mongoose';

export type IChat = {
    participants: [Types.ObjectId];
}

export type ChatModel = Model<IChat, Record<string, unknown>>