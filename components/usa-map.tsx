'use client'

import React, { useState, useMemo } from 'react'
import { universities, type University } from '@/app/universities'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, DollarSign, ExternalLink, MapPin, Sparkles, Trophy, Users } from 'lucide-react'
import { USA_STATE_PATHS, STATE_NAMES, STATE_CENTROIDS } from '@/lib/usa-map-data'

interface UsaMapProps {
  selectedState: string
  onSelectState: (stateCode: string) => void
  onResetAll: () => void
}

const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export function UsaMap({ selectedState, onSelectState, onResetAll }: UsaMapProps) {
  const [hoveredState, setHoveredState] = useState<string | null>(null)

  // Group universities by state abbreviation
  const universitiesByState = useMemo(() => {
    const map = new Map<string, University[]>()
    for (const u of universities) {
      const list = map.get(u.state) || []
      list.push(u)
      map.set(u.state, list)
    }
    return map
  }, [])

  // Top states by number of programs
  const topStates = useMemo(() => {
    const list = Array.from(universitiesByState.entries()).map(([code, list]) => ({
      code,
      name: STATE_NAMES[code] || code,
      count: list.length,
    }))
    list.sort((a, b) => b.count - a.count)
    return list.slice(0, 8)
  }, [universitiesByState])

  // Active state to display in preview panel (hovered takes priority, fallback to selected or CA)
  const activeStateCode = hoveredState || (selectedState !== 'All states' ? selectedState : null)
  const activePrograms = activeStateCode ? universitiesByState.get(activeStateCode) || [] : []
  const activeStateName = activeStateCode ? (STATE_NAMES[activeStateCode] || activeStateCode) : null

  // Color generator based on university density
  const getStateFill = (code: string) => {
    const count = (universitiesByState.get(code) || []).length
    const isSelected = selectedState === code
    const isHovered = hoveredState === code

    if (isSelected) return '#30d7b0' // Vibrant turquoise when selected
    if (isHovered) return '#06a085'  // Emerald when hovered
    if (count >= 6) return '#07485b'  // Deep cyan for top tier hubs (CA, MA, NY)
    if (count >= 4) return '#0b6477'  // Medium cyan for strong hubs (TX, PA, IL)
    if (count >= 2) return '#178096'  // Moderate cyan (NC, WA, MD, etc.)
    if (count === 1) return '#249bb3' // Light cyan for single program states
    return '#1a2936'                 // Subtle slate for states with 0 programs in top 100
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#163a5f] bg-gradient-to-b from-[#071b34] via-[#0b2444] to-[#081b31] p-5 lg:p-8 text-white shadow-2xl">
      {/* Background ambient glow effect */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-[#30d7b0]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-[#087e6a]/20 blur-3xl" />

      {/* Header bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-[#30d7b0] animate-pulse" />
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-[#30d7b0]">
              Interactive Geographic Intelligence
            </p>
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl text-white">
            US CS PhD Programs Map
          </h2>
          <p className="mt-1 text-sm text-[#a5c4df] max-w-2xl">
            Hover over any state to inspect program counts and projected Fall 2027 deadlines. Click a state to filter the database instantly.
          </p>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-3">
          <Button
            onClick={onResetAll}
            className={`font-semibold transition-all duration-300 ${
              selectedState === 'All states'
                ? 'bg-[#30d7b0] text-[#071b34] shadow-[0_0_20px_rgba(48,215,176,0.4)] hover:bg-[#25c49f]'
                : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
            }`}
          >
            <Sparkles size={16} className="text-current" />
            All 100 Programs
          </Button>
        </div>
      </div>

      {/* Quick State Hub Chips */}
      <div className="relative z-10 mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-[#83a7c9] mr-1 flex items-center gap-1">
          <Trophy size={13} className="text-[#30d7b0]" /> Top CS Hubs:
        </span>
        {topStates.map((st) => {
          const isSelected = selectedState === st.code
          return (
            <button
              key={st.code}
              onClick={() => onSelectState(st.code)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                isSelected
                  ? 'bg-[#30d7b0] text-[#071b34] shadow-md shadow-[#30d7b0]/30 font-bold scale-105'
                  : 'bg-white/10 text-[#d0e5f5] hover:bg-white/20 hover:text-white border border-white/10'
              }`}
            >
              <span>{st.name}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                  isSelected ? 'bg-[#071b34] text-[#30d7b0]' : 'bg-black/30 text-white/90'
                }`}
              >
                {st.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Main Grid: Map on Left, Live Detail Preview Card on Right */}
      <div className="relative z-10 mt-6 grid gap-6 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px] items-start">
        {/* Map SVG Container */}
        <div className="relative rounded-2xl border border-white/10 bg-black/25 p-3 sm:p-5 backdrop-blur-sm shadow-inner flex flex-col items-center">
          <svg
            viewBox="0 0 960 600"
            className="w-full h-auto max-h-[520px] select-none"
            aria-label="Interactive map of the United States"
          >
            <defs>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <linearGradient id="gradSelected" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#30d7b0" />
                <stop offset="100%" stopColor="#087e6a" />
              </linearGradient>
            </defs>

            {/* Render all state paths */}
            {Object.entries(USA_STATE_PATHS).map(([code, pathData]) => {
              const count = (universitiesByState.get(code) || []).length
              const isSelected = selectedState === code
              const isHovered = hoveredState === code
              const fill = getStateFill(code)

              return (
                <g key={code} className="transition-transform duration-200">
                  <path
                    d={pathData}
                    fill={isSelected ? 'url(#gradSelected)' : fill}
                    stroke={isSelected ? '#ffffff' : isHovered ? '#30d7b0' : count > 0 ? '#1b4a6b' : '#14212e'}
                    strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 1}
                    className="cursor-pointer transition-all duration-300 hover:opacity-95"
                    onMouseEnter={() => setHoveredState(code)}
                    onMouseLeave={() => setHoveredState(null)}
                    onClick={() => {
                      if (count > 0) {
                        onSelectState(code)
                      }
                    }}
                  >
                    <title>{`${STATE_NAMES[code] || code}: ${count} programs`}</title>
                  </path>
                </g>
              )
            })}

            {/* Render State Label Badges for States with Universities */}
            {Object.entries(STATE_CENTROIDS).map(([code, [cx, cy]]) => {
              const count = (universitiesByState.get(code) || []).length
              if (count === 0) return null

              const isSelected = selectedState === code
              const isHovered = hoveredState === code

              return (
                <g
                  key={`label-${code}`}
                  className="pointer-events-none transition-all duration-200"
                  transform={`translate(${cx}, ${cy})`}
                >
                  <circle
                    r={isSelected ? 11 : isHovered ? 10 : count >= 5 ? 9 : 8}
                    fill={isSelected ? '#ffffff' : '#071b34'}
                    stroke={isSelected ? '#071b34' : '#30d7b0'}
                    strokeWidth={1.5}
                    className="transition-all"
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={isSelected || isHovered ? '9.5' : '8.5'}
                    fontWeight="bold"
                    fill={isSelected ? '#071b34' : '#30d7b0'}
                    fontFamily="monospace"
                  >
                    {count}
                  </text>
                </g>
              )
            })}
          </svg>

          {/* Map Legend */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-[#a5c4df]">
            <span className="flex items-center gap-1.5 font-medium text-white">
              <span className="h-3 w-3 rounded-full bg-[#07485b] border border-white/20" /> 6+ Programs
            </span>
            <span className="flex items-center gap-1.5 font-medium text-white">
              <span className="h-3 w-3 rounded-full bg-[#0b6477] border border-white/20" /> 4–5 Programs
            </span>
            <span className="flex items-center gap-1.5 font-medium text-white">
              <span className="h-3 w-3 rounded-full bg-[#178096] border border-white/20" /> 2–3 Programs
            </span>
            <span className="flex items-center gap-1.5 font-medium text-white">
              <span className="h-3 w-3 rounded-full bg-[#249bb3] border border-white/20" /> 1 Program
            </span>
            <span className="flex items-center gap-1.5 font-medium text-white">
              <span className="h-3 w-3 rounded-full bg-[#30d7b0] border border-white" /> Selected State
            </span>
          </div>
        </div>

        {/* Right Details / Live State Inspector Card */}
        <div className="flex flex-col rounded-2xl border border-white/15 bg-white/5 p-5 backdrop-blur-md shadow-xl min-h-[460px]">
          {activeStateCode && activePrograms.length > 0 ? (
            <div className="flex flex-col h-full">
              {/* Card Header */}
              <div className="flex items-start justify-between border-b border-white/10 pb-4">
                <div>
                  <Badge className="bg-[#30d7b0] text-[#071b34] font-bold hover:bg-[#30d7b0]">
                    {activeStateCode} • {activePrograms.length} {activePrograms.length === 1 ? 'Program' : 'Programs'}
                  </Badge>
                  <h3 className="mt-2 text-xl font-bold text-white tracking-tight">
                    {activeStateName}
                  </h3>
                </div>
                {selectedState !== activeStateCode && (
                  <Button
                    size="sm"
                    onClick={() => onSelectState(activeStateCode)}
                    className="bg-[#30d7b0] text-[#071b34] hover:bg-[#25c49f] font-semibold text-xs h-8"
                  >
                    Filter Table
                  </Button>
                )}
              </div>

              {/* State Summary Stats */}
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-black/20 p-2.5 border border-white/5">
                  <span className="text-[#83a7c9] flex items-center gap-1">
                    <DollarSign size={12} className="text-[#30d7b0]" /> Avg. App Fee
                  </span>
                  <p className="mt-0.5 text-base font-bold text-white">
                    {money.format(
                      Math.round(
                        activePrograms.reduce((sum, p) => sum + p.fee, 0) / activePrograms.length
                      )
                    )}
                  </p>
                </div>
                <div className="rounded-xl bg-black/20 p-2.5 border border-white/5">
                  <span className="text-[#83a7c9] flex items-center gap-1">
                    <Calendar size={12} className="text-[#30d7b0]" /> Earliest Deadline
                  </span>
                  <p className="mt-0.5 text-sm font-bold text-white">
                    {dateFormat.format(
                      new Date(`${[...activePrograms].sort((a, b) => a.deadline.localeCompare(b.deadline))[0].deadline}T00:00:00Z`)
                    )}
                  </p>
                </div>
              </div>

              {/* Programs List with Deadlines */}
              <div className="mt-4 flex-1 flex flex-col">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#83a7c9] mb-2">
                  Universities & Projected Deadlines:
                </p>
                <div className="space-y-2 overflow-y-auto max-h-[220px] pr-1 scrollbar-thin">
                  {activePrograms.map((p) => (
                    <div
                      key={p.rank}
                      className="group rounded-xl border border-white/10 bg-black/30 p-2.5 transition-colors hover:border-[#30d7b0]/50 hover:bg-black/50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="inline-grid h-5 w-5 place-items-center rounded bg-[#30d7b0] text-[10px] font-bold text-[#071b34] shrink-0">
                            #{p.rank}
                          </span>
                          <p className="text-xs font-semibold text-white truncate">
                            {p.university}
                          </p>
                        </div>
                        <a
                          href={p.programUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#30d7b0] hover:text-white shrink-0"
                          title="Open official admissions page"
                        >
                          <ExternalLink size={12} />
                        </a>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#a5c4df]">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} className="text-[#30d7b0]" />
                          {dateFormat.format(new Date(`${p.deadline}T00:00:00Z`))}
                        </span>
                        <span className="font-mono text-emerald-400 font-medium">
                          {money.format(p.fee)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-white/10 flex gap-2">
                <Button
                  onClick={() => onSelectState(activeStateCode)}
                  className="flex-1 bg-[#30d7b0] text-[#071b34] hover:bg-[#25c49f] font-bold text-xs h-9"
                >
                  View in Table ({activePrograms.length})
                </Button>
                <a
                  href={`/faculty?university=${encodeURIComponent(activePrograms[0].university)}`}
                  className="inline-flex items-center justify-center rounded-md border border-white/20 bg-white/10 px-3 text-xs font-medium text-white hover:bg-white/20 transition-colors"
                >
                  <Users size={13} className="mr-1" /> Faculty
                </a>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-[#30d7b0] mb-3">
                <MapPin size={24} />
              </div>
              <h3 className="text-base font-bold text-white">Select or Hover a State</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#a5c4df] max-w-xs">
                Explore where top CS PhD programs are located across the United States. Click any highlighted state on the map or select from the top hubs above.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelectState('CA')}
                className="mt-4 border-[#30d7b0]/40 bg-transparent text-[#30d7b0] hover:bg-[#30d7b0]/10 text-xs font-semibold"
              >
                Inspect Top Hub: California (8 Programs)
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
