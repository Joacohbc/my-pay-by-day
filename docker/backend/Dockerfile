# Backend (Quarkus JVM) — standalone service image for the docker-compose split.
# Build context is the repo root.

FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /app
COPY mypaybyday/pom.xml ./

RUN mvn dependency:go-offline -q

COPY mypaybyday/src ./src
COPY mypaybyday/mvnw ./
COPY mypaybyday/.mvn ./.mvn

RUN mvn package -DskipTests -q

FROM eclipse-temurin:21-jre-noble

RUN apt-get update && apt-get install -y --no-install-recommends curl && \
    apt-get clean && rm -rf /var/lib/apt/lists/* && \
    groupadd -r app && useradd -r -g app app

WORKDIR /deployments
COPY --from=build --chown=app:app /app/target/quarkus-app/lib/     /deployments/lib/
COPY --from=build --chown=app:app /app/target/quarkus-app/*.jar    /deployments/
COPY --from=build --chown=app:app /app/target/quarkus-app/app/     /deployments/app/
COPY --from=build --chown=app:app /app/target/quarkus-app/quarkus/ /deployments/quarkus/
RUN mkdir -p /data && chown app:app /data

VOLUME ["/data"]
EXPOSE 8080

ENV QUARKUS_DATASOURCE_JDBC_URL=jdbc:sqlite:/data/mypaybyday.db
ENV JAVA_OPTS_APPEND="-Dquarkus.http.host=0.0.0.0 -Djava.util.logging.manager=org.jboss.logmanager.LogManager"

# The MarkItDown sidecar runs as its own compose service.
ENV MARKITDOWN_URL=http://markitdown:8590

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://127.0.0.1:8080/q/health/live || exit 1

USER app
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS_APPEND -jar /deployments/quarkus-run.jar"]
