### Docker Installation

#### For staging environment

[//]: # 'TODO update the docker procedure and Dockerfile with Keycloack integration'

1. Build the Docker image with `docker build -t sovisuplus:v0.1 -f ./docker/staging/Dockerfile .`
2. Run the Docker container with `docker compose -f ./docker/staging/docker-compose.yml up -d`.
3. The application is now available at `http://localhost:3002`.
