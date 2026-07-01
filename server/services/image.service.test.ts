import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImageService } from './image.service';
import sharp from 'sharp';

const sharpMocks = vi.hoisted(() => ({
  sharp: vi.fn(),
  chain: {
    jpeg: vi.fn(),
    png: vi.fn(),
    webp: vi.fn(),
    tiff: vi.fn(),
    resize: vi.fn(),
    extract: vi.fn(),
    rotate: vi.fn(),
    toFile: vi.fn(),
    metadata: vi.fn(),
  },
}));

vi.mock('sharp', () => ({ default: sharpMocks.sharp }));

describe('ImageService', () => {
  const service = new ImageService();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(sharpMocks.chain).forEach((fn: any) => fn.mockReturnValue(sharpMocks.chain));
    sharpMocks.chain.toFile.mockResolvedValue(undefined);
    sharpMocks.chain.metadata.mockResolvedValue({ width: 100, height: 50, format: 'jpeg' });
    sharpMocks.sharp.mockReturnValue(sharpMocks.chain);
  });

  it.each([
    ['photo.jpg', 'jpeg'],
    ['photo.jpeg', 'jpeg'],
    ['photo.png', 'png'],
    ['photo.webp', 'webp'],
    ['photo.gif', 'jpeg'],
  ])('compresses %s with the right encoder', async (input, encoder) => {
    await service.compressImage(input, 'out', 77);

    expect(sharp).toHaveBeenCalledWith(input);
    expect((sharpMocks.chain as any)[encoder]).toHaveBeenCalledWith({ quality: 77 });
    expect(sharpMocks.chain.toFile).toHaveBeenCalledWith('out');
  });

  it('resizes with and without aspect ratio preservation', async () => {
    await service.resizeImage('in', 'out', 200, 100, true);
    await service.resizeImage('in', 'out', 200, 100, false);

    expect(sharpMocks.chain.resize).toHaveBeenNthCalledWith(1, 200, 100, { fit: 'inside' });
    expect(sharpMocks.chain.resize).toHaveBeenNthCalledWith(2, 200, 100, { fit: 'fill' });
    expect(sharpMocks.chain.toFile).toHaveBeenCalledTimes(2);
  });

  it('crops and rotates images', async () => {
    await service.cropImage('in', 'out', 1, 2, 30, 40);
    await service.rotateImage('in', 'out', 90);

    expect(sharpMocks.chain.extract).toHaveBeenCalledWith({ left: 1, top: 2, width: 30, height: 40 });
    expect(sharpMocks.chain.rotate).toHaveBeenCalledWith(90);
    expect(sharpMocks.chain.toFile).toHaveBeenCalledTimes(2);
  });

  it.each(['jpg', 'png', 'webp', 'tiff'] as const)('converts to %s', async (format) => {
    await service.convertImageFormat('in', 'out', format);

    expect((sharpMocks.chain as any)[format === 'jpg' ? 'jpeg' : format]).toHaveBeenCalled();
    expect(sharpMocks.chain.toFile).toHaveBeenCalledWith('out');
  });

  it('returns image metadata', async () => {
    await expect(service.getImageMetadata('in')).resolves.toEqual({ width: 100, height: 50, format: 'jpeg' });
    expect(sharpMocks.chain.metadata).toHaveBeenCalled();
  });
});
