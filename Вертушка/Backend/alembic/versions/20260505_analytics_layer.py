"""Analytics layer: last_seen_at, signup_source, views, materialized views

Revision ID: 20260505_analytics
Revises: 20260504_blocked_contacts
Create Date: 2026-05-05
"""
from alembic import op
import sqlalchemy as sa


revision = "20260505_analytics"
down_revision = "20260504_blocked_contacts"
branch_labels = None
depends_on = None


# --- Регулярные views (быстрые JOIN'ы поверх свежих данных) ---

V_USER_OVERVIEW = """
CREATE OR REPLACE VIEW v_user_overview AS
SELECT
    u.id,
    u.email,
    u.username,
    u.display_name,
    u.signup_source,
    u.is_active,
    u.is_verified,
    u.created_at,
    u.last_login_at,
    u.last_seen_at,
    u.deleted_at,
    EXTRACT(DAY FROM (NOW() - u.created_at))::int AS days_since_signup,
    CASE
        WHEN u.last_seen_at IS NULL THEN NULL
        ELSE EXTRACT(DAY FROM (NOW() - u.last_seen_at))::int
    END AS days_since_last_seen,
    COALESCE(c.collection_size, 0) AS collection_size,
    COALESCE(c.collection_value_rub, 0)::numeric(12,2) AS collection_value_rub,
    COALESCE(c.items_added_30d, 0) AS items_added_30d,
    COALESCE(w.wishlist_size, 0) AS wishlist_size,
    COALESCE(w.wishlist_purchased, 0) AS wishlist_purchased,
    COALESCE(g.gifts_received, 0) AS gifts_received,
    COALESCE(g.gifts_completed, 0) AS gifts_completed,
    COALESCE(f1.followers_count, 0) AS followers_count,
    COALESCE(f2.following_count, 0) AS following_count,
    COALESCE(ps.view_count, 0) AS profile_views,
    ps.is_active AS profile_share_active
FROM users u
LEFT JOIN (
    SELECT
        col.user_id,
        COUNT(ci.id) AS collection_size,
        SUM(ci.estimated_price_rub) AS collection_value_rub,
        COUNT(ci.id) FILTER (WHERE ci.added_at >= NOW() - INTERVAL '30 days') AS items_added_30d
    FROM collections col
    LEFT JOIN collection_items ci ON ci.collection_id = col.id
    GROUP BY col.user_id
) c ON c.user_id = u.id
LEFT JOIN (
    SELECT
        wl.user_id,
        COUNT(wi.id) AS wishlist_size,
        COUNT(wi.id) FILTER (WHERE wi.is_purchased) AS wishlist_purchased
    FROM wishlists wl
    LEFT JOIN wishlist_items wi ON wi.wishlist_id = wl.id
    GROUP BY wl.user_id
) w ON w.user_id = u.id
LEFT JOIN (
    SELECT
        wl.user_id,
        COUNT(gb.id) AS gifts_received,
        COUNT(gb.id) FILTER (WHERE gb.status = 'COMPLETED') AS gifts_completed
    FROM wishlists wl
    JOIN wishlist_items wi ON wi.wishlist_id = wl.id
    JOIN gift_bookings gb ON gb.wishlist_item_id = wi.id
    GROUP BY wl.user_id
) g ON g.user_id = u.id
LEFT JOIN (
    SELECT following_id AS user_id, COUNT(*) AS followers_count
    FROM follows GROUP BY following_id
) f1 ON f1.user_id = u.id
LEFT JOIN (
    SELECT follower_id AS user_id, COUNT(*) AS following_count
    FROM follows GROUP BY follower_id
) f2 ON f2.user_id = u.id
LEFT JOIN profile_shares ps ON ps.user_id = u.id;
"""

V_USER_ACTIVITY_BUCKETS = """
CREATE OR REPLACE VIEW v_user_activity_buckets AS
SELECT
    id,
    username,
    email,
    last_seen_at,
    last_seen_at >= NOW() - INTERVAL '1 day'   AS is_dau,
    last_seen_at >= NOW() - INTERVAL '7 days'  AS is_wau,
    last_seen_at >= NOW() - INTERVAL '30 days' AS is_mau,
    last_seen_at IS NOT NULL
        AND last_seen_at < NOW() - INTERVAL '30 days' AS is_churned_30d
FROM users
WHERE deleted_at IS NULL;
"""

