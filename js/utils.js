export const TWOPI = Math.PI * 2
export const URL = window.URL || window.webkitURL

export const $ = _ => document.querySelector(_)
export const $all = _ => Array.from(document.querySelectorAll(_))
export const getRandom = (min, max) => Math.round(Math.random() * (max - min) + min)
