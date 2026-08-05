package com.openopportunity.config;

import java.lang.reflect.Method;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.interceptor.TransactionAttribute;
import org.springframework.transaction.interceptor.TransactionAttributeSource;

/**
 * Decides primary-vs-replica for ReadReplicaDataSourceConfig's routing DataSource — see
 * DataSourceContextHolder for the ThreadLocal this writes to.
 *
 * <p>Why this exists instead of just checking {@code
 * TransactionSynchronizationManager.isCurrentTransactionReadOnly()} inside the routing
 * DataSource directly (the obviously simpler option, and the one first tried here): Hibernate
 * acquires the real physical JDBC connection during {@code JpaTransactionManager.doBegin()} — to
 * actually start a JDBC transaction on it — and that happens *before*
 * AbstractPlatformTransactionManager.prepareSynchronization() sets the read-only flag that
 * TransactionSynchronizationManager reports. So by the time the routing DataSource is asked for
 * a connection, {@code isCurrentTransactionReadOnly()} always reports false, regardless of the
 * method's real {@code @Transactional(readOnly = true)} — confirmed empirically (a stack trace
 * dumped from inside {@code determineCurrentLookupKey()} during local read-replica testing shows
 * exactly this call path). This aspect sidesteps the ordering problem entirely by making the
 * routing decision *before* Spring's own transactional advice runs at all, from the
 * {@code @Transactional} annotation's declared attributes directly (via the same
 * TransactionAttributeSource Spring's real transaction interceptor uses, so inherited/overridden
 * annotations resolve identically) — @Order(HIGHEST_PRECEDENCE) is load-bearing: it's what
 * guarantees this aspect wraps *outside* the transactional advice (whose own default order is
 * lowest-precedence) rather than running after it.
 *
 * <p>Only active when app.datasource.read-replica.enabled=true, alongside
 * ReadReplicaDataSourceConfig — with the read replica off there's exactly one DataSource in the
 * app, so there's nothing for this to route and no reason to add AOP overhead to every
 * {@code @Transactional} call.
 */
@Aspect
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@ConditionalOnProperty(name = "app.datasource.read-replica.enabled", havingValue = "true")
public class ReadOnlyRoutingAspect {

    private final TransactionAttributeSource transactionAttributeSource;

    public ReadOnlyRoutingAspect(TransactionAttributeSource transactionAttributeSource) {
        this.transactionAttributeSource = transactionAttributeSource;
    }

    @Around("@within(org.springframework.transaction.annotation.Transactional) "
            + "|| @annotation(org.springframework.transaction.annotation.Transactional)")
    public Object route(ProceedingJoinPoint joinPoint) throws Throwable {
        // A read-only method called from within an already-routed call (e.g. a write method
        // internally calling a read-only helper) must not switch mid-flight — Spring's
        // propagation means that inner call reuses the outer transaction's already-acquired
        // connection anyway, but only setting the key when nothing has already been decided
        // for this thread makes that "outer decision wins" behavior explicit rather than
        // incidental.
        if (DataSourceContextHolder.isSet()) {
            return joinPoint.proceed();
        }

        Method method = ((MethodSignature) joinPoint.getSignature()).getMethod();
        Class<?> targetClass = joinPoint.getTarget().getClass();
        TransactionAttribute attribute = transactionAttributeSource.getTransactionAttribute(method, targetClass);
        boolean readOnly = attribute != null && attribute.isReadOnly();

        DataSourceContextHolder.set(readOnly ? DataSourceContextHolder.REPLICA : DataSourceContextHolder.PRIMARY);
        try {
            return joinPoint.proceed();
        } finally {
            DataSourceContextHolder.clear();
        }
    }
}
