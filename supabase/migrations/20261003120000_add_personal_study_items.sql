-- Append under a row lock so stale browser sync cannot overwrite personal content.
create or replace function public.add_personal_study_item(item_kind text, item jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  saved_state jsonb;
  content jsonb;
  content_key text;
  array_key text;
  field_name text;
begin
  if owner_id is null then raise exception '로그인이 필요합니다'; end if;
  if item_kind = 'extra' then
    content_key := 'voca-app.extra-words.v1'; array_key := 'words';
    foreach field_name in array array['id', 'word', 'meaning'] loop
      if jsonb_typeof(item->field_name) is distinct from 'string' or btrim(item->>field_name) = '' then
        raise exception '필수 단어 입력값이 없습니다: %', field_name;
      end if;
    end loop;
    if coalesce(btrim(item->>'example'), '') <> '' and coalesce(btrim(item->>'exampleMeaning'), '') = '' then
      raise exception '예문 전체 뜻을 입력하세요';
    end if;
  elsif item_kind = 'grammar' then
    content_key := 'voca-app.grammar-questions.v1'; array_key := 'questions';
    foreach field_name in array array['id', 'underlined', 'explanation'] loop
      if jsonb_typeof(item->field_name) is distinct from 'string' or btrim(item->>field_name) = '' then
        raise exception '필수 문법 입력값이 없습니다: %', field_name;
      end if;
    end loop;
    if jsonb_typeof(item->'before') is distinct from 'string'
       or jsonb_typeof(item->'after') is distinct from 'string'
       or jsonb_typeof(item->'isCorrect') is distinct from 'boolean' then
      raise exception '문법 문제 형식이 올바르지 않습니다';
    end if;
    if item->>'isCorrect' = 'false' and coalesce(btrim(item->>'correction'), '') = '' then
      raise exception '올바른 표현을 입력하세요';
    end if;
  else raise exception '등록 종류가 올바르지 않습니다';
  end if;
  if (item->>'id') !~ '^[a-zA-Z0-9_-]+$' or octet_length(item::text) > 20000 then
    raise exception '입력값이 너무 길거나 ID가 올바르지 않습니다';
  end if;
  foreach field_name in array array['example', 'exampleMeaning', 'note', 'source', 'correction'] loop
    if item ? field_name and jsonb_typeof(item->field_name) is distinct from 'string' then
      raise exception '입력값은 문자열이어야 합니다: %', field_name;
    end if;
  end loop;
  insert into public.user_study_state(user_id, state)
  values(owner_id, '{"version":1,"entries":{}}'::jsonb)
  on conflict(user_id) do nothing;
  select state into saved_state from public.user_study_state where user_id = owner_id for update;
  content := coalesce((saved_state->'entries'->>content_key)::jsonb, jsonb_build_object(array_key, '[]'::jsonb));
  if exists(select 1 from jsonb_array_elements(content->array_key) existing
    where existing->>'id' = item->>'id'
       or (item_kind = 'extra' and lower(btrim(existing->>'word')) = lower(btrim(item->>'word')))) then
    raise exception '이미 등록된 항목입니다';
  end if;
  content := jsonb_set(content, array[array_key], (content->array_key) || jsonb_build_array(item));
  saved_state := jsonb_set(saved_state, '{entries}', coalesce(saved_state->'entries', '{}'::jsonb)
    || jsonb_build_object(content_key, content::text));
  update public.user_study_state set state = saved_state, updated_at = now() where user_id = owner_id;
  return content;
end;
$$;
revoke all on function public.add_personal_study_item(text, jsonb) from public, anon;
grant execute on function public.add_personal_study_item(text, jsonb) to authenticated;
