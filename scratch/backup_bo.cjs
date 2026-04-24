
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://laliiuqjpxanhwhxajlm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhbGlpdXFqcHhhbmh3aHhhamxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjQ5MjEsImV4cCI6MjA4ODU0MDkyMX0.1xIE1MXy1JxgGzpP0Hitotz8o3aMwASV8NUr06bQjkA';

const backupData = async () => {
    try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        
        console.log("Fetching civilizations...");
        const { data: civilizations, error: civError } = await supabase.from('civilizations').select('*');
        
        console.log("Fetching suggestions...");
        const { data: suggestions, error: sugError } = await supabase.from('build_order_suggestions').select('*');
        
        const backup = {
            timestamp: new Date().toISOString(),
            civilizations: civilizations || [],
            suggestions: suggestions || [],
            errors: { civError, sugError }
        };
        
        if (!fs.existsSync('scratch')) fs.mkdirSync('scratch');
        fs.writeFileSync('scratch/backup_bo_data.json', JSON.stringify(backup, null, 2));
        console.log("Backup completed: scratch/backup_bo_data.json");
    } catch (e) {
        console.error("Backup failed:", e);
    }
};

backupData();