V_COLLECTION_OVERVIEW = """
CREATE OR REPLACE VIEW v_collection_overview AS
SELECT
    col.user_id,
    u.username,
    COUNT(ci.id) AS total_items,
    SUM(ci.estimated_price_rub)::numeric(12,2) AS total_value_rub,
    AVG(r.year)::int AS avg_year,
    MIN(ci.added_at) AS first_item_at,
    MAX(ci.added_at) AS last_item_at,
    COUNT(ci.id) FILTER (WHERE ci.added_at >= NOW() - INTERVAL '30 days') AS items_added_30d,
    COUNT(ci.id) FILTER (WHERE ci.added_at >= NOW() - INTERVAL '7 days')  AS items_added_7d,
    MODE() WITHIN GROUP (ORDER BY r.artist) AS top_artist
FROM collections col
JOIN users u ON u.id = col.user_id
LEFT JOIN collection_items ci ON ci.collection_id = col.id
LEFT JOIN records r ON r.id = ci.record_id
GROUP BY col.user_id, u.username;
"""

V_TOP_RECORDS = """
CREATE OR REPLACE VIEW v_top_records AS
SELECT
    r.id AS record_id,
    r.title,
    r.artist,
    r.year,
    COALESCE(c.times_in_collections, 0) AS times_in_collections,
    COALESCE(w.times_in_wishlists, 0)   AS times_in_wishlists,
    COALESCE(c.times_in_collections, 0) + COALESCE(w.times_in_wishlists, 0) AS demand_score
FROM records r
LEFT JOIN (
    SELECT record_id, COUNT(*) AS times_in_collections
    FROM collection_items GROUP BY record_id
) c ON c.record_id = r.id
LEFT JOIN (
    SELECT record_id, COUNT(*) AS times_in_wishlists
    FROM wishlist_items GROUP BY record_id
) w ON w.record_id = r.id
WHERE COALESCE(c.times_in_collections, 0) + COALESCE(w.times_in_wishlists, 0) > 0;
"""

V_COLLECTION_VALUE_HISTORY = """
CREATE OR REPLACE VIEW v_collection_value_history AS
SELECT
    s.id,
    s.user_id,
    u.username,
    s.snapshot_date,
    s.total_value_rub,
    s.items_count,
    s.created_at
FROM collection_value_snapshots s
JOIN users u ON u.id = s.user_id;
"""

V_GIFT_FUNNEL = """
CREATE OR REPLACE VIEW v_gift_funnel AS
SELECT
    DATE_TRUNC('day', booked_at)::date AS day,
    COUNT(*) AS bookings_total,
    COUNT(*) FILTER (WHERE status = 'PENDING')   AS pending,
    COUNT(*) FILTER (WHERE status = 'BOOKED')    AS booked,
    COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed,
    COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE status = 'COMPLETED')
        / NULLIF(COUNT(*), 0),
    2) AS completion_rate_pct
FROM gift_bookings
GROUP BY 1
ORDER BY 1 DESC;
"""

V_WISHLIST_OVERVIEW = """
CREATE OR REPLACE VIEW v_wishlist_overview AS
SELECT
    wl.id AS wishlist_id,
    wl.user_id,
    u.username,
    wl.is_public,
    wl.share_token,
    COUNT(wi.id) AS items_count,
    COUNT(wi.id) FILTER (WHERE wi.is_purchased) AS items_purchased,
    COUNT(gb.id) FILTER (WHERE gb.status = 'BOOKED')    AS items_booked,
    COUNT(gb.id) FILTER (WHERE gb.status = 'COMPLETED') AS items_completed,
    wl.created_at
FROM wishlists wl
JOIN users u ON u.id = wl.user_id
LEFT JOIN wishlist_items wi ON wi.wishlist_id = wl.id
LEFT JOIN gift_bookings gb ON gb.wishlist_item_id = wi.id
GROUP BY wl.id, wl.user_id, u.username, wl.is_public, wl.share_token, wl.created_at;
"""

