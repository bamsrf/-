-- =========================================================
-- "Browse" views для удобного просмотра данных в Studio.
-- Применяются ПОСЛЕ pg_dump'а прода — пересоздаются на каждый sync.
-- Все views с префиксом browse_* — лежат рядом в Studio Table Editor.
-- =========================================================

-- 👤 Юзеры (без password_hash, push_token и reset-codes)
CREATE OR REPLACE VIEW browse_users AS
SELECT
    username,
    email,
    display_name,
    signup_source,
    is_verified,
    is_active,
    created_at,
    last_login_at,
    last_seen_at,
    CASE WHEN deleted_at IS NULL THEN 'активен' ELSE 'удалён' END AS status
FROM users
ORDER BY created_at DESC;

-- 💿 Каталог Discogs (без сырого JSON)
CREATE OR REPLACE VIEW browse_records AS
SELECT
    artist,
    title,
    year,
    label,
    catalog_number,
    format_type,
    country,
    genre,
    estimated_price_min,
    estimated_price_max,
    estimated_price_median,
    price_currency,
    is_first_press,
    is_limited,
    is_hot,
    is_canon,
    is_collectible,
    cover_image_url,
    discogs_id,
    created_at
FROM records
ORDER BY artist, year NULLS LAST;

-- 📚 Коллекции — что у кого есть (joined)
CREATE OR REPLACE VIEW browse_collections AS
SELECT
    u.username                AS owner,
    c.name                    AS collection,
    r.artist,
    r.title,
    r.year,
    ci.condition,
    ci.sleeve_condition,
    ci.estimated_price_rub,
    ci.added_at,
    ci.notes
FROM collection_items ci
JOIN collections c ON c.id = ci.collection_id
JOIN users u       ON u.id = c.user_id
JOIN records r     ON r.id = ci.record_id
ORDER BY ci.added_at DESC;

-- ⭐ Вишлисты — кто что хочет
CREATE OR REPLACE VIEW browse_wishlists AS
SELECT
    u.username     AS owner,
    r.artist,
    r.title,
    r.year,
    wi.priority,
    wi.is_purchased,
    wi.notes,
    wi.added_at,
    wi.purchased_at
FROM wishlist_items wi
JOIN wishlists w ON w.id = wi.wishlist_id
JOIN users u     ON u.id = w.user_id
JOIN records r   ON r.id = wi.record_id
ORDER BY wi.added_at DESC;

-- 🎁 Подарки — кто кому что бронирует (без токенов/IP)
CREATE OR REPLACE VIEW browse_gifts AS
SELECT
    u.username        AS recipient,
    r.artist,
    r.title,
    r.year,
    gb.gifter_name,
    gb.gifter_email,
    gb.status,
    gb.gifter_message,
    gb.booked_at,
    gb.completed_at,
    gb.cancelled_at,
    gb.cancellation_reason
FROM gift_bookings gb
LEFT JOIN wishlist_items wi ON wi.id = gb.wishlist_item_id
LEFT JOIN wishlists w       ON w.id = wi.wishlist_id
LEFT JOIN users u           ON u.id = w.user_id
LEFT JOIN records r         ON r.id = wi.record_id
ORDER BY gb.booked_at DESC;

-- 🤝 Подписки — кто на кого подписан
CREATE OR REPLACE VIEW browse_follows AS
SELECT
    follower_u.username  AS follower,
    following_u.username AS following,
    f.created_at
FROM follows f
JOIN users follower_u  ON follower_u.id  = f.follower_id
JOIN users following_u ON following_u.id = f.following_id
ORDER BY f.created_at DESC;

-- 🌐 Публичные профили
CREATE OR REPLACE VIEW browse_profiles AS
SELECT
    u.username,
    ps.is_active           AS profile_active,
    ps.is_private_profile,
    ps.show_collection,
    ps.show_wishlist,
    ps.show_collection_value,
    ps.view_count,
    ps.custom_title,
    ps.updated_at
FROM profile_shares ps
JOIN users u ON u.id = ps.user_id
ORDER BY ps.view_count DESC;
