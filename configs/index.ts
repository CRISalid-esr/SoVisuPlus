// config.ts
const university = process.env.NEXT_PUBLIC_UNIVERSITY

let universityColors
switch (university) {
  case 'paris1':
    universityColors = require('./paris1/colors').colors
    break
  default:
    universityColors = require('./default/colors').colors

    break
}

export { universityColors }
