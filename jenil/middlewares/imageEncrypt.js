const { encryptImageUrl } = require('../utils/imageToken');

const IMAGE_URL_FIELDS = new Set([
    'imageUrl', 'image', 'images', 'thumbnail', 'thumbnailUrl', 'poster', 'banner',
    'logo', 'logoUrl', 'avatar', 'backgroundImage', 'mainImage',
    'coverImage', 'bgImage', 'backgroundUrl', 'patternUrl', 'videoUrl',
    'url', 'content', 'src', 'background', 'photo', 'icon'
]);

const looksLikeImagePath = (value) => {
    if (typeof value !== 'string' || value.trim() === '') return false;
    
    // 1. If it already starts with our encrypted prefix, don't encrypt it again
    if (value.startsWith('/acade360/')) return false;

    const imageExtensions = /\.(png|jpe?g|gif|webp|svg|avif|bmp|ico|tiff?|mp4|webm|mov|m4v|enc)(\?.*)?$/i;
    const isAbsoluteUrl = value.startsWith('http://') || value.startsWith('https://');
    const isRelativePath = value.startsWith('/') || value.startsWith('./') || value.startsWith('../')
        || value.includes('public/') || value.includes('uploads/');
    
    return (isAbsoluteUrl || isRelativePath) && imageExtensions.test(value);
};

const encryptImagesInObject = (obj) => {
    // 1. If it's a string, check if it looks like an image path to internal storage
    if (typeof obj === 'string' && looksLikeImagePath(obj)) {
        const cleanPath = obj.replace(/^public\//, '');
        return '/acade360/' + encryptImageUrl(cleanPath);
    }

    // 2. If it's an array, recurse on each item
    if (Array.isArray(obj)) {
        return obj.map((item) => encryptImagesInObject(item));
    }

    // 3. If it's an object (including Mongoose Maps/Documents), recurse on each property
    if (obj !== null && typeof obj === 'object') {
        const result = {};
        
        // Handle both plain objects and Map-like structures
        const entries = (typeof obj.entries === 'function') ? Array.from(obj.entries()) : Object.entries(obj);
        
        for (const [key, value] of entries) {
            // If the key is specifically known as an image field, or the value itself 
            // looks like an image path, we recurse to encrypt it.
            if (IMAGE_URL_FIELDS.has(key) || (typeof value === 'string' && looksLikeImagePath(value))) {
                result[key] = encryptImagesInObject(value);
            } else if (value !== null && typeof value === 'object') {
                // Keep recursing for nested structures
                result[key] = encryptImagesInObject(value);
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
                const originalStr = JSON.stringify(body);
                body = JSON.parse(originalStr);
                body = encryptImagesInObject(body);
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
