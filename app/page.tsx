'use client'
import { useEffect, useMemo, useState } from 'react'
import { ArrowUpDown, BookOpen, CalendarDays, Download, ExternalLink, Search, SlidersHorizontal, X } from 'lucide-react'
import { universities, type University } from './universities'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

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
  const states = useMemo(() => Array.from(new Set(universities.map((u) => u.state))).sort(), [])
  useEffect(() => {
    const modelContext = (document as Document & { modelContext?: { registerTool: (tool: object, options?: { signal?: AbortSignal }) => void | Promise<void> } }).modelContext
    if (!modelContext?.registerTool) return
    const lifecycle = new AbortController()
    void Promise.resolve(modelContext.registerTool({
      name: 'filter_cs_phd_programs', title: 'Filter CS PhD programs',
      description: 'Update the visible university table using an optional search term, US state abbreviation, deadline month, or GRE policy.',
      inputSchema: { type: 'object', properties: { query: { type: 'string' }, state: { type: 'string' }, deadlineMonth: { type: 'string', enum: ['2026-12','2027-01','2027-02'] }, gre: { type: 'string', enum: ['Not required','Optional','Check program'] } }, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input: unknown) { const value = (input ?? {}) as { query?: string; state?: string; deadlineMonth?: string; gre?: string }; setQuery(value.query ?? ''); setState(value.state ?? 'All states'); setDeadline(value.deadlineMonth ?? 'All deadlines'); setGre(value.gre ?? 'All GRE policies'); return { status: 'filtered', filters: value } }
    }, { signal: lifecycle.signal })).catch(() => undefined)
    return () => lifecycle.abort()
  }, [])
  const rows = useMemo(() => {
    const term = query.trim().toLowerCase()
    return universities.filter((u) => !term || `${u.university} ${u.city} ${u.state} ${u.program}`.toLowerCase().includes(term))
      .filter((u) => state === 'All states' || u.state === state)
      .filter((u) => gre === 'All GRE policies' || u.gre === gre)
      .filter((u) => deadline === 'All deadlines' || u.deadline.slice(0, 7) === deadline)
      .sort((a, b) => { const left = a[sortKey]; const right = b[sortKey]; const result = typeof left === 'number' ? left - (right as number) : String(left).localeCompare(String(right)); return sortAsc ? result : -result })
  }, [query, state, deadline, gre, sortKey, sortAsc])
  function sortBy(key: SortKey) { if (sortKey === key) setSortAsc((value) => !value); else { setSortKey(key); setSortAsc(true) } }
  function reset() { setQuery(''); setState('All states'); setDeadline('All deadlines'); setGre('All GRE policies') }
  function exportCsv() {
    const headers = ['Rank','University','Program','City','State','Fall 2027 deadline (projected)','Application fee USD','GRE','Funding','Official reference','Notes']
    const content = [headers, ...rows.map((u) => [u.rank,u.university,u.program,u.city,u.state,u.deadline,u.fee,u.gre,u.funding,u.programUrl,u.note])].map((row) => row.map(csvCell).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'cs-phd-fall-2027.csv'; anchor.click(); URL.revokeObjectURL(url)
  }
  const hasFilters = query || state !== 'All states' || deadline !== 'All deadlines' || gre !== 'All GRE policies'
  return <main className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border bg-[#071b34] text-white"><div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-4 lg:px-8">
      <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#30d7b0] text-[#071b34]"><BookOpen size={20} strokeWidth={2.5}/></div><div><p className="font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-[#83a7c9]">Application intelligence</p><h1 className="text-lg font-semibold tracking-tight">CS PhD 100</h1></div></div>
      <Button onClick={exportCsv} className="bg-white text-[#071b34] hover:bg-[#e9f2f8]"><Download size={16}/> Export CSV</Button>
    </div></header>
    <section className="mx-auto max-w-[1500px] px-5 pb-14 pt-8 lg:px-8">
      <div className="grid gap-5 border-b border-border pb-7 lg:grid-cols-[1fr_auto] lg:items-end"><div><div className="mb-3 flex items-center gap-2 text-sm font-medium text-[#087e6a]"><CalendarDays size={16}/> Fall 2027 planning edition</div><h2 className="max-w-3xl text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-4xl">US Computer Science PhD application database</h2><p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">100 leading programs in one sortable workspace. Fall 2027 dates are planning estimates until each school publishes its cycle; use the official link in every row before submitting.</p></div>
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border bg-border text-center shadow-sm"><Stat value="100" label="Programs"/><Stat value={`${states.length}`} label="States + DC"/><Stat value={money.format(Math.round(universities.reduce((sum,u)=>sum+u.fee,0)/universities.length))} label="Avg. fee"/></div></div>
      <div className="sticky top-0 z-20 -mx-2 mt-6 rounded-2xl border border-border bg-background/95 p-3 shadow-[0_10px_32px_rgba(7,27,52,0.07)] backdrop-blur"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(280px,1fr)_180px_200px_190px_auto]">
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18}/><Input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search university, city, state…" className="h-11 pl-10" aria-label="Search programs"/></div>
        <NativeSelect value={state} onChange={(e)=>setState(e.target.value)} className="h-11" aria-label="Filter by state"><NativeSelectOption>All states</NativeSelectOption>{states.map((item)=><NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect>
        <NativeSelect value={deadline} onChange={(e)=>setDeadline(e.target.value)} className="h-11" aria-label="Filter by deadline"><NativeSelectOption>All deadlines</NativeSelectOption><NativeSelectOption value="2026-12">December 2026</NativeSelectOption><NativeSelectOption value="2027-01">January 2027</NativeSelectOption><NativeSelectOption value="2027-02">February 2027</NativeSelectOption></NativeSelect>
        <NativeSelect value={gre} onChange={(e)=>setGre(e.target.value)} className="h-11" aria-label="Filter by GRE policy"><NativeSelectOption>All GRE policies</NativeSelectOption><NativeSelectOption>Not required</NativeSelectOption><NativeSelectOption>Optional</NativeSelectOption><NativeSelectOption>Check program</NativeSelectOption></NativeSelect>
        {hasFilters?<Button variant="outline" onClick={reset} className="h-11"><X size={16}/> Clear</Button>:<div className="hidden items-center gap-2 px-3 text-sm text-muted-foreground xl:flex"><SlidersHorizontal size={16}/> Filter results</div>}
      </div></div>
      <div className="mt-5 flex items-center justify-between"><p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">{rows.length}</span> of 100 programs</p><p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Updated Sep 4, 2026</p></div>
      <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card shadow-sm"><div className="overflow-x-auto"><Table><TableHeader><TableRow className="bg-[#f0f5f8] hover:bg-[#f0f5f8]"><Sortable label="Rank" active={sortKey==='rank'} onClick={()=>sortBy('rank')}/><Sortable label="University & program" active={sortKey==='university'} onClick={()=>sortBy('university')}/><TableHead>Location</TableHead><Sortable label="Projected deadline" active={sortKey==='deadline'} onClick={()=>sortBy('deadline')}/><Sortable label="Fee" active={sortKey==='fee'} onClick={()=>sortBy('fee')}/><TableHead>GRE</TableHead><TableHead>Funding</TableHead><TableHead className="text-right">Reference</TableHead></TableRow></TableHeader><TableBody>{rows.map((u)=><ProgramRow key={u.rank} university={u}/>)}</TableBody></Table></div>{rows.length===0&&<div className="grid min-h-52 place-items-center px-6 text-center"><div><p className="font-semibold">No programs match these filters</p><button onClick={reset} className="mt-2 text-sm font-medium text-[#087e6a] underline underline-offset-4">Clear all filters</button></div></div>}</div>
      <footer className="mt-6 grid gap-4 rounded-2xl border border-[#b8d6e8] bg-[#eef8fb] p-5 text-sm leading-6 text-[#24445e] md:grid-cols-2"><p><strong className="text-[#071b34]">Use this as a planning database.</strong> Rankings are an editorial seed list for discovery, not an official ranking product. Deadlines and fees can change by cycle, citizenship, or graduate school policy.</p><p><strong className="text-[#071b34]">Funding note.</strong> Most research PhD offers include tuition support and a stipend, but the form, duration, summer coverage, and health insurance vary. Confirm details in the written offer.</p></footer>
    </section>
  </main>
}
function Stat({value,label}:{value:string;label:string}){return <div className="min-w-24 bg-white px-4 py-3"><div className="text-xl font-semibold tracking-tight text-[#071b34]">{value}</div><div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div></div>}
function Sortable({label,active,onClick}:{label:string;active:boolean;onClick:()=>void}){return <TableHead><button onClick={onClick} className={`inline-flex items-center gap-1.5 font-semibold ${active?'text-[#087e6a]':''}`}>{label}<ArrowUpDown size={13}/></button></TableHead>}
function ProgramRow({university:u}:{university:University}){return <TableRow className="group align-top"><TableCell><span className="inline-grid h-8 min-w-8 place-items-center rounded-lg bg-[#071b34] px-2 font-mono text-sm font-semibold text-white">{u.rank}</span></TableCell><TableCell className="min-w-[290px]"><div className="font-semibold leading-5 text-[#071b34]">{u.university}</div><div className="mt-1 text-sm text-muted-foreground">{u.program}</div></TableCell><TableCell className="min-w-[130px]"><div>{u.city}</div><div className="text-sm text-muted-foreground">{u.state}</div></TableCell><TableCell className="min-w-[175px]"><div className="font-medium">{dateFormat.format(new Date(`${u.deadline}T00:00:00Z`))}</div><Badge variant="outline" className="mt-1 border-amber-300 bg-amber-50 text-amber-800">Projected</Badge></TableCell><TableCell className="font-mono font-medium">{money.format(u.fee)}</TableCell><TableCell className="min-w-[125px]"><Badge variant="secondary" className="font-normal">{u.gre}</Badge></TableCell><TableCell className="min-w-[220px] text-sm leading-5 text-muted-foreground">Typical funded PhD offer; verify guarantee.</TableCell><TableCell className="text-right"><Button asChild variant="ghost" size="sm" className="text-[#087e6a] hover:text-[#065f52]"><a href={u.programUrl} target="_blank" rel="noreferrer" aria-label={`Open official page for ${u.university}`}>Official page <ExternalLink size={14}/></a></Button></TableCell></TableRow>}
