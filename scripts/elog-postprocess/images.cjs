const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const { IMAGE_EXTS } = require('./constants.cjs')
const { ensureDir, hashString, isImageFile } = require('./utils.cjs')

async function downloadImageToWebp(url, targetPath) {
    if (typeof fetch !== 'function') {
        throw new Error('当前 Node 版本不支持 fetch，请升级到 Node 18+')
    }

    const response = await fetch(url)

    if (!response.ok) {
        throw new Error(`下载封面失败：${response.status} ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    await sharp(buffer)
        .resize({
            width: 1800,
            withoutEnlargement: true,
        })
        .webp({ quality: 86 })
        .toFile(targetPath)
}

async function downloadRemoteImage(url, targetPath) {
    if (typeof fetch !== 'function') {
        throw new Error('当前 Node 版本不支持 fetch，请升级到 Node 18+')
    }

    const response = await fetch(url)

    if (!response.ok) {
        throw new Error(`下载图片失败：${response.status} ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    fs.writeFileSync(targetPath, Buffer.from(arrayBuffer))
}

async function convertImageToWebp(sourcePath, targetPath) {
    await sharp(sourcePath)
        .resize({
            width: 1800,
            withoutEnlargement: true,
        })
        .webp({ quality: 86 })
        .toFile(targetPath)
}

function getRemoteImageFileName(url) {
    const { pathname } = new URL(url)
    const ext = path.extname(pathname).toLowerCase()
    const imageExt = IMAGE_EXTS.includes(ext) ? ext : '.png'

    return `${hashString(pathname)}${imageExt}`
}

async function localizeRemoteMarkdownImages(articleDir, content) {
    const imageDir = path.join(articleDir, 'img')
    const imagePattern = /!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g
    const replacements = []

    for (const match of content.matchAll(imagePattern)) {
        const [raw, alt, url] = match
        const fileName = getRemoteImageFileName(url)
        const targetPath = path.join(imageDir, fileName)
        const localPath = `./img/${fileName}`

        if (!fs.existsSync(targetPath)) {
            ensureDir(imageDir)
            await downloadRemoteImage(url, targetPath)
        }

        replacements.push([raw, `![${alt}](${localPath})`])
    }

    return replacements.reduce(
        (nextContent, [remoteImage, localImage]) => nextContent.split(remoteImage).join(localImage),
        content
    )
}

function findFirstImageInDir(dir) {
    if (!fs.existsSync(dir)) return null

    const files = fs.readdirSync(dir)

    // 优先找 cover.xxx
    const cover = files.find((file) => {
        const lower = file.toLowerCase()
        return lower.startsWith('cover.') && isImageFile(lower)
    })

    if (cover) {
        return path.join(dir, cover)
    }

    const firstImage = files.find((file) => isImageFile(file))

    return firstImage ? path.join(dir, firstImage) : null
}

function resolveLocalCoverPath(articleDir, coverValue) {
    if (!coverValue || typeof coverValue !== 'string') return null
    if (/^https?:\/\//.test(coverValue)) return null

    const normalized = coverValue
        .replace(/^\.\//, '')
        .replace(/^\/+/, '')

    const possiblePaths = [
        path.join(articleDir, normalized),
        path.join(articleDir, 'img', normalized),
    ]

    return possiblePaths.find((filePath) => fs.existsSync(filePath)) || null
}

async function ensureCoverWebp(articleDir, frontmatter) {
    const coverPath = path.join(articleDir, 'cover.webp')

    if (fs.existsSync(coverPath)) {
        return coverPath
    }

    const coverValue = frontmatter.cover

    // 1. 优先使用 Elog / Notion 生成的 cover 字段
    if (typeof coverValue === 'string' && /^https?:\/\//.test(coverValue)) {
        try {
            await downloadImageToWebp(coverValue, coverPath)
            return coverPath
        } catch (error) {
            console.warn(`[cover] Notion cover 下载失败，将尝试使用文章图片：${error.message}`)
        }
    }

    // 2. 如果 cover 是本地路径，尝试转换为 cover.webp
    const localCover = resolveLocalCoverPath(articleDir, coverValue)
    if (localCover) {
        await convertImageToWebp(localCover, coverPath)
        return coverPath
    }

    // 3. 兜底：使用 img 目录下第一张图片作为封面
    const firstImage = findFirstImageInDir(path.join(articleDir, 'img'))
    if (firstImage) {
        await convertImageToWebp(firstImage, coverPath)
        return coverPath
    }

    return null
}

function fixImagePaths(content, title) {
    const oldPrefix1 = `./${title}/img/`
    const oldPrefix2 = `${title}/img/`
    const encodedTitle = encodeURI(title)
    const oldPrefix3 = `./${encodedTitle}/img/`
    const oldPrefix4 = `${encodedTitle}/img/`

    return content
        .split(oldPrefix1).join('./img/')
        .split(oldPrefix2).join('./img/')
        .split(oldPrefix3).join('./img/')
        .split(oldPrefix4).join('./img/')
}

module.exports = {
    ensureCoverWebp,
    findFirstImageInDir,
    fixImagePaths,
    getRemoteImageFileName,
    localizeRemoteMarkdownImages,
}
