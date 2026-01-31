-- Atribuir role guardian ao usuário especificado
INSERT INTO user_roles (user_id, role) 
VALUES ('971e250b-a4e7-42da-856e-3c6eb0c7a131', 'guardian')
ON CONFLICT (user_id, role) DO NOTHING;