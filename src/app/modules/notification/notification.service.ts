import { JwtPayload } from "jsonwebtoken";
import { INotification } from "./notification.interface";
import { Notification } from "./notification.model";

// get notifications
const getNotificationFromDB = async (user: JwtPayload, query: Record<string, any>): Promise<INotification> => {

    const { page, limit } = query;

    const pages = parseInt(page) || 1;
    const size = parseInt(limit) || 10;
    const skip = (pages - 1) * size;

   

    const notifications = await Notification.find({ receiver: user.id })
        .populate({ path: "sender", select: "name profile" })
        .skip(skip)
        .sort({ createdAt: -1 })
        .limit(size);


    const unreadCount = await Notification.countDocuments({
        receiver: user.id,
        read: false
    });

    const count = await Notification.countDocuments({ receiver: user.id })

    const data: any = {
        notifications,
        unreadCount,
        meta: {
            page: pages,
            total: count
        }
    }

    return data;
}

// read notifications only for user
const readNotificationToDB = async (user: JwtPayload): Promise<INotification | undefined> => {
    
    const result: any = await Notification.updateMany({ receiver: user.id, read: false }, { $set: { read: true } });
    return result;
}


// get notifications for admin
const adminNotificationFromDB = async () => {
    const notifications = await Notification.find({ type: "ADMIN" })
        .populate({ path: "sender", select: "name profile" })
        .sort({ createdAt: -1 });
        
    // const result = await Notification.find({ type: "ADMIN"});
    return notifications;
}

// read notifications only for admin
const adminReadNotificationToDB = async (): Promise<INotification | null> => {
    const result: any = await Notification.updateMany(
        { type: "ADMIN", read: false },
        { $set: { read: true } },
        { new: true }
    );
    return result;
}


export const NotificationService = {
    adminNotificationFromDB,
    getNotificationFromDB,
    readNotificationToDB,
    adminReadNotificationToDB
}