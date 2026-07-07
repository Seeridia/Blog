module.exports = {
    write: {
        platform: 'notion',
        notion: {
            token: process.env.NOTION_TOKEN,
            databaseId: process.env.NOTION_DATABASE_ID,
            filter: true,
            sorts: 'dateDesc',
        },
    },

    deploy: {
        platform: 'local',
        local: {
            outputDir: './src/content/blog',
            filename: 'title',
            format: 'markdown',
            frontMatter: {
                enable: true,
            },
        },
    },

    image: {
        enable: true,
        platform: 'local',
        local: {
            outputDir: './src/content/blog',
            imagePathExt: './.elog/image-path.cjs',
            pathFollowDoc: false,
        },
    },
  }