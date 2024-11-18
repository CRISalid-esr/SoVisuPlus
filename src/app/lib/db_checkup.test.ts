import { dbCheckup } from '@/lib/db_checkup';
import { PrismaClient } from '@prisma/client';

jest.mock('@prisma/client', () => {
    const mockPrismaClient = {
      $queryRaw: jest.fn(),
    };
    return { PrismaClient: jest.fn(() => mockPrismaClient) };
  });
  
  const mockPrisma = new PrismaClient();
  
  describe('dbCheckup', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });
  
    it('should return "connected" when the database is reachable', async () => {
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValueOnce(1);
  
      const result = await dbCheckup();

      console.log('result',result);
  
      expect(result.dbStatus).toBe('connected');
      expect(result.dbError).toBeNull();
      expect(mockPrisma.$queryRaw).toHaveBeenCalled(); // Check if the function is called
    });
  
    it('should return "not connected" when the database is unreachable', async () => {
      const error = new Error('Database connection failed');
      (mockPrisma.$queryRaw as jest.Mock).mockRejectedValueOnce(error);
  
      const result = await dbCheckup();
  
      expect(result.dbStatus).toBe('not connected');
      expect(result.dbError).toEqual(error);
      expect(mockPrisma.$queryRaw).toHaveBeenCalled(); // Check if the function is called
    });
  });