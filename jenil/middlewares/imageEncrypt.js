const { encryptImageUrl } = require('../utils/imageToken');

const IMAGE_URL_FIELDS = new Set([
    'imageUrl', 'image', 'images', 'thumbnail', 'thumbnailUrl', 'poster', 'banner',
    'logo', 'logoUrl', 'avatar', 'backgroundImage', 'mainImage',
    'coverImage', 'bgImage', 'backgroundUrl', 'patternUrl', 'videoUrl',
    'url', 'content', 'src', 'background', 'photo', 'icon'
]);

const MEDIA_EXTENSIONS = /\.(png|jpe?g|gif|webp|svg|avif|bmp|ico|tiff?|mp4|webm|mov|m4v|enc)(\?.*)?$/i;

const getRequestBaseUrl = (req) => {
    const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http').toString().split(',')[0].trim();
    const host = (req.headers['x-forwarded-host'] || req.get('host') || '').toString().split(',')[0].trim();
    if (!host) return '';
    return `${proto}://${host}`;
};

const isAlreadyEncryptedUrl = (value) => {
    if (typeof value !== 'string') return false;

    if (value.startsWith('/acade360/') || value.startsWith('/acade360/img/')) return true;

    if (/^https?:\/\//i.test(value)) {
        try {
            const url = new URL(value);
            return url.pathname.startsWith('/acade360/') || url.pathname.startsWith('/acade360/img/');
        } catch { }
    }

    return false;
};

const looksLikeInternalMediaPath = (value) => {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    if (trimmed === '') return false;

    // Avoid encrypting data URIs or already encrypted URLs/tokens.
    if (trimmed.startsWith('data:')) return false;
    if (isAlreadyEncryptedUrl(trimmed)) return false;

    // Do not encrypt arbitrary external URLs (it would break image serving).
    if (/^https?:\/\//i.test(trimmed)) return false;

    return MEDIA_EXTENSIONS.test(trimmed);
};

const encryptImagesInObject = (obj, baseUrl) => {
    // 1. If it's a string, check if it looks like an image path to internal storage
    if (typeof obj === 'string' && looksLikeInternalMediaPath(obj)) {
        const cleanPath = obj.replace(/^\/+/, '');
        const token = encryptImageUrl(cleanPath);
        if (baseUrl) return `${baseUrl}/acade360/${token}`;
        return `/acade360/${token}`;
    }

    // 2. If it's an array, recurse on each item
    if (Array.isArray(obj)) {
        return obj.map((item) => encryptImagesInObject(item, baseUrl));
    }

    // 3. If it's an object (including Mongoose Maps/Documents), recurse on each property
    if (obj !== null && typeof obj === 'object') {
        const result = {};
        
        // Handle both plain objects and Map-like structures
        const entries = (typeof obj.entries === 'function') ? Array.from(obj.entries()) : Object.entries(obj);
        
        for (const [key, value] of entries) {
            // If the key is specifically known as an image field, or the value itself 
            // looks like an image path, we recurse to encrypt it.
            if (IMAGE_URL_FIELDS.has(key) || (typeof value === 'string' && looksLikeInternalMediaPath(value))) {
                result[key] = encryptImagesInObject(value, baseUrl);
            } else if (value !== null && typeof value === 'object') {
                // Keep recursing for nested structures
                result[key] = encryptImagesInObject(value, baseUrl);
            } else {
                result[key] = value;
            }
        }
        return result;
    }

    return obj;
};

const imageEncryptMiddleware = (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = (body) => {
        try {
            if (body && typeof body === 'object') {
                const baseUrl = getRequestBaseUrl(req);
                const originalStr = JSON.stringify(body);
                body = JSON.parse(originalStr);
                body = encryptImagesInObject(body, baseUrl);
                const finalStr = JSON.stringify(body);
                
                if (originalStr !== finalStr) {
                    console.log(`[ImageEncrypt] Encrypted fields in response.`);
                }
            }
        } catch (err) {
            console.error('[ImageEncrypt] Error encrypting image URLs:', err.message);
        }
        return originalJson(body);
    };

    next();
};

module.exports = imageEncryptMiddleware;
