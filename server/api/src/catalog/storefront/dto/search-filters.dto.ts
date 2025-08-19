import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

export const SearchFiltersSchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(12),
  categoryId: z.string().optional(),
  categorySlug: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  rating: z.coerce.number().optional(),
  sortBy: z.enum(['name', 'price', 'rating', 'createdAt', 'sortOrder']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  filters: z.string().optional(), // JSON string for additional filters
});

export type SearchFiltersDto = z.infer<typeof SearchFiltersSchema>;

export class SearchFiltersDtoClass {
  @ApiProperty({ description: 'Search query', required: false })
  q?: string;

  @ApiProperty({ description: 'Page number', default: 1 })
  page!: number;

  @ApiProperty({ description: 'Items per page', default: 12 })
  limit!: number;

  @ApiProperty({ description: 'Category ID filter', required: false })
  categoryId?: string;

  @ApiProperty({ description: 'Category slug filter', required: false })
  categorySlug?: string;

  @ApiProperty({ description: 'Minimum price filter', required: false })
  minPrice?: number;

  @ApiProperty({ description: 'Maximum price filter', required: false })
  maxPrice?: number;

  @ApiProperty({ description: 'Minimum rating filter', required: false })
  rating?: number;

  @ApiProperty({ description: 'Sort field', enum: ['name', 'price', 'rating', 'createdAt', 'sortOrder'], default: 'name' })
  sortBy!: string;

  @ApiProperty({ description: 'Sort order', enum: ['asc', 'desc'], default: 'asc' })
  sortOrder!: 'asc' | 'desc';

  @ApiProperty({ description: 'Additional filters as JSON string', required: false })
  filters?: string;
}
