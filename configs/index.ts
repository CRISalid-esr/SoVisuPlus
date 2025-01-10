// config.ts
const university = process.env.NEXT_PUBLIC_UNIVERSITY

let universityColors
let universityLogos

switch (university) {
  case 'custom':
    universityColors = require('./custom/colors').colors
    universityLogos = require('./custom/logos').logos
    break
  default:
    console.log('Using default university')
    universityColors = require('./default/colors').colors
    universityLogos = require('./default/logos').logos
    break
}

export { universityColors, universityLogos }
