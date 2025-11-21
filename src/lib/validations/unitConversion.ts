import { z } from 'zod';

export const createUnitConversionSchema = z.object({
  fromUnit: z.string().min(1, 'From unit is required').max(20, 'From unit too long'),
  toUnit: z.string().min(1, 'To unit is required').max(20, 'To unit too long'),
  factor: z.number().positive('Conversion factor must be positive'),
  category: z.string().min(1, 'Category is required').max(50, 'Category too long'),
});

export const updateUnitConversionSchema = z.object({
  id: z.string().cuid('Invalid unit conversion ID'),
  factor: z.number().positive('Conversion factor must be positive').optional(),
  category: z.string().min(1, 'Category is required').max(50, 'Category too long').optional(),
});

export const deleteUnitConversionSchema = z.object({
  id: z.string().cuid('Invalid unit conversion ID'),
});

export type CreateUnitConversionInput = z.infer<typeof createUnitConversionSchema>;
export type UpdateUnitConversionInput = z.infer<typeof updateUnitConversionSchema>;
export type DeleteUnitConversionInput = z.infer<typeof deleteUnitConversionSchema>;
