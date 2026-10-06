const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const multer = require('multer');

const uploadDirectory = path.join(__dirname, '..', 'uploads', 'parking-spaces');
const extensionsByMimeType = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDirectory),
  filename: (_req, file, callback) => {
    callback(null, `${randomUUID()}${extensionsByMimeType[file.mimetype]}`);
  },
});

const fileFilter = (_req, file, callback) => {
  if (!extensionsByMimeType[file.mimetype]) {
    const error = new Error('Upload a JPEG, PNG, or WebP image.');
    error.statusCode = 400;
    callback(error);
    return;
  }
  callback(null, true);
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});
