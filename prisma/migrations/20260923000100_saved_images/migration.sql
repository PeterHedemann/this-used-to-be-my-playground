-- CreateTable
CREATE TABLE `SavedImage` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `filename` TEXT NOT NULL,
    `contentType` VARCHAR(191) NOT NULL DEFAULT 'image/png',
    `byteSize` INTEGER NOT NULL,
    `width` INTEGER NOT NULL,
    `height` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SavedImage_userId_createdAt_id_idx`(`userId`(191), `createdAt`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ImageContent` (
    `imageId` VARCHAR(191) NOT NULL,
    `bytes` LONGBLOB NOT NULL,

    PRIMARY KEY (`imageId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SavedImage` ADD CONSTRAINT `SavedImage_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImageContent` ADD CONSTRAINT `ImageContent_imageId_fkey` FOREIGN KEY (`imageId`) REFERENCES `SavedImage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
