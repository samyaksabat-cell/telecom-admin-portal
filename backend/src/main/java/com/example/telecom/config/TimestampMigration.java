package com.example.telecom.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import javax.sql.DataSource;

/**
 * Normalize legacy JDBC epoch-millisecond storage before the application is
 * ready. SQLite compares storage classes before values, so decoding in JPA
 * alone is insufficient.
 */
@Component
public class TimestampMigration implements InitializingBean {
    private static final Logger LOG = LoggerFactory.getLogger(TimestampMigration.class);
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transaction;

    public TimestampMigration(DataSource dataSource, PlatformTransactionManager transactionManager) {
        this.jdbc = new JdbcTemplate(dataSource);
        this.transaction = new TransactionTemplate(transactionManager);
    }

    @Override
    public void afterPropertiesSet() {
        transaction.executeWithoutResult(status -> {
            int updated = 0;
            if (tableExists("customers")) {
                updated += jdbc.update(
                        "UPDATE customers SET created_at = strftime('%Y-%m-%d %H:%M:%f', created_at / 1000.0, 'unixepoch') WHERE typeof(created_at) IN ('integer', 'real')");
                updated += jdbc.update(
                        "UPDATE customers SET activated_at = strftime('%Y-%m-%d %H:%M:%f', activated_at / 1000.0, 'unixepoch') WHERE typeof(activated_at) IN ('integer', 'real')");
            }
            if (tableExists("devices")) {
                updated += jdbc.update(
                        "UPDATE devices SET created_at = strftime('%Y-%m-%d %H:%M:%f', created_at / 1000.0, 'unixepoch') WHERE typeof(created_at) IN ('integer', 'real')");
                updated += jdbc.update(
                        "UPDATE devices SET assigned_at = strftime('%Y-%m-%d %H:%M:%f', assigned_at / 1000.0, 'unixepoch') WHERE typeof(assigned_at) IN ('integer', 'real')");
            }
            if (tableExists("support_tickets")) {
                updated += jdbc.update(
                        "UPDATE support_tickets SET created_at = strftime('%Y-%m-%d %H:%M:%f', created_at / 1000.0, 'unixepoch') WHERE typeof(created_at) IN ('integer', 'real')");
                updated += jdbc.update(
                        "UPDATE support_tickets SET resolved_at = strftime('%Y-%m-%d %H:%M:%f', resolved_at / 1000.0, 'unixepoch') WHERE typeof(resolved_at) IN ('integer', 'real')");
            }
            if (tableExists("usage_records")) {
                updated += jdbc.update(
                        "UPDATE usage_records SET recorded_at = strftime('%Y-%m-%d %H:%M:%f', recorded_at / 1000.0, 'unixepoch') WHERE typeof(recorded_at) IN ('integer', 'real')");
            }
            LOG.info("Normalized {} legacy timestamp values", updated);
        });
    }

    private boolean tableExists(String table) {
        return jdbc.queryForObject("SELECT count(*) FROM sqlite_master WHERE type = 'table' AND name = ?",
                Integer.class, table) > 0;
    }
}
