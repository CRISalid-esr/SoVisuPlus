import {
  AffiliationData,
  MapCollaborationsProps,
  Point,
} from '@/app/[lang]/dashboard/components/CollaborationMap/CollaborationMapTypes'
import {
  MutableRefObject,
  RefObject,
  useCallback,
  useMemo,
  useRef,
} from 'react'
import { IAgent } from '@/types/IAgent'
import geoJson from '@/public/countries.geo.json'
import { Feature, GeoJSON, MultiPolygon, Polygon } from 'geojson'
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import { ECharts } from 'echarts'
import { debounce } from 'lodash'
import ReactEcharts, { EChartsOption } from 'echarts-for-react'
import { GeoComponentOption } from 'echarts/components'
import useStore from '@/stores/global_store'
import { DocumentData } from '@/app/[lang]/dashboard/page'
import centerOfMass from '@turf/center-of-mass'

const BASE_GRID_SIZE = 60
const ZOOM_THRESHOLD = 0.8

type filteredDataParams = {
  data: MapCollaborationsProps['data']
  yearRange: MapCollaborationsProps['yearRange']
}

/**
 * Selects data in year range passing in props and flatten result in array
 * Return array of type { longitude :number, latitude : number, name :string, documents : Record <string, DocumentData>}[]
 * with longitude and latitude : coordinates of organization,
 * name : name of organization,
 * documents : set of documents done in collaboration with the organization in yearRange
 */
function filterData(
  { data, yearRange }: filteredDataParams,
  currentPerspective: IAgent | null,
) {
  const processedData = Object.entries(data).reduce<
    Record<string, AffiliationData>
  >((acc, [year, docs]) => {
    if (Number(year) >= yearRange[0] && Number(year) <= yearRange[1]) {
      docs.map((doc) => {
        doc.contributions.map((contribution) => {
          const contributor = contribution.person
          if (!(contributor.uid == currentPerspective?.uid)) {
            contribution.affiliations.map((affiliation) => {
              if (
                affiliation.places.length > 0 &&
                affiliation.displayNames.length > 0
              ) {
                acc[affiliation.uid] ??= {
                  longitude: affiliation.places[0].longitude,
                  latitude: affiliation.places[0].latitude,
                  name: affiliation.displayNames[0],
                  documents: {},
                }
                acc[affiliation.uid].documents[doc.uid] ??= doc
              }
            })
          }
        })
      })
    }
    return acc
  }, {})
  return Object.entries(processedData).map(([key, value]) => value)
}

export function useFilteredData({ data, yearRange }: filteredDataParams) {
  const { currentPerspective } = useStore((state) => state.user)
  return useMemo(
    () => filterData({ data, yearRange }, currentPerspective),
    [data, yearRange, currentPerspective],
  )
}

/**
 * Process filtered data to group organization by country on the map
 * Return set of data indexed by country id from geoJson object
 */
function groupByCountry(filteredData: AffiliationData[]) {
  return geoJson.features.reduce<
    [Record<string, AffiliationData[]>, Record<string, Feature<GeoJSON.Point>>]
  >(
    ([points, centers], feature) => {
      const country: Polygon | MultiPolygon | Feature<Polygon | MultiPolygon> =
        feature.geometry as
          | Polygon
          | MultiPolygon
          | Feature<Polygon | MultiPolygon>
      centers[feature.properties.name] = centerOfMass(country)
      points[feature.id] = filteredData.filter((data) => {
        const point: { type: 'Point'; coordinates: number[] } = {
          type: 'Point',
          coordinates: [data.longitude, data.latitude],
        }
        return booleanPointInPolygon(point, country)
      })
      return [points, centers]
    },
    [{}, {}],
  )
}

export function useCountryPoints(filteredData: AffiliationData[]) {
  return useMemo(() => groupByCountry(filteredData), [filteredData])
}

/**
 * Process points by country to merge ones that are closed depending on map zoom
 */
function mergePoints(
  countryPoints: Record<string, AffiliationData[]>,
  map: ECharts,
  zoom?: number,
): Point[] {
  const gridSize = Math.max(
    8,
    Math.min(80, BASE_GRID_SIZE / Math.pow(zoom ? zoom : 1, 0.6)),
  )
  return Object.entries(countryPoints)
    .map(([countryId, points]) => {
      const grid: Record<
        string,
        {
          coordinates: [number, number]
          count: number
          data: Record<string, Record<string, DocumentData>>
        }
      > = {}
      points.forEach((point) => {
        const px = map.convertToPixel({ geoIndex: 0 }, [
          point.longitude,
          point.latitude,
        ])
        if (!px) return
        const [x, y] = px
        const keyX = Math.floor(x / gridSize)
        const keyY = Math.floor(y / gridSize)
        const key = `${keyX}-${keyY}`

        if (!grid[key]) {
          grid[key] = { coordinates: [x, y], count: 1, data: {} }
        } else {
          grid[key].coordinates[0] += x
          grid[key].coordinates[1] += y
          grid[key].count += 1
        }
        grid[key].data[point.name] = point.documents
      })
      return Object.entries(grid)
        .map(([key, value]) => {
          const longitude = value.coordinates[0] / value.count
          const latitude = value.coordinates[1] / value.count
          const convert = map.convertFromPixel({ geoIndex: 0 }, [
            longitude,
            latitude,
          ])
          return {
            longitude: convert[0],
            latitude: convert[1],
            count: value.count,
            data: value.data,
          }
        })
        .flat()
    })
    .flat()
}

export function useMergedPoints(
  countryPoints: Record<string, AffiliationData[]>,
) {
  return useCallback(
    (map: ECharts, zoom?: number) => mergePoints(countryPoints, map, zoom),
    [countryPoints],
  )
}

/**
 * Update merged points on zoom changes
 */
function handleRoam(
  chartRef: RefObject<ReactEcharts>,
  zoomRef: MutableRefObject<number>,
  mergedFnRef: MutableRefObject<(map: ECharts, zoom?: number) => Point[]>,
) {
  const map = chartRef.current?.getEchartsInstance() as EChartsOption & {
    geo?: GeoComponentOption
  }
  if (!map) return
  map.resize()
  const zoom = map?.getOption()?.geo?.[0]?.zoom || 1
  if (
    zoomRef.current === zoom ||
    Math.abs(zoom - zoomRef.current) < ZOOM_THRESHOLD
  )
    return
  zoomRef.current = zoom
  const points = mergedFnRef.current(map, zoom)
  map.setOption({
    series: [
      {
        id: 'collaborations',
        data: points.map((point) => [
          point.longitude,
          point.latitude,
          point.count,
          point.data,
        ]),
      },
    ],
  })
}

export function useHandleRoam(
  chartRef: RefObject<ReactEcharts>,
  mergedFnRef: MutableRefObject<(map: ECharts, zoom?: number) => Point[]>,
) {
  const zoomRef = useRef<number>(1.15)
  return useMemo(
    () =>
      debounce(() => {
        handleRoam(chartRef, zoomRef, mergedFnRef)
      }, 150),
    [chartRef, zoomRef, mergedFnRef],
  )
}
