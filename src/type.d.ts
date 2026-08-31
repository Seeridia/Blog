declare module 'virtual:config' {
  const Config: import('astro-pure/types').ConfigOutput
  export default Config
}

declare module '*.astro' {
  const component: import('astro/runtime/server/index.js').AstroComponentFactory
  export default component
}
