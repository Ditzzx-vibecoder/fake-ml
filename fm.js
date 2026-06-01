const { Canvas, loadImage, FontLibrary } = require('skia-canvas')
const path = require('path')
const fs = require('fs')
const ASSETS_DIR = path.join(__dirname, '..', 'assets')

const ASSETS = {
  lobby:  path.join(ASSETS_DIR, 'Lobby.jpg'),
  avatar: path.join(ASSETS_DIR, 'avatar.jpg'),
  flag:   path.join(ASSETS_DIR, 'Bendera.svg'),
  font:   path.join(ASSETS_DIR, 'noto-sans.regular.ttf'),
}

function getRankPath(rank) {
  return path.join(ASSETS_DIR, 'rank', `${rank}.webp`)
}

function getBorderPath(border) {
  return path.join(ASSETS_DIR, 'border', `${border}.webp`)
}

const config = {
  canvas: { width: 960, height: 1706 },

  rank_name: 'imo',
  border_num: 0,

  avatar: {
    x: 389,
    y: 446,
    size: 204,
    borderRadius: 12,
  },

  outline: {
    color: '#b8956f',
    thickness: 4,
  },

  rank: {
    x: 387,
    y: 760,
    size: 210,
  },

  flag: {
    x: 364,
    y: 428,
    size: 55,
  },

  username: {
    a: 681,
    b: 727,
    c: 400,
    centerX: 496,
    d: 609,
    fontSize: 36,
    maxChars: 15,
    color: '#ffffff',
  },

  debug: false,
}

const BORDER_OFFSET = {
  1: 26,
  2: 36, 3: 26, 4: 26, 5: 26,
  6: 26, 7: 26, 8: 26, 9: 26,
  10: 26, 11: 22, 12: 28, 13: 26,
  14: 21, 15: 26, 16: 26,
}

const RANK_CONFIG = {
  epic:   { size: 210, x: 388, y: 760 },
  glory:  { size: 210, x: 387, y: 760 },
  gm:     { size: 260, x: 358, y: 760 },
  honor:  { size: 210, x: 384, y: 760 },
  imo:    { size: 260, x: 358, y: 760 },
  legend: { size: 260, x: 360, y: 760 },
  mawi:   { size: 210, x: 387, y: 760 },
}

async function fetchImage(filePath) {
  return loadImage(filePath)
}

async function fetchFont(filePath, alias) {
  FontLibrary.use(alias, [filePath])
}

function calcHeight(img, size) {
  return size * (img.height / img.width)
}

function drawAvatar(ctx, img, cfg, outlineCfg = null) {
  const { x, y, size, borderRadius } = cfg
  const height = calcHeight(img, size)
  const r = borderRadius || 0

  ctx.save()

  if (outlineCfg) {
    const { color, thickness } = outlineCfg
    ctx.beginPath()
    ctx.roundRect(x - thickness, y - thickness, size + thickness * 2, height + thickness * 2, r + thickness)
    ctx.strokeStyle = color
    ctx.lineWidth = thickness * 2
    ctx.stroke()
  }

  ctx.beginPath()
  ctx.roundRect(x, y, size, height, r)
  ctx.clip()
  ctx.drawImage(img, x, y, size, height)
  ctx.restore()
}

function drawBorder(ctx, img, avatarCfg, borderCfg) {
  const { x, y, size } = avatarCfg
  const { offset } = borderCfg
  const bSize = size + offset * 2
  const bX = x - offset
  const bY = y - offset
  ctx.drawImage(img, bX, bY, bSize, bSize)
}

function drawFlagCircle(ctx, img, cfg) {
  const { x, y, size } = cfg
  const radius = size / 2

  ctx.save()
  ctx.beginPath()
  ctx.arc(x + radius, y + radius, radius, 0, Math.PI * 2)
  ctx.clip()
  ctx.drawImage(img, x, y, size, size)
  ctx.restore()
}

function drawUsername(ctx, username, cfg) {
  const { a, b, c, d, centerX, fontSize, maxChars, color } = cfg
  const y = a
  const w = d - c
  const h = b - a

  const name = username.slice(0, maxChars)

  let size = fontSize
  ctx.textAlign = 'center'
  while (size > 8) {
    ctx.font = `${size}px NotoSans`
    if (ctx.measureText(name).width <= w) break
    size -= 1
  }

  ctx.fillStyle = color
  ctx.font = `${size}px NotoSans`
  const textY = y + h / 2 + size / 3
  ctx.fillText(name, centerX, textY)
}

function drawDebugSafeZone(ctx, cfg) {
  const { a, b, c, d } = cfg
  const x = c
  const y = a
  const w = d - c
  const h = b - a

  ctx.save()
  ctx.lineWidth = 3
  ctx.strokeStyle = 'red'
  ctx.strokeRect(x, y, w, h)
  ctx.font = '20px NotoSans'
  ctx.fillStyle = 'red'
  ctx.fillText(`${w}x${h}`, x + 4, y + 20)
  ctx.restore()
}

async function generateCard({ username = 'Player', rank = config.rank_name, border = config.border_num } = {}) {
  await fetchFont(ASSETS.font, 'NotoSans')

  const useBorder = border && border > 0

  const baseImages = [
    fetchImage(ASSETS.lobby),
    fetchImage(ASSETS.avatar),
    fetchImage(ASSETS.flag),
    fetchImage(getRankPath(rank)),
  ]

  if (useBorder) baseImages.push(fetchImage(getBorderPath(border)))

  const [lobbyImg, avatarImg, flagImg, rankImg, borderImg] = await Promise.all(baseImages)

  const { width, height } = config.canvas
  const canvas = new Canvas(width, height)
  const ctx = canvas.getContext('2d')

  ctx.drawImage(lobbyImg, 0, 0, width, height)
  drawAvatar(ctx, avatarImg, config.avatar, useBorder ? null : config.outline)

  if (useBorder) {
    const borderOffset = BORDER_OFFSET[border] ?? 26
    drawBorder(ctx, borderImg, config.avatar, { offset: borderOffset })
  }

  const rankCfg = RANK_CONFIG[rank] ?? { size: config.rank.size, x: config.rank.x, y: config.rank.y }
  ctx.drawImage(rankImg, rankCfg.x, rankCfg.y, rankCfg.size, calcHeight(rankImg, rankCfg.size))

  drawFlagCircle(ctx, flagImg, config.flag)
  drawUsername(ctx, username, config.username)

  if (config.debug) drawDebugSafeZone(ctx, config.username)

  return canvas.toBuffer('png', { quality: 1.0 })
}

module.exports = async (ctx, { TMP_DIR, args }) => {
  const parts = (args || '').trim().split(' ')
  const username = parts[0] || ctx.from?.first_name || 'Player'
  const rank = parts[1] || config.rank_name
  const border = parseInt(parts[2]) || 0

  const loading = await ctx.reply('⏳ Generating card...')

  try {
    const buffer = await generateCard({ username, rank, border })
    const outPath = path.join(TMP_DIR, `fm_${Date.now()}.png`)
    fs.writeFileSync(outPath, buffer)

    await ctx.replyWithPhoto(
      { source: outPath, filename: 'lobby.png' },
      { caption: `🎮 ${username}` }
    )

    fs.unlink(outPath, () => {})
  } catch (e) {
    await ctx.reply(`❌ Gagal generate card: ${e.message}`)
  }

  await ctx.telegram.deleteMessage(ctx.chat.id, loading.message_id).catch(() => {})
}
