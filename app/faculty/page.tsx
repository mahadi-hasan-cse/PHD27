'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ExternalLink, FlaskConical, Code2, GraduationCap, Mail, Search, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { universities as programUniversities } from '../universities'

type Faculty = { name:string; university:string; universityRank:number; affiliation:string; email:string|null; personalWebsite:string|null; github:string|null; lab:string|null; googleScholar:string|null; orcid:string|null; officialDirectory:string|null; hiringStatus:string; hiringEvidence:string|null; lastChecked:string; source:string }
const PAGE_SIZE = 50

export default function FacultyPage(){
  const [faculty,setFaculty]=useState<Faculty[]>([])
  const [query,setQuery]=useState('')
  const [university,setUniversity]=useState('All universities')
  const [hiring,setHiring]=useState('All hiring statuses')
  const [page,setPage]=useState(1)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState(false)
  const universities=useMemo(()=>programUniversities.map((u)=>u.university).sort(),[])
  function loadFaculty(selected:string){
    setLoading(true);setError(false);setPage(1);setUniversity(selected)
    const rank=programUniversities.find((u)=>u.university===selected)?.rank
    const source=rank?`/faculty-data/${rank}.json`:'/faculty-data.json'
    fetch(source).then((response)=>{if(!response.ok)throw new Error('Faculty data unavailable');return response.json()}).then((records:Faculty[])=>setFaculty(records)).catch(()=>{setFaculty([]);setError(true)}).finally(()=>setLoading(false))
  }
  useEffect(()=>{const params=new URLSearchParams(window.location.search);const selected=params.get('university')||'All universities';loadFaculty(selected)},[])
  const filtered=useMemo(()=>{const q=query.trim().toLowerCase();return faculty.filter((f)=>(!q||`${f.name} ${f.university}`.toLowerCase().includes(q))&&(university==='All universities'||f.university===university)&&(hiring==='All hiring statuses'||(hiring==='Hiring confirmed'?f.hiringStatus.startsWith('Hiring'):!f.hiringStatus.startsWith('Hiring'))))},[query,university,hiring])
  const pages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE)); const safePage=Math.min(page,pages); const rows=filtered.slice((safePage-1)*PAGE_SIZE,safePage*PAGE_SIZE)
  const setFilter=(setter:(value:string)=>void)=>(value:string)=>{setter(value);setPage(1)}
  return <main className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border bg-[#071b34] text-white"><div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-4 lg:px-8"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#30d7b0] text-[#071b34]"><Users size={20}/></div><div><p className="font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-[#83a7c9]">Faculty intelligence</p><h1 className="text-lg font-semibold">CS Faculty Directory</h1></div></div><a href="/" className={buttonVariants({variant:'outline',className:'border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white'})}><ArrowLeft size={16}/> Programs</a></div></header>
    <section className="mx-auto max-w-[1500px] px-5 pb-14 pt-8 lg:px-8">
      <div className="grid gap-6 border-b border-border pb-7 lg:grid-cols-[1fr_auto] lg:items-end"><div><Badge className="mb-3 bg-[#d8f8ef] text-[#076452] hover:bg-[#d8f8ef]">Research faculty dataset</Badge><h2 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Find potential PhD advisers</h2><p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">Active research-faculty records across all 100 universities. Profiles link to public professional pages. Hiring is confirmed only when a faculty or lab page explicitly says students are being recruited.</p></div><div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border bg-border text-center"><Stat value={faculty.length.toLocaleString()} label="Faculty"/><Stat value="100" label="Universities"/><Stat value={String(faculty.filter((f)=>f.hiringStatus.startsWith('Hiring')).length)} label="Hiring confirmed"/></div></div>
      <div className="sticky top-0 z-20 -mx-2 mt-6 rounded-2xl border bg-background/95 p-3 shadow-[0_10px_32px_rgba(7,27,52,.07)] backdrop-blur"><div className="grid gap-3 md:grid-cols-3"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18}/><Input value={query} onChange={(e)=>setFilter(setQuery)(e.target.value)} placeholder="Search professor or university…" className="h-11 pl-10"/></div><NativeSelect value={university} onChange={(e)=>loadFaculty(e.target.value)} className="h-11"><NativeSelectOption>All universities</NativeSelectOption>{universities.map((u)=><NativeSelectOption key={u}>{u}</NativeSelectOption>)}</NativeSelect><NativeSelect value={hiring} onChange={(e)=>setFilter(setHiring)(e.target.value)} className="h-11"><NativeSelectOption>All hiring statuses</NativeSelectOption><NativeSelectOption>Hiring confirmed</NativeSelectOption><NativeSelectOption>Not publicly confirmed</NativeSelectOption></NativeSelect></div></div>
      <div className="mt-5 flex items-center justify-between text-sm"><p>{loading?'Loading faculty…':error?'Faculty data could not load. Please try again.':<><strong>{filtered.length.toLocaleString()}</strong> faculty records</>}</p><p className="text-muted-foreground">{loading?'Please wait':`Page ${safePage} of ${pages}`}</p></div>
      <div className="mt-3 overflow-hidden rounded-2xl border bg-card shadow-sm"><div className="overflow-x-auto"><Table><TableHeader><TableRow className="bg-[#f0f5f8] hover:bg-[#f0f5f8]"><TableHead>Professor</TableHead><TableHead>University</TableHead><TableHead>Public contact</TableHead><TableHead>Profiles</TableHead><TableHead>PhD hiring signal</TableHead><TableHead>Source</TableHead></TableRow></TableHeader><TableBody>{rows.map((f,i)=><FacultyRow key={`${f.university}-${f.name}-${i}`} faculty={f}/>)}</TableBody></Table></div></div>
      <div className="mt-5 flex items-center justify-center gap-3"><Button variant="outline" disabled={safePage<=1} onClick={()=>setPage((p)=>Math.max(1,p-1))}>Previous</Button><span className="min-w-32 text-center text-sm text-muted-foreground">{safePage} / {pages}</span><Button variant="outline" disabled={safePage>=pages} onClick={()=>setPage((p)=>Math.min(pages,p+1))}>Next</Button></div>
      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950"><strong>Evidence rule:</strong> “Not publicly confirmed” does not mean a professor is not accepting students. It means no sufficiently current, explicit recruiting statement is recorded. Contact details are limited to publicly listed professional information. Faculty coverage is based on the current CSRankings active-research-faculty dataset plus separately verified records; departmental rosters change continuously.</div>
    </section>
  </main>
}

