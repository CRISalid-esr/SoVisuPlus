// config.ts
import { UniversityLogos } from '@/types/UniversityLogos'

export class UniversityConfig {
  private static instance: UniversityConfig
  public colors: Record<string, string>
  public logos: UniversityLogos
  private university: string | undefined

  private constructor() {
    this.university = process.env.NEXT_PUBLIC_UNIVERSITY
    this.colors = {}
    this.logos = this.loadLogos()
    this.loadConfig()
  }

  private loadConfig() {
    switch (this.university) {
      case 'custom':
        this.colors = require('./custom/colors').colors
        break
      default:
        console.log('Using default university colors')
        this.colors = require('./default/colors').colors
        break
    }
  }

  private loadLogos(): UniversityLogos {
    switch (this.university) {
      case 'custom':
        return require('./custom/logos').logos as UniversityLogos
      default:
        console.log('Using default university logos')
        return require('./default/logos').logos as UniversityLogos
    }
  }

  public static getInstance(): UniversityConfig {
    if (!this.instance) {
      this.instance = new UniversityConfig()
    }
    return this.instance
  }
}

// Export a singleton instance
export const universityConfig = UniversityConfig.getInstance()
