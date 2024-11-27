import type { InlineConfig, ViteDevServer } from 'vite'
import type { ResolvedValaxyOptions } from '../../options'
import type { ValaxyNode } from '../../types'
import os from 'node:os'

import path from 'node:path'
import process from 'node:process'
import * as readline from 'node:readline'
import consola from 'consola'
import { colors } from 'consola/utils'
import ora from 'ora'
import { blue, bold, cyan, dim, gray, green, underline, yellow } from 'picocolors'
import { version } from 'valaxy/package.json'
import { mergeConfig } from 'vite'
import { mergeViteConfigs } from '../../common'
import { valaxyPrefix, vLogger } from '../../logger'
import { createServer } from '../../server'

let server: ViteDevServer | undefined

export function printInfo(options: ResolvedValaxyOptions, port?: number, remote?: string | boolean) {
  const themeVersion = blue(`v${options.config.themeConfig?.pkg?.version}`) || 'unknown'

  console.log()
  console.log(`  ${bold('🌌 Valaxy')}  ${blue(`v${version}`)}`)
  console.log()
  console.log(`${dim('  🪐 theme  ')} > ${(options.theme ? green(options.theme) : gray('none'))} (${themeVersion})`)
  console.log(`  ${dim('📁')} ${dim(path.resolve(options.userRoot))}`)
  if (port) {
    console.log()
    console.log(`${dim('  Preview   ')} > ${cyan(`http://localhost:${bold(port)}/`)}`)

    if (remote) {
      Object.values(os.networkInterfaces())
        .forEach(v =>
          (v || [])
            .filter(details => details.family === 'IPv4' && !details.address.includes('127.0.0.1'))
            .forEach(({ address }) => {
              console.log(`${dim('  Network   ')} > ${blue(`http://${address}:${bold(port)}/`)}`)
            }),
        )
    }

    console.log()
    const restart = `${underline('r')}${dim('estart')}`
    const edit = `${underline('e')}${dim('dit')}`
    const open = `${underline('o')}${dim('pen')}`
    const qr = `${underline('q')}${dim('r')}`
    const divider = `${dim(' | ')}`
    console.log(`${dim('  shortcuts ')} > ${restart}${divider}${open}${divider}${qr}${divider}${edit}`)
  }
  console.log()
}

// const CONFIG_RESTART_FIELDS: ValaxyConfigExtendKey[] = [
//   'vite',
//   'vue',
//   'unocss',
//   'unocssPresets',
//   'markdown',
//   'extendMd',
// ]

export const serverSpinner = ora(`${valaxyPrefix} creating server ...`)
export async function initServer(valaxyApp: ValaxyNode, viteConfig: InlineConfig) {
  if (server) {
    vLogger.info('close server...')
    await server.close()
  }

  const { options } = valaxyApp

  serverSpinner.start()
  const viteConfigs: InlineConfig = mergeConfig(
    await mergeViteConfigs(options, 'serve'),
    viteConfig,
  )

  try {
    server = await createServer(valaxyApp, viteConfigs, {
      async onConfigReload(newConfig, config, force = false) {
        if (force) {
          vLogger.info(`${yellow('force')} reload the server`)
          initServer(valaxyApp, viteConfig)
        }

        let reload = false

        if (newConfig.theme !== config.theme)
          reload = true

        // consola.info('Find new icon, reload server...')
        // consola.info(`If you do not want to reload, write icon name in ${yellow('vite.config.ts')} ${green('valaxy.unocss.safelist')}.`)
        // console.log()
        // reload = true

        // if (CONFIG_RESTART_FIELDS.some(i => !equal(newConfig[i], config[i]))) {
        //   reload = true
        //   console.log(yellow('\n  restarting on config change\n'))
        // }

        if (reload)
          initServer(valaxyApp, viteConfig)
      },
    })
    await server.listen()
    serverSpinner.succeed(`${valaxyPrefix} ${colors.green('server ready.')}`)
  }
  catch (e) {
    consola.error('failed to start server. error:\n')
    console.error(e)
    process.exit(1)
  }
}

/**
 * bind shortcut for terminal
 */
export function bindShortcut(SHORTCUTS: { name: string, fullName: string, action: () => void }[]) {
  process.stdin.resume()
  process.stdin.setEncoding('utf8')
  readline.emitKeypressEvents(process.stdin)
  if (process.stdin.isTTY)
    process.stdin.setRawMode(true)

  process.stdin.on('keypress', (str, key) => {
    if (key.ctrl && key.name === 'c') {
      process.exit()
    }
    else {
      const [sh] = SHORTCUTS.filter(item => item.name === str)
      if (sh) {
        try {
          sh.action()
        }
        catch (err) {
          console.error(`Failed to execute shortcut ${sh.fullName}`, err)
        }
      }
    }
  })
}
