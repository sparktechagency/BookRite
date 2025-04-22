import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { AdminService } from './admin.service';

const userList = catchAsync(async(req: Request, res: Response)=>{
    const {page, limit, search} = req.query;
    const payload = {page, limit, search};

    const result = await AdminService.usersFromDB(payload)

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "User Retrieved Successfully",
        data: result
    })
})


// const createSuperAdmin = catchAsync(async(req: Request, res: Response)=>{

//     const result = await AdminService.createSuperAdminToDB(req.body);

//     sendResponse(res, {
//         statusCode: StatusCodes.OK,
//         success: true,
//         message: "Super Admin Created Successfully",
//         data: result
//     })
// })

const bookingList = catchAsync(async(req: Request, res: Response)=>{
    const payload = {...req.query};

    const result = await AdminService.bookingFromDB(payload)

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Artist Retrieved Successfully",
        data: result
    })
})

const transactionList = catchAsync(async(req: Request, res: Response)=>{
    const {search, page, limit, status} = req.query;
    const payload = {search, page, limit, status};

    const result = await AdminService.transactionsFromDB(payload);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Transaction Retrieved Successfully",
        data: result
    })
})


const bookingSummary = catchAsync(async(req: Request, res: Response)=>{

    const result = await AdminService.bookingSummaryFromDB();

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Booking Summary Retrieved Successfully",
        data: result
    })
})

const earningStatistic = catchAsync(async(req: Request, res: Response)=>{

    const result = await AdminService.earningStatisticFromDB();

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Earing Statistic Retrieved Successfully",
        data: result
    })
})

const userStatistic = catchAsync(async(req: Request, res: Response)=>{

    const result = await AdminService.userStatisticFromDB();
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "User Statistic Retrieved Successfully",
        data: result
    })
});

const createAdmin = catchAsync(async(req: Request, res: Response)=>{
    const payload = req.body;

    const result = await AdminService.createAdminToDB(payload);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Admin created Successfully",
        data: result
    })
})

const deleteAdmin = catchAsync(async(req: Request, res: Response)=>{

    const payload = req.params.id;
    const result = await AdminService.deleteAdminFromDB(payload);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Admin Deleted Successfully",
        data: result
    })
})

const getAdmin = catchAsync(async(req: Request, res: Response)=>{

    const result = await AdminService.getAdminFromDB();

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Admin Retrieved Successfully",
        data: result
    })
})

export const AdminController = {
    userList,
    bookingList,
    transactionList,
    // createSuperAdmin,
    bookingSummary,
    userStatistic,
    earningStatistic,
    deleteAdmin,
    createAdmin,
    getAdmin
}