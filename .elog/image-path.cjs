const path = require('path')

function getTitle(doc) {
    return doc.properties?.title || doc.title || 'untitled'
}

/**
 * @param {object} doc Elog 文档对象
 * @param {string} outputDir elog.config.js 中 image.local.outputDir
 * @returns {{ dirPath: string, prefixKey: string }}
 */
const getImagePath = (doc, outputDir) => {
    const title = getTitle(doc)

    // doc.docPath 通常是当前文档所在目录，例如 src/content/blog
    const docPath = doc.docPath

    // 图片实际保存目录：
    // src/content/blog/{title}/img
    const dirPath = path.join(outputDir, title, 'img')

    // 同步阶段，文章 md 还在 src/content/blog/{title}.md，
    // 所以图片路径先会被写成 {title}/img/xxx
    const prefixKey = path.relative(docPath, dirPath)

    return {
        dirPath,
        prefixKey,
    }
}

module.exports = {
    getImagePath,
}