export const ptBR = {
  // Auth page
  auth: {
    tagline: 'Cada escolha uma renúncia, uma consequência...',
    tapToEnter: 'Toque para entrar',
    login: 'Entrar',
    register: 'Novo',
    nickname: 'Nickname',
    nicknamePlaceholder: 'Seu nickname',
    pin: 'PIN (4 dígitos)',
    inviteCode: 'Código de Convite',
    inviteCodePlaceholder: 'Ex: SKINV1A2B3C',
    chooseNickname: 'Escolha seu Nickname',
    chooseNicknamePlaceholder: 'Seu nickname único',
    createPin: 'Crie um PIN (4 dígitos)',
    noRecoveryTitle: 'Sem recuperação de conta',
    noRecoveryDesc: 'Não existe "esqueci minha senha". Guarde seu <strong>Nickname</strong> e <strong>PIN</strong> em local seguro. Se perder, não há como recuperar.',
    errors: {
      enterNickname: 'Digite seu nickname',
      pinMustBe4: 'PIN deve ter 4 dígitos',
      wrongCredentials: 'Nickname ou PIN incorretos',
      profileNotFound: 'Perfil não encontrado. Registre-se novamente.',
      unexpectedError: 'Erro inesperado',
      invalidInviteCode: 'Código de convite inválido',
      nicknameTooShort: 'Nickname deve ter pelo menos 2 caracteres',
      codeAlreadyUsed: 'Este código de convite já foi utilizado. Peça um novo código.',
      nicknameInUse: 'Este nickname já está em uso.',
      accountCreateError: 'Erro ao criar conta.',
      profileCreateError: 'Erro ao criar perfil: ',
      unexpectedRegister: 'Erro inesperado ao registrar',
    },
  },

  // Lobby
  lobby: {
    year: 'Ano',
    day: 'Dia',
    online: 'online',
    invitedBy: 'Convidado por',
    wins: 'Vitórias',
    races: 'Corridas',
    best: 'Melhor',
    universe: 'Universo',
    skemaBox: 'Skema Box',
    insufficientBalance: 'Saldo insuficiente',
    launchIn: 'LANÇAMENTO EM',
    cancel: 'Cancelar',
    sitAndGo: 'Sit & Go',
    tournaments: 'Torneios',
    training: 'Treinar',
    dna: 'DNA',
    myHistory: 'Meu Histórico',
    transfer: 'Transferir',
    descendancy: 'Descendência',
    players: 'Jogadores',
    noArenas: 'Nenhuma arena disponível no momento',
    errorStarting: 'Erro ao iniciar',
    free: 'Grátis',
    train: 'Treinar',
    freeTraining: 'Treino livre sem custo',
    startTraining: 'Iniciar Treino',
  },

  // Game
  game: {
    rules: 'Regras Oficiais',
    discoverSequence: 'Descubra a sequência secreta de',
    distinctSymbols: '4 símbolos distintos',
    upToAttempts: 'até 8 tentativas',
    noRepetition: 'não permite repetição',
    doesNotChange: 'não muda',
    duringGame: 'durante a partida',
    white: 'Branco: símbolo correto na posição correta',
    gray: 'Cinza: símbolo correto na posição errada',
    symbols: 'Símbolos:',
  },

  // Referral / DNA
  referral: {
    yourDnaCodes: 'Seus Códigos DNA',
    generateCode: 'Gerar Código',
    generating: 'Gerando...',
    history: 'Histórico de Convites',
    pending: 'em transformação',
    used: 'ativo no universo',
    cancelled: 'cancelado',
    shared: 'compartilhado',
    available: 'disponível',
    noCodesYet: 'Nenhum código DNA gerado ainda',
    copyLink: 'Copiar link',
    copied: 'Copiado!',
    shareWith: 'Compartilhar com',
    guestName: 'Nome do convidado',
    guestNamePlaceholder: 'Nome de quem vai receber',
    confirmShare: 'Confirmar e Copiar',
    cancelShare: 'Cancelar',
  },

  // Common
  common: {
    loading: 'Carregando...',
    error: 'Erro',
    close: 'Fechar',
    confirm: 'Confirmar',
    back: 'Voltar',
    next: 'Próximo',
    save: 'Salvar',
    delete: 'Excluir',
    edit: 'Editar',
    search: 'Buscar',
    language: 'Idioma',
  },
};

// Deep string type: all leaf values are string
type DeepStringify<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepStringify<T[K]>;
};

export type TranslationKeys = DeepStringify<typeof ptBR>;
