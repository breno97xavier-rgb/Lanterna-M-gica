-- ==============================================================================
-- LANTERNA MÁGICA — FASE 9: ROLLBACK DE VINCULAÇÃO DO ACERVO AO TMDB
-- Arquivo: supabase_f9_4_unlink_tmdb_ids_final_rollback.sql
-- Manifesto de Origem: acervo_tmdb_link_manifest_final.json (SHA-256: 374ef2056f1d87d1981f88b514dbf8f2312a4f7dfb030c01dcda714036d94e9c)
-- ==============================================================================

BEGIN;

-- 1. Desvincular filmes
UPDATE public.filmes
SET tmdb_id = NULL, tmdb_synced_at = NULL
WHERE id IN ('0248e063-5c69-4527-9813-6a374b216825'::uuid, '04ae3ecd-10ca-4b8b-835b-05820bc045c0'::uuid, '1b32374e-d28c-41ac-bcd1-4cb8792c2764'::uuid, '3ecb01f8-41d3-45ae-b0cd-be7c25d1048a'::uuid, '449a8c24-1901-4df1-a3fa-6de1f2edf934'::uuid, '971fea96-855e-45f2-a962-0e98cd00d4de'::uuid, 'b5091b5f-a2e4-4a5a-9794-b9b253f28745'::uuid, 'b518c724-96cb-4862-9662-cc66d2fa19d9'::uuid, 'c224f859-7888-4424-9566-be58a9619cae'::uuid, 'c39a1a2d-b86f-403e-a4d6-95c6c1f330c5'::uuid, 'fffa6c06-dd44-46c0-bfcd-875dd2e10f06'::uuid);

