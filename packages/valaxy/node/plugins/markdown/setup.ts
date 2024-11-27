import type MarkdownIt from 'markdown-it'

import type Token from 'markdown-it/lib/token.mjs'
import type { ResolvedValaxyOptions } from '../../options'

import type { ThemeOptions } from './types'
import {
  headersPlugin,
  type HeadersPluginOptions,
} from '@mdit-vue/plugin-headers'
import { sfcPlugin, type SfcPluginOptions } from '@mdit-vue/plugin-sfc'

import { titlePlugin } from '@mdit-vue/plugin-title'

import { tocPlugin, type TocPluginOptions } from '@mdit-vue/plugin-toc'
import { slugify } from '@mdit-vue/shared'
import { cssI18nContainer } from 'css-i18n'
import anchorPlugin from 'markdown-it-anchor'

import attrsPlugin from 'markdown-it-attrs'
import { full as emojiPlugin } from 'markdown-it-emoji'

import footnotePlugin from 'markdown-it-footnote'
// https://www.npmjs.com/package/markdown-it-image-figures
import imageFigures from 'markdown-it-image-figures'
import TaskLists from 'markdown-it-task-lists'
import { linkPlugin } from './plugins/link'
import { containerPlugin } from './plugins/markdown-it/container'

import { footnoteTooltipPlugin } from './plugins/markdown-it/footnoteTooltip'
import { highlightLinePlugin } from './plugins/markdown-it/highlightLines'
import Katex from './plugins/markdown-it/katex'
import { lineNumberPlugin } from './plugins/markdown-it/lineNumbers'
import { preWrapperPlugin } from './plugins/markdown-it/preWrapper'
import { snippetPlugin } from './plugins/markdown-it/snippet'

export const defaultCodeTheme = { light: 'github-light', dark: 'github-dark' } as const as ThemeOptions

export async function setupMarkdownPlugins(
  md: MarkdownIt,
  options?: ResolvedValaxyOptions,
  // isExcerpt = false,
  base = '/',
) {
  const mdOptions = options?.config.markdown || {}
  const theme = mdOptions.theme ?? defaultCodeTheme
  const hasSingleTheme = typeof theme === 'string' || 'name' in theme
  const siteConfig = options?.config.siteConfig || {}

  if (mdOptions.preConfig)
    mdOptions.preConfig(md)

  // custom plugins
  md.use(highlightLinePlugin)
    .use(preWrapperPlugin, { theme, siteConfig })
    .use(snippetPlugin, options?.userRoot)
    .use(containerPlugin, {
      hasSingleTheme,
    }, {
      ...mdOptions.blocks,
      ...mdOptions?.container,
    })
    .use(cssI18nContainer, {
      languages: options?.config.siteConfig.languages,
    })
    .use(
      linkPlugin,
      {
        target: '_blank',
        rel: 'noreferrer',
        ...mdOptions.externalLinks,
      },
      base,
    )

  // ref vitepress
  md.use(lineNumberPlugin, mdOptions.lineNumbers)

  // conflict with {% %}
  // 3rd party plugins
  if (!mdOptions.attrs?.disable)
    md.use(attrsPlugin, mdOptions.attrs)

  md.use(emojiPlugin)
    .use(footnotePlugin)
    .use(footnoteTooltipPlugin)
  // if (!isExcerpt) {
  md.use(anchorPlugin, {
    slugify,
    permalink: anchorPlugin.permalink.linkInsideHeader({
      symbol: '&ZeroWidthSpace;',
      renderAttrs: (slug, state) => {
        // Find `heading_open` with the id identical to slug
        const idx = state.tokens.findIndex((token: Token) => {
          const attrs = token.attrs
          const id = attrs?.find(attr => attr[0] === 'id')
          return id && slug === id[1]
        })
        // Get the actual heading content
        const title = state.tokens[idx + 1].content
        return {
          'aria-label': `Permalink to "${title}"`,
        }
      },
    }),
    ...mdOptions.anchor,
  })
  // }

  md
    .use(headersPlugin, {
      slugify,
      ...(typeof mdOptions.headers === 'boolean' ? undefined : mdOptions.headers),
    } as HeadersPluginOptions)
    .use(sfcPlugin, {
      ...mdOptions.sfc,
    } as SfcPluginOptions)
    .use(titlePlugin)
    .use(tocPlugin, {
      ...mdOptions.toc,
    } as TocPluginOptions)

  md.use(Katex, mdOptions.katex)

  const vanillaLazyload = options?.config.siteConfig.vanillaLazyload || { enable: false }
  // markdown-it-image-figures
  md.use(imageFigures, {
    figcaption: true,
    // default web performance recommended settings
    lazy: true,
    async: true,

    // removeSrc and classes are required by vanilla-lazyload
    ...(vanillaLazyload.enable
      ? {
          lazy: true,
          async: true,
          classes: 'lazy',
          // when removeSrc, vite can not handle relative path
          // removeSrc in useVanillaLazyload onMounted
          // removeSrc: true,
        }
      : {}),

    ...mdOptions.imageFigures,
  })

  md.use(TaskLists)

  if (mdOptions.config)
    mdOptions.config(md)

  return md as MarkdownIt
}
