const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const multer = require('multer');

const uploadDirectory = path.join(__dirname, '..', 'uploads', 'parking-lots');
const extensionsByMimeType = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

fs.mkdirSync(uploadDirectory, { recursive: true });

const resolveExtension = (file) => {
  const mime = (file.mimetype || '').toLowerCase();
  if (extensionsByMimeType[mime]) return extensionsByMimeType[mime];
  const origExt = path.extname(file.originalname || '').toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(origExt)) {
    return origExt === '.jpeg' ? '.jpg' : origExt;
  }
  return '.jpg';
};

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDirectory),
  filename: (_req, file, callback) => {
    const ext = resolveExtension(file);
    callback(null, `lot_${randomUUID()}${ext}`);
  },
});

const fileFilter = (_req, file, callback) => {
  const mime = (file.mimetype || '').toLowerCase();
  const origExt = path.extname(file.originalname || '').toLowerCase();
  if (
    extensionsByMimeType[mime] ||
    mime.startsWith('image/') ||
    ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(origExt)
  ) {
    return callback(null, true);
  }
  const error = new Error('Upload a JPEG, PNG, or WebP image.');
  error.statusCode = 400;
  callback(error);
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});
