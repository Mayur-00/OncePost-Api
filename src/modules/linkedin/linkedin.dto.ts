import {z} from 'zod';

// Validate OAuth callback
export const LinkedInCallbackSchema = z.object({
  code: z.string().min(1, 'Authorization code required'),
  state: z.string().min(1, 'State parameter required'),
  error: z.string().optional(),
  error_description: z.string().optional(),
});
export type LinkedInCallbackDto = z.infer<typeof LinkedInCallbackSchema>;

export const multerFileSchema = z.object({
    fieldname: z.string(),
      originalname: z.string(),
      encoding: z.string(),
      mimetype: z.string(),
      size: z.number(),
      buffer: z.instanceof(Buffer),
});

export const CreateLinkedinPostSchema = z.object({
  text: z.string().min(1).max(3000, 'Post text max 3000 characters').optional(),
  visibility: z.enum(['PUBLIC', 'CONNECTIONS']).default('PUBLIC'),
});
export type CreateLinkedInPostDto = z.infer<typeof CreateLinkedinPostSchema>;
