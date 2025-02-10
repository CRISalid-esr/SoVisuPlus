// config.ts
import { InstitutionalLogos } from '@/types/InstitutionalLogos'

export class InstitutionalConfig {
  private static instance: InstitutionalConfig
  public colors: Record<string, string>
  public logos: InstitutionalLogos
  private institutional: string | undefined

  private constructor() {
    this.institutional = process.env.NEXT_PUBLIC_INSTITUTIONAL
    this.colors = {}
    this.logos = this.loadLogos()
    this.loadConfig()
  }

  private loadConfig() {
    switch (this.institutional) {
      case 'custom':
        this.colors = require('./custom/colors').colors
        break
      default:
        console.log('Using default institutional colors')
        this.colors = require('./default/colors').colors
        break
    }
  }

  private loadLogos(): InstitutionalLogos {
    switch (this.institutional) {
      case 'custom':
        return require('./custom/logos').logos as InstitutionalLogos
      default:
        console.log('Using default institutional logos')
        return require('./default/logos').logos as InstitutionalLogos
    }
  }

  public static getInstance(): InstitutionalConfig {
    if (!this.instance) {
      this.instance = new InstitutionalConfig()
    }
    return this.instance
  }
}

// Export a singleton instance
export const institutionalConfig = InstitutionalConfig.getInstance()
