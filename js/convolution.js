import RawImageData from './RawImageData.js'

class Processing {

  static getPosFromIndex(index, w) {
    index /= 4
    const x = (index % w)
    const y = Math.floor(index / w)
    return {x, y}
  }
  
  static getIndexFromPos(x, y, width) {
    return x + y * width
  }

  static convolve(img, filter) {
    const final = new RawImageData(img.width, img.height)  
    const filterWidth = Math.sqrt(filter.length)
    const halfWidth = Math.floor(filterWidth / 2)
    for (let i = 0; i < img.data.length; i += 4) {
      const {x, y} = this.getPosFromIndex(i, img.width)
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
        sumB += img.data[index + 2]  * filterValue
      }
      final.data[i] = sumR
      final.data[i + 1] = sumG
      final.data[i + 2] = sumB
      final.data[i + 3] = 255
    }
    return final
  }
  
  static combine(width, height, stack, formula) {
    try {
      const func = Function(stack.map((_, i) => `i${i+1}`).join(','), `return ${formula}`)
      const img = new RawImageData(width, height)
      for (let i = 0; i < img.data.length; i += 4) {
        const {x, y} = this.getPosFromIndex(i, img.width)
        img.data[i] = func(...stack.map(s => x > s.width || y > s.height ? 0 : s.data[(x + y * s.width) * 4] / 255)) * 255
        img.data[i + 1] = func(...stack.map(s => x > s.width || y > s.height ? 0 : s.data[(x + y * s.width) * 4 + 1] / 255)) * 255
        img.data[i + 2] = func(...stack.map(s => x > s.width || y > s.height ? 0 : s.data[(x + y * s.width) * 4 + 2] / 255)) * 255
        img.data[i + 3] = 255
      }
      return img
    } catch(e) {
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
      if (!store[item]) {store[item] = 0}
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
      const {x, y} = this.getPosFromIndex(i, img.width)
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
      const {x, y} = this.getPosFromIndex(i, img.width)
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
}

onmessage = e => {
  const func = e.data.shift()
  const result = Processing[func](...e.data)
  postMessage(result)
}
