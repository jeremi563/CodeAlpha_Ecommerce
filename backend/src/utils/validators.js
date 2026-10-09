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
