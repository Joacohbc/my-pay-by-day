docker build -f src/main/docker/Dockerfile.native-multistage -t mypaybyday/backend .

docker run --rm -p 8080:8080 \
    -v "$(pwd)/data:/work/data" \
    -e "DB_FIELD_ENCRYPTION_KEY=una-frase-larga-y-aleatoria-de-mas-de-32-chars" \
    -e "QUARKUS_DATASOURCE_JDBC_URL=jdbc:sqlite:/work/data/mypaybyday.db" \
    mypaybyday/backend


docker build -f Dockerfile -t mypaybyday/frontend .
docker run  -p 8081:80 mypaybyday/frontend