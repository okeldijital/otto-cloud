"""Sync Models

Revision ID: 7c9f40c7bb4d
Revises: 6617bcd72266
Create Date: 2026-01-29 16:07:01.654806

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7c9f40c7bb4d'
down_revision: Union[str, None] = '6617bcd72266'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    if 'distributors' not in inspector.get_table_names():
        op.create_table('distributors',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('contact_email', sa.String(length=255), nullable=True),
        sa.Column('contact_phone', sa.String(length=50), nullable=True),
        sa.Column('website', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_distributors_id'), 'distributors', ['id'], unique=False)
        op.create_index(op.f('ix_distributors_name'), 'distributors', ['name'], unique=False)

    if 'labels' not in inspector.get_table_names():
        op.create_table('labels',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('label_id', sa.String(length=50), nullable=True),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('address', sa.Text(), nullable=True),
    sa.Column('contact_email', sa.String(length=255), nullable=True),
    sa.Column('contact_phone', sa.String(length=50), nullable=True),
    sa.Column('website', sa.String(length=255), nullable=True),
    sa.Column('artist_ids', sa.JSON(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
        op.create_index(op.f('ix_labels_id'), 'labels', ['id'], unique=False)
        op.create_index(op.f('ix_labels_label_id'), 'labels', ['label_id'], unique=True)
        op.create_index(op.f('ix_labels_name'), 'labels', ['name'], unique=False)

    if 'pros' not in inspector.get_table_names():
        op.create_table('pros',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('pro_id', sa.String(length=50), nullable=True),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('address', sa.Text(), nullable=True),
    sa.Column('contact_email', sa.String(length=255), nullable=True),
    sa.Column('contact_phone', sa.String(length=50), nullable=True),
    sa.Column('website', sa.String(length=255), nullable=True),
    sa.Column('territory', sa.String(length=100), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
        op.create_index(op.f('ix_pros_id'), 'pros', ['id'], unique=False)
        op.create_index(op.f('ix_pros_name'), 'pros', ['name'], unique=False)
        op.create_index(op.f('ix_pros_pro_id'), 'pros', ['pro_id'], unique=True)

    if 'publishers' not in inspector.get_table_names():
        op.create_table('publishers',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('publisher_id', sa.String(length=50), nullable=True),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('address', sa.Text(), nullable=True),
    sa.Column('contact_email', sa.String(length=255), nullable=True),
    sa.Column('contact_phone', sa.String(length=50), nullable=True),
    sa.Column('rights_type', sa.String(length=100), nullable=True),
    sa.Column('artist_ids', sa.JSON(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
        op.create_index(op.f('ix_publishers_id'), 'publishers', ['id'], unique=False)
        op.create_index(op.f('ix_publishers_name'), 'publishers', ['name'], unique=False)
        op.create_index(op.f('ix_publishers_publisher_id'), 'publishers', ['publisher_id'], unique=True)

    if 'users' not in inspector.get_table_names():
        op.create_table('users',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('hashed_password', sa.String(length=255), nullable=False),
    sa.Column('full_name', sa.String(length=255), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=True),
    sa.Column('is_superuser', sa.Boolean(), nullable=True),
    sa.Column('role', sa.String(length=50), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('last_login', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
        op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
        op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)

    if 'activities' not in inspector.get_table_names():
        op.create_table('activities',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('action', sa.String(), nullable=False),
    sa.Column('entity_type', sa.String(), nullable=False),
    sa.Column('entity_id', sa.Integer(), nullable=False),
    sa.Column('entity_name', sa.String(), nullable=True),
    sa.Column('timestamp', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
        op.create_index(op.f('ix_activities_id'), 'activities', ['id'], unique=False)

    if 'artists' not in inspector.get_table_names():
        op.create_table('artists',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('artist_id', sa.String(length=50), nullable=True),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('aka', sa.String(length=255), nullable=True),
    sa.Column('id_number', sa.String(length=100), nullable=True),
    sa.Column('ipi_number', sa.String(length=50), nullable=True),
    sa.Column('contact_email', sa.String(length=255), nullable=True),
    sa.Column('contact_phone', sa.String(length=50), nullable=True),
    sa.Column('physical_address', sa.Text(), nullable=True),
    sa.Column('banking_details', sa.JSON(), nullable=True),
    sa.Column('profile_image_url', sa.String(length=500), nullable=True),
    sa.Column('streaming_links', sa.JSON(), nullable=True),
    sa.Column('social_media', sa.JSON(), nullable=True),
    sa.Column('label_id', sa.Integer(), nullable=True),
    sa.Column('publisher_id', sa.Integer(), nullable=True),
    sa.Column('pro_id', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['label_id'], ['labels.id'], ),
    sa.ForeignKeyConstraint(['pro_id'], ['pros.id'], ),
    sa.ForeignKeyConstraint(['publisher_id'], ['publishers.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_artists_artist_id'), 'artists', ['artist_id'], unique=True)
    op.create_index(op.f('ix_artists_id'), 'artists', ['id'], unique=False)
    op.create_index(op.f('ix_artists_name'), 'artists', ['name'], unique=False)
    op.create_table('audit_logs',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('action', sa.String(length=50), nullable=True),
    sa.Column('entity_type', sa.String(length=50), nullable=True),
    sa.Column('entity_id', sa.Integer(), nullable=True),
    sa.Column('entity_name', sa.String(length=255), nullable=True),
    sa.Column('changes', sa.JSON(), nullable=True),
    sa.Column('user_id', sa.Integer(), nullable=True),
    sa.Column('ip_address', sa.String(length=45), nullable=True),
    sa.Column('user_agent', sa.String(length=500), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_audit_logs_action'), 'audit_logs', ['action'], unique=False)
    op.create_index(op.f('ix_audit_logs_created_at'), 'audit_logs', ['created_at'], unique=False)
    op.create_index(op.f('ix_audit_logs_entity_type'), 'audit_logs', ['entity_type'], unique=False)
    op.create_index(op.f('ix_audit_logs_id'), 'audit_logs', ['id'], unique=False)
    op.create_table('documents',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('filename', sa.String(length=255), nullable=False),
    sa.Column('original_filename', sa.String(length=255), nullable=False),
    sa.Column('file_path', sa.String(length=500), nullable=False),
    sa.Column('file_type', sa.String(length=50), nullable=True),
    sa.Column('mime_type', sa.String(length=100), nullable=True),
    sa.Column('file_size', sa.BigInteger(), nullable=True),
    sa.Column('version', sa.Integer(), nullable=True),
    sa.Column('parent_document_id', sa.Integer(), nullable=True),
    sa.Column('title', sa.String(length=255), nullable=True),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('tags', sa.JSON(), nullable=True),
    sa.Column('category', sa.String(length=100), nullable=True),
    sa.Column('related_entity_type', sa.String(length=50), nullable=True),
    sa.Column('related_entity_id', sa.Integer(), nullable=True),
    sa.Column('uploaded_by', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['parent_document_id'], ['documents.id'], ),
    sa.ForeignKeyConstraint(['uploaded_by'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_documents_category'), 'documents', ['category'], unique=False)
    op.create_index(op.f('ix_documents_file_type'), 'documents', ['file_type'], unique=False)
    op.create_index(op.f('ix_documents_id'), 'documents', ['id'], unique=False)
    op.create_table('events',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('start_datetime', sa.DateTime(timezone=True), nullable=False),
    sa.Column('end_datetime', sa.DateTime(timezone=True), nullable=True),
    sa.Column('all_day', sa.Boolean(), nullable=True),
    sa.Column('category', sa.String(length=100), nullable=True),
    sa.Column('color', sa.String(length=20), nullable=True),
    sa.Column('location', sa.String(length=255), nullable=True),
    sa.Column('recurrence_rule', sa.String(length=500), nullable=True),
    sa.Column('recurrence_end_date', sa.DateTime(timezone=True), nullable=True),
    sa.Column('reminder_minutes', sa.Integer(), nullable=True),
    sa.Column('related_entity_type', sa.String(length=50), nullable=True),
    sa.Column('related_entity_id', sa.Integer(), nullable=True),
    sa.Column('created_by', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_events_category'), 'events', ['category'], unique=False)
    op.create_index(op.f('ix_events_id'), 'events', ['id'], unique=False)
    op.create_index(op.f('ix_events_start_datetime'), 'events', ['start_datetime'], unique=False)
    op.create_index(op.f('ix_events_title'), 'events', ['title'], unique=False)
    op.create_table('notes',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('content', sa.Text(), nullable=True),
    sa.Column('content_markdown', sa.Text(), nullable=True),
    sa.Column('tags', sa.JSON(), nullable=True),
    sa.Column('category', sa.String(length=100), nullable=True),
    sa.Column('color', sa.String(length=20), nullable=True),
    sa.Column('pinned', sa.Boolean(), nullable=True),
    sa.Column('attachments', sa.JSON(), nullable=True),
    sa.Column('related_entity_type', sa.String(length=50), nullable=True),
    sa.Column('related_entity_id', sa.Integer(), nullable=True),
    sa.Column('created_by', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_notes_category'), 'notes', ['category'], unique=False)
    op.create_index(op.f('ix_notes_id'), 'notes', ['id'], unique=False)
    op.create_index(op.f('ix_notes_pinned'), 'notes', ['pinned'], unique=False)
    op.create_index(op.f('ix_notes_title'), 'notes', ['title'], unique=False)
    op.create_table('playlists',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('playlist_id', sa.String(length=50), nullable=True),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('track_ids', sa.JSON(), nullable=True),
    sa.Column('is_public', sa.Boolean(), nullable=True),
    sa.Column('share_link', sa.String(length=255), nullable=True),
    sa.Column('play_count', sa.Integer(), nullable=True),
    sa.Column('created_by', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('share_link')
    )
    op.create_index(op.f('ix_playlists_id'), 'playlists', ['id'], unique=False)
    op.create_index(op.f('ix_playlists_name'), 'playlists', ['name'], unique=False)
    op.create_index(op.f('ix_playlists_playlist_id'), 'playlists', ['playlist_id'], unique=True)
    op.create_table('works',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('work_id', sa.String(length=50), nullable=True),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('iswc_code', sa.String(length=50), nullable=True),
    sa.Column('composers', sa.JSON(), nullable=True),
    sa.Column('composers_text', sa.Text(), nullable=True),
    sa.Column('arrangers', sa.JSON(), nullable=True),
    sa.Column('arrangers_text', sa.Text(), nullable=True),
    sa.Column('publisher_id', sa.Integer(), nullable=True),
    sa.Column('pro_id', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['pro_id'], ['pros.id'], ),
    sa.ForeignKeyConstraint(['publisher_id'], ['publishers.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_works_id'), 'works', ['id'], unique=False)
    op.create_index(op.f('ix_works_title'), 'works', ['title'], unique=False)
    op.create_index(op.f('ix_works_work_id'), 'works', ['work_id'], unique=True)
    op.create_table('contracts',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('contract_id', sa.String(length=50), nullable=True),
    sa.Column('artist_id', sa.Integer(), nullable=True),
    sa.Column('label_id', sa.Integer(), nullable=True),
    sa.Column('publisher_id', sa.Integer(), nullable=True),
    sa.Column('start_date', sa.Date(), nullable=True),
    sa.Column('end_date', sa.Date(), nullable=True),
    sa.Column('royalty_rate', sa.Numeric(precision=5, scale=2), nullable=True),
    sa.Column('terms', sa.Text(), nullable=True),
    sa.Column('file_path', sa.String(length=500), nullable=True),
    sa.Column('status', sa.String(length=50), nullable=True),
    sa.Column('title', sa.String(length=255), nullable=True),
    sa.Column('is_template', sa.Boolean(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['artist_id'], ['artists.id'], ),
    sa.ForeignKeyConstraint(['label_id'], ['labels.id'], ),
    sa.ForeignKeyConstraint(['publisher_id'], ['publishers.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_contracts_contract_id'), 'contracts', ['contract_id'], unique=True)
    op.create_index(op.f('ix_contracts_end_date'), 'contracts', ['end_date'], unique=False)
    op.create_index(op.f('ix_contracts_id'), 'contracts', ['id'], unique=False)
    op.create_table('releases',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('release_id', sa.String(length=50), nullable=True),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('upc_code', sa.String(length=50), nullable=True),
    sa.Column('release_date', sa.Date(), nullable=True),
    sa.Column('release_type', sa.String(length=50), nullable=True),
    sa.Column('cover_art_url', sa.String(length=500), nullable=True),
    sa.Column('label_id', sa.Integer(), nullable=True),
    sa.Column('artist_id', sa.Integer(), nullable=True),
    sa.Column('distributor_id', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['artist_id'], ['artists.id'], ),
    sa.ForeignKeyConstraint(['distributor_id'], ['distributors.id'], ),
    sa.ForeignKeyConstraint(['label_id'], ['labels.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('upc_code')
    )
    op.create_index(op.f('ix_releases_id'), 'releases', ['id'], unique=False)
    op.create_index(op.f('ix_releases_release_id'), 'releases', ['release_id'], unique=True)
    op.create_index(op.f('ix_releases_title'), 'releases', ['title'], unique=False)
    op.create_table('tracks',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('track_id', sa.String(length=50), nullable=True),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('duration', sa.Time(), nullable=True),
    sa.Column('genre', sa.String(length=100), nullable=True),
    sa.Column('release_date', sa.Date(), nullable=True),
    sa.Column('isrc_code', sa.String(length=50), nullable=True),
    sa.Column('streaming_link', sa.String(length=500), nullable=True),
    sa.Column('artist_ids', sa.JSON(), nullable=True),
    sa.Column('file_location', sa.String(length=500), nullable=True),
    sa.Column('release_id', sa.Integer(), nullable=True),
    sa.Column('work_id', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['release_id'], ['releases.id'], ),
    sa.ForeignKeyConstraint(['work_id'], ['works.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('isrc_code')
    )
    op.create_index(op.f('ix_tracks_genre'), 'tracks', ['genre'], unique=False)
    op.create_index(op.f('ix_tracks_id'), 'tracks', ['id'], unique=False)
    op.create_index(op.f('ix_tracks_title'), 'tracks', ['title'], unique=False)
    op.create_index(op.f('ix_tracks_track_id'), 'tracks', ['track_id'], unique=True)
    op.create_table('royalties',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('royalty_id', sa.String(length=50), nullable=True),
    sa.Column('artist_id', sa.Integer(), nullable=True),
    sa.Column('work_id', sa.Integer(), nullable=True),
    sa.Column('track_id', sa.Integer(), nullable=True),
    sa.Column('source', sa.String(length=100), nullable=True),
    sa.Column('amount', sa.Numeric(precision=15, scale=2), nullable=True),
    sa.Column('currency', sa.String(length=3), nullable=True),
    sa.Column('statement_date', sa.Date(), nullable=True),
    sa.Column('fees', sa.Numeric(precision=15, scale=2), nullable=True),
    sa.Column('advances', sa.Numeric(precision=15, scale=2), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['artist_id'], ['artists.id'], ),
    sa.ForeignKeyConstraint(['track_id'], ['tracks.id'], ),
    sa.ForeignKeyConstraint(['work_id'], ['works.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_royalties_id'), 'royalties', ['id'], unique=False)
    op.create_index(op.f('ix_royalties_royalty_id'), 'royalties', ['royalty_id'], unique=True)
    op.create_index(op.f('ix_royalties_source'), 'royalties', ['source'], unique=False)
    op.create_index(op.f('ix_royalties_statement_date'), 'royalties', ['statement_date'], unique=False)
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index(op.f('ix_royalties_statement_date'), table_name='royalties')
    op.drop_index(op.f('ix_royalties_source'), table_name='royalties')
    op.drop_index(op.f('ix_royalties_royalty_id'), table_name='royalties')
    op.drop_index(op.f('ix_royalties_id'), table_name='royalties')
    op.drop_table('royalties')
    op.drop_index(op.f('ix_tracks_track_id'), table_name='tracks')
    op.drop_index(op.f('ix_tracks_title'), table_name='tracks')
    op.drop_index(op.f('ix_tracks_id'), table_name='tracks')
    op.drop_index(op.f('ix_tracks_genre'), table_name='tracks')
    op.drop_table('tracks')
    op.drop_index(op.f('ix_releases_title'), table_name='releases')
    op.drop_index(op.f('ix_releases_release_id'), table_name='releases')
    op.drop_index(op.f('ix_releases_id'), table_name='releases')
    op.drop_table('releases')
    op.drop_index(op.f('ix_contracts_id'), table_name='contracts')
    op.drop_index(op.f('ix_contracts_end_date'), table_name='contracts')
    op.drop_index(op.f('ix_contracts_contract_id'), table_name='contracts')
    op.drop_table('contracts')
    op.drop_index(op.f('ix_works_work_id'), table_name='works')
    op.drop_index(op.f('ix_works_title'), table_name='works')
    op.drop_index(op.f('ix_works_id'), table_name='works')
    op.drop_table('works')
    op.drop_index(op.f('ix_playlists_playlist_id'), table_name='playlists')
    op.drop_index(op.f('ix_playlists_name'), table_name='playlists')
    op.drop_index(op.f('ix_playlists_id'), table_name='playlists')
    op.drop_table('playlists')
    op.drop_index(op.f('ix_notes_title'), table_name='notes')
    op.drop_index(op.f('ix_notes_pinned'), table_name='notes')
    op.drop_index(op.f('ix_notes_id'), table_name='notes')
    op.drop_index(op.f('ix_notes_category'), table_name='notes')
    op.drop_table('notes')
    op.drop_index(op.f('ix_events_title'), table_name='events')
    op.drop_index(op.f('ix_events_start_datetime'), table_name='events')
    op.drop_index(op.f('ix_events_id'), table_name='events')
    op.drop_index(op.f('ix_events_category'), table_name='events')
    op.drop_table('events')
    op.drop_index(op.f('ix_documents_id'), table_name='documents')
    op.drop_index(op.f('ix_documents_file_type'), table_name='documents')
    op.drop_index(op.f('ix_documents_category'), table_name='documents')
    op.drop_table('documents')
    op.drop_index(op.f('ix_audit_logs_id'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_entity_type'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_created_at'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_action'), table_name='audit_logs')
    op.drop_table('audit_logs')
    op.drop_index(op.f('ix_artists_name'), table_name='artists')
    op.drop_index(op.f('ix_artists_id'), table_name='artists')
    op.drop_index(op.f('ix_artists_artist_id'), table_name='artists')
    op.drop_table('artists')
    op.drop_index(op.f('ix_activities_id'), table_name='activities')
    op.drop_table('activities')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
    op.drop_index(op.f('ix_publishers_publisher_id'), table_name='publishers')
    op.drop_index(op.f('ix_publishers_name'), table_name='publishers')
    op.drop_index(op.f('ix_publishers_id'), table_name='publishers')
    op.drop_table('publishers')
    op.drop_index(op.f('ix_pros_pro_id'), table_name='pros')
    op.drop_index(op.f('ix_pros_name'), table_name='pros')
    op.drop_index(op.f('ix_pros_id'), table_name='pros')
    op.drop_table('pros')
    op.drop_index(op.f('ix_labels_name'), table_name='labels')
    op.drop_index(op.f('ix_labels_label_id'), table_name='labels')
    op.drop_index(op.f('ix_labels_id'), table_name='labels')
    op.drop_table('labels')
    op.drop_index(op.f('ix_distributors_name'), table_name='distributors')
    op.drop_index(op.f('ix_distributors_id'), table_name='distributors')
    op.drop_table('distributors')
    # ### end Alembic commands ###
