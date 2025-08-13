import { BadRequestException } from '@nestjs/common';
import { ZodValidationPipe } from './zod-validation.pipe';
import { z } from 'zod';

describe('ZodValidationPipe', () => {
  const testSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email format'),
    age: z.number().min(18, 'Must be at least 18'),
  });

  let pipe: ZodValidationPipe;

  beforeEach(() => {
    pipe = new ZodValidationPipe(testSchema);
  });

  describe('transform', () => {
    it('should transform valid data successfully', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
      };

      const result = pipe.transform(validData, {} as any);

      expect(result).toEqual(validData);
    });

    it('should throw BadRequestException for invalid data', () => {
      const invalidData = {
        name: '',
        email: 'invalid-email',
        age: 16,
      };

      expect(() => pipe.transform(invalidData, {} as any)).toThrow(BadRequestException);
    });

    it('should include validation errors in BadRequestException', () => {
      const invalidData = {
        name: '',
        email: 'invalid-email',
        age: 16,
      };

      try {
        pipe.transform(invalidData, {} as any);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toBe('Validation failed');
        expect(error.getResponse()).toEqual({
          message: 'Validation failed',
          errors: [
            { field: 'name', message: 'Name is required' },
            { field: 'email', message: 'Invalid email format' },
            { field: 'age', message: 'Must be at least 18' },
          ],
        });
      }
    });

    it('should handle single validation error', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'invalid-email',
        age: 25,
      };

      try {
        pipe.transform(invalidData, {} as any);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = error.getResponse();
        expect(response.errors).toHaveLength(1);
        expect(response.errors[0]).toEqual({
          field: 'email',
          message: 'Invalid email format',
        });
      }
    });

    it('should handle nested object validation', () => {
      const nestedSchema = z.object({
        user: z.object({
          name: z.string().min(1, 'Name is required'),
          profile: z.object({
            age: z.number().min(18, 'Must be at least 18'),
          }),
        }),
      });

      const pipe = new ZodValidationPipe(nestedSchema);
      const invalidData = {
        user: {
          name: '',
          profile: {
            age: 16,
          },
        },
      };

      try {
        pipe.transform(invalidData, {} as any);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = error.getResponse();
        expect(response.errors).toEqual([
          { field: 'user.name', message: 'Name is required' },
          { field: 'user.profile.age', message: 'Must be at least 18' },
        ]);
      }
    });

    it('should handle array validation', () => {
      const arraySchema = z.object({
        tags: z.array(z.string().min(1, 'Tag cannot be empty')).min(1, 'At least one tag is required'),
      });

      const pipe = new ZodValidationPipe(arraySchema);
      const invalidData = {
        tags: ['', 'valid-tag'],
      };

      try {
        pipe.transform(invalidData, {} as any);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = error.getResponse();
        expect(response.errors).toEqual([
          { field: 'tags.0', message: 'Tag cannot be empty' },
        ]);
      }
    });

    it('should handle missing required fields', () => {
      const invalidData = {
        name: 'John Doe',
        // email and age are missing
      };

      try {
        pipe.transform(invalidData, {} as any);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = error.getResponse();
        expect(response.errors).toEqual([
          { field: 'email', message: 'Required' },
          { field: 'age', message: 'Required' },
        ]);
      }
    });

    it('should handle extra fields gracefully', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
        extraField: 'should be ignored',
      };

      const result = pipe.transform(validData, {} as any);

      expect(result).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
        extraField: 'should be ignored',
      });
    });

    it('should handle empty object', () => {
      const emptyData = {};

      try {
        pipe.transform(emptyData, {} as any);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = error.getResponse();
        expect(response.errors).toEqual([
          { field: 'name', message: 'Required' },
          { field: 'email', message: 'Required' },
          { field: 'age', message: 'Required' },
        ]);
      }
    });

    it('should handle null values', () => {
      const nullData = {
        name: null,
        email: null,
        age: null,
      };

      try {
        pipe.transform(nullData, {} as any);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = error.getResponse();
        expect(response.errors).toEqual([
          { field: 'name', message: 'Expected string, received null' },
          { field: 'email', message: 'Expected string, received null' },
          { field: 'age', message: 'Expected number, received null' },
        ]);
      }
    });

    it('should handle undefined values', () => {
      const undefinedData = {
        name: undefined,
        email: undefined,
        age: undefined,
      };

      try {
        pipe.transform(undefinedData, {} as any);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = error.getResponse();
        expect(response.errors).toEqual([
          { field: 'name', message: 'Required' },
          { field: 'email', message: 'Required' },
          { field: 'age', message: 'Required' },
        ]);
      }
    });
  });
});
