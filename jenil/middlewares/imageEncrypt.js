const { encryptImageUrl } = require('../utils/imageToken');

const IMAGE_URL_FIELDS = new Set([
    'imageUrl', 'image', 'images', 'thumbnail', 'thumbnailUrl', 'poster', 'banner',
    'logo', 'logoUrl', 'avatar', 'backgroundImage', 'mainImage',
    'coverImage', 'bgImage', 'backgroundUrl', 'patternUrl', 'videoUrl',
    'url', 'content', 'src', 'background'
]);

const looksLikeImagePath = (value) => {
    if (typeof value !== 'string' || value.trim() === '') return false;
    const imageExtensions = /\.(png|jpe?g|gif|webp|svg|avif|bmp|ico|tiff?|mp4|webm|mov|m4v|enc)(\?.*)?$/i;
    const isAbsoluteUrl = value.startsWith('http://') || value.startsWith('https://');
    const isRelativePath = value.startsWith('/') || value.startsWith('./') || value.startsWith('../') 
                         || value.includes('public/') || value.includes('uploads/');
    return (isAbsoluteUrl || isRelativePath) && imageExtensions.test(value);
};

const encryptImagesInObject = (obj) => {
    if (typeof obj === 'string' && looksLikeImagePath(obj)) {
        const cleanPath = obj.replace(/^public\//, '');
        return encryptImageUrl(cleanPath);
    }

    if (Array.isArray(obj)) {
        return obj.map((item) => encryptImagesInObject(item));
    }

    if (obj !== null && typeof obj === 'object') {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            if (IMAGE_URL_FIELDS.has(key)) {
                if (looksLikeImagePath(value)) {
                    const cleanPath = value.replace(/^public\//, '');
                    result[key] = encryptImageUrl(cleanPath);
                    continue;
                } else if (Array.isArray(value)) {
                    result[key] = value.map((item) => {
                        if (typeof item === 'string' && looksLikeImagePath(item)) {
                            const cleanPath = item.replace(/^public\//, '');
                            return encryptImageUrl(cleanPath);
                        }
                        return encryptImagesInObject(item);
                    });
                    continue;
                }
            }
            result[key] = Array.isArray(value) ? value.map((item) => encryptImagesInObject(item)) : encryptImagesInObject(value);
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
                body = JSON.parse(JSON.stringify(body));
                
                body = encryptImagesInObject(body);
            }
        } catch (err) {
            console.error('[ImageEncrypt] Error encrypting image URLs:', err.message);
        }
        return originalJson(body);
    };

    next();
};

module.exports = imageEncryptMiddleware;
