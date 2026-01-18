import catchAsync from "../../../shared/catchAsync";
import { settingsService } from "./setting.service";
const getPrivacyPolicy = catchAsync(async (req, res): Promise<void> => {
    const htmlContent = await settingsService.getPrivacyPolicy();
    res.sendFile(htmlContent);
});

const getAccountDelete = catchAsync(async (req, res): Promise<void> => {
    const htmlContent = await settingsService.getAccountDelete();
    res.sendFile(htmlContent);
});

const getSupport = catchAsync(async (req, res): Promise<void> => {
    const htmlContent = await settingsService.getSupport();
    res.sendFile(htmlContent);
});

export const settingsController = {
    getPrivacyPolicy,
    getAccountDelete,
    getSupport
};