-- 2. Desvincular pessoas
UPDATE public.pessoas
SET tmdb_id = NULL, tmdb_synced_at = NULL
WHERE id IN (
    '0062e3da-5591-49a9-9f1b-c2e0e757b72f'::uuid,
    '08640665-6ec4-4a36-828e-d3cc4830644a'::uuid,
    '08bd243f-29d7-4d50-932c-4468baa7b7be'::uuid,
    '0a8daa6d-dec9-445c-a82e-759338949f47'::uuid,
    '0c27c8d1-e668-48fb-94bd-1ed42f7b0d64'::uuid,
    '0e132240-b399-438b-8d50-00e369d5aa50'::uuid,
    '0eda86a0-0d81-4489-8959-d76b1d7108f4'::uuid,
    '0f05fd0b-6c69-4b54-a256-b652d9c8478d'::uuid,
    '13166ba9-325f-43b1-b5a3-811f812c2c71'::uuid,
    '15f584ea-16d8-4f35-a6ee-9fc10481a33f'::uuid,
    '1738cb74-8171-47d4-9244-c0666d3d3d8a'::uuid,
    '1bbeb4d3-29d2-4012-a003-163fc6ab7e0e'::uuid,
    '2311dbc4-3632-4c4c-b8d3-458f0a946c5e'::uuid,
    '23791fcf-1a50-4951-9cc1-bb80c0a0b535'::uuid,
    '23c977f6-3977-4933-bcd8-48eab578ad50'::uuid,
    '2ed62b99-99e9-4c85-bb45-b7325a48b214'::uuid,
    '2ef39893-120a-42cb-a9c2-3d461dd47598'::uuid,
    '2f1096f4-a03d-4b11-8149-4a5f243f2452'::uuid,
    '3162c028-966b-4873-8a27-0ca395bf2bb5'::uuid,
    '325aece6-8c12-4e0a-9d07-20e047d3554a'::uuid,
    '389b2501-553b-49ec-84d8-cc48f44cdd2d'::uuid,
    '3ace0c06-1f6e-4730-b3a0-4eafe05acb30'::uuid,
    '3f11fef3-b318-4220-bb24-ad2b717add6f'::uuid,
    '3ff0cbdc-a69a-4693-90fe-fd8551aed4f8'::uuid,
    '40a84d21-67c2-4fc0-8d29-f987becc2868'::uuid,
    '44bab1d8-90eb-4913-8894-9301f7ead4ad'::uuid,
    '489f0aba-3f4d-494c-b958-9156643e856c'::uuid,
    '4c73ef52-1481-4d11-b727-5af80360b7a9'::uuid,
    '4c9577d1-dfb4-411b-9307-c78d7c16bed0'::uuid,
    '54ffba65-0b9c-4ac2-8e13-684cd144e4d4'::uuid,
    '596075dc-44eb-4be1-8539-179be30eb09d'::uuid,
    '5ad7868c-ae34-4ccd-a5f9-69826b99d56e'::uuid,
    '5eead754-f5f5-43ad-9f13-38c1cba4861a'::uuid,
    '5f0eb385-46d7-4ebd-b4bf-10221574fb73'::uuid,
    '5f34c43b-2701-415b-b85a-32e9e4f98ae6'::uuid,
    '62479ced-a10d-421c-8e8a-4c9650f8d943'::uuid,
    '640b7c5d-5227-4e87-b73e-d31d1c6c8817'::uuid,
    '65c8e5bd-f9ac-4fc5-85fc-09631299788f'::uuid,
    '6687f7fb-1788-4478-83b6-176eefef5f61'::uuid,
    '66f47901-f35a-4840-9c25-06ba3c620c85'::uuid,
    '69b7be65-79ba-4297-bb48-08b7102ebf16'::uuid,
    '6d9e3c31-5d18-4940-acdf-3059ebc1da16'::uuid,
    '6f1d6606-43e2-4019-8279-896445903b83'::uuid,
    '6f714726-a5e7-41f6-890d-dda513794dff'::uuid,
    '72988817-eea2-4188-b243-c04ca2ddb10e'::uuid,
    '75715ec7-0fb5-4bdd-acb7-10f47b8565a0'::uuid,
    '79f25338-c604-4a3b-9818-9b5cc21aec95'::uuid,
    '7a7b726b-1acd-4779-aee0-e8ab2109ec67'::uuid,
    '7c9ad357-35f7-4005-a1e9-30f2f3f54bbd'::uuid,
    '7cb2d680-21a1-4cb8-9c43-4d848647409b'::uuid,
    '7d6ad6a0-dfd2-42eb-b0cc-a522e793e7ed'::uuid,
    '7e0901df-773d-4ced-8cdd-cf6d61ced6dd'::uuid,
    '7f4eea0f-324e-4835-a602-d028a526ea6e'::uuid,
    '7fb505f9-3d1e-43a7-8842-31a301fb3e9f'::uuid,
    '80b57d5f-e25f-4c0a-b040-1f32da9903c8'::uuid,
    '81d93a67-6dc8-46b4-bde9-f05a27b18367'::uuid,
    '8536a8e7-7fa0-43cf-b9f2-feedeb9ad649'::uuid,
    '88f76b62-20cd-42c1-a9f0-06d39e60b928'::uuid,
    '8a6768f7-7ff9-4730-b0dc-3da7157f500b'::uuid,
    '8dabc131-aa2c-4317-b74e-6578561b2f4b'::uuid,
    '8f7fc538-8315-413b-b100-f8f6a29117a9'::uuid,
    '97744d7a-1414-4b4d-96d7-9c46a6b51094'::uuid,
    '992d33fc-0bcf-40db-a0d9-673f7f53281a'::uuid,
    '9f2e6d45-3069-45bc-969d-114f13ca8669'::uuid,
    'aae27e8f-0aed-4f16-9205-4f8a0a611edf'::uuid,
    'ac8ef972-c882-4613-b089-5a8ea321bd04'::uuid,
    'ad418be7-54c2-4066-92cd-d5a5895a57fb'::uuid,
    'b0607712-f39b-4372-9a1a-247440ec6fc9'::uuid,
    'b4ce5184-36e0-4c56-a927-d3bed1f70611'::uuid,
    'c30fbfdf-5fe6-4202-a1a1-f5cb5a6140ee'::uuid,
    'ccc57074-ba99-4381-b065-87756d0d59e1'::uuid,
    'cf95890a-645a-452d-b6f2-7bd9ea86e4c6'::uuid,
    'd6c760bc-936b-4bf7-8293-697eafb70cc8'::uuid,
    'daba70dd-c2b1-49d6-af9c-b3bb7cfa74b3'::uuid,
    'daebdb82-1854-440e-9203-18533fca72d1'::uuid,
    'dbdbbe67-e8ba-4891-996c-ce38011e1a69'::uuid,
    'dc64983d-0471-4fad-987d-d691e7d4c380'::uuid,
    'ddc40c16-3066-4164-a295-964e39ef982e'::uuid,
    'e37d6726-a256-47dc-8dce-0740bcb75de2'::uuid,
    'e5cf5974-e36d-45ca-945d-39f231da10b0'::uuid,
    'e74bd4b0-6c90-4f91-8dba-0ccf72fb753c'::uuid,
    'ea2cc2a2-05ca-42b6-a9d2-e9a6e54815b2'::uuid,
    'eb2a8b34-4fd3-4f15-81a9-7568c3ab9605'::uuid,
    'eccd9eec-399b-480f-982f-85915e90d8dc'::uuid,
    'f0658346-c89a-4fcc-8539-91f377453b77'::uuid,
    'f40cbc88-7813-4104-8c25-12a09adb0adb'::uuid,
    'f8562d0a-9f8a-403c-939d-1df5018aebf8'::uuid,
    'fd64b8c9-be8a-49d3-b9d7-6247f7c6508f'::uuid,
    'ffdb6782-633e-4161-8ac5-7531e9ff2d22'::uuid
);

