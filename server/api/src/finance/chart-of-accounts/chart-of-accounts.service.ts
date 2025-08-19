import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { CreateChartOfAccountDto, UpdateChartOfAccountDto } from './dto';

@Injectable()
export class ChartOfAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createChartOfAccountDto: CreateChartOfAccountDto) {
    // Check if account code already exists
    const existingAccount = await this.prisma.chartOfAccount.findUnique({
      where: { code: createChartOfAccountDto.code },
    });

    if (existingAccount) {
      throw new ConflictException(`Account with code ${createChartOfAccountDto.code} already exists`);
    }

    // If parentId is provided, verify it exists
    if (createChartOfAccountDto.parentId) {
      const parentAccount = await this.prisma.chartOfAccount.findUnique({
        where: { id: createChartOfAccountDto.parentId },
      });

      if (!parentAccount) {
        throw new NotFoundException(`Parent account with ID ${createChartOfAccountDto.parentId} not found`);
      }
    }

    return this.prisma.chartOfAccount.create({
      data: createChartOfAccountDto,
      include: {
        parent: true,
        children: true,
      },
    });
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    type?: string;
    isActive?: boolean;
  }) {
    const { page = 1, limit = 10, type, isActive } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (type) where.type = type;
    if (isActive !== undefined) where.isActive = isActive;

    const [accounts, total] = await Promise.all([
      this.prisma.chartOfAccount.findMany({
        where,
        skip,
        take: limit,
        include: {
          parent: true,
          children: true,
        },
        orderBy: [
          { code: 'asc' },
          { name: 'asc' },
        ],
      }),
      this.prisma.chartOfAccount.count({ where }),
    ]);

    return {
      data: accounts,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTree() {
    const accounts = await this.prisma.chartOfAccount.findMany({
      where: { isActive: true },
      include: {
        children: {
          where: { isActive: true },
          include: {
            children: {
              where: { isActive: true },
            },
          },
        },
      },
      orderBy: [
        { code: 'asc' },
        { name: 'asc' },
      ],
    });

    // Return only root accounts (those without parent)
    return accounts.filter(account => !account.parentId);
  }

  async findOne(id: string) {
    const account = await this.prisma.chartOfAccount.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        taxMappings: {
          include: {
            taxCategory: true,
          },
        },
      },
    });

    if (!account) {
      throw new NotFoundException(`Chart of account with ID ${id} not found`);
    }

    return account;
  }

  async update(id: string, updateChartOfAccountDto: UpdateChartOfAccountDto) {
    // Check if account exists
    const existingAccount = await this.prisma.chartOfAccount.findUnique({
      where: { id },
    });

    if (!existingAccount) {
      throw new NotFoundException(`Chart of account with ID ${id} not found`);
    }

    // If code is being updated, check for conflicts
    if (updateChartOfAccountDto.code && updateChartOfAccountDto.code !== existingAccount.code) {
      const codeConflict = await this.prisma.chartOfAccount.findUnique({
        where: { code: updateChartOfAccountDto.code },
      });

      if (codeConflict) {
        throw new ConflictException(`Account with code ${updateChartOfAccountDto.code} already exists`);
      }
    }

    // If parentId is being updated, verify it exists and doesn't create circular reference
    if (updateChartOfAccountDto.parentId) {
      if (updateChartOfAccountDto.parentId === id) {
        throw new ConflictException('Account cannot be its own parent');
      }

      const parentAccount = await this.prisma.chartOfAccount.findUnique({
        where: { id: updateChartOfAccountDto.parentId },
      });

      if (!parentAccount) {
        throw new NotFoundException(`Parent account with ID ${updateChartOfAccountDto.parentId} not found`);
      }

      // Check for circular reference by traversing up the tree
      let currentParentId = parentAccount.parentId;
      while (currentParentId) {
        if (currentParentId === id) {
          throw new ConflictException('Cannot set parent that would create a circular reference');
        }
        const currentParent = await this.prisma.chartOfAccount.findUnique({
          where: { id: currentParentId },
        });
        currentParentId = currentParent?.parentId || null;
      }
    }

    return this.prisma.chartOfAccount.update({
      where: { id },
      data: updateChartOfAccountDto,
      include: {
        parent: true,
        children: true,
      },
    });
  }

  async remove(id: string) {
    // Check if account exists
    const account = await this.prisma.chartOfAccount.findUnique({
      where: { id },
      include: {
        children: true,
        taxMappings: true,
      },
    });

    if (!account) {
      throw new NotFoundException(`Chart of account with ID ${id} not found`);
    }

    // Check if account has children
    if (account.children.length > 0) {
      throw new ConflictException('Cannot delete account with child accounts. Please reassign or delete child accounts first.');
    }

    // Check if account has tax mappings
    if (account.taxMappings.length > 0) {
      throw new ConflictException('Cannot delete account with tax mappings. Please remove tax mappings first.');
    }

    return this.prisma.chartOfAccount.delete({
      where: { id },
    });
  }
}
