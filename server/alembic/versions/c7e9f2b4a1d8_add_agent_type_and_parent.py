"""add agent_type and parent_agent_id to agents

Revision ID: c7e9f2b4a1d8
Revises: a1b2c3d4e5f6
Create Date: 2026-04-13 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c7e9f2b4a1d8'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add agent_type and parent_agent_id to agents for subagent lineage tracking."""
    op.add_column(
        'agents',
        sa.Column('agent_type', sa.String(64), nullable=True, index=True),
    )
    op.add_column(
        'agents',
        sa.Column(
            'parent_agent_id',
            sa.String(50),
            sa.ForeignKey('agents.id'),
            nullable=True,
            index=True,
        ),
    )


def downgrade() -> None:
    """Drop parent_agent_id and agent_type from agents."""
    op.drop_column('agents', 'parent_agent_id')
    op.drop_column('agents', 'agent_type')
