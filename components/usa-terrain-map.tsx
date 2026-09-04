'use client'

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { universities, type University } from '@/app/universities'
import { UNIVERSITY_COORDINATES, ALL_STATE_CENTROIDS_GPS } from '@/lib/university-coordinates'
import { STATE_NAMES } from '@/lib/usa-map-data'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Calendar,
  DollarSign,
  ExternalLink,
  MapPin,
  Sparkles,
  Trophy,
  Users
} from 'lucide-react'

interface UsaTerrainMapProps {
  selectedState: string
  onSelectState: (stateCode: string) => void
  onResetAll: () => void
}

const dateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

type TileLayerKey = 'topo' | 'satellite' | 'carto' | 'natgeo'

const TILE_LAYERS: Record<TileLayerKey, { name: string; url: string; attribution: string; maxZoom: number }> = {
  topo: {
    name: 'Topographic Terrain',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Esri, USGS, DeLorme, TomTom, Intermap, NPS, NRCAN',
    maxZoom: 18,
  },
  satellite: {
    name: 'Satellite Hybrid',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye',
    maxZoom: 18,
  },
  carto: {
    name: 'Carto Voyager',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    maxZoom: 19,
  },
  natgeo: {
    name: 'Physical Shaded Relief',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; US National Park Service',
    maxZoom: 8,
  },
}

const STATE_NAME_TO_CODE = Object.entries(STATE_NAMES).reduce<Record<string, string>>((acc, [code, name]) => {
  acc[name.toLowerCase()] = code
  return acc
}, {})

