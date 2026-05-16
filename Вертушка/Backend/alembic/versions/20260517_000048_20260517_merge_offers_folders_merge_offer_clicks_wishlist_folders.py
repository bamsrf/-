"""merge offer_clicks + wishlist_folders

Revision ID: 20260517_merge_offers_folders
Revises: 20260516_offer_clicks, 20260516_wishlist_folders
Create Date: 2026-05-17 00:00:48.092048

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20260517_merge_offers_folders'
down_revision: Union[str, None] = ('20260516_offer_clicks', '20260516_wishlist_folders')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

