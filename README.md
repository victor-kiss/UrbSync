# 🏙️ UrbSync - Extrator de Processos

<p align="center">
<img src="src/assets/images/urbsync_thumb.png" alt="UrbSync Cover" width="700">
</p>

## 1. Visão Geral

O **UrbSync** é uma extensão de navegador (Manifest V3) projetada para a Secretaria Municipal de Urbanismo e Licenciamento (SMUL - SP). Sua função primária é a **interoperabilidade de dados**: extrair informações estruturadas dos portais **Aprova Digital** e **SEI**, processá-las em memória e exportá-las para planilhas Excel (.xlsx) formatadas.

---

## 2. Tecnologias e Dependências

* **Linguagem Core:** JavaScript (ES6+).
* **Arquitetura:** Chrome Extension API - Manifest V3.
* **Interface:** Tailwind CSS (via injeção ou popup).
* **Manipulação de Dados:** [ExcelJS](https://github.com/exceljs/exceljs) (Processamento de arquivos em buffer).
* **Estilização de UI:** Ícones e componentes customizados para a identidade visual da SMUL.

---

## 3. Arquitetura e Engenharia de Software

O projeto foi construído sob o paradigma da **Programação Orientada a Objetos (POO)** e segue padrões de projeto (Design Patterns) para garantir que a ferramenta não se torne obsoleta com mudanças nos portais.

### 3.1 Padrões de Projeto Utilizados:

1. **Factory Pattern & Polimorfismo:** A classe `ScraperFactory` decide, em tempo de execução, qual motor de extração utilizar. As classes `SeiScraper` e `AprovaScraper` herdam de uma `BaseScraper`, garantindo que o método `.extract()` seja consistente, independente do site.
2. **Dynamic Import Loader:** Para contornar as restrições de *ES Modules* em *Content Scripts* no Manifest V3, o projeto utiliza um *Bootstrapper* (`loader.js`) que injeta os módulos dinamicamente.
3. **Encapsulamento de API:** A comunicação entre o Popup e a Página foi "promisificada", incluindo tratamento resiliente de erros para falhas de injeção.

---

## 4. Desafios do Manifest V3 e Soluções

A migração para o Manifest V3 impôs restrições de segurança severas que foram contornadas da seguinte forma:

* **Execução do ExcelJS:** Como scripts de conteúdo possuem restrições de CSP (Content Security Policy), o processamento pesado do ExcelJS é delegado ao **Background Service Worker**. Os dados são enviados via mensagens e o download é gerenciado pela API `chrome.downloads`.
* **Isolamento de Contexto:** A extensão utiliza "Isolated Worlds", garantindo que as variáveis do UrbSync não conflitem com os scripts globais do SEI ou Aprova Digital.

---

## 5. Estrutura de Diretórios

```text
/urbsync
│
├── manifest.json                 # Configurações de permissões e segurança
│
├── /src
│   ├── /background
│   │   └── background.js         # Service Worker (Gerencia a API chrome.downloads)
│   │
│   ├── /content
│   │   ├── /core
│   │   │   ├── loader.js         # Bootstrapper para carregamento de módulos
│   │   │   └── actions.js        # Maestro dos eventos na página ativa
│   │   ├── /modules
│   │   │   ├── scrapers/         # Classes polimórficas (Aprova/SEI/Base)
│   │   │   └── detect-route.js   # Lógica de identificação de URL
│   │   └── /services
│   │       └── excel-service.js  # Conversão de dados (Buffer -> Base64)
│   │
│   ├── /popup
│   │   ├── index.html            # Interface de usuário (Painel de controle)
│   │   ├── popup.js              # Listeners e lógica de UI
│   │   └── set-status.js         # Helper para feedback visual (Tailwind)
│   │
│   └── /shared
│       ├── /constants            # Dicionário de seletores CSS (Scraper.js)
│       └── /utils                # Gerenciador de Storage (Local Storage API)
│
└── /assets                       # Recursos visuais (Ícones 16x, 48x, 128x)

```

---

## 6. Fluxo de Dados e Manipulação

1. **Trigger:** O usuário clica em "Extrair" no Popup.
2. **Handshake:** O Popup envia uma mensagem para o `actions.js` via `chrome.tabs.sendMessage`.
3. **Extração:** A `ScraperFactory` identifica o portal, instancia o Scraper correto e varre o DOM ignorando elementos com `display: none`.
4. **Tratamento:** Os dados passam por uma sanitização (limpeza de espaços, formatação de datas e moedas).
5. **Persistência:** Os dados são salvos no `chrome.storage.local`, permitindo acumular processos de diferentes páginas.
6. **Exportação:** O `ExcelJS` gera o arquivo, e o `background.js` dispara o download nativo do navegador.

---

## 7. Guia de Manutenção para a Equipe de T.I.

### Como atualizar seletores quebrados?

Se o Aprova Digital mudar o ID de um campo, não é necessário mexer na lógica core.

* **Arquivo:** `/src/shared/constants/scraper.js`
* **Ação:** Atualize o valor da chave correspondente ao seletor CSS.

### Como adicionar um novo sistema (ex: SLCE)?

1. Crie `SlceScraper.js` em `/scrapers/` herdando de `BaseScraper`.
2. Implemente o método `extract()`.
3. Adicione a nova rota no arquivo `detect-route.js`.

---

## 8. Instalação e Build

Para garantir a integridade dos módulos, siga estes passos:

1. **Dependências:**
```bash
npm install

```


2. **Build de Produção:**
```bash
npm run build

```

3. **Sideloading no Chrome:**
* Acesse `chrome://extensions/`.
* Ative o **Modo do Desenvolvedor**.
* Clique em **Carregar sem compactação** e selecione a pasta raiz.

---

## 9. Segurança e LGPD

O UrbSync foi projetado para ser **Client-Side Only**.

* Nenhum dado sai da máquina do servidor/funcionário para servidores externos.
* A extensão não coleta histórico de navegação fora dos domínios `*.prefeitura.sp.gov.br`.
* O armazenamento local é temporário e pode ser limpo pelo usuário a qualquer momento através da interface da extensão.

---

**Documentação atualizada em:** Fevereiro de 2026
**Responsável:** [Victor Kiss](https://www.linkedin.com/in/victor-kiss) (Desenvolvedor Front-end / SMUL)


---

