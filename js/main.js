import RawImageData from './RawImageData.js'
import { $, $all, getRandom, URL, TWOPI } from './utils.js'

const worker = new Worker('./js/convolution.js', { type: 'module' })
worker.onmessage = function (e) {
  tmp_filtered = null
  switch (e.data.constructor) {
    case ImageData:
      showImage(e.data)
      break;
    case Object:
      tmp_filtered = RawImageData.fromObject(e.data)
      showImage(tmp_filtered)
      break;
    default:
      showStatus(e.data)
  }
  disabled(false)
}

const mouse = {
  isDown: false,
  rIsDown: false,
  ctrlIsDown: false,
  pos: { x: 0, y: 0 },
  screenPosOld: { x: 0, y: 0 },
  screenPos: { x: 0, y: 0 }
}

function toolWithSelection(id) {
  return {
    start: null,
    end: null,
    preview: function () {
      const dx = mouse.pos.x - this.start.x
      const dy = mouse.pos.y - this.start.y
      cfg.clearRect(0, 0, fg.width, fg.height)
      cfg.setLineDash([10, 10])
      cfg.strokeStyle = "black"
      cfg.strokeRect(this.start.x, this.start.y, dx, dy)
      cfg.setLineDash([])
      return { dx, dy }
    },
    actionIn: function () {
      if (!mouse.isDown) return
      if (this.start && this.end) this.start = this.end = null
      if (!this.start) this.start = { x: mouse.pos.x, y: mouse.pos.y }
      this.preview()
    },
    actionOut: function () {
      this.end = { x: mouse.pos.x, y: mouse.pos.y }
      $(id).disabled = false
    },
    reset: function () {
      this.start = null
      this.end = null
      cfg.clearRect(0, 0, fg.width, fg.height)
      $(id).disabled = true
    }
  }
}