V_GIFT_ANTI_FRAUD = """
CREATE OR REPLACE VIEW v_gift_anti_fraud AS
SELECT
    gifter_ip,
    gifter_email,
    COUNT(*) AS total_bookings,
    COUNT(*) FILTER (WHERE status IN ('PENDING', 'BOOKED')) AS active_bookings,
    COUNT(DISTINCT wishlist_item_id) AS distinct_items,
    MIN(booked_at) AS first_booking_at,
    MAX(booked_at) AS last_booking_at
FROM gift_bookings
WHERE gifter_ip IS NOT NULL
GROUP BY gifter_ip, gifter_email
HAVING COUNT(*) > 1
ORDER BY active_bookings DESC, total_bookings DESC;
"""

V_SOCIAL_OVERVIEW = """
CREATE OR REPLACE VIEW v_social_overview AS
SELECT
    u.id AS user_id,
    u.username,
    COALESCE(f1.followers_count, 0) AS followers_count,
    COALESCE(f2.following_count, 0) AS following_count,
    CASE
        WHEN COALESCE(f2.following_count, 0) = 0 THEN NULL
        ELSE ROUND(COALESCE(f1.followers_count, 0)::numeric / f2.following_count, 2)
    END AS follow_ratio
FROM users u
LEFT JOIN (
    SELECT following_id AS user_id, COUNT(*) AS followers_count
    FROM follows GROUP BY following_id
) f1 ON f1.user_id = u.id
LEFT JOIN (
    SELECT follower_id AS user_id, COUNT(*) AS following_count
    FROM follows GROUP BY follower_id
) f2 ON f2.user_id = u.id
WHERE u.deleted_at IS NULL;
"""

V_PROFILE_VIEWS_TOP = """
CREATE OR REPLACE VIEW v_profile_views_top AS
SELECT
    ps.user_id,
    u.username,
    u.display_name,
    ps.view_count,
    ps.is_active,
    ps.is_private_profile,
    ps.updated_at
FROM profile_shares ps
JOIN users u ON u.id = ps.user_id
WHERE ps.is_active = true AND u.deleted_at IS NULL
ORDER BY ps.view_count DESC;
"""


# --- Materialized views (тяжёлые агрегаты, обновляются по cron) ---

MV_DAU_WAU_MAU_DAILY = """
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_dau_wau_mau_daily AS
WITH dates AS (
    SELECT generate_series(
        (SELECT MIN(created_at)::date FROM users),
        CURRENT_DATE,
        '1 day'::interval
    )::date AS day
)
SELECT
    d.day,
    COUNT(DISTINCT u.id) FILTER (
        WHERE u.last_seen_at::date = d.day
    ) AS dau,
    COUNT(DISTINCT u.id) FILTER (
        WHERE u.last_seen_at::date BETWEEN d.day - INTERVAL '6 days' AND d.day
    ) AS wau,
    COUNT(DISTINCT u.id) FILTER (
        WHERE u.last_seen_at::date BETWEEN d.day - INTERVAL '29 days' AND d.day
    ) AS mau
FROM dates d
LEFT JOIN users u ON u.last_seen_at IS NOT NULL
GROUP BY d.day
ORDER BY d.day DESC;
"""

MV_DAU_WAU_MAU_INDEX = """
CREATE UNIQUE INDEX IF NOT EXISTS ix_mv_dau_wau_mau_day
ON mv_dau_wau_mau_daily (day);
"""

MV_SIGNUP_FUNNEL_DAILY = """
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_signup_funnel_daily AS
SELECT
    created_at::date AS day,
    COALESCE(signup_source, 'unknown') AS signup_source,
    COUNT(*) AS signups,
    COUNT(*) FILTER (WHERE is_verified) AS verified,
    COUNT(*) FILTER (WHERE last_login_at IS NOT NULL) AS ever_logged_in,
    COUNT(*) FILTER (
        WHERE last_seen_at IS NOT NULL
          AND last_seen_at >= created_at + INTERVAL '1 day'
    ) AS retained_d1
FROM users
GROUP BY 1, 2
ORDER BY 1 DESC, 3 DESC;
"""

