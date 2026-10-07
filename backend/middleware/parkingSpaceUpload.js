const fs = require('fs');
const path = require('path');
const os = require('os');
const { randomUUID } = require('crypto');
const multer = require('multer');

// In serverless environments (Vercel / AWS Lambda), the code directory is read-only.
// Use os.tmpdir() for serverless execution to prevent ENOENT / read-only filesystem crash.
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const uploadDirectory = isServerless
  ? path.join(os.tmpdir(), 'uploads', 'parking-spaces')
  : path.join(__dirname, '..', 'uploads', 'parking-spaces');

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
  console.warn('Upload directory initialization warning:', err.message);
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
    callback(null, `${randomUUID()}${ext}`);
    callback(null, `${randomUUID()}${extensionsByMimeType[file.mimetype] || '.jpg'}`);
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
