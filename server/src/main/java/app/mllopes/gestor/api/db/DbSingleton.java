package app.mllopes.gestor.api.db;

/**
 * Singleton preguiçoso do Db (apenas para acesso a partir de routes/utils).
 * Em produção, prefira injeção; este singleton é para reduzir boilerplate
 * nas rotas. Settado em {@code Server.main} antes do start.
 */
public enum DbSingleton {
    INSTANCE;

    private volatile Db db;

    public void set(Db db) { this.db = db; }
    public Db get() {
        Db d = this.db;
        if (d == null) throw new IllegalStateException("Db ainda não inicializado. Server.main deve chamar set().");
        return d;
    }
}