MV_SIGNUP_FUNNEL_INDEX = """
CREATE UNIQUE INDEX IF NOT EXISTS ix_mv_signup_funnel_day_source
ON mv_signup_funnel_daily (day, signup_source);
"""

MV_GIFT_FUNNEL_DAILY = """
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_gift_funnel_daily AS
SELECT
    booked_at::date AS day,
    COUNT(*) AS bookings,
    COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed,
    COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled,
    COUNT(DISTINCT booked_by_user_id) FILTER (WHERE booked_by_user_id IS NOT NULL) AS unique_registered_gifters,
    COUNT(DISTINCT gifter_ip) FILTER (WHERE gifter_ip IS NOT NULL) AS unique_ips
FROM gift_bookings
GROUP BY 1
ORDER BY 1 DESC;
"""

MV_GIFT_FUNNEL_INDEX = """
CREATE UNIQUE INDEX IF NOT EXISTS ix_mv_gift_funnel_day
ON mv_gift_funnel_daily (day);
"""


VIEWS_DROP = [
    "v_user_overview",
    "v_user_activity_buckets",
    "v_collection_overview",
    "v_top_records",
    "v_collection_value_history",
    "v_gift_funnel",
    "v_wishlist_overview",
    "v_gift_anti_fraud",
    "v_social_overview",
    "v_profile_views_top",
]

MATERIALIZED_DROP = [
    "mv_dau_wau_mau_daily",
    "mv_signup_funnel_daily",
    "mv_gift_funnel_daily",
]


def upgrade() -> None:
    # 1. Поля для аналитики в users
    op.add_column(
        "users",
        sa.Column("last_seen_at", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("signup_source", sa.String(length=20), nullable=True),
    )
    op.create_index("ix_users_last_seen_at", "users", ["last_seen_at"])
    op.create_index("ix_users_signup_source", "users", ["signup_source"])

    # 2. Backfill signup_source для существующих юзеров
    op.execute("""
        UPDATE users
        SET signup_source = CASE
            WHEN apple_id IS NOT NULL THEN 'apple'
            WHEN google_id IS NOT NULL THEN 'google'
            ELSE 'email'
        END
        WHERE signup_source IS NULL;
    """)

    # 3. Регулярные views
    op.execute(V_USER_OVERVIEW)
    op.execute(V_USER_ACTIVITY_BUCKETS)
    op.execute(V_COLLECTION_OVERVIEW)
    op.execute(V_TOP_RECORDS)
    op.execute(V_COLLECTION_VALUE_HISTORY)
    op.execute(V_GIFT_FUNNEL)
    op.execute(V_WISHLIST_OVERVIEW)
    op.execute(V_GIFT_ANTI_FRAUD)
    op.execute(V_SOCIAL_OVERVIEW)
    op.execute(V_PROFILE_VIEWS_TOP)

    # 4. Materialized views (с unique-индексами для REFRESH CONCURRENTLY)
    op.execute(MV_DAU_WAU_MAU_DAILY)
    op.execute(MV_DAU_WAU_MAU_INDEX)
    op.execute(MV_SIGNUP_FUNNEL_DAILY)
    op.execute(MV_SIGNUP_FUNNEL_INDEX)
    op.execute(MV_GIFT_FUNNEL_DAILY)
    op.execute(MV_GIFT_FUNNEL_INDEX)


def downgrade() -> None:
    for mv in MATERIALIZED_DROP:
        op.execute(f"DROP MATERIALIZED VIEW IF EXISTS {mv} CASCADE;")
    for v in VIEWS_DROP:
        op.execute(f"DROP VIEW IF EXISTS {v} CASCADE;")
    op.drop_index("ix_users_signup_source", table_name="users")
    op.drop_index("ix_users_last_seen_at", table_name="users")
    op.drop_column("users", "signup_source")
    op.drop_column("users", "last_seen_at")
