import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ykbzlzqnwqhkqkxfqvzm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrYnpsenFud3Foa3FreGZxdnptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDg5NzQzMzgsImV4cCI6MjAyNDU1MDMzOH0.qDPHN_YH8O8lxVzpVMX8GHYL7YZJLwXYDfahHM7PJ7M';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);