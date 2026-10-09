const fs = require('fs');
const path = require('path');
const os = require('os');
const { randomUUID } = require('crypto');
const multer = require('multer');

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const uploadDirectory = isServerless
  ? path.join(os.tmpdir(), 'uploads', 'walk-in-plates')
  : path.join(__dirname, '..', 'uploads', 'walk-in-plates');

const extensionsByMimeType = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

try {
  fs.mkdirSync(uploadDirectory, { recursive: true });
} catch (err) {
  console.warn('Walk-in upload directory initialization warning:', err.message);
}

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
  destination: (_req, _file, callback) => {
    try {
      fs.mkdirSync(uploadDirectory, { recursive: true });
    } catch {}
    callback(null, uploadDirectory);
  },
  filename: (_req, file, callback) => {
    const ext = resolveExtension(file);
    callback(null, `plate-${randomUUID()}${ext}`);
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
  return callback(new Error('Only JPEG, PNG, or WEBP vehicle plate image files are allowed.'));
};

const walkInPhotoUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

module.exports = walkInPhotoUpload;
