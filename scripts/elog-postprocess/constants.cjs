const path = require('path')

const blogDir = path.resolve(process.cwd(), 'src/content/blog')

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.svg']
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

module.exports = {
    blogDir,
    IMAGE_EXTS,
    UUID_RE,
}
