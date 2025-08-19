import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

export const UpdateReviewSchema = z.object({
  isApproved: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateReviewDto = z.infer<typeof UpdateReviewSchema>;

export class UpdateReviewDtoClass {
  @ApiProperty({ description: 'Whether the review is approved', required: false })
  isApproved?: boolean;

  @ApiProperty({ description: 'Whether the review is active', required: false })
  isActive?: boolean;
}
