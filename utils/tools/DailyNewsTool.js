import { AbstractTool } from './AbstractTool.js'
import fetch from 'node-fetch'

export class DailyNewsTool extends AbstractTool {
  name = 'dailyNews'
  
  parameters = {
    properties: {
      action: {
        type: 'string',
        enum: ['getNews'],
        description: 'Get daily news summary'
      }
    },
    required: ['action']
  }

  func = async function (opts) {
    try {
      // 添加请求头和超时设置
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000) // 10秒超时

      const response = await fetch('https://60s.viki.moe/?v2=1', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        },
        signal: controller.signal
      })

      clearTimeout(timeout)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const jsonData = await response.json()

      // 检查数据格式
      if (!jsonData?.data?.news || !Array.isArray(jsonData.data.news)) {
        throw new Error('新闻数据格式无效')
      }

      const { news, tip, updated } = jsonData.data

      // 格式化时间
      const updateTime = new Date(updated).toLocaleString('zh-CN', {
        hour12: false,
        timeZone: 'Asia/Shanghai'
      })

      // 构建返回消息
      let message = `今日要闻 (更新时间: ${updateTime})：\n\n`
      message += news.map((item, index) => `${index + 1}. ${item}`).join('\n')
      message += `\n\n${tip}` // 添加每日寄语

      return message
    } catch (error) {
      logger.error(`[DailyNewsTool] 获取新闻失败: ${error.message}`, error)

      // 更友好的错误提示
      if (error.name === 'AbortError') {
        return '获取新闻超时，请稍后再试'
      }
      if (error.name === 'FetchError') {
        return '网络请求失败，请检查网络连接'
      }
      return '获取新闻失败，请稍后重试'
    }
  }

  // 添加缓存机制
  #cache = {
    data: null,
    timestamp: 0,
    TTL: 5 * 60 * 1000 // 5分钟缓存
  }

  async getNewsWithCache() {
    const now = Date.now()
    if (this.#cache.data && (now - this.#cache.timestamp) < this.#cache.TTL) {
      return this.#cache.data
    }

    const result = await this.func({ action: 'getNews' })
    this.#cache = {
      data: result,
      timestamp: now
    }
    return result
  }
  description = 'Useful when you want to know today\'s news headlines and hot topics. Use keywords like "今日新闻", "每日新闻", "60秒新闻" to get news.'
}