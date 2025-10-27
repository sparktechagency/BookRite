import { Schema, model, Types } from "mongoose";

const purchaseSchema = new Schema({
    userId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    platform: { type: String, enum: ["google_play"], required: true },
    productId: { type: String, required: true, index: true },
    orderId: { type: String, required: true, index: true },
    purchaseToken: { type: String, required: true, unique: true },
    acknowledged: { type: Boolean, default: false },
    autoRenewing: { type: Boolean, default: false },
    purchaseState: { type: Number },
    expiryTime: { type: Date },
    raw: { type: Schema.Types.Mixed },
    status: { type: String, enum: ["ACTIVE", "CANCELED", "PENDING", "EXPIRED"], default: "PENDING" },
}, { timestamps: true });

purchaseSchema.index({ orderId: 1, platform: 1 });

export const PurchaseModel = model("Purchase", purchaseSchema);