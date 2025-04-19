import { z } from 'zod'
import { objectIdZodSchema } from '../../../helpers/checkObjectIdZodSchemaHelper'

const createOfferZodSchema = z.object({
    body: z.object({
        provider : objectIdZodSchema("Provider Object Id"),
        service : objectIdZodSchema("Service Object Id"),
        price: z.number({ required_error: 'Price is required' })
    })
})

export const OfferValidationValidation = {
    createOfferZodSchema
}
