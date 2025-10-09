### Testing

#### Unit tests

The following command will run the unit tests:

```bash
npm run test
```

#### End-to-end tests

The following command will run the integration tests:

```bash
npm run test:integration
```

It requires a separate PostgreSQL database to run the tests. You can use the following command to start a PostgreSQL
instance with Docker:

```bash
docker run -it  --rm --name postgres_test_service   -e POSTGRES_USER=sovisuplus_test   -e POSTGRES_PASSWORD=sovisuplus_test   -e POSTGRES_DB=sovisuplus_test   -p 5433:5432  postgres:latest
```
