package app.mllopes.gestor.observability;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Logger SLF4J com fallback defensivo. Configurado por logback.xml no classpath.
 */
public final class AppLogger {

    private AppLogger() {}

    public static Logger get(Class<?> clazz) {
        return LoggerFactory.getLogger(clazz);
    }
}
