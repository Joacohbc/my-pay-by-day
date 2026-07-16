create table category (
    archived boolean not null,
    created_at timestamp,
    id integer,
    updated_at timestamp,
    description varchar(255),
    icon varchar(255),
    name varchar(255) not null,
    primary key (id)
);

create table draft (
    created_at timestamp,
    id integer,
    original_entity_id bigint,
    updated_at timestamp,
    entity_type varchar(255) not null check ((entity_type in ('FINANCE_EVENT','CATEGORY','TAG','FINANCE_NODE'))),
    raw_payload_json TEXT,
    primary key (id)
);

create table duplicate_record (
    amount_score float,
    category_score float,
    date_score float,
    name_score float,
    node_score float,
    score float not null,
    tag_score float,
    calculated_at timestamp not null,
    created_at timestamp,
    entity_id1 bigint not null,
    entity_id2 bigint not null,
    id integer,
    updated_at timestamp,
    record_type varchar(31) not null check ((record_type in ('EVENT','TAG','CATEGORY'))),
    entity_type varchar(255) not null check ((entity_type in ('FINANCE_EVENT','CATEGORY','TAG','FINANCE_NODE'))),
    status varchar(255) not null check ((status in ('PENDING','RESOLVED_MERGED','ACCEPTED_NOT_DUPLICATE','AUTO_RESOLVED_NOT_DUPLICATED'))),
    primary key (id)
);

create table duplicate_detection_settings (
    event_amount_weight float not null,
    event_category_weight float not null,
    event_date_weight float not null,
    event_name_weight float not null,
    event_node_weight float not null,
    event_tag_weight float not null,
    event_time_threshold_minutes integer not null,
    event_total_threshold_score float not null,
    text_similarity_threshold_score float not null,
    created_at timestamp,
    id,
    updated_at timestamp,
    primary key (id)
);

create table file (
    created_at timestamp,
    id integer,
    size bigint not null,
    updated_at timestamp,
    data BLOB,
    file_name varchar(255) not null,
    hash varchar(255),
    markdown_content TEXT,
    mime_type varchar(255) not null,
    primary key (id)
);

create table finance_event_file (
    event_id bigint not null,
    file_id bigint not null,
    primary key (event_id, file_id)
);

create table finance_event_finance_event (
    event_id bigint not null,
    related_event_id bigint not null,
    primary key (event_id, related_event_id)
);

create table finance_event_tag (
    event_id bigint not null,
    tag_id bigint not null,
    primary key (event_id, tag_id)
);

create table finance_event (
    category_id bigint,
    created_at timestamp,
    id integer,
    subscription_id bigint,
    transaction_id bigint unique,
    updated_at timestamp,
    description varchar(255),
    name varchar(255) not null,
    type varchar(255) not null check ((type in ('INBOUND','OUTBOUND','OTHER'))),
    primary key (id)
);

create table finance_line_item (
    created_at timestamp,
    finance_node_id bigint not null,
    id integer,
    transaction_id bigint,
    updated_at timestamp,
    amount TEXT not null,
    primary key (id)
);

create table finance_node (
    archived boolean not null,
    created_at timestamp,
    id integer,
    updated_at timestamp,
    description varchar(255),
    icon varchar(255),
    name varchar(255) not null,
    type varchar(255) not null check ((type in ('OWN','EXTERNAL','CONTACT'))),
    primary key (id)
);

create table finance_transaction (
    created_at timestamp,
    id integer,
    transaction_date timestamp not null,
    updated_at timestamp,
    primary key (id)
);

create table selection_history (
    created_at timestamp,
    entity_id bigint not null,
    id integer,
    selected_at timestamp not null,
    selection_count bigint not null,
    updated_at timestamp,
    entity_type varchar(255) not null check ((entity_type in ('FINANCE_EVENT','CATEGORY','TAG','FINANCE_NODE'))),
    primary key (id)
);

create table subscription (
    modifier_value numeric(38,2),
    category_id bigint,
    created_at timestamp,
    destination_node_id bigint,
    id integer,
    next_execution_date timestamp not null,
    origin_node_id bigint,
    updated_at timestamp,
    description varchar(255),
    event_type varchar(255) check ((event_type in ('INBOUND','OUTBOUND','OTHER'))),
    name varchar(255) not null,
    recurrence varchar(255) not null check ((recurrence in ('DAILY','WEEKLY','MONTHLY','YEARLY'))),
    status varchar(255) not null check ((status in ('ACTIVE','CANCELLED'))),
    primary key (id)
);

create table subscription_tag (
    subscription_id bigint not null,
    tag_id bigint not null,
    primary key (subscription_id, tag_id)
);

create table system_job (
    created_at timestamp,
    id integer,
    next_execution_date timestamp not null,
    updated_at timestamp,
    entity_id varchar(255),
    job_category varchar(255) not null check ((job_category in ('SUBSCRIPTION_PROCESSOR','DUPLICATE_DETECTION'))),
    message varchar(255),
    status varchar(255) not null check ((status in ('PENDING','COMPLETED','FAILED'))),
    primary key (id)
);

create table tag (
    archived boolean not null,
    created_at timestamp,
    id integer,
    updated_at timestamp,
    description varchar(255),
    name varchar(255) not null,
    primary key (id)
);

create table tag_group_tag (
    tag_group_id bigint not null,
    tag_id bigint not null,
    primary key (tag_group_id, tag_id)
);

create table tag_group (
    archived boolean not null,
    created_at timestamp,
    id integer,
    updated_at timestamp,
    description varchar(255),
    icon varchar(255),
    name varchar(255) not null,
    primary key (id)
);

create table template (
    modifier_value numeric(38,2),
    category_id bigint,
    created_at timestamp,
    destination_node_id bigint,
    id integer,
    origin_node_id bigint,
    updated_at timestamp,
    description varchar(255),
    event_type varchar(255) check ((event_type in ('INBOUND','OUTBOUND','OTHER'))),
    modifier_type varchar(255) check ((modifier_type in ('FIXED','PERCENTAGE'))),
    name varchar(255) not null,
    primary key (id)
);

create table template_tag (
    tag_id bigint not null,
    template_id bigint not null,
    primary key (tag_id, template_id)
);

create table time_period (
    budget_limit numeric(38,2),
    savings_percentage_goal numeric(38,2),
    created_at timestamp,
    end_date timestamp not null,
    id integer,
    start_date timestamp not null,
    updated_at timestamp,
    name varchar(255) not null,
    primary key (id)
);

create table time_period_budget (
    budgeted_amount numeric(38,2) not null,
    category_id bigint not null,
    created_at timestamp,
    id integer,
    time_period_id bigint not null,
    updated_at timestamp,
    primary key (id)
);

create index if not exists idx_finance_line_item_transaction on finance_line_item (transaction_id);
create index if not exists idx_finance_line_item_node on finance_line_item (finance_node_id);
create index if not exists idx_finance_event_transaction on finance_event (transaction_id);
create index if not exists idx_finance_event_category on finance_event (category_id);
create index if not exists idx_event_tag_event on finance_event_tag (event_id);
create index if not exists idx_event_tag_tag on finance_event_tag (tag_id);
create index if not exists idx_finance_transaction_date on finance_transaction (transaction_date);
create index if not exists idx_time_period_dates on time_period (start_date, end_date);
create index if not exists idx_duplicate_record_type_status_entity1 on duplicate_record (entity_type, status, entity_id1);
create index if not exists idx_duplicate_record_type_entity_pair on duplicate_record (entity_type, entity_id1, entity_id2);
