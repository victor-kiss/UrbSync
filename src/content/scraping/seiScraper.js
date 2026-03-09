import { BaseScraper } from "./baseScraper.js";
import { scraperTargets } from "../../shared/constants/scraper.js";

/**
 * @class SeiScraper
 * @extends BaseScraper
 * @classdesc Classe especializada na extração de dados do Sistema Eletrônico de Informações (SEI).
 * Implementa lógicas específicas para lidar com a estrutura de tabelas do SEI, 
 * incluindo a recuperação de dados de técnicos através de atributos HTML (title) 
 * e filtragem de visibilidade nativa do navegador.
 */
export class SeiScraper extends BaseScraper {
    
    /**
     * Inicializa o scraper configurando o contexto como 'SEI'.
     * Carrega os seletores CSS mapeados especificamente para o portal SEI.
     */
    constructor() {
        super('SEI');
        /** @type {Object} Seletores CSS definidos em shared/constants/scraper.js */
        this.targets = scraperTargets.sei;
        this.parent = scraperTargets.sei.parent
    }

    /**
     * Captura o nome do técnico responsável por um processo.
     * No SEI, o nome do técnico muitas vezes está contido no atributo 'title' do ícone 
     * de atribuição, e não apenas como texto visível.
     * @private
     * @param {HTMLElement} row - O elemento pai (tr/linha da tabela) que contém os dados do processo.
     * @param {string} selector - O seletor CSS configurado para identificar o campo do técnico.
     * @returns {string} O nome do técnico sanitizado ou "Não informado".
     */
    #getTechniciansName(row, selector) {
        /** @type {HTMLElement|null} */
        const el = row.querySelector(selector);
        
        if (!el) return "Não informado";
        
        // Prioriza o atributo 'title' (comum no SEI), fallback para o texto interno
        return el.getAttribute('title') || el.innerText.trim() || "Não informado";
    }

    /**
     * Executa a rotina principal de extração de dados nas tabelas do SEI.
     * Sobrescreve o método extract da classe BaseScraper (Polimorfismo).
     * * Realiza as seguintes etapas:
     * 1. Filtra apenas linhas visíveis na interface (ignora elementos de controle ocultos).
     * 2. Limpa prefixos redundantes como "Atribuído para".
     * 3. Estrutura os dados com carimbo de data da consulta.
     * * @override
     * @returns {Array<Object>} Lista de processos extraídos e formatados para o Excel.
     */
    extract() {

        const {tecnico,processo,requerimento,requerente} = this.targets
        // Registra o início da operação (Log herdado da BaseScraper)
        this.logStart(); 

        /** @type {NodeListOf<HTMLElement>} Seleciona todas as linhas candidatas na tabela */
        const rows = document.querySelectorAll(this.parent);

        /**
         * Processamento da lista de elementos.
         * O filtro 'offsetParent !== null' é utilizado para garantir que processos 
         * em abas ocultas ou menus minimizados não sejam duplicados na extração.
         */
        return Array.from(rows).filter((row) => {
            const isVisible = row.offsetParent !== null;
            return isVisible;
        }).map(row => ({
                sistema: "SEI", 
                // Remove o prefixo padrão do SEI para deixar apenas o nome do servidor
                tecnico: this.#getTechniciansName(row, tecnico).replace('Atribuído para', '').trim(),
                processo: this.getText(row, processo),
                requerimento: this.getText(row, requerimento),
                requerente: this.getText(row, requerente),
                data_consulta: new Date().toLocaleDateString('pt-BR'),
        }));
    }
}
