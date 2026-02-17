import React from 'react'

type EnvInjectorProps = {
  env: Record<string, string | undefined>
}

function validateEnv(env: Record<string, string | undefined>): void {
  const invalidKeys = Object.keys(env).filter(
    (key) => !key.startsWith('NEXT_PUBLIC_'),
  )

  if (invalidKeys.length > 0) {
    throw new Error(
      `EnvInjector: Only NEXT_PUBLIC_ variables are allowed. Invalid keys: ${invalidKeys.join(
        ', ',
      )}`,
    )
  }
}

export const EnvInjector: React.FC<EnvInjectorProps> = ({ env }) => {
  validateEnv(env)

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `window.env = ${JSON.stringify(env)};`,
      }}
    />
  )
}
