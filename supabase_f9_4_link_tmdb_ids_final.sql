-- ==============================================================================
-- LANTERNA MÁGICA — FASE 9: VINCULAÇÃO DEFINITIVA DO ACERVO AO TMDB
-- Arquivo: supabase_f9_4_link_tmdb_ids_final.sql
-- Manifesto de Origem: acervo_tmdb_link_manifest_final.json (SHA-256: 374ef2056f1d87d1981f88b514dbf8f2312a4f7dfb030c01dcda714036d94e9c)
-- Regras Estritas:
--   1. Atualização estritamente por UUID interno (id).
--   2. tmdb_synced_at permanece ESTRITAMENTE NULL.
--   3. Validação defensiva transacional com ASSERTIONS.
-- ==============================================================================

BEGIN;

-- 1. VINCULAÇÃO DE FILMES (11 registros)
UPDATE public.filmes
SET tmdb_id = 1339713
WHERE id = '0248e063-5c69-4527-9813-6a374b216825'::uuid;

UPDATE public.filmes
SET tmdb_id = 1384216
WHERE id = '04ae3ecd-10ca-4b8b-835b-05820bc045c0'::uuid;

UPDATE public.filmes
SET tmdb_id = 1368337
WHERE id = '1b32374e-d28c-41ac-bcd1-4cb8792c2764'::uuid;

UPDATE public.filmes
SET tmdb_id = 797
WHERE id = '3ecb01f8-41d3-45ae-b0cd-be7c25d1048a'::uuid;

UPDATE public.filmes
SET tmdb_id = 15121
WHERE id = '449a8c24-1901-4df1-a3fa-6de1f2edf934'::uuid;

UPDATE public.filmes
SET tmdb_id = 313369
WHERE id = '971fea96-855e-45f2-a962-0e98cd00d4de'::uuid;

UPDATE public.filmes
SET tmdb_id = 1433367
WHERE id = 'b5091b5f-a2e4-4a5a-9794-b9b253f28745'::uuid;

UPDATE public.filmes
SET tmdb_id = 1101383
WHERE id = 'b518c724-96cb-4862-9662-cc66d2fa19d9'::uuid;

UPDATE public.filmes
SET tmdb_id = 1178602
WHERE id = 'c224f859-7888-4424-9566-be58a9619cae'::uuid;

UPDATE public.filmes
SET tmdb_id = 950028
WHERE id = 'c39a1a2d-b86f-403e-a4d6-95c6c1f330c5'::uuid;

UPDATE public.filmes
SET tmdb_id = 969681
WHERE id = 'fffa6c06-dd44-46c0-bfcd-875dd2e10f06'::uuid;

-- 2. VINCULAÇÃO DE PESSOAS (89 registros)
UPDATE public.pessoas
SET tmdb_id = 2823609
WHERE id = '0062e3da-5591-49a9-9f1b-c2e0e757b72f'::uuid;

UPDATE public.pessoas
SET tmdb_id = 113461
WHERE id = '08640665-6ec4-4a36-828e-d3cc4830644a'::uuid;

UPDATE public.pessoas
SET tmdb_id = 19274
WHERE id = '08bd243f-29d7-4d50-932c-4468baa7b7be'::uuid;

UPDATE public.pessoas
SET tmdb_id = 2463999
WHERE id = '0a8daa6d-dec9-445c-a82e-759338949f47'::uuid;

UPDATE public.pessoas
SET tmdb_id = 2332
WHERE id = '0c27c8d1-e668-48fb-94bd-1ed42f7b0d64'::uuid;

UPDATE public.pessoas
SET tmdb_id = 2381985
WHERE id = '0e132240-b399-438b-8d50-00e369d5aa50'::uuid;

UPDATE public.pessoas
SET tmdb_id = 2340
WHERE id = '0eda86a0-0d81-4489-8959-d76b1d7108f4'::uuid;

UPDATE public.pessoas
SET tmdb_id = 19
WHERE id = '0f05fd0b-6c69-4b54-a256-b652d9c8478d'::uuid;

UPDATE public.pessoas
SET tmdb_id = 1561370
WHERE id = '13166ba9-325f-43b1-b5a3-811f812c2c71'::uuid;

UPDATE public.pessoas
SET tmdb_id = 11918
WHERE id = '15f584ea-16d8-4f35-a6ee-9fc10481a33f'::uuid;

UPDATE public.pessoas
SET tmdb_id = 2044745
WHERE id = '1738cb74-8171-47d4-9244-c0666d3d3d8a'::uuid;

UPDATE public.pessoas
SET tmdb_id = 5823
WHERE id = '1bbeb4d3-29d2-4012-a003-163fc6ab7e0e'::uuid;

UPDATE public.pessoas
SET tmdb_id = 1892
WHERE id = '2311dbc4-3632-4c4c-b8d3-458f0a946c5e'::uuid;

UPDATE public.pessoas
SET tmdb_id = 578
WHERE id = '23791fcf-1a50-4951-9cc1-bb80c0a0b535'::uuid;

UPDATE public.pessoas
SET tmdb_id = 1373737
WHERE id = '23c977f6-3977-4933-bcd8-48eab578ad50'::uuid;

