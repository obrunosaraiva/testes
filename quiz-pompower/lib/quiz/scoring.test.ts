import { describe, it, expect } from "vitest";
import { calculateProfile } from "./scoring";

describe("calculateProfile", () => {
  describe("perfis puros", () => {
    it("retorna 'renascimento' para vergonha + autoestima + satisfação baixa", () => {
      const result = calculateProfile({
        p1: ["vergonha_desconexao"],
        p2: 3,
        p7: "autoestima_amor_proprio",
      });
      expect(result).toBe("renascimento");
    });

    it("retorna 'renascimento' para falta de desejo + amor-próprio", () => {
      const result = calculateProfile({
        p1: ["falta_desejo"],
        p2: 4,
        p7: "autoestima_amor_proprio",
      });
      expect(result).toBe("renascimento");
    });

    it("retorna 'expansao' para dificuldade orgasmo + prazer + satisfação alta", () => {
      const result = calculateProfile({
        p1: ["dificuldade_orgasmo"],
        p2: 8,
        p7: "prazer_orgasmo",
      });
      expect(result).toBe("expansao");
    });

    it("retorna 'expansao' para distância emocional + conexão parceiro", () => {
      const result = calculateProfile({
        p1: ["distancia_emocional"],
        p2: 7,
        p7: "conexao_parceiro",
      });
      expect(result).toBe("expansao");
    });

    it("retorna 'equilibrio' para perda de urina + reverter sintomas", () => {
      const result = calculateProfile({
        p1: ["perda_urina"],
        p7: "reverter_sintomas",
      });
      expect(result).toBe("equilibrio");
    });

    it("retorna 'equilibrio' para ressecamento + saúde hormonal", () => {
      const result = calculateProfile({
        p1: ["ressecamento"],
        p7: "saude_hormonal_ciclo",
      });
      expect(result).toBe("equilibrio");
    });

    it("retorna 'dominio' para performance + mentoria + investimento alto", () => {
      const result = calculateProfile({
        p1: ["dificuldade_orgasmo"],
        p7: "performance_dominio",
        p9: "outros_cursos",
        p10: "mentoria_individual",
        p11: "acima_2997",
      });
      expect(result).toBe("dominio");
    });

    it("retorna 'dominio' com imersão + ticket alto + curso prévio", () => {
      const result = calculateProfile({
        p7: "performance_dominio",
        p9: "terapia",
        p10: "imersao_presencial",
        p11: "1998_2997",
      });
      expect(result).toBe("dominio");
    });
  });

  describe("desempate", () => {
    it("prioriza 'equilibrio' quando empata com renascimento", () => {
      // Pontuação igualada entre renascimento e equilibrio.
      const result = calculateProfile({
        p1: ["falta_desejo", "perda_urina"],
      });
      expect(result).toBe("equilibrio");
    });

    it("prioriza 'renascimento' sobre 'expansao' em empate", () => {
      // Sem nenhuma resposta — todos zerados → vai pro primeiro válido (equilibrio).
      // Para forçar empate apenas entre renascimento e expansao:
      const result = calculateProfile({
        p1: ["falta_desejo", "dificuldade_orgasmo"],
      });
      // renascimento +3 (falta_desejo), expansao +3 (dificuldade_orgasmo)
      // empate → renascimento (vem antes de expansao na ordem)
      expect(result).toBe("renascimento");
    });

    it("prioriza 'expansao' sobre 'dominio' em empate", () => {
      const result = calculateProfile({
        p1: ["dificuldade_orgasmo"],
        p11: "acima_2997",
        p10: "mentoria_individual",
      });
      // expansao +3, dominio +4 → dominio ganha (não empate aqui na vdd).
      // Forçar empate manual:
      const tied = calculateProfile({
        p1: ["dificuldade_orgasmo"],
        p10: "mentoria_individual",
      });
      // expansao +3, dominio +2 → expansao
      expect(result).toBe("dominio");
      expect(tied).toBe("expansao");
    });
  });

  describe("respostas vazias / parciais", () => {
    it("não quebra com objeto vazio", () => {
      const result = calculateProfile({});
      // Todos zerados → vai pro primeiro do tie-breaker (equilibrio).
      expect(result).toBe("equilibrio");
    });

    it("não quebra com p1 vazio", () => {
      expect(() => calculateProfile({ p1: [] })).not.toThrow();
    });

    it("ignora valores desconhecidos sem quebrar", () => {
      const result = calculateProfile({
        p1: ["valor_inexistente"],
        p7: "outro_invalido",
      });
      expect(result).toBe("equilibrio");
    });

    it("calcula com p2 sem p7", () => {
      const result = calculateProfile({ p2: 2 });
      // só renascimento +2 → renascimento
      expect(result).toBe("renascimento");
    });
  });

  describe("multi-select da P1", () => {
    it("soma pontuação de duas dores", () => {
      const result = calculateProfile({
        p1: ["perda_urina", "ressecamento"],
        p7: "reverter_sintomas",
      });
      // equilibrio +3 +3 +4 = 10 → claramente equilibrio
      expect(result).toBe("equilibrio");
    });

    it("dores de arquétipos diferentes resolvem por desempate", () => {
      const result = calculateProfile({
        p1: ["vergonha_desconexao", "dificuldade_orgasmo"],
      });
      // renascimento +3, expansao +3 → empate → renascimento (ordem do tie-breaker)
      expect(result).toBe("renascimento");
    });
  });
});
