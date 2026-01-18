import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError";
import generateBookingId from "../../../util/generateBookingId";
import { Offer } from "../offer/offer.model";
import { IMessage } from "./message.interface";
import { Message } from "./message.model";
import mongoose from "mongoose";


const sendMessageToDB = async (payload: any): Promise<IMessage> => {

    const { offer } = payload;
    const offerId = generateBookingId();

    if (offer) {
        payload.messageType = "offer";
        offer.offerId = offerId;
        payload.offer.offerId =  offerId;

        const createOffer = {
            user: payload.sender,
            provider: payload?.provider,
            service: payload?.service,
            offerId: offerId,
            price: offer?.price,
            description: offer?.description,
        }
        const result = await Offer.create(createOffer);
        if (!result) {
            throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to create Offer")
        }
    }

    // save to DB  
    const response = await Message.create(payload);

    //@ts-ignore
    const io = global.io
    if (io) {
        io.emit(`getMessage::${payload?.chatId}`, response);
    }


    return response;
}

const getMessageFromDB = async (id: any, query: Record<string, any>): Promise<IMessage[]> => {



    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid Chat Id")
    }

    const { page, limit } = query;

    const pages = parseInt(page) || 1;
    const size = parseInt(limit) || 10;
    const skip = (pages - 1) * size;

    const messages = await Message.find({ chatId: id }).sort({ createdAt: -1 })
        .skip(skip)
        .limit(size);


    const count = await Message.countDocuments({ chatId: id });

    const data: any = {
        messages,
        meta: {
            page: pages,
            total: count
        }
    }
    return data;
}

const responseOfferStatusToDB = async (id: any, status: string): Promise<IMessage | {}> => {

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid Chat Id")
    }

    const message = await Message.findById(id).lean();
    if(!message){
        throw new ApiError(StatusCodes.NOT_FOUND, "No message found");
    }


    const updateMessage: any = await Message.findByIdAndUpdate(
        id,
        { $set: { 'offer.status': status } },
        { new: true }
    );

    if(!updateMessage){
        throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to update")
    }else{
        await Offer.findOneAndUpdate(
            { offerId : message.offer?.offerId},
            {status: status},
            {new : true}
        )
    }

    return message;
}

export const MessageService = { sendMessageToDB, getMessageFromDB, responseOfferStatusToDB };