UPDATE public.pessoas
SET tmdb_id = 1144604
WHERE id = '2ed62b99-99e9-4c85-bb45-b7325a48b214'::uuid;

UPDATE public.pessoas
SET tmdb_id = 6649
WHERE id = '2ef39893-120a-42cb-a9c2-3d461dd47598'::uuid;

UPDATE public.pessoas
SET tmdb_id = 529
WHERE id = '2f1096f4-a03d-4b11-8149-4a5f243f2452'::uuid;

UPDATE public.pessoas
SET tmdb_id = 894116
WHERE id = '3162c028-966b-4873-8a27-0ca395bf2bb5'::uuid;

UPDATE public.pessoas
SET tmdb_id = 7331
WHERE id = '325aece6-8c12-4e0a-9d07-20e047d3554a'::uuid;

UPDATE public.pessoas
SET tmdb_id = 1903874
WHERE id = '389b2501-553b-49ec-84d8-cc48f44cdd2d'::uuid;

UPDATE public.pessoas
SET tmdb_id = 1227717
WHERE id = '3ace0c06-1f6e-4730-b3a0-4eafe05acb30'::uuid;

UPDATE public.pessoas
SET tmdb_id = 2390
WHERE id = '3f11fef3-b318-4220-bb24-ad2b717add6f'::uuid;

UPDATE public.pessoas
SET tmdb_id = 92691
WHERE id = '3ff0cbdc-a69a-4693-90fe-fd8551aed4f8'::uuid;

UPDATE public.pessoas
SET tmdb_id = 29095
WHERE id = '40a84d21-67c2-4fc0-8d29-f987becc2868'::uuid;

UPDATE public.pessoas
SET tmdb_id = 82511
WHERE id = '44bab1d8-90eb-4913-8894-9301f7ead4ad'::uuid;

UPDATE public.pessoas
SET tmdb_id = 1243355
WHERE id = '489f0aba-3f4d-494c-b958-9156643e856c'::uuid;

UPDATE public.pessoas
SET tmdb_id = 1041410
WHERE id = '4c73ef52-1481-4d11-b727-5af80360b7a9'::uuid;

UPDATE public.pessoas
SET tmdb_id = 505710
WHERE id = '4c9577d1-dfb4-411b-9307-c78d7c16bed0'::uuid;

UPDATE public.pessoas
SET tmdb_id = 1597840
WHERE id = '54ffba65-0b9c-4ac2-8e13-684cd144e4d4'::uuid;

UPDATE public.pessoas
SET tmdb_id = 35382
WHERE id = '596075dc-44eb-4be1-8539-179be30eb09d'::uuid;

UPDATE public.pessoas
SET tmdb_id = 1649152
WHERE id = '5ad7868c-ae34-4ccd-a5f9-69826b99d56e'::uuid;

UPDATE public.pessoas
SET tmdb_id = 1137824
WHERE id = '5eead754-f5f5-43ad-9f13-38c1cba4861a'::uuid;

UPDATE public.pessoas
SET tmdb_id = 30082
WHERE id = '5f0eb385-46d7-4ebd-b4bf-10221574fb73'::uuid;

UPDATE public.pessoas
SET tmdb_id = 1136406
WHERE id = '5f34c43b-2701-415b-b85a-32e9e4f98ae6'::uuid;

UPDATE public.pessoas
SET tmdb_id = 1194314
WHERE id = '62479ced-a10d-421c-8e8a-4c9650f8d943'::uuid;

UPDATE public.pessoas
SET tmdb_id = 84706
WHERE id = '640b7c5d-5227-4e87-b73e-d31d1c6c8817'::uuid;

UPDATE public.pessoas
SET tmdb_id = 28637
WHERE id = '65c8e5bd-f9ac-4fc5-85fc-09631299788f'::uuid;

UPDATE public.pessoas
SET tmdb_id = 6885
WHERE id = '6687f7fb-1788-4478-83b6-176eefef5f61'::uuid;

UPDATE public.pessoas
SET tmdb_id = 21625
WHERE id = '66f47901-f35a-4840-9c25-06ba3c620c85'::uuid;

UPDATE public.pessoas
SET tmdb_id = 6648
WHERE id = '69b7be65-79ba-4297-bb48-08b7102ebf16'::uuid;

UPDATE public.pessoas
SET tmdb_id = 1154054
WHERE id = '6d9e3c31-5d18-4940-acdf-3059ebc1da16'::uuid;

UPDATE public.pessoas
SET tmdb_id = 1419065
WHERE id = '6f1d6606-43e2-4019-8279-896445903b83'::uuid;

UPDATE public.pessoas
SET tmdb_id = 2034418
WHERE id = '6f714726-a5e7-41f6-890d-dda513794dff'::uuid;

UPDATE public.pessoas
SET tmdb_id = 27578
WHERE id = '72988817-eea2-4188-b243-c04ca2ddb10e'::uuid;

UPDATE public.pessoas
SET tmdb_id = 2028037
WHERE id = '75715ec7-0fb5-4bdd-acb7-10f47b8565a0'::uuid;

UPDATE public.pessoas
SET tmdb_id = 525
WHERE id = '79f25338-c604-4a3b-9818-9b5cc21aec95'::uuid;

