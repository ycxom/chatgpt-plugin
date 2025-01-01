import { AbstractTool } from './AbstractTool.js'
import { getToimg, downImg, fileImgList } from '../../utils/ToDoimg.js'

export class ImageProcessTool extends AbstractTool {
    name = 'imageProcess'
    #availableImages = []
    #initialized = false

    parameters = {
        properties: {
            action: {
                type: 'string',
                enum: ['get', 'download', 'notImage', 'listImages'],
                description: 'Action to perform: get (local image), download (save image), notImage (switch mode), or listImages'
            },
            imageName: {
                type: 'string',
                description: 'Name or tag of the image'
            },
            imageData: {
                type: 'string',
                description: 'Base64 image data for download action'
            }
        },
        required: ['action']
    }

    constructor(e, previousRole, bymGo) {
        super()
        this.e = e
        this.previousRole = previousRole
        this.bymGo = bymGo
        this.initializeImageList()
    }

    async func(opts) {
        const { action, imageName, imageData } = opts

        try {
            switch (action) {
                case 'get':
                    const getResult = await this.handleGetImage(imageName)
                    return getResult

                case 'download':
                    const downloadResult = await this.handleDownloadImage(imageName, imageData)
                    return downloadResult

                case 'notImage':
                    const notImageResult = await this.handleNotImage()
                    return notImageResult

                case 'listImages':
                    return this.getImagesPrompt() // 直接返回列表文本，让模型知道有哪些表情包

                default:
                    throw new Error(`未知操作: ${action}`)
            }
        } catch (error) {
            throw error
        }
    }



async initializeImageList() {
        try {
            this.#availableImages = await fileImgList()
            this.#initialized = true
        } catch (error) {
            this.#availableImages = []
        }
    }

    async getAvailableImages() {
        if (!this.#initialized) {
            await this.initializeImageList()
        }
        return this.#availableImages
    }

    async getImagesPrompt() {
        const images = await this.getAvailableImages()
        if (images.length === 0) {
            return '当前没有可用的表情包'
        }
        return `可用的表情包列表（共 ${images.length} 个）：\n${images.join('\n')}\n\n使用方法：发送 GETIMG: <表情包名称> 来使用表情包`
    }

    async processText(text, options = {}) {

        const commands = {
            get: {
                regex: /GETIMG:\s*([\s\S]+?)\s*$/i,
                handler: async (match) => {
                    const imageName = match[1].trim()
                    await this.handleGetImage(imageName)
                    return true
                }
            },
            notImage: {
                regex: /NOTIMG(.*)/i,
                handler: async (match) => {
                    await this.handleNotImage(match[1]?.trim())
                    return true
                }
            },
            download: {
                regex: /DOWNIMG:\s*(.+)/i,
                handler: async (match) => {
                    await this.handleDownloadImage(match[1].trim(), options.image)
                    return true
                }
            },
            list: {
                regex: /^(?:表情包列表|查看表情包|列出表情包)$/i,
                handler: async () => {
                    await this.e.reply(this.getImagesPrompt())
                    return true
                }
            }
        }

        for (const [type, { regex, handler }] of Object.entries(commands)) {
            const match = text.match(regex)
            if (match) {
                try {
                    return await handler(match)
                } catch (error) {
                    await this.e.reply(`处理失败: ${error.message}`)
                    return true
                }
            }
        }

        return null
    }
    async handleGetImage(imageName) {
        if (!imageName) {
            throw new Error('需要指定表情包名称')
        }

        try {
            const result = await getToimg(this.e, imageName)

            if (result === undefined) {
                await this.e.reply(`未找到匹配的表情包: ${imageName}`)
            }

            return true // 表示已处理
        } catch (error) {
            throw error
        }
    }

    async handleDownloadImage(imageName, imageData) {
        if (!imageName || !imageData) {
            throw new Error('需要提供图片名称和数据')
        }

        try {
            const text = `DOWNIMG: ${imageName}`
            await downImg(this.e, imageData, text)
            await this.initializeImageList()
            return true
        } catch (error) {
            throw error
        }
    }

    async handleNotImage() {
        try {
            this.ALLRole = this.previousRole
            await this.bymGo(true)
            return true
        } catch (error) {
            throw error
        }
    }



    description = `图片处理工具：支持发送本地表情包、保存新表情包、切换处理模式。
可用命令：
- GETIMG: <表情包名称> - 发送指定表情包
- DOWNIMG: <名称> - 保存当前图片为表情包
- NOTIMG - 切换到文本模式
- 表情包列表 - 查看所有可用表情包`
    // 添加 getSystemPrompt 方法
    async getSystemPrompt() {
        const images = await this.getAvailableImages()
        let prompt = `${this.description}\n`
        
        if (images.length > 0) {
            prompt += `\n当前可用的表情包：\n${images.join('\n')}`
            prompt += `\n使用 GETIMG: <表情包名称> 来发送表情包`
        } else {
            logger.warn('[ImageProcessTool] 没有可用的表情包')
            prompt += '\n当前没有可用的表情包'
        }
        
        return prompt
    }
}

export async function initializeImageTool(e, previousRole, bymGo) {
    const tool = new ImageProcessTool(e, previousRole, bymGo)
    await tool.initializeImageList() // 确保初始化完成
    return tool
}