const tools = {
  current: null,
  preview: function () {
    const size = parseInt($('#brush-size').value)
    cfg.clearRect(0, 0, fg.width, fg.height)
    cfg.beginPath()
    cfg.arc(mouse.pos.x, mouse.pos.y, size, 0, TWOPI)
    cfg.strokeStyle = "black"
    cfg.stroke()
    return size
  },
  update: function () {
    stack[pointer] = c.getImageData(0, 0, canvas.width, canvas.height)
    $all('#stack img')[pointer].src = canvas.toDataURL()
  },
  drag: {
    actionIn: function () {
      if (!mouse.isDown) return
      const deltaPos = { x: mouse.screenPosOld.x - mouse.screenPos.x, y: mouse.screenPosOld.y - mouse.screenPos.y }
      $('#canvas-area').scrollBy(deltaPos.x, deltaPos.y)
    }
  },
  brush: {
    preview: function () {
      return tools.preview()
    },
    actionIn: function () {
      const size = this.preview()
      if (!mouse.isDown) return
      const r = $('#r').value
      const g = $('#g').value
      const b = $('#b').value
      const a = $('#opacity').value
      const grd = c.createRadialGradient(mouse.pos.x, mouse.pos.y, 0, mouse.pos.x, mouse.pos.y, size)
      grd.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${a})`)
      grd.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)
      c.beginPath()
      c.arc(mouse.pos.x, mouse.pos.y, size, 0, TWOPI)
      c.fillStyle = grd
      c.fill()
    },
    actionOut: function () {
      tools.update()
    },
    reset: function () {
      cfg.clearRect(0, 0, fg.width, fg.height)
    }
  },
  eraser: {
    preview: function () {
      return tools.preview()
    },
    actionIn: function () {
      const r = this.preview()
      if (!mouse.isDown) return
      const a = parseFloat($('#opacity').value)
      const grd = c.createRadialGradient(mouse.pos.x, mouse.pos.y, 0, mouse.pos.x, mouse.pos.y, r)
      grd.addColorStop(0, `rgba(255, 255, 255, ${a})`)
      grd.addColorStop(1, `rgba(255, 255, 255, 0)`)
      c.beginPath()
      c.arc(mouse.pos.x, mouse.pos.y, r, 0, TWOPI)
      c.fillStyle = grd
      c.fill()
    },
    actionOut: function () {
      tools.update()
    }
  },
  dropper: {
    actionIn: function () {
      if (!mouse.isDown) return
      const img = c.getImageData(mouse.pos.x, mouse.pos.y, 1, 1)
      const r = $('#r')
      r.value = img.data[0]
      r.oninput()
      const g = $('#g')
      g.value = img.data[1]
      g.oninput()
      const b = $('#b')
      b.value = img.data[2]
      b.oninput()
      changeColor()
    }
  },
  circle: {
    start: null,
    preview: function () {
      const dx = mouse.pos.x - this.start.x
      const dy = mouse.pos.y - this.start.y
      const px = mouse.pos.x - dx / 2
      const py = mouse.pos.y - dy / 2
      const w = Math.abs(dx / 2)
      const h = Math.abs(dy / 2)
      cfg.clearRect(0, 0, fg.width, fg.height)
      cfg.beginPath()
      cfg.ellipse(px, py, w, h, 0, 0, TWOPI)
      cfg.strokeStyle = 'black'
      cfg.stroke()
      return { px, py, w, h }
    },
    actionIn: function () {
      if (!mouse.isDown || !this.start)
        return this.start = { x: mouse.pos.x, y: mouse.pos.y }
      this.preview()
    },
    actionOut: function () {
      if (!this.start) return
      const { px, py, w, h } = this.preview()
      c.beginPath()
      c.ellipse(px, py, w, h, 0, 0, TWOPI)
      const r = $('#r').value
      const g = $('#g').value
      const b = $('#b').value
      const a = $('#opacity').value
      c.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`
      c.fill()
      this.start = null
      tools.update()
      cfg.clearRect(0, 0, fg.width, fg.height)
    },
  },
  rect: {
    start: null,
    preview: function () {
      const dx = mouse.pos.x - this.start.x
      const dy = mouse.pos.y - this.start.y
      cfg.clearRect(0, 0, fg.width, fg.height)
      cfg.strokeStyle = "black"
      cfg.strokeRect(this.start.x, this.start.y, dx, dy)
      return { dx, dy }
    },
    actionIn: function () {
      if (!mouse.isDown || !this.start)
        return this.start = { x: mouse.pos.x, y: mouse.pos.y }
      this.preview()
    },
    actionOut: function () {
      if (!this.start) return
      const { dx, dy } = this.preview()
      c.beginPath()
      const r = $('#r').value
      const g = $('#g').value
      const b = $('#b').value
      const a = $('#opacity').value
      c.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`
      c.fillRect(this.start.x, this.start.y, dx, dy)
      this.start = null
      tools.update()
      cfg.clearRect(0, 0, fg.width, fg.height)
    }
  },
  line: {
    start: null,
    preview: function () {
      cfg.clearRect(0, 0, fg.width, fg.height)
      cfg.beginPath()
      cfg.moveTo(this.start.x, this.start.y)
      cfg.lineTo(mouse.pos.x, mouse.pos.y)
      cfg.closePath()
      cfg.strokeStyle = "black"
      cfg.stroke()
    },
    actionIn: function () {
      if (!mouse.isDown) return
      if (!this.start)
        this.start = { x: mouse.pos.x, y: mouse.pos.y }
      this.preview()
    },
    actionOut: function () {
      if (!this.start) return
      c.beginPath()
      c.moveTo(this.start.x, this.start.y)
      c.lineTo(mouse.pos.x, mouse.pos.y)
      c.closePath()
      const r = $('#r').value
      const g = $('#g').value
      const b = $('#b').value
      const a = $('#opacity').value
      c.strokeStyle = `rgba(${r}, ${g}, ${b}, ${a})`
      c.stroke()
      this.start = null
      tools.update()
      cfg.clearRect(0, 0, fg.width, fg.height)
    },
  },
  bucket: {
    actionIn: function () {
      if (!mouse.isDown && !busy) return
      const r = $('#r').value
      const g = $('#g').value
      const b = $('#b').value
      worker.postMessage(['region', mouse.pos.x, mouse.pos.y, getImageData(), [r, g, b]])
      disabled(true)
    }
  },
  clone: {
    target: null,
    targetPos: null,
    lastOne: null,
    preview: function () {
      const size = tools.preview()
      const halfsize = size / 2
      if (this.targetPos) {
        cfg.beginPath()
        cfg.arc(this.targetPos.x, this.targetPos.y, size, 0, TWOPI)
        cfg.moveTo(this.targetPos.x - halfsize, this.targetPos.y)
        cfg.lineTo(this.targetPos.x + halfsize, this.targetPos.y)
        cfg.moveTo(this.targetPos.x, this.targetPos.y - halfsize)
        cfg.lineTo(this.targetPos.x, this.targetPos.y + halfsize)
        cfg.closePath()
        cfg.strokeStyle = "red"
        cfg.stroke()
      }
      return size
    },
    actionIn: function () {
      const size = this.preview()
      if (mouse.isDown && mouse.ctrlIsDown) {
        this.targetPos = { x: mouse.pos.x, y: mouse.pos.y }
        const size = parseInt($('#brush-size').value) * 2
        const img = c.getImageData(this.targetPos.x - size / 2, this.targetPos.y - size / 2, size, size)
        const tmpcanvas = document.createElement('canvas')
        tmpcanvas.width = img.width
        tmpcanvas.height = img.height
        const tc = tmpcanvas.getContext('2d')
        tc.putImageData(img, 0, 0)
        this.target = tmpcanvas
        this.lastOne = null
        return
      }
      if (!mouse.isDown || !this.target) return
      if (this.lastOne && Math.sqrt((this.lastOne.x - mouse.pos.x) ** 2 + (this.lastOne.y - mouse.pos.y) ** 2) < size * 2)
        return
      c.save()
      c.beginPath()
      c.arc(mouse.pos.x, mouse.pos.y, size, 0, TWOPI)
      c.closePath()
      c.clip()
      c.globalAlpha = parseFloat($('#opacity').value)
      c.drawImage(this.target, mouse.pos.x - this.target.width / 2, mouse.pos.y - this.target.height / 2)
      c.globalAlpha = 1
      c.restore()
      this.lastOne = { x: mouse.pos.x, y: mouse.pos.y }
    },
    actionOut: function () {
      this.lastOne = null
      tools.update()
    },
    reset: function () {
      this.target = null
      this.targetPos = null
      this.lastOne = null
    }
  },
  crop: toolWithSelection('#crop-ok'),
  darn: toolWithSelection('#darn-ok')
}

let busy = false
let timeout
let tmp
let tmp_filtered
let pointer = 0
const stack = []

const canvas = $('#bg')
const fg = $('#fg')
const blank = canvas.toDataURL()
const c = canvas.getContext('2d', { willReadFrequently: true })
const cfg = fg.getContext('2d')

$all('canvas').forEach(c => c.style.pointerEvents = 'none')

const getPos = function (e) {
  if (e.cancelable)
    e.preventDefault();
  let x, y
  let rect = canvas.getBoundingClientRect()
  const _x = canvas.width / rect.width
  const _y = canvas.height / rect.height
  let ax, ay
  if (e.touches) {
    ax = e.targetTouches[0].pageX
    ay = e.targetTouches[0].pageY
    x = Math.round((ax - rect.left) * _x)
    y = Math.round((ay - rect.top) * _y)
  } else {
    ax = e.clientX
    ay = e.clientY
    x = e.offsetX * _x
    y = e.offsetY * _y
  }
  return { x, y, ax, ay }
}

fg.onmousedown = function (e) {
  mouse.isDown = e.touches || e.button == 0
  mouse.rIsDown = e.button == 2
  mouse.ctrlIsDown = e.ctrlKey
  const { x, y, ax, ay } = getPos(e)
  mouse.pos.x = x
  mouse.pos.y = y
  mouse.screenPos.x = ax
  mouse.screenPos.y = ay
  mouse.screenPosOld.x = ax
  mouse.screenPosOld.y = ay
  if (tools.current)
    return tools.current.actionIn()
  tmp = c.getImageData(0, 0, this.width, this.height)
  showImage()
}

fg.onmouseup = function (e) {
  if (e.touches) {
    mouse.isDown = false
    mouse.rIsDown = false
  } else {
    mouse.isDown = e.button != 0
    mouse.rIsDown = e.button != 2
  }
  if (tools.current)
    tools.current.actionOut && tools.current.actionOut()
  showImage(tmp)
  tmp = undefined
}

fg.onmousemove = function (e) {
  const { x, y, ax, ay } = getPos(e)
  mouse.screenPos.x = ax
  mouse.screenPos.y = ay
  if (tools.current)
    tools.current.actionIn()
  mouse.pos.x = x
  mouse.pos.y = y
  mouse.screenPosOld.x = mouse.screenPos.x
  mouse.screenPosOld.y = mouse.screenPos.y
}

fg.onmouseout = function (e) {
  mouse.isDown = false
  mouse.rIsDown = false
}

fg.ontouchstart = fg.onmousedown
fg.ontouchend = fg.onmouseup
fg.ontouchmove = fg.onmousemove

function disabled(value) {
  showStatus(value ? 'Working...' : '', false)
  busy = value
  $all('button:not(#crop-ok)').forEach(btn => btn.disabled = value)
}

const initFilter = () => {
  const filter = $('#filter')
  filter.innerHTML = ''
  let size = parseInt($('#size').value)
  if (Math.sqrt(size) % 1)
    size = 9
  for (let i = 0; i < size; i++) {
    const input = document.createElement('input')
    input.type = "number"
    input.value = i == Math.floor(size / 2) ? 1 : 0
    filter.appendChild(input)
  }
  filter.style.width = Math.sqrt(size) * 50 + 'px'
}

const loadImage = async (src, size = 1) => new Promise((resolve, reject) => {
  const image = new Image()
  image.onload = function () {
    updateCanvasSize(this.width * size, this.height * size)
    c.drawImage(this, 0, 0, canvas.width, canvas.height)
    resolve({ src: image.src, data: c.getImageData(0, 0, canvas.width, canvas.height) })
  }
  image.onerror = () => reject('error')
  image.src = URL.createObjectURL(src)
})

const showStatus = (msg, clear = true) => {
  $('#status').innerHTML = msg
  if (clear) {
    timeout && clearTimeout(timeout)
    timeout = setTimeout(() => $('#status').innerHTML = '', 3000)
  }
}

const updateCanvasSize = (width, height) => {
  const canvasBg = $('#canvas-bg')
  canvas.width = fg.width = width
  canvas.height = fg.height = height
  const size = parseFloat($('#canvas-size').value)
  canvasBg.style.width = canvas.style.width = fg.style.width = width * size + 'px'
  canvasBg.style.height = canvas.style.height = fg.style.height = height * size + 'px'
  $('#width').value = width
  $('#height').value = height
}

const showImage = (img) => {
  img = img || stack[pointer]
  if (!img)
    return c.clearRect(0, 0, canvas.width, canvas.height)
  updateCanvasSize(img.width, img.height)
  c.putImageData(img instanceof ImageData ? img : img.toImage(), 0, 0)
}

const addToStack = (src, data, update = false) => {
  if (tmp_filtered) {
    data = tmp_filtered
    tmp_filtered = null
  }
  if (update) {
    stack[pointer] = data
    tmp = null
  } else {
    stack.push(data)
    pointer = stack.length - 1
  }
  const preview = new Image()
  preview.id = pointer
  preview.src = src
  preview.width = 150
  if (data instanceof RawImageData) {
    preview.className = 'raw'
    preview.title = 'Raw data'
  }
  preview.onclick = function () {
    tmp_filtered = null
    changeTool()
    pointer = parseInt(this.id)
    showImage()
  }
  preview.ondblclick = function () {
    const canvasBg = $('#canvas-bg')
    if (canvasBg.dataset.bg == this.src) {
      canvasBg.style.background = ''
      delete canvasBg.dataset.bg
    } else {
      canvasBg.dataset.bg = this.src
      canvasBg.style.backgroundImage = `URL(${canvasBg.dataset.bg})`
      canvasBg.style.backgroundSize = 'cover'
    }
  }
  if (update)
    $('#stack').replaceChild(preview, $all('#stack > img')[pointer])
  else
    $('#stack').appendChild(preview)
}

const loadImageIntoStack = async () => {
  disabled(true)
  const fileInput = $('input[type=file]')
  if (!fileInput.files.length) return disabled(false)
  const { src, data } = await loadImage(fileInput.files[0], parseFloat($('#img-size').value))
  addToStack(src, data)
  tmp_filtered = null
  disabled(false)
}

const runFilter = () => {
  if (!stack.length) return
  disabled(true)
  const filter = $all('#filter > input').map(i => parseInt(i.value))
  worker.postMessage(['convolve', stack[pointer], filter])
}

const assingFilterValues = (x, update = true) => {
  $all("#filter > input").forEach(i => i.value = typeof x === 'function' ? x() : x)
  if (update) runFilter()
}

const addCurrentToStack = (update) => {
  const img = c.getImageData(0, 0, canvas.width, canvas.height)
  if (img.data.some(d => d))
    addToStack(canvas.toDataURL(), img, update)
}

const combine = () => {
  const formula = $('#formula').value
  if (!stack.length || !formula) return
  disabled(true)
  const { width, height } = canvas
  worker.postMessage(['combine', width, height, stack, formula])
}

const getImageData = () => tmp_filtered || c.getImageData(0, 0, canvas.width, canvas.height)

const contrast = () => {
  disabled(true)
  worker.postMessage(['contrast', getImageData()])
}

const gray = () => {
  disabled(true)
  worker.postMessage(['gray', getImageData()])
}

function transpose() {
  disabled(true)
  worker.postMessage(['transpose', getImageData()])
}

const saturation = (sign = 1) => {
  disabled(true)
  worker.postMessage(['saturation', sign, getImageData()])
}

const removeNoise = () => {
  disabled(true)
  worker.postMessage(['removeNoise', getImageData(), $('#method').value, parseInt($('#size').value)])
}

const billinear = () => {
  disabled(true)
  worker.postMessage(['billinear', getImageData(), $('#win-size').value, $('#sig-color').value, $('#sig-space').value])
}

const anim = {
  playing: false,
  current: 0,
  u: null,
  lastTime: 0,
  reset: function () {
    this.u && window.cancelAnimationFrame(this.u)
    this.playing = false
    this.current = 0
    this.u = null
    this.lastTime = 0
  }
}

const animate = (time) => {
  if (time - anim.lastTime < parseInt($('#delay').value)) {
    anim.u = window.requestAnimationFrame(animate)
    return
  }
  showImage(stack[anim.current])
  anim.current = (anim.current + 1) % stack.length
  anim.lastTime = time
  anim.u = window.requestAnimationFrame(animate)
}

const animation = () => {
  if (!stack.length) return
  if (anim.playing) {
    anim.reset()
    $('#play').innerText = "Play"
  } else {
    $('#play').innerText = "Stop"
    anim.playing = true
    animate()
  }
}

const flip = (x, y) => {
  const cimg = canvas.toDataURL()
  if (cimg == blank) return
  const img = new Image()
  img.src = cimg
  img.onload = function () {
    c.save()
    c.scale(x, y)
    c.drawImage(this, x < 0 ? -this.width : 0, y < 0 ? -this.height : 0)
    c.restore()
  }
}

const rotate = (dir = 1) => {
  const cimg = canvas.toDataURL()
  if (cimg == blank) return
  const img = new Image()
  img.src = cimg
  img.onload = function () {
    updateCanvasSize(this.height, this.width)
    c.save()
    c.rotate(dir * Math.PI / 2)
    if (dir > 0)
      c.drawImage(this, 0, -this.height)
    else
      c.drawImage(this, -this.width, 0)
    c.restore()
  }
}

const deleteFromStack = () => {
  tmp_filtered = null
  if (!stack.length) return
  stack.splice(pointer, 1)
  const imgs = $all('#stack > img')
  const toDel = imgs.splice(pointer, 1)[0]
  const canvasBg = $('#canvas-bg')
  if (canvasBg.dataset.bg == toDel.src) {
    delete canvasBg.dataset.bg
    canvasBg.style.background = ''
  }
  URL.revokeObjectURL(toDel.src)
  toDel.remove()
  imgs.forEach((img, i) => img.id = i)
  pointer = stack.length - 1
  showImage()
}

const cleanUp = () => {
  worker.terminate()
  $all('#stack > div > img').forEach(img => URL.revokeObjectURL(img.href))
}

const createNewImage = () => {
  tmp_filtered = null
  const w = parseInt($('#width').value)
  const h = parseInt($('#height').value)
  const img = new ImageData(Uint8ClampedArray.from(Array(w * h * 4).fill(255)), w)
  showImage(img)
  addCurrentToStack()
}

const saveFile = (file, fileName) => {
  const a = document.createElement('a')
  a.href = file
  a.download = fileName
  a.click()
}

const saveImg = () => {
  const cimg = canvas.toDataURL()
  if (cimg == blank) return
  saveFile(cimg, 'new_image.png')
  tmp_filtered = null
}

const changeTool = t => {
  tools.current && tools.current.reset && tools.current.reset()
  tools.current = t ? (tools.current === tools[t] ? undefined : tools[t]) : undefined
  $all('.tool').forEach(to => to.classList.remove('selected'))
  if (tools.current) {
    $(`#${t}`).classList.add('selected')
    $all('canvas').forEach(c => c.style.pointerEvents = 'all')
  } else {
    $all('canvas').forEach(c => c.style.pointerEvents = 'none')
  }
}