UPDATE public.pessoas
SET tmdb_id = 1525043
WHERE id = '7a7b726b-1acd-4779-aee0-e8ab2109ec67'::uuid;

UPDATE public.pessoas
SET tmdb_id = 1150
WHERE id = '7c9ad357-35f7-4005-a1e9-30f2f3f54bbd'::uuid;

UPDATE public.pessoas
SET tmdb_id = 59693
WHERE id = '7cb2d680-21a1-4cb8-9c43-4d848647409b'::uuid;

UPDATE public.pessoas
SET tmdb_id = 1392137
WHERE id = '7d6ad6a0-dfd2-42eb-b0cc-a522e793e7ed'::uuid;

UPDATE public.pessoas
SET tmdb_id = 1198142
WHERE id = '7e0901df-773d-4ced-8cdd-cf6d61ced6dd'::uuid;

UPDATE public.pessoas
SET tmdb_id = 955
WHERE id = '7f4eea0f-324e-4835-a602-d028a526ea6e'::uuid;

UPDATE public.pessoas
SET tmdb_id = 14892
WHERE id = '7fb505f9-3d1e-43a7-8842-31a301fb3e9f'::uuid;

UPDATE public.pessoas
SET tmdb_id = 2593684
WHERE id = '80b57d5f-e25f-4c0a-b040-1f32da9903c8'::uuid;

UPDATE public.pessoas
SET tmdb_id = 136495
WHERE id = '81d93a67-6dc8-46b4-bde9-f05a27b18367'::uuid;

UPDATE public.pessoas
SET tmdb_id = 6657
WHERE id = '8536a8e7-7fa0-43cf-b9f2-feedeb9ad649'::uuid;

UPDATE public.pessoas
SET tmdb_id = 11288
WHERE id = '88f76b62-20cd-42c1-a9f0-06d39e60b928'::uuid;

UPDATE public.pessoas
SET tmdb_id = 290
WHERE id = '8a6768f7-7ff9-4730-b0dc-3da7157f500b'::uuid;

UPDATE public.pessoas
SET tmdb_id = 558929
WHERE id = '8dabc131-aa2c-4317-b74e-6578561b2f4b'::uuid;

UPDATE public.pessoas
SET tmdb_id = 3141
WHERE id = '8f7fc538-8315-413b-b100-f8f6a29117a9'::uuid;

UPDATE public.pessoas
SET tmdb_id = 1371041
WHERE id = '97744d7a-1414-4b4d-96d7-9c46a6b51094'::uuid;

UPDATE public.pessoas
SET tmdb_id = 16851
WHERE id = '992d33fc-0bcf-40db-a0d9-673f7f53281a'::uuid;

UPDATE public.pessoas
SET tmdb_id = 30614
WHERE id = '9f2e6d45-3069-45bc-969d-114f13ca8669'::uuid;

UPDATE public.pessoas
SET tmdb_id = 18999
WHERE id = 'aae27e8f-0aed-4f16-9205-4f8a0a611edf'::uuid;

UPDATE public.pessoas
SET tmdb_id = 1813
WHERE id = 'ac8ef972-c882-4613-b089-5a8ea321bd04'::uuid;

UPDATE public.pessoas
SET tmdb_id = 1267329
WHERE id = 'ad418be7-54c2-4066-92cd-d5a5895a57fb'::uuid;

UPDATE public.pessoas
SET tmdb_id = 1519711
WHERE id = 'b0607712-f39b-4372-9a1a-247440ec6fc9'::uuid;

UPDATE public.pessoas
SET tmdb_id = 829372
WHERE id = 'b4ce5184-36e0-4c56-a927-d3bed1f70611'::uuid;

UPDATE public.pessoas
SET tmdb_id = 54693
WHERE id = 'c30fbfdf-5fe6-4202-a1a1-f5cb5a6140ee'::uuid;

UPDATE public.pessoas
SET tmdb_id = 59315
WHERE id = 'ccc57074-ba99-4381-b065-87756d0d59e1'::uuid;

UPDATE public.pessoas
SET tmdb_id = 103
WHERE id = 'cf95890a-645a-452d-b6f2-7bd9ea86e4c6'::uuid;

UPDATE public.pessoas
SET tmdb_id = 11917
WHERE id = 'd6c760bc-936b-4bf7-8293-697eafb70cc8'::uuid;

UPDATE public.pessoas
SET tmdb_id = 1430482
WHERE id = 'daba70dd-c2b1-49d6-af9c-b3bb7cfa74b3'::uuid;

UPDATE public.pessoas
SET tmdb_id = 121640
WHERE id = 'daebdb82-1854-440e-9203-18533fca72d1'::uuid;

UPDATE public.pessoas
SET tmdb_id = 1524310
WHERE id = 'dbdbbe67-e8ba-4891-996c-ce38011e1a69'::uuid;

UPDATE public.pessoas
SET tmdb_id = 1744
WHERE id = 'dc64983d-0471-4fad-987d-d691e7d4c380'::uuid;

UPDATE public.pessoas
SET tmdb_id = 227564
WHERE id = 'ddc40c16-3066-4164-a295-964e39ef982e'::uuid;

