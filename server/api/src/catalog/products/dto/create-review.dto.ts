import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

export const CreateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().optional(),
  content: z.string().min(1),
});

export type CreateReviewDto = z.infer<typeof CreateReviewSchema>;

export class CreateReviewDtoClass {
  @ApiProperty({ description: 'Review rating from 1 to 5', minimum: 1, maximum: 5 })
  rating!: number;

  @ApiProperty({ description: 'Review title (optional)', required: false })
  title?: string;

  @ApiProperty({ description: 'Review content' })
  content!: string;
}
