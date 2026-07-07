const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { IMAGE_EXTS } = require('./constants.cjs')

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true })
}

function isMarkdownFile(file) {
    return file.endsWith('.md') || file.endsWith('.mdx')
}

function isImageFile(file) {
    return IMAGE_EXTS.includes(path.extname(file).toLowerCase())
}

function hashString(value) {
    return crypto.createHash('md5').update(value).digest('hex')
}

function moveDirContents(sourceDir, targetDir) {
    if (!fs.existsSync(sourceDir)) return
    if (path.resolve(sourceDir) === path.resolve(targetDir)) return

    ensureDir(targetDir)

    for (const entry of fs.readdirSync(sourceDir)) {
        const sourcePath = path.join(sourceDir, entry)
        const targetPath = path.join(targetDir, entry)

        if (fs.existsSync(targetPath)) {
            if (fs.statSync(sourcePath).isDirectory() && fs.statSync(targetPath).isDirectory()) {
                moveDirContents(sourcePath, targetPath)
                fs.rmSync(sourcePath, { recursive: true, force: true })
                continue
            }

            fs.rmSync(targetPath, { recursive: true, force: true })
        }

        fs.renameSync(sourcePath, targetPath)
    }

    fs.rmSync(sourceDir, { recursive: true, force: true })
}

module.exports = {
    ensureDir,
    hashString,
    isImageFile,
    isMarkdownFile,
    moveDirContents,
}