UPDATE public.pessoas
SET tmdb_id = 3061
WHERE id = 'e37d6726-a256-47dc-8dce-0740bcb75de2'::uuid;

UPDATE public.pessoas
SET tmdb_id = 3147083
WHERE id = 'e5cf5974-e36d-45ca-945d-39f231da10b0'::uuid;

UPDATE public.pessoas
SET tmdb_id = 819
WHERE id = 'e74bd4b0-6c90-4f91-8dba-0ccf72fb753c'::uuid;

UPDATE public.pessoas
SET tmdb_id = 1125
WHERE id = 'ea2cc2a2-05ca-42b6-a9d2-e9a6e54815b2'::uuid;

UPDATE public.pessoas
SET tmdb_id = 1590797
WHERE id = 'eb2a8b34-4fd3-4f15-81a9-7568c3ab9605'::uuid;

UPDATE public.pessoas
SET tmdb_id = 5723
WHERE id = 'eccd9eec-399b-480f-982f-85915e90d8dc'::uuid;

UPDATE public.pessoas
SET tmdb_id = 11916
WHERE id = 'f0658346-c89a-4fcc-8539-91f377453b77'::uuid;

UPDATE public.pessoas
SET tmdb_id = 2638587
WHERE id = 'f40cbc88-7813-4104-8c25-12a09adb0adb'::uuid;

UPDATE public.pessoas
SET tmdb_id = 1978406
WHERE id = 'f8562d0a-9f8a-403c-939d-1df5018aebf8'::uuid;

UPDATE public.pessoas
SET tmdb_id = 2042690
WHERE id = 'fd64b8c9-be8a-49d3-b9d7-6247f7c6508f'::uuid;

UPDATE public.pessoas
SET tmdb_id = 19498
WHERE id = 'ffdb6782-633e-4161-8ac5-7531e9ff2d22'::uuid;

