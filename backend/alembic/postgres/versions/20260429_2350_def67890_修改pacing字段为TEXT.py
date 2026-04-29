"""修改plot_analysis表pacing字段为TEXT类型

Revision ID: def67890
Revises: abc12345
Create Date: 2026-04-29 23:50:00.000000
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = 'def67890'
down_revision = 'abc12345'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 将 pacing 字段从 VARCHAR(50) 改为 TEXT
    op.alter_column('plot_analysis', 'pacing',
                    type_=sa.Text,
                    existing_type=sa.String(50),
                    comment='节奏描述: 可以是简单标签(slow/moderate/fast/varied)或详细描述')


def downgrade() -> None:
    # 回滚：将 pacing 字段改回 VARCHAR(50)
    op.alter_column('plot_analysis', 'pacing',
                    type_=sa.String(50),
                    existing_type=sa.Text,
                    comment='节奏: slow|moderate|fast|varied')
