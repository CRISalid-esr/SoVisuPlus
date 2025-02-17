import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'

// Extend Day.js with the localized format plugin
dayjs.extend(localizedFormat)

export default dayjs
