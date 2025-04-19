import { Model, Types } from 'mongoose';

interface IOffer {
    status: "Upcoming" | "Accepted" | "Canceled";
    price: number;
    description: string;
    offerId: string,
}

export type IMessage = {
    chatId: Types.ObjectId;
    sender: Types.ObjectId;
    text?: string;
    image?: string;
    offer?: IOffer;
    messageType: 'text' | "image" | "both" | 'offer';
};

export type MessageModel = Model<IMessage, Record<string, unknown>>