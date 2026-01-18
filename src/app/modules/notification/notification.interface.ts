import { Model, Types } from 'mongoose';

export type INotification = {
    text: string;
    receiver?: Types.ObjectId;
    sender?: Types.ObjectId;
    read: boolean;
    referenceId?: string;
    screen?: "OFFER" | "CHAT";
    type?: "ADMIN";
    createdAt?: Date;
};

export type NotificationModel = Model<INotification>;