-- 3. REGISTRO DE AUDITORIA EM public.tmdb_sync_logs (100 registros)
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('filme', '0248e063-5c69-4527-9813-6a374b216825'::uuid, 1339713, 'LINK', 'migration_f9_4_final', 'success', '{"local_title":"Obsessão","tmdb_title":"Obsessão","tmdb_original_title":"Obsession","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('filme', '04ae3ecd-10ca-4b8b-835b-05820bc045c0'::uuid, 1384216, 'LINK', 'migration_f9_4_final', 'success', '{"local_title":"Ponto Sem Retorno","tmdb_title":"Ponto Sem Retorno","tmdb_original_title":"The Dog Stars","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('filme', '1b32374e-d28c-41ac-bcd1-4cb8792c2764'::uuid, 1368337, 'LINK', 'migration_f9_4_final', 'success', '{"local_title":"A Odisseia","tmdb_title":"A Odisseia","tmdb_original_title":"The Odyssey","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('filme', '3ecb01f8-41d3-45ae-b0cd-be7c25d1048a'::uuid, 797, 'LINK', 'migration_f9_4_final', 'success', '{"local_title":"Persona","tmdb_title":"Quando Duas Mulheres Pecam","tmdb_original_title":"Persona","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('filme', '449a8c24-1901-4df1-a3fa-6de1f2edf934'::uuid, 15121, 'LINK', 'migration_f9_4_final', 'success', '{"local_title":"A Noviça Rebelde","tmdb_title":"A Noviça Rebelde","tmdb_original_title":"The Sound of Music","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('filme', '971fea96-855e-45f2-a962-0e98cd00d4de'::uuid, 313369, 'LINK', 'migration_f9_4_final', 'success', '{"local_title":"La La Land: Cantando Estações","tmdb_title":"La La Land: Cantando Estações","tmdb_original_title":"La La Land","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('filme', 'b5091b5f-a2e4-4a5a-9794-b9b253f28745'::uuid, 1433367, 'LINK', 'migration_f9_4_final', 'success', '{"local_title":"Só por Uma Noite","tmdb_title":"Só por Uma Noite","tmdb_original_title":"One Night Only","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('filme', 'b518c724-96cb-4862-9662-cc66d2fa19d9'::uuid, 1101383, 'LINK', 'migration_f9_4_final', 'success', '{"local_title":"O Fim da Rua","tmdb_title":"O Fim da Rua","tmdb_original_title":"The End of Oak Street","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('filme', 'c224f859-7888-4424-9566-be58a9619cae'::uuid, 1178602, 'LINK', 'migration_f9_4_final', 'success', '{"local_title":"Miroirs No. 3","tmdb_title":"Mirrors No. 3","tmdb_original_title":"Miroirs No. 3","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('filme', 'c39a1a2d-b86f-403e-a4d6-95c6c1f330c5'::uuid, 950028, 'LINK', 'migration_f9_4_final', 'success', '{"local_title":"O Convite","tmdb_title":"O Convite","tmdb_original_title":"The Invite","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('filme', 'fffa6c06-dd44-46c0-bfcd-875dd2e10f06'::uuid, 969681, 'LINK', 'migration_f9_4_final', 'success', '{"local_title":"Homem-Aranha: Um Novo Dia","tmdb_title":"Homem-Aranha: Um Novo Dia","tmdb_original_title":"Spider-Man: Brand New Day","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '0062e3da-5591-49a9-9f1b-c2e0e757b72f'::uuid, 2823609, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Cooper Tomlinson","tmdb_name":"Cooper Tomlinson","tmdb_birthday":"1999-01-11","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '08640665-6ec4-4a36-828e-d3cc4830644a'::uuid, 113461, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"John Legend","tmdb_name":"John Legend","tmdb_birthday":"1978-12-28","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '08bd243f-29d7-4d50-932c-4468baa7b7be'::uuid, 19274, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Seth Rogan","tmdb_name":"Seth Rogen","tmdb_birthday":"1982-04-15","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '0a8daa6d-dec9-445c-a82e-759338949f47'::uuid, 2463999, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"King Princess","tmdb_name":"King Princess","tmdb_birthday":"1998-12-19","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '0c27c8d1-e668-48fb-94bd-1ed42f7b0d64'::uuid, 2332, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Christian Petzold","tmdb_name":"Christian Petzold","tmdb_birthday":"1960-09-14","tmdb_department":"Directing","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '0e132240-b399-438b-8d50-00e369d5aa50'::uuid, 2381985, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Curry Barker","tmdb_name":"Curry Barker","tmdb_birthday":"1999-09-22","tmdb_department":"Directing","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '0eda86a0-0d81-4489-8959-d76b1d7108f4'::uuid, 2340, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Barbara Auer","tmdb_name":"Barbara Auer","tmdb_birthday":"1959-02-01","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '0f05fd0b-6c69-4b54-a256-b652d9c8478d'::uuid, 19, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Allison Janney","tmdb_name":"Allison Janney","tmdb_birthday":"1959-11-19","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '13166ba9-325f-43b1-b5a3-811f812c2c71'::uuid, 1561370, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Michael Johnston","tmdb_name":"Michael Johnston","tmdb_birthday":"1996-02-22","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '15f584ea-16d8-4f35-a6ee-9fc10481a33f'::uuid, 11918, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Jörgen Lindström","tmdb_name":"Jörgen Lindström","tmdb_birthday":"1951-05-19","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '1738cb74-8171-47d4-9244-c0666d3d3d8a'::uuid, 2044745, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Charlie Gillespie","tmdb_name":"Charlie Gillespie","tmdb_birthday":"1998-08-26","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '1bbeb4d3-29d2-4012-a003-163fc6ab7e0e'::uuid, 5823, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Julie Andrews","tmdb_name":"Julie Andrews","tmdb_birthday":"1935-10-01","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '2311dbc4-3632-4c4c-b8d3-458f0a946c5e'::uuid, 1892, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Matt Damon","tmdb_name":"Matt Damon","tmdb_birthday":"1970-10-08","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '23791fcf-1a50-4951-9cc1-bb80c0a0b535'::uuid, 578, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Ridley Scott","tmdb_name":"Ridley Scott","tmdb_birthday":"1937-11-30","tmdb_department":"Directing","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '23c977f6-3977-4933-bcd8-48eab578ad50'::uuid, 1373737, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Florence Pugh","tmdb_name":"Florence Pugh","tmdb_birthday":"1996-01-03","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '2ed62b99-99e9-4c85-bb45-b7325a48b214'::uuid, 1144604, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Destin Daniel Cretton","tmdb_name":"Destin Daniel Cretton","tmdb_birthday":"1978-11-23","tmdb_department":"Directing","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '2ef39893-120a-42cb-a9c2-3d461dd47598'::uuid, 6649, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Gunnar Björnstrand","tmdb_name":"Gunnar Björnstrand","tmdb_birthday":"1909-11-13","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '2f1096f4-a03d-4b11-8149-4a5f243f2452'::uuid, 529, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Guy Pearce","tmdb_name":"Guy Pearce","tmdb_birthday":"1967-10-05","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '3162c028-966b-4873-8a27-0ca395bf2bb5'::uuid, 894116, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Paula Beer","tmdb_name":"Paula Beer","tmdb_birthday":"1995-02-23","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '325aece6-8c12-4e0a-9d07-20e047d3554a'::uuid, 7331, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Eleanor Parker","tmdb_name":"Eleanor Parker","tmdb_birthday":"1922-06-26","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '389b2501-553b-49ec-84d8-cc48f44cdd2d'::uuid, 1903874, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Maya Hawke","tmdb_name":"Maya Hawke","tmdb_birthday":"1998-07-08","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '3ace0c06-1f6e-4730-b3a0-4eafe05acb30'::uuid, 1227717, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Himesh Patel","tmdb_name":"Himesh Patel","tmdb_birthday":"1990-10-13","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '3f11fef3-b318-4220-bb24-ad2b717add6f'::uuid, 2390, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"LeVar Burton","tmdb_name":"LeVar Burton","tmdb_birthday":"1957-02-16","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '3ff0cbdc-a69a-4693-90fe-fd8551aed4f8'::uuid, 92691, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Heather Menzies","tmdb_name":"Heather Menzies","tmdb_birthday":"1949-12-03","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '40a84d21-67c2-4fc0-8d29-f987becc2868'::uuid, 29095, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Nicholas Hammond","tmdb_name":"Nicholas Hammond","tmdb_birthday":"1950-05-15","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '44bab1d8-90eb-4913-8894-9301f7ead4ad'::uuid, 82511, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Will Gluck","tmdb_name":"Will Gluck","tmdb_birthday":"1978-11-07","tmdb_department":"Directing","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '489f0aba-3f4d-494c-b958-9156643e856c'::uuid, 1243355, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Duane Chase","tmdb_name":"Duane Chase","tmdb_birthday":"1950-12-12","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '4c73ef52-1481-4d11-b727-5af80360b7a9'::uuid, 1041410, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Charmian Carr","tmdb_name":"Charmian Carr","tmdb_birthday":"1942-12-27","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '4c9577d1-dfb4-411b-9307-c78d7c16bed0'::uuid, 505710, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Zendaya","tmdb_name":"Zendaya","tmdb_birthday":"1996-09-01","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '54ffba65-0b9c-4ac2-8e13-684cd144e4d4'::uuid, 1597840, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Enno Trebs","tmdb_name":"Enno Trebs","tmdb_birthday":"1995-10-05","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '596075dc-44eb-4be1-8539-179be30eb09d'::uuid, 35382, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Matthias Brandt","tmdb_name":"Matthias Brandt","tmdb_birthday":"1961-10-07","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '5ad7868c-ae34-4ccd-a5f9-69826b99d56e'::uuid, 1649152, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Jacob Batalon","tmdb_name":"Jacob Batalon","tmdb_birthday":"1996-10-09","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '5eead754-f5f5-43ad-9f13-38c1cba4861a'::uuid, 1137824, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Mia Goth","tmdb_name":"Mia Goth","tmdb_birthday":"1993-10-25","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '5f0eb385-46d7-4ebd-b4bf-10221574fb73'::uuid, 30082, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Benedict Wong","tmdb_name":"Benedict Wong","tmdb_birthday":"1971-07-03","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '5f34c43b-2701-415b-b85a-32e9e4f98ae6'::uuid, 1136406, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Tom Holland","tmdb_name":"Tom Holland","tmdb_birthday":"1996-06-01","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '62479ced-a10d-421c-8e8a-4c9650f8d943'::uuid, 1194314, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Kym Karath","tmdb_name":"Kym Karath","tmdb_birthday":"1958-08-04","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '640b7c5d-5227-4e87-b73e-d31d1c6c8817'::uuid, 84706, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Jarreth J. Merz","tmdb_name":"Jarreth J. Merz","tmdb_birthday":"1970-05-01","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '65c8e5bd-f9ac-4fc5-85fc-09631299788f'::uuid, 28637, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Andy Richter","tmdb_name":"Andy Richter","tmdb_birthday":"1966-10-28","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '6687f7fb-1788-4478-83b6-176eefef5f61'::uuid, 6885, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Charlize Theron","tmdb_name":"Charlize Theron","tmdb_birthday":"1975-08-07","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '66f47901-f35a-4840-9c25-06ba3c620c85'::uuid, 21625, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Molly Ringwald","tmdb_name":"Molly Ringwald","tmdb_birthday":"1968-02-18","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '69b7be65-79ba-4297-bb48-08b7102ebf16'::uuid, 6648, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Ingmar Bergman","tmdb_name":"Ingmar Bergman","tmdb_birthday":"1918-07-14","tmdb_department":"Directing","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '6d9e3c31-5d18-4940-acdf-3059ebc1da16'::uuid, 1154054, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Corey Hawkins","tmdb_name":"Corey Hawkins","tmdb_birthday":"1988-10-22","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '6f1d6606-43e2-4019-8279-896445903b83'::uuid, 1419065, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Okieriete Onaodowan","tmdb_name":"Okieriete Onaodowan","tmdb_birthday":"1987-08-16","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '6f714726-a5e7-41f6-890d-dda513794dff'::uuid, 2034418, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Jacob Elordi","tmdb_name":"Jacob Elordi","tmdb_birthday":"1997-06-26","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '72988817-eea2-4188-b243-c04ca2ddb10e'::uuid, 27578, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Elliot Page","tmdb_name":"Elliot Page","tmdb_birthday":"1987-02-21","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '75715ec7-0fb5-4bdd-acb7-10f47b8565a0'::uuid, 2028037, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Tramell Tillman","tmdb_name":"Tramell Tillman","tmdb_birthday":"1985-06-17","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '79f25338-c604-4a3b-9818-9b5cc21aec95'::uuid, 525, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Chirstopher Nolan","tmdb_name":"Christopher Nolan","tmdb_birthday":"1970-07-30","tmdb_department":"Directing","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '7a7b726b-1acd-4779-aee0-e8ab2109ec67'::uuid, 1525043, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Monica Barbaro","tmdb_name":"Monica Barbaro","tmdb_birthday":"1989-06-17","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '7c9ad357-35f7-4005-a1e9-30f2f3f54bbd'::uuid, 1150, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Brian De Palma","tmdb_name":"Brian De Palma","tmdb_birthday":"1940-09-11","tmdb_department":"Directing","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '7cb2d680-21a1-4cb8-9c43-4d848647409b'::uuid, 59693, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Liza Colón-Zayas","tmdb_name":"Liza Colón-Zayas","tmdb_birthday":"1972-07-15","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '7d6ad6a0-dfd2-42eb-b0cc-a522e793e7ed'::uuid, 1392137, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Margaret Qualley","tmdb_name":"Margaret Qualley","tmdb_birthday":"1994-10-23","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '7e0901df-773d-4ced-8cdd-cf6d61ced6dd'::uuid, 1198142, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Debbie Turner","tmdb_name":"Debbie Turner","tmdb_birthday":"1956-09-05","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '7f4eea0f-324e-4835-a602-d028a526ea6e'::uuid, 955, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Penélope Cruz","tmdb_name":"Penélope Cruz","tmdb_birthday":"1974-04-28","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '7fb505f9-3d1e-43a7-8842-31a301fb3e9f'::uuid, 14892, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Rosemarie DeWitt","tmdb_name":"Rosemarie DeWitt","tmdb_birthday":"1971-10-26","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '80b57d5f-e25f-4c0a-b040-1f32da9903c8'::uuid, 2593684, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Mateo Ray Garcia","tmdb_name":"Mateo Ray Garcia","tmdb_birthday":"2012-11-17","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '81d93a67-6dc8-46b4-bde9-f05a27b18367'::uuid, 136495, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Damien Chazelle","tmdb_name":"Damien Chazelle","tmdb_birthday":"1985-01-19","tmdb_department":"Directing","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '8536a8e7-7fa0-43cf-b9f2-feedeb9ad649'::uuid, 6657, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Bibi Andersson","tmdb_name":"Bibi Andersson","tmdb_birthday":"1935-11-11","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '88f76b62-20cd-42c1-a9f0-06d39e60b928'::uuid, 11288, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Robert Pattinson","tmdb_name":"Robert Pattinson","tmdb_birthday":"1986-05-13","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '8a6768f7-7ff9-4730-b0dc-3da7157f500b'::uuid, 290, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Christopher Plummer","tmdb_name":"Christopher Plummer","tmdb_birthday":"1929-12-13","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '8dabc131-aa2c-4317-b74e-6578561b2f4b'::uuid, 558929, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"David Robert Mitchell","tmdb_name":"David Robert Mitchell","tmdb_birthday":"1974-10-19","tmdb_department":"Directing","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '8f7fc538-8315-413b-b100-f8f6a29117a9'::uuid, 3141, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Marisa Tomei","tmdb_name":"Marisa Tomei","tmdb_birthday":"1964-12-04","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '97744d7a-1414-4b4d-96d7-9c46a6b51094'::uuid, 1371041, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Callum Turner","tmdb_name":"Callum Turner","tmdb_birthday":"1990-02-15","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '992d33fc-0bcf-40db-a0d9-673f7f53281a'::uuid, 16851, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Josh Brolin","tmdb_name":"Josh Brolin","tmdb_birthday":"1968-02-12","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '9f2e6d45-3069-45bc-969d-114f13ca8669'::uuid, 30614, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Ryan Gosling","tmdb_name":"Ryan Gosling","tmdb_birthday":"1980-11-12","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'aae27e8f-0aed-4f16-9205-4f8a0a611edf'::uuid, 18999, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"J.K. Simmons","tmdb_name":"J.K. Simmons","tmdb_birthday":"1955-01-09","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'ac8ef972-c882-4613-b089-5a8ea321bd04'::uuid, 1813, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Anne Hathaway","tmdb_name":"Anne Hathaway","tmdb_birthday":"1982-11-12","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'ad418be7-54c2-4066-92cd-d5a5895a57fb'::uuid, 1267329, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Lupita Nyong''o","tmdb_name":"Lupita Nyong''o","tmdb_birthday":"1983-03-01","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'b0607712-f39b-4372-9a1a-247440ec6fc9'::uuid, 1519711, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Megan Lawless","tmdb_name":"Megan Lawless","tmdb_birthday":"2000-04-11","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'b4ce5184-36e0-4c56-a927-d3bed1f70611'::uuid, 829372, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Michael Mando","tmdb_name":"Michael Mando","tmdb_birthday":"1981-07-13","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'c30fbfdf-5fe6-4202-a1a1-f5cb5a6140ee'::uuid, 54693, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Emma Stone","tmdb_name":"Emma Stone","tmdb_birthday":"1988-11-06","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'ccc57074-ba99-4381-b065-87756d0d59e1'::uuid, 59315, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Olivia Wilde","tmdb_name":"Olivia Wilde","tmdb_birthday":"1984-03-10","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'cf95890a-645a-452d-b6f2-7bd9ea86e4c6'::uuid, 103, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Mark Ruffalo","tmdb_name":"Mark Ruffalo","tmdb_birthday":"1967-11-22","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'd6c760bc-936b-4bf7-8293-697eafb70cc8'::uuid, 11917, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Margaretha Krook","tmdb_name":"Margaretha Krook","tmdb_birthday":"1925-10-15","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'daba70dd-c2b1-49d6-af9c-b3bb7cfa74b3'::uuid, 1430482, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Marcel Heupermann","tmdb_name":"Marcel Heupermann","tmdb_birthday":"1994-10-14","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'daebdb82-1854-440e-9203-18533fca72d1'::uuid, 121640, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Angela Cartwright","tmdb_name":"Angela Cartwright","tmdb_birthday":"1952-09-09","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'dbdbbe67-e8ba-4891-996c-ce38011e1a69'::uuid, 1524310, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Victoire Laly","tmdb_name":"Victoire Laly","tmdb_birthday":"1991-07-21","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'dc64983d-0471-4fad-987d-d691e7d4c380'::uuid, 1744, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Robert Wise","tmdb_name":"Robert Wise","tmdb_birthday":"1914-09-10","tmdb_department":"Directing","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'ddc40c16-3066-4164-a295-964e39ef982e'::uuid, 227564, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Benny Safdie","tmdb_name":"Benny Safdie","tmdb_birthday":"1986-02-24","tmdb_department":"Directing","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'e37d6726-a256-47dc-8dce-0740bcb75de2'::uuid, 3061, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Ewan Mcgregor","tmdb_name":"Ewan McGregor","tmdb_birthday":"1971-03-31","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'e5cf5974-e36d-45ca-945d-39f231da10b0'::uuid, 3147083, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Philip Froissant","tmdb_name":"Philip Froissant","tmdb_birthday":"1994-01-01","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'e74bd4b0-6c90-4f91-8dba-0ccf72fb753c'::uuid, 819, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Edward Norton","tmdb_name":"Edward Norton","tmdb_birthday":"1969-08-18","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'ea2cc2a2-05ca-42b6-a9d2-e9a6e54815b2'::uuid, 1125, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Ewan Bremner","tmdb_name":"Ewen Bremner","tmdb_birthday":"1972-01-23","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'eb2a8b34-4fd3-4f15-81a9-7568c3ab9605'::uuid, 1590797, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Sadie Sink","tmdb_name":"Sadie Sink","tmdb_birthday":"2002-04-16","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'eccd9eec-399b-480f-982f-85915e90d8dc'::uuid, 5723, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"John Leguizamo","tmdb_name":"John Leguizamo","tmdb_birthday":"1960-07-22","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'f0658346-c89a-4fcc-8539-91f377453b77'::uuid, 11916, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Liv Ullmann","tmdb_name":"Liv Ullmann","tmdb_birthday":"1938-12-16","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'f40cbc88-7813-4104-8c25-12a09adb0adb'::uuid, 2638587, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Inde Navarrette","tmdb_name":"Inde Navarrette","tmdb_birthday":"2001-03-03","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'f8562d0a-9f8a-403c-939d-1df5018aebf8'::uuid, 1978406, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Travis Scott","tmdb_name":"Travis Scott","tmdb_birthday":"1991-04-30","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'fd64b8c9-be8a-49d3-b9d7-6247f7c6508f'::uuid, 2042690, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Quintessa Swindell","tmdb_name":"Quintessa Swindell","tmdb_birthday":"1997-02-08","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'ffdb6782-633e-4161-8ac5-7531e9ff2d22'::uuid, 19498, 'LINK', 'migration_f9_4_final', 'success', '{"local_name":"Jon Bernthal","tmdb_name":"Jon Bernthal","tmdb_birthday":"1976-09-20","tmdb_department":"Acting","phase":"F9.4_LINK_FINAL"}'::jsonb);

-- 4. VALIDAÇÃO DEFENSIVA PRÉ-COMMIT (DO BLOCK COM ASSERTIONS)
DO $$
DECLARE
  v_movies_linked INTEGER;
  v_people_linked INTEGER;
  v_movies_synced INTEGER;
  v_people_synced INTEGER;
  v_logs_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_movies_linked FROM public.filmes WHERE tmdb_id IS NOT NULL;
  IF v_movies_linked <> 11 THEN
    RAISE EXCEPTION 'Falha na validação de filmes: esperado 11 vinculados, encontrado %', v_movies_linked;
  END IF;

  SELECT COUNT(*) INTO v_people_linked FROM public.pessoas WHERE tmdb_id IS NOT NULL;
  IF v_people_linked <> 89 THEN
    RAISE EXCEPTION 'Falha na validação de pessoas: esperado 89 vinculadas, encontrado %', v_people_linked;
  END IF;

  SELECT COUNT(*) INTO v_movies_synced FROM public.filmes WHERE tmdb_synced_at IS NOT NULL;
  IF v_movies_synced > 0 THEN
    RAISE EXCEPTION 'Violação de protocolo: % filmes possuem tmdb_synced_at preenchido!', v_movies_synced;
  END IF;

  SELECT COUNT(*) INTO v_people_synced FROM public.pessoas WHERE tmdb_synced_at IS NOT NULL;
  IF v_people_synced > 0 THEN
    RAISE EXCEPTION 'Violação de protocolo: % pessoas possuem tmdb_synced_at preenchido!', v_people_synced;
  END IF;

  SELECT COUNT(*) INTO v_logs_count FROM public.tmdb_sync_logs WHERE source = 'migration_f9_4_final' AND operation = 'LINK';
  IF v_logs_count <> 100 THEN
    RAISE EXCEPTION 'Falha nos logs de auditoria: esperado 100 registros, encontrado %', v_logs_count;
  END IF;

  RAISE NOTICE 'Validação defensiva F9.4 FINAL concluída com 100%% de sucesso!';
END $$;

COMMIT;