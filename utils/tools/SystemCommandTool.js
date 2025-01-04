// SystemCommandTool.js
import { AbstractTool } from './AbstractTool.js'
import { exec } from 'child_process'
import { promisify } from 'util'
import os from 'os'
import cfg from '../../../../lib/config/config.js'

const execAsync = promisify(exec)

export class SystemCommandTool extends AbstractTool {
  name = 'systemCommand'
  
  #safeCommands = {
    windows: [
      'dir', 'echo', 'type', 'systeminfo', 
      'tasklist', 'ver', 'hostname', 'time',
      'date', 'ping', 'ipconfig'
    ],
    linux: [
      'ls', 'echo', 'cat', 'uname', 'ps',
      'pwd', 'date', 'uptime', 'free',
      'df', 'ping', 'ifconfig', 'ip','lspci'
    ]
  }

  parameters = {
    properties: {
      command: {
        type: 'string',
        description: 'The command to execute'
      }
    },
    required: ['command']
  }

  description = `Execute system commands. Commands: ${
    os.platform() === 'win32' 
      ? this.#safeCommands.windows.join(', ')
      : this.#safeCommands.linux.join(', ')
  }`

  #isWindows = os.platform() === 'win32'

  func = async (opts, e) => {
    if (!cfg.masterQQ?.includes(e.user_id)) return `用户权限不足`
    try {
      const { command } = opts
      if (!command) {
        return '命令不能为空'
      }

      // 安全性检查
      const mainCommand = command.split(' ')[0].toLowerCase()
      const platform = this.#isWindows ? 'windows' : 'linux'
      if (!this.#safeCommands[platform].includes(mainCommand)) {
        return `命令不在允许列表中。\n可用命令:\n${this.#safeCommands[platform].join(', ')}`
      }

      // 执行命令
      logger.info(`[SystemCommandTool] Executing: ${command}`)
      const { stdout, stderr } = await execAsync(command, {
        timeout: 10000,
        maxBuffer: 1024 * 1024
      })

      // 格式化输出
      let output = ''
      if (stdout) output += stdout
      if (stderr) output += `\nErrors:\n${stderr}`
      
      return output.trim() || '命令执行成功,无输出'

    } catch (error) {
      logger.error('[SystemCommandTool] Error:', error)
      return `命令执行失败: ${error.message}`
    }
  }

  async processText(text, e) {
    const cmdMatch = text.match(/^[!/](cmd|系统|命令)\s+(.+)$/i)
    if (cmdMatch) {
      return await this.func({ command: cmdMatch[2].trim() }, e)
    }
    return null
  }
}