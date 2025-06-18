import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError";
import { IBooking } from "../booking/booking.interface";
import { Booking } from "../booking/booking.model";
import { IUser } from "../user/user.interface"
import { User } from "../user/user.model"
import { IOffer } from "../offer/offer.interface";
import { Offer } from "../offer/offer.model";
import bcrypt from 'bcrypt';
import { USER_ROLES } from "../../../enums/user";
import { Service } from "../service/service.model";
import { Servicewc } from "../service/serviceswc.model";
import mongoose, { Types } from "mongoose";
import { IService } from "../service/service.interface";

const createSuperAdminToDB = async (payload: any): Promise<IUser> =>{

    if(payload.role !== "SUPER_ADMIN"){
        throw new ApiError(StatusCodes.BAD_REQUEST, "This Api only for Super ADMIN")
    }

    const isExistEmail = await User.findOne({ email : payload.email})
    if(isExistEmail){
        throw new ApiError(StatusCodes.BAD_REQUEST, "This email already Taken")
    }

    const createAdmin = await User.create(payload);
    if (!createAdmin) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create Admin');
    }
    
    if(createAdmin){
        await User.findByIdAndUpdate({_id: createAdmin?._id}, {verified: true}, {new: true});
    }
    return createAdmin;
}

const usersFromDB = async (payload: any): Promise<IUser[]> =>{
    const {search, page, limit } = payload;

    const anyConditions = [];

    anyConditions.push({
        role: "ADMIN"
    });

    //artist search here
    if (search) {
        anyConditions.push({
            $or: ["name", "email"].map((field) => ({
                [field]: {
                    $regex: search,
                    $options: "i"
                }
            }))
        });
    }
    
    const whereConditions = anyConditions.length > 0 ? { $and: anyConditions } : {};

    const pages = parseInt(page) || 1;
    const size = parseInt(limit) || 10;
    const skip = (pages - 1) * size;

    const result:any = await User.find(whereConditions).select("name email contact location gender profile service createdAt updatedAt").skip(skip).limit(size);


    const count = await User.countDocuments(whereConditions);

    const data:any =  {
        data: result,
        meta: {
            page: pages,
            total: count
        }
    }

    return data;
}


const usersFromDBAdmin = async (payload: any): Promise<IUser[]> =>{
    const {search, page, limit } = payload;

    const anyConditions = [];

    anyConditions.push({
        role: "USER"
    });

    //artist search here
    if (search) {
        anyConditions.push({
            $or: ["name", "email"].map((field) => ({
                [field]: {
                    $regex: search,
                    $options: "i"
                }
            }))
        });
    }
    
    const whereConditions = anyConditions.length > 0 ? { $and: anyConditions } : {};

    const pages = parseInt(page) || 1;
    const size = parseInt(limit) || 10;
    const skip = (pages - 1) * size;

    const result:any = await User.find(whereConditions).select("name email contact location gender profile createdAt updatedAt").skip(skip).limit(size);

    const count = await User.countDocuments(whereConditions);

    const data:any =  {
        data: result,
        meta: {
            page: pages,
            total: count
        }
    }

    return data;
}

const bookingFromDB = async (payload: any): Promise<IOffer[]> =>{

    const {search, page, limit, status } = payload;

    const anyConditions:any = [];

    if (search) {
        anyConditions.push({
            $or: ["name", "email"].map((field) => ({
                [field]: {
                    $regex: search,
                    $options: "i"
                }
            }))
        });
    } 

    // Filter by status if provided
    if (status) {
        anyConditions.push({
            status: status
        });
    }
    
    const whereConditions = anyConditions.length > 0 ? { $and: anyConditions } : {};

    const pages = parseInt(page) || 1;
    const size = parseInt(limit) || 10;
    const skip = (pages - 1) * size;

    const result:any = await Offer.find(whereConditions)
        .populate([
            {
                path: "user",
                select: "name profile"
            },
            {
                path: "provider",
                select: "name profile"
            },
            {
                path: "service",
                select: "title"
            },
        ])
        .select("user provider service status offerId")
        .skip(skip)
        .limit(size);

    const count = await Offer.countDocuments(whereConditions);

    const data:any =  {
        data: result,
        meta: {
            page: pages,
            total: count
        }
    }

    return data;
}

const transactionsFromDB = async (payload: any): Promise<IBooking[]> => {
    const { search, page, limit, status } = payload;

    const anyConditions: any[] = [];

    // Filter by status if provided
    if (status) {
        anyConditions.push({
            status: status
        });
    }

    // Search condition for populated fields
    if (search) {
        // For user and artist populated fields (name, email)
        anyConditions.push({
            $or: [
                { "user.name": { $regex: search, $options: "i" } },
                { "user.email": { $regex: search, $options: "i" } },
                { "artist.name": { $regex: search, $options: "i" } },
                { "artist.email": { $regex: search, $options: "i" } }
            ]
        });
    }

    const whereConditions = anyConditions.length > 0 ? { $and: anyConditions } : {};

    const pages = parseInt(page) || 1;
    const size = parseInt(limit) || 10;
    const skip = (pages - 1) * size;

    
    const result: any = await Booking.find(whereConditions)
        .populate([
            {
                path: "user",
                select: "name email profile"
            },
            {
                path: "artist",
                select: "name email profile"
            }
        ])
        .skip(skip)
        .limit(size);

    // Count the documents that match the search conditions
    const count = await Booking.countDocuments(whereConditions);

    const data: any = {
        data: result,
        meta: {
            page: pages,
            total: count
        }
    };

    return data;
};

