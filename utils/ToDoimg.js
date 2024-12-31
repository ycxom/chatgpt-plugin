import fs from "fs";
import pathModule from 'path';
import { fileTypeFromBuffer } from 'file-type';
import moment from 'moment';
const _path = process.cwd();
const path = _path + "/temp/tp-bq";

// 没文件夹就创建一个
if (!fs.existsSync(path)) {
  fs.mkdirSync(path, { recursive: true })
}
if (!fs.existsSync(pathModule.join(path, 'pictures'))) {
  fs.mkdirSync(pathModule.join(path, 'pictures'), { recursive: true })
}

/**
 * 
 * @param {*} e - 输入的消息
 * @param {*} tag - 表情包标签
 * @returns 
 */
export async function getToimg(e, tag) {
  const picturesPath = pathModule.join(path, 'pictures');
  const fileImgList = await fs.promises.readdir(picturesPath);

  try {
    const sanitizedTag = tag
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/[\[\]]/g, '')
      .trim()
      .replace(/[^a-zA-Z0-9\u4e00-\u9fa5-_.]/g, '-');
    let matchedFiles = fileImgList.filter(file => file === sanitizedTag);
    if (matchedFiles.length === 0) {
      matchedFiles = fileImgList.filter(file => file.startsWith(sanitizedTag));
    }
    if (matchedFiles.length === 0) {
      matchedFiles = fileImgList.filter(file => file.includes(sanitizedTag));
    }
    if (matchedFiles.length === 0) {
      logger.warn(`未找到匹配的表情包: ${sanitizedTag}`);
      return;
    }
    // 随机选择一个文件
    const selectedFile = matchedFiles[Math.floor(Math.random() * matchedFiles.length)];
    const picPath = pathModule.join(picturesPath, selectedFile);
    try {
      await fs.promises.access(picPath);
    } catch {
      logger.warn(`找不到指定的表情包文件: ${picPath}`);
      return;
    }
    e.reply(segment.image('file:///' + picPath));

    logger.info(`发送表情包: ${picPath}`);
    return false;
  } catch (error) {
    logger.error('Error in getToimg:', error);
  }
}

/**
 * 
 * @param {*} e - 输入的消息
 * @param {*} image - 图片Base64
 * @returns 
 */
export async function downImg(e, image, t) {
  try {
    let reply;
    if (e.source) {
      if (e.isGroup) {
        reply = (await e.group.getChatHistory(e.source.seq, 1)).pop()?.message;
      } else {
        reply = (await e.friend.getChatHistory(e.source.time, 1)).pop()?.message;
      }
      if (reply) {
        for (let val of reply) {
          if (val.type === "image") {
            e.img = [val.url];
            break;
          }
        }
      }
    }
    if (!e.img && !image) {
      return false;
    }
    let kWordReg = /^#?(DOWNIMG:)\s*(.*)/i;
    t = t.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
    const match = kWordReg.exec(t);
    if (!match) {
      logger.error('DOWNIMG command format invalid:', t);
      return;
    }
    let rawmsg = match[2] || "defaultTag";
    let kWord = rawmsg.replace(/，|,|、| |。/g, "-").replace(/--+/g, "-").replace(/^-|-$|--/g, "").trim() || "defaultTag";
    if (image) {
      const imageBuffer = Buffer.from(image, 'base64');
      const type = await fileTypeFromBuffer(imageBuffer);
      let picType = 'png';
      if (type && type.ext) {
        picType = type.ext;
      }
      const currentTime = moment().format("YYMMDDHHmmss");
      const safeTag = kWord.replace(/[^a-zA-Z0-9\u4e00-\u9fa5-_]/g, '-');
      const picPath = pathModule.join(path, 'pictures', `${currentTime}-${safeTag.substring(0, 200)}.${picType}`);
      logger.mark("DOWNIMG：", picPath);
      if (!fs.existsSync(pathModule.join(path, 'pictures'))) {
        fs.mkdirSync(pathModule.join(path, 'pictures'), { recursive: true });
      }
      fs.writeFileSync(picPath, imageBuffer);
      logger.info(`图片已保存，标签为：${kWord}`);
    }
  } catch (error) {
    logger.error('Error in downImg:', error);
    logger.error("保存图片时发生错误");
  }
}

export async function fileImgList() {
  const picturesPath = pathModule.join(path, 'pictures');
  const ImgList = await fs.promises.readdir(picturesPath);
  const fileImgList = ImgList.map(filename => {
    const match = filename.match(/\d{12}-(.+)$/);
    return match ? match[1] : filename;
  });
  return fileImgList;
} 