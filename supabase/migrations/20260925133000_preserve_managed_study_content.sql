-- Personal content is managed directly in Supabase; browser saves update study progress.
create or replace function public.preserve_managed_study_content()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  content_key text;
begin
  if current_user = 'authenticated' then
    foreach content_key in array array['voca-app.extra-words.v1', 'voca-app.grammar-questions.v1']
    loop
      if old.state->'entries' ? content_key then
        new.state := jsonb_set(
          new.state,
          '{entries}',
          coalesce(new.state->'entries', '{}'::jsonb) ||
            jsonb_build_object(content_key, old.state->'entries'->content_key),
          true
        );
      end if;
    end loop;
  end if;
  return new;
end;
$$;
create trigger preserve_managed_study_content
before update on public.user_study_state
for each row execute function public.preserve_managed_study_content();

