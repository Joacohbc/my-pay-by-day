const en = {
  // ─── Common ──────────────────────────────────────────────────────────────
  common: {
    new: 'New',
    create: 'Create',
    update: 'Update',
    delete: 'Delete',
    save: 'Save',
    saved: 'Saved successfully',
    error: 'An error occurred',
    close: 'Close',
    cancel: 'Cancel',
    edit: 'Edit',
    archive: 'Archive',
    archived: 'Archived',
    view: 'View',
    add: 'Add',
    search: 'Search',
    sort: 'Sort',
    all: 'All',
    active: 'Active',
    none: 'None',
    name: 'Name',
    description: 'Description',
    type: 'Type',
    optional: 'optional',
    required: 'Required',
    clearFilters: 'Clear filters',
    confirmDelete: 'Delete this {{item}}?',
    confirmDeleteNamed: 'Delete "{{name}}"?',
    nameRequired: 'Name is required',
    loading: 'Loading…',
  },

  // ─── Navigation ──────────────────────────────────────────────────────────
  nav: {
    home: 'Home',
    activity: 'Activity',
    wallet: 'Wallet',
    periods: 'Periods',
    subs: 'Subs',
    profile: 'Profile',
  },

  // ─── Greetings ───────────────────────────────────────────────────────────
  greeting: {
    morning: 'Good morning',
    afternoon: 'Good afternoon',
    evening: 'Good evening',
  },

  // ─── Dashboard ───────────────────────────────────────────────────────────
  dashboard: {
    myFinances: 'My Finances',
    noDefaultPeriod: 'No default period set',
    noDefaultPeriodDesc:
      'Choose a Time Period to track here on the Home tab. Your selection is saved locally.',
    createPeriod: 'Create a Period',
    selectPeriod: 'Select a Period',
    newEvent: 'New Event',
  },

  // ─── Events ──────────────────────────────────────────────────────────────
  events: {
    title: 'Activity',
    eventsCount: '{{count}} events',
    income: 'Income',
    expenses: 'Expenses',
    transfers: 'Transfers',
    searchPlaceholder: 'Search events…',
    noEventsFound: 'No events found',
    noEventsFoundSearch: 'Try a different search term',
    noEventsFoundCreate: 'Create your first financial event',
    newEvent: 'New Event',
    detail: 'Detail',
    deleteConfirm: 'Delete this event permanently?',
    category: 'Category',
    date: 'Date',
    receipt: 'Receipt',
    lineItems: 'Line Items',
    noLineItems: 'No line items',
    editEvent: 'Edit Event',
    newEventTitle: 'New Event',
    updateEvent: 'Update Event',
    createEvent: 'Create Event',
    template: 'Template',
    startDate: 'Start Date',
    endDate: 'End Date',
  },

  // ─── Event Types ─────────────────────────────────────────────────────────
  eventType: {
    INBOUND: 'Income',
    OUTBOUND: 'Expense',
    OTHER: 'Transfer',
  },

  // ─── Event Form ──────────────────────────────────────────────────────────
  eventForm: {
    eventName: 'Event Name',
    eventNamePlaceholder: 'e.g. Dinner with friends',
    description: 'Description',
    descriptionPlaceholder: 'Optional details',
    type: 'Type',
    dateTime: 'Date & Time',
    category: 'Category',
    tags: 'Tags',
    lineItems: 'Line Items',
    addLineItem: 'Add',
    selectNode: 'Select node',
    amount: 'Amount',
    receiptUrl: 'Receipt URL',
    receiptUrlPlaceholder: 'https://...',
    signedAmountHint:
      'Enter positive amounts — signs are assigned automatically by position. Sum must equal zero.',
    manualAmountHint:
      'Positive = inflow to node, Negative = outflow from node. Sum must equal zero.',
    nameRequired: 'Name is required',
    dateRequired: 'Date is required',
    nodeRequired: 'Required',
    amountNonZero: 'Must be a non-zero number',
    atLeastOneLine: 'At least one line item required',
  },

  // ─── Template Picker ────────────────────────────────────────────────────
  templatePicker: {
    title: 'New Event',
    fromScratch: 'From Scratch',
    fromScratchDesc: 'Create a new event manually',
    templates: 'Templates',
  },

  // ─── Nodes ───────────────────────────────────────────────────────────────
  nodes: {
    title: 'Finance Nodes',
    activeCount: '{{count}} active',
    noNodesYet: 'No nodes yet',
    noNodesDesc: 'Add accounts, external entities, or contacts',
    addNode: 'Add Node',
    newNode: 'New Finance Node',
    createNode: 'Create Node',
    nodeNamePlaceholder: 'e.g. Main Bank Account',
    ownAccounts: 'Own Accounts',
    externalEntities: 'External Entities',
    contacts: 'Contacts',
    ownAccountType: 'Own Account (Bank, Cash, Credit)',
    externalType: 'External Entity (Shop, Employer)',
    contactType: 'Contact (Friend, Family)',
    ownDesc: 'Your bank accounts, wallets, credit cards',
    externalDesc: 'Shops, employers, services (expenses/income)',
    contactDesc: 'Friends/family — money owed or lent',
  },

  // ─── Node Types ──────────────────────────────────────────────────────────
  nodeType: {
    OWN: 'Own Account',
    EXTERNAL: 'External',
    CONTACT: 'Contact',
  },

  // ─── Categories ──────────────────────────────────────────────────────────
  categories: {
    title: 'Categories',
    count: '{{count}} categories',
    noCategories: 'No categories',
    noCategoriesDesc: 'Categories help classify your events as budget buckets',
    addCategory: 'Add Category',
    newCategory: 'New Category',
    editCategory: 'Edit Category',
    namePlaceholder: 'e.g. Food, Transport, Utilities',
    descriptionPlaceholder: 'Optional description',
    deleteConfirm: 'Delete this category?',
  },

  // ─── Tags ────────────────────────────────────────────────────────────────
  tags: {
    title: 'Tags',
    count: '{{count}} tags',
    noTags: 'No tags yet',
    noTagsDesc: 'Create tags to group events across different categories',
    addTag: 'Add Tag',
    newTag: 'New Tag',
    editTag: 'Edit Tag',
    tagName: 'Tag Name',
    namePlaceholder: 'e.g. Vacation2026, Reimbursable',
    descriptionPlaceholder: 'Optional description',
    deleteConfirm: 'Delete this tag?',
    explanation:
      'Tags are transversal labels (e.g. #Vacation2026, #Reimbursable) that can be applied to multiple events for cross-cutting reports.',
  },

  // ─── Templates ───────────────────────────────────────────────────────────
  templates: {
    title: 'Templates',
    count: '{{count}} templates',
    noTemplates: 'No templates',
    noTemplatesDesc:
      'Templates speed up event creation with pre-configured defaults and modifiers',
    addTemplate: 'Add Template',
    newTemplate: 'New Template',
    editTemplate: 'Edit Template',
    namePlaceholder: 'e.g. Work Uber, Grocery Run',
    descriptionPlaceholder: 'Optional description',
    deleteConfirm: 'Delete this template?',
    eventType: 'Event Type',
    originNode: 'Origin Node',
    destinationNode: 'Destination Node',
    modifierType: 'Modifier Type',
    modifierValue: 'Modifier Value',
    percentage: 'Percentage',
    fixed: 'Fixed Amount',
    percentageModifier: '{{value}}% modifier',
    fixedModifier: '+${{value}} fixed',
  },

  // ─── Subscriptions ──────────────────────────────────────────────────────
  subscriptions: {
    title: 'Subscriptions',
    subtitle: 'Recurring agreements',
    noSubs: 'No subscriptions yet',
    noSubsDesc: 'Set up recurring agreements to automate your financial tracking',
    addSubscription: 'Add Subscription',
    createSubscription: 'Create Subscription',
    featureComingSoon: 'Feature coming soon',
    featureComingSoonDesc: 'The subscriptions API is not yet implemented in the backend.',
    howItWorks: 'How Subscriptions Work',
    howItWorksDesc:
      'Subscriptions are recurring agreements linked to a Template. When a billing cycle is reached, an Event is automatically generated using that Template. Use them for Netflix, rent, gym, salary, etc.',
    infoModalDesc:
      'The subscriptions feature requires the backend to be fully implemented. Once available, you\'ll be able to select a Template, set a recurrence (Daily, Weekly, Monthly, Yearly), and define a next execution date.',
    infoModalSubtext:
      'Templates define the default origin/destination nodes, category, tags, and optional amount modifiers (e.g. auto-add 10% tip).',
    next: 'Next',
    recurrence: {
      DAILY: 'Daily',
      WEEKLY: 'Weekly',
      MONTHLY: 'Monthly',
      YEARLY: 'Yearly',
    },
  },

  // ─── Time Periods ───────────────────────────────────────────────────────
  periods: {
    title: 'Time Periods',
    count: '{{count}} period',
    count_plural: '{{count}} periods',
    noPeriods: 'No time periods yet',
    noPeriodsDesc: 'Create budget windows to track income, spending, and savings goals',
    createPeriod: 'Create Period',
    newPeriod: 'New Time Period',
    editPeriod: 'Edit Time Period',
    searchPlaceholder: 'Search periods…',
    noMatch: 'No periods match your search or filter.',
    infoBanner:
      'Star a period to set it as your Home default. Income & expense totals load in the background.',
    startDate: 'Start Date',
    endDate: 'End Date',
    budgetLimit: 'Budget Limit (optional)',
    budgetLimitPlaceholder: 'e.g. 3000',
    savingsGoal: 'Savings Goal % (optional)',
    savingsGoalPlaceholder: 'e.g. 20',
    startDateRequired: 'Start date is required',
    endDateRequired: 'End date is required',
    namePlaceholder: 'e.g. March 2026, Q1 Budget',
    // Filters
    active: 'Active',
    future: 'Future',
    past: 'Past',
    // Sort
    start: 'Start',
    end: 'End',
    // Detail
    homeDefault: 'Home default',
    setAsDefault: 'Set as default',
    invalidId: 'Invalid time period ID',
    // Dashboard sections
    netBalance: 'Net Balance',
    eventCount: '{{count}} event',
    eventCount_plural: '{{count}} events',
    budget: 'Budget',
    budgetUsed: '{{pct}}% used',
    savingsGoalLabel: 'Savings Goal',
    actualSavings: 'Actual savings',
    activity: 'Activity',
    viewAll: 'View all',
    noEventsInPeriod: 'No events in this period yet.',
    change: 'Change',
    viewBalance: 'View balance',
    budgetLabel: 'Budget',
    savingsLabel: 'Savings',
  },

  // ─── Settings ────────────────────────────────────────────────────────────
  settings: {
    title: 'Settings',
    dataManagement: 'Data Management',
    categoriesDesc: 'Budget classification buckets',
    tagsDesc: 'Transversal labels for events',
    nodesDesc: 'Accounts, entities, contacts',
    templatesDesc: 'Blueprints for rapid event creation',
    about: 'About',
    appName: 'MyPayByDay',
    appDesc:
      'A double-entry personal finance system. Every Event wraps a Transaction whose Line Items must always sum to zero — money never appears or disappears.',
    backendStack: 'Backend: Quarkus 3.x + SQLite',
    frontendStack: 'Frontend: React + TypeScript + Tailwind CSS',
    language: 'Language',
    languageDesc: 'App display language',
    currency: 'Currency',
    currencyDesc: 'Currency used for formatting amounts',
    preferences: 'Preferences',
  },

  // ─── Offline ─────────────────────────────────────────────────────────────
  offline: {
    banner: 'You are offline — new events will be saved locally',
    pendingTitle: 'Pending sync ({{count}})',
    pendingSub: 'These events were created offline and have not been sent yet',
    send: 'Send',
    sendAll: 'Send all',
    discard: 'Discard',
    discardAll: 'Discard all',
    savedLocally: 'Not sent',
    queuedFeedback: 'Saved offline — confirm sync when you reconnect',
    noConnectionToSend: 'No connection — reconnect to send',
  },

  // ─── Errors ──────────────────────────────────────────────────────────────
  errors: {
    somethingWentWrong: 'Something went wrong',
    eventNotFound: 'Event not found',
    couldNotLoadPeriod: 'Could not load period data',
  },
} as const;

export default en;
