export default class RawImageData {
  constructor(width, height, data) {
    this.width = width
    this.height = height
    this.data = data || new Float64Array(width * height * 4)
  }

  static fromObject(rawImageData) {
    return new RawImageData(rawImageData.width, rawImageData.height, rawImageData.data)
  }

  toImage() {
    return new ImageData(Uint8ClampedArray.from(this.data), this.width)
  }
}
