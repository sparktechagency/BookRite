import { z } from 'zod'
import { objectIdZodSchema } from '../../../helpers/checkObjectIdZodSchemaHelper'

const createReservationZodSchema = z.object({
    body: z.object({
        provider : objectIdZodSchema("Provider Object Id"),
        service : objectIdZodSchema("Service Object Id"),
        price: z.number({ required_error: 'PRice is required' })
    })
})

export const ReviewValidationValidation = {
    createReservationZodSchema
}
