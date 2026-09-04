'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowUpDown,
  BookOpen,
  CalendarDays,
  Download,
  ExternalLink,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
  Map as MapIcon,
  ListFilter
} from 'lucide-react'
import { universities, type University } from './universities'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { UsaTerrainMap } from '@/components/usa-terrain-map'

type SortKey = 'rank' | 'university' | 'deadline' | 'fee'
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
const csvCell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`

export default function Home() {
  const [query, setQuery] = useState('')
  const [state, setState] = useState('All states')
  const [deadline, setDeadline] = useState('All deadlines')
  const [gre, setGre] = useState('All GRE policies')
  const [sortKey, setSortKey] = useState<SortKey>('rank')
  const [sortAsc, setSortAsc] = useState(true)
  const [viewMode, setViewMode] = useState<'map_and_table' | 'table_only'>('map_and_table')

  const states = useMemo(() => Array.from(new Set(universities.map((u) => u.state))).sort(), [])

  useEffect(() => {
    const modelContext = (
      document as Document & {
        modelContext?: { registerTool: (tool: object, options?: { signal?: AbortSignal }) => void | Promise<void> }
      }
    ).modelContext
    if (!modelContext?.registerTool) return
    const lifecycle = new AbortController()
    void Promise.resolve(
      modelContext.registerTool(
        {
          name: 'filter_cs_phd_programs',
          title: 'Filter CS PhD programs',
          description:
            'Update the visible university table using an optional search term, US state abbreviation, deadline month, or GRE policy.',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string' },
              state: { type: 'string' },
              deadlineMonth: { type: 'string', enum: ['2026-12', '2027-01', '2027-02'] },
              gre: { type: 'string', enum: ['Not required', 'Optional', 'Check program'] },
            },
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute(input: unknown) {
            const value = (input ?? {}) as { query?: string; state?: string; deadlineMonth?: string; gre?: string }
            setQuery(value.query ?? '')
            setState(value.state ?? 'All states')
            setDeadline(value.deadlineMonth ?? 'All deadlines')
            setGre(value.gre ?? 'All GRE policies')
            return { status: 'filtered', filters: value }
          },
        },
        { signal: lifecycle.signal }
      )
    ).catch(() => undefined)
    return () => lifecycle.abort()
  }, [])

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase()
    return universities
      .filter((u) => !term || `${u.university} ${u.city} ${u.state} ${u.program}`.toLowerCase().includes(term))
      .filter((u) => state === 'All states' || u.state === state)
      .filter((u) => gre === 'All GRE policies' || u.gre === gre)
      .filter((u) => deadline === 'All deadlines' || u.deadline.slice(0, 7) === deadline)
      .sort((a, b) => {
        const left = a[sortKey]
        const right = b[sortKey]
        const result = typeof left === 'number' ? left - (right as number) : String(left).localeCompare(String(right))
        return sortAsc ? result : -result
      })
  }, [query, state, deadline, gre, sortKey, sortAsc])

  function sortBy(key: SortKey) {
    if (sortKey === key) setSortAsc((value) => !value)
    else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  function resetAll() {
    setQuery('')
    setState('All states')
    setDeadline('All deadlines')
    setGre('All GRE policies')
  }

  function handleStateSelect(selectedStateCode: string) {
    setState(selectedStateCode)
    // Smooth scroll down to table
    const tableEl = document.getElementById('programs-table-section')
    if (tableEl) {
      tableEl.scrollIntoView({ behavior: 'smooth' })
    }
  }

  function exportCsv() {
    const headers = [
      'Rank',
      'University',
      'Program',
      'City',
      'State',
      'Fall 2027 deadline (projected)',
      'Application fee USD',
      'Fee waiver / free option',
      'GRE',
      'IELTS Academic',
      'Funding',
      'Official reference',
      'Notes',
    ]
    const content = [
      headers,
      ...rows.map((u) => [
        u.rank,
        u.university,
        u.program,
        u.city,
        u.state,
        u.deadline,
        u.fee,
        u.feeWaiver,
        u.gre,
        u.ielts,
        u.funding,
        u.programUrl,
        u.note,
      ]),
    ]
      .map((row) => row.map(csvCell).join(','))
      .join('\n')
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'cs-phd-fall-2027.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const hasFilters = query || state !== 'All states' || deadline !== 'All deadlines' || gre !== 'All GRE policies'

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Top Navigation */}
      <header className="border-b border-border bg-[#071b34] text-white sticky top-0 z-30 shadow-md">
        <div className="mx-auto flex max-w-[1550px] items-center justify-between px-5 py-3.5 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#30d7b0] text-[#071b34]">
              <BookOpen size={20} strokeWidth={2.5} />
            </div>
            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#83a7c9]">
                Application Intelligence
              </p>
              <h1 className="text-lg font-bold tracking-tight">CS PhD 100</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              onClick={resetAll}
              className={`text-xs sm:text-sm font-semibold transition-all ${
                state === 'All states' && !query && deadline === 'All deadlines'
                  ? 'bg-[#30d7b0] text-[#071b34] hover:bg-[#27be9b]'
                  : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
              }`}
            >
              <Sparkles size={15} /> All 100
            </Button>

            <a
              href="/faculty"
              className={buttonVariants({
                variant: 'outline',
                className: 'border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white text-xs sm:text-sm',
              })}
            >
              <Users size={16} /> Faculty & Labs
            </a>

            <Button onClick={exportCsv} className="bg-white text-[#071b34] hover:bg-[#e9f2f8] text-xs sm:text-sm">
              <Download size={15} /> Export CSV
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1550px] px-5 pb-16 pt-7 lg:px-8 space-y-8">
        {/* Hero Section */}
        <div className="grid gap-6 border-b border-border pb-7 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#087e6a]">
              <CalendarDays size={16} /> Fall 2027 Planning Edition
            </div>
            <h2 className="max-w-3xl text-3xl font-bold leading-tight tracking-[-0.04em] sm:text-4xl text-[#071b34]">
              US Computer Science PhD Application Hub
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
              Interactive map and database of 100 top US Computer Science PhD programs. Explore state geographic hubs, projected Fall 2027 application deadlines, fees, GRE policies, and verified faculty advisers.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border bg-border text-center shadow-sm">
            <Stat value="100" label="Programs" />
            <Stat value={`${states.length}`} label="States + DC" />
            <Stat
              value={money.format(Math.round(universities.reduce((sum, u) => sum + u.fee, 0) / universities.length))}
              label="Avg. fee"
            />
          </div>
        </div>

        {/* Interactive USA Terrain Map Section */}
        <div className="space-y-3">
          <UsaTerrainMap
            selectedState={state}
            onSelectState={handleStateSelect}
            onResetAll={resetAll}
          />
        </div>

        {/* Filter & Search Toolbar */}
        <div
          id="programs-table-section"
          className="sticky top-[60px] z-20 -mx-2 rounded-2xl border border-border bg-background/95 p-3.5 shadow-[0_10px_32px_rgba(7,27,52,0.07)] backdrop-blur"
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(280px,1fr)_180px_200px_190px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search university, city, state…"
                className="h-11 pl-10 font-medium"
                aria-label="Search programs"
              />
            </div>
            <NativeSelect
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="h-11 font-medium"
              aria-label="Filter by state"
            >
              <NativeSelectOption>All states</NativeSelectOption>
              {states.map((item) => (
                <NativeSelectOption key={item} value={item}>
                  {item}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <NativeSelect
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="h-11 font-medium"
              aria-label="Filter by deadline"
            >
              <NativeSelectOption>All deadlines</NativeSelectOption>
              <NativeSelectOption value="2026-12">December 2026</NativeSelectOption>
              <NativeSelectOption value="2027-01">January 2027</NativeSelectOption>
              <NativeSelectOption value="2027-02">February 2027</NativeSelectOption>
            </NativeSelect>
            <NativeSelect
              value={gre}
              onChange={(e) => setGre(e.target.value)}
              className="h-11 font-medium"
              aria-label="Filter by GRE policy"
            >
              <NativeSelectOption>All GRE policies</NativeSelectOption>
              <NativeSelectOption>Not required</NativeSelectOption>
              <NativeSelectOption>Optional</NativeSelectOption>
              <NativeSelectOption>Check program</NativeSelectOption>
            </NativeSelect>
            {hasFilters ? (
              <Button variant="outline" onClick={resetAll} className="h-11 font-semibold">
                <X size={16} /> Clear ({rows.length})
              </Button>
            ) : (
              <div className="hidden items-center gap-2 px-3 text-sm font-medium text-muted-foreground xl:flex">
                <SlidersHorizontal size={16} /> Filter results
              </div>
            )}
          </div>
        </div>

        {/* Results Counter & State Tag */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground text-base">{rows.length}</span>
            <span className="text-muted-foreground">of 100 programs displayed</span>
            {state !== 'All states' && (
              <Badge className="bg-[#30d7b0] text-[#071b34] font-bold hover:bg-[#30d7b0] ml-2">
                Filtered: State of {state}
              </Badge>
            )}
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Fall 2027 Cycle Verified
          </p>
        </div>

        {/* University Database Table */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#f0f5f8] hover:bg-[#f0f5f8]">
                  <Sortable label="Rank" active={sortKey === 'rank'} onClick={() => sortBy('rank')} />
                  <Sortable
                    label="University & program"
                    active={sortKey === 'university'}
                    onClick={() => sortBy('university')}
                  />
                  <TableHead>Location</TableHead>
                  <Sortable
                    label="Projected deadline"
                    active={sortKey === 'deadline'}
                    onClick={() => sortBy('deadline')}
                  />
                  <Sortable label="Fee" active={sortKey === 'fee'} onClick={() => sortBy('fee')} />
                  <TableHead>Waiver / free</TableHead>
                  <TableHead>GRE</TableHead>
                  <TableHead>IELTS Academic</TableHead>
                  <TableHead>Faculty</TableHead>
                  <TableHead className="text-right">Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((u) => (
                  <ProgramRow key={u.rank} university={u} />
                ))}
              </TableBody>
            </Table>
          </div>
          {rows.length === 0 && (
            <div className="grid min-h-52 place-items-center px-6 text-center">
              <div>
                <p className="font-bold text-lg text-[#071b34]">No programs match these filters</p>
                <p className="text-sm text-muted-foreground mt-1">Try resetting your state or query filters</p>
                <Button onClick={resetAll} className="mt-3 bg-[#071b34] text-white hover:bg-[#0b2444]">
                  Reset All Filters
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Guidance */}
        <footer className="grid gap-4 rounded-2xl border border-[#b8d6e8] bg-[#eef8fb] p-5 text-sm leading-6 text-[#24445e] md:grid-cols-2 shadow-sm">
          <p>
            <strong className="text-[#071b34]">Planning & Deadlines Guidance:</strong> Projected Fall 2027 deadlines are curated from recent application cycles. Exact dates open between August and October 2026; always consult the official institutional portal before submitting.
          </p>
          <p>
            <strong className="text-[#071b34]">PhD Funding Standard:</strong> Fully-funded offers typically provide 100% tuition coverage, individual health insurance, and a 9-to-12 month living stipend via Graduate Research Assistantships (GRA) or Teaching Assistantships (GTA).
          </p>
        </footer>
      </section>
    </main>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-24 bg-white px-4 py-3">
      <div className="text-xl font-bold tracking-tight text-[#071b34]">{value}</div>
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  )
}

function Sortable({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <TableHead>
      <button onClick={onClick} className={`inline-flex items-center gap-1.5 font-bold ${active ? 'text-[#087e6a]' : ''}`}>
        {label}
        <ArrowUpDown size={13} />
      </button>
    </TableHead>
  )
}

function ProgramRow({ university: u }: { university: University }) {
  return (
    <TableRow className="group align-top hover:bg-slate-50/70 transition-colors">
      <TableCell>
        <span className="inline-grid h-8 min-w-8 place-items-center rounded-lg bg-[#071b34] px-2 font-mono text-sm font-bold text-white shadow-xs">
          {u.rank}
        </span>
      </TableCell>
      <TableCell className="min-w-[280px]">
        <a
          href={`/faculty?university=${encodeURIComponent(u.university)}&rank=${u.rank}`}
          className="font-bold leading-5 text-[#071b34] underline decoration-[#30d7b0] decoration-2 underline-offset-4 transition-colors hover:text-[#087e6a] text-base"
        >
          {u.university}
        </a>
        <div className="mt-1 text-xs text-muted-foreground">{u.program}</div>
      </TableCell>
      <TableCell className="min-w-[130px]">
        <div className="font-medium text-sm">{u.city}</div>
        <div className="text-xs font-semibold text-muted-foreground">{u.state}</div>
      </TableCell>
      <TableCell className="min-w-[175px]">
        <div className="font-semibold text-sm">{dateFormat.format(new Date(`${u.deadline}T00:00:00Z`))}</div>
        <Badge variant="outline" className="mt-1 border-amber-300 bg-amber-50 text-amber-800 text-[11px] font-medium">
          Projected
        </Badge>
      </TableCell>
      <TableCell className="font-mono font-semibold text-sm">{money.format(u.fee)}</TableCell>
      <TableCell className="min-w-[190px]">
        <Badge
          variant="outline"
          className={
            u.feeWaiver === 'Available — eligibility based'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-800 font-medium'
              : 'font-normal text-xs'
          }
        >
          {u.feeWaiver}
        </Badge>
      </TableCell>
      <TableCell className="min-w-[125px]">
        <Badge variant="secondary" className="font-medium text-xs">
          {u.gre}
        </Badge>
      </TableCell>
      <TableCell className="min-w-[155px]">
        <span className="font-semibold text-xs">{u.ielts}</span>
        <div className="mt-0.5 text-[11px] text-muted-foreground">Exemptions may apply</div>
      </TableCell>
      <TableCell className="min-w-[130px]">
        <a
          href={`/faculty?university=${encodeURIComponent(u.university)}&rank=${u.rank}`}
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-[#087e6a] hover:bg-[#eef8fb] transition-colors"
        >
          <Users size={12} /> Faculty
        </a>
      </TableCell>
      <TableCell className="text-right">
        <a
          href={u.programUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({
            variant: 'ghost',
            size: 'sm',
            className: 'text-[#087e6a] hover:text-[#065f52] font-semibold text-xs',
          })}
          aria-label={`Open official admissions page for ${u.university}`}
        >
          Official page <ExternalLink size={13} />
        </a>
      </TableCell>
    </TableRow>
  )
}
