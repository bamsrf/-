"""Add functional index for master-dedup in market endpoints

Revision ID: 20260526_dedup_idx
Revises: 20260525_merge
Create Date: 2026-05-26

Назначение: поддержка GROUP BY / DISTINCT ON по дедуп-ключу
COALESCE(r.discogs_master_id, r.id::text) в /market/* SQL. Без этого
индекса Postgres делает sort-by-all-rows и эндпоинты таймаутят
(см. hotfix bf07042).

CONCURRENTLY — потому что records — горячая таблица; обычный CREATE
INDEX заблокировал бы вставки в момент создания индекса. CONCURRENTLY
не блокирует, но не может выполняться внутри транзакции — отсюда
autocommit_block().

WHERE merged_into_id IS NULL — частичный индекс, мерджнутые записи всё
равно отфильтрованы в SQL, не нужно тратить место.

Идемпотентна (CREATE INDEX IF NOT EXISTS).
"""
from alembic import op


revision = "20260526_dedup_idx"
down_revision = "20260525_merge"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Алembic заворачивает миграцию в транзакцию по умолчанию — для
    # CONCURRENTLY нужен autocommit-режим.
    with op.get_context().autocommit_block():
        op.execute(
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_records_dedup_key "
            "ON records ((COALESCE(discogs_master_id, id::text))) "
            "WHERE merged_into_id IS NULL"
        )


def downgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("DROP INDEX CONCURRENTLY IF EXISTS ix_records_dedup_key")
