-- 家族構成図・室内見取り図の添付機能を廃止するため、関連テーブルと enum を削除する。
DROP TABLE IF EXISTS "resident_attachments";
DROP TYPE IF EXISTS "AttachmentKind";
