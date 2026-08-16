/**
 * Admin file uploads.
 *
 * Photos  → Cloudinary CDN (public listing gallery)
 * PDFs    → local disk under uploads/contracts (admin-only contracts;
 *           Cloudinary blocks public PDF delivery by default, and signed
 *           owner agreements should not be world-readable on a CDN anyway)
 */

import { Router, type Response, type NextFunction } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { can } from '../permissions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTRACTS_DIR = path.join(__dirname, '../../uploads/contracts');

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']);
const DOC_TYPES = new Set(['application/pdf']);

// CLOUDINARY_URL in .env is enough — the SDK picks it up here.
cloudinary.config(true);

/** Busboy hands filenames over as latin1; Georgian names need re-decoding. */
function originalName(file: Express.Multer.File): string {
  return Buffer.from(file.originalname, 'latin1').toString('utf8');
}

function safeBase(original: string): string {
  return path.basename(original, path.extname(original))
    .replace(/[^\p{L}\p{N}._-]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'file';
}

function uniqueName(original: string, ext: string): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeBase(original)}${ext}`;
}

function uploadPhoto(file: Express.Multer.File): Promise<{
  url: string;
  name: string;
  size: number;
  kind: 'image';
}> {
  const name = originalName(file);
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'tbilisirealtor/photos',
        public_id: uniqueName(name, ''),
        resource_type: 'image',
        overwrite: false,
        access_mode: 'public',
      },
      (err, result) => {
        if (err || !result?.secure_url) {
          reject(err ?? new Error('CLOUDINARY_EMPTY'));
          return;
        }
        resolve({ url: result.secure_url, name, size: file.size, kind: 'image' });
      },
    );
    stream.end(file.buffer);
  });
}

function saveContract(file: Express.Multer.File): {
  url: string;
  name: string;
  size: number;
  kind: 'pdf';
} {
  fs.mkdirSync(CONTRACTS_DIR, { recursive: true });
  const name = originalName(file);
  const filename = uniqueName(name, '.pdf');
  fs.writeFileSync(path.join(CONTRACTS_DIR, filename), file.buffer);
  return {
    url: `/uploads/contracts/${encodeURIComponent(filename)}`,
    name,
    size: file.size,
    kind: 'pdf',
  };
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024, files: 20 },
  fileFilter(_req, file, cb) {
    if (IMAGE_TYPES.has(file.mimetype) || DOC_TYPES.has(file.mimetype)) cb(null, true);
    else cb(new Error('UNSUPPORTED_TYPE'));
  },
});

const router = Router();
router.use(requireAuth);

router.post('/', upload.array('files', 20), async (req: AuthRequest, res: Response): Promise<void> => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (!files.length) {
    res.status(400).json({ error: 'ფაილი არ არის მიმაგრებული' });
    return;
  }

  const photos = files.filter(f => IMAGE_TYPES.has(f.mimetype));
  const contracts = files.filter(f => DOC_TYPES.has(f.mimetype));

  // Members may add listing photos but never signed agreements.
  if (photos.length && !can(req.user, 'uploads.images')) {
    res.status(403).json({ error: 'ფოტოს ატვირთვის უფლება არ გაქვთ' });
    return;
  }
  if (contracts.length && !can(req.user, 'uploads.documents')) {
    res.status(403).json({ error: 'დოკუმენტის ატვირთვის უფლება არ გაქვთ' });
    return;
  }

  if (photos.length && !process.env.CLOUDINARY_URL) {
    res.status(501).json({
      error: 'Cloudinary არ არის კონფიგურირებული — დაამატეთ CLOUDINARY_URL .env-ში',
    });
    return;
  }

  try {
    const uploadedPhotos = await Promise.all(photos.map(uploadPhoto));
    const savedContracts = contracts.map(saveContract);
    res.json({ files: [...uploadedPhotos, ...savedContracts] });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(502).json({ error: 'ატვირთვა ვერ მოხერხდა' });
  }
});

/* Multer rejects (size, type) arrive as errors, not as 4xx — translate them here. */
router.use((err: Error, _req: AuthRequest, res: Response, next: NextFunction) => {
  if (!err) { next(); return; }
  if (err.message === 'UNSUPPORTED_TYPE') {
    res.status(415).json({ error: 'დაშვებულია მხოლოდ სურათი (JPG, PNG, WEBP) და PDF' });
    return;
  }
  if ((err as { code?: string }).code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({ error: 'ფაილი 12MB-ზე დიდია' });
    return;
  }
  console.error('Upload error:', err);
  res.status(500).json({ error: 'ატვირთვა ვერ მოხერხდა' });
});

export default router;
