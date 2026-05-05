-- Add a user-defined ordering column for drag-to-reorder.
-- double precision so we can insert between two items by averaging.
alter table todos
  add column position double precision not null default 0;

-- Backfill existing rows: order by created_at within each user.
with ordered as (
  select id, row_number() over (partition by user_id order by created_at) as rn
  from todos
)
update todos t
set position = ordered.rn
from ordered
where t.id = ordered.id;
