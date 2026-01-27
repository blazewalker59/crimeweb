/**
 * Create Case Modal Component
 * Allows users to create a new case and optionally link an episode
 */
import { useState } from 'react'
import { X, Plus, Minus } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase'
import { useAuth } from '@/components/auth'
import type { CaseInsert } from '@/lib/supabase/types'

interface CreateCaseModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated?: (caseId: number) => void
  episodeIdToLink?: number
  prefillData?: Partial<{
    name: string
    victimNames: string[]
    perpetratorNames: string[]
  }>
}

export function CreateCaseModal({
  isOpen,
  onClose,
  onCreated,
  episodeIdToLink,
  prefillData,
}: CreateCaseModalProps) {
  const { user } = useAuth()
  const supabase = createBrowserClient()

  const [formData, setFormData] = useState({
    name: prefillData?.name || '',
    victimNames: prefillData?.victimNames || [''],
    perpetratorNames: prefillData?.perpetratorNames || [''],
    location: '',
    state: '',
    year: '',
    summary: '',
    wikipediaUrl: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleArrayChange = (
    field: 'victimNames' | 'perpetratorNames',
    index: number,
    value: string,
  ) => {
    setFormData((prev) => {
      const newArray = [...prev[field]]
      newArray[index] = value
      return { ...prev, [field]: newArray }
    })
  }

  const addArrayItem = (field: 'victimNames' | 'perpetratorNames') => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], ''],
    }))
  }

  const removeArrayItem = (
    field: 'victimNames' | 'perpetratorNames',
    index: number,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }))
  }

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setError('Case name is required')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Create the case
      const caseInsert: CaseInsert = {
        name: formData.name.trim(),
        slug: generateSlug(formData.name),
        victim_names: formData.victimNames.filter((n) => n.trim()),
        perpetrator_names: formData.perpetratorNames.filter((n) => n.trim()),
        location: formData.location.trim() || null,
        state: formData.state.trim() || null,
        year: formData.year ? parseInt(formData.year, 10) : null,
        summary: formData.summary.trim() || null,
        wikipedia_url: formData.wikipediaUrl.trim() || null,
        created_by: user?.id || null,
      }

      const { data: newCase, error: insertError } = await supabase
        .from('cases')
        .insert(caseInsert)
        .select()
        .single()

      if (insertError) throw insertError

      // Link episode if provided
      if (episodeIdToLink && newCase) {
        const { error: linkError } = await supabase
          .from('episode_cases')
          .insert({
            episode_id: episodeIdToLink,
            case_id: newCase.id,
            is_primary: true,
            confidence_score: 1.0,
            linked_by: user?.id || null,
          })

        if (linkError) throw linkError
      }

      onCreated?.(newCase.id)
      onClose()
    } catch (err) {
      console.error('Create case error:', err)
      setError('Failed to create case')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const US_STATES = [
    'AL',
    'AK',
    'AZ',
    'AR',
    'CA',
    'CO',
    'CT',
    'DE',
    'FL',
    'GA',
    'HI',
    'ID',
    'IL',
    'IN',
    'IA',
    'KS',
    'KY',
    'LA',
    'ME',
    'MD',
    'MA',
    'MI',
    'MN',
    'MS',
    'MO',
    'MT',
    'NE',
    'NV',
    'NH',
    'NJ',
    'NM',
    'NY',
    'NC',
    'ND',
    'OH',
    'OK',
    'OR',
    'PA',
    'RI',
    'SC',
    'SD',
    'TN',
    'TX',
    'UT',
    'VT',
    'VA',
    'WA',
    'WV',
    'WI',
    'WY',
    'DC',
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-slate-800 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Create New Case</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-4 space-y-4"
        >
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Case Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-slate-300 mb-1"
            >
              Case Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., The Scott Peterson Case"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500"
              required
            />
          </div>

          {/* Victim Names */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Victim Names
            </label>
            {formData.victimNames.map((name, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) =>
                    handleArrayChange('victimNames', index, e.target.value)
                  }
                  placeholder="Victim name"
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500"
                />
                {formData.victimNames.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeArrayItem('victimNames', index)}
                    className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                    aria-label="Remove victim"
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem('victimNames')}
              className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1"
            >
              <Plus className="h-4 w-4" /> Add victim
            </button>
          </div>

          {/* Perpetrator Names */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Perpetrator Names
            </label>
            {formData.perpetratorNames.map((name, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) =>
                    handleArrayChange('perpetratorNames', index, e.target.value)
                  }
                  placeholder="Perpetrator name"
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500"
                />
                {formData.perpetratorNames.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeArrayItem('perpetratorNames', index)}
                    className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                    aria-label="Remove perpetrator"
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem('perpetratorNames')}
              className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1"
            >
              <Plus className="h-4 w-4" /> Add perpetrator
            </button>
          </div>

          {/* Location and State */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="location"
                className="block text-sm font-medium text-slate-300 mb-1"
              >
                City/Location
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="e.g., Modesto"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label
                htmlFor="state"
                className="block text-sm font-medium text-slate-300 mb-1"
              >
                State
              </label>
              <select
                id="state"
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-red-500"
              >
                <option value="">Select...</option>
                {US_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Year */}
          <div>
            <label
              htmlFor="year"
              className="block text-sm font-medium text-slate-300 mb-1"
            >
              Year (of crime)
            </label>
            <input
              type="number"
              id="year"
              name="year"
              value={formData.year}
              onChange={handleInputChange}
              placeholder="e.g., 2002"
              min="1900"
              max={new Date().getFullYear()}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Summary */}
          <div>
            <label
              htmlFor="summary"
              className="block text-sm font-medium text-slate-300 mb-1"
            >
              Summary
            </label>
            <textarea
              id="summary"
              name="summary"
              value={formData.summary}
              onChange={handleInputChange}
              placeholder="Brief description of the case..."
              rows={3}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500 resize-none"
            />
          </div>

          {/* Wikipedia URL */}
          <div>
            <label
              htmlFor="wikipediaUrl"
              className="block text-sm font-medium text-slate-300 mb-1"
            >
              Wikipedia URL
            </label>
            <input
              type="url"
              id="wikipediaUrl"
              name="wikipediaUrl"
              value={formData.wikipediaUrl}
              onChange={handleInputChange}
              placeholder="https://en.wikipedia.org/wiki/..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.name.trim()}
            className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 disabled:bg-slate-600 text-white rounded-lg transition-colors"
          >
            {isSubmitting ? 'Creating...' : 'Create Case'}
          </button>
        </div>
      </div>
    </div>
  )
}
