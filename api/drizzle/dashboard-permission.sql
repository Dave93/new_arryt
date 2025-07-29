-- Добавляем permission для просмотра дашборда
INSERT INTO permissions (slug, description, active) 
VALUES ('dashboard.view', 'Просмотр дашборда', true)
ON CONFLICT (slug) DO NOTHING;