package app.mllopes.gestor.api.auth;

import de.mkammerer.argon2.Argon2;
import de.mkammerer.argon2.Argon2Factory;

/**
 * Hash de senha via argon2id (m=64MB, t=3, p=4) — padrão recomendado 2024+.
 * Encoded output inclui salt + parâmetros.
 */
public final class PasswordHasher {

    private static final Argon2 ARGON2 = Argon2Factory.create(Argon2Factory.Argon2Types.ARGON2id);

    public static String hash(String senha) {
        if (senha == null || senha.isEmpty()) throw new IllegalArgumentException("senha vazia");
        return ARGON2.hash(3, 65536, 4, senha.toCharArray());
    }

    public static boolean verify(String hash, String senha) {
        if (hash == null || senha == null) return false;
        return ARGON2.verify(hash, senha.toCharArray());
    }

    private PasswordHasher() {}
}
