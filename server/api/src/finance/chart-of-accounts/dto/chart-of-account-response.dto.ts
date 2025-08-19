import { ApiProperty } from '@nestjs/swagger';

export class ChartOfAccountResponseDto {
  @ApiProperty({ description: 'Unique identifier for the chart of account' })
  id!: string;

  @ApiProperty({ description: 'Account code (unique)' })
  code!: string;

  @ApiProperty({ description: 'Account name' })
  name!: string;

  @ApiProperty({ description: 'Account type', enum: ['asset', 'liability', 'equity', 'revenue', 'expense'] })
  type!: string;

  @ApiProperty({ description: 'Parent account ID (for hierarchical structure)', required: false })
  parentId?: string;

  @ApiProperty({ description: 'Account description', required: false })
  description?: string;

  @ApiProperty({ description: 'Whether the account is active' })
  isActive!: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: Date;

  @ApiProperty({ description: 'Parent account details', required: false })
  parent?: ChartOfAccountResponseDto;

  @ApiProperty({ description: 'Child accounts', type: [ChartOfAccountResponseDto] })
  children!: ChartOfAccountResponseDto[];
}
