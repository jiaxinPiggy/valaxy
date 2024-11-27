import type { PageData, PostFrontMatter } from 'valaxy/types'
import { isClient } from '@vueuse/core'
import { computed, inject } from 'vue'

import { useRoute } from 'vue-router'
import { useSiteConfig } from '../config'

/**
 * Get `route.meta.frontmatter` from your markdown file
 * @example
 * ```md
 * ---
 * title: Hello World
 * ---
 * ```
 *
 * ```ts
 * const fm = useFrontmatter()
 * console.log(fm.value.title)
 *
 * const fm = useFrontmatter<{ custom: string }>()
 * console.log(fm.value.custom)
 * ```
 */
export function useFrontmatter<T extends Record<string, any> = PostFrontMatter>() {
  // inject not in app root
  const route = useRoute()
  const frontmatter = computed(() => {
    return route.meta.frontmatter as Partial<PostFrontMatter & T> || {}
  })
  return frontmatter
}

/**
 * inject pageData
 */
export function useData(): PageData {
  const value = inject<PageData>('pageData', {} as any)
  return value
}

/**
 * get full url
 */
export function useFullUrl() {
  const siteConfig = useSiteConfig()
  const route = useRoute()
  const url = computed(() => {
    const siteUrl = siteConfig.value.url.endsWith('/') ? siteConfig.value.url.slice(0, -1) : siteConfig.value.url
    const origin = siteUrl || (isClient && window.location.origin)
    return origin + route.path
  })
  return url
}
