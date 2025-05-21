import {
  Category as PrismaCategory,
  StreamStatus as PrismaStreamStatus,
  ImageFolder as PrismaImageFolder,
} from '@prisma/client';

export const Category = PrismaCategory;
export type Category = PrismaCategory;

export const StreamStatus = PrismaStreamStatus;
export type StreamStatus = PrismaStreamStatus;

export const ImageFolderEnum = PrismaImageFolder;
export type ImageFolderEnum = PrismaImageFolder;