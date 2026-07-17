# Backend (Quarkus JVM) — standalone service image for the docker-compose split.
# Build context is the mypaybyday/ directory.

FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml ./
RUN mvn dependency:go-offline -q
COPY src ./src
COPY mvnw ./
COPY .mvn ./.mvn
RUN mvn package -DskipTests -q

FROM eclipse-temurin:21-jre-noble
WORKDIR /deployments
COPY --from=build /app/target/quarkus-app/lib/     /deployments/lib/
COPY --from=build /app/target/quarkus-app/*.jar    /deployments/
COPY --from=build /app/target/quarkus-app/app/     /deployments/app/
COPY --from=build /app/target/quarkus-app/quarkus/ /deployments/quarkus/

VOLUME ["/data"]
EXPOSE 8080

ENV QUARKUS_DATASOURCE_JDBC_URL=jdbc:sqlite:/data/mypaybyday.db
ENV JAVA_OPTS_APPEND="-Dquarkus.http.host=0.0.0.0 -Djava.util.logging.manager=org.jboss.logmanager.LogManager"
# The MarkItDown sidecar runs as its own compose service.
ENV MARKITDOWN_URL=http://markitdown:8590

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS_APPEND -jar /deployments/quarkus-run.jar"]
