package app.mllopes.gestor.api.core;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Núcleo de sincronização (puro).
 *
 * <p>Implementa o protocolo de push/pull + detecção de conflito entre
 * múltiplos dispositivos do mesmo usuário. Conforme docs/04-POLITICA-SYNC.md
 * e ADR 0002.
 *
 * <p>Princípio AGENTS §4.6: <b>conflito é VISÍVEL, sobrescrita nunca é
 * silenciosa</b>. O servidor detecta a colisão por (versão_cliente vs.
 * versão_servidor) e cria entrada em {@code sync_conflitos} para o usuário
 * resolver — não escolhe vencedor sozinho.
 */
public final class SyncCore {

    private SyncCore() {}

    /** Decisão do servidor para uma mudança recebida no push. */
    public record ResultadoMudanca(
        String tabela,
        String registroId,
        boolean aplicada,           // true se foi UPSERT/DELETE no servidor
        boolean conflito,           // true se abriu sync_conflitos
        long versaoServidor,        // versão que ficou no servidor (pós-push, se aplicada)
        long versaoCliente,
        String motivo               // explicacao
    ) {}

    /**
     * Avalia uma mudança vinda do cliente e devolve a decisão.
     *
     * @param versaoServidor versão atual no servidor (0 = não existe)
     * @param versaoCliente  versão que o cliente afirma estar sobrescrevendo
     */
    public static ResultadoMudanca avaliarMudanca(
            String tabela,
            String registroId,
            long versaoServidor,
            long versaoCliente) {
        if (versaoCliente <= 0) {
            return new ResultadoMudanca(tabela, registroId, false, false,
                versaoServidor, versaoCliente, "versao_cliente inválida");
        }
        // Caso A: registro não existe no servidor OU versão cliente é maior — aplica direto
        if (versaoServidor == 0) {
            return new ResultadoMudanca(tabela, registroId, true, false,
                versaoCliente, versaoCliente, "primeira escrita");
        }
        if (versaoCliente > versaoServidor) {
            return new ResultadoMudanca(tabela, registroId, true, false,
                versaoCliente, versaoCliente, "versão cliente mais recente: aplicada");
        }
        if (versaoCliente == versaoServidor) {
            // Idempotente: cliente e servidor convergem. Nada a fazer.
            return new ResultadoMudanca(tabela, registroId, true, false,
                versaoServidor, versaoCliente, "idempotente: já estava nesta versão");
        }
        // CONFLITO: cliente está atrasado, servidor tem versão maior
        return new ResultadoMudanca(tabela, registroId, false, true,
            versaoServidor, versaoCliente,
            "cliente v" + versaoCliente + " vs servidor v" + versaoServidor + ": conflito");
    }

    /** Faz o merge campo-a-campo entre dois payloads JSON, retornando 3-listas (ganhou/perdeu/iguais). */
    public static Merge merge(ObjectMapper mapper, JsonNode servidor, JsonNode cliente) {
        Merge m = new Merge();
        if (servidor == null || servidor.isNull()) {
            m.clienteGanhou.addAll(fieldNames(cliente));
            m.resultado = cliente;
            return m;
        }
        if (cliente == null || cliente.isNull()) {
            m.servidorGanhou.addAll(fieldNames(servidor));
            m.resultado = servidor;
            return m;
        }
        var it = servidor.fieldNames();
        while (it.hasNext()) {
            String f = it.next();
            if (cliente.has(f)) {
                if (cliente.get(f).equals(servidor.get(f))) {
                    m.iguais.add(f);
                } else {
                    m.servidorGanhou.add(f);
                }
            } else {
                m.servidorGanhou.add(f);
            }
        }
        var it2 = cliente.fieldNames();
        while (it2.hasNext()) {
            String f = it2.next();
            if (!servidor.has(f)) m.clienteGanhou.add(f);
        }
        // resultado = merge (servidor como base, cliente sobrescreve onde difere)
        m.resultado = mergeInto(mapper, servidor, cliente);
        return m;
    }

    private static JsonNode mergeInto(ObjectMapper m, JsonNode base, JsonNode over) {
        var node = base.deepCopy();
        var it = over.fieldNames();
        while (it.hasNext()) {
            String f = it.next();
            ((com.fasterxml.jackson.databind.node.ObjectNode) node).set(f, over.get(f));
        }
        return node;
    }

    private static List<String> fieldNames(JsonNode n) {
        List<String> out = new ArrayList<>();
        if (n == null) return out;
        var it = n.fieldNames();
        while (it.hasNext()) out.add(it.next());
        return out;
    }

    public static final class Merge {
        public List<String> servidorGanhou = new ArrayList<>();
        public List<String> clienteGanhou  = new ArrayList<>();
        public List<String> iguais         = new ArrayList<>();
        public JsonNode resultado;
        public Map<String, Object> toMap() {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("servidor_ganhou", servidorGanhou);
            m.put("cliente_ganhou", clienteGanhou);
            m.put("iguais", iguais);
            m.put("resultado", resultado);
            return m;
        }
    }
}
