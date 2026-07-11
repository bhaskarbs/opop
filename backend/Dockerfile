# Build stage — compiles the jar with the Gradle wrapper so the image doesn't depend
# on any Gradle version installed on the build machine.
FROM eclipse-temurin:21-jdk-jammy AS build
WORKDIR /workspace

COPY gradlew settings.gradle build.gradle ./
COPY gradle gradle
RUN ./gradlew --no-daemon dependencies

COPY src src
RUN ./gradlew --no-daemon bootJar -x test

# Runtime stage — JRE only, no build toolchain in the shipped image.
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

RUN useradd --system --create-home --shell /usr/sbin/nologin appuser
COPY --from=build /workspace/build/libs/*.jar app.jar
USER appuser

# Cloud Run sets PORT at runtime (see server.port in application.properties); 8080 is
# just the documented default for local `docker run`.
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
