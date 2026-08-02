-- duplicate_detection_settings.id was declared without a type in the baseline, so SQLite never
-- treated it as a rowid alias: IDENTITY generation wrote NULL into every row and the settings row
-- could never be read back, leaving a new orphan row behind on every request. SQLite cannot alter a
-- column type, so the table is recreated and the newest row (if any) is carried over as the single
-- settings row this table is meant to hold.

create table duplicate_detection_settings_new (
    id integer,
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
    updated_at timestamp,
    primary key (id)
);

insert into duplicate_detection_settings_new (
    id,
    event_amount_weight,
    event_category_weight,
    event_date_weight,
    event_name_weight,
    event_node_weight,
    event_tag_weight,
    event_time_threshold_minutes,
    event_total_threshold_score,
    text_similarity_threshold_score,
    created_at,
    updated_at)
select
    1,
    event_amount_weight,
    event_category_weight,
    event_date_weight,
    event_name_weight,
    event_node_weight,
    event_tag_weight,
    event_time_threshold_minutes,
    event_total_threshold_score,
    text_similarity_threshold_score,
    created_at,
    updated_at
from duplicate_detection_settings
order by rowid desc
limit 1;

drop table duplicate_detection_settings;

alter table duplicate_detection_settings_new rename to duplicate_detection_settings;
