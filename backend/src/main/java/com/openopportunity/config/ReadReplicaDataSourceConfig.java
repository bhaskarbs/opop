package com.openopportunity.config;

import java.util.Map;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.flyway.FlywayDataSource;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.datasource.lookup.AbstractRoutingDataSource;

/**
 * Splits read traffic onto a separate Postgres connection from write traffic — only created when
 * app.datasource.read-replica.enabled=true (see application.properties for the read-replica-lag
 * caveat before turning this on); a bare `docker compose up` and default config need nothing
 * beyond the single Postgres container this app has always used, completely unaffected by any of
 * this class.
 *
 * <p>Routing key: read from DataSourceContextHolder, which ReadOnlyRoutingAspect populates from
 * each call's {@code @Transactional(readOnly = ...)} attribute — see that aspect's Javadoc for
 * why this doesn't just check TransactionSynchronizationManager.isCurrentTransactionReadOnly()
 * directly (the obvious-looking approach, and the one actually shipped here first — it doesn't
 * work with JPA specifically, confirmed empirically, not just in theory). No per-method code
 * changes were needed in the rest of the app either way — this reuses the
 * {@code @Transactional(readOnly = true)} annotations already used throughout this app's
 * read-only service methods (e.g. JobService#get, IdeaService#browse) as the signal.
 *
 * <p>Flyway is explicitly pointed at primaryDataSource via {@code @FlywayDataSource} — schema
 * migrations must always run against the real primary, never through the read/write router (and
 * never against a replica, which can't accept DDL at all). JPA/Hibernate, which has no such
 * qualifier, gets whichever DataSource bean is {@code @Primary} — the router — instead.
 */
@Configuration
@ConditionalOnProperty(name = "app.datasource.read-replica.enabled", havingValue = "true")
public class ReadReplicaDataSourceConfig {

    @Bean
    @FlywayDataSource
    public DataSource primaryDataSource(
            @Value("${spring.datasource.url}") String url,
            @Value("${spring.datasource.username}") String username,
            @Value("${spring.datasource.password}") String password) {
        return DataSourceBuilder.create().url(url).username(username).password(password).build();
    }

    @Bean
    public DataSource replicaDataSource(
            @Value("${app.datasource.read-replica.url}") String url,
            @Value("${app.datasource.read-replica.username}") String username,
            @Value("${app.datasource.read-replica.password}") String password) {
        return DataSourceBuilder.create().url(url).username(username).password(password).build();
    }

    @Bean
    @Primary
    public DataSource routingDataSource(DataSource primaryDataSource, DataSource replicaDataSource) {
        AbstractRoutingDataSource routingDataSource = new AbstractRoutingDataSource() {
            @Override
            protected Object determineCurrentLookupKey() {
                return DataSourceContextHolder.get();
            }
        };
        routingDataSource.setDefaultTargetDataSource(primaryDataSource);
        routingDataSource.setTargetDataSources(Map.<Object, Object>of(
                DataSourceContextHolder.PRIMARY, primaryDataSource,
                DataSourceContextHolder.REPLICA, replicaDataSource));
        routingDataSource.afterPropertiesSet();
        return routingDataSource;
    }
}
