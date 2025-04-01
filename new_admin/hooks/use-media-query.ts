"use client"

import { useEffect, useState } from "react"

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)
  
  useEffect(() => {
    // Initialize to false on the server
    if (typeof window === "undefined") return
    
    const media = window.matchMedia(query)
    
    // Set the initial value
    setMatches(media.matches)
    
    // Define the callback
    const listener = () => {
      setMatches(media.matches)
    }
    
    // Watch for changes
    media.addEventListener("change", listener)
    
    // Clean up
    return () => {
      media.removeEventListener("change", listener)
    }
  }, [query])
  
  return matches
} 