function Stat({value,label}:{value:string;label:string}){return <div className="min-w-28 bg-white px-4 py-3"><div className="text-xl font-semibold text-[#071b34]">{value}</div><div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div></div>}
function FacultyRow({faculty:f}:{faculty:Faculty}){const hiring=f.hiringStatus.startsWith('Hiring');return <TableRow className="align-top"><TableCell className="min-w-[210px]"><div className="font-semibold text-[#071b34]">{f.name}</div><div className="mt-1 text-xs text-muted-foreground">Checked {f.lastChecked}</div></TableCell><TableCell className="min-w-[240px]"><div>{f.university}</div><div className="mt-1 text-xs text-muted-foreground">University rank #{f.universityRank}</div></TableCell><TableCell className="min-w-[210px]">{f.email?<a className="inline-flex items-center gap-1.5 text-[#087e6a] hover:underline" href={`mailto:${f.email}`}><Mail size={14}/>{f.email}</a>:<span className="text-sm text-muted-foreground">Email not publicly listed</span>}</TableCell><TableCell className="min-w-[250px]"><div className="flex flex-wrap gap-2">{f.personalWebsite&&<ProfileLink href={f.personalWebsite} icon={<ExternalLink/>} label="Website"/>}{f.github&&<ProfileLink href={f.github} icon={<Code2/>} label="GitHub"/>}{f.lab&&<ProfileLink href={f.lab} icon={<FlaskConical/>} label="Lab"/>}{f.googleScholar&&<ProfileLink href={f.googleScholar} icon={<GraduationCap/>} label="Scholar"/>}</div></TableCell><TableCell className="min-w-[220px]"><Badge className={hiring?'bg-emerald-100 text-emerald-800 hover:bg-emerald-100':'bg-slate-100 text-slate-700 hover:bg-slate-100'}>{f.hiringStatus}</Badge>{f.hiringEvidence&&<a href={f.hiringEvidence} target="_blank" rel="noopener noreferrer" className="mt-2 block text-xs font-medium text-[#087e6a] hover:underline">View hiring evidence ↗</a>}</TableCell><TableCell><a href={f.officialDirectory||f.source} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-[#087e6a] hover:underline">Official directory <ExternalLink size={13}/></a></TableCell></TableRow>}
function ProfileLink({href,icon,label}:{href:string;icon:React.ReactNode;label:string}){return <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium text-[#087e6a] hover:bg-muted">{icon}{label}</a>}



