"""Market cover-coverage metric view (WS4.2)

Revision ID: 20260528_cover_coverage
Revises: 20260528_fix_zero_master_id
Create Date: 2026-05-28
"""
from alembic import op


revision = "20260528_cover_coverage"
down_revision = "20260528_fix_zero_master_id"
branch_labels = None
depends_on = None


# Покрытие обложек по магазинам — измеряет эффект WS1/WS2 фиксов.
# «displayable» совпадает с фильтром market.py (in_stock + matched + price +
# свежий + не merged). Метрики:
#   with_cover         — есть рабочий cover (COALESCE как в market-эндпоинтах);
#   with_mirror        — обложка зазеркалена локально (self-heal, WS1.2 прогресс);
#   store_photo_only   — cover только из raw_payload (нет record-обложки) →
#                        кандидаты на enrichment через get_master_versions (WS2.2).
V_MARKET_COVER_COVERAGE = """
CREATE OR REPLACE VIEW v_market_cover_coverage AS
WITH displayable AS (
    SELECT
        s.slug AS store_slug,
        s.name AS store_name,
        r.cover_local_path,
        r.cover_image_url,
        sl.raw_payload->>'image_url' AS store_photo
    FROM store_listings sl
    JOIN stores s ON s.id = sl.store_id
    JOIN records r ON r.id = sl.matched_record_id
    WHERE s.is_active = true
      AND sl.status = 'in_stock'
      AND sl.matched_record_id IS NOT NULL
      AND sl.price_rub IS NOT NULL
      AND sl.last_seen_at >= NOW() - INTERVAL '7 days'
      AND r.merged_into_id IS NULL
)
SELECT
    store_slug,
    store_name,
    COUNT(*) AS in_stock_matched,
    COUNT(*) FILTER (
        WHERE COALESCE(cover_local_path, cover_image_url, store_photo) IS NOT NULL
    ) AS with_cover,
    COUNT(*) FILTER (WHERE cover_local_path IS NOT NULL) AS with_mirror,
    COUNT(*) FILTER (
        WHERE cover_local_path IS NULL
          AND cover_image_url IS NULL
          AND store_photo IS NOT NULL
    ) AS store_photo_only,
    ROUND(
        100.0 * COUNT(*) FILTER (
            WHERE COALESCE(cover_local_path, cover_image_url, store_photo) IS NOT NULL
        ) / NULLIF(COUNT(*), 0), 1
    ) AS cover_pct,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE cover_local_path IS NOT NULL)
        / NULLIF(COUNT(*), 0), 1
    ) AS mirror_pct
FROM displayable
GROUP BY store_slug, store_name
ORDER BY in_stock_matched DESC;
"""


def upgrade() -> None:
    op.execute(V_MARKET_COVER_COVERAGE)


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS v_market_cover_coverage CASCADE;")