const changeColor = () => {
  $('#dropper').style.backgroundColor = `rgb(${$('#r').value}, ${$('#g').value}, ${$('#b').value})`
}

const changeCanvasSize = () => {
  const { width, height } = canvas
  const canvasBg = $('#canvas-bg')
  const size = parseFloat($('#canvas-size').value)
  canvas.style.width = fg.style.width = canvasBg.style.width = width * size + 'px'
  canvas.style.height = fg.style.height = canvasBg.style.height = height * size + 'px'
}

const changeCanvasOpacity = () => {
  canvas.style.opacity = $('#canvas-opacity').value + '%'
}

const toggleMenu = () => {
  const m = $('#toggle-menu')
  if (m.innerText == '<') {
    m.innerText = '>'
    $('.grid-container').style.gridTemplateColumns = '0 1fr'
  } else {
    m.innerText = '<'
    $('.grid-container').style.gridTemplateColumns = 'minmax(auto, 20em) 1fr'
  }
}

const exportVideo = () => {
  if (!stack.length) return
  const stream = canvas.captureStream(30)
  const recordedChunks = []
  const mediaRecorder = new MediaRecorder(stream, {
    audioBitsPerSecond: 0,
    videoBitsPerSecond: 5000000,
    mimeType: 'video/webm;codecs=vp9'
  })
  mediaRecorder.ondataavailable = (event) => {
    event.data.size && recordedChunks.push(event.data)
  }
  mediaRecorder.onstop = () => {
    const url = URL.createObjectURL(new Blob(recordedChunks, { type: 'video/VP9' }))
    saveFile(url, 'vid.webm')
    window.URL.revokeObjectURL(url)
  }
  anim.reset()
  animation()
  mediaRecorder.start()
  setTimeout(() => {
    animation()
    mediaRecorder.stop()
  }, parseInt($('#long').value))
}

