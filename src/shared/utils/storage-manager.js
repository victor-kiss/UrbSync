/**
 * @fileoverview Gerenciador de persistência de dados da extensão UrbSync.
 * Este módulo centraliza todas as operações de leitura, escrita e limpeza
 * no armazenamento local do Chrome (chrome.storage.local), garantindo a 
 * integridade dos processos extraídos entre diferentes sessões.
 * @author Victor Kiss
 */

/** * Chave utilizada para identificar o array de processos no storage local.
 * @constant {string} 
 */
const STORAGE_KEY = "proccess_data";

/**
 * Salva uma lista de novos processos no armazenamento local, evitando duplicatas.
 * A unicidade é garantida pela combinação do número do processo e o nome do sistema.
 * * @async
 * @function saveData
 * @param {Array<Object>} newItens - Lista de objetos representando os processos extraídos.
 * @returns {Promise<number>} Retorna a quantidade total de processos armazenados após a operação.
 */
export async function saveData(newItens) {
    /** * Busca os dados atualmente persistidos.
     * @type {Object} 
     */
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    const oldData = result[STORAGE_KEY] || [];

    /** * Filtra os novos itens para garantir que apenas registros inéditos sejam salvos.
     * Verifica se já existe um processo com o mesmo número e sistema no banco.
     */
    const newData = newItens.filter(newProcess => {
        return !oldData.some(old => 
            old.processo === newProcess.processo && 
            old.sistema === newProcess.sistema
        );
    });

    // Se não houver novidades, retorna o total atual sem realizar escrita no disco
    if (newData.length === 0) return oldData.length;

    /** @type {Array<Object>} União dos dados antigos com os novos registros filtrados */
    const updatedData = [...oldData, ...newData];

    // Persiste a lista atualizada no armazenamento local do navegador
    await chrome.storage.local.set({ [STORAGE_KEY]: updatedData });
    
    console.log(`[UrbSync - Storage] Salvo! +${newData.length} novos. Total: ${updatedData.length}`);
    return updatedData.length;
}

/**
 * Recupera todos os processos armazenados na memória da extensão.
 * * @async
 * @function getData
 * @returns {Promise<Array<Object>>} Uma promessa que resolve em um array com todos os processos salvos.
 */
export async function getData() {
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    return result[STORAGE_KEY] || [];
}

/**
 * Remove permanentemente todos os processos salvos do armazenamento local.
 * * @async
 * @function clearData
 * @returns {Promise<void>}
 */
export async function clearData() {
    await chrome.storage.local.remove([STORAGE_KEY]);
    console.log("[UrbSync - Storage] Banco de dados limpo.");

}

