import type { Config, IntegrationUserConfig, ThemeUserConfig } from 'astro-pure/types';

export const theme: ThemeUserConfig = {
  // === Basic configuration ===
  /** Title for your website. Will be used in metadata and as browser tab title. */
  title: "Seeridia's Home",
  /** Will be used in index page & copyright declaration */
  author: 'Seeridia',
  description: 'Seeridia 的小小小的大窝！',
  favicon: '/favicon/favicon.ico',
  /** Specify the default language for this site. */
  locale: {
    lang: 'zh-CN',
    attrs: 'zh_CN',
    // Date locale
    dateLocale: 'en-US',
    dateOptions: {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }
  },
  /** Set a logo image to show in the homepage. */
  logo: {
    src: 'src/assets/avatar.png',
    alt: 'Avatar'
  },

  // === Global configuration ===
  titleDelimiter: '•',
  prerender: true,
  npmCDN: 'https://cdn.jsdelivr.net/npm',

  // Still in test
  head: [
    /* Telegram channel */
    // {
    //   tag: 'meta',
    //   attrs: { name: 'telegram:channel', content: '@cworld0_cn' },
    //   content: ''
    // }
  ],
  customCss: [],

  /** Configure the header of your site. */
  header: {
    menu: [
      { title: 'Blog', link: '/blog' },
      { title: 'Projects', link: '/projects' },
      { title: 'Links', link: '/links' },
      { title: 'About', link: '/about' }
    ]
  },

  /** Configure the footer of your site. */
  footer: {
    // Year format
    year: `© ${new Date().getFullYear()}`,
    // year: `© 2019 - ${new Date().getFullYear()}`,
    links: [
      {
        title: '闽ICP备2025099091号',
        link: 'https://beian.miit.gov.cn',
      },
      {
        title: '闽公网安备35018302000247号',
        link: 'https://beian.mps.gov.cn/#/query/webSearch?code=35018302000247',
      }
    ],
    /** Enable displaying a “Astro & Pure theme powered” link in your site’s footer. */
    credits: false,
    /** Optional details about the social media accounts for this site. */
    social: { github: 'https://github.com/seeridia', email: 'mailto:seeridia@gmail.com' }
  },

  content: {
    /** External links configuration */
    externalLinks: {
      content: ' ↗',
      /** Properties for the external links element */
      properties: {
        style: 'user-select:none'
      }
    },
    /** Blog page size for pagination (optional) */
    blogPageSize: 8,
    // Currently support weibo, x, bluesky
    share: ['weibo', 'x', 'bluesky']
  }
}

export const integ: IntegrationUserConfig = {
  // Links management
  // See: https://astro-pure.js.org/docs/integrations/links
  links: {
    // Friend logbook
    logbook: [
    ],
    applyTip: [
      { name: 'Name', val: theme.title },
      { name: 'Desc', val: theme.description || 'Null' },
      { name: 'Link', val: 'https://blog.seeridia.top' },
      { name: 'Avatar', val: 'https://www.github.com/Seeridia.png' }
    ]
  },
  // Enable page search function
  pagefind: true,
  // Add a random quote to the footer (default on homepage footer)
  // See: https://astro-pure.js.org/docs/integrations/advanced#web-content-render
  quote: {
    // https://developer.hitokoto.cn/sentence/#%E8%AF%B7%E6%B1%82%E5%9C%B0%E5%9D%80
    // server: 'https://v1.hitokoto.cn/?c=i',
    // target: (data) => (data as { hitokoto: string }).hitokoto || 'Error'
    // https://github.com/lukePeavey/quotable
    server: 'https://api.quotable.io/quotes/random?maxLength=60',
    target: `(data) => data[0].content || 'Error'`
  },
  // UnoCSS typography
  // See: https://unocss.dev/presets/typography
  typography: {
    class: 'prose text-base text-muted-foreground',
    // The style of blockquote font, normal or italic (default to italic in typography)
    blockquoteStyle: 'italic',
    // The style of inline code block, code or modern (default to code in typography)
    inlineCodeBlockStyle: 'modern'
  },
  // A lightbox library that can add zoom effect
  // See: https://astro-pure.js.org/docs/integrations/others#medium-zoom
  mediumZoom: {
    enable: true, // disable it will not load the whole library
    selector: '.prose .zoomable',
    options: {
      className: 'zoomable'
    }
  },
  // Comment system
  waline: {
    enable: true,
    // Server service link
    server: 'https://waline.seeridia.top/',
    // Refer https://waline.js.org/en/guide/features/emoji.html
    emoji: ['bmoji', 'weibo'],
    // Refer https://waline.js.org/en/reference/client/props.html
    additionalConfigs: {
      search: false,
      pageview: true,
      comment: true,
      locale: {
        reaction0: 'Like',
        placeholder: '其实在这边的评论我也不知道自己会不会看到……',
      },
      imageUploader: true
    }
  }
}

const config = { ...theme, integ } as Config
export default config