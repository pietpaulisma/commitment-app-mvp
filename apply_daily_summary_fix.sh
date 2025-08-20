#!/bin/bash

# Apply the daily summary function fix to the database
echo "Applying daily summary function fix..."

# Read the SQL file and execute it via psql (if you have direct access)
# Or via supabase CLI if configured

if command -v psql &> /dev/null && [ ! -z "$DATABASE_URL" ]; then
    echo "Applying via psql..."
    psql "$DATABASE_URL" < fix_daily_summary_function.sql
    echo "Migration applied successfully!"
elif command -v supabase &> /dev/null; then
    echo "Applying via supabase CLI..."
    supabase db push
    echo "Migration applied successfully!"
else
    echo "Error: Neither psql nor supabase CLI available."
    echo "Please apply the migration manually using the SQL in fix_daily_summary_function.sql"
    echo ""
    echo "You can:"
    echo "1. Copy the contents of fix_daily_summary_function.sql"
    echo "2. Go to your Supabase dashboard > SQL Editor"
    echo "3. Paste and run the SQL"
    echo ""
    echo "Or use this direct SQL command:"
    cat fix_daily_summary_function.sql
fi