-- Flyway Migration V4: Shrink `color` columns to match RegexValidator.COLOR_MAX_LENGTH (7, e.g. "#RRGGBB").
-- SQLite has no ALTER COLUMN; use the create-new-table -> copy -> drop -> rename pattern.

CREATE TABLE category_new (
    archived boolean not null,
    created_at timestamp,
    id integer,
    updated_at timestamp,
    description varchar(255),
    icon varchar(255),
    name varchar(255) not null,
    color varchar(7),
    primary key (id)
);
INSERT INTO category_new (archived, created_at, id, updated_at, description, icon, name, color)
SELECT archived, created_at, id, updated_at, description, icon, name, color FROM category;
DROP TABLE category;
ALTER TABLE category_new RENAME TO category;

CREATE TABLE tag_new (
    archived boolean not null,
    created_at timestamp,
    id integer,
    updated_at timestamp,
    description varchar(255),
    name varchar(255) not null,
    color varchar(7),
    primary key (id)
);
INSERT INTO tag_new (archived, created_at, id, updated_at, description, name, color)
SELECT archived, created_at, id, updated_at, description, name, color FROM tag;
DROP TABLE tag;
ALTER TABLE tag_new RENAME TO tag;

CREATE TABLE finance_node_new (
    archived boolean not null,
    created_at timestamp,
    id integer,
    updated_at timestamp,
    description varchar(255),
    icon varchar(255),
    name varchar(255) not null,
    type varchar(255) not null check ((type in ('OWN','EXTERNAL','CONTACT'))),
    color varchar(7),
    primary key (id)
);
INSERT INTO finance_node_new (archived, created_at, id, updated_at, description, icon, name, type, color)
SELECT archived, created_at, id, updated_at, description, icon, name, type, color FROM finance_node;
DROP TABLE finance_node;
ALTER TABLE finance_node_new RENAME TO finance_node;
