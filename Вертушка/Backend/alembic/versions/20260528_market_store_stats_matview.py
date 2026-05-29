"""Market store-stats materialized view (WS4.1)

Revision ID: 20260528_store_stats_mv
Revises: 20260528_store_is_trusted
Create Date: 2026-05-28
"""
from alembic import op


revision = "20260528_store_stats_mv"
down_revision = "20260528_store_is_trusted"
branch_labels = None
depends_on = None


# Offload витрины магазинов (GET /api/market/stores) с per-request агрегации
# на matview. FILTER-условия 1:1 с live-запросом в market.py — иначе счётчики
# разойдутся с каруселями/сеткой. Временные пороги (7d stale / 24h new) зашиты
# через NOW() — вычисляются в момент REFRESH. min_in_stock фильтруется при
# чтении matview (не в самой view). Уникальный индекс по store_id обязателен
# для REFRESH MATERIALIZED VIEW CONCURRENTLY.
CREATE_MV = """
CREATE MATERIALIZED VIEW market_store_stats AS
SELECT
    s.id AS store_id,
    s.slug,
    s.name,
    s.logo_url,
    s.rating,
    COUNT(sl.id) FILTER (
        WHERE sl.status = 'in_stock'
          AND sl.last_seen_at >= NOW() - INTERVAL '7 days'
          AND sl.matched_record_id IS NOT NULL
          AND sl.price_rub IS NOT NULL
          AND r.merged_into_id IS NULL
          AND COALESCE(r.cover_local_path, r.cover_image_url, sl.raw_payload->>'image_url') IS NOT NULL
    ) AS in_stock_count,
    AVG(sl.price_rub) FILTER (
        WHERE sl.status = 'in_stock'
          AND sl.last_seen_at >= NOW() - INTERVAL '7 days'
          AND sl.price_rub IS NOT NULL
          AND sl.matched_record_id IS NOT NULL
          AND r.merged_into_id IS NULL
    ) AS avg_price_rub,
    COUNT(sl.id) FILTER (
        WHERE sl.status = 'in_stock'
          AND sl.first_seen_at >= NOW() - INTERVAL '24 hours'
          AND sl.matched_record_id IS NOT NULL
          AND sl.price_rub IS NOT NULL
          AND r.merged_into_id IS NULL
          AND COALESCE(r.cover_local_path, r.cover_image_url, sl.raw_payload->>'image_url') IS NOT NULL
    ) AS new_today_count
FROM stores s
LEFT JOIN store_listings sl ON sl.store_id = s.id
LEFT JOIN records r ON r.id = sl.matched_record_id
WHERE s.is_active = true
GROUP BY s.id;
"""

CREATE_IDX = (
    "CREATE UNIQUE INDEX ix_market_store_stats_store_id "
    "ON market_store_stats (store_id);"
)


def upgrade() -> None:
    op.execute(CREATE_MV)
    op.execute(CREATE_IDX)


def downgrade() -> None:
    op.execute("DROP MATERIALIZED VIEW IF EXISTS market_store_stats CASCADE;")