const crop = () => {
  if (tools.current !== tools.crop) return
  const { start, end } = tools.current
  if (!start || !end) return
  const img = c.getImageData(start.x, start.y, end.x - start.x, end.y - start.y)
  updateCanvasSize(img.width, img.height)
  c.putImageData(img, 0, 0)
  changeTool()
}

const darn = () => {
  if (tools.current !== tools.darn) return
  const { start, end } = tools.current
  if (!start || !end) return
  const [x0, y0] = Object.values(start).map(x => Math.round(x))
  const [x1, y1] = Object.values(end).map(x => Math.round(x))
  disabled(true)
  worker.postMessage(['darn', getImageData(), x0, y0, x1, y1])
}

$('input[type="file"]').addEventListener('change', () => loadImageIntoStack())

$('input[type="file"]').addEventListener('click', function () { this.value = null })

$('#load-img').addEventListener('click', () => $('input[type="file"]').click())

$('#run').addEventListener('click', () => runFilter())

$('#random').addEventListener('click', () => assingFilterValues(() => getRandom(-2, 2)))

$('#zero').addEventListener('click', () => assingFilterValues(0, false))

$('#size').addEventListener('change', () => initFilter())

$('#blend').addEventListener('click', () => combine())

$('#add-stack').addEventListener('click', () => addCurrentToStack())

