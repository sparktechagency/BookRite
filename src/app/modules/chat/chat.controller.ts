import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";
import { ChatService } from "./chat.service";
import { User } from "../user/user.model";

const createChat = catchAsync(async (req: Request, res: Response) => {
    const user = req.user;

    const participantsFromBody: string[] = req.body.participants || [];
    const participants = new Set(participantsFromBody);
    if (user?.id) {
        participants.add(user.id);
    }

    const participantsArray = Array.from(participants);
    const name = req.body.name || '';

    const chat = await ChatService.createChatToDB(participantsArray, name);

    const participantDetails = await User.find({ '_id': { $in: participantsArray } })
        .select('name profile');

    const chatWithParticipantDetails = {
        _id: chat._id,
        name: chat.name,
        participants: participantDetails,
       
    };

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Create Chat Successfully',
        data: chatWithParticipantDetails,
    });
});

const getChat = catchAsync(async(req: Request, res: Response)=>{
    const user = req.user;
    const search = req.query.search as string;
    const chatList = await ChatService.getChatFromDB(user, search)

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Chat Retrieve Successfully",
        data: chatList
    })
})

export const ChatController = {createChat, getChat}