'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ExternalLink, FlaskConical, Code2, GraduationCap, Mail, Search, Users, DollarSign } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { universities as programUniversities } from '../universities'

export type Faculty = {
  name: string
  university: string
  universityRank: number
  affiliation: string
  email: string | null
  personalWebsite: string | null
  github: string | null
  lab: string | null
  labName?: string | null
  googleScholar: string | null
  orcid: string | null
  officialDirectory: string | null
  hiringStatus: string
  hiringEvidence: string | null
  specificFund?: string | null
  fundingStatus?: string | null
  lastChecked: string
  source: string
}

const PAGE_SIZE = 50

export default function FacultyPage() {
  const [faculty, setFaculty] = useState<Faculty[]>([])
  const [query, setQuery] = useState('')
  const [university, setUniversity] = useState('All universities')
  const [hiring, setHiring] = useState('All hiring statuses')
  const [funding, setFunding] = useState('All funding types')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const universities = useMemo(() => programUniversities.map((u) => u.university).sort(), [])

  function loadFaculty(selected: string) {
    setLoading(true)
    setError(false)
    setPage(1)
    setUniversity(selected)
    const rank = programUniversities.find((u) => u.university === selected)?.rank
    const source = rank ? `/faculty-data/${rank}.json` : '/faculty-data.json'
    fetch(source)
      .then((response) => {
        if (!response.ok) throw new Error('Faculty data unavailable')
        return response.json() as Promise<Faculty[]>
      })
      .then((records) => setFaculty(records))
      .catch(() => {
        setFaculty([])
        setError(true)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const selected = params.get('university') || 'All universities'
    loadFaculty(selected)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return faculty
      .filter((f) => {
        if (!q) return true
        const searchCorpus = `${f.name} ${f.university} ${f.labName || ''} ${f.specificFund || ''} ${f.email || ''}`.toLowerCase()
        return searchCorpus.includes(q)
      })
      .filter((f) => university === 'All universities' || f.university === university)
      .filter((f) => {
        if (hiring === 'All hiring statuses') return true
        if (hiring === 'Hiring Confirmed') return f.hiringStatus.startsWith('Hiring')
        return !f.hiringStatus.startsWith('Hiring')
      })
      .filter((f) => {
        if (funding === 'All funding types') return true
        if (funding === 'Active Grant (RA Funded)') return f.fundingStatus?.includes('Active Grant') || f.specificFund?.includes('NSF') || f.specificFund?.includes('DARPA')
        return !f.fundingStatus?.includes('Active Grant')
      })
  }, [query, university, hiring, funding, faculty])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pages)
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const setFilter = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    setPage(1)
  }

  const hiringCount = faculty.filter((f) => f.hiringStatus.startsWith('Hiring')).length
  const fundedCount = faculty.filter((f) => f.fundingStatus?.includes('Active Grant')).length

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-[#071b34] text-white">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#30d7b0] text-[#071b34]">
              <Users size={20} />
            </div>
            <div>
              <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-[#83a7c9]">
                Faculty Intelligence
              </p>
              <h1 className="text-lg font-semibold">CS Faculty & Lab Directory</h1>
            </div>
          </div>
          <a
            href="/"
            className={buttonVariants({
              variant: 'outline',
              className: 'border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white',
            })}
          >
            <ArrowLeft size={16} /> Programs Database
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-[1600px] px-5 pb-14 pt-8 lg:px-8">
        <div className="grid gap-6 border-b border-border pb-7 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <Badge className="mb-3 bg-[#d8f8ef] text-[#076452] hover:bg-[#d8f8ef]">
              Comprehensive Research Faculty & Lab Dataset
            </Badge>
            <h2 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              Find Potential PhD Advisers, Labs & Funding
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
              Search professors across top 100 US Computer Science PhD programs. Discover academic emails, active lab names, Fall 2027 PhD recruitment signals, and specific research grant availability (NSF, DARPA, Industry AI awards).
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px overflow-hidden rounded-xl border bg-border text-center shadow-sm">
            <Stat value={faculty.length.toLocaleString()} label="Total Faculty" />
            <Stat value="100" label="Universities" />
            <Stat value={hiringCount.toLocaleString()} label="Hiring Confirmed" />
            <Stat value={fundedCount.toLocaleString()} label="Funded Grants (RA)" />
          </div>
        </div>

        <div className="sticky top-0 z-20 -mx-2 mt-6 rounded-2xl border bg-background/95 p-3 shadow-[0_10px_32px_rgba(7,27,52,.07)] backdrop-blur">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                value={query}
                onChange={(e) => setFilter(setQuery)(e.target.value)}
                placeholder="Search professor, lab, grant, email…"
                className="h-11 pl-10"
                aria-label="Search faculty"
              />
            </div>
            <NativeSelect
              value={university}
              onChange={(e) => loadFaculty(e.target.value)}
              className="h-11"
              aria-label="Filter by university"
            >
              <NativeSelectOption>All universities</NativeSelectOption>
              {universities.map((u) => (
                <NativeSelectOption key={u}>{u}</NativeSelectOption>
              ))}
            </NativeSelect>
            <NativeSelect
              value={hiring}
              onChange={(e) => setFilter(setHiring)(e.target.value)}
              className="h-11"
              aria-label="Filter by hiring status"
            >
              <NativeSelectOption>All hiring statuses</NativeSelectOption>
              <NativeSelectOption value="Hiring Confirmed">Hiring Confirmed (Fall 2027)</NativeSelectOption>
              <NativeSelectOption value="Not Publicly Stated">Not Publicly Stated</NativeSelectOption>
            </NativeSelect>
            <NativeSelect
              value={funding}
              onChange={(e) => setFilter(setFunding)(e.target.value)}
              className="h-11"
              aria-label="Filter by funding type"
            >
              <NativeSelectOption>All funding types</NativeSelectOption>
              <NativeSelectOption value="Active Grant (RA Funded)">Active Research Grant (RA Funded)</NativeSelectOption>
              <NativeSelectOption value="Standard Department Guarantee">Standard Department Guarantee</NativeSelectOption>
            </NativeSelect>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between text-sm">
          <p>
            {loading ? (
              'Loading faculty records…'
            ) : error ? (
              'Faculty data could not load. Please try again.'
            ) : (
              <>
                <strong>{filtered.length.toLocaleString()}</strong> faculty records match your criteria
              </>
            )}
          </p>
          <p className="text-muted-foreground">{loading ? 'Please wait' : `Page ${safePage} of ${pages}`}</p>
        </div>

        <div className="mt-3 overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#f0f5f8] hover:bg-[#f0f5f8]">
                  <TableHead className="w-[200px]">Professor</TableHead>
                  <TableHead className="w-[180px]">University</TableHead>
                  <TableHead className="w-[220px]">Lab / Research Group</TableHead>
                  <TableHead className="w-[210px]">Academic Email</TableHead>
                  <TableHead className="w-[180px]">PhD Hiring Status</TableHead>
                  <TableHead className="w-[240px]">Specific Funding / Grants</TableHead>
                  <TableHead className="w-[170px] text-right">Profiles & Links</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((f, i) => (
                  <FacultyRow key={`${f.university}-${f.name}-${i}`} faculty={f} />
                ))}
              </TableBody>
            </Table>
          </div>
          {rows.length === 0 && !loading && (
            <div className="grid min-h-48 place-items-center px-6 text-center">
              <div>
                <p className="font-semibold text-lg text-[#071b34]">No faculty records match these filters</p>
                <p className="mt-1 text-sm text-muted-foreground">Try clearing your search term or choosing "All universities"</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuery('')
                    setUniversity('All universities')
                    setHiring('All hiring statuses')
                    setFunding('All funding types')
                    loadFaculty('All universities')
                  }}
                  className="mt-4 text-sm font-medium"
                >
                  Reset all filters
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-center gap-3">
          <Button variant="outline" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Previous
          </Button>
          <span className="min-w-32 text-center text-sm font-medium text-muted-foreground">
            {safePage} / {pages}
          </span>
          <Button variant="outline" disabled={safePage >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>
            Next
          </Button>
        </div>

        <div className="mt-6 rounded-2xl border border-[#b8d6e8] bg-[#eef8fb] p-5 text-sm leading-6 text-[#24445e]">
          <h3 className="font-bold text-[#071b34] mb-1 flex items-center gap-2">
            <DollarSign size={16} className="text-[#087e6a]" /> Admissions, Hiring & Funding Policy
          </h3>
          <p>
            <strong>Evidence & Funding standard:</strong> PhD admission in US Computer Science typically includes full tuition remission and a monthly living stipend funded by Research Assistantships (RA), Teaching Assistantships (TA), or department fellowships. "Hiring Confirmed" indicates faculty with explicit recruitment notices or active grant capacity for Fall 2027. Contact details reflect official institutional directory listings.
          </p>
        </div>
      </section>
    </main>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-white px-4 py-3">
      <div className="text-xl font-bold tracking-tight text-[#071b34]">{value}</div>
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  )
}

function FacultyRow({ faculty: f }: { faculty: Faculty }) {
  const hiring = f.hiringStatus.startsWith('Hiring')
  const hasActiveGrant = f.fundingStatus?.includes('Active Grant') || f.specificFund?.includes('NSF') || f.specificFund?.includes('DARPA')

  return (
    <TableRow className="align-top hover:bg-slate-50/70 transition-colors">
      <TableCell className="min-w-[200px]">
        <div className="font-semibold text-[#071b34] text-base">{f.name}</div>
        <div className="mt-1 text-xs text-muted-foreground">Verified {f.lastChecked}</div>
      </TableCell>
      <TableCell className="min-w-[180px]">
        <div className="font-medium">{f.university}</div>
        <Badge variant="outline" className="mt-1 border-slate-300 font-mono text-xs">
          Rank #{f.universityRank}
        </Badge>
      </TableCell>
      <TableCell className="min-w-[220px]">
        <div className="flex items-start gap-1.5">
          <FlaskConical size={15} className="text-[#087e6a] mt-0.5 shrink-0" />
          <div>
            {f.lab ? (
              <a
                href={f.lab}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[#071b34] underline decoration-[#30d7b0] decoration-2 underline-offset-2 hover:text-[#087e6a] transition-colors"
              >
                {f.labName || `${f.name} Lab`}
              </a>
            ) : (
              <span className="font-medium text-[#071b34]">{f.labName || `${f.university} CS Lab`}</span>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="min-w-[210px]">
        {f.email ? (
          <a
            className="inline-flex items-center gap-1.5 font-mono text-xs font-medium text-[#087e6a] hover:underline bg-[#eef8fb] px-2 py-1 rounded-md border border-[#cbe4f2]"
            href={`mailto:${f.email}`}
            title={`Send email to ${f.email}`}
          >
            <Mail size={13} className="shrink-0" />
            {f.email}
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">Listed via directory</span>
        )}
      </TableCell>
      <TableCell className="min-w-[180px]">
        <Badge
          className={
            hiring
              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 font-medium'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-100 border border-slate-200 font-normal'
          }
        >
          {f.hiringStatus}
        </Badge>
        {f.hiringEvidence && (
          <a
            href={f.hiringEvidence}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 block text-xs font-medium text-[#087e6a] hover:underline"
          >
            Hiring note / source ↗
          </a>
        )}
      </TableCell>
      <TableCell className="min-w-[240px]">
        <Badge
          variant="outline"
          className={
            hasActiveGrant
              ? 'border-blue-300 bg-blue-50 text-blue-800 text-xs font-medium'
              : 'border-slate-200 bg-slate-50 text-slate-700 text-xs'
          }
        >
          {f.fundingStatus || 'Standard Guarantee'}
        </Badge>
        {f.specificFund && (
          <div className="mt-1 text-xs text-muted-foreground leading-snug">
            {f.specificFund}
          </div>
        )}
      </TableCell>
      <TableCell className="min-w-[170px] text-right">
        <div className="flex flex-wrap justify-end gap-1.5">
          {f.personalWebsite && <ProfileLink href={f.personalWebsite} icon={<ExternalLink size={12} />} label="Web" />}
          {f.googleScholar && <ProfileLink href={f.googleScholar} icon={<GraduationCap size={12} />} label="Scholar" />}
          {f.github && <ProfileLink href={f.github} icon={<Code2 size={12} />} label="GitHub" />}
          {f.officialDirectory && (
            <ProfileLink href={f.officialDirectory} icon={<ExternalLink size={12} />} label="Directory" />
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}

function ProfileLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-1.5 py-0.5 text-[11px] font-medium text-[#087e6a] hover:bg-slate-100 hover:text-[#065f52] transition-colors"
    >
      {icon}
      {label}
    </a>
  )
}
