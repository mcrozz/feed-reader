// utils -> retrieve

import fetch from 'cross-fetch'
import { XMLParser } from 'fast-xml-parser'

const profetch = async (url, options = {}) => {
  const { proxy = {}, signal = null } = options
  const {
    target,
    headers = {},
  } = proxy
  const res = await fetch(target + encodeURIComponent(url), {
    headers,
    signal,
  })
  return res
}

const getCharsetFromText = (text) => {
  try {
    const firstLine = text.split('\n')[0].trim().replace('<?', '<').replace('?>', '>')
    const parser = new XMLParser({
      ignoreAttributes: false,
    })
    let obj = parser.parse(firstLine)
    const { xml: root = {} } = obj
    return root['@_encoding'] || 'utf8'
  } catch {
    return 'utf8'
  }
}

const defaultHeaders = {
  'user-agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:108.0) Gecko/20100101 Firefox/108.0',
}

export default async (url, options = {}) => {
  const { proxy } = options
  const res = proxy
    ? await profetch(url, { proxy, signal: options.signal })
    : await fetch(url, {
      ...options,
      headers: options.headers || defaultHeaders,
    })

  const status = res.status
  if (status >= 400) {
    throw new Error(`Request failed with error code ${status}`)
  }
  const contentType = res.headers.get('content-type')
  const buffer = await res.arrayBuffer()
  const text = buffer ? Buffer.from(buffer).toString().trim() : ''

  if (/(\+|\/)(xml|html)/.test(contentType)) {
    const arr = contentType.split('charset=')
    let charset = arr.length === 2 ? arr[1].trim() : getCharsetFromText(text)
    const decoder = new TextDecoder(charset)
    const xml = decoder.decode(buffer)
    return { type: 'xml', text: xml.trim(), status, contentType }
  }

  if (/(\+|\/)json/.test(contentType)) {
    try {
      const data = JSON.parse(text)
      return { type: 'json', json: data, status, contentType }
    } catch {
      throw new Error('Failed to convert data to JSON object')
    }
  }
  throw new Error(`Invalid content type: ${contentType}`)
}
