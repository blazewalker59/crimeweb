/**
 * SearchBar Component
 */
import { useState, type FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Search } from 'lucide-react'

interface SearchBarProps {
  placeholder?: string
  defaultValue?: string
  onSearch?: (query: string) => void
  autoFocus?: boolean
}

export function SearchBar({
  placeholder = 'Search episodes, cases, shows...',
  defaultValue = '',
  onSearch,
  autoFocus = false,
}: SearchBarProps) {
  const [query, setQuery] = useState(defaultValue)
  const navigate = useNavigate()

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      if (onSearch) {
        onSearch(query.trim())
      } else {
        navigate({ to: '/search', search: { q: query.trim() } })
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
        />
      </div>
    </form>
  )
}
