import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://lrwkhkltdutlnxkzglnj.supabase.co";
const supabasePublishableKey = "sb_publishable_BI-PxXgVVt_41AELaLVjuQ__rgJoU_M";

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
