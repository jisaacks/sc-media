import { css } from 'styled-components'
import uniqBy from 'lodash/uniqBy'

const TABLET_MAX = 900
const MOBILE_MAX = 600

export const sizes = {
  desktop: { min: TABLET_MAX+1 },
  tablet: { min: MOBILE_MAX+1, max: TABLET_MAX },
  mobile: { max: MOBILE_MAX },
  tiny: { max: 330 },
}

function formatRule(string) {
  string = string.replace(/[()]/mg, '')
  if (string.match(/[:<>=]/)) {
    string = `(${string})`
  }
  return string
}

function breakdownRules(string) {
  let hasNot = string.toLowerCase().includes('not')
  const rules = string.toLowerCase().split('and').map(s => s.trim())
  const formatted = rules.map(formatRule).map(rule => {
    if (rule.match(/not (.*)/)) {
      rule = rule.match(/not (.*)/)[1]
    }
    return rule
  })

  formatted.sort((a, b) => {
    // Put any media type rules first.
    const _a = !!a.match(/all|print|screen|speach/) ? 0 : 1
    const _b = !!b.match(/all|print|screen|speach/) ? 0 : 1
    return _a - _b
  })

  if (hasNot) {
    formatted.unshift('not')
  }

  const uniq = uniqBy(formatted, rule => {
    return rule.match(/all|print|screen|speach/) ? 'all|print|screen|speach' : rule
  })

  return uniq
}

function breakdown(string) {
  const queries = string.split(',').map(s => s.trim())
  return queries.map(breakdownRules)
}

function fromString(string) {
  return or(...breakdown(string).map(rules => and(...rules)))
}

export function fromArgs(args) {
  const queries = args.map(toQuery)
  return fromString(or(...queries))
}

function not(arg) {
  const string = toQuery(arg)

  return or(...breakdown(string).map(rules => {
    let [firstRule, ...remaining] = rules
    if (firstRule === 'not') {
      // first rule already negated, remove it.
      const [newFirst, ...newRemaining] = remaining
      firstRule = newFirst
      remaining = newRemaining
    } else if (['all', 'print', 'screen', 'speach'].includes(firstRule)) {
      // first rule is a media type, so we don't need to manually add one.
      remaining.unshift(firstRule)
      firstRule = 'not'
    } else {
      // No media type specified but required add it and the not
      remaining.unshift(firstRule)
      remaining.unshift('all')
      firstRule = 'not'
    }
    const fixedRules = [firstRule, ...remaining]
    return and(...fixedRules)
  }))
}

function and(...queries) {
  if (queries[0] === 'not') {
    const [not, ...others] = queries
    return `${not} ${others.join(' and ')}`
  }
  return `${queries.join(' and ')}`
}

function or(...queries) {
  return `${queries.join(', ')}`
}

function query(widths) {
  return and(...Object.keys(widths).reduce((acc, label) => [
    ...acc, fromString(`${label}-width: ${widths[label] / 16}em`)
  ], []))
}

function toQuery(value) {
  if (typeof value === 'function') {
    return value.query
  }
  if (typeof value === 'object') {
    return Array.isArray(value) ? and(...value.map(v => toQuery(v))) : query(value)
  }
  if (typeof value === 'string') {
    return media[value] ? toQuery(media[value]) : fromString(value)
  }
}

function media(...args) {
  const query = fromArgs(args)
  const fn = (...templateArgs) => {
    return props => css`
      @media ${query} {
        ${css(...templateArgs)}
      }
    `
  }
  fn.query = query
  return fn
}

media.not = fn => {
  return media(not(toQuery(fn)))
}

media.define = (label, ...values) => {
  if (label === 'not') {
    throw Error('Cannot define a query with name "not"')
  }
  const fn = media(...values)
  media[label] = fn
}

media.define('mobile', sizes.mobile)
media.define('tablet', sizes.tablet)
media.define('desktop', sizes.desktop)
media.define('tiny', sizes.tiny)

export default media