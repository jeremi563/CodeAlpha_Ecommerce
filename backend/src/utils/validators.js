import { z } from 'zod';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const uuidSchema = z.string().regex(UUID_REGEX, { message: 'Invalid UUID format' });

export const productIdSchema = z.string().regex(UUID_REGEX, {
  message: 'Product id must be a valid UUID',
});

export const orderIdSchema = z.string().regex(UUID_REGEX, {
  message: 'Order id must be a valid UUID',
});

export const registerSchema = z.object({
  name: z
    .string({ required_error: 'name must be between 1 and 80 characters' })
    .trim()
    .min(1, 'name must be between 1 and 80 characters')
    .max(80, 'name must be between 1 and 80 characters'),
  email: z
    .string({ required_error: 'email and password are required' })
    .trim()
    .toLowerCase()
    .min(1, 'email and password are required')
    .email('email must be a valid email address'),
  password: z
    .string({ required_error: 'email and password are required' })
    .min(8, 'password must be at least 8 characters and no more than 72 bytes')
    .max(72, 'password must be at least 8 characters and no more than 72 bytes'),
}).passthrough();

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'email and password are required' })
    .trim()
    .toLowerCase()
    .min(1, 'email and password are required')
    .email('email must be a valid email address'),
  password: z
    .string({ required_error: 'email and password are required' })
    .min(1, 'email and password are required'),
}).passthrough();

export const productCreateSchema = z.object({
  name: z.string().trim().min(1, 'name must be a non-empty string'),
  description: z.string().trim().nullable().optional(),
  price: z.coerce.number().min(0, 'price must be a non-negative number'),
  stock: z.coerce.number().int('stock must be a non-negative integer').min(0, 'stock must be a non-negative integer').optional(),
  imageUrl: z.string().trim().nullable().optional(),
  isActive: z.boolean().optional(),
}).passthrough();

export const productUpdateSchema = productCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'Provide at least one product field to update' },
);

export const cartItemSchema = z.object({
  productId: productIdSchema,
  quantity: z.coerce.number().int('quantity must be a positive integer').min(1, 'quantity must be a positive integer'),
}).passthrough();

export const cartQuantitySchema = z.object({
  quantity: z.coerce.number().int('quantity must be a positive integer').min(1, 'quantity must be a positive integer'),
}).passthrough();

export const orderStatusSchema = z.object({
  status: z.enum(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'], {
    errorMap: () => ({ message: 'status must be one of: PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED' }),
  }),
}).passthrough();

export const createOrderSchema = z.object({
  recipientName: z.string({ required_error: 'recipientName is required' }).trim().min(1, 'recipientName is required').max(100, 'recipientName must be 100 characters or fewer'),
  deliveryPhone: z.string({ required_error: 'deliveryPhone is required' }).trim().min(7, 'deliveryPhone must be a valid phone number').max(20, 'deliveryPhone must be a valid phone number'),
  deliveryAddress: z.string({ required_error: 'deliveryAddress is required' }).trim().min(5, 'deliveryAddress must be at least 5 characters').max(200, 'deliveryAddress must be 200 characters or fewer'),
  deliveryCity: z.string({ required_error: 'deliveryCity is required' }).trim().min(2, 'deliveryCity is required').max(80, 'deliveryCity must be 80 characters or fewer'),
  deliveryCounty: z.string({ required_error: 'deliveryCounty is required' }).trim().min(2, 'deliveryCounty is required').max(80, 'deliveryCounty must be 80 characters or fewer'),
  deliveryInstructions: z.string().trim().max(300, 'deliveryInstructions must be 300 characters or fewer').optional().default(''),
}).passthrough();

export const mpesaRequestSchema = z.object({
  orderId: orderIdSchema.optional(),
  phone: z.string().trim().refine((value) => /^0\d{9}$/.test(value) || /^254\d{9}$/.test(value) || /^\+254\d{9}$/.test(value), {
    message: 'phone number must be a valid Kenyan mobile number',
  }).transform((value) => {
    const cleaned = value.replace(/\s+/g, '').replace(/\+/g, '');
    if (/^254/.test(cleaned)) return cleaned;
    if (/^0\d{9}$/.test(cleaned)) return `254${cleaned.slice(1)}`;
    return cleaned;
  }),
  amount: z.coerce.number().min(1, 'amount must be a positive number').optional(),
  accountReference: z.string().trim().min(1, 'accountReference is required').max(20, 'accountReference is too long').optional().default('NEXORA'),
  transactionDesc: z.string().trim().min(1, 'transactionDesc is required').max(140, 'transactionDesc is too long').optional().default('Nexora Store purchase'),
}).passthrough();

export function parseBody(schema, body, fallbackMessage = 'Request body must be a JSON object') {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: fallbackMessage };
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    return { error: result.error.issues[0]?.message || fallbackMessage };
  }

  return { data: result.data };
}

export function parseStringParam(schema, value, fallbackMessage) {
  const result = schema.safeParse(value);
  if (!result.success) {
    return { error: result.error.issues[0]?.message || fallbackMessage };
  }
  return { data: result.data };
}
