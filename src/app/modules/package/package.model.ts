import { model, Schema } from "mongoose";
import { IPackage, PackageModel } from "./package.interface";
import { z } from "zod";

const packageSchema = new Schema<IPackage, PackageModel>(
    {
        title: {
            type: String,
            required: false
        },
        description: {
            type: [String],
            required: false
        },
        price: {
            type: Number,
            required: false,
            default: 0 //free plan need 
        },
        priceId: { type: String, required: false },
        duration: {
            type: String,
            enum: ['1 month', '3 months', '6 months', '1 year'],
            required: false
        },
        paymentType: {
            type: String,
            enum: ['Monthly', 'Yearly'],
            required: false
        },
        productId: {
            type: String,
            required: false
        },
        credit: {
            type: Number,
            required: false,
            default: 10,
        },
        paymentLink: {
            type: String,
            required: false
        },
        status: {
            type: String,
            enum: ['Active', 'Delete'],
            default: "Active"
        },
        isFree: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true
    }
)

export const Package = model<IPackage, PackageModel>("Package", packageSchema)