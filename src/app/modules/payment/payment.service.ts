import config from "../../../config";
import { MercadoPagoConfig, Preference } from 'mercadopago';

const client = new MercadoPagoConfig({
    accessToken: config.mercado_secret as string,
    options: { timeout: 5000 }
});

const preference = new Preference(client);

// create payment intent;
const createPaymentIntentToMercado = async (payload: any) => {
    const { price } = payload;

    const paymentData = {
        items: [
            {
                id: "1234",
                title: "Product",
                quantity: 1,
                unit_price: price
            }
        ],
        payer: {
            email: "nadirhossain336@gmail.com", // Optional but recommended
        },
        back_urls: {
            success: 'http://www.your-site.com/success', // Optional but recommended
            failure: 'http://www.your-site.com/failure', // Optional
            pending: 'http://www.your-site.com/pending', // Optional
        },
        auto_return: 'approved', // Optional
    };

    const response = await preference.create({ body: paymentData });
    return response?.init_point;
}


export const PaymentService = {
    createPaymentIntentToMercado
}