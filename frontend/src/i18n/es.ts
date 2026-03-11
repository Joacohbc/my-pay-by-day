const es = {
  // ─── Common ──────────────────────────────────────────────────────────────
  common: {
    new: 'Nuevo',
    create: 'Crear',
    update: 'Actualizar',
    delete: 'Eliminar',
    save: 'Guardar',
    saved: 'Guardado correctamente',
    error: 'Ha ocurrido un error',
    close: 'Cerrar',
    cancel: 'Cancelar',
    edit: 'Editar',
    archive: 'Archivar',
    archived: 'Archivado',
    view: 'Ver',
    add: 'Agregar',
    search: 'Buscar',
    sort: 'Ordenar',
    all: 'Todos',
    active: 'Activos',
    none: 'Ninguno',
    name: 'Nombre',
    description: 'Descripción',
    type: 'Tipo',
    optional: 'opcional',
    required: 'Requerido',
    clearFilters: 'Limpiar filtros',
    confirmDelete: '¿Eliminar este {{item}}?',
    confirmDeleteNamed: '¿Eliminar "{{name}}"?',
    nameRequired: 'El nombre es requerido',
    loading: 'Cargando…',
  },

  // ─── Navigation ──────────────────────────────────────────────────────────
  nav: {
    home: 'Inicio',
    activity: 'Actividad',
    wallet: 'Billetera',
    periods: 'Períodos',
    subs: 'Suscrip.',
    profile: 'Perfil',
  },

  // ─── Greetings ───────────────────────────────────────────────────────────
  greeting: {
    morning: 'Buenos días',
    afternoon: 'Buenas tardes',
    evening: 'Buenas noches',
  },

  // ─── Dashboard ───────────────────────────────────────────────────────────
  dashboard: {
    myFinances: 'Mis Finanzas',
    noDefaultPeriod: 'Ningún período seleccionado',
    noDefaultPeriodDesc:
      'Elige un Período de Tiempo para seguir aquí en la pestaña Inicio. Tu selección se guarda localmente.',
    createPeriod: 'Crear un Período',
    selectPeriod: 'Seleccionar un Período',
    newEvent: 'Nuevo Evento',
  },

  // ─── Events ──────────────────────────────────────────────────────────────
  events: {
    title: 'Actividad',
    eventsCount: '{{count}} eventos',
    income: 'Ingresos',
    expenses: 'Gastos',
    transfers: 'Transferencias',
    searchPlaceholder: 'Buscar eventos…',
    noEventsFound: 'No se encontraron eventos',
    noEventsFoundSearch: 'Prueba con otro término de búsqueda',
    noEventsFoundCreate: 'Crea tu primer evento financiero',
    newEvent: 'Nuevo Evento',
    detail: 'Detalle',
    deleteConfirm: '¿Eliminar este evento permanentemente?',
    category: 'Categoría',
    date: 'Fecha',
    receipt: 'Recibo',
    lineItems: 'Partidas',
    noLineItems: 'Sin partidas',
    editEvent: 'Editar Evento',
    newEventTitle: 'Nuevo Evento',
    updateEvent: 'Actualizar Evento',
    createEvent: 'Crear Evento',
    template: 'Plantilla',
    startDate: 'Fecha Inicio',
    endDate: 'Fecha Fin',
  },

  // ─── Event Types ─────────────────────────────────────────────────────────
  eventType: {
    INBOUND: 'Ingreso',
    OUTBOUND: 'Gasto',
    OTHER: 'Transferencia',
  },

  // ─── Event Form ──────────────────────────────────────────────────────────
  eventForm: {
    eventName: 'Nombre del Evento',
    eventNamePlaceholder: 'ej. Cena con amigos',
    description: 'Descripción',
    descriptionPlaceholder: 'Detalles opcionales',
    type: 'Tipo',
    dateTime: 'Fecha y Hora',
    category: 'Categoría',
    tags: 'Etiquetas',
    lineItems: 'Partidas',
    addLineItem: 'Agregar',
    selectNode: 'Seleccionar nodo',
    amount: 'Monto',
    receiptUrl: 'URL del Recibo',
    receiptUrlPlaceholder: 'https://...',
    signedAmountHint:
      'Ingresa montos positivos — los signos se asignan automáticamente por posición. La suma debe ser cero.',
    manualAmountHint:
      'Positivo = entrada al nodo, Negativo = salida del nodo. La suma debe ser cero.',
    nameRequired: 'El nombre es requerido',
    dateRequired: 'La fecha es requerida',
    nodeRequired: 'Requerido',
    amountNonZero: 'Debe ser un número distinto de cero',
    atLeastOneLine: 'Se requiere al menos una partida',
  },

  // ─── Template Picker ────────────────────────────────────────────────────
  templatePicker: {
    title: 'Nuevo Evento',
    fromScratch: 'Desde Cero',
    fromScratchDesc: 'Crear un evento nuevo manualmente',
    templates: 'Plantillas',
  },

  // ─── Nodes ───────────────────────────────────────────────────────────────
  nodes: {
    title: 'Nodos Financieros',
    activeCount: '{{count}} activos',
    noNodesYet: 'Sin nodos aún',
    noNodesDesc: 'Agrega cuentas, entidades externas o contactos',
    addNode: 'Agregar Nodo',
    newNode: 'Nuevo Nodo Financiero',
    createNode: 'Crear Nodo',
    nodeNamePlaceholder: 'ej. Cuenta Bancaria Principal',
    ownAccounts: 'Cuentas Propias',
    externalEntities: 'Entidades Externas',
    contacts: 'Contactos',
    ownAccountType: 'Cuenta Propia (Banco, Efectivo, Crédito)',
    externalType: 'Entidad Externa (Tienda, Empleador)',
    contactType: 'Contacto (Amigo, Familia)',
    ownDesc: 'Tus cuentas bancarias, billeteras, tarjetas de crédito',
    externalDesc: 'Tiendas, empleadores, servicios (gastos/ingresos)',
    contactDesc: 'Amigos/familia — dinero prestado o adeudado',
  },

  // ─── Node Types ──────────────────────────────────────────────────────────
  nodeType: {
    OWN: 'Cuenta Propia',
    EXTERNAL: 'Externo',
    CONTACT: 'Contacto',
  },

  // ─── Categories ──────────────────────────────────────────────────────────
  categories: {
    title: 'Categorías',
    count: '{{count}} categorías',
    noCategories: 'Sin categorías',
    noCategoriesDesc: 'Las categorías ayudan a clasificar tus eventos como partidas presupuestarias',
    addCategory: 'Agregar Categoría',
    newCategory: 'Nueva Categoría',
    editCategory: 'Editar Categoría',
    namePlaceholder: 'ej. Comida, Transporte, Servicios',
    descriptionPlaceholder: 'Descripción opcional',
    deleteConfirm: '¿Eliminar esta categoría?',
  },

  // ─── Tags ────────────────────────────────────────────────────────────────
  tags: {
    title: 'Etiquetas',
    count: '{{count}} etiquetas',
    noTags: 'Sin etiquetas aún',
    noTagsDesc: 'Crea etiquetas para agrupar eventos de diferentes categorías',
    addTag: 'Agregar Etiqueta',
    newTag: 'Nueva Etiqueta',
    editTag: 'Editar Etiqueta',
    tagName: 'Nombre de Etiqueta',
    namePlaceholder: 'ej. Vacaciones2026, Reembolsable',
    descriptionPlaceholder: 'Descripción opcional',
    deleteConfirm: '¿Eliminar esta etiqueta?',
    explanation:
      'Las etiquetas son marcadores transversales (ej. #Vacaciones2026, #Reembolsable) que se pueden aplicar a múltiples eventos para reportes cruzados.',
  },

  // ─── Templates ───────────────────────────────────────────────────────────
  templates: {
    title: 'Plantillas',
    count: '{{count}} plantillas',
    noTemplates: 'Sin plantillas',
    noTemplatesDesc:
      'Las plantillas aceleran la creación de eventos con valores predeterminados y modificadores',
    addTemplate: 'Agregar Plantilla',
    newTemplate: 'Nueva Plantilla',
    editTemplate: 'Editar Plantilla',
    namePlaceholder: 'ej. Uber Trabajo, Compra Supermercado',
    descriptionPlaceholder: 'Descripción opcional',
    deleteConfirm: '¿Eliminar esta plantilla?',
    eventType: 'Tipo de Evento',
    originNode: 'Nodo Origen',
    destinationNode: 'Nodo Destino',
    modifierType: 'Tipo de Modificador',
    modifierValue: 'Valor del Modificador',
    percentage: 'Porcentaje',
    fixed: 'Monto Fijo',
    percentageModifier: '{{value}}% modificador',
    fixedModifier: '+${{value}} fijo',
  },

  // ─── Subscriptions ──────────────────────────────────────────────────────
  subscriptions: {
    title: 'Suscripciones',
    subtitle: 'Acuerdos recurrentes',
    noSubs: 'Sin suscripciones aún',
    noSubsDesc: 'Configura acuerdos recurrentes para automatizar tu seguimiento financiero',
    addSubscription: 'Agregar Suscripción',
    createSubscription: 'Crear Suscripción',
    featureComingSoon: 'Función próximamente',
    featureComingSoonDesc: 'La API de suscripciones aún no está implementada en el backend.',
    howItWorks: 'Cómo Funcionan las Suscripciones',
    howItWorksDesc:
      'Las suscripciones son acuerdos recurrentes vinculados a una Plantilla. Cuando se alcanza un ciclo de facturación, se genera automáticamente un Evento usando esa Plantilla. Úsalas para Netflix, alquiler, gimnasio, salario, etc.',
    infoModalDesc:
      'La función de suscripciones requiere que el backend esté completamente implementado. Una vez disponible, podrás seleccionar una Plantilla, establecer una recurrencia (Diaria, Semanal, Mensual, Anual) y definir una próxima fecha de ejecución.',
    infoModalSubtext:
      'Las plantillas definen los nodos origen/destino predeterminados, categoría, etiquetas y modificadores opcionales de monto (ej. agregar 10% de propina automáticamente).',
    next: 'Próximo',
    recurrence: {
      DAILY: 'Diaria',
      WEEKLY: 'Semanal',
      MONTHLY: 'Mensual',
      YEARLY: 'Anual',
    },
  },

  // ─── Time Periods ───────────────────────────────────────────────────────
  periods: {
    title: 'Períodos de Tiempo',
    count: '{{count}} período',
    count_plural: '{{count}} períodos',
    noPeriods: 'Sin períodos de tiempo aún',
    noPeriodsDesc: 'Crea ventanas presupuestarias para seguir ingresos, gastos y metas de ahorro',
    createPeriod: 'Crear Período',
    newPeriod: 'Nuevo Período de Tiempo',
    editPeriod: 'Editar Período de Tiempo',
    searchPlaceholder: 'Buscar períodos…',
    noMatch: 'Ningún período coincide con tu búsqueda o filtro.',
    infoBanner:
      'Marca con estrella un período para establecerlo como predeterminado en Inicio. Los totales de ingresos y gastos se cargan en segundo plano.',
    startDate: 'Fecha de Inicio',
    endDate: 'Fecha de Fin',
    budgetLimit: 'Límite de Presupuesto (opcional)',
    budgetLimitPlaceholder: 'ej. 3000',
    savingsGoal: 'Meta de Ahorro % (opcional)',
    savingsGoalPlaceholder: 'ej. 20',
    startDateRequired: 'La fecha de inicio es requerida',
    endDateRequired: 'La fecha de fin es requerida',
    namePlaceholder: 'ej. Marzo 2026, Presupuesto Q1',
    // Filters
    active: 'Activos',
    future: 'Futuros',
    past: 'Pasados',
    // Sort
    start: 'Inicio',
    end: 'Fin',
    // Detail
    homeDefault: 'Predeterminado',
    setAsDefault: 'Establecer como predeterminado',
    invalidId: 'ID de período de tiempo inválido',
    // Dashboard sections
    netBalance: 'Balance Neto',
    eventCount: '{{count}} evento',
    eventCount_plural: '{{count}} eventos',
    budget: 'Presupuesto',
    budgetUsed: '{{pct}}% usado',
    savingsGoalLabel: 'Meta de Ahorro',
    actualSavings: 'Ahorro real',
    activity: 'Actividad',
    viewAll: 'Ver todo',
    noEventsInPeriod: 'Sin eventos en este período aún.',
    change: 'Cambiar',
    viewBalance: 'Ver balance',
    budgetLabel: 'Presupuesto',
    savingsLabel: 'Ahorro',
  },

  // ─── Settings ────────────────────────────────────────────────────────────
  settings: {
    title: 'Ajustes',
    dataManagement: 'Gestión de Datos',
    categoriesDesc: 'Partidas de clasificación presupuestaria',
    tagsDesc: 'Etiquetas transversales para eventos',
    nodesDesc: 'Cuentas, entidades, contactos',
    templatesDesc: 'Plantillas para creación rápida de eventos',
    about: 'Acerca de',
    appName: 'MyPayByDay',
    appDesc:
      'Un sistema de finanzas personales de partida doble. Cada Evento envuelve una Transacción cuyas Partidas siempre deben sumar cero — el dinero nunca aparece ni desaparece.',
    backendStack: 'Backend: Quarkus 3.x + SQLite',
    frontendStack: 'Frontend: React + TypeScript + Tailwind CSS',
    language: 'Idioma',
    languageDesc: 'Idioma de la aplicación',
    currency: 'Moneda',
    currencyDesc: 'Moneda utilizada para formatear montos',
    preferences: 'Preferencias',
  },

  // ─── Offline ─────────────────────────────────────────────────────────────
  offline: {
    banner: 'Estás sin conexión — los eventos nuevos se guardarán localmente',
    pendingTitle: 'Pendiente de sincronización ({{count}})',
    pendingSub: 'Estos eventos fueron creados sin conexión y todavía no se enviaron',
    send: 'Enviar',
    sendAll: 'Enviar todos',
    discard: 'Descartar',
    discardAll: 'Descartar todos',
    savedLocally: 'No enviado',
    queuedFeedback: 'Guardado sin conexión — confirmá el envío al reconectarte',
    noConnectionToSend: 'Sin conexión — reconectáte para enviar',
  },

  // ─── Errors ──────────────────────────────────────────────────────────────
  errors: {
    somethingWentWrong: 'Algo salió mal',
    eventNotFound: 'Evento no encontrado',
    couldNotLoadPeriod: 'No se pudieron cargar los datos del período',
  },
} as const;

export default es;