const bookingSummaryFromDB = async (): Promise<IBooking | {}> => {

    // total user
    const users = await User.countDocuments({role: "USER"});

    // total artist
    const artist = await User.countDocuments({role: "ARTIST"});

    // balance
    const income = await Booking.aggregate([
        { 
            $group: { 
                _id: null, 
                totalIncome: { $sum: "$price" }
            } 
        },
        {
            $project: {
                totalIncome: 1 || 0,
                totalRevenue: { $subtract: ["$totalIncome", { $multiply: ["$totalIncome", 0.9] }] }  // Subtract 90%
            }
        }
    ]);
    const balance:any = income[0];

    const data = {
        totalUser: users,
        totalArtist: artist,
        balance
    }

    return data;
}


const earningStatisticFromDB = async (): Promise<IBooking[]> => {

    // month with 0 income
    const months:any = [
        { name: "Jan", totalIncome: 0 },
        { name: "Feb", totalIncome: 0 },
        { name: "Mar", totalIncome: 0 },
        { name: "Apr", totalIncome: 0 },
        { name: "May", totalIncome: 0 },
        { name: "Jun", totalIncome: 0 },
        { name: "Jul", totalIncome: 0 },
        { name: "Aug", totalIncome: 0 },
        { name: "Sep", totalIncome: 0 },
        { name: "Oct", totalIncome: 0 },
        { name: "Nov", totalIncome: 0 },
        { name: "Dec", totalIncome: 0 },
    ];

    const now = new Date();
    const currentYear = now.getFullYear();
    const startDate = new Date(currentYear, 0, 1);
    const endDate = new Date(currentYear + 1, 0, 1);

    const monthlyEarnings = await Booking.aggregate([
        { $match: { createdAt: { $gte: startDate, $lt: endDate } } },
        {
            $group: {
                _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                },
                totalIncome: { $sum: '$price' },
            },
        }

    ]);

    monthlyEarnings.forEach((income:any) => {
        const monthIndex = income._id.month - 1;
        months[monthIndex].totalIncome = income.totalIncome;
    });

    return months;
}

const userStatisticFromDB = async (): Promise<IUser[]> => {
    const months:any = [
        { name: "Jan", artist: 0, user: 0 },
        { name: "Feb", artist: 0, user: 0 },
        { name: "Mar", artist: 0, user: 0 },
        { name: "Apr", artist: 0, user: 0 },
        { name: "May", artist: 0, user: 0 },
        { name: "Jun", artist: 0, user: 0 },
        { name: "Jul", artist: 0, user: 0 },
        { name: "Aug", artist: 0, user: 0 },
        { name: "Sep", artist: 0, user: 0 },
        { name: "Oct", artist: 0, user: 0 },
        { name: "Nov", artist: 0, user: 0 },
        { name: "Dec", artist: 0, user: 0 },
    ];

    const now = new Date();
    const currentYear = now.getFullYear();
    const startDate = new Date(currentYear, 0, 1);
    const endDate = new Date(currentYear + 1, 0, 1);

    // Aggregate users by month
    const monthlyUser = await User.aggregate([
        { $match: { role: "USER", createdAt: { $gte: startDate, $lt: endDate } } },
        { $group: { _id: { month: { $month: "$createdAt" } }, count: { $sum: 1 } } }
    ]);

    // Aggregate artists by month
    const monthlyArtist = await User.aggregate([
        { $match: { role: "ARTIST", createdAt: { $gte: startDate, $lt: endDate } } },
        { $group: { _id: { month: { $month: "$createdAt" } }, count: { $sum: 1 } } }
    ]);

    // Merge user data into the months array
    monthlyUser.forEach((user: any) => {
        const monthIndex = user._id.month - 1;
        months[monthIndex].user = user.count;
    });

    // Merge artist data into the months array
    monthlyArtist.forEach((artist: any) => {
        const monthIndex = artist._id.month - 1;
        months[monthIndex].artist = artist.count;
    });

    return months;
};


const createAdminToDB = async (payload: IUser): Promise<IUser> => {
    if (payload.password) {
        const salt = await bcrypt.genSalt(10);
        payload.password = await bcrypt.hash(payload.password, salt);
        
        delete payload.password;
    } else {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Password is required');
    }
    
    const createAdmin: any = await User.create(payload);
    
    if (!createAdmin) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create Admin');
    }
    
    if (createAdmin) {
        await User.findByIdAndUpdate(
            { _id: createAdmin?._id }, 
            { isVerified: true }, 
            { new: true }
        );
    }
    
    return createAdmin;
}




const deleteAdminFromDB = async (id:any): Promise<IUser | undefined> => {

    const isExistAdmin = await User.findByIdAndDelete(id);
    if (!isExistAdmin) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to delete Admin');
    }
    
    return;
}

const getAdminFromDB = async (): Promise<IUser[]> => {

    const admins = await User.find({role: "ADMIN"}).select("name email profile contact location");
    return admins;
}

const getBookingsFromDB = async () => {
  try {
    const bookings = await Booking.find()
    //desending sort by createdAt
      .sort({ createdAt: -1 })
      .populate({
        path: 'serviceProviderId',
        select: 'name email role',
        match: { role: USER_ROLES.ADMIN },
      })
      .populate('servicesId', 'CategoryName')
      .populate('serviceId', 'serviceName price image')
      .populate('userId', 'name email role');

    return bookings;
  } catch (error) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Error fetching bookings from database'
    );
  }
};


export const AdminService = {
    usersFromDB,
    usersFromDBAdmin,
    bookingFromDB,
    transactionsFromDB,
    createSuperAdminToDB,
    bookingSummaryFromDB,
    earningStatisticFromDB,
    userStatisticFromDB,
    createAdminToDB,
    deleteAdminFromDB,
    getAdminFromDB,
    getBookingsFromDB,
}