package app.mllopes.gestor.api.core;

import com.github.f4b6a3.ulid.UlidCreator;

/**
 * Gerador central de ULIDs.
 * 26 chars, ordenável, sem colisão, sem expor cardinalidade.
 */
public final class UlidGen {
    private UlidGen() {}

    public static String novo() {
        return UlidCreator.getUlid().toString();
    }

    public static boolean isValid(String s) {
        if (s == null) return false;
        return s.length() == 26;
    }
}
