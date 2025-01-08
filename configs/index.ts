// config.ts
const university = process.env.NEXT_PUBLIC_UNIVERSITY

let universityColors
let universityLogos

switch (university) {
  case 'custom':
    universityColors = require('./paris1/colors').colors
    universityLogos = require('./paris1/logos').logos
    break
  default:
    universityColors = require('./default/colors').colors
    universityLogos = require('./paris1/logos').logos
    break
}

export { universityColors, universityLogos }
