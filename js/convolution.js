import RawImageData from './RawImageData.js'

class Processing {

  static getPosFromIndex(index, w) {
    index /= 4
    const x = (index % w)
    const y = Math.floor(index / w)
    return { x, y }
  }

  static getIndexFromPos(x, y, width) {
    return x + y * width
  }

  static convolve(img, filter) {
    const final = new RawImageData(img.width, img.height)
    const filterWidth = Math.sqrt(filter.length)
    const halfWidth = Math.floor(filterWidth / 2)
    for (let i = 0; i < img.data.length; i += 4) {
      const { x, y } = this.getPosFromIndex(i, img.width)
      let sumR = 0, sumG = 0, sumB = 0
      for (let j = 0; j < filter.length; j += 1) {
        const xFilter = (j % filterWidth)
        const yFilter = Math.floor(j / filterWidth)
        if (
          xFilter - halfWidth + x < 0 || xFilter - halfWidth + x >= img.width
          || yFilter - halfWidth + y < 0 || yFilter - halfWidth + y >= img.height
        ) continue
        const filterValue = filter[xFilter + yFilter * filterWidth]
        const index = ((xFilter - halfWidth + x) + (yFilter - halfWidth + y) * img.width) * 4
        sumR += img.data[index] * filterValue
        sumG += img.data[index + 1] * filterValue
        sumB += img.data[index + 2] * filterValue
      }
      final.data[i] = sumR
      final.data[i + 1] = sumG
      final.data[i + 2] = sumB
      final.data[i + 3] = 255
    }
    return final
  }

  static darn(img, x0, y0, x1, y1) {
    const { width: w, height: h } = img
    for (var i = y0; i <= y1; i++) {
      const ki0 = (y0 == 0) ? 0 : 1 / (i - (y0 - 1))
      const ki1 = (y1 == h - 1) ? 0 : 1 / (y1 + 1 - i)
      for (var j = x0; j <= x1; j++) {
        const kj0 = (x0 == 0) ? 0 : 1 / (j - (x0 - 1))
        const kj1 = (x1 == w - 1) ? 0 : 1 / (x1 + 1 - j)
        var color = [0, 0, 0]
        const indexI0 = (j + (y0 - 1) * w) * 4
        const indexI1 = (j + (y1 + 1) * w) * 4
        const indexJ0 = ((x0 - 1) + i * w) * 4
        const indexJ1 = ((x1 + 1) + i * w) * 4
        const d = ki0 + ki1 + kj0 + kj1
        for (var k = 0; k < 3; k++) {
          const pi0 = (y0 == 0) ? 0 : img.data[indexI0 + k]
          const pi1 = (y1 == h - 1) ? 0 : img.data[indexI1 + k]
          const pj0 = (x0 == 0) ? 0 : img.data[indexJ0 + k]
          const pj1 = (x1 == w - 1) ? 0 : img.data[indexJ1 + k]
          color[k] = (pi0 * ki0 + pi1 * ki1 + pj0 * kj0 + pj1 * kj1) / d
        }
        const index = (j + i * w) * 4
        img.data[index] = color[0]
        img.data[index + 1] = color[1]
        img.data[index + 2] = color[2]
      }
    }
    return img
  }

  static combine(width, height, stack, formula) {
    try {
      const func = Function(stack.map((_, i) => `i${i + 1}`).join(','), `return ${formula}`)
      const img = new RawImageData(width, height)
      for (let i = 0; i < img.data.length; i += 4) {
        const { x, y } = this.getPosFromIndex(i, img.width)
        img.data[i] = func(...stack.map(s => x > s.width || y > s.height ? 0 : s.data[(x + y * s.width) * 4] / 255)) * 255
        img.data[i + 1] = func(...stack.map(s => x > s.width || y > s.height ? 0 : s.data[(x + y * s.width) * 4 + 1] / 255)) * 255
        img.data[i + 2] = func(...stack.map(s => x > s.width || y > s.height ? 0 : s.data[(x + y * s.width) * 4 + 2] / 255)) * 255
        img.data[i + 3] = 255
      }
      return img
    } catch (e) {
      return e
    }
  }

  static contrast(img) {
    let rBlack = 255, gBlack = 255, bBlack = 255
    let rWhite = 0, gWhite = 0, bWhite = 0
    for (let i = 0; i < img.data.length; i += 4) {
      if (img.data[i] < rBlack)
        rBlack = img.data[i]
      if (img.data[i] > rWhite)
        rWhite = img.data[i]
      if (img.data[i + 1] < gBlack)
        gBlack = img.data[i]
      if (img.data[i + 1] > gWhite)
        gWhite = img.data[i + 1]
      if (img.data[i + 2] < bBlack)
        bBlack = img.data[i + 2]
      if (img.data[i + 2] > bWhite)
        bWhite = img.data[i + 2]
    }
    for (let i = 0; i < img.data.length; i += 4) {
      img.data[i] = (img.data[i] - rBlack) / (rWhite - rBlack) * 255
      img.data[i + 1] = (img.data[i + 1] - gBlack) / (gWhite - gBlack) * 255
      img.data[i + 2] = (img.data[i + 2] - bBlack) / (bWhite - bBlack) * 255
    }
    return img
  }