export function UsaTerrainMap({ selectedState, onSelectState, onResetAll }: UsaTerrainMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const geoJsonLayerRef = useRef<any>(null)
  const markersLayerRef = useRef<any>(null)
  const stateLabelsLayerRef = useRef<any>(null)
  const currentTileLayerRef = useRef<any>(null)
  const geoJsonDataRef = useRef<any>(null)
  const stateLayersMapRef = useRef<Map<string, any>>(new Map())

  const [activeLayer, setActiveLayer] = useState<TileLayerKey>('topo')
  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null)
  const [isMapReady, setIsMapReady] = useState(false)

  // Group universities by state
  const universitiesByState = useMemo(() => {
    const map = new Map<string, University[]>()
    for (const u of universities) {
      const list = map.get(u.state) || []
      list.push(u)
      map.set(u.state, list)
    }
    return map
  }, [])

  // Top state hubs
  const topStates = useMemo(() => {
    const list = Array.from(universitiesByState.entries()).map(([code, list]) => ({
      code,
      name: STATE_NAMES[code] || code,
      count: list.length,
    }))
    list.sort((a, b) => b.count - a.count)
    return list.slice(0, 8)
  }, [universitiesByState])

  // Active state programs
  const activePrograms =
    selectedState !== 'All states'
      ? universitiesByState.get(selectedState) || []
      : selectedUniversity
      ? [selectedUniversity]
      : universities.slice(0, 8)

  // Helper to compute state polygon style
  const getStateStyle = useCallback((stateCode: string, isSelected: boolean) => {
    const count = (universitiesByState.get(stateCode) || []).length
    if (isSelected) {
      return {
        color: '#30d7b0',
        weight: 3.5,
        opacity: 1,
        fillColor: '#30d7b0',
        fillOpacity: 0.32,
      }
    }
    if (count > 0) {
      return {
        color: '#163a5f',
        weight: 2,
        opacity: 0.9,
        fillColor: count >= 5 ? '#0b6477' : '#178096',
        fillOpacity: 0.14,
      }
    }
    return {
      color: '#334155',
      weight: 1.2,
      opacity: 0.5,
      fillColor: '#000000',
      fillOpacity: 0.02,
    }
  }, [universitiesByState])

  // Fetch GeoJSON once
  useEffect(() => {
    fetch('/us-states.json')
      .then((res) => res.json())
      .then((data) => {
        geoJsonDataRef.current = data
      })
      .catch(() => undefined)
  }, [])

  // Initialize Leaflet Map with Canvas GPU Acceleration & Smooth Motion
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return

    let isMounted = true

    async function initLeaflet() {
      const L = await import('leaflet')

      if (!isMounted || !mapContainerRef.current) return

      if (!mapInstanceRef.current) {
        // High-performance canvas renderer for 60fps smooth zooming
        const canvasRenderer = L.canvas({ padding: 0.5, tolerance: 6 })

        // Initialize Map with smooth momentum zoom and animation parameters
        const map = L.map(mapContainerRef.current, {
          center: [38.5, -96.5],
          zoom: 4,
          minZoom: 3,
          maxZoom: 16,
          zoomControl: false,
          preferCanvas: true,
          zoomAnimation: true,
          fadeAnimation: true,
          markerZoomAnimation: true,
          zoomSnap: 0.5,
          zoomDelta: 0.5,
          wheelPxPerZoomLevel: 80,
          wheelDebounceTime: 20,
          renderer: canvasRenderer,
        })

        // Custom zoom control in bottom-right
        L.control.zoom({ position: 'bottomright' }).addTo(map)

        // Add base tile layer
        const baseLayerConfig = TILE_LAYERS[activeLayer]
        const tileLayer = L.tileLayer(baseLayerConfig.url, {
          attribution: baseLayerConfig.attribution,
          maxZoom: baseLayerConfig.maxZoom,
          subdomains: 'abcd',
          updateWhenZooming: false,
          updateWhenIdle: true,
          keepBuffer: 4,
        }).addTo(map)
        currentTileLayerRef.current = tileLayer

        // Layer groups
        const geoLayer = L.layerGroup().addTo(map)
        const labelsLayer = L.layerGroup().addTo(map)
        const markersGroup = L.layerGroup().addTo(map)

        geoJsonLayerRef.current = geoLayer
        stateLabelsLayerRef.current = labelsLayer
        markersLayerRef.current = markersGroup

        mapInstanceRef.current = map
        setIsMapReady(true)
      }
    }

    initLeaflet()

    return () => {
      isMounted = false
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Switch Tile Layer
  useEffect(() => {
    if (!mapInstanceRef.current) return
    import('leaflet').then((L) => {
      if (currentTileLayerRef.current) {
        mapInstanceRef.current.removeLayer(currentTileLayerRef.current)
      }
      const config = TILE_LAYERS[activeLayer]
      const newLayer = L.tileLayer(config.url, {
        attribution: config.attribution,
        maxZoom: config.maxZoom,
        subdomains: 'abcd',
        updateWhenZooming: false,
        updateWhenIdle: true,
        keepBuffer: 4,
      }).addTo(mapInstanceRef.current)
      currentTileLayerRef.current = newLayer
      newLayer.bringToBack()
    })
  }, [activeLayer])

  // Setup GeoJSON Boundaries & Centroid Labels Once (Canvas-rendered)
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady || !geoJsonDataRef.current) return

    import('leaflet').then((L) => {
      const geoLayer = geoJsonLayerRef.current
      const labelsLayer = stateLabelsLayerRef.current
      if (!geoLayer || !labelsLayer) return

      geoLayer.clearLayers()
      labelsLayer.clearLayers()
      stateLayersMapRef.current.clear()

      // Render GeoJSON State Boundaries
      const geojson = L.geoJSON(geoJsonDataRef.current, {
        style: (feature: any) => {
          const stateName = feature?.properties?.name || ''
          const stateCode = STATE_NAME_TO_CODE[stateName.toLowerCase()] || ''
          return getStateStyle(stateCode, selectedState === stateCode)
        },
        onEachFeature: (feature: any, layer: any) => {
          const stateName = feature?.properties?.name || ''
          const stateCode = STATE_NAME_TO_CODE[stateName.toLowerCase()] || ''
          const count = (universitiesByState.get(stateCode) || []).length

          stateLayersMapRef.current.set(stateCode, layer)

          layer.on({
            mouseover: () => {
              if (selectedState !== stateCode) {
                layer.setStyle({
                  color: '#087e6a',
                  weight: 3,
                  opacity: 1,
                  fillColor: '#087e6a',
                  fillOpacity: 0.22,
                })
              }
            },
            mouseout: () => {
              if (selectedState !== stateCode) {
                layer.setStyle(getStateStyle(stateCode, false))
              }
            },
            click: () => {
              if (count > 0) {
                onSelectState(stateCode)
              }
            },
          })

          if (count > 0) {
            layer.bindTooltip(
              `<div style="font-family: inherit; font-size: 12px; font-weight: bold; color: #071b34;">
                ${stateName} (${stateCode})
                <div style="font-size: 11px; font-weight: 600; color: #087e6a;">${count} CS PhD Programs</div>
              </div>`,
              { sticky: true, opacity: 0.95 }
            )
          }
        },
      })

      geoLayer.addLayer(geojson)

      // Render State Name Labels at Centroids
      Object.entries(ALL_STATE_CENTROIDS_GPS).forEach(([code, data]) => {
        const count = (universitiesByState.get(code) || []).length
        const isSelected = selectedState === code

        const labelHtml = `
          <div class="pointer-events-none select-none flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2 will-change-transform">
            <div class="px-2 py-0.5 rounded-md border shadow-md flex items-center gap-1 transition-all duration-150 ${
              isSelected
                ? 'bg-[#30d7b0] border-white text-[#071b34] scale-110 font-bold ring-2 ring-[#30d7b0]/50'
                : count > 0
                ? 'bg-[#071b34]/90 border-[#30d7b0]/60 text-white backdrop-blur-xs'
                : 'bg-black/40 border-white/20 text-[#cbd5e1] text-[10px]'
            }">
              <span class="font-extrabold tracking-wider text-[11px] font-sans">
                ${data.name.toUpperCase()}
              </span>
              ${
                count > 0
                  ? `<span class="px-1 py-0.2 rounded text-[10px] font-mono font-bold ${
                      isSelected ? 'bg-[#071b34] text-[#30d7b0]' : 'bg-[#30d7b0] text-[#071b34]'
                    }">${count}</span>`
                  : ''
              }
            </div>
          </div>
        `

        const labelIcon = L.divIcon({
          className: 'custom-state-label',
          html: labelHtml,
          iconSize: [120, 24],
          iconAnchor: [60, 12],
        })

        const labelMarker = L.marker([data.lat, data.lng], {
          icon: labelIcon,
          interactive: false,
        })

        labelsLayer.addLayer(labelMarker)
      })
    })
  }, [isMapReady, universitiesByState, getStateStyle, onSelectState])

  // Update State Polygon Styles on State Selection without re-building layers
  useEffect(() => {
    stateLayersMapRef.current.forEach((layer, code) => {
      layer.setStyle(getStateStyle(code, selectedState === code))
    })
  }, [selectedState, getStateStyle])

  // Render University Rank Pins
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady) return

    import('leaflet').then((L) => {
      const map = mapInstanceRef.current
      const markersGroup = markersLayerRef.current
      if (!markersGroup) return

      markersGroup.clearLayers()

      universities.forEach((u) => {
        const coords = UNIVERSITY_COORDINATES[u.university]
        if (!coords) return

        const isSelectedState = selectedState === u.state
        const isSelectedUni = selectedUniversity?.rank === u.rank

        const iconHtml = `
          <div class="relative group cursor-pointer will-change-transform" style="transform: translate(-50%, -100%);">
            <div class="relative flex items-center justify-center">
              ${
                isSelectedState || isSelectedUni
                  ? `<div class="absolute -inset-2.5 rounded-full bg-[#30d7b0]/60 animate-ping"></div>`
                  : ''
              }
              <div class="relative flex items-center justify-center h-7 min-w-7 px-1.5 rounded-full border-2 shadow-lg transition-transform duration-150 hover:scale-125 ${
                isSelectedUni
                  ? 'bg-[#30d7b0] border-white text-[#071b34] ring-4 ring-[#30d7b0]/40 z-50 scale-110'
                  : isSelectedState
                  ? 'bg-[#087e6a] border-white text-white z-40'
                  : 'bg-[#071b34] border-[#30d7b0] text-white hover:bg-[#087e6a]'
              }">
                <span class="font-mono text-[10px] font-extrabold leading-none">#${u.rank}</span>
              </div>
            </div>
            <div class="w-1.5 h-1.5 mx-auto bg-[#071b34] rotate-45 -mt-0.5 border-r border-b border-[#30d7b0]"></div>
          </div>
        `

        const customIcon = L.divIcon({
          className: 'custom-university-pin',
          html: iconHtml,
          iconSize: [28, 36],
          iconAnchor: [14, 36],
          popupAnchor: [0, -36],
        })

        const marker = L.marker(coords, { icon: customIcon })

        const popupHtml = `
          <div style="font-family: inherit; min-width: 270px; max-width: 320px; padding: 4px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
              <span style="background: #071b34; color: #30d7b0; font-size: 11px; font-weight: bold; font-family: monospace; padding: 2px 8px; border-radius: 6px;">
                RANK #${u.rank}
              </span>
              <span style="font-size: 11px; color: #475569; font-weight: 700;">
                ${u.city}, ${u.state}
              </span>
            </div>
            
            <h3 style="font-size: 15px; font-weight: bold; color: #0f172a; margin: 0 0 4px 0; line-height: 1.3;">
              ${u.university}
            </h3>
            
            <p style="font-size: 12px; color: #64748b; margin: 0 0 10px 0;">
              ${u.program}
            </p>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; margin-bottom: 10px; font-size: 11px; line-height: 1.5;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: #64748b;">Projected Deadline:</span>
                <strong style="color: #087e6a;">${dateFormat.format(new Date(`${u.deadline}T00:00:00Z`))}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: #64748b;">App Fee:</span>
                <strong>${money.format(u.fee)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">GRE Requirement:</span>
                <span style="color: #0284c7; font-weight: 600;">${u.gre}</span>
              </div>
            </div>

            <div style="display: flex; gap: 6px; margin-top: 8px;">
              <a href="${u.programUrl}" target="_blank" rel="noopener noreferrer" style="flex: 1; text-align: center; background: #071b34; color: white; text-decoration: none; padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: bold;">
                Admissions ↗
              </a>
              <a href="/faculty?university=${encodeURIComponent(u.university)}&rank=${u.rank}" style="flex: 1; text-align: center; background: #eef8fb; border: 1px solid #b8d6e8; color: #087e6a; text-decoration: none; padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: bold;">
                Faculty 👥
              </a>
            </div>
          </div>
        `

        marker.bindPopup(popupHtml, {
          closeButton: true,
          className: 'custom-map-popup',
        })

        marker.on('click', () => {
          setSelectedUniversity(u)
          onSelectState(u.state)
        })

        markersGroup.addLayer(marker)
      })

      if (selectedState !== 'All states') {
        const stateCentroid = ALL_STATE_CENTROIDS_GPS[selectedState]
        if (stateCentroid) {
          map.flyTo([stateCentroid.lat, stateCentroid.lng], 6.5, { duration: 0.8, easeLinearity: 0.25 })
        }
      }
    })
  }, [selectedState, selectedUniversity, isMapReady, onSelectState])

  // Reset View to full USA smoothly
  function handleResetView() {
    setSelectedUniversity(null)
    onResetAll()
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([38.5, -96.5], 4, { duration: 0.8, easeLinearity: 0.25 })
    }
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#163a5f] bg-[#071b34] text-white shadow-2xl">
      {/* Top Header Controls */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 p-5 lg:px-7">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-[#30d7b0] animate-pulse" />
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-[#30d7b0]">
              Physical Topographic & Geographic Explorer
            </p>
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl text-white">
            USA Computer Science PhD Map
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[#a5c4df] max-w-2xl">
            Smooth GPU-accelerated terrain map with state borders, state name labels, 100 ranking pins, and projected Fall 2027 deadlines.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Layer Selector */}
          <div className="flex rounded-xl bg-black/40 p-1 border border-white/10">
            {(Object.keys(TILE_LAYERS) as TileLayerKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setActiveLayer(key)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                  activeLayer === key
                    ? 'bg-[#30d7b0] text-[#071b34] shadow-sm'
                    : 'text-[#83a7c9] hover:text-white'
                }`}
              >
                {TILE_LAYERS[key].name}
              </button>
            ))}
          </div>

          <Button
            onClick={handleResetView}
            className={`font-semibold text-xs sm:text-sm transition-all ${
              selectedState === 'All states' && !selectedUniversity
                ? 'bg-[#30d7b0] text-[#071b34] shadow-[0_0_20px_rgba(48,215,176,0.35)] hover:bg-[#25c49f]'
                : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
            }`}
          >
            <Sparkles size={15} /> All 100 USA
          </Button>
        </div>
      </div>

      {/* Top States Quick Hub Chips */}
      <div className="relative z-10 flex flex-wrap items-center gap-1.5 border-b border-white/10 bg-black/20 px-5 py-2.5 lg:px-7">
        <span className="text-xs font-semibold text-[#83a7c9] mr-1 flex items-center gap-1">
          <Trophy size={13} className="text-[#30d7b0]" /> Regional Hubs:
        </span>
        {topStates.map((st) => {
          const isSelected = selectedState === st.code
          return (
            <button
              key={st.code}
              onClick={() => {
                setSelectedUniversity(null)
                onSelectState(st.code)
              }}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-all ${
                isSelected
                  ? 'bg-[#30d7b0] text-[#071b34] font-bold shadow-sm scale-105'
                  : 'bg-white/10 text-[#d0e5f5] hover:bg-white/20 hover:text-white border border-white/10'
              }`}
            >
              <span>{st.name}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                  isSelected ? 'bg-[#071b34] text-[#30d7b0]' : 'bg-black/40 text-white/90'
                }`}
              >
                {st.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Map + Side Inspector Split View */}
      <div className="grid lg:grid-cols-[1fr_370px] xl:grid-cols-[1fr_410px]">
        {/* Leaflet Physical Map Container */}
        <div className="relative w-full h-[540px] lg:h-[620px] bg-[#071b34]">
          <div ref={mapContainerRef} className="w-full h-full z-0 will-change-transform" />

          {/* Map Overlay Badge */}
          <div className="absolute top-4 left-4 z-10 rounded-xl bg-[#071b34]/95 p-2.5 text-xs backdrop-blur-md border border-white/15 shadow-xl text-white pointer-events-none">
            <div className="flex items-center gap-1.5 font-bold text-[#30d7b0]">
              <MapPin size={13} />
              {selectedState !== 'All states'
                ? `Filtered: ${STATE_NAMES[selectedState] || selectedState}`
                : 'Showing 100 Universities Across All States'}
            </div>
            <p className="text-[11px] text-[#a5c4df] mt-0.5">Click any state polygon or rank pin to inspect admission details</p>
          </div>
        </div>

        {/* Right Side Program & State Inspector */}
        <div className="flex flex-col border-t lg:border-t-0 lg:border-l border-white/10 bg-[#081b31]/95 p-5 backdrop-blur-md h-full max-h-[620px] overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <Badge className="bg-[#30d7b0] text-[#071b34] font-bold hover:bg-[#30d7b0]">
                {selectedState !== 'All states'
                  ? `${selectedState} • ${activePrograms.length} Programs`
                  : selectedUniversity
                  ? `Rank #${selectedUniversity.rank}`
                  : 'Top Program Highlights'}
              </Badge>
              <h3 className="mt-1 text-lg font-bold text-white tracking-tight">
                {selectedState !== 'All states'
                  ? STATE_NAMES[selectedState] || selectedState
                  : selectedUniversity
                  ? selectedUniversity.university
                  : '100 Programs Nationwide'}
              </h3>
            </div>
            {selectedState !== 'All states' && (
              <Button
                size="sm"
                onClick={handleResetView}
                variant="outline"
                className="border-white/20 text-xs h-7 text-[#30d7b0] hover:bg-white/10"
              >
                Reset All
              </Button>
            )}
          </div>

          {/* Quick Metrics */}
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-black/30 p-2.5 border border-white/5">
              <span className="text-[#83a7c9] flex items-center gap-1">
                <DollarSign size={12} className="text-[#30d7b0]" /> Avg. Application Fee
              </span>
              <p className="mt-0.5 text-base font-bold text-white">
                {money.format(
                  Math.round(activePrograms.reduce((sum, p) => sum + p.fee, 0) / activePrograms.length)
                )}
              </p>
            </div>
            <div className="rounded-xl bg-black/30 p-2.5 border border-white/5">
              <span className="text-[#83a7c9] flex items-center gap-1">
                <Calendar size={12} className="text-[#30d7b0]" /> Projected Deadline
              </span>
              <p className="mt-0.5 text-xs font-bold text-white truncate">
                {dateFormat.format(
                  new Date(`${[...activePrograms].sort((a, b) => a.deadline.localeCompare(b.deadline))[0]?.deadline || '2026-12-01'}T00:00:00Z`)
                )}
              </p>
            </div>
          </div>

          {/* Scrollable list of programs */}
          <div className="mt-3 flex-1 overflow-y-auto pr-1 space-y-2 scrollbar-thin">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#83a7c9]">
              {selectedState !== 'All states' ? `Institutions in ${selectedState}:` : 'Featured Programs:'}
            </p>
            {activePrograms.map((p) => (
              <div
                key={p.rank}
                onClick={() => {
                  setSelectedUniversity(p)
                  const coords = UNIVERSITY_COORDINATES[p.university]
                  if (coords && mapInstanceRef.current) {
                    mapInstanceRef.current.flyTo(coords, 9, { duration: 0.8 })
                  }
                }}
                className={`group cursor-pointer rounded-xl border p-2.5 transition-all ${
                  selectedUniversity?.rank === p.rank
                    ? 'border-[#30d7b0] bg-[#30d7b0]/15 shadow-md'
                    : 'border-white/10 bg-black/25 hover:border-white/20 hover:bg-black/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="inline-grid h-5 w-5 place-items-center rounded bg-[#30d7b0] text-[10px] font-bold text-[#071b34] shrink-0">
                      #{p.rank}
                    </span>
                    <p className="text-xs font-semibold text-white truncate">{p.university}</p>
                  </div>
                  <span className="text-[10px] text-[#83a7c9] font-mono shrink-0">{p.city}, {p.state}</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#a5c4df]">
                  <span className="flex items-center gap-1">
                    <Calendar size={11} className="text-[#30d7b0]" />
                    {dateFormat.format(new Date(`${p.deadline}T00:00:00Z`))}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-emerald-400 font-semibold">{money.format(p.fee)}</span>
                    <a
                      href={`/faculty?university=${encodeURIComponent(p.university)}&rank=${p.rank}`}
                      className="text-[#30d7b0] hover:text-white p-0.5"
                      title="Explore faculty"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Users size={12} />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action button */}
          <div className="mt-3 pt-3 border-t border-white/10">
            <Button
              onClick={() => {
                const tableEl = document.getElementById('programs-table-section')
                if (tableEl) {
                  tableEl.scrollIntoView({ behavior: 'smooth' })
                }
              }}
              className="w-full bg-[#30d7b0] text-[#071b34] hover:bg-[#25c49f] font-bold text-xs h-9"
            >
              Scroll to Table ({activePrograms.length} Programs)
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