$('#update-current').addEventListener('click', () => addCurrentToStack(true))

$('#del-stack').addEventListener('click', () => deleteFromStack())

$('#contrast').addEventListener('click', () => contrast())

$('#gray').addEventListener('click', () => gray())

$('#sat').addEventListener('click', () => saturation())

$('#desat').addEventListener('click', () => saturation(-1))

$('#denoise').addEventListener('click', () => removeNoise())

$('#billinear').addEventListener('click', () => billinear())

$('#formula').addEventListener('focus', function () { this.selectionStart = this.selectionEnd = this.value.length })

$('#new-image').addEventListener('click', () => createNewImage())

$('#save-img').addEventListener('click', () => saveImg())

$('#canvas-size').addEventListener('input', () => changeCanvasSize())

$('#canvas-opacity').addEventListener('input', () => changeCanvasOpacity())

$('#flipx').addEventListener('click', () => flip(-1, 1))

$('#flipy').addEventListener('click', () => flip(1, -1))

$('#rotatel').addEventListener('click', () => rotate(-1))

$('#rotater').addEventListener('click', () => rotate(1))

$('#play').addEventListener('click', () => animation())

$('#toggle-menu').addEventListener('click', () => toggleMenu())

$('#export-video').addEventListener('click', () => exportVideo())

