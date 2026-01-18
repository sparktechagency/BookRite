import axios from "axios";
const APPLE_VERIFY_URL_PROD = "https://buy.itunes.apple.com/verifyReceipt";
const APPLE_VERIFY_URL_SANDBOX = "https://sandbox.itunes.apple.com/verifyReceipt";
const APPLE_SHARED_SECRET = process.env.APPLE_SHARED_SECRET!;

export async function verifyAppleReceipt(receiptData: string) {
    const verify = async (url: string) => {
        return axios.post(url, {
            "receipt-data": receiptData,
            "password": APPLE_SHARED_SECRET,
            "exclude-old-transactions": true
        });
    };

    try {
        let response = await verify(APPLE_VERIFY_URL_PROD);

        if (response.data.status === 21007) {
            response = await verify(APPLE_VERIFY_URL_SANDBOX);
        }

        if (response.data.status !== 0) {
            throw new Error(`Apple Receipt invalid. Status: ${response.data.status}`);
        }

        const latestInfo = response.data.latest_receipt_info 
            ? response.data.latest_receipt_info[0] 
            : response.data.receipt;

        return latestInfo;

    } catch (error: any) {
        throw new Error(error.response?.data?.message || error.message);
    }
}
