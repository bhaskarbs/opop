package com.openopportunity.config;

/** Per-thread "which DataSource should the next connection acquisition use" flag — set by
 * ReadOnlyRoutingAspect before a {@code @Transactional} method's real transaction begins, read
 * by ReadReplicaDataSourceConfig's routing DataSource when it actually needs a connection. See
 * ReadOnlyRoutingAspect's Javadoc for why this ThreadLocal exists instead of just asking
 * TransactionSynchronizationManager whether the current transaction is read-only. */
final class DataSourceContextHolder {

    static final String PRIMARY = "primary";
    static final String REPLICA = "replica";

    private static final ThreadLocal<String> CURRENT = new ThreadLocal<>();

    private DataSourceContextHolder() {}

    static void set(String key) {
        CURRENT.set(key);
    }

    /** Whether some {@code @Transactional} call up the stack on this thread already made a
     * routing decision — ReadOnlyRoutingAspect uses this to avoid overwriting an outer call's
     * decision for a nested call. */
    static boolean isSet() {
        return CURRENT.get() != null;
    }

    /** Defaults to primary — a connection acquired with no routing decision made yet (e.g.
     * outside any {@code @Transactional} method) should never accidentally land on the replica. */
    static String get() {
        String key = CURRENT.get();
        return key != null ? key : PRIMARY;
    }

    static void clear() {
        CURRENT.remove();
    }
}