$('#crop-ok').addEventListener('click', () => crop())

$('#darn-ok').addEventListener('click', () => darn())

$all('.tool').forEach(t => t.addEventListener('click', function () { changeTool(this.id) }))

$all('input[type="range"]').forEach(r => {
  r.oninput = function () {
    this.previousSibling.value = this.value
  }
  r.oninput()
})

$all('#color input[type="range"], #opacity').forEach(r => r.addEventListener('input', () => changeColor()))

function collapse(e) {
  if (e.target.tagName == 'BUTTON')
    return
  const ns = this.nextSibling.nextSibling
  if (!this.dataset.display)
    this.dataset.display = getComputedStyle(ns).display
  if (ns.style.display != 'none') {
    ns.style.display = 'none'
    this.firstChild.innerText = '+'
    this.style.borderBottom = '1px solid rgba(0, 0, 0, 0.2)'
  } else {
    ns.style.display = this.dataset.display
    this.firstChild.innerText = '-'
    this.style.borderBottom = ''
  }
}

$all('.accordion > div:first-child').forEach(d => {
  d.addEventListener('click', collapse)
  d.dataset.collapsed && d.click()
})

window.addEventListener('beforeunload', () => cleanUp())

window.addEventListener('unload', () => cleanUp())

initFilter()
