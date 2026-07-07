const fs = require('fs')
const path = require('path')
const matter = require('gray-matter')
const { blogDir } = require('./constants.cjs')
const { getMutedColor } = require('./colors.cjs')
const { buildFrontmatter, getArticleSlug, isElogMarkdown } = require('./frontmatter.cjs')
const {
    ensureCoverWebp,
    fixImagePaths,
    localizeRemoteMarkdownImages,
} = require('./images.cjs')
const { ensureDir, isMarkdownFile, moveDirContents } = require('./utils.cjs')

async function rewriteArticle(articleDir, indexFile, options = {}) {
    const { localizeRemoteImages = true } = options
    const raw = fs.readFileSync(indexFile, 'utf8')
    const parsed = matter(raw)

    const articleTitle = parsed.data.title || path.basename(articleDir)
    const normalizedContent = fixImagePaths(parsed.content.trimStart(), articleTitle)
    const fixedContent = localizeRemoteImages
        ? await localizeRemoteMarkdownImages(articleDir, normalizedContent)
        : normalizedContent

    const coverPath = await ensureCoverWebp(articleDir, parsed.data)
    const heroColor = coverPath ? await getMutedColor(coverPath) : null

    const nextFrontmatter = buildFrontmatter(parsed.data, articleTitle, heroColor)
    const nextContent = `${nextFrontmatter}${fixedContent}`

    fs.writeFileSync(indexFile, nextContent, 'utf8')

    console.log(`rewritten: ${path.relative(process.cwd(), indexFile)}`)
}

function replaceHeroImageLine(raw, heroColor) {
    const heroImageLine = `heroImage: { src: './cover.webp', color: '${heroColor}' }`
    const frontmatterMatch = raw.match(/^---\n([\s\S]*?)\n---/)

    if (!frontmatterMatch) return raw
    if (/^heroImage:.*$/m.test(frontmatterMatch[1])) {
        return raw.replace(/^heroImage:.*$/m, heroImageLine)
    }

    const insertBeforeLanguage = /^language:.*$/m
    if (insertBeforeLanguage.test(frontmatterMatch[1])) {
        return raw.replace(insertBeforeLanguage, `${heroImageLine}\n$&`)
    }

    return raw.replace(/\n---/, `\n${heroImageLine}\n---`)
}

async function rewriteArticleHeroColor(articleDir, indexFile) {
    const raw = fs.readFileSync(indexFile, 'utf8')
    const parsed = matter(raw)

    const coverPath = await ensureCoverWebp(articleDir, parsed.data)
    const heroColor = coverPath ? await getMutedColor(coverPath) : null
    if (!heroColor) return

    const nextContent = replaceHeroImageLine(raw, heroColor)
    fs.writeFileSync(indexFile, nextContent, 'utf8')

    console.log(`rewritten: ${path.relative(process.cwd(), indexFile)}`)
}

async function moveRootMarkdownFile(fileName) {
    const sourcePath = path.join(blogDir, fileName)

    if (!fs.statSync(sourcePath).isFile()) return
    if (!isMarkdownFile(fileName)) return

    const raw = fs.readFileSync(sourcePath, 'utf8')
    if (!isElogMarkdown(raw)) return

    const ext = path.extname(fileName)
    const parsed = matter(raw)
    const title = parsed.data.title || path.basename(fileName, ext)
    const slug = getArticleSlug(parsed.data, title)

    const titleImageDir = path.join(blogDir, title)
    const articleDir = path.join(blogDir, slug)
    const targetPath = path.join(articleDir, `index${ext}`)

    ensureDir(articleDir)
    moveDirContents(titleImageDir, articleDir)

    let content = raw
    content = fixImagePaths(content, title)

    fs.writeFileSync(targetPath, content, 'utf8')
    fs.unlinkSync(sourcePath)

    console.log(`moved: ${fileName} -> ${slug}/index${ext}`)

    await rewriteArticle(articleDir, targetPath)
}

async function processExistingArticleDir(entryName) {
    const articleDir = path.join(blogDir, entryName)

    if (!fs.statSync(articleDir).isDirectory()) return

    const indexMd = path.join(articleDir, 'index.md')
    const indexMdx = path.join(articleDir, 'index.mdx')

    if (fs.existsSync(indexMd)) {
        await rewriteArticleHeroColor(articleDir, indexMd)
    } else if (fs.existsSync(indexMdx)) {
        await rewriteArticleHeroColor(articleDir, indexMdx)
    }
}

async function main() {
    if (!fs.existsSync(blogDir)) {
        console.error(`blogDir not found: ${blogDir}`)
        process.exit(1)
    }

    const entries = fs.readdirSync(blogDir)

    // 先处理 Elog 新生成在 blog 根目录下的 md/mdx 文件
    for (const entry of entries) {
        const fullPath = path.join(blogDir, entry)

        if (fs.statSync(fullPath).isFile() && isMarkdownFile(entry)) {
            await moveRootMarkdownFile(entry)
        }
    }

    if (!process.argv.includes('--rewrite-existing')) return

    const latestEntries = fs.readdirSync(blogDir)
    for (const entry of latestEntries) {
        const fullPath = path.join(blogDir, entry)

        if (fs.statSync(fullPath).isDirectory()) {
            await processExistingArticleDir(entry)
        }
    }
}

module.exports = {
    main,
    moveRootMarkdownFile,
    processExistingArticleDir,
    rewriteArticle,
    rewriteArticleHeroColor,
}