  static gray(img) {
    for (let i = 0; i < img.data.length; i += 4) {
      const value = img.data[i] * 0.2126 + img.data[i + 1] * 0.7152 + img.data[i + 2] * 0.0722
      img.data[i] = img.data[i + 1] = img.data[i + 2] = value
    }
    return img
  }

  static saturation(sign, img) {
    let count = 0
    const value = 5 * sign
    for (let i = 0; i < img.data.length; i += 4) {
      const r = img.data[i]
      const g = img.data[i + 1]
      const b = img.data[i + 2]
      if (r > g && r > b) {
        img.data[i] += value
        if (g < b)
          img.data[i + 1] -= value
        else
          img.data[i + 2] -= value
      }
      if (g > r && g > b) {
        img.data[i + 1] += value
        if (r < b)
          img.data[i] -= value
        else
          img.data[i + 2] -= value
      }
      if (b > r && b > g) {
        img.data[i + 2] += value
        if (r < g)
          img.data[i] -= value
        else
          img.data[i + 1] -= value
      }
    }
    return img
  }

  static getMode(items) {
    const store = {}
    let maxCount = 0
    let maxIndex = -1
    items.forEach((item, index) => {
      if (!store[item]) { store[item] = 0 }
      store[item] += 1
      if (store[item] > maxCount) {
        maxIndex = index
        maxCount = store[item]
      }
    })
    return maxIndex
  }

  static transpose(img) {
    const result = new ImageData(img.height, img.width)
    for (let i = 0; i < img.data.length; i += 4) {
      const { x, y } = this.getPosFromIndex(i, img.width)
      const newIndex = (y + x * result.width) * 4
      result.data[newIndex] = img.data[i]
      result.data[newIndex + 1] = img.data[i + 1]
      result.data[newIndex + 2] = img.data[i + 2]
      result.data[newIndex + 3] = img.data[i + 3]
    }
    return result
  }

  static removeNoise(img, method, filterSize) {
    const final = new ImageData(img.width, img.height)
    const filterWidth = Math.sqrt(filterSize)
    const halfWidth = Math.floor(filterWidth / 2)
    const s = (a, b) => a - b
    const r = [], g = [], b = []
    for (let i = 0; i < img.data.length; i += 4) {
      const { x, y } = this.getPosFromIndex(i, img.width)
      for (let j = 0; j < filterSize; j += 1) {
        const xFilter = j % filterWidth
        const yFilter = Math.floor(j / filterWidth)
        if (xFilter + x < 0 || xFilter - halfWidth + x >= img.width ||
          yFilter - halfWidth + y < 0 || yFilter - halfWidth + y >= img.height)
          continue
        r.push(img.data[((xFilter - halfWidth + x) + (yFilter - halfWidth + y) * img.width) * 4])
        g.push(img.data[((xFilter - halfWidth + x) + (yFilter - halfWidth + y) * img.width) * 4 + 1])
        b.push(img.data[((xFilter - halfWidth + x) + (yFilter - halfWidth + y) * img.width) * 4 + 2])
      }
      if (method == 'median') {
        final.data[i] = (r[Math.floor(r.length / 2)] + r[Math.ceil(r.length / 2)]) / 2
        final.data[i + 1] = (g[Math.floor(g.length / 2)] + g[Math.ceil(g.length / 2)]) / 2
        final.data[i + 2] = (b[Math.floor(b.length / 2)] + b[Math.ceil(b.length / 2)]) / 2
      } else if (method == 'mean') {
        r.sort(s)
        g.sort(s)
        b.sort(s)
        final.data[i] = r.reduce((partialSum, a) => partialSum + a, 0) / filterSize
        final.data[i + 1] = g.reduce((partialSum, a) => partialSum + a, 0) / filterSize
        final.data[i + 2] = b.reduce((partialSum, a) => partialSum + a, 0) / filterSize
      } else if (method == 'mode') {
        let mode
        const vr = final.data[i]
        const vg = final.data[i + 1]
        const vb = final.data[i + 2]
        if (vr > vb) {
          if (vr > vg)
            mode = this.getMode(r)
          else
            mode = this.getMode(g)
        } else {
          if (vb > vg)
            mode = this.getMode(b)
          else
            mode = this.getMode(g)
        }
        if (!mode) mode = this.getMode(r)
        final.data[i] = r[mode]
        final.data[i + 1] = g[mode]
        final.data[i + 2] = b[mode]
      }
      final.data[i + 3] = 255
      r.length = 0
      g.length = 0
      b.length = 0
    }
    return final
  }

