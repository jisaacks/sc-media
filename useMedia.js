import { useState, useEffect, useCallback } from 'react'
import { fromArgs } from 'theme/media'

function useMedia(...args) {
  const matcher = window.matchMedia(fromArgs(args))

  const [matches, setMatches] = useState(matcher.matches)

  const handleChange = useCallback(event => setMatches(event.matches), [])

  useEffect(() => {
    matcher.addEventListener('change', handleChange)
    return () => {
      matcher.removeEventListener('change', handleChange)
    }
  }, [matcher, handleChange])

  return matches
}

export default useMedia