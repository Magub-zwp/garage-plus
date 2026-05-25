'use client'
import { useEffect, useState } from 'react'
import { getPublishedArticles, getArticlesByCategory, getFeaturedArticles } from '@/lib/firebase/firestore'

export function useArticles(category='all', lim=10) {
  const [articles, setArticles] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    setLoading(true)
    const fn = category === 'all' ? getPublishedArticles(lim) : getArticlesByCategory(category, lim)
    fn.then(a  => setArticles(a))
      .catch(() => setArticles([]))
      .finally(() => setLoading(false))
  }, [category, lim])

  return { articles, loading }
}

export function useFeaturedArticles(lim=5) {
  const [articles, setArticles] = useState([])
  const [loading,  setLoading]  = useState(true)
  useEffect(() => {
    getFeaturedArticles(lim)
      .then(a  => setArticles(a))
      .catch(() => setArticles([]))
      .finally(() => setLoading(false))
  }, [lim])
  return { articles, loading }
}
