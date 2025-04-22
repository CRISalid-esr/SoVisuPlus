declare namespace NodeJS {
  export interface ProcessEnv {
    NEXT_PUBLIC_SUPPORTED_LOCALES: string
    PERSPECTIVES_ROLES_FILTER: string
    PUBLICATION_LIST_ROLES_FILTER: string
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
    NEXT_PUBLIC_ORCID_URL: string
    NEXT_PUBLIC_SOVISUPLUS_HOST: string
    NEXT_PUBLIC_ORCID_SCOPES: string
    NEXT_PUBLIC_ORCID_CLIENT_ID: string
    ORCID_CLIENT_SECRET: string
  }
}