-- 3. Registrar logs de auditoria UNLINK
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('filme', '0248e063-5c69-4527-9813-6a374b216825'::uuid, 1339713, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('filme', '04ae3ecd-10ca-4b8b-835b-05820bc045c0'::uuid, 1384216, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('filme', '1b32374e-d28c-41ac-bcd1-4cb8792c2764'::uuid, 1368337, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('filme', '3ecb01f8-41d3-45ae-b0cd-be7c25d1048a'::uuid, 797, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('filme', '449a8c24-1901-4df1-a3fa-6de1f2edf934'::uuid, 15121, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('filme', '971fea96-855e-45f2-a962-0e98cd00d4de'::uuid, 313369, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('filme', 'b5091b5f-a2e4-4a5a-9794-b9b253f28745'::uuid, 1433367, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('filme', 'b518c724-96cb-4862-9662-cc66d2fa19d9'::uuid, 1101383, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('filme', 'c224f859-7888-4424-9566-be58a9619cae'::uuid, 1178602, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('filme', 'c39a1a2d-b86f-403e-a4d6-95c6c1f330c5'::uuid, 950028, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('filme', 'fffa6c06-dd44-46c0-bfcd-875dd2e10f06'::uuid, 969681, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '0062e3da-5591-49a9-9f1b-c2e0e757b72f'::uuid, 2823609, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '08640665-6ec4-4a36-828e-d3cc4830644a'::uuid, 113461, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '08bd243f-29d7-4d50-932c-4468baa7b7be'::uuid, 19274, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '0a8daa6d-dec9-445c-a82e-759338949f47'::uuid, 2463999, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '0c27c8d1-e668-48fb-94bd-1ed42f7b0d64'::uuid, 2332, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '0e132240-b399-438b-8d50-00e369d5aa50'::uuid, 2381985, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '0eda86a0-0d81-4489-8959-d76b1d7108f4'::uuid, 2340, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '0f05fd0b-6c69-4b54-a256-b652d9c8478d'::uuid, 19, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '13166ba9-325f-43b1-b5a3-811f812c2c71'::uuid, 1561370, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '15f584ea-16d8-4f35-a6ee-9fc10481a33f'::uuid, 11918, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '1738cb74-8171-47d4-9244-c0666d3d3d8a'::uuid, 2044745, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '1bbeb4d3-29d2-4012-a003-163fc6ab7e0e'::uuid, 5823, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '2311dbc4-3632-4c4c-b8d3-458f0a946c5e'::uuid, 1892, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '23791fcf-1a50-4951-9cc1-bb80c0a0b535'::uuid, 578, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '23c977f6-3977-4933-bcd8-48eab578ad50'::uuid, 1373737, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '2ed62b99-99e9-4c85-bb45-b7325a48b214'::uuid, 1144604, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '2ef39893-120a-42cb-a9c2-3d461dd47598'::uuid, 6649, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '2f1096f4-a03d-4b11-8149-4a5f243f2452'::uuid, 529, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '3162c028-966b-4873-8a27-0ca395bf2bb5'::uuid, 894116, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '325aece6-8c12-4e0a-9d07-20e047d3554a'::uuid, 7331, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '389b2501-553b-49ec-84d8-cc48f44cdd2d'::uuid, 1903874, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '3ace0c06-1f6e-4730-b3a0-4eafe05acb30'::uuid, 1227717, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '3f11fef3-b318-4220-bb24-ad2b717add6f'::uuid, 2390, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '3ff0cbdc-a69a-4693-90fe-fd8551aed4f8'::uuid, 92691, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '40a84d21-67c2-4fc0-8d29-f987becc2868'::uuid, 29095, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '44bab1d8-90eb-4913-8894-9301f7ead4ad'::uuid, 82511, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '489f0aba-3f4d-494c-b958-9156643e856c'::uuid, 1243355, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '4c73ef52-1481-4d11-b727-5af80360b7a9'::uuid, 1041410, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '4c9577d1-dfb4-411b-9307-c78d7c16bed0'::uuid, 505710, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '54ffba65-0b9c-4ac2-8e13-684cd144e4d4'::uuid, 1597840, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '596075dc-44eb-4be1-8539-179be30eb09d'::uuid, 35382, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '5ad7868c-ae34-4ccd-a5f9-69826b99d56e'::uuid, 1649152, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '5eead754-f5f5-43ad-9f13-38c1cba4861a'::uuid, 1137824, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '5f0eb385-46d7-4ebd-b4bf-10221574fb73'::uuid, 30082, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '5f34c43b-2701-415b-b85a-32e9e4f98ae6'::uuid, 1136406, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '62479ced-a10d-421c-8e8a-4c9650f8d943'::uuid, 1194314, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '640b7c5d-5227-4e87-b73e-d31d1c6c8817'::uuid, 84706, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '65c8e5bd-f9ac-4fc5-85fc-09631299788f'::uuid, 28637, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '6687f7fb-1788-4478-83b6-176eefef5f61'::uuid, 6885, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '66f47901-f35a-4840-9c25-06ba3c620c85'::uuid, 21625, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '69b7be65-79ba-4297-bb48-08b7102ebf16'::uuid, 6648, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '6d9e3c31-5d18-4940-acdf-3059ebc1da16'::uuid, 1154054, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '6f1d6606-43e2-4019-8279-896445903b83'::uuid, 1419065, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '6f714726-a5e7-41f6-890d-dda513794dff'::uuid, 2034418, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '72988817-eea2-4188-b243-c04ca2ddb10e'::uuid, 27578, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '75715ec7-0fb5-4bdd-acb7-10f47b8565a0'::uuid, 2028037, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '79f25338-c604-4a3b-9818-9b5cc21aec95'::uuid, 525, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '7a7b726b-1acd-4779-aee0-e8ab2109ec67'::uuid, 1525043, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '7c9ad357-35f7-4005-a1e9-30f2f3f54bbd'::uuid, 1150, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '7cb2d680-21a1-4cb8-9c43-4d848647409b'::uuid, 59693, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '7d6ad6a0-dfd2-42eb-b0cc-a522e793e7ed'::uuid, 1392137, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '7e0901df-773d-4ced-8cdd-cf6d61ced6dd'::uuid, 1198142, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '7f4eea0f-324e-4835-a602-d028a526ea6e'::uuid, 955, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '7fb505f9-3d1e-43a7-8842-31a301fb3e9f'::uuid, 14892, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '80b57d5f-e25f-4c0a-b040-1f32da9903c8'::uuid, 2593684, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '81d93a67-6dc8-46b4-bde9-f05a27b18367'::uuid, 136495, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '8536a8e7-7fa0-43cf-b9f2-feedeb9ad649'::uuid, 6657, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '88f76b62-20cd-42c1-a9f0-06d39e60b928'::uuid, 11288, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '8a6768f7-7ff9-4730-b0dc-3da7157f500b'::uuid, 290, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '8dabc131-aa2c-4317-b74e-6578561b2f4b'::uuid, 558929, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '8f7fc538-8315-413b-b100-f8f6a29117a9'::uuid, 3141, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '97744d7a-1414-4b4d-96d7-9c46a6b51094'::uuid, 1371041, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '992d33fc-0bcf-40db-a0d9-673f7f53281a'::uuid, 16851, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', '9f2e6d45-3069-45bc-969d-114f13ca8669'::uuid, 30614, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'aae27e8f-0aed-4f16-9205-4f8a0a611edf'::uuid, 18999, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'ac8ef972-c882-4613-b089-5a8ea321bd04'::uuid, 1813, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'ad418be7-54c2-4066-92cd-d5a5895a57fb'::uuid, 1267329, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'b0607712-f39b-4372-9a1a-247440ec6fc9'::uuid, 1519711, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'b4ce5184-36e0-4c56-a927-d3bed1f70611'::uuid, 829372, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'c30fbfdf-5fe6-4202-a1a1-f5cb5a6140ee'::uuid, 54693, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'ccc57074-ba99-4381-b065-87756d0d59e1'::uuid, 59315, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'cf95890a-645a-452d-b6f2-7bd9ea86e4c6'::uuid, 103, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'd6c760bc-936b-4bf7-8293-697eafb70cc8'::uuid, 11917, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'daba70dd-c2b1-49d6-af9c-b3bb7cfa74b3'::uuid, 1430482, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'daebdb82-1854-440e-9203-18533fca72d1'::uuid, 121640, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'dbdbbe67-e8ba-4891-996c-ce38011e1a69'::uuid, 1524310, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'dc64983d-0471-4fad-987d-d691e7d4c380'::uuid, 1744, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'ddc40c16-3066-4164-a295-964e39ef982e'::uuid, 227564, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'e37d6726-a256-47dc-8dce-0740bcb75de2'::uuid, 3061, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'e5cf5974-e36d-45ca-945d-39f231da10b0'::uuid, 3147083, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'e74bd4b0-6c90-4f91-8dba-0ccf72fb753c'::uuid, 819, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'ea2cc2a2-05ca-42b6-a9d2-e9a6e54815b2'::uuid, 1125, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'eb2a8b34-4fd3-4f15-81a9-7568c3ab9605'::uuid, 1590797, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'eccd9eec-399b-480f-982f-85915e90d8dc'::uuid, 5723, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'f0658346-c89a-4fcc-8539-91f377453b77'::uuid, 11916, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'f40cbc88-7813-4104-8c25-12a09adb0adb'::uuid, 2638587, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'f8562d0a-9f8a-403c-939d-1df5018aebf8'::uuid, 1978406, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'fd64b8c9-be8a-49d3-b9d7-6247f7c6508f'::uuid, 2042690, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);
INSERT INTO public.tmdb_sync_logs (entity_type, internal_id, tmdb_id, operation, source, status, details) VALUES ('pessoa', 'ffdb6782-633e-4161-8ac5-7531e9ff2d22'::uuid, 19498, 'UNLINK', 'rollback_f9_4_final', 'success', '{"reason": "Rollback manual F9.4 Final"}'::jsonb);

COMMIT;