import { Model, Types } from 'mongoose';

export type IChat = {
    _id?: Types.ObjectId;
    name?: string;
    participants: [Types.ObjectId];
}

export type ChatModel = Model<IChat, Record<string, unknown>>;