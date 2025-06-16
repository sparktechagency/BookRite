import { Model, Types } from 'mongoose';

export type IChat = {
  participants: Types.ObjectId;
  lastMessage: {
    message: string;
    status: boolean;
  };
  lastMessageTime: Date;
};

export type ChatModel = {} & Model<IChat>;
