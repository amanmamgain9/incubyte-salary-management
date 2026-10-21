-- Local/CI only: runs once when the Docker volume is first initialised.
-- The owner role is the image's POSTGRES_USER (acme_owner). This adds the app role used by DATABASE_URL.
-- Table privileges for the app role are granted by a committed migration, not here.
CREATE ROLE acme_app LOGIN PASSWORD 'acme_app_local';
