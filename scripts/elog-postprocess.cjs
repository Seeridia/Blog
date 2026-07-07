const { main } = require('./elog-postprocess/article.cjs')

main().catch((error) => {
    console.error(error)
    process.exit(1)
})
