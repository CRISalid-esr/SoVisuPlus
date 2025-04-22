import React from 'react'

type EnvInjectorProps = {
  env: Record<string, string | undefined>
}

export const EnvInjector: React.FC<EnvInjectorProps> = ({ env }) => {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `window.env = ${JSON.stringify(env)};`,
      }}
    />
  )
}