  static dist(rgbA, rgbB) {
    let sum = 0
    for (let i = 0; i < rgbA.length; i++)
      sum += Math.abs(rgbA[i] - rgbB[i])
    return sum / rgbA.length
  }

  static region(x, y, img, [r, g, b]) {
    const result = new ImageData(Uint8ClampedArray.from(img.data), img.width)
    const posToLook = [[x, y]]
    const visited = {}
    const threshold = 10
    while (posToLook.length) {
      const current = posToLook.shift()
      if (current in visited)
        continue
      const index = (current[0] + current[1] * img.width) * 4
      const rgbA = [img.data[index], img.data[index + 1], img.data[index + 2]]
      result.data[index] = r
      result.data[index + 1] = g
      result.data[index + 2] = b
      let indexB = ((x + 1) + y * img.width) * 4
      let rgbB = [img.data[indexB], img.data[indexB + 1], img.data[indexB + 2]]
      if (current[0] + 1 >= 0 && current[0] + 1 < img.width
        && this.dist(rgbA, rgbB) < threshold && !([current[0] + 1, current[1]] in visited))
        posToLook.push([current[0] + 1, current[1]])
      indexB = ((x - 1) + y * img.width) * 4
      rgbB = [img.data[indexB], img.data[indexB + 1], img.data[indexB + 2]]
      if (current[0] - 1 >= 0 && current[0] - 1 < img.width
        && this.dist(rgbA, rgbB) < threshold && !([current[0] - 1, current[1]] in visited))
        posToLook.push([current[0] - 1, current[1]])
      indexB = (x + (y + 1) * img.width) * 4
      rgbB = [img.data[indexB], img.data[indexB + 1], img.data[indexB + 2]]
      if (current[1] + 1 >= 0 && current[1] + 1 < img.height
        && this.dist(rgbA, rgbB) < threshold && !([current[0], current[1] + 1] in visited))
        posToLook.push([current[0], current[1] + 1])
      indexB = (x + (y - 1) * img.width) * 4
      rgbB = [img.data[indexB], img.data[indexB + 1], img.data[indexB + 2]]
      if (current[1] - 1 >= 0 && current[1] - 1 < img.height
        && this.dist(rgbA, rgbB) < threshold && !([current[0], current[1] - 1] in visited))
        posToLook.push([current[0], current[1] - 1])
      visited[current] = true
    }
    return result
  }

  static billinear(img, filterWidth = 5, sigmaColor = 20, sigmaSpace = 10) {
    const colorFactor = 2 * sigmaColor * sigmaColor
    const spaceFactor = 2 * sigmaSpace * sigmaSpace
    const final = new RawImageData(img.width, img.height)
    const halfWidth = Math.floor(filterWidth / 2)
    for (let i = 0; i < img.data.length; i += 4) {
      const { x, y } = this.getPosFromIndex(i, img.width)
      const cp1 = img.data[i]
      const cp2 = img.data[i + 1]
      const cp3 = img.data[i + 2]
      let totalWeight = 0
      let sumR = 0, sumG = 0, sumB = 0
      for (let j = 0; j < filterWidth * filterWidth; j += 1) {
        const xFilter = (j % filterWidth) - halfWidth
        const yFilter = Math.floor(j / filterWidth) - halfWidth
        if (
          xFilter + x < 0 || xFilter + x >= img.width ||
          yFilter + y < 0 || yFilter + y >= img.height
        ) continue
        const spaceDist = (xFilter * xFilter + yFilter * yFilter) / spaceFactor
        const index = ((xFilter + x) + (yFilter + y) * img.width) * 4
        const np1 = img.data[index]
        const np2 = img.data[index + 1]
        const np3 = img.data[index + 2]
        const colorDist = ((cp1 - np1) ** 2 + (cp2 - np2) ** 2 + (cp3 - np3) ** 2) / colorFactor
        const weight = Math.exp(-(spaceDist + colorDist))
        sumR += np1 * weight
        sumG += np2 * weight
        sumB += np3 * weight
        totalWeight += weight
      }

      final.data[i] = sumR / totalWeight
      final.data[i + 1] = sumG / totalWeight
      final.data[i + 2] = sumB / totalWeight
      final.data[i + 3] = 255
    }
    return final
  }
}

onmessage = e => {
  const func = e.data.shift()
  const result = Processing[func](...e.data)
  postMessage(result)
}
