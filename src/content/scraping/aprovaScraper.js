import { scraperTargets } from "../../shared/constants/scraper.js";
import { BaseScraper } from "./baseScraper.js";

/**
 * @class AprovaScraper
 * @extends BaseScraper
 * @classdesc Classe especializada na extração de dados do sistema Aprova Digital.
 * Implementa lógicas específicas para lidar com a renderização assíncrona do Angular,
 * captura de nomes de técnicos via storage/DOM e diferentes visões (Geral, Por Usuário e Inbox).
 * * @author Victor Kiss
 */
export class AprovaScraper extends BaseScraper {
    
    /**
     * Inicializa o scraper do Aprova Digital.
     * @param {string} aba_sistema - Nome amigável da aba/contexto que está sendo extraído.
     */
    constructor(aba_sistema) {
        super(aba_sistema);

        /** @type {string} */
        this.aba_sistema = aba_sistema;

        /** * Seletores CSS mapeados para o Aprova Digital.
         * @type {Object} 
         */
        this.targets = scraperTargets.aprova_digital;
        this.parent = scraperTargets.aprova_digital.parent
    }

    /**
     * Captura o nome do técnico responsável.
     * Como o nome muitas vezes não está na mesma tabela dos processos, este método 
     * busca o dado no DOM (se estiver na página de perfil) ou recupera o último 
     * valor salvo no storage local.
     * @private
     * @async
     * @returns {Promise<string>} O nome do técnico identificado ou um valor padrão.
     */
    async getTechniciansName() {
        if (typeof chrome === 'undefined' || !chrome.runtime?.id) return "";

        const {tecnico} = this.targets.usuarios_page;

        // Aguarda renderização de elementos assíncronos
        await new Promise(resolve => setTimeout(resolve, 1000));

        const element = document.querySelector(tecnico);

        // Caso o elemento exista na página (ex: página de Perfil/Inbox), atualiza o storage
        if (element) {
            const nameOnPage = element.textContent.trim();
            await chrome.storage.local.set({ tecnico: nameOnPage });
            return nameOnPage;
        }

        // Caso contrário, tenta recuperar o último técnico conhecido do cache
        const storage = await chrome.storage.local.get(['tecnico']);

        if (!storage.tecnico) {
            console.warn("UrbSync: Nome do técnico não encontrado no storage nem na página.");
            return "Técnico não identificado";
        }

        return storage.tecnico;
    }

    /**
     * Extrai dados da visão "Todos os Processos" (Caixa Geral).
     * Varre a tabela principal, aplica filtros de visibilidade e estrutura os dados.
     * @returns {Array<Object>} Lista de processos estruturados para exportação.
     */
    extract() {
        this.logStart();

        const {parent,processo,num_sei,requerimento,requerente,proprietario,criado_em,ultima_acao,status} = this.targets

        const rows = document.querySelectorAll(this.parent);

        return Array.from(rows)
            .filter((row) => {
                const rect = row.getBoundingClientRect();
                return rect.height > 0; // Garante que a linha está visível na tela
            })
            .map(row => ({
                sistema: "Aprova Digital - Todos os Processos",
                processo: this.getText(row, processo),
                num_sei: this.getText(row, num_sei),
                requerimento: this.getText(row, requerimento),
                requerente: this.getText(row, requerente),
                proprietario: this.getText(row, proprietario),
                criado_em: this.getText(row, criado_em),
                ultima_acao: this.getText(row, ultima_acao),
                status: this.getText(row, status),
                data_consulta: new Date().toLocaleDateString('pt-BR'),
            }));
    }

    /**
     * Extrai dados de processos vinculados a um usuário específico.
     * Se a URL for de perfil, apenas atualiza o nome do técnico. Caso seja a lista,
     * associa o nome do técnico a cada linha extraída.
     * @async
     * @returns {Promise<Array<Object>>} Lista de processos do usuário.
     */
    async extractByUser() {

        const {processo,requerimento,requerente,recebido_em} = this.targets.usuarios_page;

        this.logStart();

        const url = window.location.href;

        if (url.includes('/perfil')) {
            await this.getTechniciansName();
            return [];
        }

        const rows = document.querySelectorAll(this.parent);
        const tecnicoNome = await this.getTechniciansName();

        return Array.from(rows)
            .filter((row) => row.getBoundingClientRect().height > 0)
            .map(row => ({
                sistema: "Aprova Digital - Usuários",
                tecnico: tecnicoNome,
                processo: this.getText(row, processo),
                requerimento: this.getText(row, requerimento),
                requerente: this.getText(row, requerente),
                recebido_em: this.getText(row, recebido_em),
                data_consulta: new Date().toLocaleDateString('pt-BR')
            }));
    }

    /**
     * Detecta o nome da caixa ativa na página de Inbox.
     * Analisa as abas (tabs) do sistema para identificar qual possui o indicador 
     * visual de seleção e extrai o nome textual, limpando números e espaços.
     * @private
     * @async
     * @returns {Promise<string>} Nome da caixa detectada (ex: "Minha Caixa", "Equipe").
     */
    async #getInboxName() {
        const {caixa} = this.targets.inbox_page
        await new Promise(r => setTimeout(r, 500));

        const tabs = document.querySelectorAll(caixa);
        let detectedName = "Caixa não identificada";

        for (const tab of tabs) {
            const hasBlueBar = tab.querySelector('.bg-blue-700.absolute.bottom-0');
            
            if (hasBlueBar) {
                const textElement = tab.querySelector('div div:nth-child(1)');
                if (textElement) {
                    detectedName = textElement.textContent
                        .replace(/\d+/g, '') // Remove contagem de processos (números)
                        .replace(/\s\s+/g, ' ') 
                        .trim();
                    break;
                }
            }
        }
        await chrome.storage.local.set({ caixa_atual: detectedName });
        return detectedName;
    }

    /**
     * Extrai dados da Caixa de Entrada (Inbox) ativa.
     * @async
     * @returns {Promise<Array<Object>>} Lista de processos da caixa selecionada.
     */
    async extractByInbox() {
        this.logStart();

        const {processo,num_sei,taxas,requerimento,requerente,recebido_em} = this.targets.inbox_page;

        const rows = document.querySelectorAll(this.parent);
        const inboxName = await this.#getInboxName();

        // Aguarda renderização final da lista
        await new Promise(resolve => setTimeout(resolve, 1000));

        return Array.from(rows)
            .filter((row) => row.getBoundingClientRect().height > 0)
            .map(row => ({
                sistema: `Aprova Digital - Caixa: ${inboxName}`,
                processo: this.getText(row, processo),
                num_sei: this.getText(row, num_sei),
                taxas: this.getText(row, taxas),
                requerimento: this.getText(row, requerimento),
                requerente: this.getText(row, requerente),
                recebido_em: this.getText(row, recebido_em),
                data_consulta: new Date().toLocaleDateString('pt-BR')
            }));
    }
}

