import { model, Schema } from 'mongoose';
import { INotification, NotificationModel } from './notification.interface';

const notificationSchema = new Schema<INotification, NotificationModel>(
    {
        text: {
            type: String,
            required: true
        },
        receiver: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: false
        },
        sender: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: false
        },
        referenceId: {
            type: String,
            required: false
        },
        screen: {
    type: String,
    enum: ['OFFER', 'CHAT', 'BOOKING','subscription_earning'], 
    required: true,
  },


        read: {
            type: Boolean,
            default: false
        },
        type: {
            type: String,
            enum: ['ADMIN','USER','Booking Cancelled', 'Booking Accepted', 'Booking Completed', 'Booking Rejected','chat'],
            required: false
        },
        createdAt: {
            type: Date,
            default: Date.now   
        },
    },

    {
        timestamps: true
    }
);

export const Notification = model<INotification, NotificationModel>(
    'Notification',
    notificationSchema
);
