declare namespace NodeJS {
  export interface ProcessEnv {
    DATABASE_URL: string
    DATABASE_URL_TEST: string
    KEYCLOAK_CLIENT_ID: string
    KEYCLOAK_CLIENT_SECRET: string
    KEYCLOAK_ISSUER: string
    AMQP_USER: string
    AMQP_PASSWORD: string
    AMQP_HOST: string
    AMQP_PORT: string
    AMQP_QUEUE_NAME: string
    GRAPHQL_ENDPOINT_ENABLED: string
    GRAPHQL_ENDPOINT_URL: string
    GRAPHQL_API_KEY_ENABLED: string
    GRAPHQL_API_KEY: string
  }
}
