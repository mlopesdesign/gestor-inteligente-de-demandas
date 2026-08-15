package app.mllopes.gestor.core;

/**
 * Versão da aplicação. Espelha a versão do {@code pom.xml} do parent.
 * Atualizado por {@code tools/bump-version.mjs} (Fase 7).
 *
 * <p>Conforme AGENTS §3.1: Java 21 LTS pinned.
 */
public final class Version {
    public static final String APP = "0.1.0";
    public static final String APP_ID = "app.mllopes.gestor";
    public static final String BINARY_NAME = "GestorInteligenteDeDemandas";
    public static final int JAVA_TARGET = 21;
    private Version() {}
}
